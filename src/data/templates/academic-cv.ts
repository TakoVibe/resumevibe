import type { ResumeSchema } from '../../types/resume';
import { initialResume } from '../sample-resume';

// Academic CV, offered on /create. People in it are placeholders (Rule 1): "A. N. Other" stands
// in for co-authors and referees, and every address is on a reserved example domain.
export default {
    ...initialResume,
    personalInfo: {
        fullName: 'Johnathan Doe',
        title: 'PhD Candidate, Computer Science',
        email: 'johnathan.doe@example.com',
        phone: '+1 (555) 010-0100',
        location: 'City, State',
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
        { id: 'cv-edu-phd', institution: 'Example University', degree: 'PhD, Computer Science', duration: '2021 – Present', location: 'City, State', score: 'Advisor: Prof. A. N. Other' },
        { id: 'cv-edu-ms', institution: 'Example Institute of Technology', degree: 'M.S., Computer Science', duration: '2019 – 2021', location: 'City, State' },
    ],
    customSections: [
        {
            id: 'cv-research',
            title: 'Research Experience',
            type: 'experience',
            items: [{
                id: 'cv-research-1', company: 'Distributed Systems Lab, Example University', role: 'Graduate Research Assistant',
                duration: '2021 – Present', location: 'City, State',
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
                { id: 'cv-pub-1', title: 'Measuring recovery time in partially partitioned clusters', date: '2025', content: 'J. Doe, A. N. Other. <i>Proceedings of the Example Systems Workshop</i>, pp. 12–19.' },
                { id: 'cv-pub-2', title: 'A taxonomy of failures in public cloud incident reports', date: '2023', content: 'J. Doe, A. N. Other, et al. <i>Example Journal of Reliable Computing</i>, 8(2).' },
            ],
        },
        {
            id: 'cv-teaching',
            title: 'Teaching Experience',
            type: 'experience',
            items: [{
                id: 'cv-teaching-1', company: 'Operating Systems (CS 3210), Example University', role: 'Teaching Assistant',
                duration: 'Fall 2022 – Spring 2024', location: 'City, State',
                metrics: ['Led weekly recitations for 45 students and rewrote two lab assignments with automated tests.'],
                techStack: [],
            }],
        },
        {
            id: 'cv-references',
            title: 'References',
            type: 'custom',
            items: [
                { id: 'cv-ref-1', title: 'Prof. A. N. Other', date: '', content: 'Doctoral advisor, Example University · referee@example.edu' },
            ],
        },
    ],
    sectionOrder: ['summary', 'education', 'cv-research', 'cv-publications', 'cv-teaching', 'skills', 'cv-references'],
    visibleSections: {
        summary: true, education: true, skills: true,
        experience: false, projects: false, openSource: false, achievements: false, certifications: false,
        'cv-research': true, 'cv-publications': true, 'cv-teaching': true, 'cv-references': true,
    },
} satisfies ResumeSchema;
