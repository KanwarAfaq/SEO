const { getSites } = require('./_lib/config');

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const sites = getSites();
  res.status(200).json({
    google: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)),
    googleApiKey: Boolean(process.env.GOOGLE_API_KEY),
    facebook: Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    facebookApp: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    line: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_USER_ID),
    indexNow: Boolean(process.env.INDEXNOW_KEY),
    adminProtection: Boolean(process.env.ADMIN_ACTION_KEY),
    siteConfig: Boolean(process.env.SITE_CONFIG_JSON),
    seoStorage: Boolean(process.env.SEO_STORAGE_SECRET),
    seoStoreUrl: process.env.SEO_STORE_URL || 'https://wikbbpvhvevcbqkpnikj.supabase.co/functions/v1/seo-store-v2',
    targeting: {
      market: 'Worldwide',
      priorityRegions: ['Asia', 'Europe']
    },
    repositories: sites.map(s => ({ id: s.id, domain: s.domain, repository: s.repository }))
  });
};
