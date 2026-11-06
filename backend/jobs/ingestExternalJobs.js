/**
 * "Search every major job source through one interface" requires ingesting from
 * each source's API/feed into our own Job collection, then serving unified search
 * from there (rather than fanning out live requests to every source per-query,
 * which is slow and gets rate-limited).
 *
 * This file defines the ingestion contract and one working example (Adzuna,
 * which has a free tier) plus stubs for others. Each adapter must normalize
 * to our Job schema and set `source` + `sourceJobId` so jobQuality.detectDuplicate
 * can dedupe across sources.
 */

const Job = require('../models/Job');
const { runQualityChecks } = require('../utils/jobQuality');

async function fetchAdzunaJobs({ what, where, page = 1 }) {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    console.warn('Adzuna credentials not set — skipping this source.');
    return [];
  }
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/${page}` +
    `?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where || '')}`;

  const resp = await fetch(url);
  const data = await resp.json();
  return (data.results || []).map(r => ({
    title: r.title,
    description: r.description,
    companyNameRaw: r.company?.display_name,
    requiredSkills: [], // Adzuna doesn't structure this — run it through a skill-extractor (NER/LLM) before saving
    location: { city: r.location?.area?.[r.location.area.length - 1], country: 'United States', remote: /remote/i.test(r.title) },
    salary: r.salary_min || r.salary_max ? { min: r.salary_min, max: r.salary_max, currency: 'USD' } : undefined,
    source: 'adzuna',
    sourceJobId: String(r.id),
    sourceUrl: r.redirect_url,
    postedAt: r.created
  }));
}

// Stubs — implement per each source's actual API/auth model.
async function fetchLinkedInJobs() {
  console.warn('LinkedIn ingestion not implemented — requires LinkedIn Talent/Jobs API partnership.');
  return [];
}
async function fetchIndeedJobs() {
  console.warn('Indeed ingestion not implemented — requires Indeed Publisher/XML feed agreement.');
  return [];
}

async function ingestAll({ what = 'software engineer', where = '' } = {}) {
  const sources = [fetchAdzunaJobs({ what, where }), fetchLinkedInJobs(), fetchIndeedJobs()];
  const results = (await Promise.all(sources)).flat();

  let created = 0, flaggedDuplicate = 0;
  for (const raw of results) {
    const quality = await runQualityChecks(raw);
    if (quality.duplicateOf) { flaggedDuplicate++; continue; }
    await Job.create({ ...raw, ...quality });
    created++;
  }
  console.log(`Ingestion complete: ${created} created, ${flaggedDuplicate} duplicates skipped`);
  return { created, flaggedDuplicate };
}

module.exports = { ingestAll, fetchAdzunaJobs };
