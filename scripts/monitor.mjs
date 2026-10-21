import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import config from '../api/_lib/config.js';
import { buildDigest, buildDetailedDigest } from './digest-format.mjs';
import { checkSite } from './monitor-health.mjs';
import { cwvGood, perSiteSignals } from './site-signals.mjs';

const sites = config.getSites();
const BASE = process.env.SEO_DASHBOARD_BASE || 'https://seo-kmafaq.vercel.app';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.SEO_DRY_RUN === 'true';
const UA = 'SEO-Control-Center-GitHub-Monitor/4.0';
async function jsonApi(path, timeout = 45000, options = {}) {
  const headers = { 'user-agent': UA, ...options.headers };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (process.env.ADMIN_ACTION_KEY) headers['x-admin-key'] = process.env.ADMIN_ACTION_KEY;
  const r = await fetch(BASE + path, { ...options, headers, signal: AbortSignal.timeout(timeout) });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(path + ': expected JSON, received HTTP ' + r.status + ' (check deployment protection)'); }
  if (!r.ok || data?.error) throw new Error(path + ' HTTP ' + r.status + ': ' + (data?.error || 'request failed'));
  return data;
}
const rows = await Promise.all(sites.map(site => checkSite(site)));
const signals = { errors: [] };
const incidents = rows.flatMap(row => row.issues.map(issue => row.domain + ': ' + issue));

// Dry runs never submit sitemaps, advance inspections, send LINE, or write remote history.
if (!DRY_RUN && process.env.SEO_STORAGE_SECRET) {
  for (const site of sites) {
    try {
      const outcome = await jsonApi('/api/index-progress', 45000, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-seo-storage-secret': process.env.SEO_STORAGE_SECRET },
        body: JSON.stringify({ site: site.id, batch: 5 })
      });
      const failed = (outcome.sites || []).find(x => x.error || x.errors > 0);
      if (failed) signals.errors.push('Index scan ' + site.domain + ': ' + (failed.error || failed.errors + ' inspection errors'));
    } catch (e) { signals.errors.push('Index scan ' + site.domain + ': ' + e.message); }
  }
} else if (!DRY_RUN) signals.errors.push('New URL inspections disabled: SEO_STORAGE_SECRET missing');

