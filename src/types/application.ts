import type { ResumeSchema } from './resume';

export type FitStatus = 'matched' | 'partial' | 'gap';
export type FitDecision = 'apply' | 'stretch' | 'skip';
export type ApplicationStatus = 'draft' | 'ready' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface RequirementEvidence {
    id: string;
    requirement: string;
    priority: 'must-have' | 'preferred';
    status: FitStatus;
    evidence: string;
    evidenceSource?: string;
    recommendation: string;
    score: number;
}

export interface EvidenceReport {
    decision: FitDecision;
    coverage: number;
    matchedCount: number;
    partialCount: number;
    gapCount: number;
    mustHaveGapCount: number;
    requirements: RequirementEvidence[];
    strengths: string[];
    risks: string[];
    analyzedAt: string;
}

export interface JobApplicationRecord {
    id: string;
    company: string;
    role: string;
    jobDescription: string;
    status: ApplicationStatus;
    evidenceReport: EvidenceReport;
    resumeSnapshot: ResumeSchema;
    coverLetter?: string;
    recruiterMessage?: string;
    interviewQuestions?: string[];
    createdAt: string;
    updatedAt: string;
    appliedAt?: string;
}
