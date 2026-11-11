import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../api/_lib/indexing-monitor.js';
const {buildIndexingMonitor}=core;
const base={capturedAt:'2026-11-11T04:37:00Z',sites:[{
 id:'example',domain:'example.com',gscProperty:'sc-domain:example.com',trackedTotal:5,
 inspected:[
 {url:'https://example.com/a',status:'NOT_INDEXED',coverageState:'Crawled - currently not indexed',lastCheckAt:'2026-11-11T02:00:00Z'},
 {url:'https://example.com/b',status:'INDEXED',verdict:'PASS',coverageState:'Submitted and indexed',lastCheckAt:'2026-11-11T02:00:00Z'},
 {url:'https://example.com/c',status:'NOT_INDEXED',coverageState:'Soft 404',lastCheckAt:'2026-11-11T02:00:00Z'}
 ]}]};
test('pending is unknown, NOT incorrectly counted as not indexed',()=>{
 const x=buildIndexingMonitor(base);
 assert.deepEqual(x.counts,{tracked:5,indexed:1,notIndexed:2,pending:2,errors:0});
 assert.equal(x.sites[0].reasons.find(r=>r.label==='Soft 404').count,1);
 assert.match(x.sites[0].reasons[0].action,/Review|Check/);
});
test('newer Google inspection can flip an exclusion to indexed and add a page',()=>{
 const r={capturedAt:'2026-11-14T06:00:00Z',sites:[{
  id:'example',totalPages:6,advanced:2,sweepCompletedAt:'2026-11-14T05:40:00Z',
  inspectedUrls:[
   {url:'https://example.com/a',status:'INDEXED',verdict:'PASS',checkedAt:'2026-11-14T05:39:00Z',coverageState:'Submitted and indexed'},
   {url:'https://example.com/d',status:'NOT_INDEXED',checkedAt:'2026-11-14T05:39:00Z',coverageState:'Discovered - currently not indexed'}
  ]
 }]};
 const x=buildIndexingMonitor(base,r);
 assert.deepEqual(x.counts,{tracked:6,indexed:2,notIndexed:2,pending:2,errors:0});
 assert.equal(x.lastSuccessfulRefreshAt,'2026-11-14T05:40:00Z');
 assert.equal(x.sites[0].reasons.some(v=>v.label==='Crawled - currently not indexed'),false);
});
test('older record and transient backend error cannot erase a newer valid inspection',()=>{
 const r={capturedAt:'2026-11-17T05:00:00Z',sites:[{
  id:'example',error:'Backend transient error',totalPages:5,
  inspectedUrls:[
   {url:'https://example.com/b',status:'NOT_INDEXED',checkedAt:'2026-10-01T02:00:00Z',coverageState:'Soft 404'},
   {url:'https://example.com/c',status:'ERROR',checkedAt:'2026-11-17T04:59:00Z'}
  ]
 }]};
 const x=buildIndexingMonitor(base,r);
 assert.deepEqual(x.counts,{tracked:5,indexed:1,notIndexed:2,pending:2,errors:0});
 assert.match(x.sites[0].nativeSourceError,/transient/);
 assert.equal(x.lastSuccessfulRefreshAt,null);
});
