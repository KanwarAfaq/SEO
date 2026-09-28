const sites = JSON.parse(process.env.SITE_CONFIG_JSON || '[{"domain":"anytool.online","url":"https://anytool.online","sitemap":"https://anytool.online/sitemap.xml"},{"domain":"kmafaq.online","url":"https://kmafaq.online","sitemap":"https://kmafaq.online/sitemap.xml"},{"domain":"kmafaq.site","url":"https://kmafaq.site","sitemap":"https://kmafaq.site/sitemap.xml"},{"domain":"scholarportal.site","url":"https://scholarportal.site","sitemap":"https://scholarportal.site/sitemap.xml"}]');

const BASE = process.env.SEO_DASHBOARD_BASE || 'https://seo-kmafaq.vercel.app';
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';

async function jsonApi(path, timeout = 15000) {
  const headers = { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/3.0' };
  if (BYPASS) headers['x-vercel-protection-bypass'] = BYPASS;
  const r = await fetch(BASE + path, { headers, signal: AbortSignal.timeout(timeout) });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!r.ok) throw new Error(path + ' HTTP ' + r.status + (data?.error ? ': ' + data.error : ''));
  return data;
}

const rows = [];
const incidents = [];

for (const site of sites) {
  let status = 'DOWN';
  let latency = null;
  let sitemap = 'FAIL';
  const start = Date.now();

  try {
    const r = await fetch(site.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/3.0' }
    });
    latency = Date.now() - start;
    status = r.ok ? 'OK' : 'HTTP ' + r.status;
    if (!r.ok) incidents.push(site.domain + ': HTTP ' + r.status);
    if (r.ok && latency > 4000) incidents.push(site.domain + ': slow (' + latency + ' ms)');
  } catch {
    incidents.push(site.domain + ': unavailable');
  }

  try {
    const r = await fetch(site.sitemap, {
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'SEO-Control-Center-GitHub-Monitor/3.0' }
    });
    sitemap = r.ok ? 'OK' : 'HTTP ' + r.status;
    if (!r.ok) incidents.push(site.domain + ': sitemap HTTP ' + r.status);
  } catch {
    incidents.push(site.domain + ': sitemap unavailable');
  }

  rows.push({ domain: site.domain, status, latency, sitemap });
}

const signals = {
  gsc: null,
  ga4: null,
  facebook: null,
  cwv: null,
  opportunities: null,
  errors: []
};

const apiResults = await Promise.allSettled([
  jsonApi('/api/gsc-overview'),
  jsonApi('/api/ga4-realtime'),
  jsonApi('/api/facebook-insights'),
  jsonApi('/api/crux'),
  jsonApi('/api/gsc-opportunities')
]);

const [gscR, gaR, fbR, cwvR, oppR] = apiResults;

if (gscR.status === 'fulfilled') {
  const valid = (gscR.value.sites || []).filter(x => !x.error);
  if (valid.length) {
    signals.gsc = {
      clicks: Math.round(valid.reduce((a, x) => a + Number(x.clicks || 0), 0)),
      impressions: Math.round(valid.reduce((a, x) => a + Number(x.impressions || 0), 0)),
      properties: valid.length
    };
  }
} else signals.errors.push('GSC: ' + gscR.reason.message);

if (gaR.status === 'fulfilled') {
  const valid = (gaR.value.sites || []).filter(x => x.configured !== false && !x.error);
  if (valid.length) {
    signals.ga4 = {
      activeUsers: Math.round(valid.reduce((a, x) => a + Number(x.activeUsers || 0), 0)),
      properties: valid.length
    };
  }
} else signals.errors.push('GA4: ' + gaR.reason.message);

if (fbR.status === 'fulfilled') {
  signals.facebook = {
    followers: fbR.value?.page?.followers ?? null,
    posts: Array.isArray(fbR.value?.posts) ? fbR.value.posts.length : null,
    metrics: fbR.value?.metrics ? Object.keys(fbR.value.metrics).filter(k => fbR.value.metrics[k]?.available).length : 0
  };
} else signals.errors.push('Facebook: ' + fbR.reason.message);

function cwvGood(site) {
  if (site?.error) return null;
  const lcp = Number(site?.lcp?.p75);
  const inp = Number(site?.inp?.p75);
  const cls = Number(site?.cls?.p75);
  if (![lcp, inp, cls].every(Number.isFinite)) return null;
  return lcp <= 2500 && inp <= 200 && cls <= 0.1;
}
if (cwvR.status === 'fulfilled') {
  const list = cwvR.value.sites || [];
  const known = list.map(cwvGood).filter(x => x !== null);
  signals.cwv = {
    good: known.filter(Boolean).length,
    attention: known.filter(x => !x).length,
    known: known.length
  };
} else signals.errors.push('CrUX: ' + cwvR.reason.message);

