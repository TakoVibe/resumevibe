export const RESUME_ASSISTANT_TOKEN_COST = 5;
export const RESUME_ASSISTANT_ACTION_TYPE = 'inline_edit';

export type ResumeAssistantMemoryCategory = 'technology' | 'work_context' | 'achievement' | 'target_role' | 'preference';

export interface ResumeAssistantMemoryFact {
    id: string;
    category: ResumeAssistantMemoryCategory;
    fact: string;
    createdAt: number;
}

