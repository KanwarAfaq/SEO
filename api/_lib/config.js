const DEFAULT_SITES = [
  {
    id: 'anytool',
    name: 'AnyTool',
    domain: 'anytool.online',
    url: 'https://anytool.online',
    sitemap: 'https://anytool.online/sitemap.xml',
    gscProperty: 'sc-domain:anytool.online',
    ga4PropertyId: '',
    repository: 'KanwarAfaq/anytool-online',
    market: 'Worldwide',
    priorityRegions: ['Asia', 'Europe']
  },
  {
    id: 'kmafaq-online',
    name: 'KMAFAQ Online',
    domain: 'kmafaq.online',
    url: 'https://kmafaq.online',
    sitemap: 'https://kmafaq.online/sitemap.xml',
    gscProperty: 'sc-domain:kmafaq.online',
    ga4PropertyId: '',
    repository: 'KanwarAfaq/kmafaq_blog',
    market: 'Worldwide',
    priorityRegions: ['Asia', 'Europe']
  },
  {
    id: 'kmafaq-site',
    name: 'KMAFAQ Site',
    domain: 'kmafaq.site',
    url: 'https://kmafaq.site',
    sitemap: 'https://kmafaq.site/sitemap.xml',
    gscProperty: 'sc-domain:kmafaq.site',
    ga4PropertyId: '',
    repository: 'KanwarAfaq/kmafaq',
    market: 'Worldwide',
    priorityRegions: ['Asia', 'Europe']
  },
  {
    id: 'scholarportal',
    name: 'ScholarPortal',
    domain: 'scholarportal.site',
    url: 'https://scholarportal.site',
    sitemap: 'https://scholarportal.site/sitemap.xml',
    gscProperty: 'sc-domain:scholarportal.site',
    ga4PropertyId: '',
    repository: 'KanwarAfaq/global-scholar-portal',
    market: 'Worldwide',
    priorityRegions: ['Asia', 'Europe']
  },
];

function enrichSite(site) {
  const defaults = DEFAULT_SITES.find(x => x.id === site?.id || x.domain === site?.domain) || {};
  return {
    ...defaults,
    ...site,
    repository: site?.repository || defaults.repository || null,
    market: site?.market || defaults.market || 'Worldwide',
    priorityRegions: Array.isArray(site?.priorityRegions) && site.priorityRegions.length
      ? site.priorityRegions
      : (defaults.priorityRegions || ['Asia', 'Europe'])
  };
}

function getSites() {
  if (!process.env.SITE_CONFIG_JSON) return DEFAULT_SITES.map(enrichSite);
  try {
    const parsed = JSON.parse(process.env.SITE_CONFIG_JSON);
    return Array.isArray(parsed) && parsed.length ? parsed.map(enrichSite) : DEFAULT_SITES.map(enrichSite);
  } catch {
    return DEFAULT_SITES.map(enrichSite);
  }
}

function requireAdmin(req) {
  const key = req.headers['x-admin-key'];
  return Boolean(process.env.ADMIN_ACTION_KEY && key === process.env.ADMIN_ACTION_KEY);
}

module.exports = { getSites, requireAdmin };