if (!DRY_RUN && process.env.ADMIN_ACTION_KEY) {
  try {
    signals.sitemapSync = await jsonApi('/api/indexing-submit', 75000, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (signals.sitemapSync.counts?.failed) signals.errors.push('Sitemap sync: ' + signals.sitemapSync.counts.failed + ' site(s) failed');
  } catch (e) { signals.errors.push('Sitemap sync: ' + e.message); }
} else if (!DRY_RUN) signals.errors.push('Sitemap sync disabled: ADMIN_ACTION_KEY missing');

const endpoints = { gsc: '/api/gsc-overview', ga4: '/api/ga4-realtime', cwv: '/api/crux', opportunities: '/api/gsc-opportunities', indexing: '/api/index-progress' };
await Promise.all(Object.entries(endpoints).map(async ([key, path]) => {
  try {
    const data = await jsonApi(path);
    if (key === 'opportunities') {
      if (!Array.isArray(data.opportunities)) throw new Error('Missing opportunities response');
      signals.opportunities = { items: data.opportunities, errors: data.errors || [], count: data.opportunities.length };
      signals.errors.push(...(data.errors || []).map(x => (x.domain || x.siteId) + ' query data: ' + x.error));
    } else {
      if (!Array.isArray(data.sites)) throw new Error('Missing sites response');
      if (key === 'indexing') { signals.indexing = data.portfolio; signals.indexingSites = data.sites; }
      else signals[key] = { sites: data.sites, ...(key === 'gsc' ? { days: 28 } : {}) };
      for (const site of sites) {
        const result = data.sites.find(x => x.id === site.id);
        if (!result || result.error) signals.errors.push(site.domain + ' ' + key + ': ' + (result?.error || 'missing site data'));
      }
    }
  } catch (e) { signals.errors.push(key + ': ' + e.message); }
}));
if (signals.cwv) {
  const known = signals.cwv.sites.map(cwvGood).filter(x => x !== null);
  Object.assign(signals.cwv, { good: known.filter(Boolean).length, attention: known.filter(x => !x).length, known: known.length });
}
const details = perSiteSignals(rows, signals);
for (const site of details) if (site.trend?.prior >= 30 && site.trend.changePct <= -30) incidents.push(site.domain + ': organic clicks ' + site.trend.changePct + '% week over week');
const now = new Date();
const stamp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(now) + ' Taipei';
const healthy = rows.filter(r => r.status === 'OK' && r.sitemap === 'OK' && r.robots === 'OK').length;
const summary = buildDigest({ stamp, rows, gsc: signals.gsc, indexing: signals.indexing, submission: signals.sitemapSync, incidents, errors: signals.errors, base: BASE });
const digestCard = buildDetailedDigest(summary, details, BASE);
const report = { checkedAt: now.toISOString(), dryRun: DRY_RUN, healthy, total: sites.length, incidentCount: incidents.length, incidents, rows, sites: details, signals };
const markdown = [
  '# SEO portfolio report — ' + stamp,
  `${healthy}/${sites.length} sites have reachable homepage, valid sitemap and passing robots checks.`,
  'GSC is finalized 28-day Web data, not real-time; URL Inspection counts are a sample, not sitewide indexing totals.',
  ...details.flatMap(s => [
    '\n## ' + s.domain,
    `Homepage: ${s.status} · ${s.latency ?? 'unknown'} ms · Robots: ${s.robots} · Sitemap: ${s.sitemap}`,
    `Sitemap entries: ${s.sitemapInfo ? s.sitemapInfo.entries + ' ' + s.sitemapInfo.kind : 'unavailable'}`,
    s.gsc && !s.gsc.error ? `GSC ${s.gsc.range?.start}–${s.gsc.range?.end}: ${s.gsc.clicks} clicks / ${s.gsc.impressions} impressions` : 'GSC: unavailable',
    s.trend ? `Clicks: last 7 finalized days ${s.trend.recent}, previous 7 days ${s.trend.prior}` : 'Weekly comparison: unavailable',
    s.indexing && !s.indexing.error ? `Inspected: ${s.indexing.checked}; indexed in sample: ${s.indexing.indexed}; not indexed: ${s.indexing.notIndexed}; errors: ${s.indexing.errors}; last scan: ${s.indexing.lastUpdated || 'none'}` : 'URL inspection: unavailable',
    ...s.actions.map(a => '- ' + a),
    ...(s.actions.length ? [] : ['No priority action detected by these checks.'])
  ]),
  '\n## Data gaps', ...(signals.errors.length ? signals.errors.map(e => '- ' + e) : ['None reported.'])
].join('\n\n');
await mkdir('reports', { recursive: true });
await writeFile('reports/digest.json', JSON.stringify(report, null, 2));
await writeFile('reports/digest.md', markdown);
await writeFile('reports/line-payload.json', JSON.stringify(digestCard, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(JSON.stringify({ healthy, sites: sites.length, issues: incidents.length, dataGaps: signals.errors.length, dryRun: DRY_RUN }));
if (DRY_RUN) { console.log('DRY_RUN_OK — report saved; no writes or notifications'); process.exit(0); }
if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_USER_ID) throw new Error('LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID missing');

// Reuse one key and unchanged payload for retries of this send only (LINE's 24h window).
const retryKey = randomUUID();
let sent = false;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { authorization: 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN, 'content-type': 'application/json', 'x-line-retry-key': retryKey },
      body: JSON.stringify({ to: process.env.LINE_USER_ID, messages: [digestCard] })
    });
    if (r.ok || (r.status === 409 && r.headers.get('x-line-accepted-request-id'))) { sent = true; break; }
    if (r.status < 500 && r.status !== 429) throw Object.assign(new Error('LINE push rejected: HTTP ' + r.status), { permanent: true });
    throw new Error('LINE push temporarily failed: HTTP ' + r.status);
  } catch (e) { if (e.permanent || attempt === 2) throw e; }
  await new Promise(resolve => setTimeout(resolve, (2 ** attempt) * 1500));
}
if (!sent) throw new Error('LINE delivery not accepted');
console.log('LINE_DIGEST_OK');
if (process.env.SEO_STORAGE_SECRET) {
  try {
    const sr = await fetch(process.env.SEO_STORE_URL || 'https://wikbbpvhvevcbqkpnikj.supabase.co/functions/v1/seo-store-v2', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { 'content-type': 'application/json', 'x-seo-storage-secret': process.env.SEO_STORAGE_SECRET },
      body: JSON.stringify({ action: 'digest', row: {
        window_key: now.toISOString().slice(0, 13), scheduled_for: now.toISOString(), sent_at: new Date().toISOString(),
        channel: 'line', status: 'sent', healthy_sites: healthy, issue_count: incidents.length + signals.errors.length,
        summary: [...incidents, ...signals.errors].slice(0, 6).join(' | ') || 'No priority issues detected', details: { rows, signals }
      } })
    });
    if (!sr.ok) throw new Error('HTTP ' + sr.status);
    console.log('SEO_DIGEST_STORED');
  } catch (e) { console.warn('SEO digest history unavailable: ' + e.message); }
}
