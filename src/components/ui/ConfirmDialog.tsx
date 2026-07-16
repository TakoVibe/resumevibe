import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="rv-modal-backdrop absolute inset-0 transition-opacity"
                onClick={onCancel}
            />

            {/* Dialog Panel */}
            <div className="rv-modal relative w-full max-w-sm p-6 opacity-100">
                <p className="rv-kicker">Please confirm</p>
                <h3 className="mb-2 mt-1 font-serif-ed text-2xl text-[var(--text-main)]">
                    {title}
                </h3>

                <p className="text-sm text-[var(--text-muted)] mb-6">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        className="rv-button-secondary"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                        className={`rv-button-primary ${isDestructive
                            ? '!border-red-600 !bg-red-600 !text-white hover:!bg-red-700'
                            : ''
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
