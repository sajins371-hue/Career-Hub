
const FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'basically',
  'actually',
  'you know',
  'sort of',
  'kind of'
];

const STAR_SIGNALS = {
  situation: ['situation', 'when i', 'at my', 'while working', 'during'],
  task: ['task', 'goal', 'needed to', 'had to', 'responsible for'],
  action: [
    'i decided',
    'i built',
    'i implemented',
    'i led',
    'i created',
    'i worked',
    'i wrote',
    'i designed'
  ],
  result: [
    'result',
    'outcome',
    'as a result',
    'ended up',
    'we shipped',
    'reduced',
    'increased',
    'improved',
    '%'
  ]
};

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function countFillerWords(text) {
  const lower = (text || '').toLowerCase();

  return FILLER_WORDS.reduce(
    (sum, filler) => sum + (lower.split(filler).length - 1),
    0
  );
}

function detectStarStructure(text) {
  const lower = (text || '').toLowerCase();

  return Object.entries(STAR_SIGNALS)
    .filter(([, signals]) => signals.some(signal => lower.includes(signal)))
    .map(([key]) => key);
}

function skillKeywordCoverage(text, skillTag) {
  if (!skillTag) {
    return { covered: true, note: null };
  }

  const lower = (text || '').toLowerCase();
  const covered = lower.includes(skillTag.toLowerCase());

  return {
    covered,
    note: covered
      ? null
      : `Your answer didn't explicitly mention "${skillTag}". Connect your explanation to this skill where relevant.`
  };
}

/**
 * Basic fallback scorer.
 * Used when Gemini is unavailable or returns an invalid response.
 * This is a rough heuristic, not a substitute for AI or human evaluation.
 */
function analyzeAnswerHeuristic(question, answerText) {
  const words = wordCount(answerText);
  const fillerCount = countFillerWords(answerText);
  const strengths = [];
  const improvements = [];

  let score = 70;

  if (words < 20) {
    score -= 30;
    improvements.push(
      'Your answer is brief. Explain your reasoning and include relevant details or an example.'
    );
  } else if (words < 50) {
    score -= 10;
    improvements.push(
      'Add more specific details to demonstrate your understanding.'
    );
  } else {
    strengths.push('Your answer includes a reasonable amount of detail.');
  }

  if (fillerCount > 3) {
    score -= 5;
    improvements.push(
      `You used approximately ${fillerCount} filler words. Try pausing briefly instead of repeating filler phrases.`
    );
  }

  if (
    question.type === 'behavioral' ||
    question.type === 'situational'
  ) {
    const star = detectStarStructure(answerText);
    const missing = [
      'situation',
      'task',
      'action',
      'result'
    ].filter(part => !star.includes(part));

    if (missing.length === 0) {
      strengths.push(
        'Your answer shows signals of a Situation-Task-Action-Result structure.'
      );
    } else if (missing.includes('result')) {
      score -= 10;
      improvements.push(
        'Explain the outcome of your actions and what you learned.'
      );
    } else if (star.length <= 1) {
      score -= 10;
      improvements.push(
        'Consider organizing your response using the STAR method: Situation, Task, Action, Result.'
      );
    }
  }

  if (question.type === 'technical' && question.skillTag) {
    const { covered, note } = skillKeywordCoverage(
      answerText,
      question.skillTag
    );

    if (!covered) {
      score -= 5;
      improvements.push(note);
    } else {
      strengths.push(
        `Your answer explicitly mentions ${question.skillTag}.`
      );
    }
  }

  score = Math.max(0, Math.min(100, score));

  if (strengths.length === 0) {
    strengths.push('You made an attempt to address the question.');
  }

  if (improvements.length === 0) {
    improvements.push(
      'Where relevant, strengthen your answer with precise reasoning, examples, and trade-offs.'
    );
  }

  return {
    score,
    strengths,
    improvements,
    missingConcepts: [],
    followUpFocus: '',
    source: 'heuristic'
  };
}

