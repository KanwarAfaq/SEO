import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const M = require('../growth-model.js');
const { ranges, summarize } = require('../api/_lib/search-periods.js');
const registry = [{ id: 'a', domain: 'a.test' }, { id: 'b', domain: 'b.test' }];
const row = (date, clicks, impressions = 100, position = 8) => ({ keys: [date], clicks, impressions, position });
const periods = ranges('2026-10-18', 7);
const metric = { id: 'a', ...summarize([row('2026-10-18', 10)], periods.current), comparison: summarize([row('2026-10-11', 20)], periods.previous) };

test('equal calendar comparisons cross month boundaries and include all 90 prior days', () => {
  assert.deepEqual(ranges('2026-03-01', 7), { current: { start: '2026-02-23', end: '2026-03-01' }, previous: { start: '2026-02-16', end: '2026-02-22' } });
  const p = ranges('2026-10-18', 90);
  assert.equal((Date.parse(p.current.end) - Date.parse(p.previous.start)) / 86400000 + 1, 180);
});
test('server summary excludes out-of-period rows and weights position by impressions', () => {
  const s = summarize([row('2026-10-11', 99), row('2026-10-12', 2, 10, 2), row('2026-10-18', 8, 90, 10)], periods.current);
  assert.equal(s.clicks, 10); assert.equal(s.position, 9.2); assert.equal(s.ctr, .1);
});
test('chart fills missing zero-traffic dates, uses the real prior period, and distinguishes missing sites', () => {
  const s = M.summarize(registry, { sites: [metric] }, 'all', 'clicks');
  assert.equal(s.complete, false); assert.equal(s.valid.length, 1);
  assert.equal(s.points.length, 7); assert.equal(s.points[0].value, 0); assert.equal(s.points[6].value, 10);
  assert.equal(s.priorPoints.length, 7); assert.equal(s.previous.clicks, 20);
  assert.equal(M.change(s.current.clicks, s.previous.clicks), -50);
  assert.equal(M.summarize(registry, { sites: [metric] }, 'a').complete, true);
});
test('missing, zero and incompatible baselines do not produce false growth', () => {
  assert.equal(M.change(5, 0), null);
  assert.equal(M.summarize(registry, null).complete, false);
  assert.equal(M.summarize(registry, null).points.length, 0);
  assert.equal(M.summarize(registry, { sites: [{ ...metric, comparison: undefined }] }).previous, null);
  assert.equal(M.summarize(registry, { sites: [metric, { ...metric, id: 'b', range: { start: '2025-01-01', end: '2025-01-07' } }] }).valid.length, 1);
});
test('inspection errors are part of unknown URLs, not an extra segment', () => {
  const s = M.indexSegments({ totalPages: 100, indexed: 20, notIndexed: 10, errors: 5 });
  assert.equal(s.unchecked, 70); assert.equal(s.indexed + s.excluded + s.unchecked, 100); assert.equal(s.percent, 30);
  assert.equal(M.indexSegments({ error: 'unavailable' }), null);
});
test('CSV quotes values and neutralizes spreadsheet formulas', () => {
  assert.equal(M.csv([['=HYPERLINK("evil")', 'a,b', '"quote"', 0]]), '"\'=HYPERLINK(""evil"")","a,b","""quote""","0"');
});

test('dashboard controller renders data, filters, failures and exports without external services', async () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const elements = new Map(ids.map(id => [id, { innerHTML: '', textContent: '', value: '', disabled: false }]));
  let failGsc = false, exported = null;
  const window = { SEOModel: M, seoPortfolioSites: () => registry };
  const ctx = vm.createContext({ window, document: { getElementById: id => { assert.ok(elements.has(id), 'Missing DOM id ' + id); return elements.get(id); }, querySelectorAll: () => [], createElement: () => ({ click() {} }) },
    sessionStorage: { getItem: () => null }, AbortSignal, URL: { createObjectURL: blob => { exported = blob; return 'blob:test'; }, revokeObjectURL() {} }, Blob, setTimeout: fn => fn(), console,
    fetch: async path => { const name = path.split('?')[0]; if (failGsc && name === '/api/gsc-overview') throw Error('Temporary outage');
      const data = name === '/api/config-status' ? { sites: registry } : name === '/api/gsc-overview' ? { sites: [metric, { ...metric, id: 'b' }] } : { sites: registry.map(s => ({ ...s, ok: true, sitemapOk: true, configured: true, activeUsers: 0, totalPages: 20, indexed: 2, notIndexed: 3, errors: 0 })) };
      return { ok: true, json: async () => data };
    }
  });
  vm.runInContext(readFileSync(new URL('../growth.js', import.meta.url), 'utf8'), ctx);
  await window.seoGrowth.load();
  assert.match(elements.get('growthSummary').innerHTML, /20 search clicks/);
  assert.match(elements.get('growthConnections').innerHTML, /Ready · 0 active/);
  assert.match(elements.get('growthTimeline').innerHTML, /<svg/);
  elements.get('growthSite').onchange({ target: { value: 'a' } });
  assert.match(elements.get('growthSummary').innerHTML, /10 search clicks/);
  elements.get('growthExport').onclick(); assert.match(await exported.text(), /a.test/); assert.doesNotMatch(await exported.text(), /b.test/);
  failGsc = true; await window.seoGrowth.load();
  assert.match(elements.get('growthSummary').innerHTML, /Search data needs attention/);
  assert.match(elements.get('growthErrors').innerHTML, /Temporary outage/);
  assert.match(elements.get('growthConnections').innerHTML, /Ready · 0 active/);
  assert.equal(elements.get('growthRefresh').disabled, false);
});
