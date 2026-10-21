// In-process fake transport for subprocess tests; never reaches external services.
import config from '../../api/_lib/config.js';
const sites = config.getSites();
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  if (process.argv.includes('--dry-run') && options.method === 'POST') throw new Error('DRY RUN attempted a write');
  if (url.hostname === 'api.line.me') {
    const body = JSON.parse(options.body);
    if (body.messages.length !== 1 || body.messages[0].contents.contents.length !== 6) throw new Error('Bad notification');
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(options.headers['x-line-retry-key'])) throw new Error('Bad retry key');
    return json({});
  }
  if (url.hostname.endsWith('supabase.co')) return json({});
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/indexing-submit') return json({ counts: { submitted: 0, current: 5, failed: 0 } });
    if (url.pathname === '/api/gsc-opportunities') return json({ opportunities: [], errors: [] });
    return json({ portfolio: { indexed: 5, checked: 10 }, sites: sites.map(s => ({
      id: s.id, domain: s.domain, clicks: 10, impressions: 100, ctr: .1, position: 8,
      range: { start: '2026-09-20', end: '2026-10-17' }, series: [],
      configured: false, indexed: 1, checked: 2, notIndexed: 1, errors: 0, totalPages: 10,
      lastUpdated: '2026-10-21T00:00:00Z'
    })) });
  }
  if (url.pathname === '/sitemap.xml') return new Response('<urlset><url><loc>' + url.origin + '/</loc></url></urlset>');
  if (url.pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\nSitemap: ' + url.origin + '/sitemap.xml');
  return new Response('<html><title>A real homepage title</title><meta name="description" content="Useful content"><link rel="canonical" href="' + url.origin + '/"></html>');
};
