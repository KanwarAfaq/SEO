const { getSites } = require('./_lib/config');
const { googleFetch } = require('./_lib/google');
const SCOPE = ['https://www.googleapis.com/auth/analytics.readonly'];

async function getRealtime(site) {
  if (!site.ga4PropertyId) return { id: site.id, configured: false, activeUsers: 0, views: 0, events: 0 };
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(site.ga4PropertyId)}:runRealtimeReport`;
  const r = await googleFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'eventCount' }] })
  }, SCOPE);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `GA4 ${r.status}`);
  const vals = data.rows?.[0]?.metricValues || [];
  return { id: site.id, configured: true, activeUsers: Number(vals[0]?.value || 0), views: Number(vals[1]?.value || 0), events: Number(vals[2]?.value || 0) };
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const results = await Promise.all(getSites().map(async site => {
    try { return await getRealtime(site); }
    catch (e) { return { id: site.id, configured: true, error: e.message, activeUsers: 0, views: 0, events: 0 }; }
  }));
  res.status(200).json({ sites: results });
};
