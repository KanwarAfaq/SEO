import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness(){
  const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="growthCommandMetrics"/);
  assert.match(html,/id="growthCommandSites"/);
  const nodes={'#growthCommandMetrics':{innerHTML:''},'#growthCommandSites':{innerHTML:''}};
  const context=vm.createContext({document:{querySelector:id=>nodes[id],querySelectorAll:()=>[]}});
  const prefix=source.slice(0,source.indexOf('const key='));
  const block=source.slice(source.indexOf('function renderGrowthCommand(){'),source.indexOf('function siteCards(){'));
  assert.ok(block.startsWith('function renderGrowthCommand(){'));
  vm.runInContext(prefix+'\nconst by=(arr,id)=>arr.find(x=>x.id===id)||{};\n'+block,context);
  return {nodes,run:code=>vm.runInContext(code,context)};
}

test('command deck uses GSC values and weighted average position, not placeholder data',()=>{
  const h=harness();h.run('renderGrowthCommand()');
  assert.match(h.nodes['#growthCommandMetrics'].innerHTML,/Organic clicks/);
  assert.match(h.nodes['#growthCommandMetrics'].innerHTML,/—/);
  h.run("state.gsc=[{id:'worksheet',clicks:10,impressions:1000,position:12},{id:'anytool',clicks:30,impressions:1000,position:8}];renderGrowthCommand()");
  const m=h.nodes['#growthCommandMetrics'].innerHTML;
  assert.match(m,/40/);assert.match(m,/2,000/);assert.match(m,/2.00%/);assert.match(m,/10.0/);
  assert.match(h.nodes['#growthCommandSites'].innerHTML,/review top query\/page titles/);
  assert.match(h.nodes['#growthCommandSites'].innerHTML,/Search Console or resolve property access/);
});

test('zero impressions are real zero, missing sources remain unavailable and health overrides next action',()=>{
 const h=harness();
 h.run("state.gsc=[{id:'scholarportal',clicks:0,impressions:0,position:0}];state.loaded.health=true;state.health=[{id:'scholarportal',ok:false,sitemapOk:false}];renderGrowthCommand()");
 const sites=h.nodes['#growthCommandSites'].innerHTML;
 assert.match(sites,/Site or sitemap needs attention/);
 assert.match(sites,/Search Console data unavailable/);
 assert.match(sites,/>0<\/strong>/);
 assert.doesNotMatch(sites,/>NaN</);
});
