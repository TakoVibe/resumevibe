import type { ResumeSchema } from '../../types/resume';
import { initialResume } from '../sample-resume';

// Campus placement: the Indian campus-placement format some universities ask students to use.
// Listed on /create as "Campus placement", and shareable as /editor?fresh=1&start=campus.
// A university with its own variation gets its own file that starts from this one, e.g.
//   templates/example-university.ts:
//   import campus from './campus';
//   export default { ...campus, sectionOrder: ['education', 'skills', ...] } satisfies ResumeSchema;
// Every personal detail below is a placeholder (Rule 1).
export default {
    ...initialResume,
    personalInfo: {
        fullName: 'Your Name',
        title: '',
        email: 'your.name@example.com',
        phone: '+91 00000 00000',
        location: 'City, State',
        profiles: [
            { network: 'LinkedIn', username: 'your-profile', url: 'https://linkedin.com/in/your-profile' },
            { network: 'GitHub', username: 'your-username', url: 'https://github.com/your-username' },
        ],
    },
    summary: '',
    experience: [],
    openSource: [],
    customSections: [],
    projects: [
        {
            id: 'campus-project-1',
            name: 'Campus Event Booking Portal',
            date: 'Aug 2025 – Oct 2025',
            techStackLabel: 'Tech:',
            techStack: ['React.js', 'Node.js', 'Express.js', 'MongoDB'],
            metrics: [
                'Built a web portal where students register for campus events and receive QR-code entry passes.',
                'Added dashboards for organisers to track registrations and attendance in real time.',
                'Replaced paper check-in lists with QR scanning at the event entrance.',
            ],
        },
        {
            id: 'campus-project-2',
            name: 'Library Book Recommendation System',
            date: 'Jan 2025 – Mar 2025',
            techStackLabel: 'Tech:',
            techStack: ['Python', 'Flask', 'MySQL', 'React.js'],
            metrics: [
                'Developed a recommendation engine that suggests books from a student\'s borrowing history.',
                'Designed REST APIs for search, issue and return, used by a React front end.',
            ],
        },
    ],
    certifications: [
        { id: 'campus-cert-1', name: 'Data Structures and Algorithms in C++', issuer: 'Issuing organisation', date: 'Mar 2025' },
        { id: 'campus-cert-2', name: 'Full-Stack Web Development', issuer: 'Issuing organisation', date: 'Dec 2024' },
        { id: 'campus-cert-3', name: 'Introduction to Cloud Computing', issuer: 'Issuing organisation', date: 'Jul 2024' },
    ],
    achievements: [
        'Solved 200+ data structures and algorithms problems on online coding platforms.',
        'Took part in a national hackathon as one of a six-member team.',
        'Coordinated weekly practice sessions for the department coding club.',
    ],
    skills: [
        { id: 'campus-skill-languages', name: 'Languages', items: ['C++', 'Java', 'JavaScript', 'Python'] },
        { id: 'campus-skill-frameworks', name: 'Technologies/Frameworks', items: ['HTML', 'CSS', 'React.js', 'Node.js', 'Express.js', 'MongoDB', 'MySQL', 'Git', 'GitHub'] },
        { id: 'campus-skill-domain', name: 'Domain Skills', items: ['Data Structures and Algorithms', 'Object-Oriented Programming', 'Database Management Systems'] },
    ],
    education: [
        { id: 'campus-edu-pg', institution: 'Example University', degree: 'Master of Computer Applications – CGPA: 0.0', duration: '2025 – 2027', location: 'City, State' },
        { id: 'campus-edu-ug', institution: 'Example College', degree: 'Bachelor of Computer Applications – CGPA: 0.0', duration: '2022 – 2025', location: 'City, State' },
        { id: 'campus-edu-xii', institution: 'Example Senior Secondary School', degree: 'Class XII – Percentage: 00%', duration: '2021 – 2022', location: 'City, State' },
        { id: 'campus-edu-x', institution: 'Example Public School', degree: 'Class X – Percentage: 00%', duration: '2019 – 2020', location: 'City, State' },
    ],
    config: { ...initialResume.config, baseFontSize: 11, fontFamily: 'Tinos', documentMode: 'campus', margins: 'narrow' },
    sectionOrder: ['projects', 'certifications', 'achievements', 'skills', 'education', 'summary', 'experience', 'openSource'],
    visibleSections: {
        projects: true, certifications: true, achievements: true, skills: true, education: true,
        summary: false, experience: false, openSource: false,
    },
    sectionTitles: {
        ...initialResume.sectionTitles,
        projects: 'Projects',
        certifications: 'Certificates',
        achievements: 'Co-Curricular Activities',
        skills: 'Technical Skills',
        education: 'Education',
        experience: 'Internships',
    },
} satisfies ResumeSchema;
