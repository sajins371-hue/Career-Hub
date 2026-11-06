const Job = require('../models/Job');

/** Simple string similarity (Jaccard on word sets) — good enough for dedup on title+company. */
function similarity(a, b) {
  const setA = new Set((a || '').toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set((b || '').toLowerCase().split(/\W+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

const SUSPICIOUS_PATTERNS = [
  { regex: /\$\s?\d{4,}\s?\/\s?(day|week)/i, reason: 'Unrealistic pay-per-day/week figure' },
  { regex: /pay (a )?(fee|deposit)|processing fee|purchase.*equipment/i, reason: 'Asks candidate to pay money upfront' },
  { regex: /wire transfer|western union|crypto.*payment/i, reason: 'Suspicious payment method mentioned' },
  { regex: /no experience.*\$\d{3,}.*day/i, reason: 'Unrealistic pay for no experience' },
  { regex: /whatsapp only|telegram only/i, reason: 'Off-platform-only contact, common in scam postings' }
];

async function detectDuplicate(newJob) {
  const candidates = await Job.find({
    status: 'active',
    'location.country': newJob.location?.country
  }).limit(200).lean();

  for (const existing of candidates) {
    const titleSim = similarity(existing.title, newJob.title);
    const companySim = similarity(existing.companyNameRaw || '', newJob.companyNameRaw || '');
    if (titleSim > 0.7 && companySim > 0.7) {
      return existing._id;
    }
    if (newJob.sourceJobId && existing.sourceJobId === newJob.sourceJobId && existing.source === newJob.source) {
      return existing._id;
    }
  }
  return null;
}

function detectSuspicious(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const reasons = SUSPICIOUS_PATTERNS.filter(p => p.regex.test(text)).map(p => p.reason);
  return { isSuspicious: reasons.length > 0, reasons };
}

function isExpired(job) {
  if (job.expiresAt && new Date(job.expiresAt) < new Date()) return true;
  // heuristic: postings older than 90 days with no expiry set are flagged stale
  const ageDays = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 90;
}

async function runQualityChecks(job) {
  const duplicateOf = await detectDuplicate(job);
  const suspicious = detectSuspicious(job);
  const expired = isExpired(job);
  return {
    qualitySignals: {
      isDuplicate: !!duplicateOf,
      isExpired: expired,
      isSuspicious: suspicious.isSuspicious,
      suspiciousReasons: suspicious.reasons
    },
    duplicateOf,
    status: duplicateOf ? 'flagged' : expired ? 'expired' : suspicious.isSuspicious ? 'flagged' : 'active'
  };
}

module.exports = { runQualityChecks, similarity };
