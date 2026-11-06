/**
 * Resume text extraction + heuristic parsing.
 *
 * Extraction: PDF (pdf-parse), DOCX (mammoth), TXT. Parsing is deliberately simple and
 * explainable — it finds skills by matching a vocabulary (built-in list + every skill that
 * appears on a live job posting) against the resume text, estimates years of experience,
 * and guesses a headline. Nothing here needs an LLM key.
 */
const path = require('path');

const BUILTIN_SKILLS = [
  'java', 'python', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'scala', 'r',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'react', 'redux', 'next.js', 'vue', 'angular', 'svelte', 'jquery',
  'node.js', 'express', 'django', 'flask', 'fastapi', 'spring boot', 'spring', 'hibernate', '.net', 'laravel',
  'mongodb', 'mysql', 'postgresql', 'sqlite', 'oracle', 'redis', 'elasticsearch', 'firebase', 'sql', 'nosql',
  'rest api', 'rest apis', 'graphql', 'microservices', 'django rest framework', 'axios', 'postman', 'json',
  'git', 'github', 'gitlab', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'linux',
  'aws', 'azure', 'gcp', 'nginx',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'nlp', 'data analysis',
  'power bi', 'tableau', 'excel', 'data structures', 'algorithms', 'oop', 'agile', 'scrum', 'jira',
  'selenium', 'junit', 'jest', 'cypress', 'testing', 'figma', 'android', 'flutter', 'react native', 'cybersecurity'
];

// Short / ambiguous tokens need stricter matching so "r" or "go" in prose don't count as skills.
const AMBIGUOUS = new Set(['c', 'r', 'go', 'spring', 'express', 'excel', 'testing', 'swift', 'json']);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function extractText(buffer, mimeType, fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  const isPdf = mimeType === 'application/pdf' || ext === '.pdf';
  const isDocx = ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isTxt = mimeType === 'text/plain' || ext === '.txt';

  let text = '';
  if (isPdf) {
    const { PDFParse } = require('pdf-parse');
    let parser;
    try {
      parser = new PDFParse({ data: buffer });
      text = (await parser.getText()).text || '';
    } catch (e) {
      const err = new Error('We could not read that PDF. Try re-exporting it (or upload a DOCX/TXT version).');
      err.statusCode = 422;
      throw err;
    } finally {
      if (parser) await parser.destroy().catch(() => {});
    }
    text = text.replace(/\n?-- \d+ of \d+ --\n?/g, '\n'); // page markers added by pdf-parse
  } else if (isDocx) {
    const mammoth = require('mammoth');
    text = (await mammoth.extractRawText({ buffer })).value || '';
  } else if (isTxt) {
    text = buffer.toString('utf8');
  } else {
    const err = new Error('Unsupported file type. Upload a PDF, DOCX or TXT resume.');
    err.statusCode = 400;
    throw err;
  }
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function hasSkill(textLower, skill) {
  const re = new RegExp(`(^|[^a-z0-9+#.])${escapeRe(skill)}(?![a-z0-9+#])`, 'i');
  if (!re.test(textLower)) return false;
  if (!AMBIGUOUS.has(skill)) return true;
  // Ambiguous words only count in a skills-like context (comma/pipe/bullet separated, or capitalised).
  const ctx = new RegExp(`[,|•·:/\\n]\\s*${escapeRe(skill)}\\s*([,|•·/\\n]|$)`, 'i');
  return ctx.test(textLower);
}

function extractSkills(text, extraVocabulary = []) {
  const lower = ` ${text.toLowerCase()} `;
  const vocab = [...new Set([...BUILTIN_SKILLS, ...extraVocabulary.map(s => (s || '').toLowerCase().trim()).filter(Boolean)])];
  return vocab.filter(skill => hasSkill(lower, skill));
}

function estimateYears(text) {
  const explicit = [...text.matchAll(/(\d{1,2})(?:\.\d)?\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience/gi)]
    .map(m => Number(m[1])).filter(n => n > 0 && n < 45);
  if (explicit.length) return Math.max(...explicit);

  const now = new Date();
  const monthIdx = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const EDU = /(b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|m\.?\s?tech|m\.?\s?sc|mba|bca|mca|degree|diploma|university|college|school|institute|cgpa|gpa|education|hsc|sslc|class x)/i;
  const range = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})|(present|current|now))/gi;

  // Collect [start,end] month spans from non-education lines, then merge overlaps so
  // concurrent roles aren't double-counted.
  const spans = [];
  let inEducation = false;
  for (const line of text.split('\n')) {
    if (/^\s*(education|academics?|qualifications?)\b/i.test(line)) inEducation = true;
    else if (/^\s*(experience|work experience|employment|internships?|projects?|skills|certifications?)\b/i.test(line)) inEducation = false;
    if (inEducation || EDU.test(line)) continue;
    for (const m of line.matchAll(range)) {
      const sm = m[1] ? monthIdx[m[1].trim().slice(0, 3).toLowerCase()] : 0;
      const start = new Date(Number(m[2]), sm, 1);
      let end = m[5] ? now : new Date(Number(m[4]), m[3] ? monthIdx[m[3].trim().slice(0, 3).toLowerCase()] : 11, 28);
      if (end > now) end = now; // future dates (e.g. an expected end) don't count as experience yet
      if (end > start) spans.push([start.getTime(), end.getTime()]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let totalMs = 0, cur = null;
  for (const [s, e] of spans) {
    if (!cur) cur = [s, e];
    else if (s <= cur[1]) cur[1] = Math.max(cur[1], e);
    else { totalMs += cur[1] - cur[0]; cur = [s, e]; }
  }
  if (cur) totalMs += cur[1] - cur[0];
  const years = totalMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.min(40, Math.round(years * 10) / 10);
}

function guessHeadline(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8);
  const roleRe = /(developer|engineer|analyst|designer|intern|scientist|architect|consultant|manager|tester|administrator)/i;
  const line = lines.find(l => l.length <= 80 && roleRe.test(l) && !/@|\d{5,}/.test(l));
  return line || '';
}

function parseResume(text, extraVocabulary = []) {
  return {
    skills: extractSkills(text, extraVocabulary),
    years: estimateYears(text),
    headline: guessHeadline(text)
  };
}

module.exports = { extractText, parseResume, extractSkills };
