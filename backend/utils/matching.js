/**
 * Heuristic matching engine.
 *
 * This is a transparent, explainable scoring model (not a black-box ML model).
 * It weighs: skill overlap, verified-vs-self-reported skills, years of experience,
 * project/experience relevance, career-goal alignment, and location/work-permit fit.
 *
 * Swap `scoreCandidateAgainstJob` for a real ML/embedding-based model later without
 * changing the API contract — it always returns { score, breakdown }.
 */

const WEIGHTS = {
  requiredSkills: 0.40,
  niceToHaveSkills: 0.10,
  experienceYears: 0.15,
  projectRelevance: 0.10,
  careerGoalAlignment: 0.15,
  locationFit: 0.10
};

function normalizeSkill(s) {
  return (s || '').toLowerCase().trim();
}

function candidateSkillSet(candidate) {
  const selfReported = (candidate.skills || []).map(normalizeSkill);
  const verified = (candidate.verifiedSkills || []).map(v => normalizeSkill(v.skill));
  const fromExperience = (candidate.experience || []).flatMap(e => (e.skillsUsed || []).map(normalizeSkill));
  const fromProjects = (candidate.projects || []).flatMap(p => (p.skillsUsed || []).map(normalizeSkill));
  return {
    all: new Set([...selfReported, ...verified, ...fromExperience, ...fromProjects]),
    verified: new Set(verified)
  };
}

function skillOverlapScore(required, candidateSkills) {
  if (!required || required.length === 0) return { score: 1, matched: [], missing: [] };
  const norm = required.map(normalizeSkill);
  const matched = norm.filter(s => candidateSkills.all.has(s));
  const missing = norm.filter(s => !candidateSkills.all.has(s));
  // bonus weight if matched skill is verified, not just self-reported
  const verifiedBonus = matched.filter(s => candidateSkills.verified.has(s)).length * 0.05;
  const rawScore = matched.length / norm.length;
  return { score: Math.min(1, rawScore + verifiedBonus), matched, missing };
}

function experienceScore(candidate, job) {
  if (!job.minYearsExperience) return 1;
  const years = candidate.yearsOfExperience || 0;
  if (years >= job.minYearsExperience) return 1;
  return Math.max(0, years / job.minYearsExperience);
}

function projectRelevanceScore(candidate, job) {
  const jobSkills = new Set((job.requiredSkills || []).map(normalizeSkill));
  const projects = candidate.projects || [];
  if (projects.length === 0 || jobSkills.size === 0) return 0.5; // neutral, no signal either way
  const hits = projects.filter(p => (p.skillsUsed || []).some(s => jobSkills.has(normalizeSkill(s))));
  return Math.min(1, hits.length / Math.min(2, projects.length));
}

function careerGoalScore(candidate, job) {
  const goals = candidate.careerGoals?.targetRoles || [];
  if (goals.length === 0) return 0.5; // no stated goal, neutral
  const jobTitle = normalizeSkill(job.title);
  const match = goals.some(g => jobTitle.includes(normalizeSkill(g)) || normalizeSkill(g).includes(jobTitle));
  return match ? 1 : 0.2;
}

function locationFitScore(candidate, job) {
  if (job.location?.remote) return 1;
  if (!candidate.location || !job.location) return 0.5;
  const sameCountry = candidate.location.country && job.location.country &&
    candidate.location.country.toLowerCase() === job.location.country.toLowerCase();
  if (job.workPermitRequired?.length) {
    const permits = (candidate.workPermits || []).map(normalizeSkill);
    const eligible = job.workPermitRequired.some(c => permits.includes(normalizeSkill(c)));
    if (!eligible) return 0;
  }
  return sameCountry ? 1 : 0.3;
}

function scoreCandidateAgainstJob(candidate, job) {
  const candidateSkills = candidateSkillSet(candidate);
  const required = skillOverlapScore(job.requiredSkills, candidateSkills);
  const niceToHave = skillOverlapScore(job.niceToHaveSkills, candidateSkills);
  const exp = experienceScore(candidate, job);
  const proj = projectRelevanceScore(candidate, job);
  const goal = careerGoalScore(candidate, job);
  const loc = locationFitScore(candidate, job);

  const score =
    required.score * WEIGHTS.requiredSkills +
    niceToHave.score * WEIGHTS.niceToHaveSkills +
    exp * WEIGHTS.experienceYears +
    proj * WEIGHTS.projectRelevance +
    goal * WEIGHTS.careerGoalAlignment +
    loc * WEIGHTS.locationFit;

  return {
    score: Math.round(score * 100), // 0-100
    breakdown: {
      requiredSkills: { weight: WEIGHTS.requiredSkills, score: required.score, matched: required.matched, missing: required.missing },
      niceToHaveSkills: { weight: WEIGHTS.niceToHaveSkills, score: niceToHave.score, matched: niceToHave.matched, missing: niceToHave.missing },
      experience: { weight: WEIGHTS.experienceYears, score: exp },
      projectRelevance: { weight: WEIGHTS.projectRelevance, score: proj },
      careerGoalAlignment: { weight: WEIGHTS.careerGoalAlignment, score: goal },
      locationFit: { weight: WEIGHTS.locationFit, score: loc }
    }
  };
}

/** Skill gap: what's missing for a specific job, ranked by weight/importance. */
function computeSkillGap(candidate, job) {
  const candidateSkills = candidateSkillSet(candidate);
  const required = skillOverlapScore(job.requiredSkills, candidateSkills);
  const niceToHave = skillOverlapScore(job.niceToHaveSkills, candidateSkills);
  return {
    mustLearn: required.missing,
    goodToLearn: niceToHave.missing,
    alreadyHave: required.matched
  };
}

/** Reverse matching: rank candidates against a job description (recruiter AI / candidate discovery). */
function rankCandidatesForJob(candidates, job) {
  return candidates
    .map(c => ({ candidate: c, ...scoreCandidateAgainstJob(c, job) }))
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  scoreCandidateAgainstJob,
  computeSkillGap,
  rankCandidatesForJob,
  candidateSkillSet
};
