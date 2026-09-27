const { getSites } = require('./_lib/config');

async function inspect(site) {
  const start = Date.now();
  let status = 0;
  let ok = false;
  let error = null;
  try {
    const r = await fetch(site.url, { redirect: 'follow', signal: AbortSignal.timeout(9000), headers: { 'user-agent': 'SEO-Control-Center/1.0' } });
    status = r.status;
    ok = r.ok;
  } catch (e) { error = e.message; }
  const latency = Date.now() - start;

  let sitemapOk = false;
  let sitemapStatus = 0;
  let urlCount = null;
  try {
    const r = await fetch(site.sitemap, { signal: AbortSignal.timeout(9000), headers: { 'user-agent': 'SEO-Control-Center/1.0' } });
    sitemapStatus = r.status;
    sitemapOk = r.ok;
    if (r.ok) {
      const xml = await r.text();
      const urls = xml.match(/<url(?:\s|>)/g);
      const sitemaps = xml.match(/<sitemap(?:\s|>)/g);
      urlCount = (urls && urls.length) || (sitemaps && sitemaps.length) || 0;
    }
  } catch {}

  return { id: site.id, name: site.name, domain: site.domain, url: site.url, ok, status, latency, error, sitemapOk, sitemapStatus, sitemapUrl: site.sitemap, urlCount };
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const results = await Promise.all(getSites().map(inspect));
  res.status(200).json({ checkedAt: new Date().toISOString(), sites: results });
};
