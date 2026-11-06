// Starter catalog so the Assessments page isn't empty. Skills are lowercase to match how
// requiredSkills are written on jobs (see seed.js), which is what the matching score compares against.
module.exports = [
  { skill: 'react', title: 'React: Build a Task Board', type: 'project', passingScore: 70,
    description: 'Build a small Kanban task board with React (add, move and delete tasks). Share a link to the repo or the deployed app.',
    rubric: [{ criterion: 'Component structure and state management', weight: 35 }, { criterion: 'Works as described (add/move/delete)', weight: 40 }, { criterion: 'Code quality and readme', weight: 25 }] },
  { skill: 'node', title: 'Node.js: REST API with Auth', type: 'project', passingScore: 70,
    description: 'Build a REST API with Express: user signup/login (JWT) and CRUD for one resource. Share the repo link.',
    rubric: [{ criterion: 'Correct endpoints and status codes', weight: 35 }, { criterion: 'Authentication and input validation', weight: 40 }, { criterion: 'Code organisation and readme', weight: 25 }] },
  { skill: 'mongodb', title: 'MongoDB: Schema and Queries', type: 'project', passingScore: 70,
    description: 'Design a schema for a blog (users, posts, comments) and write the queries for the most common reads, with indexes. Share a doc or repo link.',
    rubric: [{ criterion: 'Schema design choices explained', weight: 40 }, { criterion: 'Queries and aggregation correctness', weight: 40 }, { criterion: 'Indexes and performance notes', weight: 20 }] },
  { skill: 'python', title: 'Python: Data Cleaning Script', type: 'project', passingScore: 70,
    description: 'Write a Python script that cleans a messy CSV (duplicates, missing values, inconsistent formats) and outputs a summary. Share the repo or notebook link.',
    rubric: [{ criterion: 'Cleaning is correct and reproducible', weight: 50 }, { criterion: 'Readable, tested code', weight: 30 }, { criterion: 'Summary of findings', weight: 20 }] },
  { skill: 'sql', title: 'SQL: Reporting Queries', type: 'quiz', passingScore: 70,
    description: 'Write SQL for 10 reporting questions (joins, GROUP BY, window functions) on a sample sales database. Share your answers as a doc or gist link.',
    rubric: [{ criterion: 'Correct results', weight: 70 }, { criterion: 'Clean, efficient queries', weight: 30 }] },
  { skill: 'javascript', title: 'JavaScript: Algorithms Challenge', type: 'timed-coding', passingScore: 70,
    description: 'Solve 3 algorithm problems (arrays, strings, hash maps) within 90 minutes. Share your solutions as a repo or gist link.',
    rubric: [{ criterion: 'Correct solutions', weight: 60 }, { criterion: 'Time/space complexity', weight: 25 }, { criterion: 'Readability', weight: 15 }] },
  { skill: 'docker', title: 'Docker: Containerise an App', type: 'project', passingScore: 70,
    description: 'Containerise a small web app with a Dockerfile and docker-compose (app + database). Share the repo link.',
    rubric: [{ criterion: 'Image builds and app runs', weight: 50 }, { criterion: 'Compose setup and configuration', weight: 30 }, { criterion: 'Image size and best practices', weight: 20 }] },
  { skill: 'aws', title: 'AWS: Deploy a Web App', type: 'project', passingScore: 70,
    description: 'Deploy a simple web app on AWS (for example EC2 or Elastic Beanstalk, plus S3) and document the architecture. Share the live URL and a short write-up.',
    rubric: [{ criterion: 'Working deployment', weight: 50 }, { criterion: 'Architecture write-up', weight: 30 }, { criterion: 'Security basics (IAM, secrets)', weight: 20 }] }
];
