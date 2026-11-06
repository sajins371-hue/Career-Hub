/**
 * Heuristic salary estimator. In production, replace the base-rate table with
 * a real dataset (BLS, Levels.fyi-style aggregated postings, or your own
 * salary-history collection) and keep this function signature.
 */

const BASE_RATES_USD = {
  'software engineer': 95000,
  'senior software engineer': 135000,
  'data scientist': 110000,
  'product manager': 115000,
  'designer': 85000,
  'devops engineer': 105000,
  default: 70000
};

const COUNTRY_COST_INDEX = {
  'united states': 1.0,
  'united kingdom': 0.85,
  india: 0.35,
  germany: 0.8,
  canada: 0.85,
  default: 0.6
};

function estimateSalary({ title, yearsOfExperience = 0, country = 'default', companySize }) {
  const key = (title || '').toLowerCase().trim();
  const base = BASE_RATES_USD[key] ?? BASE_RATES_USD.default;
  const experienceMultiplier = 1 + Math.min(yearsOfExperience, 15) * 0.04;
  const countryIndex = COUNTRY_COST_INDEX[(country || '').toLowerCase()] ?? COUNTRY_COST_INDEX.default;
  const sizeMultiplier = companySize === 'enterprise' ? 1.1 : companySize === 'startup' ? 0.95 : 1.0;

  const midpoint = base * experienceMultiplier * countryIndex * sizeMultiplier;
  return {
    currency: 'USD',
    min: Math.round(midpoint * 0.85),
    max: Math.round(midpoint * 1.15),
    isEstimated: true,
    note: 'Heuristic estimate. Replace BASE_RATES_USD with real market data for production accuracy.'
  };
}

module.exports = { estimateSalary };
