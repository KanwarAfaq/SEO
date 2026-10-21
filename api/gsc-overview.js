const { getSites } = require('./_lib/config');
const { googleFetch } = require('./_lib/google');

const { ranges, summarize } = require('./_lib/search-periods');
const SCOPE = ['https://www.googleapis.com/auth/webmasters.readonly'];
const iso = d => d.toISOString().slice(0, 10);
// GSC calendar dates follow Pacific Time, not the GitHub runner's UTC date.
function pacificDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = key => Number(parts.find(p=>p.type===key).value);
  return new Date(Date.UTC(part('year'), part('month')-1, part('day')+offset));
}

async function getSite(site, days = 28, compare = false) {
  // Allow a conservative three-day processing buffer and state the exact comparison period.
  const end = pacificDate(-3);
  const periods = ranges(iso(end), days);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gscProperty)}/searchAnalytics/query`;
  const r = await googleFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: compare ? periods.previous.start : periods.current.start, endDate: periods.current.end, dimensions: ['date'], rowLimit: 1000, type: 'web', dataState: 'final', aggregationType: 'byProperty' })
  }, SCOPE);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `GSC ${r.status}`);
  const rows = data.rows || [];
  return {
    id: site.id, domain: site.domain,
    ...summarize(rows, periods.current),
    ...(compare ? { comparison: summarize(rows, periods.previous) } : {}),
    searchType: 'web', dataState: 'final', aggregationType: 'byProperty',
    note: 'Final GSC Web data; exact Pacific dates; missing zero-traffic days are included in calendar periods'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const days = Number(req.query?.days || 28);
    if (![7,28,90].includes(days)) return res.status(400).json({error:'days must be 7, 28 or 90'});
    const sites = getSites();
    const results = await Promise.all(sites.map(async site => {
      try { return await getSite(site, days, req.query?.compare === '1'); }
      catch (e) { return { id: site.id, error: e.message }; }
    }));
    res.status(200).json({ sites: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
