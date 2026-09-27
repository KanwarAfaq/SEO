const { requireAdmin } = require('./_lib/config');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { host, urls } = req.body || {};
  const key = process.env.INDEXNOW_KEY;
  if (!key) return res.status(400).json({ error: 'INDEXNOW_KEY is not configured' });
  if (!host || !Array.isArray(urls) || !urls.length) return res.status(400).json({ error: 'host and urls[] are required' });
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(0, 10000) })
    });
    res.status(r.ok ? 200 : r.status).json({ ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
