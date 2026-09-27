const { requireAdmin } = require('./_lib/config');
const { googleFetch } = require('./_lib/google');
const SCOPE = ['https://www.googleapis.com/auth/webmasters'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { siteUrl, sitemapUrl } = req.body || {};
  if (!siteUrl || !sitemapUrl) return res.status(400).json({ error: 'siteUrl and sitemapUrl are required' });
  try {
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
    const r = await googleFetch(endpoint, { method: 'PUT' }, SCOPE);
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.status(200).json({ ok: true, siteUrl, sitemapUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
