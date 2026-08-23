import { Bold, Italic, List, Type, LayoutTemplate, MessageSquarePlus, Keyboard, Files } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { useTheme } from '../../context/ThemeContext';
import { CustomSelect } from './CustomSelect';

export function EditorToolbar({ onAddSection, isMobile = false }: { onAddSection: () => void; isMobile?: boolean }) {
    const { data, updateResume } = useResume();
    const { isDarkMode } = useTheme();
    const config = data.config || {};

    const updateConfig = (key: keyof typeof config, val: any) => {
        updateResume({
            ...data,
            config: { ...config, [key]: val }
        });
    };

    const updateDocumentMode = (val: 'standard' | 'singlePage') => {
        updateResume({
            ...data,
            config: {
                ...config,
                documentMode: val,
                margins: val === 'singlePage' ? 'compact' : (config.margins === 'compact' ? 'standard' : (config.margins || 'standard')),
                baseFontSize: val === 'singlePage' ? Math.min(Number(config.baseFontSize || 10), 9) : Math.max(Number(config.baseFontSize || 10), 10),
                lineHeight: val === 'singlePage' ? 1.28 : 1.35
            }
        });
    };

    const exec = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
    };

    const fontOptions = [
        { value: 'Inter', label: 'Sans (Inter)' },
        { value: 'Merriweather', label: 'Serif' },
        { value: 'Roboto Mono', label: 'Mono' },
        { value: 'Outfit', label: 'Premium (Outfit)' },
        { value: 'Plus Jakarta Sans', label: 'Jakarta' },
    ];

    const fontSizeOptions = [9, 10, 11, 12, 13, 14].map(s => ({ value: s, label: `${s}pt` }));

    const marginOptions = [
        { value: 'compact', label: 'Compact' },
        { value: 'narrow', label: 'Narrow' },
        { value: 'standard', label: 'Standard' },
        { value: 'wide', label: 'Wide' },
        { value: 'relaxed', label: 'Relaxed' },
    ];

    const documentModeOptions = [
        { value: 'standard', label: 'Conventional' },
        { value: 'singlePage', label: 'One-page columns' },
    ];

    const containerClasses = isMobile
        ? "no-scrollbar flex w-full items-center gap-2 overflow-x-auto"
        : "flex w-fit max-w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-card)] px-2 py-1.5 shadow-sm select-none";

    const btnClass = "p-2 text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] rounded-lg transition-colors";

    return (
        <div className={containerClasses} style={!isMobile ? { boxShadow: 'var(--shadow)' } : undefined}>

            {/* Formatting Group */}
            <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-1">
                <button
                    onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}
                    className={btnClass}
                    title="Bold"
                >
                    <Bold size={15} />
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}
                    className={btnClass}
                    title="Italic"
                >
                    <Italic size={15} />
                </button>
                <div className="w-px h-4 bg-[var(--border-color)] mx-0.5"></div>
                <div
                    className="cursor-help p-2 text-[var(--text-muted)] opacity-40"
                    title="Press Ctrl+K to add link"
                >
                    <Keyboard size={15} />
                </div>
                <button
                    onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}
                    className={btnClass}
                    title="Bullet List"
                >
                    <List size={15} />
                </button>
            </div>

            {/* Add Section */}
            <div className="flex shrink-0 items-center">
                <button
                    data-tour="add-section"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
                    style={{ boxShadow: '0 2px 8px var(--accent-glow)' }}
                    onClick={onAddSection}
                >
                    <MessageSquarePlus size={14} />
                    <span>Add</span>
                </button>
            </div>

            {/* Typography Group */}
            <div className="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-1.5">
                <CustomSelect
                    value={config.fontFamily || 'Inter'}
                    options={fontOptions}
                    onChange={(val) => updateConfig('fontFamily', val)}
                    icon={<Type size={13} />}
                    className="min-w-[124px]"
                />
                <div className="w-px h-4 bg-[var(--border-color)]"></div>
                <CustomSelect
                    value={config.baseFontSize || 10}
                    options={fontSizeOptions}
                    onChange={(val) => updateConfig('baseFontSize', val)}
                    className="min-w-[60px]"
                />
            </div>

            {/* Layout Group */}
            <div className="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-1.5">
                <CustomSelect
                    value={config.documentMode || 'standard'}
                    options={documentModeOptions}
                    onChange={(val) => updateDocumentMode(val)}
                    icon={<Files size={13} />}
                    className="min-w-[132px]"
                />
                <div className="w-px h-4 bg-[var(--border-color)]"></div>
                <CustomSelect
                    value={config.margins || 'standard'}
                    options={marginOptions}
                    onChange={(val) => updateConfig('margins', val)}
                    icon={<LayoutTemplate size={13} />}
                    className="min-w-[110px]"
                />
            </div>
        </div>
    );
}
