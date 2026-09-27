const { googleFetch } = require('./_lib/google');
const { getSites } = require('./_lib/config');
const SCOPE = ['https://www.googleapis.com/auth/analytics.readonly'];

module.exports = async function handler(req, res) {
  res.setHeader('cache-control','no-store');
  try {
    const r = await googleFetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', {}, SCOPE);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Analytics Admin API error' });
    const wanted = new Set(getSites().map(s => String(s.ga4PropertyId || '')));
    const properties = [];
    for (const account of data.accountSummaries || []) {
      for (const p of account.propertySummaries || []) {
        const id = String(p.property || '').replace('properties/','');
        if (wanted.has(id)) {
          properties.push({
            account: account.displayName,
            accountId: account.account,
            property: p.displayName,
            propertyId: id
          });
        }
      }
    }
    res.status(200).json({ configured: wanted.size, discovered: properties.length, properties });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
