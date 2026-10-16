import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildDigest } from '../scripts/digest-format.mjs';

const require = createRequire(import.meta.url);
const { _test:{ safeSite, latestModified, submissionDecision } } =
  require('../api/_lib/routes/indexing-submit.js');

const configured = {
  id:'example', domain:'example.com', url:'https://example.com',
  sitemap:'https://www.example.com/sitemap.xml',
  gscProperty:'sc-domain:example.com'
};

test('sitemap targets must be configured, HTTPS and within the same verified domain', () => {
  assert.equal(safeSite(configured), true);
  assert.equal(safeSite({...configured, sitemap:'https://attacker.test/sitemap.xml'}), false);
  assert.equal(safeSite({...configured, sitemap:'http://example.com/sitemap.xml'}), false);
  assert.equal(safeSite({...configured, gscProperty:'anything'}), false);
});

test('sitemap sync only submits missing or changed material', () => {
  assert.equal(submissionDecision(null, null), 'not-registered');
  const existing={lastSubmitted:'2026-10-10T00:00:00Z'};
  assert.equal(submissionDecision(existing,'2026-10-09T00:00:00Z'),null);
  assert.equal(submissionDecision(existing,'2026-10-11T00:00:00Z'),'newer-sitemap-content');
  assert.equal(submissionDecision(existing,null),null);
  assert.equal(submissionDecision(existing,null,true),'manual-request');
});

test('XML validates and identifies latest allowed lastmod', () => {
  assert.equal(latestModified('<urlset><url><loc>https://example.com/</loc><lastmod>2026-09-01</lastmod></url></urlset>'),
    '2026-09-01T00:00:00.000Z');
  assert.throws(()=>latestModified('<html>not a sitemap</html>'));
});

const rows=[
  {id:'a',domain:'a.example',status:'OK',sitemap:'OK'},
  {id:'b',domain:'b.example',status:'OK',sitemap:'OK'}
];
const sites=[
  {id:'a',domain:'a.example',clicks:12,impressions:400,range:{start:'2026-09-01',end:'2026-09-28'}},
  {id:'b',domain:'b.example',clicks:5,impressions:50,range:{start:'2026-09-01',end:'2026-09-28'}}
];
test('LINE visual report has accurate totals, dates, and no page link list',()=>{
  const msg=buildDigest({
    stamp:'10/16 08:00',rows,gsc:{days:28,sites},
    indexing:{indexed:2,checked:4,totalPages:100},
    submission:{counts:{submitted:1,current:1,failed:0}},
    base:'https://seo.example.com',incidents:[],errors:[]
  });
  assert.equal(msg.type,'flex');
  assert.match(msg.altText,/17 clicks \/ 450 impressions/);
  assert.match(msg.altText,/2026-09-01/);
  assert.match(JSON.stringify(msg),/Sample of sitemap URLs/);
  assert.equal(msg.contents.footer.contents.length,1);
  assert.ok(msg.altText.length<400);
});
test('GSC missing properties do not silently count as zero',()=>{
  const msg=buildDigest({stamp:'10/16',rows,gsc:{days:28,sites:[sites[0]]},indexing:null,incidents:[],errors:[]});
  assert.match(msg.altText,/— clicks \/ — impressions/);
  assert.match(msg.altText,/NEEDS REVIEW/);
});
