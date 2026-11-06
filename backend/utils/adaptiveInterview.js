const crypto = require('crypto');
const { generateQuestionSet, SKILL_QUESTIONS, BEHAVIORAL_QUESTIONS, SITUATIONAL_QUESTIONS } = require('./interviewQuestionBank');

function makeId() {
  return crypto.randomBytes(6).toString('hex');
}

function cleanJson(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return JSON');
  return JSON.parse(match[0]);
}

function normalizeSkill(skill) {
  return String(skill || '').toLowerCase().trim();
}


function questionSignature(text) {
  const stopWords = new Set([
    'what', 'when', 'where', 'which', 'while', 'would',
    'could', 'should', 'have', 'has', 'had', 'does',
    'your', 'you', 'are', 'the', 'and', 'for', 'with',
    'from', 'that', 'this', 'into', 'about', 'then',
    'than', 'them', 'they', 'their', 'there', 'how',
    'why', 'can', 'will', 'was', 'were', 'been',
    'being', 'using', 'use', 'used', 'also'
  ]);

  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  );
}

function isNearDuplicate(candidate, asked) {
  const candidateText = String(candidate || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return asked.some(existing => {
    const existingText = String(existing || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!candidateText || !existingText) return false;
    if (candidateText === existingText) return true;

    const candidateWords = questionSignature(candidateText);
    const existingWords = questionSignature(existingText);

    if (!candidateWords.size || !existingWords.size) return false;

    let overlap = 0;

    for (const word of candidateWords) {
      if (existingWords.has(word)) overlap++;
    }

    const smallerSetRatio =
      overlap / Math.min(candidateWords.size, existingWords.size);

    const largerSetRatio =
      overlap / Math.max(candidateWords.size, existingWords.size);

    // Reject only when the meaningful words strongly overlap.
    return smallerSetRatio >= 0.85 && largerSetRatio >= 0.65;
  });
}
function fallbackQuestion({ skills, type = 'technical', exclude = [] }) {
  const excluded = new Set(exclude.map(q => String(q).trim().toLowerCase()));
  const candidates = [];

  if (type === 'behavioral') {
    for (const text of BEHAVIORAL_QUESTIONS) candidates.push({ text, type: 'behavioral' });
  } else if (type === 'situational') {
    for (const text of SITUATIONAL_QUESTIONS) candidates.push({ text, type: 'situational' });
  } else {
    for (const skill of skills.map(normalizeSkill)) {
      for (const text of (SKILL_QUESTIONS[skill] || [])) {
        candidates.push({ text, type: 'technical', skillTag: skill });
      }
    }
    for (const skill of skills.map(normalizeSkill)) {
      candidates.push({
        text: `Walk me through a real problem where you used ${skill}. What tradeoffs did you consider?`,
        type: 'technical', skillTag: skill
      });
    }
  }

  const available = candidates.filter(q => !excluded.has(q.text.toLowerCase()) && !isNearDuplicate(q.text, exclude));
  const pool = available.length ? available : candidates.filter(q => !excluded.has(q.text.toLowerCase()));
  if (!pool.length) return null;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { ...selected, questionId: makeId(), difficulty: 'medium' };
}

async function generateAdaptiveQuestion({ job, transcript, previousQuestions, callLLM }) {
  const skills = [...new Set((job.requiredSkills || []).map(normalizeSkill).filter(Boolean))].slice(0, 8);
  const asked = previousQuestions.map(q => q.text).filter(Boolean);

  if (!callLLM) {
    const last = transcript[transcript.length - 1];
    const type = last?.questionType === 'behavioral' ? 'situational' : 'technical';
    return fallbackQuestion({ skills, type, exclude: asked });
  }

  const prompt = `You are an adaptive technical interview coach.
Role: ${job.title}
Required skills: ${skills.join(', ') || 'general professional skills'}
Previous questions (NEVER repeat these or close variants): ${JSON.stringify(asked)}
Interview transcript: ${JSON.stringify(transcript.slice(-6))}

Generate exactly ONE next interview question. Adapt its difficulty and topic to the candidate's most recent answer:
- Strong answer: probe deeper, add a realistic tradeoff, edge case, or harder scenario.
- Weak/incomplete answer: ask a focused follow-up that tests the missing concept.
- Avoid asking about a skill already covered unless the follow-up is meaningfully deeper.
- Mix technical, behavioral, and situational questions when appropriate.
- Keep the question answerable in 1-3 minutes.
- Never ask the same or near-duplicate question from the previous list.

Return ONLY valid JSON:
{"text":"...","type":"technical|behavioral|situational","skillTag":"skill or empty string","difficulty":"easy|medium|hard"}`;

  try {
    const parsed = cleanJson(await callLLM(prompt));
    if (!parsed.text || !['technical', 'behavioral', 'situational'].includes(parsed.type)) throw new Error('Invalid adaptive question');
    const lower = parsed.text.trim().toLowerCase();
    if (asked.some(q => q.trim().toLowerCase() === lower) || isNearDuplicate(parsed.text.trim(), asked)) throw new Error('Repeated or near-duplicate question');
    return {
      questionId: makeId(),
      text: parsed.text.trim(),
      type: parsed.type,
      skillTag: parsed.type === 'technical' ? normalizeSkill(parsed.skillTag) || undefined : undefined,
      difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'medium'
    };
    } catch (err) {
    console.warn(
      '[Gemini question generation failed; using fallback]:',
      err.message
    );
    return fallbackQuestion({ skills, exclude: asked }) || generateQuestionSet(job, { technicalCount: 1, behavioralCount: 0, situationalCount: 0 })[0];
  }
}

module.exports = { generateAdaptiveQuestion };
