const sites = JSON.parse(process.env.SITE_CONFIG_JSON || '[{"domain":"anytool.online","url":"https://anytool.online","sitemap":"https://anytool.online/sitemap.xml"},{"domain":"kmafaq.online","url":"https://kmafaq.online","sitemap":"https://kmafaq.online/sitemap.xml"},{"domain":"kmafaq.site","url":"https://kmafaq.site","sitemap":"https://kmafaq.site/sitemap.xml"},{"domain":"scholarportal.site","url":"https://scholarportal.site","sitemap":"https://scholarportal.site/sitemap.xml"}]');
const incidents = [];
for (const site of sites) {
  const start = Date.now();
  try {
    const r = await fetch(site.url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/1.0' } });
    const ms = Date.now() - start;
    if (!r.ok) incidents.push(`${site.domain}: HTTP ${r.status}`);
    else if (ms > 4000) incidents.push(`${site.domain}: slow (${ms} ms)`);
  } catch (e) { incidents.push(`${site.domain}: DOWN`); }
  try {
    const r = await fetch(site.sitemap, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/1.0' } });
    if (!r.ok) incidents.push(`${site.domain}: sitemap HTTP ${r.status}`);
  } catch { incidents.push(`${site.domain}: sitemap unreachable`); }
}
console.log(JSON.stringify({ incidents, checkedAt: new Date().toISOString() }, null, 2));
if (incidents.length && process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_USER_ID) {
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ to: process.env.LINE_USER_ID, messages: [{ type: 'text', text: `🚨 SEO Monitor Alert\n\n${incidents.join('\n')}\n\nChecked: ${new Date().toISOString()}` }] })
  });
  if (!r.ok) throw new Error(`LINE push failed: ${r.status} ${await r.text()}`);
}
if (incidents.length) process.exitCode = 2;