if (oppR.status === 'fulfilled') {
  const opps = oppR.value.opportunities || [];
  signals.opportunities = {
    count: opps.length,
    top: opps[0] || null
  };
} else signals.errors.push('Opportunities: ' + oppR.reason.message);

const taipeiTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).format(new Date());

const healthy = rows.filter(r => r.status === 'OK' && r.sitemap === 'OK').length;
const symbol = incidents.length ? '⚠️' : '✅';

const metricLines = [];
if (signals.gsc) metricLines.push('🔎 Search 28d: ' + signals.gsc.clicks.toLocaleString() + ' clicks · ' + signals.gsc.impressions.toLocaleString() + ' impressions');
if (signals.ga4) metricLines.push('◉ GA4 now: ' + signals.ga4.activeUsers.toLocaleString() + ' active users');
if (signals.cwv?.known) metricLines.push('⚡ CWV: ' + signals.cwv.good + ' good · ' + signals.cwv.attention + ' attention');
if (signals.facebook) metricLines.push('f Facebook: ' + (signals.facebook.followers ?? '—') + ' followers · ' + (signals.facebook.posts ?? '—') + ' recent posts');
if (signals.opportunities) metricLines.push('🎯 SEO opportunities: ' + signals.opportunities.count);

const topOpportunity = signals.opportunities?.top
  ? [
      '',
      'Top opportunity:',
      '• ' + signals.opportunities.top.query +
        ' · pos ' + Number(signals.opportunities.top.position || 0).toFixed(1) +
        ' · ' + Number(signals.opportunities.top.impressions || 0).toLocaleString() + ' impressions'
    ]
  : [];

const summaryLines = rows.map(r => {
  const speed = r.latency == null ? '—' : r.latency + 'ms';
  const icon = r.status === 'OK' && r.sitemap === 'OK' ? '🟢' : '🔴';
  return icon + ' ' + r.domain + ' · ' + r.status + ' · ' + speed + ' · sitemap ' + r.sitemap;
});

const message = [
  symbol + ' SEO Control Center · ' + taipeiTime,
  'Sites: ' + healthy + '/' + rows.length + ' healthy · Issues: ' + incidents.length,
  '',
  ...metricLines,
  ...topOpportunity,
  '',
  'Site health:',
  ...summaryLines,
  ...(incidents.length ? ['', 'Needs attention:', ...incidents.slice(0, 6).map(x => '• ' + x)] : []),
  ...(signals.errors.length ? ['', 'Data notes: ' + signals.errors.slice(0, 2).join(' | ')] : []),
  '',
  'Market: Worldwide · Priority: Asia + Europe'
].join('\n');

console.log(JSON.stringify({
  healthy,
  total: rows.length,
  incidentCount: incidents.length,
  rows,
  signals
}, null, 2));

if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_USER_ID) {
  throw new Error('LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID is missing');
}

const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
  method: 'POST',
  headers: {
    authorization: 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    to: process.env.LINE_USER_ID,
    messages: [{ type: 'text', text: message.slice(0, 4900) }]
  })
});

if (!lineResponse.ok) {
  throw new Error('LINE push failed: ' + lineResponse.status + ' ' + (await lineResponse.text()).slice(0, 500));
}
console.log('LINE_DIGEST_OK');

if (process.env.SEO_STORAGE_SECRET) {
  try {
    const taipeiParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    }).formatToParts(new Date()).reduce((a,p)=>(a[p.type]=p.value,a),{});

    const windowKey = taipeiParts.year + '-' + taipeiParts.month + '-' + taipeiParts.day + 'T' + taipeiParts.hour;
    const sr = await fetch('https://wikbbpvhvevcbqkpnikj.supabase.co/functions/v1/seo-store-v2', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-seo-storage-secret': process.env.SEO_STORAGE_SECRET
      },
      body: JSON.stringify({
        action: 'digest',
        row: {
          window_key: windowKey,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          channel: 'line',
          status: 'sent',
          healthy_sites: healthy,
          issue_count: incidents.length,
          summary: incidents.length ? incidents.slice(0,6).join(' | ') : 'All monitored sites healthy',
          details: { rows, signals, market: 'Worldwide', priority_regions: ['Asia', 'Europe'] }
        }
      })
    });
    if (!sr.ok) console.warn('SEO digest persistence failed', sr.status);
    else console.log('SEO_DIGEST_STORED');
  } catch (e) {
    console.warn('SEO digest persistence error', e?.message || e);
  }
}
