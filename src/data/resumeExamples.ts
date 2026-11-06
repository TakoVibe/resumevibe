import type { ResumeSchema } from '../types/resume';
import { initialResume } from './sample-resume';

// Fictional, editable examples. Keep the reserved sample email so the editor
// never treats an untouched example as a real account-owned resume.
export const backendDeveloperExample: ResumeSchema = {
    ...initialResume,
    personalInfo: {
        fullName: 'Johnathan Doe',
        title: 'Backend Developer',
        email: 'johnathan.doe@example.com',
        phone: '+1 (555) 010-0100',
        location: 'City, State',
        profiles: [],
    },
    summary: 'Backend developer with five years of experience building Python APIs and data services. Improved request latency, database reliability, and release safety for customer-facing systems.',
    skills: [
        { id: 'backend-language', name: 'Languages & frameworks', items: ['Python', 'SQL', 'FastAPI', 'Django'] },
        { id: 'backend-data', name: 'Data & infrastructure', items: ['PostgreSQL', 'Redis', 'Docker', 'AWS', 'GitHub Actions'] },
    ],
    experience: [
        {
            id: 'backend-exp-1', company: 'Example Commerce', role: 'Backend Developer',
            duration: 'Jan 2022 – Present', location: 'Austin, TX',
            metrics: [
                'Reduced median catalog API response time from 420 ms to 260 ms by adding PostgreSQL indexes and caching frequent reads in Redis.',
                'Built idempotent payment webhook handling and alerting, reducing duplicate order investigations from eight per month to one.',
                'Added integration tests and staged deployments for three services, helping the team detect breaking changes before release.',
            ],
            techStack: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
        },
        {
            id: 'backend-exp-2', company: 'Northstar Labs', role: 'Junior Software Developer',
            duration: 'Jun 2020 – Dec 2021', location: 'Remote',
            metrics: [
                'Built a scheduled data import that validated incoming records and reported rejected rows to support staff.',
                'Documented API errors and created regression tests for authentication and account settings endpoints.',
            ],
            techStack: ['Python', 'Django', 'PostgreSQL', 'pytest'],
        },
    ],
    projects: [{
        id: 'backend-project', name: 'Queue-based report exporter', date: '2023',
        description: 'A practice project showing background job processing and operational checks.',
        metrics: [
            'Moved large report generation to a worker queue so HTTP requests could return quickly.',
            'Added retries, job status, and a simple dashboard for failed exports.',
        ],
        techStack: ['Python', 'Redis', 'PostgreSQL'],
    }],
    openSource: [{
        id: 'backend-open-source',
        name: 'Community Python job queue (fictional)',
        description: 'Added integration tests for failed-job retries and documented local setup so contributors could reproduce queue errors.',
    }],
    education: [{ id: 'backend-education', institution: 'Example University', degree: 'B.S. Computer Science', duration: '2016 – 2020', location: 'Austin, TX' }],
    achievements: [],
    certifications: [],
    sectionOrder: ['summary', 'skills', 'experience', 'projects', 'openSource', 'education'],
    visibleSections: { summary: true, skills: true, experience: true, projects: true, education: true, openSource: true, achievements: false, certifications: false },
};

export const softwareEngineerExample: ResumeSchema = {
    ...initialResume,
    personalInfo: {
        fullName: 'Johnathan Doe',
        title: 'Software Engineer',
        email: 'johnathan.doe@example.com',
        phone: '+1 (555) 010-0100',
        location: 'City, State',
        profiles: [],
    },
    summary: 'Software engineer with two years of experience shipping web features and testing production systems. Comfortable moving between TypeScript interfaces, Node.js services, and SQL-backed data flows.',
    skills: [
        { id: 'software-language', name: 'Languages', items: ['TypeScript', 'JavaScript', 'SQL', 'Python'] },
        { id: 'software-tools', name: 'Frameworks & tools', items: ['React', 'Node.js', 'PostgreSQL', 'Jest', 'Git'] },
    ],
    experience: [
        {
            id: 'software-exp-1', company: 'Example Workspace', role: 'Software Engineer',
            duration: 'Jul 2024 – Present', location: 'Seattle, WA',
            metrics: [
                'Built an account settings flow in React and Node.js, with API validation and automated tests for the main failure cases.',
                'Reduced repeated support requests by adding clearer form errors and a self-service recovery path.',
                'Added PostgreSQL query checks to a reporting endpoint and cut its median response time from 900 ms to 550 ms.',
            ],
            techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        },
        {
            id: 'software-exp-2', company: 'Maple Studio', role: 'Software Engineering Intern',
            duration: 'May 2023 – Aug 2023', location: 'Remote',
            metrics: [
                'Implemented accessible search filters and wrote component tests for keyboard navigation.',
                'Worked with a designer to replace a slow page load with paginated results.',
            ],
            techStack: ['React', 'JavaScript', 'Jest'],
        },
    ],
    projects: [{
        id: 'software-project', name: 'Community event planner', date: '2023 – 2024',
        description: 'A personal project for creating events, tracking RSVPs, and sending reminders.',
        metrics: [
            'Designed REST endpoints and a relational schema for event and attendee records.',
            'Added automated tests for capacity limits and duplicate registrations.',
        ],
        techStack: ['React', 'Node.js', 'PostgreSQL'],
    }],
    openSource: [{
        id: 'software-open-source',
        name: 'Community React component library (fictional)',
        description: 'Improved keyboard navigation in a menu component and added regression tests for focus behavior.',
    }],
    education: [{ id: 'software-education', institution: 'Example University', degree: 'B.S. Software Engineering', duration: '2020 – 2024', location: 'Seattle, WA' }],
    achievements: [],
    certifications: [],
    sectionOrder: ['summary', 'skills', 'experience', 'projects', 'openSource', 'education'],
    visibleSections: { summary: true, skills: true, experience: true, projects: true, education: true, openSource: true, achievements: false, certifications: false },
};

export type ResumeExampleId = 'backend-developer' | 'software-engineer';

export const resumeExamples: Record<ResumeExampleId, ResumeSchema> = {
    'backend-developer': backendDeveloperExample,
    'software-engineer': softwareEngineerExample,
};
