import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export class ResumeErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Resume editor render failed:', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-main)] p-6 text-[var(--text-main)]">
                <section className="rv-panel w-full max-w-lg p-7 text-center sm:p-9" role="alert">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                        <AlertTriangle size={23} />
                    </span>
                    <h1 className="mt-5 font-serif-ed text-3xl">The resume editor needs to recover</h1>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                        Your saved resume is still available. Reload the editor to restore a validated copy.
                    </p>
                    <button type="button" className="rv-button-primary mt-6 w-full" onClick={() => window.location.reload()}>
                        <RefreshCw size={15} /> Reload editor
                    </button>
                </section>
            </main>
        );
    }
}

