export const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
export function cwvGood(site) {
  if (!site || site.error) return null;
  const values = [site.lcp?.p75, site.inp?.p75, site.cls?.p75];
  if (!values.every(finite)) return null;
  return Number(values[0]) <= 2500 && Number(values[1]) <= 200 && Number(values[2]) <= 0.1;
}
export function weeklyTrend(site) {
  if (!site || site.error || !site.range?.end || !site.range?.start || !Array.isArray(site.series)) return null;
  const end = Date.parse(site.range.end + 'T00:00:00Z');
  if (!Number.isFinite(end) || Date.parse(site.range.start + 'T00:00:00Z') > end - 13 * 86400000) return null;
  const days = new Map(site.series.map(r => [r.date, Number(r.clicks || 0)]));
  // GSC omits zero-traffic days. Compare calendar weeks, not the last 14 populated rows.
  const sums = [0, 0];
  for (let offset = 0; offset < 14; offset++) sums[offset < 7 ? 0 : 1] += days.get(new Date(end - offset * 86400000).toISOString().slice(0, 10)) || 0;
  return { recent: sums[0], prior: sums[1], changePct: sums[1] ? Math.round((sums[0] - sums[1]) / sums[1] * 100) : null };
}
export function perSiteSignals(rows, signals) {
  const find = (list, row) => (list || []).find(s => s.id === row.id || s.siteId === row.id || s.domain === row.domain);
  return rows.map(row => {
    const gsc = find(signals.gsc?.sites, row), ga4 = find(signals.ga4?.sites, row), cwv = find(signals.cwv?.sites, row);
    const indexing = find(signals.indexingSites, row), opportunity = find(signals.opportunities?.items, row);
    const trend = weeklyTrend(gsc), actions = [...row.issues];
    if (trend?.prior >= 30 && trend.changePct <= -30) actions.push('Investigate organic click decline: ' + trend.changePct + '% week over week');
    if (!gsc || gsc.error) actions.push('Restore GSC data/access for this property');
    if (indexing?.error) actions.push('Restore URL Inspection data: ' + indexing.error);
    else if (indexing?.indexingReasons?.[0]) actions.push(indexing.indexingReasons[0].label + ': ' + indexing.indexingReasons[0].action);
    if (cwvGood(cwv) === false) actions.push('Improve failing Core Web Vitals using field LCP/INP/CLS');
    if (opportunity && !opportunity.error) actions.push('Review query "' + opportunity.query + '" (position ' + Number(opportunity.position).toFixed(1) + ', ' + opportunity.impressions + ' impressions): improve relevance and snippet clarity');
    return { ...row, gsc, ga4, cwv, indexing, opportunity, trend, actions };
  });
}
