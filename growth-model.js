(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SEOModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const finite = n => n !== null && n !== undefined && n !== '' && Number.isFinite(Number(n));
  const usable = s => Boolean(s && !s.error && finite(s.clicks) && finite(s.impressions) && s.range?.start && s.range?.end);
  const change = (current, prior) => prior > 0 ? (current - prior) * 100 / prior : null;
  function total(sites) {
    const sum = sites.reduce((a, s) => ({ clicks: a.clicks + Number(s.clicks), impressions: a.impressions + Number(s.impressions), weighted: a.weighted + (Number(s.position) || 0) * Number(s.impressions) }), { clicks: 0, impressions: 0, weighted: 0 });
    return { ...sum, ctr: sum.impressions ? sum.clicks / sum.impressions : null, position: sum.impressions ? sum.weighted / sum.impressions : null };
  }
  function daily(sites, metric, range) {
    if (!range) return [];
    const dates = new Map();
    for (const s of sites) for (const r of s.series || []) dates.set(r.date, (dates.get(r.date) || 0) + Number(r[metric] || 0));
    const points = [];
    for (let date = Date.parse(range.start + 'T00:00:00Z'), end = Date.parse(range.end + 'T00:00:00Z'); date <= end && points.length < 180; date += 86400000) {
      const day = new Date(date).toISOString().slice(0, 10); points.push({ date: day, value: dates.get(day) || 0 });
    }
    return points;
  }
  function summarize(registry, gsc, filter = 'all', metric = 'impressions') {
    const selected = registry.filter(s => filter === 'all' || s.id === filter);
    const rows = selected.map(s => ({ ...s, metric: (gsc?.sites || []).find(x => x.id === s.id) }));
    const valid = rows.filter(s => usable(s.metric));
    const range = valid[0]?.metric.range;
    const comparable = valid.filter(s => s.metric.range.start === range.start && s.metric.range.end === range.end);
    const current = total(comparable.map(s => s.metric));
    const previous = comparable.map(s => s.metric.comparison);
    const baselineRange = previous[0]?.range;
    const baseline = comparable.length > 0 && previous.every(s => usable(s) && s.range.start === baselineRange.start && s.range.end === baselineRange.end);
    return { selected, rows, valid: comparable, range, current, previous: baseline ? total(previous) : null,
      complete: comparable.length > 0 && comparable.length === selected.length,
      points: daily(comparable.map(s => s.metric), metric, range),
      priorPoints: baseline ? daily(previous, metric, baselineRange) : [], baselineRange };
  }
  function indexSegments(site) {
    if (!site || site.error || !finite(site.totalPages)) return null;
    const total = Number(site.totalPages), indexed = Number(site.indexed || 0), excluded = Number(site.notIndexed || 0);
    const unchecked = Math.max(0, total - indexed - excluded);
    return { total, indexed, excluded, unchecked, errors: Number(site.errors || 0), percent: total ? Math.round((indexed + excluded) / total * 100) : 0 };
  }
  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function csv(rows) { return rows.map(row => row.map(csvCell).join(',')).join('\r\n'); }
  return { usable, finite, total, change, daily, summarize, indexSegments, csv };
});
