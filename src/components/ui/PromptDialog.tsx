import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    isOpen: boolean;
    title: string;
    initialValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export function PromptDialog({
    isOpen,
    title,
    initialValue = '',
    placeholder = '',
    onConfirm,
    onCancel,
    confirmText = "OK",
    cancelText = "Cancel"
}: Props) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset value when dialog opens
    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            // Focus input after a small delay to ensure rendering
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, initialValue]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(value);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left">
            {/* Backdrop */}
            <div
                className="rv-modal-backdrop absolute inset-0 transition-opacity"
                onClick={onCancel}
            />

            {/* Dialog Panel */}
            <div className="rv-modal relative w-full max-w-sm p-6 opacity-100 animate-in fade-in zoom-in-95 duration-200 sm:p-7">
                <p className="rv-kicker">Resume editor</p>
                <h3 className="mb-5 mt-1 font-serif-ed text-2xl text-[var(--text-main)]">
                    {title}
                </h3>

                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="rv-field mb-6 w-full px-4 py-3 text-sm placeholder:text-[var(--text-muted)]/50"
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onCancel(); }}
                            className="rv-button-quiet"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            className="rv-button-primary"
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
