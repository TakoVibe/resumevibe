import { X, Copy, Check, Mail, Phone, Linkedin, Globe, Eye, Lock } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    resumeId: string;
    fullName: string;
    username: string;
    isPublic: boolean;
    onVisibilityChange: (isPublic: boolean, revision?: number) => void;
    isAuthenticated?: boolean;
    onRequireAuth?: () => void;
}

export function ShareModal({ isOpen, onClose, resumeId, fullName, username, isPublic, onVisibilityChange, isAuthenticated, onRequireAuth }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Construct the public URL
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // resumeId is the resume_name which might contain spaces, but we slugified it in parent. 
    // Wait, parent passed `resumeMetadata?.name` which might be "My Resume".
    // I should ensure the URL uses a slug or encoded name.
    // Ideally backend handles lookup by slug or name. 
    // The previous implementation replaced spaces with hyphens. 
    // Let's assume resumeId passed here is URL-safe or we encode it.
    // But backend expects `resume_name` to match exactly?
    // In ResumeBuilder I did: `resumeId={resumeMetadata?.name || ...}`.
    // If I used "My Resume", the URL will be `.../My%20Resume`. That works.
    const publicUrl = `${origin}/resume/${username}/${encodeURIComponent(resumeId)}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            setError('Failed to copy link');
        }
    };

    const handleTogglePublic = async () => {
        if (!isAuthenticated) {
            onRequireAuth?.();
            onClose(); // Close share modal so login modal is visible (if it's below)
            // Or keep it open if login modal is on top. Usually separate modals.
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const newStatus = !isPublic;
            // We use resumeId (name) to identify.
            // But PATCH endpoint uses `lookup_field = 'resume_name'`.
            // So URL resource is `/api/resumes/${resumeId}/`.
            const response = await api.patch(`/api/resumes/${resumeId}/`, {
                is_public: newStatus
            });

            if (response.ok) {
                const updated = await response.json();
                onVisibilityChange(newStatus, updated.revision);
            } else {
                const err = await response.json();
                console.error(err);
                setError('Failed to update visibility. Please try again.');
            }
        } catch (error) {
            console.error('Error toggling visibility:', error);
            setError('Connection error. Please check your network.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 pb-0 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-main)]">Share Resume</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Share your professional profile with the world</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-[var(--bg-input)] text-[var(--text-muted)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 animate-in slide-in-from-top-2">
                        <Lock size={16} />
                        <span className="text-xs font-bold">{error}</span>
                    </div>
                )}

                <div className="p-6 space-y-6">
                    {/* Public Access Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isPublic ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {isPublic ? <Globe size={20} /> : <Lock size={20} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-[var(--text-main)]">Public Access</h3>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {isPublic ? 'Anyone with the link can view' : 'Only you can view'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePublic}
                            disabled={isLoading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isPublic ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Link Section */}
                    <div className={`space-y-3 transition-opacity duration-200 ${!isPublic ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Public Link
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-muted)] truncate font-mono select-all">
                                {publicUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center min-w-[48px]"
                                title="Copy Link"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Social Share */}
                    <div className={`grid grid-cols-3 gap-3 ${!isPublic ? 'opacity-50 pointer-events-none' : ''}`}>
                        <a
                            href={`mailto:?subject=Resume of ${fullName}&body=Check out my resume: ${publicUrl}`}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--bg-input)] transition-colors border border-[var(--border-color)] hover:border-purple-500/30 group"
                        >
                            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                                <Mail size={20} />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)]">Email</span>
                        </a>
                        <a
                            href={`https://wa.me/?text=Check out my resume: ${publicUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--bg-input)] transition-colors border border-[var(--border-color)] hover:border-green-500/30 group"
                        >
                            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg group-hover:scale-110 transition-transform">
                                <Phone size={20} />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)]">WhatsApp</span>
                        </a>
                        <a
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--bg-input)] transition-colors border border-[var(--border-color)] hover:border-blue-600/30 group"
                        >
                            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                <Linkedin size={20} />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)]">LinkedIn</span>
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[var(--bg-input)] border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <div className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg">
                            <Eye size={14} />
                        </div>
                        <p>
                            {isPublic
                                ? "Anyone with the link can view your resume."
                                : "Make your resume public to share it with others."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
