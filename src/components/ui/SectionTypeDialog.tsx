import { User, Briefcase, GraduationCap, Code, Award, Folder, FileText, Plus, Github } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: string, label?: string) => void;
    existingSections: { [key: string]: boolean };
}

export function SectionTypeDialog({
    isOpen,
    onClose,
    onSelect,
    existingSections
}: Props) {
    if (!isOpen) return null;

    const sections = [
        { id: 'summary', icon: User, label: 'Professional Summary', description: 'Brief overview of your career goals and achievements' },
        { id: 'experience', icon: Briefcase, label: 'Work Experience', description: 'Your detailed employment history' },
        { id: 'education', icon: GraduationCap, label: 'Education', description: 'Degrees, schools, and academic achievements' },
        { id: 'skills', icon: Code, label: 'Key Skills', description: 'Technical and soft skills relevant to the job' },
        { id: 'projects', icon: Folder, label: 'Projects', description: 'Key projects you have worked on' },
        { id: 'certifications', icon: Award, label: 'Certifications', description: 'Professional certifications and awards' },
        { id: 'openSource', icon: Github, label: 'Open Source', description: 'Your contributions to open source projects' },
        { id: 'achievements', icon: Award, label: 'Achievements', description: 'Highlight your notable career achievements' },
        { id: 'custom', icon: FileText, label: 'Custom Section', description: 'Create a section with your own title and content' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="rv-modal-backdrop absolute inset-0 transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Panel */}
            <div className="rv-modal relative w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="add-section-title">
                <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-5 sm:px-7 sm:py-6">
                    <div>
                        <p className="rv-kicker">Resume structure</p>
                        <h3 id="add-section-title" className="mt-1 font-serif-ed text-3xl leading-none text-[var(--text-main)]">Add a section</h3>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">Choose the next block in your professional story.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
                        aria-label="Close section dialog"
                    >
                        <Plus size={18} className="rotate-45" />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-7">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {sections.map((section) => {
                            const Icon = section.icon;

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => {
                                        onSelect(section.id, section.label);
                                        onClose();
                                    }}
                                    className="group flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)]"
                                >
                                    <div className="rv-icon-tile h-9 w-9">
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="mb-1 text-xs font-semibold leading-none text-[var(--text-main)]">
                                            {section.label}
                                        </h4>
                                        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                                            {section.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-3 text-center text-[10px] text-[var(--text-muted)]">
                    Custom sections can be renamed after they are added.
                </div>
            </div>
        </div>
    );
}
