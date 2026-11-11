import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { inspectHtml, inspectRobots, inspectSitemap, checkSite } from '../scripts/monitor-health.mjs';
import { cwvGood, weeklyTrend, perSiteSignals } from '../scripts/site-signals.mjs';
import { buildDigest, buildDetailedDigest } from '../scripts/digest-format.mjs';
const require = createRequire(import.meta.url);
const { getSites } = require('../api/_lib/config.js');

test('legacy four-site overrides retain property IDs and include Worksheet; explicit opt-out works', () => {
  const old = process.env.SITE_CONFIG_JSON;
  try {
    process.env.SITE_CONFIG_JSON = JSON.stringify([{ id: 'anytool', ga4PropertyId: '123', gscProperty: 'https://anytool.online/' }]);
    assert.equal(getSites().length, 5);
    assert.equal(getSites().find(s => s.id === 'anytool').ga4PropertyId, '123');
    assert.equal(getSites().find(s => s.id === 'anytool').gscProperty, 'https://anytool.online/');
    process.env.SITE_CONFIG_JSON = JSON.stringify([{ id: 'worksheet', enabled: false }]);
    assert.equal(getSites().length, 4);
  } finally { if (old === undefined) delete process.env.SITE_CONFIG_JSON; else process.env.SITE_CONFIG_JSON = old; }
});
test('detects host/canonical conflicts and reordered noindex metadata', () => {
  const html = '<title>Example homepage</title><meta content="Useful" name="description"><meta content="noindex" name="googlebot"><link href="https://example.com" rel="canonical">';
  const result = inspectHtml(html, 'https://www.example.com/');
  assert.ok(result.issues.some(x => x.includes('noindex')));
  assert.ok(result.issues.some(x => x.includes('serving host')));
  assert.ok(inspectHtml(html.replace('noindex', 'index'), 'https://example.com/', 'noindex').issues.some(x => x.includes('noindex')));
});
test('sitemap HTML and empty XML are failures, sitemap index counts are labeled correctly', () => {
  assert.throws(() => inspectSitemap('<html>SPA fallback</html>'));
  assert.throws(() => inspectSitemap('<urlset></urlset>'));
  assert.deepEqual(inspectSitemap('<sitemapindex><sitemap><loc>https://a.test/s.xml</loc></sitemap></sitemapindex>'), { entries: 1, kind: 'child sitemaps' });
});
test('robots detects global blocks without confusing private-path restrictions or specific Googlebot rules', () => {
  assert.ok(inspectRobots('User-agent: *\nDisallow: /\nSitemap: https://a.test/s.xml').some(x => x.includes('CRITICAL')));
  assert.equal(inspectRobots('User-agent: *\nDisallow: /admin\nSitemap: https://a.test/s.xml').length, 0);
  assert.equal(inspectRobots('User-agent: *\nDisallow: /\nUser-agent: Googlebot\nAllow: /\nSitemap: https://a.test/s.xml').length, 0);
  assert.ok(inspectRobots('<html>fallback</html>').length);
});
test('missing field metrics are unknown, not zero/pass', () => {
  assert.equal(cwvGood({ lcp: { p75: null }, inp: { p75: null }, cls: { p75: null } }), null);
  assert.equal(cwvGood({ lcp: { p75: '2000' }, inp: { p75: 100 }, cls: { p75: 0 } }), true);
  assert.equal(cwvGood({ lcp: { p75: 4000 }, inp: { p75: 100 }, cls: { p75: 0 } }), false);
});
test('weekly trend uses calendar days including missing zero-traffic dates', () => {
  assert.deepEqual(weeklyTrend({ range: { start: '2026-10-01', end: '2026-10-14' }, series: [{ date: '2026-10-01', clicks: 40 }, { date: '2026-10-14', clicks: 10 }] }), { recent: 10, prior: 40, changePct: -75 });
  assert.equal(weeklyTrend({ error: 'unauthorized' }), null);
});
test('five detailed site cards fit LINE payload limits and label unavailable data', () => {
  const rows = getSites().map(s => ({ id: s.id, domain: s.domain, status: 'OK', sitemap: 'OK', robots: 'OK', issues: [] }));
  const signals = { ga4: { sites: [{ id: 'worksheet', configured: false, activeUsers: 0 }] } };
  const summary = buildDigest({ rows, stamp: '21/10/2026', base: 'https://seo.example' });
  const msg = buildDetailedDigest(summary, perSiteSignals(rows, signals), 'https://seo.example');
  assert.equal(msg.contents.contents.length, 6);
  assert.ok(Buffer.byteLength(JSON.stringify(msg.contents)) < 50000);
  assert.ok(msg.contents.contents.every(c => Buffer.byteLength(JSON.stringify(c)) < 30000));
  assert.ok(msg.altText.length <= 400);
  assert.match(JSON.stringify(msg), /GOOGLE URL INSPECTIONS/);
  assert.match(JSON.stringify(msg), /IMPRESSIONS/);
  assert.doesNotMatch(JSON.stringify(msg), /GA4 realtime unavailable|insufficient\/unavailable field data/);
});
test('HTTP200 fallback page is still a failed sitemap', async () => {
  const row = await checkSite({ id: 'x', domain: 'a.test', url: 'https://a.test', sitemap: 'https://a.test/sitemap.xml' }, async () => new Response('<html>Fallback</html>'));
  assert.equal(row.sitemap, 'FAIL');
  assert.ok(row.issues.some(x => x.includes('not sitemap XML')));
});

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
test('monitor integration: dry run and scheduled send create all five reports using isolated transport', () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-monitor-'));
  const entry = fileURLToPath(new URL('../scripts/monitor.mjs', import.meta.url));
  const fixture = fileURLToPath(new URL('./fixtures/monitor-fetch.mjs', import.meta.url));
  try {
    for (const dry of [true, false]) {
      const output = execFileSync(process.execPath, ['--import', fixture, entry, ...(dry ? ['--dry-run'] : [])], {
        cwd: dir, encoding: 'utf8', timeout: 20000,
        env: { ...process.env, SITE_CONFIG_JSON: '', SEO_DRY_RUN: '', GITHUB_STEP_SUMMARY: '', ADMIN_ACTION_KEY: 'fake', SEO_STORAGE_SECRET: 'fake', LINE_CHANNEL_ACCESS_TOKEN: 'fake', LINE_USER_ID: 'fake' }
      });
      assert.match(output, dry ? /DRY_RUN_OK/ : /LINE_DIGEST_OK/);
      const report = JSON.parse(readFileSync(join(dir, 'reports/digest.json')));
      assert.equal(report.total, 5); assert.equal(report.dryRun, dry);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
