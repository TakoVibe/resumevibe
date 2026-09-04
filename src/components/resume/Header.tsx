import type { PersonalInfo } from '../../types/resume';
import { EditableField } from '../ui/EditableField';

interface Props {
    personalInfo: PersonalInfo;
    isEditable?: boolean;
    onUpdate?: (info: PersonalInfo) => void;
    onEdit?: () => void;
    viewMode?: 'desktop' | 'mobile';
}

export function Header({ personalInfo, isEditable = false, onUpdate, onEdit, viewMode = 'desktop' }: Props) {
    const isMobile = viewMode === 'mobile';

    const updateField = (field: keyof PersonalInfo, value: string) => {
        onUpdate?.({ ...personalInfo, [field]: value });
    };

    const formatUrl = (url: string) => {
        return url
            .replace(/^https?:\/\/(www\.)?/, '')
            .replace(/\/$/, '')
            .replace(/^linkedin\.com\/in\//, 'linkedin.com/')
            .replace(/^github\.com\//, 'github.com/');
    };

    // Filter available contact fields
    const contactFields = [
        { id: 'location', value: personalInfo.location },
        { id: 'phone', value: personalInfo.phone },
        { id: 'email', value: personalInfo.email }
    ].filter(field => field.value?.trim());

    return (
        <header className={`resume-header group/header ${isMobile ? 'flex flex-col gap-1 items-start text-left mb-6' : ''}`}>
            {isEditable && (
                <button
                    onClick={onEdit}
                    className="absolute right-0 top-0 p-2 text-gray-400 hover:text-blue-600 z-10"
                    title="Edit Contact Info"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                </button>
            )}

            <div className={`resume-w-full ${isMobile ? 'text-left' : 'resume-text-center'}`}>
                <EditableField
                    tagName="h1"
                    value={personalInfo.fullName}
                    onSave={(val) => updateField('fullName', val)}
                    isEditable={isEditable}
                    className="resume-name"
                    placeholder="YOUR NAME"
                />
            </div>

            {/* Title Bar - Stack tightly on mobile */}
            {(personalInfo.title?.trim() || isEditable) && (
                <div className={`resume-title-box ${isMobile ? 'mt-0 mb-1' : ''}`}>
                    <EditableField
                        tagName="p"
                        value={personalInfo.title || ""}
                        onSave={(val) => updateField('title', val)}
                        isEditable={isEditable}
                        className="resume-title"
                        placeholder="PROFESSIONAL TITLE"
                    />
                </div>
            )}

            {/* Horizontal Separator - Hide on mobile to save space as requested */}
            {!isMobile && <div className="resume-header-separator"></div>}

            {/* Contact Info - Tiered Layout on Desktop, Vertical/Wrap on Mobile */}
            <div className={`resume-header-contact-section ${isMobile ? '!mt-1 flex flex-col gap-1 items-start !text-sm' : ''}`}>
                {/* Row 1: Location • Phone • Email */}
                {contactFields.length > 0 && (
                    <div className={`${isMobile ? 'flex flex-col gap-0.5 items-start' : 'resume-contact-row resume-text-dark'}`}>
                        {contactFields.map((field, idx) => (
                            <div key={field.id} className="resume-flex resume-items-center">
                                {!isMobile && idx > 0 && <span className="resume-header-bullet">•</span>}
                                {field.id === 'email' ? (
                                    <a href={`mailto:${field.value}`} className="resume-link hover:underline">
                                        <EditableField
                                            value={field.value}
                                            onSave={(val) => updateField(field.id as any, val)}
                                            isEditable={isEditable}
                                            className="min-w-[10px]"
                                        />
                                    </a>
                                ) : (
                                    <EditableField
                                        value={field.value}
                                        onSave={(val) => updateField(field.id as any, val)}
                                        isEditable={isEditable}
                                        className="min-w-[10px]"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Row 2: Links */}
                {personalInfo.profiles && personalInfo.profiles.length > 0 && (
                    <div className={`${isMobile ? 'flex flex-wrap gap-2 mt-2' : 'resume-social-row resume-text-dark'}`}>
                        {personalInfo.profiles.filter(p => p.url?.trim()).map((profile, idx) => (
                            <div key={idx} className="resume-flex resume-items-center">
                                {!isMobile && idx > 0 && <span className="resume-header-bullet">•</span>}
                                <a href={profile.url} target="_blank" rel="noreferrer" className="resume-link hover:underline">
                                    <span>{formatUrl(profile.url)}</span>
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}
