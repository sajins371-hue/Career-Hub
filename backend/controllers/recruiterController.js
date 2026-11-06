const User = require('../models/User');
const { rankCandidatesForJob } = require('../utils/matching');
const { parsePagination } = require('../utils/queryHelpers');

/**
 * Very lightweight NL parsing: extracts skill-like tokens and years-of-experience
 * from free text. Replace with an LLM function-calling extraction for production
 * (ask the model to return structured JSON: { skills, minYears, location, roleTitle }).
 */
function parseNaturalLanguageQuery(text) {
  const yearsMatch = text.match(/(\d+)\+?\s*years?/i);
  const knownSkillWords = ['react', 'node', 'python', 'java', 'sql', 'aws', 'docker', 'kubernetes',
    'typescript', 'go', 'rust', 'mongodb', 'graphql', 'figma', 'excel', 'salesforce'];
  const lower = text.toLowerCase();
  const skills = knownSkillWords.filter(s => lower.includes(s));
  return {
    minYears: yearsMatch ? Number(yearsMatch[1]) : 0,
    skills,
    roleTitle: text // fall back to matching against title-like free text too
  };
}

// POST /api/recruiter/find-candidates { description: "Senior React dev, 5+ years, AWS, remote" }
exports.findCandidates = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const parsed = parseNaturalLanguageQuery(description);
    const pseudoJob = {
      title: parsed.roleTitle,
      requiredSkills: parsed.skills,
      niceToHaveSkills: [],
      minYearsExperience: parsed.minYears,
      location: { remote: true }
    };

    const candidates = await User.find({ role: 'candidate' }).limit(500);
    const { limit } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
    const ranked = rankCandidatesForJob(candidates, pseudoJob)
      .filter(r => r.score >= (Number(req.query.minScore) || 40))
      .slice(0, limit)
      .map(r => ({
        candidateId: r.candidate._id,
        name: r.candidate.name,
        headline: r.candidate.headline,
        score: r.score,
        breakdown: r.breakdown
      }));

    res.json({ parsedQuery: parsed, results: ranked });
  } catch (err) { next(err); }
};
