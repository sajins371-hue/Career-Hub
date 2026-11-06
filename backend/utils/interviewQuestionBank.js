const crypto = require('crypto');

/** Curated technical questions per skill. Not exhaustive — `genericTechnicalQuestion`
 * covers any skill not listed here so every job always gets relevant questions. */
const SKILL_QUESTIONS = {
  node: [
    'Explain the Node.js event loop and how it handles asynchronous I/O.',
    'How would you debug a memory leak in a long-running Node.js process?',
    'What is the difference between process.nextTick, setImmediate, and setTimeout(fn, 0)?'
  ],
  javascript: [
    'Explain the difference between == and === in JavaScript, and when each matters.',
    'What is a closure, and can you give an example of a practical use case?',
    'How does prototypal inheritance differ from classical inheritance?'
  ],
  react: [
    'Explain the difference between controlled and uncontrolled components.',
    'How does React\'s reconciliation algorithm decide what to re-render?',
    'When would you reach for useMemo or useCallback, and what are the tradeoffs?'
  ],
  python: [
    'Explain the Global Interpreter Lock (GIL) and its impact on multithreaded Python programs.',
    'What is the difference between a list and a generator in terms of memory usage?',
    'How do decorators work in Python, and when have you used one?'
  ],
  sql: [
    'Explain the difference between an INNER JOIN and a LEFT JOIN with an example.',
    'How would you find and fix a slow query in a production database?',
    'What is a database index, and what are the tradeoffs of adding more of them?'
  ],
  mongodb: [
    'When would you choose an embedded document over a reference in MongoDB, and why?',
    'How does MongoDB handle indexing, and how would you diagnose a slow query?',
    'Explain the tradeoffs of MongoDB\'s eventual consistency in a replica set.'
  ],
  aws: [
    'Walk through how you would design a fault-tolerant web service on AWS.',
    'What is the difference between horizontal and vertical scaling, and how does AWS support each?',
    'How would you secure secrets and credentials for an application running on AWS?'
  ],
  docker: [
    'Explain the difference between a Docker image and a container.',
    'How would you reduce the size of a Docker image for a production service?',
    'What is the purpose of a multi-stage Docker build?'
  ],
  kubernetes: [
    'Explain the difference between a Deployment and a StatefulSet in Kubernetes.',
    'How does Kubernetes handle a pod that keeps crashing?',
    'What is the purpose of a readiness probe versus a liveness probe?'
  ]
};

const BEHAVIORAL_QUESTIONS = [
  'Tell me about a time you disagreed with a teammate about a technical decision. What happened?',
  'Describe a project that didn\'t go as planned. What did you learn from it?',
  'Tell me about a time you had to learn something new quickly to finish a task.',
  'Describe a time you received difficult feedback. How did you respond?',
  'Tell me about a time you had to prioritize between competing deadlines.'
];

const SITUATIONAL_QUESTIONS = [
  'If you inherited a codebase with no documentation and a looming deadline, what would you do first?',
  'A teammate\'s code is blocking your work and they\'re unresponsive. How do you handle it?',
  'You discover a bug in production that\'s affecting a small number of users. Walk me through your response.'
];

function genericTechnicalQuestion(skill) {
  return `Walk me through how you'd use ${skill} to solve a real problem you've worked on. What tradeoffs did you consider?`;
}

function makeId() {
  return crypto.randomBytes(6).toString('hex');
}

/**
 * Builds a question set for a job: one technical question per top required skill
 * (deduplicated, capped), plus a behavioral and a situational question. Random but
 * deterministic-enough selection so repeated practice on the same job isn't identical
 * every time.
 */
function generateQuestionSet(job, { technicalCount = 3, behavioralCount = 1, situationalCount = 1 } = {}) {
  const skills = [...new Set((job.requiredSkills || []).map(s => s.toLowerCase().trim()))].slice(0, technicalCount);

  const technical = skills.map(skill => {
    const bank = SKILL_QUESTIONS[skill];
    const text = bank ? bank[Math.floor(Math.random() * bank.length)] : genericTechnicalQuestion(skill);
    return { questionId: makeId(), text, type: 'technical', skillTag: skill };
  });

  const behavioral = shuffle(BEHAVIORAL_QUESTIONS).slice(0, behavioralCount)
    .map(text => ({ questionId: makeId(), text, type: 'behavioral' }));

  const situational = shuffle(SITUATIONAL_QUESTIONS).slice(0, situationalCount)
    .map(text => ({ questionId: makeId(), text, type: 'situational' }));

  return [...technical, ...behavioral, ...situational];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = { generateQuestionSet, SKILL_QUESTIONS, BEHAVIORAL_QUESTIONS, SITUATIONAL_QUESTIONS };
