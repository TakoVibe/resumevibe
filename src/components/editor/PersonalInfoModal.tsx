import { useState } from 'react';
import { X, Plus, Trash2, Linkedin, Github, Globe, Twitter, Mail, Smartphone } from 'lucide-react';
import type { PersonalInfo } from '../../types/resume';

interface Props {
    data: PersonalInfo;
    onSave: (data: PersonalInfo) => void;
    onClose: () => void;
}

export function PersonalInfoModal({ data, onSave, onClose }: Props) {
    const [formData, setFormData] = useState<PersonalInfo>(data);
    const labelClass = "block text-[10px] font-sans-ed font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] mb-2";
    const inputClass = "w-full h-11 px-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg outline-none text-[15px] text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 focus:border-[var(--accent)] focus:bg-[var(--bg-card)] transition-all";
    const iconInputClass = "w-full h-11 pl-10 pr-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg outline-none text-[15px] text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 focus:border-[var(--accent)] focus:bg-[var(--bg-card)] transition-all";
    const sectionTitleClass = "flex items-center gap-3 text-[10px] font-sans-ed font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]";

    const updateField = (field: keyof PersonalInfo, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateProfile = (index: number, field: string, value: string) => {
        const newProfiles = [...(formData.profiles || [])];
        newProfiles[index] = { ...newProfiles[index], [field]: value } as any;
        updateField('profiles', newProfiles);
    };

    const addProfile = () => {
        const newProfiles = [...(formData.profiles || []), { network: 'Website', username: '', url: '' }];
        updateField('profiles', newProfiles);
    };

    const removeProfile = (index: number) => {
        const newProfiles = [...(formData.profiles || [])];
        newProfiles.splice(index, 1);
        updateField('profiles', newProfiles);
    };

    const getIcon = (network: string) => {
        const n = network.toLowerCase();
        if (n.includes('linkedin')) return <Linkedin size={16} />;
        if (n.includes('github')) return <Github size={16} />;
        if (n.includes('twitter')) return <Twitter size={16} />;
        if (n.includes('phone')) return <Smartphone size={16} />;
        if (n.includes('mail')) return <Mail size={16} />;
        return <Globe size={16} />;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--bg-card)]/95 rounded-xl shadow-[0_24px_80px_-32px_rgba(0,0,0,0.55)] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-color)] animate-in zoom-in-95 duration-300 font-sans-ed">

                {/* Header */}
                <div className="flex items-start justify-between px-7 py-6 border-b border-[var(--border-color)]">
                    <div>
                        <h2 className="font-serif-ed text-3xl font-normal tracking-tight text-[var(--text-main)] leading-none">Personal Information</h2>
                        <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.25em] text-[var(--text-muted)] opacity-80">
                            Resume header and contact identity
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] rounded-lg transition-all active:scale-95"
                        aria-label="Close personal information"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-7 py-6 space-y-8 flex-1 overflow-y-auto no-scrollbar">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className={sectionTitleClass}>
                            <span>Identity</span>
                            <span className="h-px flex-1 bg-[var(--border-color)]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-1">
                                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={formData.fullName}
                                    onChange={(e) => updateField('fullName', e.target.value)}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>Job Title</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={formData.title || ''}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    placeholder="e.g. Senior Software Engineer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contacts */}
                    <div className="space-y-4">
                        <div className={sectionTitleClass}>
                            <span>Contact</span>
                            <span className="h-px flex-1 bg-[var(--border-color)]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                                    <input
                                        type="email"
                                        className={iconInputClass}
                                        value={formData.email}
                                        onChange={(e) => updateField('email', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                                    <input
                                        type="text"
                                        className={iconInputClass}
                                        value={formData.phone}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Location</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={formData.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    placeholder="City, Country"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dimensions / Socials */}
                    <div className="space-y-4">
                        <div className={sectionTitleClass}>
                            <span>Links</span>
                            <span className="h-px flex-1 bg-[var(--border-color)]" />
                        </div>
                        <div className="divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
                            {formData.profiles?.map((profile, idx) => (
                                <div key={idx} className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3 py-4 group">
                                    <div className="pt-8 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]">
                                        {getIcon(profile.network)}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Network / Label</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={profile.network}
                                                onChange={(e) => updateProfile(idx, 'network', e.target.value)}
                                                placeholder="e.g. LinkedIn"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Username / Display Text</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={profile.username}
                                                onChange={(e) => updateProfile(idx, 'username', e.target.value)}
                                                placeholder="@username"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>URL</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={profile.url}
                                                onChange={(e) => updateProfile(idx, 'url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeProfile(idx)}
                                        className="mt-8 p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90 self-start"
                                        aria-label={`Remove ${profile.network || 'profile'} link`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            {['LinkedIn', 'GitHub', 'Portfolio', 'Twitter', 'Behance'].map(net => (
                                <button
                                    key={net}
                                    onClick={() => {
                                        updateField('profiles', [...(formData.profiles || []), { network: net, username: '', url: '' }]);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all active:scale-95"
                                >
                                    <Plus size={14} /> {net}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    updateField('profiles', [...(formData.profiles || []), { network: 'Website', username: '', url: '' }]);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-subtle)] hover:bg-[var(--accent-subtle)] border border-[var(--accent)]/20 rounded-lg text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)] transition-all active:scale-95"
                            >
                                <Plus size={14} /> Custom
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-7 py-5 border-t border-[var(--border-color)] bg-[var(--bg-main)]/70 backdrop-blur-md flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] rounded-lg transition-all active:scale-95">
                        Cancel
                    </button>
                    <button
                        data-tour="personal-details-done"
                        onClick={() => { onSave(formData); onClose(); }}
                        className="px-8 py-2.5 bg-[var(--text-main)] text-[var(--bg-main)] text-[11px] font-bold uppercase tracking-[0.18em] rounded-lg hover:opacity-90 shadow-[0_18px_34px_-22px_rgba(0,0,0,0.65)] transition-all active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
