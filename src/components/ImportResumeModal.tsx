import { useState } from 'react';
import { Upload, FileText, Sparkles, X, Loader2, CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToken } from '../context/TokenContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any) => void;
}

export function ImportResumeModal({ isOpen, onClose, onImport }: Props) {
    const { canAffordTokens, chargeTokensAfterSuccess } = useToken();
    const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleClose = () => {
        if (isProcessing) return;
        setError('');
        setIsSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    const handleTextImport = async () => {
        if (!textInput.trim()) {
            setError('Please paste your resume text');
            return;
        }

        if (!canAffordTokens(50)) return;

        setIsProcessing(true);
        setError('');

        try {
            const response = await fetch('/api/parse-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textInput })
            });

            if (!response.ok) throw new Error('Failed to parse resume');

            const parsedData = await response.json();
            const charged = await chargeTokensAfterSuccess('import_resume_text', 50);
            if (!charged) return;
            setIsSuccess(true);
            setTimeout(() => {
                onImport(parsedData);
                handleClose();
            }, 1500);
        } catch (err) {
            setError('Failed to parse resume. Please check your internet or try again.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file');
            return;
        }

        if (!canAffordTokens(50)) {
            e.target.value = '';
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('pdf', file);

            const response = await fetch('/api/parse-resume-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to parse PDF');

            const parsedData = await response.json();
            const charged = await chargeTokensAfterSuccess('import_resume_pdf', 50);
            if (!charged) return;
            setIsSuccess(true);
            setTimeout(() => {
                onImport(parsedData);
                handleClose();
            }, 1500);
        } catch (err) {
            setError('Failed to parse PDF. The file might be protected or malformed.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="rv-modal-backdrop absolute inset-0 transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="rv-modal relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="import-resume-title">

                {/* Success Overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-50 bg-[var(--bg-card)]/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300 text-center px-8">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10">
                            <CheckCircle2 size={30} className="text-green-600" />
                        </div>
                        <p className="rv-kicker">Import complete</p>
                        <h3 className="mt-2 font-serif-ed text-3xl text-[var(--text-main)]">Your resume is ready</h3>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">Review the structured sections before exporting.</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-5 sm:px-7 sm:py-6">
                    <div className="flex items-start gap-3">
                            <span className="rv-icon-tile">
                                <FileText size={18} />
                            </span>
                            <div>
                                <p className="rv-kicker">Start from existing work</p>
                                <h2 id="import-resume-title" className="mt-1 font-serif-ed text-3xl leading-none text-[var(--text-main)]">Import resume</h2>
                                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">Paste text or upload a PDF. We’ll convert it into editable sections.</p>
                            </div>
                        </div>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
                        aria-label="Close import dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="rv-segmented mx-5 mt-5 sm:mx-7">
                    <button
                        onClick={() => setActiveTab('text')}
                        data-active={activeTab === 'text'}
                    >
                        <FileText size={16} />
                        Paste Text
                    </button>
                    <button
                        onClick={() => setActiveTab('pdf')}
                        data-active={activeTab === 'pdf'}
                    >
                        <Upload size={16} />
                        Upload PDF
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                    {activeTab === 'text' ? (
                        <div className="space-y-4">
                            <div className="relative group">
                                <textarea
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="Paste your resume text here…"
                                    className="rv-field h-72 w-full resize-none px-4 py-4 text-sm leading-relaxed placeholder:text-[var(--text-muted)]/55"
                                />
                                <div className="absolute bottom-3 right-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-medium text-[var(--text-muted)]">
                                    {textInput.length} chars
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 h-72">
                            <div className="relative h-full">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handlePdfUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isProcessing}
                                />
                                <div className={`rv-dropzone group relative flex h-full flex-col items-center justify-center ${isProcessing ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : ''}`}>
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center text-center">
                                            <div className="relative">
                                                <Loader2 size={40} className="animate-spin text-[var(--accent)]" />
                                            </div>
                                            <p className="mt-5 font-serif-ed text-2xl text-[var(--text-main)]">Reading your PDF…</p>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">Extracting details into editable sections</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="absolute top-4 right-4 pointer-events-none z-20 flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-main)] shadow-sm">
                                                    <Sparkles size={12} className="text-[var(--accent)]" />
                                                    50 Tokens
                                                </div>
                                            </div>
                                            <div className="rv-icon-tile mb-4 h-12 w-12">
                                                <Upload size={20} />
                                            </div>
                                            <h4 className="text-sm font-semibold text-[var(--text-main)]">Drop your PDF here</h4>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">or click to choose a file</p>
                                            <div className="mt-5 flex items-center gap-1.5 rounded-lg bg-[var(--bg-input)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                                <CheckCircle2 size={10} />
                                                PDF format only
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                            <div className="mt-0.5 p-1 bg-red-500/20 rounded-full">
                                <X size={14} className="text-red-400" />
                            </div>
                            <span className="text-sm font-bold text-red-400 leading-tight">{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4 sm:flex-row sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <div className="rv-icon-tile h-8 w-8"><Sparkles size={12} /></div>
                        </div>
                        <p className="text-xs font-medium text-[var(--text-muted)] leading-tight">
                            Structured with AI assistance<br />
                            <span className="text-[10px] text-[var(--text-muted)]/70">Review imported content before exporting</span>
                        </p>
                    </div>

                    <div className="flex gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleClose}
                            className="rv-button-quiet flex-1 sm:flex-none"
                        >
                            Cancel
                        </button>
                        {activeTab === 'text' && (
                            <button
                                onClick={handleTextImport}
                                disabled={isProcessing || !textInput.trim()}
                                className="rv-button-primary group relative flex-1 sm:flex-none"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        Import resume
                                        <span className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">50 tokens</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
