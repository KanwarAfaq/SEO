const { getSites, requireAdmin } = require('../config');
const { googleFetch } = require('../google');

const READ = ['https://www.googleapis.com/auth/webmasters.readonly'];
const WRITE = ['https://www.googleapis.com/auth/webmasters'];
const UA = 'SEO-Control-Center-Sitemap-Sync/2.0';

function safeSite(site) {
  try {
    const root = new URL(site.url);
    const map = new URL(site.sitemap);
    return root.protocol === 'https:' && map.protocol === 'https:' &&
      map.hostname.replace(/^www\./i, '').toLowerCase() === root.hostname.replace(/^www\./i, '').toLowerCase() &&
      /^sc-domain:[a-z0-9.-]+$|^https:\/\/[^ ]+\/$/i.test(site.gscProperty || '');
  } catch { return false; }
}

function latestModified(xml, now = Date.now()) {
  if (!/<(?:urlset|sitemapindex)\b/i.test(xml) || !/<loc>/i.test(xml)) {
    throw new Error('Sitemap is not a valid non-empty URL set or sitemap index');
  }
  const stamps = [...xml.matchAll(/<lastmod>\s*([^<]+)\s*<\/lastmod>/gi)]
    .map(match => Date.parse(match[1]))
    .filter(ms => Number.isFinite(ms) && ms <= now + 86400000);
  return stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;
}

function submissionDecision(existing, changedAt, force = false) {
  if (force) return 'manual-request';
  if (!existing) return 'not-registered';
  const submitted = Date.parse(existing.lastSubmitted || '');
  const modified = Date.parse(changedAt || '');
  if (Number.isFinite(modified) && (!Number.isFinite(submitted) || modified > submitted + 60000)) {
    return 'newer-sitemap-content';
  }
  // GSC sitemap errors require fixing the source; resubmitting the same XML will not fix them.
  return null;
}

async function googleStatus(site) {
  const endpoint = 'https://www.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(site.gscProperty) + '/sitemaps/' + encodeURIComponent(site.sitemap);
  const r = await googleFetch(endpoint, { method: 'GET' }, READ);
  if (r.status === 404) return { status: null, endpoint };
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('GSC sitemap status HTTP ' + r.status + ': ' +
    String(data?.error?.message || 'access denied').slice(0, 180));
  return { status: data, endpoint };
}

async function checkSite(site, force) {
  if (!safeSite(site)) throw new Error('Configured sitemap or GSC property is invalid');
  const r = await fetch(site.sitemap, {
    redirect: 'follow', signal: AbortSignal.timeout(10000),
    headers: { 'user-agent': UA, accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5' }
  });
  if (!r.ok) throw new Error('Live sitemap HTTP ' + r.status);
  const xml = await r.text();
  if (xml.length > 6_000_000) throw new Error('Sitemap too large for monitor');
  const modifiedAt = latestModified(xml);
  const { status, endpoint } = await googleStatus(site);
  const reason = submissionDecision(status, modifiedAt, force);
  const result = {
    id: site.id, domain: site.domain, sitemap: site.sitemap,
    action: 'current', reason: reason || 'already-current-or-no-lastmod',
    lastModified: modifiedAt, lastSubmitted: status?.lastSubmitted || null,
    errors: Number(status?.errors || 0), warnings: Number(status?.warnings || 0)
  };
  if (!reason) return result;
  const response = await googleFetch(endpoint, { method: 'PUT' }, WRITE);
  if (!response.ok) throw new Error('GSC sitemap submission HTTP ' + response.status + ': ' +
    (await response.text()).slice(0, 180));
  result.action = 'submitted';
  result.reason = reason;
  result.submittedAt = new Date().toISOString();
  return result;
}

async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Admin authorization required' });
  const all = getSites();
  const requestedId = req.body?.site || null;
  const sites = requestedId ? all.filter(site => site.id === requestedId) : all;
  if (!sites.length) return res.status(400).json({ error: 'Unknown site' });
  const force = req.body?.force === true;
  const items = [];
  for (const site of sites) {
    try { items.push(await checkSite(site, force)); }
    catch (e) { items.push({ id: site.id, domain: site.domain, action: 'failed', error: e.message }); }
  }
  const counts = {
    checked: items.length,
    submitted: items.filter(s => s.action === 'submitted').length,
    current: items.filter(s => s.action === 'current').length,
    failed: items.filter(s => s.action === 'failed').length,
    withErrors: items.filter(s => s.errors > 0).length
  };
  return res.status(counts.failed ? 207 : 200).json({
    source: 'Google Search Console Sitemaps API',
    note: 'Sitemap accepted does not mean crawled or indexed; ordinary URLs cannot be forced through the Indexing API.',
    counts, sites: items
  });
}

module.exports = handler;
module.exports._test = { safeSite, latestModified, submissionDecision };
