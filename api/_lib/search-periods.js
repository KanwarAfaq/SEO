const iso = d => d.toISOString().slice(0, 10);
function ranges(end, days) {
  const endMs = Date.parse(end + 'T00:00:00Z');
  return {
    current: { start: iso(new Date(endMs - (days - 1) * 86400000)), end },
    previous: { start: iso(new Date(endMs - (days * 2 - 1) * 86400000)), end: iso(new Date(endMs - days * 86400000)) }
  };
}
function summarize(rows, range) {
  const selected = rows.filter(r => r.keys?.[0] >= range.start && r.keys[0] <= range.end);
  const totals = selected.reduce((a, r) => ({ clicks: a.clicks + (r.clicks || 0), impressions: a.impressions + (r.impressions || 0), weighted: a.weighted + (r.position || 0) * (r.impressions || 0) }), { clicks: 0, impressions: 0, weighted: 0 });
  return {
    clicks: Math.round(totals.clicks), impressions: Math.round(totals.impressions),
    ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
    position: totals.impressions ? totals.weighted / totals.impressions : null,
    range, series: selected.map(r => ({ date: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position ?? null }))
  };
}
module.exports = { ranges, summarize };
