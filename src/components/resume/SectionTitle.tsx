import { EditableField } from '../ui/EditableField';
import { Minus, Plus, AlertCircle } from 'lucide-react';
import { ATSWarning } from '../ui/ATSWarning';

interface Props {
    title: string;
    isEditable?: boolean;
    onChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    actions?: React.ReactNode;
    gapText?: string;
}

export function SectionTitle({ title, isEditable, onChange, showSeparator = true, onToggleSeparator, actions, gapText }: Props) {
    return (
        <div className="resume-section-title-box group/title">
            <div className="resume-flex resume-items-center resume-justify-between">
                <div className="resume-flex-1">
                    <EditableField
                        tagName="h2"
                        value={title}
                        onSave={(val) => onChange?.(val)}
                        isEditable={isEditable}
                        className="resume-section-title"
                    />
                    {isEditable && !(() => {
                        const standardKeywords = ['experience', 'education', 'skills', 'projects', 'summary', 'certifications', 'achievements', 'open source', 'publications', 'languages', 'interests'];
                        const lowerTitle = title.toLowerCase();
                        return standardKeywords.some(keyword => lowerTitle.includes(keyword));
                    })() && (
                            <ATSWarning type="label" className="mt-2 w-fit" />
                        )}
                </div>

                {gapText && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full animate-pulse group/gap relative ml-3">
                        <AlertCircle size={10} className="text-purple-500" />
                        <span className="text-[9px] font-black uppercase tracking-tighter text-purple-600">Gap Detected</span>

                        {/* Tooltip */}
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-purple-900/95 backdrop-blur-xl border border-purple-500/40 rounded-xl text-[10px] text-white font-medium leading-relaxed opacity-0 invisible group-hover/gap:opacity-100 group-hover/gap:visible transition-all z-[100] shadow-2xl">
                            <p className="font-black uppercase tracking-widest text-purple-300 mb-1 flex items-center gap-1.5">
                                <AlertCircle size={10} /> AI Diagnostic
                            </p>
                            {gapText}
                            <div className="absolute top-0 left-4 -mt-1 w-2 h-2 bg-purple-900 border-l border-t border-purple-500/40 rotate-45" />
                        </div>
                    </div>
                )}

                <div className="resume-flex resume-items-center resume-gap-2">
                    {actions}
                    {isEditable && onToggleSeparator && (
                        <button
                            onClick={() => onToggleSeparator(!showSeparator)}
                            className="p-1 text-gray-400 hover:text-blue-500 transition-opacity"
                            title={showSeparator ? "Remove Separator" : "Add Separator"}
                        >
                            {showSeparator ? <Minus size={14} /> : <Plus size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {showSeparator && <div className="resume-separator"></div>}
        </div>
    );
}
