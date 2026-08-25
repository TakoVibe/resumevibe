import type { ResumeSchema } from '../../types/resume';
import { Plus, Trash2 } from 'lucide-react';
import { InlineEditor } from './InlineEditor';

interface Props {
    achievements: ResumeSchema['achievements'];
    onChange: (achievements: ResumeSchema['achievements']) => void;
}

export function AchievementsEditor({ achievements, onChange }: Props) {
    const addItem = () => {
        onChange([...achievements, 'New Achievement']);
    };

    const removeItem = (index: number) => {
        onChange(achievements.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, value: string) => {
        const newItems = [...achievements];
        const currentItem = newItems[index];
        newItems[index] = typeof currentItem === 'string'
            ? value
            : { ...currentItem, text: value };
        onChange(newItems);
    };

    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-blue-500 pl-3">Achievements</h3>
                <button onClick={addItem} className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">
                    <Plus size={14} /> Add
                </button>
            </div>

            <div className="space-y-2">
                {achievements.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1">
                            <InlineEditor
                                content={typeof item === 'string' ? item : item.text}
                                onChange={(val) => updateItem(idx, val)}
                                className="min-h-[40px] text-sm border border-gray-300 rounded px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                            />
                        </div>
                        <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 mt-2">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
