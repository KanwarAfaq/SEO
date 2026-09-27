const { requireAdmin } = require('../config');
const { seoStore } = require('../seo-store');

module.exports = async function handler(req,res) {
  if (!requireAdmin(req)) return res.status(401).json({error:'Unauthorized'});
  const checks = {
    googleServiceAccount: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)),
    googleApiKey: Boolean(process.env.GOOGLE_API_KEY),
    line: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_USER_ID),
    siteConfig: Boolean(process.env.SITE_CONFIG_JSON),
    adminProtection: Boolean(process.env.ADMIN_ACTION_KEY),
    indexNow: Boolean(process.env.INDEXNOW_KEY),
    seoStorageSecret: Boolean(process.env.SEO_STORAGE_SECRET)
  };
  let storage = {ok:false};
  if (checks.seoStorageSecret) {
    try {
      const d = await seoStore('dashboard');
      storage = {
        ok:true,
        openIssues:(d.issues||[]).length,
        actions:(d.actions||[]).length,
        snapshots:(d.snapshots||[]).length,
        agentRuns:(d.runs||[]).length,
        changes:(d.changes||[]).length
      };
    } catch(e) { storage={ok:false,error:e.message}; }
  }
  res.status(200).json({checks,storage,ready:Object.values(checks).every(Boolean)&&storage.ok});
};
