/**
 * Given a list of missing skills and a pool of courses, picks a small set of courses
 * that together cover as many missing skills as possible (greedy set-cover — optimal
 * set-cover is NP-hard, greedy is the standard, good-enough approximation).
 */
function normalizeSkill(s) {
  return (s || '').toLowerCase().trim();
}

function buildLearningPath(missingSkills, courses) {
  const remaining = new Set(missingSkills.map(normalizeSkill));
  const path = [];
  const pool = courses.map(c => ({
    course: c,
    skills: new Set((c.skillsTaught || []).map(normalizeSkill))
  }));

  while (remaining.size > 0) {
    // Pick the course covering the most still-remaining skills; tie-break by rating, then free-first.
    let best = null;
    let bestCoverage = 0;
    for (const entry of pool) {
      const coverage = [...entry.skills].filter(s => remaining.has(s)).length;
      if (coverage === 0) continue;
      if (
        coverage > bestCoverage ||
        (coverage === bestCoverage && best && (entry.course.rating || 0) > (best.course.rating || 0)) ||
        (coverage === bestCoverage && best && (entry.course.rating || 0) === (best.course.rating || 0) && entry.course.isFree && !best.course.isFree)
      ) {
        best = entry;
        bestCoverage = coverage;
      }
    }
    if (!best) break; // no course in the pool covers any remaining skill

    path.push({
      course: best.course,
      coversSkills: [...best.skills].filter(s => remaining.has(s))
    });
    best.skills.forEach(s => remaining.delete(s));
    pool.splice(pool.indexOf(best), 1);
  }

  return {
    path,
    coveredSkills: missingSkills.map(normalizeSkill).filter(s => !remaining.has(s)),
    uncoveredSkills: [...remaining] // skills no course in our catalog currently teaches
  };
}

module.exports = { buildLearningPath };
