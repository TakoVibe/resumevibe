import type { ResumeSchema } from '../types/resume';
import { initialResume } from './sample-resume';
import { softwareEngineerExample } from './resumeExamples';
import { normalizeResumeData } from '../lib/normalizeResume';

// Starting points offered on /create.

// The early-career example, minus open source, leaves room for the editor's own
// controls so the one-page layout opens without an overflow warning.
const onePageResume: ResumeSchema = {
    ...softwareEngineerExample,
    visibleSections: { ...softwareEngineerExample.visibleSections, openSource: false },
    config: { ...softwareEngineerExample.config, documentMode: 'singlePage' },
};

const academicCv: ResumeSchema = {
    ...initialResume,
    personalInfo: {
        fullName: 'Johnathan Doe',
        title: 'PhD Candidate, Computer Science',
        email: 'johnathan.doe@example.com',
        phone: '+1 (555) 123-4567',
        location: 'Cambridge, MA',
        profiles: [],
    },
    summary: 'Doctoral researcher studying how distributed systems recover from partial failures. Published work on consensus protocols and three years of teaching in undergraduate systems courses.',
    skills: [
        { id: 'cv-skill-methods', name: 'Research methods', items: ['Experimental design', 'Fault injection', 'Statistical analysis'] },
        { id: 'cv-skill-tools', name: 'Languages & tools', items: ['Python', 'Go', 'R', 'LaTeX'] },
    ],
    experience: [],
    projects: [],
    openSource: [],
    achievements: [],
    certifications: [],
    education: [
        { id: 'cv-edu-phd', institution: 'Example University', degree: 'PhD, Computer Science', duration: '2021 – Present', location: 'Cambridge, MA', score: 'Advisor: Prof. Alex Rivera' },
        { id: 'cv-edu-ms', institution: 'Example Institute of Technology', degree: 'M.S., Computer Science', duration: '2019 – 2021', location: 'Boston, MA' },
    ],
    customSections: [
        {
            id: 'cv-research',
            title: 'Research Experience',
            type: 'experience',
            items: [{
                id: 'cv-research-1', company: 'Distributed Systems Lab, Example University', role: 'Graduate Research Assistant',
                duration: '2021 – Present', location: 'Cambridge, MA',
                metrics: [
                    'Built a fault-injection framework to measure how consensus protocols behave under partial network partitions.',
                    'Classified 40 public incident reports into recurring failure patterns; findings presented at a peer-reviewed workshop.',
                ],
                techStack: [],
            }],
        },
        {
            id: 'cv-publications',
            title: 'Publications',
            type: 'custom',
            items: [
                { id: 'cv-pub-1', title: 'Measuring recovery time in partially partitioned clusters', date: '2025', content: 'J. Doe, A. Rivera. <i>Proceedings of the Example Systems Workshop</i>, pp. 12–19.' },
                { id: 'cv-pub-2', title: 'A taxonomy of failures in public cloud incident reports', date: '2023', content: 'J. Doe, M. Chen, A. Rivera. <i>Example Journal of Reliable Computing</i>, 8(2).' },
            ],
        },
        {
            id: 'cv-teaching',
            title: 'Teaching Experience',
            type: 'experience',
            items: [{
                id: 'cv-teaching-1', company: 'Operating Systems (CS 3210), Example University', role: 'Teaching Assistant',
                duration: 'Fall 2022 – Spring 2024', location: 'Cambridge, MA',
                metrics: ['Led weekly recitations for 45 students and rewrote two lab assignments with automated tests.'],
                techStack: [],
            }],
        },
        {
            id: 'cv-references',
            title: 'References',
            type: 'custom',
            items: [
                { id: 'cv-ref-1', title: 'Prof. Alex Rivera', date: '', content: 'Doctoral advisor, Example University · alex.rivera@example.edu' },
            ],
        },
    ],
    sectionOrder: ['summary', 'education', 'cv-research', 'cv-publications', 'cv-teaching', 'skills', 'cv-references'],
    visibleSections: {
        summary: true, education: true, skills: true,
        experience: false, projects: false, openSource: false, achievements: false, certifications: false,
        'cv-research': true, 'cv-publications': true, 'cv-teaching': true, 'cv-references': true,
    },
};

export const START_TEMPLATES = new Map<string, ResumeSchema>([
    ['one-page', onePageResume],
    ['academic-cv', academicCv],
]);

let starterSnapshots: Set<string> | null = null;

/**
 * True while a document is still exactly a starter: the sample resume or a /create template.
 * Autosave skips these so opening the editor never creates a document by itself. Any edit,
 * or an explicit Save, makes the document the user's.
 */
export function isUntouchedStarter(data: ResumeSchema) {
    starterSnapshots ??= new Set([initialResume, ...START_TEMPLATES.values()].map((starter) => JSON.stringify(normalizeResumeData(starter))));
    return starterSnapshots.has(JSON.stringify(normalizeResumeData(data)));
}
