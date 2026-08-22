import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Edit, Trash2, Globe, Lock, Clock, ExternalLink, Loader2, FileText, Plus, LogIn, History, RotateCcw, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingScreen } from '../ui/LoadingScreen';

interface Version {
    id: string;
    resume_data: any;
    version_number: number;
    created_at: string;
}

interface Resume {
    id: string;
    resume_name: string;
    slug: string;
    resume_data: any;
    is_public: boolean;
    updated_at: string;
    versions: Version[];
}

export function UserResumes() {
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [showVersionsFor, setShowVersionsFor] = useState<Resume | null>(null);
    const [isRestoring, setIsRestoring] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            fetchResumes();
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchResumes = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/resumes/');
            if (response.ok) {
                const data = await response.json();
                setResumes(Array.isArray(data) ? data : (data.results || []));
            } else if (response.status === 401) {
                setResumes([]);
            }
        } catch (error) {
            console.error("Failed to fetch resumes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm(`Are you sure you want to delete this resume?`)) return;

        setIsDeleting(slug);
        try {
            const response = await api.delete(`/api/resumes/${slug}/`);
            if (response.ok) {
                setResumes(resumes.filter(r => r.slug !== slug));
                toast.success("Resume deleted");
            } else {
                toast.error("Failed to delete resume.");
            }
        } catch (error) {
            console.error("Error deleting resume:", error);
            toast.error("Error deleting resume.");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleRestoreVersion = async (resume: Resume, version: Version) => {
        if (!confirm(`Restore to version ${version.version_number}? This will overwrite your current resume data.`)) return;

        setIsRestoring(version.id);
        try {
            const response = await api.put(`/api/resumes/${resume.slug}/`, {
                resume_data: version.resume_data,
                is_public: resume.is_public
            });

            if (response.ok) {
                toast.success(`Restored to Version ${version.version_number}`);
                // Refresh list to update all versions and main data
                fetchResumes();
                setShowVersionsFor(null);
            } else {
                toast.error("Failed to restore version.");
            }
        } catch (error) {
            console.error("Restore failed:", error);
            toast.error("Error restoring version.");
        } finally {
            setIsRestoring(null);
        }
    };

    if (!localStorage.getItem("auth_token")) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] p-12 text-center flex flex-col items-center shadow-xl">
                <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-6 border border-purple-500/20">
                    <Lock className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] mb-2 tracking-tight">Authentication Required</h3>
                <p className="text-[var(--text-muted)] font-medium mb-8 max-w-xs mx-auto text-sm">
                    Please log in to view and manage your saved resumes.
                </p>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('show-login-modal'))}
                    className="flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-purple-500/20"
                >
                    <LogIn size={18} />
                    Login Now
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center border border-[var(--border-color)] bg-[var(--bg-card)]">
                <Loader2 size={32} className="text-[var(--text-main)] mb-6 animate-spin opacity-50" />
                <p className="font-sans-ed text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Retrieving your portfolio...</p>
            </div>
        );
    }

    if (resumes.length === 0) {
        return (
            <div className="bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] rounded-[32px] p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-[var(--bg-input)] rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <FileText className="w-10 h-10 text-[var(--border-color)]" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] mb-2 tracking-tight">No resumes found</h3>
                <p className="text-[var(--text-muted)] font-medium mb-8 max-w-xs mx-auto text-sm">
                    You haven't saved any resumes yet. Start creating your professional path now.
                </p>
                <a
                    href="/"
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl font-bold uppercase tracking-widest transition-all shadow-sm"
                >
                    <Plus size={18} />
                    Create First Resume
                </a>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {resumes.map((resume) => (
                    <div
                        key={resume.id}
                        className="group bg-[var(--bg-card)] border border-[var(--border-color)] p-8 transition-all hover:border-[var(--text-main)] flex flex-col h-full relative"
                    >
                        {/* Minimalist Top Decorator */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[var(--text-main)]/20 to-transparent"></div>

                        <div className="flex justify-between items-start mb-10">
                            <div className="w-8 h-8 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                <FileText size={24} className="text-[var(--text-main)]" />
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowVersionsFor(resume)}
                                    className="flex items-center gap-1.5 font-sans-ed text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                                >
                                    <History size={12} className="opacity-50" /> {resume.versions?.length || 0} Vols
                                </button>
                                <span className="text-[var(--border-color)]">|</span>
                                {resume.is_public ? (
                                    <div className="flex items-center gap-1.5 font-sans-ed text-[9px] uppercase tracking-[0.25em] text-green-600 dark:text-green-400">
                                        <Globe size={12} className="opacity-50" /> Public
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 font-sans-ed text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                                        <Lock size={12} className="opacity-50" /> Private
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 className="font-serif-ed text-3xl text-[var(--text-main)] mb-3 tracking-tight line-clamp-1" title={resume.resume_name}>
                            {resume.resume_name}
                        </h3>

                        <div className="flex items-center gap-2 text-[var(--text-muted)] font-sans-ed text-[10px] uppercase tracking-[0.25em] mb-10 opacity-70">
                            <Clock size={12} className="opacity-50" />
                            Edited {new Date(resume.updated_at).toLocaleDateString()}
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href={`/?edit=${resume.slug}`}
                                    className="flex items-center justify-center gap-2 py-3 border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--text-main)] font-sans-ed text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    <Edit size={12} /> Edit
                                </a>
                                <button
                                    onClick={() => handleDelete(resume.slug)}
                                    disabled={isDeleting === resume.slug}
                                    className="flex items-center justify-center gap-2 py-3 border border-[var(--border-color)] text-[var(--text-muted)] hover:border-red-500/50 hover:text-red-500 dark:hover:text-red-400 font-sans-ed text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                                >
                                    {isDeleting === resume.slug ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={12} />
                                    )}
                                    Delete
                                </button>
                            </div>

                            {resume.is_public && (
                                <a
                                    href={`/resume/${typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').username || 'public' : 'public'}/${resume.slug}`}
                                    target="_blank"
                                    className="flex items-center justify-center gap-2 py-3 bg-[var(--text-main)] text-[var(--bg-main)] font-sans-ed text-[10px] uppercase tracking-[0.2em] transition-all hover:opacity-90 mt-2"
                                >
                                    View Public URL <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Version History Modal */}
            {showVersionsFor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-6 font-sans-ed">
                    <div
                        className="absolute inset-0 bg-[var(--text-main)]/10 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowVersionsFor(null)}
                    />
                    <div className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 rounded-sm">
                        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-start bg-[var(--bg-card)]">
                            <div>
                                <h2 className="font-serif-ed text-4xl text-[var(--text-main)] tracking-tight mb-2">Version History</h2>
                                <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-[0.2em]">
                                    {showVersionsFor.resume_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowVersionsFor(null)}
                                className="p-2 border border-transparent hover:border-[var(--text-main)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                                <X size={20} className="font-light" />
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div className="p-6 border border-[var(--text-main)] flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 border border-[var(--text-main)] text-[var(--text-main)] flex items-center justify-center bg-[var(--text-main)]/5">
                                            <Check size={18} />
                                        </div>
                                        <div>
                                            <p className="font-serif-ed text-2xl text-[var(--text-main)] mb-1">Current Version</p>
                                            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                                                Active Now
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {showVersionsFor.versions?.map((version) => (
                                    <div
                                        key={version.id}
                                        className="p-6 border border-[var(--border-color)] flex items-center justify-between group hover:border-[var(--text-main)] transition-all"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-10 h-10 border border-[var(--border-color)] text-[var(--text-muted)] group-hover:border-[var(--text-main)] group-hover:text-[var(--text-main)] flex items-center justify-center font-serif-ed text-lg italic transition-all">
                                                v{version.version_number}
                                            </div>
                                            <div>
                                                <p className="font-serif-ed text-xl text-[var(--text-main)] mb-1">Snapshot {version.version_number}</p>
                                                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                                                    Saved {new Date(version.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreVersion(showVersionsFor, version)}
                                            disabled={isRestoring === version.id}
                                            className="flex items-center justify-center gap-2 px-6 py-3 border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-main)] text-[9px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                                        >
                                            {isRestoring === version.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <RotateCcw size={12} />
                                            )}
                                            Restore
                                        </button>
                                    </div>
                                ))}

                                {(!showVersionsFor.versions || showVersionsFor.versions.length === 0) && (
                                    <div className="py-12 text-center opacity-40 border border-transparent">
                                        <History size={32} className="mx-auto mb-4" />
                                        <p className="text-[9px] uppercase tracking-[0.2em]">No versions yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
                            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed uppercase tracking-[0.2em] opacity-80 text-center">
                                Note: Restoring a version will replace your current resume data.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
