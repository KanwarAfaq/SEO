const { getSites } = require('./_lib/config');

function match(html, re) { const m = html.match(re); return m ? String(m[1] || m[0]).trim() : ''; }
function count(html, re) { return (html.match(re) || []).length; }

async function audit(site) {
  const out = { id: site.id, domain: site.domain, url: site.url, score: 100, issues: [], checks: {} };
  const start = Date.now();
  try {
    const r = await fetch(site.url, { redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'SEO-Control-Center-Audit/1.0' } });
    out.httpStatus = r.status;
    out.finalUrl = r.url;
    out.latency = Date.now() - start;
    if (!r.ok) { out.score -= 35; out.issues.push({ severity: 'critical', code: 'http', message: `Homepage returned HTTP ${r.status}` }); return out; }
    const html = await r.text();
    const title = match(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g,' ');
    const description = match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
    const canonical = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) || match(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
    const robots = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i);
    const h1Count = count(html, /<h1(?:\s|>)/gi);
    const schemaCount = count(html, /<script[^>]+type=["']application\/ld\+json["']/gi);
    const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    out.checks = { title, titleLength: title.length, description, descriptionLength: description.length, canonical, robots, h1Count, schemaCount, ogTitle, viewport };
    if (!title) { out.score -= 15; out.issues.push({ severity:'high',code:'title_missing',message:'Homepage is missing a title tag' }); }
    else if (title.length < 20 || title.length > 65) { out.score -= 5; out.issues.push({ severity:'medium',code:'title_length',message:`Title length is ${title.length} characters` }); }
    if (!description) { out.score -= 10; out.issues.push({ severity:'high',code:'description_missing',message:'Meta description is missing' }); }
    else if (description.length < 70 || description.length > 170) { out.score -= 4; out.issues.push({ severity:'low',code:'description_length',message:`Meta description length is ${description.length} characters` }); }
    if (!canonical) { out.score -= 8; out.issues.push({ severity:'medium',code:'canonical_missing',message:'Canonical link is missing' }); }
    if (/noindex/i.test(robots)) { out.score -= 25; out.issues.push({ severity:'critical',code:'noindex',message:'Homepage contains a noindex directive' }); }
    if (h1Count === 0) { out.score -= 8; out.issues.push({ severity:'medium',code:'h1_missing',message:'No H1 heading detected' }); }
    else if (h1Count > 1) { out.score -= 2; out.issues.push({ severity:'low',code:'h1_multiple',message:`${h1Count} H1 headings detected` }); }
    if (!viewport) { out.score -= 6; out.issues.push({ severity:'medium',code:'viewport_missing',message:'Viewport meta tag is missing' }); }
    if (!ogTitle) { out.score -= 2; out.issues.push({ severity:'low',code:'og_missing',message:'Open Graph title is missing' }); }
    if (schemaCount === 0) { out.score -= 3; out.issues.push({ severity:'low',code:'schema_missing',message:'No JSON-LD structured data detected on homepage' }); }
    if (out.latency > 4000) { out.score -= 8; out.issues.push({ severity:'medium',code:'slow_response',message:`Homepage response took ${out.latency} ms` }); }
    try {
      const rr = await fetch(`${site.url.replace(/\/$/,'')}/robots.txt`, { signal: AbortSignal.timeout(8000), headers: { 'user-agent':'SEO-Control-Center-Audit/1.0' } });
      out.checks.robotsTxt = rr.status;
      if (!rr.ok) { out.score -= 5; out.issues.push({ severity:'medium',code:'robots_txt',message:`robots.txt returned HTTP ${rr.status}` }); }
    } catch { out.score -= 5; out.issues.push({ severity:'medium',code:'robots_txt',message:'robots.txt is unreachable' }); }
    try {
      const sr = await fetch(site.sitemap, { signal: AbortSignal.timeout(8000), headers: { 'user-agent':'SEO-Control-Center-Audit/1.0' } });
      out.checks.sitemap = sr.status;
      if (!sr.ok) { out.score -= 10; out.issues.push({ severity:'high',code:'sitemap',message:`Sitemap returned HTTP ${sr.status}` }); }
    } catch { out.score -= 10; out.issues.push({ severity:'high',code:'sitemap',message:'Sitemap is unreachable' }); }
    out.score = Math.max(0, Math.round(out.score));
    return out;
  } catch (e) {
    out.score = 0; out.error = e.message; out.issues.push({ severity:'critical',code:'unreachable',message:`Site audit failed: ${e.message}` }); return out;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control','no-store');
  const results = await Promise.all(getSites().map(audit));
  res.status(200).json({ checkedAt:new Date().toISOString(), sites:results });
};
