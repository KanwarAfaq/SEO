import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildHealthAlert,buildConnectionCard}=require('../api/_lib/line-cards');
const sites=['anytool.online','scholarportal.site','kmafaq.site','kmafaq.online','worksheet.live'].map(domain=>({domain}));
test('urgent LINE alert uses a compact Flex card, not long plain text',()=>{
 const x=buildHealthAlert(['kmafaq.online: HTTP 404','worksheet.live: sitemap unreachable'],sites,'2026-11-11T11:00:00Z');
 assert.equal(x.type,'flex');
 assert.equal(x.contents.type,'bubble');
 assert.ok(x.altText.length<=400);
 assert.match(JSON.stringify(x),/2 alerts/);
 assert.match(JSON.stringify(x),/kmafaq.online/);
 assert.ok(Buffer.byteLength(JSON.stringify(x))<30000);
 assert.doesNotMatch(JSON.stringify(x),/sitemap unreachable/);
});
test('LINE connection test displays a small visual status',()=>{
 const x=buildConnectionCard('2026-11-11T11:00:00Z');
 assert.equal(x.type,'flex');
 assert.match(JSON.stringify(x),/CONNECTED/);
 assert.match(JSON.stringify(x),/5 websites monitored/);
});
