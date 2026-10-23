import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function dashboard(){
  const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const ids=['overviewHealthVisual','overviewSearchVisual','overviewIndexVisual','overviewSourcesVisual'];
  const nodes=Object.fromEntries(ids.map(id=>['#'+id,{innerHTML:''}]));
  const links=[];
  const context=vm.createContext({document:{querySelector:id=>nodes[id],querySelectorAll:()=>links}});
  vm.runInContext(source.slice(0,source.indexOf('const key='))+"\nconst by=(arr,id)=>arr.find(x=>x.id===id)||{};\nfunction view(name){globalThis.selectedView=name;}\n"+source.slice(source.indexOf('function renderOverviewVisuals(){'),source.indexOf('function renderPortfolioDetails(){')),context);
  return {nodes,links,run:code=>vm.runInContext(code,context),context};
}

test('overview visuals distinguish unavailable sources from verified zero metrics',()=>{
  const d=dashboard();d.run('renderOverviewVisuals()');
  assert.match(d.nodes['#overviewHealthVisual'].innerHTML,/5<\/b> Not checked/);
  assert.match(d.nodes['#overviewSearchVisual'].innerHTML,/Connect Search Console/);
  assert.match(d.nodes['#overviewIndexVisual'].innerHTML,/Indexing data unavailable/);
  assert.doesNotMatch(d.nodes['#overviewSourcesVisual'].innerHTML,/source-state connected/);
  d.run('state.gsc=SITES.map(s=>({id:s.id,clicks:0}));state.ga=SITES.map(s=>({id:s.id,activeUsers:0,configured:true}));renderOverviewVisuals()');
  assert.match(d.nodes['#overviewSearchVisual'].innerHTML,/<strong>0<\/strong>/);
  assert.equal((d.nodes['#overviewSourcesVisual'].innerHTML.match(/source-state connected/g)||[]).length,2);
});

test('overview charts calculate partial coverage, classify issues and wire source navigation',()=>{
  const d=dashboard();const button={dataset:{target:'search'}};d.links.push(button);
  d.run(`state.health=[{id:'worksheet',ok:true,sitemapOk:false},{id:'anytool',ok:false,sitemapOk:false}];state.gsc=[{id:'worksheet',clicks:20},{id:'anytool',clicks:10},{id:'scholarportal',clicks:999,error:'unavailable'}];state.indexProgress={portfolio:{totalPages:100,indexed:40,notIndexed:20,remaining:30,errors:10}};renderOverviewVisuals()`);
  assert.match(d.nodes['#overviewHealthVisual'].innerHTML,/--sweep:72deg/);
  assert.match(d.nodes['#overviewHealthVisual'].innerHTML,/2<\/b> Need attention/);
  assert.match(d.nodes['#overviewSearchVisual'].innerHTML,/<strong>30<\/strong>/);
  assert.match(d.nodes['#overviewSearchVisual'].innerHTML,/width:50%;/);
  assert.match(d.nodes['#overviewIndexVisual'].innerHTML,/width:40%/);
  assert.match(d.nodes['#overviewIndexVisual'].innerHTML,/Errors: 10/);
  button.onclick();assert.equal(d.context.selectedView,'search');
});
