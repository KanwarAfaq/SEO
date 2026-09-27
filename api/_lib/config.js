const DEFAULT_SITES = [
  { id: 'anytool', name: 'AnyTool', domain: 'anytool.online', url: 'https://anytool.online', sitemap: 'https://anytool.online/sitemap.xml', gscProperty: 'sc-domain:anytool.online', ga4PropertyId: '' },
  { id: 'kmafaq-online', name: 'KMAFAQ Online', domain: 'kmafaq.online', url: 'https://kmafaq.online', sitemap: 'https://kmafaq.online/sitemap.xml', gscProperty: 'sc-domain:kmafaq.online', ga4PropertyId: '' },
  { id: 'kmafaq-site', name: 'KMAFAQ Site', domain: 'kmafaq.site', url: 'https://kmafaq.site', sitemap: 'https://kmafaq.site/sitemap.xml', gscProperty: 'sc-domain:kmafaq.site', ga4PropertyId: '' },
  { id: 'scholarportal', name: 'ScholarPortal', domain: 'scholarportal.site', url: 'https://scholarportal.site', sitemap: 'https://scholarportal.site/sitemap.xml', gscProperty: 'sc-domain:scholarportal.site', ga4PropertyId: '' },
];

function getSites() {
  if (!process.env.SITE_CONFIG_JSON) return DEFAULT_SITES;
  try {
    const parsed = JSON.parse(process.env.SITE_CONFIG_JSON);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SITES;
  } catch {
    return DEFAULT_SITES;
  }
}

function requireAdmin(req) {
  const key = req.headers['x-admin-key'];
  return Boolean(process.env.ADMIN_ACTION_KEY && key === process.env.ADMIN_ACTION_KEY);
}

module.exports = { getSites, requireAdmin };
