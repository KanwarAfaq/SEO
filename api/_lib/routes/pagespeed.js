const { getSites } = require('../config');
const { getGoogleAccessToken } = require('../google');

async function run(url, strategy) {
  const qs = new URLSearchParams({ url, strategy });
  for (const c of ['PERFORMANCE','ACCESSIBILITY','BEST_PRACTICES','SEO']) qs.append('category', c);
  const apiKey = process.env.GOOGLE_API_KEY;
  const headers = {};
  if (apiKey) qs.set('key', apiKey);
  else {
    const token = await getGoogleAccessToken(['https://www.googleapis.com/auth/cloud-platform']);
    headers.authorization = 'Bearer ' + token;
  }
  const r = await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + qs, { headers });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || ('PageSpeed ' + r.status));
  const cats = d.lighthouseResult?.categories || {};
  const audits = d.lighthouseResult?.audits || {};
  const score = name => cats[name]?.score == null ? null : Math.round(cats[name].score * 100);
  return {
    strategy,
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    tbtMs: audits['total-blocking-time']?.numericValue ?? null,
    speedIndexMs: audits['speed-index']?.numericValue ?? null
  };
}

module.exports = async function handler(req,res) {
  res.setHeader('cache-control','no-store');
  const requested = req.query?.site;
  const sites = requested ? getSites().filter(s => s.id === requested) : getSites();
  const out = [];
  for (const site of sites) {
    try {
      const mobile = await run(site.url, 'mobile');
      const desktop = await run(site.url, 'desktop');
      out.push({ id: site.id, domain: site.domain, mobile, desktop });
    } catch (e) { out.push({ id: site.id, domain: site.domain, error: e.message }); }
  }
  res.status(200).json({ sites: out });
};