function cleanStringArray(value, maxItems = 4) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim().slice(0, 300))
    .slice(0, maxItems);
}

/**
 * Gemini-enhanced interview feedback.
 * Validates the response and falls back to heuristic feedback on failure.
 */
async function analyzeAnswer(
  question,
  answerText,
  { callLLM, context = {} } = {}
) {
  if (!callLLM) {
    return analyzeAnswerHeuristic(question, answerText);
  }

  try {
    const prompt = `You are a professional technical interviewer evaluating a candidate in a realistic job interview.

QUESTION:
${question.text}

QUESTION TYPE: ${question.type}
SKILL: ${question.skillTag || 'general'}
DIFFICULTY: ${context.difficulty || 'medium'}

CANDIDATE'S ANSWER:
${answerText}

PREVIOUS ANSWERS:
${JSON.stringify(context.previousAnswers || [])}

EVALUATION RULES:
1. Evaluate only evidence present in the candidate's answer.
2. For technical questions, assess factual correctness, relevance, depth,
   reasoning, practical application, and important missing concepts.
3. For behavioral questions, assess the situation, the candidate's own
   actions, reasoning, and results.
4. For situational questions, assess the proposed approach, prioritization,
   trade-offs, and handling of risks.
5. Do not award points merely for answer length, confidence, or keywords.
6. Do not assume experience or knowledge the candidate did not demonstrate.
7. Partially correct answers should receive partial credit.
8. Give specific, respectful, actionable improvements.
9. Use these scoring guidelines:
   0-39: major gaps or mostly incorrect;
   40-59: partial understanding with important gaps;
   60-74: generally correct but missing depth or key details;
   75-89: strong answer with minor gaps;
   90-100: highly accurate, thorough, and well-reasoned.
10. Do not require a technology or concept unless it is relevant to the question.
11. Do not invent errors, missing concepts, or achievements.
12. If the answer is too vague to establish correctness, reflect that uncertainty
    in the score and explain what detail is needed.

Return ONLY valid JSON with this structure:
{
  "score": 65,
  "strengths": ["specific strength demonstrated"],
  "improvements": ["specific, actionable improvement"],
  "missingConcepts": ["important omitted concept, if any"],
  "followUpFocus": "one useful topic to probe next"
}

The score must be a number from 0 to 100.
Keep each list concise and specific.
Use an empty missingConcepts array if no important concept is missing.
Do not include Markdown fences or text outside the JSON.`;

    const raw = await callLLM(prompt);

    const text = String(raw || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('Malformed Gemini JSON response');
    }

    const parsed = JSON.parse(match[0]);

    if (
      typeof parsed.score !== 'number' ||
      !Number.isFinite(parsed.score) ||
      parsed.score < 0 ||
      parsed.score > 100
    ) {
      throw new Error('Invalid Gemini score');
    }

    const strengths = cleanStringArray(parsed.strengths);
    const improvements = cleanStringArray(parsed.improvements);
    const missingConcepts = cleanStringArray(parsed.missingConcepts);

    if (strengths.length === 0 && improvements.length === 0) {
      throw new Error('Gemini returned empty feedback');
    }

    if (
      parsed.followUpFocus !== undefined &&
      typeof parsed.followUpFocus !== 'string'
    ) {
      throw new Error('Invalid Gemini follow-up feedback');
    }

    return {
      score: Math.round(parsed.score),
      strengths,
      improvements,
      missingConcepts,
      followUpFocus:
        typeof parsed.followUpFocus === 'string'
          ? parsed.followUpFocus.trim().slice(0, 300)
          : '',
      source: 'llm'
    };
  } catch (err) {
    console.warn(
      '[Gemini feedback failed; using heuristic fallback]:',
      err.message
    );

    return analyzeAnswerHeuristic(question, answerText);
  }
}

module.exports = {
  analyzeAnswer,
  analyzeAnswerHeuristic
};