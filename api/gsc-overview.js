const { getSites } = require('./_lib/config');
const { googleFetch } = require('./_lib/google');

const SCOPE = ['https://www.googleapis.com/auth/webmasters.readonly'];
const iso = d => d.toISOString().slice(0, 10);

async function getSite(site, days = 28) {
  const end = new Date(Date.now() - 2 * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gscProperty)}/searchAnalytics/query`;
  const r = await googleFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: iso(start), endDate: iso(end), dimensions: ['date'], rowLimit: 1000 })
  }, SCOPE);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `GSC ${r.status}`);
  const rows = data.rows || [];
  const totals = rows.reduce((a, row) => {
    a.clicks += row.clicks || 0;
    a.impressions += row.impressions || 0;
    a.positionWeighted += (row.position || 0) * (row.impressions || 0);
    return a;
  }, { clicks: 0, impressions: 0, positionWeighted: 0 });
  return {
    id: site.id,
    clicks: Math.round(totals.clicks),
    impressions: Math.round(totals.impressions),
    ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
    position: totals.impressions ? totals.positionWeighted / totals.impressions : 0,
    range: { start: iso(start), end: iso(end) },
    series: rows.map(r => ({ date: r.keys?.[0], clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position ?? null }))
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const days = Number(req.query?.days || 28);
    if (![7,28,90].includes(days)) return res.status(400).json({error:'days must be 7, 28 or 90'});
    const sites = getSites();
    const results = await Promise.all(sites.map(async site => {
      try { return await getSite(site, days); }
      catch (e) { return { id: site.id, error: e.message }; }
    }));
    res.status(200).json({ sites: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
