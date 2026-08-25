import type { ResumeSchema } from '../../types/resume';
import { Plus, Trash2 } from 'lucide-react';
import { InlineEditor } from './InlineEditor';
import { InlineAIButton } from '../ui/InlineAIButton';

interface Props {
    projects: ResumeSchema['projects'];
    onChange: (projects: ResumeSchema['projects']) => void;
}

export function ProjectsEditor({ projects, onChange }: Props) {
    const addProject = () => {
        onChange([
            {
                id: crypto.randomUUID(),
                name: 'New Project',
                description: 'Description',
                techStack: [],
                metrics: []
            },
            ...projects
        ]);
    };

    const removeProject = (id: string) => {
        onChange(projects.filter(p => p.id !== id));
    };

    const updateProject = (id: string, field: keyof ResumeSchema['projects'][0], value: any) => {
        onChange(projects.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const updateMetric = (id: string, index: number, value: string) => {
        onChange(projects.map(p => {
            if (p.id !== id) return p;
            const newMetrics = p.metrics ? [...p.metrics] : [];
            newMetrics[index] = value;
            return { ...p, metrics: newMetrics };
        }));
    };

    const addMetric = (id: string) => {
        onChange(projects.map(p => {
            if (p.id !== id) return p;
            return { ...p, metrics: [...(p.metrics || []), 'New Detail'] };
        }));
    };

    const removeMetric = (id: string, index: number) => {
        onChange(projects.map(p => {
            if (p.id !== id) return p;
            return { ...p, metrics: (p.metrics || []).filter((_, i) => i !== index) };
        }));
    };

    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-blue-500 pl-3">Projects</h3>
                <button onClick={addProject} className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">
                    <Plus size={14} /> Add Project
                </button>
            </div>

            <div className="space-y-6">
                {projects.map((project) => (
                    <div key={project.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                        <div className="flex justify-between">
                            <div className="flex-1 space-y-2 mr-4">
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded text-sm font-bold"
                                    value={project.name}
                                    onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                                    placeholder="Project Name"
                                />
                                <div className="w-full group">
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <InlineEditor
                                                content={project.description || ''}
                                                onChange={(val) => updateProject(project.id, 'description', val)}
                                                className="min-h-[80px] text-sm border border-gray-300 rounded px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                                                placeholder="Description"
                                            />
                                        </div>
                                        <InlineAIButton
                                            text={project.description || ''}
                                            type="description"
                                            context={{
                                                projectName: project.name,
                                                techStack: project.techStack,
                                            }}
                                            onAccept={(optimized) => updateProject(project.id, 'description', optimized)}
                                        />
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded text-sm"
                                    value={project.link || ''}
                                    onChange={(e) => updateProject(project.id, 'link', e.target.value)}
                                    placeholder="Project Link (URL)"
                                />
                            </div>
                            <button onClick={() => removeProject(project.id)} className="text-red-500 hover:text-red-700 self-start p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Metrics / Details */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Details / Metrics</label>
                            {(project.metrics || []).map((metric, idx) => {
                                const metricText = typeof metric === 'string' ? metric : metric.text;

                                return (
                                    <div key={idx} className="group">
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <InlineEditor
                                                    content={metricText}
                                                    onChange={(val) => updateMetric(project.id, idx, val)}
                                                    className="min-h-[32px] text-sm border border-gray-300 rounded px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                                                />
                                            </div>
                                            <InlineAIButton
                                                text={metricText}
                                                type="bullet"
                                                context={{
                                                    projectName: project.name,
                                                    techStack: project.techStack || [],
                                                }}
                                                onAccept={(optimized) => updateMetric(project.id, idx, optimized)}
                                            />
                                            <button onClick={() => removeMetric(project.id, idx)} className="text-gray-400 hover:text-red-500 p-1">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <button onClick={() => addMetric(project.id)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Plus size={12} /> Add Detail
                            </button>
                        </div>

                        {/* Tech Stack */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Tech Stack</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded text-sm mt-1"
                                value={(project.techStack || []).join(', ')}
                                onChange={(e) => updateProject(project.id, 'techStack', e.target.value.split(',').map(s => s.trim()))}
                                placeholder="e.g. Go, React"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
