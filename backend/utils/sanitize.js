const xss = require('xss');

/** Strips script tags/event handlers etc. from free-text fields before they hit the DB.
 * Defense in depth: the frontend should also escape on render, but sanitizing at write
 * time protects every consumer of the API (including the recruiter dashboard, exports, etc.) */
function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return xss(value, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] });
}

function sanitizeFields(obj, fields) {
  const out = { ...obj };
  fields.forEach(f => { if (out[f] !== undefined) out[f] = sanitizeText(out[f]); });
  return out;
}

module.exports = { sanitizeText, sanitizeFields };
