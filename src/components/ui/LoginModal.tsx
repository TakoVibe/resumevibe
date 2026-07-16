import React from "react";
import { Lock, X } from "lucide-react";
import { GoogleLogin } from "../GoogleLogin";

export function LoginModal() {
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        const handleShow = () => setIsOpen(true);
        window.addEventListener('show-login-modal', handleShow);
        return () => window.removeEventListener('show-login-modal', handleShow);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="rv-modal-backdrop absolute inset-0" onClick={() => setIsOpen(false)} />
            <div className="rv-modal relative w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">

                <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]" aria-label="Close login dialog">
                    <X size={17} />
                </button>

                <div className="relative flex h-full flex-col items-center p-7 text-center sm:p-9">

                    <div className="relative mb-5">
                        <div className="rv-icon-tile h-12 w-12">
                            <Lock className="h-5 w-5" strokeWidth={1.5} />
                        </div>
                    </div>

                    <p className="rv-kicker">ResumeVibe account</p>
                    <h2 id="login-modal-title" className="mb-3 mt-1 font-serif-ed text-3xl text-[var(--text-main)]">Continue to your workspace</h2>
                    <p className="mb-7 px-2 text-xs leading-relaxed text-[var(--text-muted)]">
                        Sign in to save versions, share your resume, and return directly to your first saved document.
                    </p>

                    <div className="mb-5 flex w-full justify-center">
                        <GoogleLogin />
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="rv-button-quiet"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
