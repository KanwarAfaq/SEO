const sites = JSON.parse(process.env.SITE_CONFIG_JSON || '[{"domain":"anytool.online","url":"https://anytool.online","sitemap":"https://anytool.online/sitemap.xml"},{"domain":"kmafaq.online","url":"https://kmafaq.online","sitemap":"https://kmafaq.online/sitemap.xml"},{"domain":"kmafaq.site","url":"https://kmafaq.site","sitemap":"https://kmafaq.site/sitemap.xml"},{"domain":"scholarportal.site","url":"https://scholarportal.site","sitemap":"https://scholarportal.site/sitemap.xml"}]');

const rows = [];
const incidents = [];

for (const site of sites) {
  let status = 'DOWN';
  let latency = null;
  let sitemap = 'FAIL';
  const start = Date.now();
  try {
    const r = await fetch(site.url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/2.0' } });
    latency = Date.now() - start;
    status = r.ok ? 'OK' : 'HTTP ' + r.status;
    if (!r.ok) incidents.push(site.domain + ': HTTP ' + r.status);
    if (r.ok && latency > 4000) incidents.push(site.domain + ': slow (' + latency + ' ms)');
  } catch { incidents.push(site.domain + ': unavailable'); }
  try {
    const r = await fetch(site.sitemap, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/2.0' } });
    sitemap = r.ok ? 'OK' : 'HTTP ' + r.status;
    if (!r.ok) incidents.push(site.domain + ': sitemap HTTP ' + r.status);
  } catch { incidents.push(site.domain + ': sitemap unavailable'); }
  rows.push({ domain: site.domain, status, latency, sitemap });
}

const taipeiTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const healthy = rows.filter(r => r.status === 'OK' && r.sitemap === 'OK').length;
const symbol = incidents.length ? '⚠️' : '✅';
const summaryLines = rows.map(r => {
  const speed = r.latency == null ? '—' : r.latency + 'ms';
  const icon = r.status === 'OK' && r.sitemap === 'OK' ? '🟢' : '🔴';
  return icon + ' ' + r.domain + ' · ' + r.status + ' · ' + speed + ' · sitemap ' + r.sitemap;
});

const message = [
  symbol + ' SEO Control Center Digest',
  'Healthy sites: ' + healthy + '/' + rows.length,
  'Issues: ' + incidents.length,
  '',
  ...summaryLines,
  ...(incidents.length ? ['', 'Needs attention:', ...incidents.slice(0, 8).map(x => '• ' + x)] : []),
  '',
  'Taiwan time: ' + taipeiTime
].join('\n');

console.log(JSON.stringify({ healthy, total: rows.length, incidentCount: incidents.length, rows }, null, 2));
if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_USER_ID) throw new Error('LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID is missing');
const r = await fetch('https://api.line.me/v2/bot/message/push', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN, 'content-type': 'application/json' },
  body: JSON.stringify({ to: process.env.LINE_USER_ID, messages: [{ type: 'text', text: message.slice(0, 4900) }] })
});
if (!r.ok) throw new Error('LINE push failed: ' + r.status + ' ' + (await r.text()).slice(0, 500));
console.log('LINE_DIGEST_OK');
