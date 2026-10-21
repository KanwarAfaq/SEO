// Lightweight, read-only checks of the public homepage and discovery endpoints.
const UA = 'SEO-Control-Center-Monitor/4.0';
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3]]));
const normalize = value => { try { const u = new URL(value); return u.origin + u.pathname.replace(/\/$/, '') + u.search; } catch { return ''; } };
export function inspectHtml(html, finalUrl, headerRobots = '') {
  const issues = [];
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0]));
  const canonicals = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0])).filter(a => /(^|\s)canonical(\s|$)/i.test(a.rel || ''));
  const canonical = canonicals[0]?.href || '';
  const directives = meta.filter(a => /^(robots|googlebot)$/i.test(a.name || '')).map(a => a.content || '').join(',') + ',' + headerRobots;
  if (/\b(noindex|none)\b/i.test(directives)) issues.push('CRITICAL: homepage blocks indexing; remove unintended noindex');
  if (!canonical) issues.push('Add a canonical URL to the homepage');
  else if (canonicals.length > 1) issues.push('Resolve multiple homepage canonical tags');
  else if (normalize(new URL(canonical, finalUrl).href) !== normalize(finalUrl)) issues.push('Align the serving host/URL with the canonical (check redirects)');
  if (!/<title\b[^>]*>\s*[^<\s]/i.test(html)) issues.push('Add a descriptive homepage title');
  if (!meta.some(a => a.name?.toLowerCase() === 'description' && a.content?.trim())) issues.push('Add a useful homepage meta description');
  return { canonical, issues };
}
export function inspectSitemap(xml) {
  const isIndex = /<sitemapindex(?:\s|>)/i.test(xml);
  if (/<html(?:\s|>)/i.test(xml) || (!isIndex && !/<urlset(?:\s|>)/i.test(xml))) throw new Error('Response is not sitemap XML');
  const entries = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].length;
  if (!entries) throw new Error('Sitemap contains no URL entries');
  return { entries, kind: isIndex ? 'child sitemaps' : 'URLs' };
}
export function inspectRobots(body) {
  if (/<html(?:\s|>)/i.test(body)) return ['robots.txt returned HTML; serve plain-text crawl rules'];
  const groups = []; let group = null;
  for (const line of body.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').trim().match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2].trim();
    if (key === 'user-agent') {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && ['allow', 'disallow'].includes(key)) group.rules.push({ key, value });
  }
  const specific = groups.filter(g => g.agents.includes('googlebot'));
  const rules = (specific.length ? specific : groups.filter(g => g.agents.includes('*'))).flatMap(g => g.rules);
  const blocking = rules.some(r => r.key === 'disallow' && ['/', '/*', '/*$', '/$'].includes(r.value));
  const allowing = rules.some(r => r.key === 'allow' && ['/', '/$', '/*', '/*$'].includes(r.value));
  const issues = blocking && !allowing ? ['CRITICAL: robots.txt blocks Googlebot at the homepage; review crawl rules'] : [];
  if (!/^\s*sitemap:\s*https?:\/\//im.test(body)) issues.push('Advertise a sitemap URL in robots.txt');
  return issues;
}
export async function checkSite(site, fetcher = fetch) {
  const row = { id: site.id, domain: site.domain, status: 'DOWN', latency: null, sitemap: 'FAIL', robots: 'FAIL', issues: [] };
  const request = url => fetcher(url, { redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'user-agent': UA } });
  await Promise.all([
    (async () => {
      const start = Date.now();
      try {
        const r = await request(site.url); const html = await r.text();
        row.latency = Date.now() - start; row.status = r.ok ? 'OK' : 'HTTP ' + r.status; row.finalUrl = r.url || site.url;
        if (!r.ok) row.issues.push('CRITICAL: restore homepage availability (HTTP ' + r.status + ')');
        else { const result = inspectHtml(html, row.finalUrl, r.headers.get('x-robots-tag') || ''); row.canonical = result.canonical; row.issues.push(...result.issues); }
        if (r.ok && row.latency > 4000) row.issues.push('Investigate slow homepage response (' + row.latency + ' ms from monitor)');
      } catch (e) { row.issues.push('Homepage check failed: ' + e.message); }
    })(),
    (async () => {
      try {
        const r = await request(site.sitemap); if (!r.ok) throw new Error('HTTP ' + r.status);
        row.sitemapInfo = inspectSitemap(await r.text()); row.sitemap = 'OK';
      } catch (e) { row.issues.push('Fix sitemap: ' + e.message); }
    })(),
    (async () => {
      try {
        const r = await request(new URL('/robots.txt', site.url)); if (!r.ok) throw new Error('HTTP ' + r.status);
        const issues = inspectRobots(await r.text()); row.robots = issues.length ? 'REVIEW' : 'OK'; row.issues.push(...issues);
      } catch (e) { row.issues.push('Check robots.txt: ' + e.message); }
    })()
  ]);
  return row;
}
