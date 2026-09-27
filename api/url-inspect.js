const { requireAdmin } = require('./_lib/config');
const { googleFetch } = require('./_lib/google');
const SCOPE = ['https://www.googleapis.com/auth/webmasters.readonly'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { inspectionUrl, siteUrl } = req.body || {};
  if (!inspectionUrl || !siteUrl) return res.status(400).json({ error: 'inspectionUrl and siteUrl are required' });
  try {
    const r = await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: 'en-US' })
    }, SCOPE);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
