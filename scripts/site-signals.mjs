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
const DAY = 86400000;
// Calendar-day clicks (or impressions) ending on the GSC range end; GSC omits zero-traffic days, so gaps become 0.
export function dailySeries(site, days = 14, field = 'clicks') {
  if (!site || site.error || !site.range?.end || !Array.isArray(site.series)) return null;
  const end = Date.parse(site.range.end + 'T00:00:00Z');
  if (!Number.isFinite(end)) return null;
  const byDate = new Map(site.series.map(r => [r.date, Number(r[field] || 0)]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(byDate.get(new Date(end - i * DAY).toISOString().slice(0, 10)) || 0);
  return out;
}
export function portfolioSeries(sites, days = 14, field = 'clicks') {
  const lists = (sites || []).map(s => dailySeries(s, days, field)).filter(Boolean);
  if (!lists.length) return null;
  return Array.from({ length: days }, (_, i) => lists.reduce((n, l) => n + l[i], 0));
}
export function pctChange(recent, prior) {
  return prior ? Math.round((recent - prior) / prior * 100) : null;
}
// Per-site health checks used by the digest: true = pass, false = fail, null = unknown (never counted as pass).
export function healthChecks(site) {
  const g = site.gsc && !site.gsc.error ? site.gsc : null;
  const idx = site.indexing && !site.indexing.error ? site.indexing : null;
  const vitals = cwvGood(site.cwv);
  return [
    { key: 'HTTP', ok: site.status === 'OK' ? true : site.status ? false : null, weight: 25 },
    { key: 'Sitemap', ok: site.sitemap === 'OK' ? true : site.sitemap ? false : null, weight: 15 },
    { key: 'Robots', ok: site.robots === 'OK' ? true : site.robots ? false : null, weight: 10 },
    { key: 'GSC', ok: g ? true : (site.gsc ? false : null), weight: 15 },
    { key: 'Index', ok: idx && Number(idx.checked) > 0 ? Number(idx.indexed) / Number(idx.checked) >= 0.5 : (site.indexing?.error ? false : null), weight: 15 },
    { key: 'CWV', ok: vitals, weight: 10 },
    { key: 'Issues', ok: Array.isArray(site.issues) ? site.issues.length === 0 : Array.isArray(site.actions) ? site.actions.length === 0 : null, weight: 10 }
  ];
}
// 0-100 over the checks that actually have data; null when nothing is known.
export function healthScore(site) {
  const known = healthChecks(site).filter(c => c.ok !== null);
  const possible = known.reduce((n, c) => n + c.weight, 0);
  if (!possible) return null;
  return Math.round(known.reduce((n, c) => n + (c.ok ? c.weight : 0), 0) / possible * 100);
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
    const site = { ...row, gsc, ga4, cwv, indexing, opportunity, trend, actions };
    return { ...site, checks: healthChecks(site), score: healthScore(site), series: dailySeries(gsc, 14) };
  });
}

// Taipei-time label for the four daily digests (08:15 / 12:15 / 18:15 / 22:15).
export function digestSlot(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hour12: false }).format(date)) % 24;
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 16) return 'Midday';
  if (hour >= 16 && hour < 21) return 'Evening';
  return 'Night';
}
