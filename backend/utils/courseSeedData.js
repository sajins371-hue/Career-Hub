// Starter course catalog so the Learning page isn't empty. Each links to the official free
// learning material for that skill. skillsTaught are lowercase to match job requiredSkills
// (see seed.js), which is what the skill-gap / learning-path matching compares against.
module.exports = [
  { title: 'Learn React', provider: 'React Docs', url: 'https://react.dev/learn', skillsTaught: ['react', 'javascript'], level: 'beginner', durationHours: 10, isFree: true,
    description: 'The official step-by-step introduction to building user interfaces with React.' },
  { title: 'Modern JavaScript Tutorial', provider: 'javascript.info', url: 'https://javascript.info', skillsTaught: ['javascript'], level: 'beginner', durationHours: 40, isFree: true,
    description: 'From the basics to advanced topics, with explanations and exercises.' },
  { title: 'TypeScript Handbook', provider: 'TypeScript Docs', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', skillsTaught: ['typescript'], level: 'intermediate', durationHours: 8, isFree: true,
    description: 'The official guide to adding static types to JavaScript.' },
  { title: 'Node.js Learn', provider: 'Node.js', url: 'https://nodejs.org/en/learn', skillsTaught: ['node', 'javascript'], level: 'beginner', durationHours: 8, isFree: true,
    description: 'Official guides to the Node.js runtime, from getting started to the core modules.' },
  { title: 'MongoDB University', provider: 'MongoDB', url: 'https://learn.mongodb.com', skillsTaught: ['mongodb'], level: 'beginner', durationHours: 12, isFree: true,
    description: 'Free self-paced courses on MongoDB fundamentals, schema design and aggregation.' },
  { title: 'Python Tutorial', provider: 'Python Docs', url: 'https://docs.python.org/3/tutorial/', skillsTaught: ['python'], level: 'beginner', durationHours: 15, isFree: true,
    description: 'The official tutorial covering the language and the standard library.' },
  { title: 'SQLBolt: Learn SQL', provider: 'SQLBolt', url: 'https://sqlbolt.com', skillsTaught: ['sql'], level: 'beginner', durationHours: 6, isFree: true,
    description: 'Short interactive lessons covering queries, joins and aggregates.' },
  { title: 'Get Started with Docker', provider: 'Docker Docs', url: 'https://docs.docker.com/get-started/', skillsTaught: ['docker'], level: 'beginner', durationHours: 5, isFree: true,
    description: 'Build, run and share containers, then orchestrate them with Compose.' },
  { title: 'Kubernetes Tutorials', provider: 'Kubernetes Docs', url: 'https://kubernetes.io/docs/tutorials/', skillsTaught: ['kubernetes', 'docker'], level: 'intermediate', durationHours: 12, isFree: true,
    description: 'Hands-on tutorials for deploying and managing applications on Kubernetes.' },
  { title: 'AWS Skill Builder', provider: 'AWS Training', url: 'https://skillbuilder.aws', skillsTaught: ['aws'], level: 'beginner', durationHours: 15, isFree: true,
    description: 'Free cloud fundamentals and service-specific digital training from AWS.' },
  { title: 'Redis University', provider: 'Redis', url: 'https://university.redis.io', skillsTaught: ['redis'], level: 'beginner', durationHours: 10, isFree: true,
    description: 'Free courses on Redis data structures, caching and persistence.' },
  { title: 'Pro Git', provider: 'git-scm.com', url: 'https://git-scm.com/book', skillsTaught: ['git'], level: 'beginner', durationHours: 8, isFree: true,
    description: 'The full book on Git, from first commit to advanced workflows.' }
];
