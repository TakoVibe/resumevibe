import type { ResumeSchema } from '../types/resume';

export const initialResume: ResumeSchema = {
    personalInfo: {
        fullName: "Johnathan Doe",
        email: "johnathan.doe@example.com",
        phone: "+1 (555) 010-0100",
        location: "City, State",
        title: "Staff Software Engineer",
        // Placeholders only (Rule 1): these must never point at a real person's profile or site.
        profiles: [
            { network: "LinkedIn", username: "your-profile", url: "https://linkedin.com/in/your-profile" },
            { network: "GitHub", username: "your-username", url: "https://github.com/your-username" },
            { network: "Portfolio", username: "example.com", url: "https://example.com" }
        ]
    },
    summary: "Strategic and results-driven Staff Software Engineer with over 10 years of experience in architecting distributed systems and high-scale web applications. Expert in Cloud Infrastructure, Microservices Architecture, and AI/ML integration. Proven track record of leading cross-functional teams to deliver mission-critical software solutions that serve millions of active users worldwide. Passionate about engineering excellence, performance optimization, and mentoring the next generation of technical talent.",
    skills: [
        {
            id: "skill-1",
            name: "Core Languages",
            items: ["TypeScript", "Rust", "Go", "Python", "Java", "C++"]
        },
        {
            id: "skill-2",
            name: "Cloud & Infrastructure",
            items: ["AWS (EKS, Lambda, RDS)", "Kubernetes", "Terraform", "Docker", "Prometheus", "Service Mesh (Istio)"]
        },
        {
            id: "skill-3",
            name: "Frameworks & Ecosystem",
            items: ["React", "Next.js", "Node.js", "Express", "FastAPI", "GraphQL (Apollo)", "gRPC"]
        },
        {
            id: "skill-4",
            name: "Data & Persistence",
            items: ["PostgreSQL", "Redis", "MongoDB", "Elasticsearch", "Kafka", "DynamoDB"]
        }
    ],
    experience: [
        {
            id: "exp-1",
            company: "TechNova Systems",
            role: "Staff Software Engineer",
            duration: "Jan 2021 – Present",
            metrics: [
                "Led the migration of a monolithic payment gateway to a <strong>high-performance Go microservice</strong>, resulting in a <strong>40% increase in transaction throughput</strong> and <strong>99.999% availability</strong>",
                "Architected a custom <strong>Observability Platform</strong> using OpenTelemetry and Grafana, reducing Mean Time to Detection (MTTD) of critical production bugs by <strong>65%</strong>",
                "Mentored a team of 15+ engineers across three time zones, establishing <strong>best practices for CI/CD</strong> that reduced deployment cycle time from 2 days to 15 minutes",
                "Spearheaded the integration of <strong>LLM-powered search</strong> features, improving user search relevancy scores by <strong>25%</strong> for a user base of 10M+"
            ],
            techStack: ["Go", "Kubernetes", "AWS", "Terraform", "gRPC", "Next.js", "Python"]
        },
        {
            id: "exp-2",
            company: "Dynamic Cloud Corp",
            role: "Senior Full-Stack Engineer",
            duration: "May 2017 – Dec 2020",
            metrics: [
                "Developed a real-time collaborative workspace using <strong>WebSockets and Redis</strong>, supporting up to <strong>50k concurrent users</strong> with sub-100ms latency",
                "Reduced AWS infrastructure costs by <strong>$1.2M annually</strong> by implementing intelligent auto-scaling policies and optimizing container resource allocation",
                "Engineered a scalable <strong>A/B testing framework</strong> that facilitated over 200 concurrent experiments, directly contributing to a 12% lift in subscription conversion rates"
            ],
            techStack: ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "AWS Lambda", "Docker"]
        },
        {
            id: "exp-3",
            company: "Startup Hub Innovations",
            role: "Software Engineer",
            duration: "Jun 2014 – Apr 2017",
            metrics: [
                "Built the MVP for a B2B SaaS platform from scratch, helping secure <strong>$5M in Series A funding</strong> through robust product delivery and technical architectural decisions",
                "Implemented a custom <strong>React-based UI Library</strong> that was adopted across 5 different internal products, increasing frontend development velocity by 30%",
                "Optimized SQL query performance across legacy databases, reducing average dashboard load times by 4 seconds for enterprise customers"
            ],
            techStack: ["React", "JavaScript", "Ruby on Rails", "MySQL", "Heroku", "CircleCI"]
        }
    ],
    openSource: [
        {
            id: "os-1",
            name: "Community Go metrics exporter (fictional example)",
            description: "Added tests for failed metric scrapes and documented how contributors can reproduce timeout errors. Replace this with a real contribution and pull-request link."
        },
        {
            id: "os-2",
            name: "React form helper (fictional example)",
            description: "Improved keyboard focus behavior and added regression tests for validation errors. Remove this section if you have no open-source contribution to show."
        }
    ],
    projects: [
        {
            id: "proj-1",
            name: "PulseEngine: real-time analytics for IoT",
            description: "",
            link: "https://github.com/your-username/pulse",
            date: "2023 - Present",
            techStack: ["Rust", "ClickHouse", "Wasm", "React"],
            metrics: [
                "<strong>Architected</strong> a distributed ingestion engine capable of processing 1M+ events per second with persistent storage in ClickHouse",
                "Developed a <strong>WebAssembly</strong> visualization layer that allows smooth interaction with millions of data points directly in the browser"
            ]
        },
        {
            id: "proj-2",
            name: "Sentinel: Self-Healing CI/CD Pipeline",
            description: "",
            link: "https://example.com/sentinel",
            date: "2022",
            techStack: ["Python", "Docker", "Kubernetes Operator SDK", "Redis"],
            metrics: [
                "Built a <strong>Kubernetes Operator</strong> that automatically reverts deployments and alerts engineering teams when anomaly detection thresholds are exceeded",
                "Reduced rollback response time from 10 minutes to under 30 seconds by automating the standard incident response playbook"
            ]
        },
        {
            id: "proj-3",
            name: "CloudGraph: Infrastructure Visualization Tool",
            description: "",
            link: "https://example.com/cloudgraph",
            date: "2021",
            techStack: ["TypeScript", "D3.js", "AWS SDK", "Serverless"],
            metrics: [
                "Created a tool that automatically maps AWS resource dependencies into a <strong>Force-Directed Graph</strong>, helping teams identify security and single-point-of-failure risks",
                "Acquired 5k+ stars on GitHub and was featured in the AWS Open Source Blog"
            ]
        }
    ],
    education: [
        {
            id: "edu-1",
            institution: "Stanford University",
            degree: "Master of Science in Computer Science",
            duration: "2012 – 2014",
            location: "Stanford, CA",
            score: "Focus on Distributed Systems"
        },
        {
            id: "edu-2",
            institution: "University of California, Berkeley",
            degree: "Bachelor of Science in Electrical Engineering and Computer Science",
            duration: "2008 – 2012",
            location: "Berkeley, CA",
            score: "GPA: 3.9/4.0"
        }
    ],
    achievements: [
        "Recipient of the Global Excellence Award for Technical Innovation at TechNova (2022)",
        "Winner of the 2019 AWS Serverless Developer Challenge (First Place)"
    ],
    certifications: [
        {
            id: "cert-1",
            name: "AWS Certified Solutions Architect – Professional",
            issuer: "Amazon Web Services"
        },
        {
            id: "cert-2",
            name: "Certified Kubernetes Administrator (CKA)",
            issuer: "Cloud Native Computing Foundation (CNCF)"
        }
    ],
    customSections: [],
    config: {
        baseFontSize: 10,
        documentMode: 'standard'
    },
    sectionOrder: [
        "summary",
        "skills",
        "experience",
        "openSource",
        "projects",
        "achievements",
        "certifications",
        "education"
    ],
    visibleSections: {
        "summary": true,
        "skills": true,
        "experience": true,
        "openSource": true,
        "projects": true,
        "achievements": true,
        "certifications": true,
        "education": true
    },
    sectionTitles: {
        "summary": "Professional Summary",
        "skills": "Key Skills",
        "experience": "Professional Experience",
        "openSource": "Open Source Contributions",
        "projects": "Key Development Projects",
        "achievements": "Awards & Achievements",
        "certifications": "Technical Certifications",
        "education": "Education"
    },
    sectionSeparators: {
        "summary": true,
        "skills": true,
        "experience": true,
        "openSource": true,
        "projects": true,
        "achievements": true,
        "certifications": true,
        "education": true
    }
};
