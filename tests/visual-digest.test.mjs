import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { perSiteSignals } from '../scripts/site-signals.mjs';
const require = createRequire(import.meta.url);
const { getSites } = require('../api/_lib/config.js');
import { dailySeries, portfolioSeries, healthScore, healthChecks, digestSlot } from '../scripts/site-signals.mjs';
import { sparkBars, scoreBar, checkDots, buildDigest as buildSummary, buildDetailedDigest as buildCards } from '../scripts/digest-format.mjs';
import { renderPreview } from '../scripts/digest-preview.mjs';

const gscSite = (id, clicks) => ({ id, domain: id + '.test', clicks: 100, impressions: 1000, ctr: .1, position: 8, range: { start: '2026-10-01', end: '2026-10-14' },
  series: clicks.map((c, i) => ({ date: '2026-10-' + String(i + 1).padStart(2, '0'), clicks: c })) });

test('dailySeries fills zero-traffic gaps and portfolioSeries sums sites day by day', () => {
  const a = gscSite('a', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  const b = { ...gscSite('b', []), series: [{ date: '2026-10-14', clicks: 5 }] };
  assert.equal(dailySeries(a, 14).length, 14);
  assert.deepEqual(dailySeries(b, 3), [0, 0, 5]);
  assert.equal(portfolioSeries([a, b], 14)[13], 19);
  assert.equal(dailySeries({ error: 'x' }), null);
  assert.equal(portfolioSeries([{ error: 'x' }]), null);
});
test('health score only counts known checks; unknown is never a pass', () => {
  assert.equal(healthScore({}), null);
  const allGood = { status: 'OK', sitemap: 'OK', robots: 'OK', issues: [], gsc: { clicks: 1 } };
  assert.equal(healthScore(allGood), 100);
  assert.equal(healthScore({ ...allGood, status: 'DOWN' }), 67);
  assert.equal(healthChecks({ ...allGood }).find(c => c.key === 'CWV').ok, null);
  assert.equal(healthChecks({ ...allGood, issues: ['x'] }).find(c => c.key === 'Issues').ok, false);
});
test('digest slot labels cover the four Taipei send times', () => {
  const at = h => digestSlot(new Date(Date.UTC(2026, 9, 21, h - 8, 15)));
  assert.deepEqual([at(8), at(12), at(18), at(22)], ['Morning', 'Midday', 'Evening', 'Night']);
});
test('sparkline, score bar and check dots produce valid Flex shapes', () => {
  const bars = sparkBars([0, 5, 10], { height: 30 });
  assert.equal(bars.contents.length, 3);
  assert.equal(bars.contents[2].height, '30px');
  assert.equal(bars.contents[0].height, '3px');
  assert.equal(sparkBars(null).type, 'text');
  assert.equal(scoreBar(80).contents[0].width, '80%');
  assert.equal(scoreBar(null).contents[0].type, 'filler');
  assert.equal(scoreBar(1).contents[0].width, '2%');
  assert.equal(checkDots([{ key: 'HTTP', ok: true }, { key: 'CWV', ok: null }]).contents.length, 4);
});
test('visual digest embeds portfolio sparkline, per-site scores and slot while staying under LINE limits', () => {
  const sites = getSites();
  const rows = sites.map(s => ({ id: s.id, domain: s.domain, status: 'OK', sitemap: 'OK', robots: 'OK', issues: [] }));
  const gsc = { days: 28, sites: sites.map((s, i) => gscSite(s.id, Array.from({ length: 14 }, (_, d) => (d + 1) * (i + 1)))) };
  const details = perSiteSignals(rows, { gsc });
  assert.ok(details.every(d => d.score != null && d.series.length === 14));
  const summary = buildSummary({ stamp: '22/10/2026', slot: 'Morning', rows, details, gsc, base: 'https://seo.example' });
  const msg = buildCards(summary, details, 'https://seo.example');
  const json = JSON.stringify(msg);
  assert.match(json, /MORNING · SEO PORTFOLIO PULSE/);
  assert.match(json, /CLICKS · LAST 14 DAYS/);
  assert.match(json, /HEALTH SCORE/);
  assert.match(msg.altText, /^Morning · /);
  assert.ok(msg.altText.length <= 400);
  assert.ok(Buffer.byteLength(JSON.stringify(msg.contents)) < 50000);
  assert.ok(msg.contents.contents.every(c => Buffer.byteLength(JSON.stringify(c)) < 30000));
});
test('digest without series or scores still builds (GSC outage)', () => {
  const rows = getSites().map(s => ({ id: s.id, domain: s.domain, status: 'OK', sitemap: 'OK', robots: 'OK', issues: [] }));
  const details = perSiteSignals(rows, {});
  const msg = buildCards(buildSummary({ stamp: 'x', slot: 'Night', rows, details, base: '' }), details, '');
  assert.match(JSON.stringify(msg), /Daily trend unavailable/);
});
test('html preview escapes content and renders every site', () => {
  const rows = getSites().map(s => ({ id: s.id, domain: s.domain, status: 'OK', sitemap: 'OK', robots: 'OK', issues: ['<script>x</script>'] }));
  const sites = perSiteSignals(rows, {});
  const html = renderPreview({ healthy: 0, total: rows.length, incidentCount: 5, sites, signals: { errors: [] } }, '22/10/2026', 'Morning');
  assert.ok(!html.includes('<script>x'));
  assert.equal((html.match(/<article class="card">/g) || []).length, rows.length);
});
