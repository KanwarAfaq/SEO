import test from 'node:test';
import assert from 'node:assert/strict';
import {buildThreeDayVisual} from '../scripts/line-three-day-visual.mjs';
const sites=[
{id:'a',domain:'anytool.online',http:'OK',sitemap:'OK',robots:'OK',gsc:{clicks:8,impressions:1600},inspection:{total:288,indexed:30,notIndexed:56,unchecked:202}},
{id:'b',domain:'scholarportal.site',http:'OK',sitemap:'OK',robots:'OK',gsc:{clicks:0,impressions:104},inspection:{total:572,indexed:20,notIndexed:150,unchecked:402}},
{id:'c',domain:'kmafaq.site',http:'OK',sitemap:'OK',robots:'OK',gsc:{clicks:2,impressions:4},inspection:{total:13,indexed:4,notIndexed:2,unchecked:7}},
{id:'d',domain:'kmafaq.online',http:'OK',sitemap:'OK',robots:'OK',gsc:{clicks:1,impressions:21},inspection:{total:553,indexed:3,notIndexed:161,unchecked:389}},
{id:'e',domain:'worksheet.live',http:'OK',sitemap:'OK',robots:'OK',gsc:{clicks:0,impressions:398},inspection:{total:64,indexed:16,notIndexed:4,unchecked:44}}
];
const report={checkedAt:'2026-11-11T12:00:00Z',healthy:5,siteCount:5,sites,sourceGaps:[],indexingCounts:{tracked:1490,indexed:73,notIndexed:373,pending:1044}};
test('three-day LINE notification is one visual Flex carousel with six cards',()=>{
 const m=buildThreeDayVisual(report,'https://seo-kmafaq.vercel.app');
 assert.equal(m.type,'flex');
 assert.equal(m.contents.type,'carousel');
 assert.equal(m.contents.contents.length,6);
 assert.ok(m.altText.length<=400);
 assert.ok(Buffer.byteLength(JSON.stringify(m))<50000);
 assert.ok(m.contents.contents.every(b=>b.type==='bubble'));
 assert.ok(m.contents.contents.every(b=>Buffer.byteLength(JSON.stringify(b))<30000));
 assert.ok(m.contents.contents.every(b=>b.footer?.contents?.[0]?.action?.uri?.startsWith('https://seo-kmafaq.vercel.app')));
 const all=JSON.stringify(m);
 assert.match(all,/anytool.online/);
 assert.match(all,/GOOGLE INDEXING/);
 assert.match(all,/INDEXED/);
 assert.doesNotMatch(all,/improve your internal linking|How to resolve|three-day review ·.*\\n.*\\n/i);
});
test('not inspected is not misrepresented as not indexed; absent metrics remain unavailable',()=>{
 const r={...report,sites:sites.map(x=>({...x,gsc:null,inspection:null})),indexingCounts:{tracked:0,indexed:0,notIndexed:0,pending:0},sourceGaps:['GSC unavailable'],healthy:0};
 const m=buildThreeDayVisual(r,'https://seo-kmafaq.vercel.app');
 assert.match(JSON.stringify(m),/PENDING/);
 assert.match(JSON.stringify(m),/data source issue/);
 assert.ok(m.contents.contents.every(x=>x.body?.contents?.length>0));
});
