const { getSites } = require('./_lib/config');
const { sendLine } = require('./_lib/line');

function authorized(req) {
  const supplied = req.headers['x-monitor-secret'] || req.query?.secret;
  return Boolean(process.env.MONITOR_SECRET && supplied === process.env.MONITOR_SECRET);
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  const incidents = [];
  for (const site of getSites()) {
    const start = Date.now();
    try {
      const r = await fetch(site.url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'SEO-Control-Center-Monitor/1.0' } });
      const ms = Date.now() - start;
      if (!r.ok) incidents.push(`${site.domain}: HTTP ${r.status}`);
      else if (ms > 4000) incidents.push(`${site.domain}: slow (${ms} ms)`);
    } catch (e) { incidents.push(`${site.domain}: DOWN (${e.name || 'error'})`); }
    try {
      const sr = await fetch(site.sitemap, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'SEO-Control-Center-Monitor/1.0' } });
      if (!sr.ok) incidents.push(`${site.domain}: sitemap HTTP ${sr.status}`);
    } catch { incidents.push(`${site.domain}: sitemap unreachable`); }
  }
  let lineSent = false;
  if (incidents.length && process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_USER_ID) {
    await sendLine(`🚨 SEO Monitor Alert\n\n${incidents.join('\n')}\n\nChecked: ${new Date().toISOString()}`);
    lineSent = true;
  }
  res.status(200).json({ ok: incidents.length === 0, incidents, lineSent, checkedAt: new Date().toISOString() });
};
