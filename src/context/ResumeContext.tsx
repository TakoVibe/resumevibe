import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { ResumeSchema } from '../types/resume';
import { initialResume } from '../data/sample-resume';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { normalizeResumeData } from '../lib/normalizeResume';

const STORAGE_KEY = 'resume-data-v3';
const METADATA_STORAGE_KEY = 'resume-metadata-v1';

function readStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Unable to read browser storage key "${key}"`, error);
        return null;
    }
}

function writeStorage(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Unable to persist browser storage key "${key}"`, error);
    }
}

function removeStorage(key: string) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Unable to remove browser storage key "${key}"`, error);
    }
}

export interface ResumeMetadata {
    id?: string;
    slug: string;
    name: string;
    isPublic: boolean;
}

interface ResumeContextType {
    data: ResumeSchema;
    updateResume: (newData: ResumeSchema) => void;
    updateSection: <K extends keyof ResumeSchema>(section: K, value: ResumeSchema[K]) => void;
    resetToDefault: () => void;
    isLoaded: boolean;
    undo: () => void;
    redo: () => void;
    saveToBackend: (dataOverride?: ResumeSchema) => Promise<ResumeMetadata | null>;
    saveVersionToBackend: (slugOverride?: string) => Promise<boolean>;
    canUndo: boolean;
    canRedo: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    resumeMetadata: ResumeMetadata | null;
    setResumeMetadata: (meta: ResumeMetadata | null) => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState<{
        past: ResumeSchema[];
        present: ResumeSchema;
        future: ResumeSchema[];
    }>({
        past: [],
        present: initialResume,
        future: []
    });

    const { isAuthenticated } = useAuth();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [resumeMetadata, setResumeMetadataState] = useState<ResumeMetadata | null>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const resumeMetadataRef = useRef<ResumeMetadata | null>(null);
    const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

    const setResumeMetadata = useCallback((meta: ResumeMetadata | null) => {
        resumeMetadataRef.current = meta;
        setResumeMetadataState(meta);
        if (meta) {
            writeStorage(METADATA_STORAGE_KEY, meta);
        } else {
            removeStorage(METADATA_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        const stored = readStorage(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = normalizeResumeData(JSON.parse(stored));
                setHistory(prev => ({
                    ...prev,
                    present: parsed
                }));
                writeStorage(STORAGE_KEY, parsed);
            } catch (e) {
                console.error("Failed to parse resume data", e);
            }
        }
        const storedMetadata = readStorage(METADATA_STORAGE_KEY);
        if (storedMetadata) {
            try {
                const parsed = JSON.parse(storedMetadata);
                if (parsed?.slug) setResumeMetadata(parsed);
            } catch (e) {
                console.error('Failed to parse resume metadata', e);
                removeStorage(METADATA_STORAGE_KEY);
            }
        }
        setIsLoaded(true);
    }, [setResumeMetadata]);

    const updateResume = useCallback((newData: ResumeSchema) => {
        const normalizedData = normalizeResumeData(newData);
        setHistory(curr => {
            const newHistory = {
                past: [...curr.past, curr.present],
                present: normalizedData,
                future: []
            };
            writeStorage(STORAGE_KEY, normalizedData);
            return newHistory;
        });
    }, []);

    const undo = useCallback(() => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr;

            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, -1);

            const newHistory = {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            };

            writeStorage(STORAGE_KEY, previous);
            return newHistory;
        });
    }, []);

    const redo = useCallback(() => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr;

            const next = curr.future[0];
            const newFuture = curr.future.slice(1);

            const newHistory = {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            };

            writeStorage(STORAGE_KEY, next);
            return newHistory;
        });
    }, []);

    const lastSavedDataRef = useRef<string | null>(null);


    const saveToBackend = useCallback((dataOverride?: ResumeSchema): Promise<ResumeMetadata | null> => {
        const dataToSave = dataOverride || history.present;
        const isTestingResume = dataToSave.personalInfo?.email === 'johnathan.doe@example.com';
        if (!isAuthenticated || !dataToSave || isTestingResume) return Promise.resolve(null);

        const saveOperation = async (): Promise<ResumeMetadata | null> => {
            const currentDataString = JSON.stringify(dataToSave);
            const currentMetadata = resumeMetadataRef.current;
            if (currentDataString === lastSavedDataRef.current && currentMetadata) {
                return currentMetadata;
            }

            setIsSaving(true);
            try {
                const method = currentMetadata?.id ? 'put' : 'post';
                const endpoint = currentMetadata?.id ? `/api/resumes/${currentMetadata.slug}/` : '/api/resumes/';
                const response = await api[method](endpoint, {
                    resume_data: dataToSave,
                    is_public: currentMetadata?.isPublic || false
                });

                if (!response.ok) return null;

                const responseData = await response.json();
                const savedSlug = responseData.slug || currentMetadata?.slug;
                if (!savedSlug) return null;
                const savedMetadata: ResumeMetadata = {
                    id: responseData.id ?? currentMetadata?.id,
                    slug: savedSlug,
                    name: responseData.resume_name || currentMetadata?.name || dataToSave.personalInfo.fullName || 'Untitled resume',
                    isPublic: typeof responseData.is_public === 'boolean' ? responseData.is_public : Boolean(currentMetadata?.isPublic)
                };
                lastSavedDataRef.current = currentDataString;
                setResumeMetadata(savedMetadata);
                setLastSaved(new Date());
                return savedMetadata;
            } catch (error) {
                console.error('Resume save failed:', error);
                return null;
            } finally {
                setIsSaving(false);
            }
        };

        const queuedSave = saveQueueRef.current.then(saveOperation, saveOperation);
        saveQueueRef.current = queuedSave.then(() => undefined, () => undefined);
        return queuedSave;
    }, [history.present, isAuthenticated, setResumeMetadata]);

    const saveVersionToBackend = useCallback(async (slugOverride?: string) => {
        const targetSlug = slugOverride || resumeMetadataRef.current?.slug;
        if (!isAuthenticated || !targetSlug) {
            toast.error("Please save the resume first before creating a version.");
            return false;
        }

        setIsSaving(true);
        try {
            const response = await api.post(`/api/resumes/${targetSlug}/create_version/`, {});
            if (response.ok) {
                toast.success("Version saved successfully!");
                return true;
            } else {
                toast.error("Failed to save version.");
                return false;
            }
        } catch (error) {
            console.error("Error creating version:", error);
            toast.error("Error creating version.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [isAuthenticated]);

    // Auto-save effect with dirty check
    useEffect(() => {
        const isTestingResume = history.present.personalInfo?.email === 'johnathan.doe@example.com';

        if (isAuthenticated && isLoaded && !isTestingResume) {
            // Compare current with last saved
            const currentDataString = JSON.stringify(history.present);
            if (currentDataString === lastSavedDataRef.current) {
                return;
            }

            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

            autoSaveTimerRef.current = setTimeout(() => {
                saveToBackend();
            }, 5000);
        }
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [history.present, isAuthenticated, isLoaded, saveToBackend]);

    const updateSection = <K extends keyof ResumeSchema>(section: K, value: ResumeSchema[K]) => {
        const newData = { ...history.present, [section]: value };
        updateResume(newData);
    };

    const resetToDefault = () => {
        updateResume(initialResume);
    };

    return (
        <ResumeContext.Provider value={{
            data: history.present,
            updateResume,
            updateSection,
            resetToDefault,
            isLoaded,
            undo,
            redo,
            saveToBackend,
            saveVersionToBackend,
            canUndo: history.past.length > 0,
            canRedo: history.future.length > 0,
            isSaving,
            lastSaved,
            resumeMetadata,
            setResumeMetadata
        }}>
            {children}
        </ResumeContext.Provider>
    );
}

export function useResumeContext() {
    const context = useContext(ResumeContext);
    if (context === undefined) {
        throw new Error('useResumeContext must be used within a ResumeProvider');
    }
    return context;
}
