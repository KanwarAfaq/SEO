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


const { reason, summarizeReasons }=require('../api/_lib/indexing-diagnostics.js');
const { extendedChecks }=require('../api/_lib/onpage-extras.js');
const { summarize:referralSummarize }=require('../api/_lib/routes/referral-audit.js')._test;

test('classifies noindex, canonical conflicts and not-indexed states correctly',()=>{
  assert.equal(reason({verdict:'FAIL',indexingState:'BLOCKED_BY_META_TAG'}).key,'noindex');
  assert.equal(reason({verdict:'FAIL',coverageState:'Crawled - currently not indexed'}).key,'crawled');
  assert.equal(reason({verdict:'FAIL',googleCanonical:'https://a.test/x',userCanonical:'https://a.test/y'}).key,'canonical');
  assert.equal(reason({verdict:'PASS'}).key,'indexed');
  const records={
    a:{verdict:'FAIL',coverageState:'Crawled - currently not indexed'},
    b:{verdict:'FAIL',indexingState:'BLOCKED_BY_META_TAG'},
    c:{verdict:'PASS'},d:{error:'API quota exceeded'}
  };
  const groups=summarizeReasons(records,['a','b','c','d']);
  assert.equal(groups.length,2);
  assert.equal(groups[0].reason,'noindex');
  assert.equal(groups.reduce((n,x)=>n+x.count,0),2);
});

test('extended on-page checks catch canonical conflicts, headers and invalid schema',()=>{
  const html='<html><head><script type="application/ld+json">{invalid}</script></head><body></body></html>';
  const r=extendedChecks({url:'https://sample.test/a',canonical:'https://sample.test/b',
    headers:{get:name=>name==='x-robots-tag'?'noindex,follow':''},html});
  for(const code of ['noindex_header','canonical_mismatch','invalid_jsonld','html_lang_missing']){
    assert.ok(r.issues.some(x=>x.code===code),'expected '+code);
  }
  const valid=extendedChecks({url:'https://sample.test/a',canonical:'https://www.sample.test/a/',
    html:'<html lang="en"><meta property="og:title" content="Test"><meta property="og:image" content="test"><script type="application/ld+json">{"@context":"https://schema.org"}</script></html>',
    headers:{get:()=>''}});
  assert.equal(valid.issues.some(x=>x.code==='canonical_mismatch'),false);
  assert.equal(valid.issues.some(x=>x.code==='invalid_jsonld'),false);
});

test('referral audit aggregates GA4 auto-added period rows without calling them backlinks',()=>{
  const mk=(source,period,sessions,engaged=0)=>({dimensionValues:[{value:source},{value:period}],metricValues:[{value:String(sessions)},{value:String(engaged)}]});
  const d=referralSummarize([
    mk('example.com','date_range_0',10,7),mk('example.com','date_range_1',5),
    mk('another.net','date_range_0',6,3),mk('(direct)','date_range_0',200)
  ]);
  assert.equal(d.totals.currentSessions,16);
  assert.equal(d.totals.previousSessions,5);
  assert.equal(d.totals.changePct,220);
  assert.equal(d.referringSourcesCount,2);
});
