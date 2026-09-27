const { requireAdmin } = require('../config');
const { seoStore } = require('../seo-store');

module.exports = async function handler(req,res) {
  if (!requireAdmin(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    const data = await seoStore('dashboard');
    res.status(200).json(data);
  } catch(e) { res.status(500).json({ error:e.message }); }
};
