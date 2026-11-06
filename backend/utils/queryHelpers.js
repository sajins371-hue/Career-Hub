/** Escapes regex metacharacters in user-supplied strings before they're interpolated
 * into a `new RegExp(...)`, so a value like `.*` or `(a+)+$` can't be used to build an
 * arbitrary/catastrophic-backtracking pattern (ReDoS) or to widen a match unexpectedly. */
function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Clamps page/limit query params to sane bounds so a request can't force an
 * unbounded/huge `.limit()` (excess DB + memory work) or a negative/zero page. */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit };
}

module.exports = { escapeRegex, parsePagination };
