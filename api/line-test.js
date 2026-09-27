const { requireAdmin } = require('./_lib/config');
const { sendLine } = require('./_lib/line');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await sendLine(`✅ SEO Control Center\nLINE notifications are connected.\n${new Date().toISOString()}`);
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
