const SITES=[
{id:'worksheet',name:'Worksheet',domain:'worksheet.live',url:'https://worksheet.live',sitemap:'https://worksheet.live/sitemap.xml',gscProperty:'sc-domain:worksheet.live',repo:'KanwarAfaq/worksheet',market:'Worldwide',priorityRegions:['Asia','Europe'],c:'#eab308'},
{id:'anytool',name:'AnyTool',domain:'anytool.online',url:'https://anytool.online',sitemap:'https://anytool.online/sitemap.xml',gscProperty:'sc-domain:anytool.online',repo:'KanwarAfaq/anytool-online',market:'Worldwide',priorityRegions:['Asia','Europe'],c:'#32c9e8'},
{id:'kmafaq-online',name:'KMAFAQ Online',domain:'kmafaq.online',url:'https://kmafaq.online',sitemap:'https://kmafaq.online/sitemap.xml',gscProperty:'sc-domain:kmafaq.online',repo:'KanwarAfaq/kmafaq_blog',market:'Worldwide',priorityRegions:['Asia','Europe'],c:'#8b6cff'},
{id:'kmafaq-site',name:'KMAFAQ Site',domain:'kmafaq.site',url:'https://kmafaq.site',sitemap:'https://kmafaq.site/sitemap.xml',gscProperty:'sc-domain:kmafaq.site',repo:'KanwarAfaq/kmafaq',market:'Worldwide',priorityRegions:['Asia','Europe'],c:'#35d2a0'},
{id:'scholarportal',name:'ScholarPortal',domain:'scholarportal.site',url:'https://scholarportal.site',sitemap:'https://scholarportal.site/sitemap.xml',gscProperty:'sc-domain:scholarportal.site',repo:'KanwarAfaq/global-scholar-portal',market:'Worldwide',priorityRegions:['Asia','Europe'],c:'#ff9c58'}];
const state={health:[],gsc:[],ga:[],facebook:null,cwv:[],pagespeed:[],searchIntel:null,deepAudit:null,indexCoverage:null,indexProgress:null,history:null,config:{},loaded:{health:false,gsc:false,ga:false,facebook:false,crux:false,indexProgress:false},errors:{health:null,gsc:null,ga:null,facebook:null,crux:null,indexProgress:null},lastUpdated:null};
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)],fmt=n=>n==null?'—':Number(n).toLocaleString(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=()=>sessionStorage.getItem('seo-admin-key')||'';
function fbRpm(){
  const low=Number(localStorage.getItem('fb-rpm-low'));
  const high=Number(localStorage.getItem('fb-rpm-high'));
  return Number.isFinite(low)&&Number.isFinite(high)&&low>=0&&high>=low&&high>0?{low,high}:null;
}
function money(n){return Number.isFinite(Number(n))?('$'+Number(n).toFixed(2)):'—'}
function toast(msg,type='good'){const e=document.createElement('div');e.className=`toast ${type}`;e.textContent=msg;$('#toastWrap').append(e);setTimeout(()=>e.remove(),4200)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sourceState(text,type='good'){
  const chip=$('#sourceChip'),label=$('#sourceChipText');
  if(label)label.textContent=text;
  if(chip)chip.dataset.state=type;
}
async function api(url,opt={}){
  const headers={...(opt.headers||{})};
  if(key())headers['x-admin-key']=key();
  const controller=new AbortController();
  const timeoutMs=Number(opt.timeoutMs||15000);
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const {timeoutMs:_,...fetchOpt}=opt;
    const r=await fetch(url,{...fetchOpt,headers,credentials:'same-origin',cache:'no-store',signal:fetchOpt.signal||controller.signal});
    const raw=await r.text();
    let d={};
    try{d=raw?JSON.parse(raw):{}}catch{
      const looksHtml=/^\s*<!doctype|^\s*<html/i.test(raw);
      throw new Error(looksHtml?'API session is still initializing. Retrying…':('Invalid API response · HTTP '+r.status));
    }
    if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
    return d;
  }catch(e){
    if(e?.name==='AbortError')throw new Error('API request timed out');
    throw e;
  }finally{
    clearTimeout(timer);
  }
}
function view(name){
  if(name==='growth'&&window.seoGrowth)window.seoGrowth.load();$$('.content').forEach(x=>x.classList.add('hidden'));$(`#view-${name}`)?.classList.remove('hidden');$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===name));$('#pageTitle').textContent={overview:'Overview',search:'Google Search',realtime:'Live Traffic',facebook:'Facebook',performance:'Core Web Vitals',audit:'Site Audit',indexing:'Indexing',crawl:'Crawl status',growth:'Growth Intelligence',actions:'Actions',alerts:'Alerts',integrations:'Integrations',settings:'Settings'}[name]||name;toggleNav(false);history.replaceState(null,'',`#${name}`)}
$$('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$$('[data-view-jump]').forEach(b=>b.onclick=()=>view(b.dataset.viewJump));
function toggleNav(open){
  const side=$('#sidebar'),back=$('#navBackdrop');
  side?.classList.toggle('open',open);
  back?.classList.toggle('hidden',!open);
  document.body.classList.toggle('nav-open',open);
  $('#menuBtn')?.setAttribute('aria-expanded',String(open));
}
$('#menuBtn').onclick=()=>toggleNav(!$('#sidebar').classList.contains('open'));
$('#navBackdrop').onclick=()=>toggleNav(false);
const by=(arr,id)=>arr.find(x=>x.id===id)||{};
function renderGrowthCommand(){
  const metrics=$('#growthCommandMetrics'),sites=$('#growthCommandSites');
  if(!metrics||!sites)return;
  const valid=state.gsc.filter(x=>x&&!x.error&&x.clicks!=null&&x.impressions!=null);
  const clicks=valid.reduce((sum,x)=>sum+Number(x.clicks||0),0);
  const impressions=valid.reduce((sum,x)=>sum+Number(x.impressions||0),0);
  const ctr=impressions?100*clicks/impressions:0;
  const weightedPosition=impressions?valid.reduce((sum,x)=>sum+Number(x.position||0)*Number(x.impressions||0),0)/impressions:null;
  const metricsList=[
    {symbol:'↗',label:'Organic clicks',value:valid.length?fmt(clicks):'—',info:'Search Console · 28 days',tone:'blue'},
    {symbol:'◉',label:'Search impressions',value:valid.length?fmt(impressions):'—',info:'Google Search · 28 days',tone:'purple'},
    {symbol:'%',label:'Weighted CTR',value:valid.length?ctr.toFixed(2)+'%':'—',info:'Clicks / impressions',tone:'mint'},
    {symbol:'⌕',label:'Average position',value:weightedPosition==null?'—':weightedPosition.toFixed(1),info:valid.length+'/'+SITES.length+' properties reporting',tone:'amber'}
  ];
  metrics.innerHTML=metricsList.map(m=>'<article class="command-stat '+m.tone+'"><span class="command-stat-icon" aria-hidden="true">'+m.symbol+'</span><small>'+m.label+'</small><strong>'+m.value+'</strong><span>'+m.info+'</span></article>').join('');
  const maxImpressions=Math.max(1,...valid.map(x=>Number(x.impressions||0)));
  sites.innerHTML=SITES.map(site=>{
    const item=by(state.gsc,site.id),h=by(state.health,site.id);
    const available=item&&!item.error&&item.clicks!=null&&item.impressions!=null;
    const imp=available?Number(item.impressions||0):0;
    const clk=available?Number(item.clicks||0):0;
    const rate=imp?100*clk/imp:0;
    const position=available&&item.position!=null?Number(item.position):null;
    let next='Connect Search Console or resolve property access to measure this website.';
    let type='setup';
    if(available){
      if(imp>=100&&rate<2){next='High visibility but low CTR: review top query/page titles and descriptions.';type='opportunity';}
      else if(imp>=100&&position!=null&&position>10&&position<=25){next='Near page one: improve page intent match, content usefulness and relevant links.';type='opportunity';}
      else if(imp===0){next='No measured search impressions: review discovery, sitemap and indexing diagnostics.';type='attention';}
      else{next='Review pages gaining impressions, then improve their answers and internal navigation.';type='healthy';}
    }
    if(state.loaded.health&&h&&(!h.ok||!h.sitemapOk)){next='Site or sitemap needs attention. Check the crawl monitor before content changes.';type='attention';}
    const intensity=available?Math.max(imp>0?3:0,Math.round(100*imp/maxImpressions)):0;
    return '<article class="command-site" style="--site-accent:'+site.c+'">'+
      '<div class="command-site-top"><span class="command-site-mark" aria-hidden="true">'+esc(site.name[0])+'</span>'+
      '<div><strong>'+esc(site.name)+'</strong><small>'+esc(site.domain)+'</small></div>'+
      '<a href="'+esc(site.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+esc(site.name)+' website">Visit ↗</a></div>'+
      '<div class="command-site-numbers"><div><strong>'+(available?fmt(clk):'—')+'</strong><span>Clicks</span></div>'+
      '<div><strong>'+(available?fmt(imp):'—')+'</strong><span>Impressions</span></div>'+
      '<div><strong>'+(available?rate.toFixed(2)+'%':'—')+'</strong><span>CTR</span></div></div>'+
      '<div class="command-reach-track" role="img" aria-label="'+(available?'Relative search impressions':'Search Console data unavailable')+'"><i style="width:'+intensity+'%"></i></div>'+
      '<p class="command-next '+type+'"><span aria-hidden="true">✦</span>'+esc(next)+'</p>'+
    '</article>';
  }).join('');
}
function siteCards(){
  const H=Object.fromEntries(state.health.map(x=>[x.id,x]));
  $('#siteGrid').innerHTML=SITES.map(s=>{
    const h=H[s.id],g=by(state.gsc,s.id);
    const healthKnown=state.loaded.health&&h;
    const healthText=!healthKnown?'UNKNOWN':h.ok?'ONLINE':'ISSUE';
    const healthClass=!healthKnown?'warn':h.ok?'':'bad';
    const gscLive=g&&g.clicks!=null&&!g.error;
    return `<article class="site-card" style="--accent:${s.c}"><div class="site-top"><div class="site-avatar">${s.name[0]}</div><span class="health-badge ${healthClass}"><i></i>${healthText}</span></div><div class="site-name">${esc(s.name)}</div><div class="site-domain">${s.domain}</div><div class="site-context"><span>${s.market}</span><span>${s.priorityRegions.join(' + ')}</span></div><div class="site-bottom"><div class="tiny-metric"><b>${healthKnown&&h.latency!=null?h.latency+' ms':'—'}</b><span>response</span></div><div class="tiny-metric"><b>${gscLive?fmt(g.clicks):'—'}</b><span>GSC clicks</span></div><div class="tiny-metric"><b>${gscLive&&g.position!=null?Number(g.position).toFixed(1):'—'}</b><span>GSC position</span></div></div></article>`;
  }).join('');
  renderGrowthCommand();
}
function renderOverviewVisuals(){
  const healthHost=$('#overviewHealthVisual');if(!healthHost)return;
  const health=SITES.map(s=>by(state.health,s.id));
  const known=health.filter(h=>typeof h.ok==='boolean');
  const online=known.filter(h=>h.ok).length,issues=known.filter(h=>!h.ok||!h.sitemapOk).length;
  const angle=online/SITES.length*360;
  healthHost.innerHTML=`<div class="health-visual"><div class="health-donut" style="--sweep:${angle}deg" role="img" aria-label="${online} of ${SITES.length} websites confirmed online"><div><strong>${known.length?online:'—'}<small>/ ${SITES.length}</small></strong><span>sites online</span></div></div><div class="health-key"><span><i class="visual-dot green"></i><b>${online}</b> Online</span><span><i class="visual-dot amber"></i><b>${issues}</b> Need attention</span><span><i class="visual-dot neutral"></i><b>${SITES.length-known.length}</b> Not checked</span></div></div><p class="visual-footnote">Attention includes unreachable homepages or sitemaps.</p>`;
  const valid=state.gsc.filter(g=>!g.error&&g.clicks!=null),max=Math.max(1,...valid.map(g=>Number(g.clicks))),total=valid.reduce((n,g)=>n+Number(g.clicks),0);
  $('#overviewSearchVisual').innerHTML=`<div class="visual-total"><strong>${valid.length?fmt(total):'—'}</strong><span>clicks · ${valid.length}/${SITES.length} properties reporting</span></div><div class="visual-bars">${SITES.map(site=>{const g=by(state.gsc,site.id),ok=!g.error&&g.clicks!=null;return `<div class="visual-bar-row"><span>${esc(site.name)}</span><div class="visual-bar-track"><i style="width:${ok?Math.min(100,Math.max(0,Number(g.clicks)/max*100)):0}%;background:${site.c}"></i></div><b>${ok?fmt(g.clicks):'—'}</b></div>`}).join('')}</div><p class="visual-footnote">${valid.length?'Available properties only; bar lengths compare clicks.':'Connect Search Console to see real search performance.'}</p>`;
  const portfolio=state.indexProgress?.portfolio;
  const n=v=>Math.max(0,Number(v)||0);
  const segments=portfolio?[['Indexed',n(portfolio.indexed),'green'],['Not indexed',n(portfolio.notIndexed),'amber'],['Unchecked',n(portfolio.remaining),'neutral'],['Errors',n(portfolio.errors),'red']]:[];
  const sum=segments.reduce((a,x)=>a+x[1],0);
  $('#overviewIndexVisual').innerHTML=`<div class="visual-total"><strong>${portfolio?fmt(portfolio.totalPages):'—'}</strong><span>sitemap URLs discovered</span></div><div class="visual-stack" role="img" aria-label="${portfolio?segments.map(x=>x[0]+': '+x[1]).join(', '):'Indexing data unavailable'}">${segments.map(x=>`<i class="${x[2]}" style="width:${sum?x[1]/sum*100:0}%"></i>`).join('')}</div><div class="index-key">${(segments.length?segments:[['Indexed',null,'green'],['Not indexed',null,'amber'],['Unchecked',null,'neutral'],['Errors',null,'red']]).map(x=>`<div><span><i class="visual-dot ${x[2]}"></i>${x[0]}</span><b>${fmt(x[1])}</b></div>`).join('')}</div><p class="visual-footnote">${portfolio?'Saved inspection sample, not total Google index coverage.':esc(state.errors.indexProgress||'Waiting for saved URL inspection data.')}</p>`;
  const gaValid=state.ga.filter(g=>!g.error&&g.configured!==false&&g.activeUsers!=null).length;
  const sources=[['Search Console',valid.length===SITES.length,valid.length+' / '+SITES.length+' properties','search'],['Google Analytics',gaValid===SITES.length,gaValid+' / '+SITES.length+' properties','realtime'],['Core Web Vitals',state.cwv.some(x=>!x.error&&x.lcp?.p75!=null),'Real-user field data','performance'],['Facebook',Boolean(state.facebook&&!state.errors.facebook),'Page insights','facebook']];
  $('#overviewSourcesVisual').innerHTML=sources.map(([name,ok,detail,target])=>`<button class="source-pulse" data-target="${target}"><span class="source-symbol">${name[0]}</span><span><b>${name}</b><small>${detail}</small></span><span class="source-state ${ok?'connected':''}">${ok?'Live data':'Unavailable'}</span><span aria-hidden="true">↗</span></button>`).join('');
  $$('#overviewSourcesVisual [data-target]').forEach(b=>b.onclick=()=>view(b.dataset.target));
}
function renderPortfolioDetails(){
  const host=$('#portfolioDetails');if(!host)return;
  const attentionOnly=$('#portfolioFilter')?.value==='attention';
  const rows=SITES.map(site=>{
    const h=by(state.health,site.id),g=by(state.gsc,site.id),ga=by(state.ga,site.id);
    const idx=(state.indexProgress?.sites||[]).find(x=>x.id===site.id);
    const healthKnown=state.loaded.health&&typeof h.ok==='boolean';
    const gscKnown=!g.error&&g.clicks!=null;
    const gaKnown=!ga.error&&ga.configured!==false&&ga.activeUsers!=null;
    const indexKnown=idx&&!idx.error&&idx.totalPages!=null;
    const attention=!healthKnown||!h.ok||!h.sitemapOk||!gscKnown||!gaKnown||!indexKnown||Number(idx?.notIndexed)>0;
    if(attentionOnly&&!attention)return '';
    const health=healthKnown?(h.ok?'Online':'HTTP issue'):'Unavailable';
    const sitemap=healthKnown?(h.sitemapOk?'Sitemap reachable':'Sitemap issue'):'Health check pending';
    const missing='<span class="metric-unavailable">Not available</span>';
    const indexing=indexKnown?Math.min(100,Math.max(0,Number(idx.indexed||0)/Math.max(1,Number(idx.totalPages))*100)):0;
    return `<tr><th scope="row"><a class="portfolio-domain" href="${esc(site.url)}" target="_blank" rel="noopener">${esc(site.domain)} ↗</a><small class="portfolio-sub">${esc(site.name)}</small></th><td><span class="tag ${healthKnown&&h.ok&&h.sitemapOk?'good':'warn'}">${health}</span><small class="portfolio-sub">${sitemap}${healthKnown&&h.latency!=null?' · '+fmt(h.latency)+' ms':''}</small></td><td>${gscKnown?fmt(g.clicks):missing}</td><td>${gscKnown?fmt(g.impressions):missing}</td><td>${gaKnown?fmt(ga.activeUsers):missing}</td><td>${indexKnown?`<span>${fmt(idx.indexed)} / ${fmt(idx.totalPages)} URLs</span><meter class="index-meter" min="0" max="100" value="${indexing}" aria-label="${esc(site.name)} verified indexing">${indexing.toFixed(1)}%</meter><small class="portfolio-sub">${fmt(idx.notIndexed)} not indexed · ${fmt(idx.remaining)} unchecked</small>`:missing}</td></tr>`;
  }).filter(Boolean);
  host.innerHTML=rows.join('')||'<tr><td colspan="6">No websites need attention in the current results.</td></tr>';
}
$('#portfolioFilter').onchange=renderPortfolioDetails;
function status(){
  renderPortfolioDetails();
  renderOverviewVisuals();
  const healthComplete=state.loaded.health&&state.health.length===SITES.length;
  const gscValid=state.gsc.filter(x=>!x.error);
  const gaValid=state.ga.filter(x=>x.configured!==false&&!x.error);
  const online=healthComplete?state.health.filter(x=>x.ok).length:null;
  const issues=healthComplete?state.health.filter(x=>!x.ok||!x.sitemapOk).length:null;
  const users=gaValid.length===SITES.length?gaValid.reduce((sum,x)=>sum+Number(x.activeUsers||0),0):null;
  const clicks=gscValid.length===SITES.length?gscValid.reduce((sum,x)=>sum+Number(x.clicks||0),0):null;
  $('#healthySites').textContent=online==null?'—':online+' / '+SITES.length;
  $('#issueCount').textContent=issues==null?'—':issues;
  $('#activeUsers').textContent=fmt(users);
  $('#searchClicks').textContent=fmt(clicks);
  $('#chartClicks').textContent=fmt(clicks);
  $('#lastUpdated').textContent=state.lastUpdated?new Date(state.lastUpdated).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—';
}
function chart(){
  const totals=new Map();
  for(const g of state.gsc){
    if(g.error||!Array.isArray(g.series))continue;
    for(const row of g.series){
      if(!row.date)continue;
      totals.set(row.date,(totals.get(row.date)||0)+Number(row.clicks||0));
    }
  }
  const a=[...totals.entries()].sort((x,y)=>x[0].localeCompare(y[0])).map(x=>x[1]);
  if(a.length<2){
    $('#clickChart').innerHTML='<text x="400" y="118" text-anchor="middle" fill="#8b9ab8" font-size="14">Live GSC trend unavailable</text>';
    return;
  }
  const max=Math.max(...a),min=Math.min(...a),span=max-min||1;
  const pts=a.map((n,i)=>[i/(a.length-1)*800,205-(n-min)/span*165]);
  const d=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  $('#clickChart').innerHTML=`<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#5d88ff" stop-opacity=".3"/><stop offset="1" stop-color="#5d88ff" stop-opacity="0"/></linearGradient><linearGradient id="line" x1="0" x2="1"><stop stop-color="#22d3ee"/><stop offset=".55" stop-color="#5d88ff"/><stop offset="1" stop-color="#a66cff"/></linearGradient></defs><path d="${d} L800,225 L0,225Z" fill="url(#area)"/><path d="${d}" fill="none" stroke="url(#line)" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
}
function activity(){
  const rows=[];
  if(!state.loaded.health) rows.push(['…','Site health loading','Waiting for live checks']);
  else {
    const bad=state.health.filter(x=>!x.ok||!x.sitemapOk);
    rows.push(...(bad.length?bad.map(x=>['!',x.domain+' needs attention','HTTP '+(x.status||'—')+' · sitemap '+(x.sitemapStatus||'—')]):[['✓','All sites responding','Live HTTP + sitemap checks passed']]));
  }
  const gscOk=state.gsc.filter(x=>!x.error).length;
  rows.push([gscOk===SITES.length?'⌕':'!',gscOk===SITES.length?'Search Console connected':'Search Console unavailable',gscOk===SITES.length?SITES.length+'/'+SITES.length+' properties loaded from Google API':(state.errors.gsc||gscOk+'/'+SITES.length+' properties loaded')]);
  const gaOk=state.ga.filter(x=>x.configured!==false&&!x.error).length;
  rows.push([gaOk===SITES.length?'◉':'!',gaOk===SITES.length?'GA4 realtime live':'GA4 realtime unavailable',gaOk===SITES.length?SITES.length+'/'+SITES.length+' properties loaded from Google API':(state.errors.ga||gaOk+'/'+SITES.length+' properties loaded')]);
  rows.push(['⚡','Safe action mode','Write actions require your admin key']);
  $('#activityList').innerHTML=rows.slice(0,5).map(r=>`<div class="activity"><span class="activity-icon">${r[0]}</span><div><b>${esc(r[1])}</b><span>${esc(r[2])}</span></div><time>API</time></div>`).join('');
}
function gsc(){
  const valid=state.gsc.filter(x=>!x.error);
  const t=valid.reduce((acc,x)=>({c:acc.c+Number(x.clicks||0),i:acc.i+Number(x.impressions||0),p:acc.p+Number(x.position||0)*Number(x.impressions||0)}),{c:0,i:0,p:0});
  const complete=valid.length===SITES.length;
  const ctr=t.i?t.c/t.i:null,pos=t.i?t.p/t.i:null;
  const range=valid.find(x=>x.range)?.range;
  const source=valid.length?(range?`${range.start} → ${range.end} · Google Search Console`:'Google Search Console'):(state.errors.gsc||'Waiting for Google Search Console');
  $('#gscMetrics').innerHTML=[['Clicks',complete?fmt(t.c):'—'],['Impressions',complete?fmt(t.i):'—'],['CTR',complete&&ctr!=null?(ctr*100).toFixed(2)+'%':'—'],['Avg. position',complete&&pos!=null?pos.toFixed(1):'—']].map(x=>`<div class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${esc(source)}</small></div>`).join('');
  $('#gscTable').innerHTML=SITES.map(s=>{
    const x=by(state.gsc,s.id);
    const live=x&&!x.error;
    return `<tr><td class="table-domain">${s.domain}</td><td>${live?fmt(x.clicks):'—'}</td><td>${live?fmt(x.impressions):'—'}</td><td>${live&&x.ctr!=null?(Number(x.ctr)*100).toFixed(2)+'%':'—'}</td><td>${live&&x.position!=null?Number(x.position).toFixed(1):'—'}</td><td><span class="tag ${live?'good':'bad'}">${live?'GSC API':esc(x?.error||state.errors.gsc||'Unavailable')}</span></td></tr>`;
  }).join('');
}
function ga(){
  const valid=state.ga.filter(x=>x.configured!==false&&!x.error);
  const complete=valid.length===SITES.length;
  const total=complete?valid.reduce((sum,x)=>sum+Number(x.activeUsers||0),0):null;
  $('#liveTotal').textContent=fmt(total);
  const coverage=$('#liveCoverage');if(coverage)coverage.textContent=complete?SITES.length+'/'+SITES.length+' properties · Google Analytics Realtime':valid.length+'/'+SITES.length+' properties available';
  if(valid.length){
    const max=Math.max(1,...valid.map(x=>Number(x.activeUsers||0)));
    $('#liveBars').innerHTML=valid.map(x=>`<i title="${esc(by(SITES,x.id).domain)}: ${Number(x.activeUsers||0)} active" style="height:${Number(x.activeUsers||0)/max*100}%"></i>`).join('');
  }else $('#liveBars').innerHTML='';
  $('#gaSiteGrid').innerHTML=SITES.map(s=>{
    const x=by(state.ga,s.id);
    const live=x&&x.configured!==false&&!x.error;
    const label=x?.configured===false?'NOT SET':live?'LIVE GA4':'API ERROR';
    return `<article class="site-card" style="--accent:${s.c}"><div class="site-top"><div class="site-avatar">${s.name[0]}</div><span class="health-badge ${live?'':'bad'}"><i></i>${label}</span></div><div class="site-name">${s.name}</div><div class="site-domain">${s.domain}</div><div class="site-bottom"><div class="tiny-metric"><b>${live?fmt(x.activeUsers):'—'}</b><span>active</span></div><div class="tiny-metric"><b>${live?fmt(x.views):'—'}</b><span>views</span></div><div class="tiny-metric"><b>${live?fmt(x.events):'—'}</b><span>events</span></div></div>${!live&&x?.error?`<div class="data-error">${esc(x.error)}</div>`:''}</article>`;
  }).join('');
}
function sitemaps(){const H=Object.fromEntries(state.health.map(x=>[x.id,x]));$('#sitemapTable').innerHTML=SITES.map(s=>{const x=H[s.id]||{};return `<tr><td class="table-domain">${s.domain}</td><td>${s.sitemap}</td><td>${x.sitemapStatus||'—'}</td><td>${x.urlCount??'—'}</td><td><span class="tag ${x.sitemapOk?'good':state.health.length?'bad':'warn'}">${x.sitemapOk?'Healthy':state.health.length?'Issue':'Not checked'}</span></td></tr>`}).join('')}
function actions(){
  const persisted=state.history?.actions||[];
  if(persisted.length){
    $('#actionQueue').innerHTML=persisted.slice(0,30).map(a=>`<article class="queue-card"><span class="queue-icon">⚡</span><div><h3>${esc(a.title)}</h3><p>${esc(a.rationale||a.action_type)}</p><div class="queue-meta"><span class="tag warn">${esc(a.action_type)}</span><span class="tag ${a.status==='succeeded'?'good':'warn'}">${esc(a.status)}</span>${(()=>{const s=by(SITES,a.site_id);return s.repo?'<span class="tag">'+esc(s.repo.replace('KanwarAfaq/',''))+'</span>':''})()}</div></div><div class="queue-actions">${a.status==='suggested'?'<button class="small-btn" data-approve="'+a.id+'">Approve</button><button class="small-btn" data-reject="'+a.id+'">Reject</button>':''}</div></article>`).join('');
    $$('[data-approve]').forEach(b=>b.onclick=()=>updateAction(b.dataset.approve,'approved'));
    $$('[data-reject]').forEach(b=>b.onclick=()=>updateAction(b.dataset.reject,'rejected'));
    return;
  }
  const rows=[['◎','Inspect URLs','Check Google indexed state','Google'],['⇧','Submit sitemap','Resubmit when sitemap changes','GSC'],['↗','Notify IndexNow','Send changed URLs to supported engines','IndexNow'],['✦','Technical audit','Run fast metadata/robots/sitemap checks','Agent']];
  $('#actionQueue').innerHTML=rows.map((r,i)=>`<article class="queue-card"><span class="queue-icon">${r[0]}</span><div><h3>${r[1]}</h3><p>${r[2]}</p><div class="queue-meta"><span class="tag warn">${r[3]}</span><span class="tag good">${i===3?'Live':'Approval'}</span></div></div><div class="queue-actions"><button class="small-btn" data-go="${i===3?'audit':'indexing'}">Open</button></div></article>`).join('');
  $$('[data-go]').forEach((b,i)=>b.onclick=()=>i===3?runAudit():view('indexing'));
}
function integrations(){const cards=[['google','G','Google Search + Analytics','GSC, inspection, GA4 realtime and Admin API','#4285f4'],['googleApiKey','C','CrUX + PageSpeed','Field data and Lighthouse diagnostics','#22d3ee'],['facebook','f','Facebook Page','DailyFunUpdates insights and post engagement','#1877f2'],['line','L','LINE Messaging API','Four scheduled digests each day','#06c755'],['seoStorage','S','Supabase SEO History','Snapshots, issues, actions and change tracking','#8b5cf6'],['indexNow','I','IndexNow','Notify supported search engines','#00b7c7'],['adminProtection','↯','Action Security','Protect production write actions','#f59e0b']];$('#integrationGrid').innerHTML=cards.map(c=>`<article class="integration-card"><div class="integration-logo" style="--ia:${c[4]}">${c[1]}</div><h3>${c[2]}</h3><p>${c[3]}</p><div class="integration-status ${state.config[c[0]]?'connected':''}"><i></i>${state.config[c[0]]?'Configured':'Needs setup'}</div></article>`).join('');$('#lineStatusText').textContent=state.config.line?'Credentials configured':'Waiting for credentials'}
async function loadConfig(){
  try{
    state.config=await api('/api/config-status');
    if (Array.isArray(state.config.sites)) {
      const configured=state.config.sites.map(s=>({...by(SITES,s.id),...s,repo:s.repository,c:by(SITES,s.id).c||'#245bdb',market:'Worldwide',priorityRegions:['Asia','Europe']}));
      SITES.splice(0,SITES.length,...configured);
    }
    state.errors.config=null;
    integrations();
    return true;
  }catch(e){
    state.config={};
    state.errors.config=e.message;
    integrations();
    return false;
  }
}

function fbMetricMeta(name){
  const map={
    page_media_view:['Content views','28-day total'],
    page_total_media_view_unique:['Unique media viewers','28-day total'],
    page_post_engagements:['Post engagements','28-day total'],
    page_views_total:['Page views','28-day total'],
    page_daily_follows:['New follows','28-day total'],
    page_follows:['Followers','Meta Page Insights'],
    page_engaged_users:['Engaged users','Latest available day'],
    page_impressions:['Legacy impressions','28-day fallback'],
    page_impressions_unique:['Legacy reach','Latest available day']
  };
  return map[name]||[name.replace(/^page_/,'').replaceAll('_',' '),'Meta Page Insights'];
}
function fbMetricValue(name,m){
  if(!m)return null;
  return ['page_impressions_unique','page_engaged_users'].includes(name)?m.latest:m.sum;
}
function sparkline(points=[]){
  const vals=points.map(p=>Number(p.value)).filter(Number.isFinite);
  if(vals.length<2)return '';
  const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
  const pts=vals.map((v,i)=>((i/(vals.length-1))*100).toFixed(1)+','+(30-((v-min)/span)*26).toFixed(1)).join(' ');
  return `<svg class="mini-spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}
function facebook(){
  const d=state.facebook;
  const page=d?.page||{};
  const summary=d?.summary||{};
  const live=Boolean(d&&!state.errors.facebook);

  $('#fbPageName').textContent=live?(page.name||'Facebook Page'):'Facebook unavailable';
  $('#fbPageMeta').textContent=live
    ? ('Meta Graph API · '+(d.range?.since||'—')+' → '+(d.range?.until||'—'))
    : (state.errors.facebook||'Waiting for Meta Graph API');

  const img=$('#fbPageImage');
  if(img){
    if(live&&page.picture){img.src=page.picture;img.classList.remove('hidden')}
    else{img.removeAttribute('src');img.classList.add('hidden')}
  }

  const link=$('#fbPageLink');
  if(link){
    link.href=page.link||'https://www.facebook.com/DailyFunUpdates';
    link.textContent=live?'Open Page ↗':'Facebook Page ↗';
  }

  const tokenText=!live?'Unavailable':d.token?.checked
    ?(d.token.valid?'Token valid':'Token check failed')
    :'Connected';
  $('#fbTokenStatus').textContent=tokenText;
  $('#fbTokenStatus').className='tag '+(live&&d.token?.valid!==false?'good':'bad');

  const rpm=fbRpm();
  const usingPageViews=summary.views28d!=null;
  const usingRecentViews=!usingPageViews&&Number(summary.recentPostViewsKnownCount||0)>0;
  const effectiveViews=usingPageViews?summary.views28d:usingRecentViews?summary.recentPostViews:null;
  const estimate=live&&effectiveViews!=null&&rpm
    ? {low:Number(effectiveViews)/1000*rpm.low,high:Number(effectiveViews)/1000*rpm.high}
    : null;
  const engagementValue=summary.engagements28d!=null?summary.engagements28d:summary.recentEngagement;
  const engagementSub=summary.engagements28d!=null?'Meta · 28-day total':'Recent '+(summary.recentPostCount||0)+' posts';
  const viewLabel=usingPageViews?'Views · 28d':'Recent content views';
  const viewsSub=usingPageViews
    ? (summary.viewsMetric==='page_media_view'?'Meta content views · 28d':summary.viewsMetric==='page_views_total'?'Meta page views · 28d':'Meta fallback metric · 28d')
    : usingRecentViews
      ? (summary.recentPostViewsKnownCount+'/'+summary.recentPostCount+' recent posts · lifetime')
      : 'Unavailable from Meta';
  const earningsText=estimate?money(estimate.low)+'–'+money(estimate.high):(rpm?'Waiting for Meta views':'Set RPM');
  const earningsSub=estimate
    ? ('Model only · '+(usingPageViews?'28-day views':'recent content views')+' · $'+rpm.low.toFixed(2)+'–$'+rpm.high.toFixed(2)+' RPM')
    : (rpm?'Needs a usable Meta views metric':'Configure RPM in Settings');

  const cards=[
    {label:'Followers',display:live?fmt(page.followers):'—',sub:'Meta Page API',spark:''},
    {label:viewLabel,display:live&&effectiveViews!=null?fmt(effectiveViews):'—',sub:viewsSub,spark:usingPageViews&&summary.viewsMetric?sparkline(d.metrics?.[summary.viewsMetric]?.points||[]):''},
    {label:'Engagement',display:live&&engagementValue!=null?fmt(engagementValue):'—',sub:engagementSub,spark:summary.engagementMetric?sparkline(d.metrics?.[summary.engagementMetric]?.points||[]):''},
    {label:'Recent post engagement',display:live?fmt(summary.recentEngagement):'—',sub:(summary.recentPostCount||0)+' recent posts',spark:''},
    {label:'New follows · 28d',display:live&&summary.follows28d!=null?fmt(summary.follows28d):'—',sub:summary.follows28d!=null?'Meta Page Insights':'Unavailable from Meta',spark:''},
    {label:'Estimated earnings',display:earningsText,sub:earningsSub,spark:'',estimate:true}
  ];
  $('#fbMetrics').innerHTML=cards.map(x=>`<div class="metric-card fb-metric ${x.estimate?'estimate-card':''}"><span>${esc(x.label)}</span><strong>${esc(x.display)}</strong><small>${esc(x.sub)}</small>${x.spark||''}</div>`).join('');

  const posts=live?(d.posts||[]):[];
  const permissionNotice=$('#fbPermissionNotice');
  if(permissionNotice){
    if(d?.postsError){
      permissionNotice.classList.remove('hidden');
      permissionNotice.innerHTML='<b>Recent posts need one more Meta permission</b><span>Add <code>pages_read_user_content</code> to show post reactions, comments and shares here.</span>';
    }else permissionNotice.classList.add('hidden');
  }
  $('#fbPosts').innerHTML=posts.length?posts.map(p=>{
    const when=p.createdTime?new Date(p.createdTime).toLocaleDateString():'—';
    const message=esc((p.message||'(No text)').replace(/\s+/g,' ').slice(0,120));
    const open=p.permalink?`<a class="social-link" href="${esc(p.permalink)}" target="_blank" rel="noopener">Open ↗</a>`:'—';
    return `<tr><td>${when}</td><td class="post-message">${message}</td><td>${p.mediaViewsKnown?fmt(p.mediaViews):'—'}</td><td>${fmt(p.reactions)}</td><td>${fmt(p.comments)}</td><td>${fmt(p.shares)}</td><td><b>${fmt(p.engagement)}</b></td><td>${open}</td></tr>`;
  }).join(''):`<tr><td colspan="8">${d?.postsError?'Post data is locked until the Meta permission above is enabled.':'No recent posts returned by Meta.'}</td></tr>`;

  const available=live?Object.keys(d.metrics||{}).filter(k=>d.metrics[k]?.available):[];
  const unavailable=live?Object.keys(d.metricErrors||{}):[];
  $('#fbMetricStatus').innerHTML=live
    ? `<span class="tag good">${available.length} live insight metrics</span>${unavailable.length?` <span class="tag warn">${unavailable.length} unavailable</span>`:''}`
    : '<span class="tag bad">Meta API unavailable</span>';
}
async function loadFacebook(show=false){
  state.loaded.facebook=true;
  if(!state.config.facebook){
    state.facebook=null;
    state.errors.facebook='Facebook API configuration not loaded yet';
    facebook();
    if(show)toast(state.errors.facebook,'bad');
    return false;
  }
  try{
    state.facebook=await api('/api/facebook-insights');
    state.errors.facebook=null;
    if(show)toast('Facebook Page data refreshed');
    facebook();
    return true;
  }catch(e){
    state.facebook=null;
    state.errors.facebook=e.message;
    if(show)toast(e.message,'bad');
    facebook();
    return false;
  }
}

function cwvStatus(type,val){
  if(val==null)return ['—','warn'];
  if(type==='lcp')return [val<=2500?'Good':val<=4000?'Needs improvement':'Poor',val<=2500?'good':val<=4000?'warn':'bad'];
  if(type==='inp')return [val<=200?'Good':val<=500?'Needs improvement':'Poor',val<=200?'good':val<=500?'warn':'bad'];
  if(type==='cls')return [val<=0.1?'Good':val<=0.25?'Needs improvement':'Poor',val<=0.1?'good':val<=0.25?'warn':'bad'];
  return ['—','warn'];
}
function renderCwv(){
  const value=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
  const valid=x=>!x.error&&[x.lcp?.p75,x.inp?.p75,x.cls?.p75].every(v=>value(v)!==null);
  const good=state.cwv.filter(x=>valid(x)&&cwvStatus('lcp',value(x.lcp.p75))[0]==='Good'&&cwvStatus('inp',value(x.inp.p75))[0]==='Good'&&cwvStatus('cls',value(x.cls.p75))[0]==='Good').length;
  $('#cwvSummary').innerHTML=[['Origins with complete field data',state.cwv.filter(valid).length+'/'+SITES.length],['All CWV good',good+'/'+SITES.length],['PageSpeed scans',state.pagespeed.filter(x=>!x.error).length+'/'+SITES.length],['History storage',state.config.seoStorage?'Configured':'Needs configuration']].map(x=>`<div class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>SEO performance monitoring</small></div>`).join('');
  $('#cwvTable').innerHTML=state.cwv.length?state.cwv.map(x=>{
    if(!valid(x))return `<tr><td class="table-domain">${esc(x.domain)}</td><td colspan="3">Incomplete or unavailable field data</td><td><span class="tag warn">${esc(x.error||'Unknown')}</span></td></tr>`;
    const l=value(x.lcp.p75),i=value(x.inp.p75),cl=value(x.cls.p75),st=[cwvStatus('lcp',l),cwvStatus('inp',i),cwvStatus('cls',cl)];
    const worst=st.some(s=>s[0]==='Poor')?['Poor','bad']:st.some(s=>s[0]==='Needs improvement')?['Needs improvement','warn']:['Good','good'];
    return `<tr><td class="table-domain">${esc(x.domain)}</td><td>${Math.round(l)} ms</td><td>${Math.round(i)} ms</td><td>${cl.toFixed(3)}</td><td><span class="tag ${worst[1]}">${worst[0]}</span></td></tr>`;
  }).join(''):'<tr><td colspan="5">CrUX data not loaded yet.</td></tr>';
}
async function loadCrux(show=false){
  state.loaded.crux=true;
  try{
    const d=await api('/api/crux');
    state.cwv=d.sites||[];
    state.errors.crux=null;
    if(show)toast('CrUX field data refreshed');
  }catch(e){
    state.cwv=[];
    state.errors.crux=e.message;
    if(show)toast(e.message,'bad');
  }
  renderCwv();renderOverviewVisuals();
}
async function loadPageSpeed(){const b=$('#runPagespeedBtn'),old=b.textContent;b.textContent='Running…';b.disabled=true;try{const d=await api('/api/pagespeed');state.pagespeed=d.sites||[];$('#pagespeedTable').innerHTML=state.pagespeed.flatMap(x=>{if(x.error)return [`<tr><td class="table-domain">${x.domain}</td><td colspan="5">${esc(x.error)}</td></tr>`];return ['mobile','desktop'].map(k=>{const r=x[k]||{};return `<tr><td class="table-domain">${x.domain}</td><td>${k}</td><td>${r.performance??'—'}</td><td>${r.accessibility??'—'}</td><td>${r.bestPractices??'—'}</td><td>${r.seo??'—'}</td></tr>`})}).join('');renderCwv();toast('PageSpeed diagnostics completed')}catch(e){toast(e.message,'bad')}finally{b.textContent=old;b.disabled=false}}
async function showCruxHistory(){try{const d=await api('/api/crux?history=1');const rows=(d.sites||[]).map(x=>{const periods=x.collectionPeriods?.length||0;const last=x.collectionPeriods?.at(-1);return `<div class="audit-row"><div class="score-orb" style="--score:${Math.min(100,periods*2.5)}"><b>${periods}</b></div><div><strong>${x.domain}</strong><small>${periods} historical periods</small><p>${last?'Latest period ends '+last.lastDate.year+'-'+String(last.lastDate.month).padStart(2,'0')+'-'+String(last.lastDate.day).padStart(2,'0'):'No historical CrUX data'}</p></div></div>`}).join('');modal(`<h2>CrUX History</h2><p>Rolling 28-day field-data history for each origin.</p>${rows}`)}catch(e){toast(e.message,'bad')}}
async function discoverAnalytics(){try{const d=await api('/api/analytics-admin');$('#analyticsDiscovery').innerHTML=`<b>${d.discovered}/${d.configured} properties discovered</b><br>${(d.properties||[]).map(x=>esc(x.property)+' · '+esc(x.propertyId)).join('<br>')}`;toast('Analytics Admin discovery completed')}catch(e){toast(e.message,'bad')}}
async function loadHistory(show=false){if(!key()||!state.config.seoStorage){state.history=null;actions();return}try{state.history=await api('/api/seo-history');actions();if(show)toast('SEO history refreshed')}catch(e){show&&toast(e.message,'bad')}}
async function updateAction(id,status){if(!requireKey())return;try{await api('/api/action-update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});toast('Action '+status);await loadHistory()}catch(e){toast(e.message,'bad')}}
async function runAgent(){if(!requireKey())return;try{const d=await api('/api/agent-run',{method:'POST'});toast(`Agent found ${d.counts.issues} issues and ${d.counts.actions} actions`);await loadHistory();modal(`<h2>SEO Agent completed</h2><p>${d.counts.sites} sites analyzed · ${d.counts.issues} issues · ${d.counts.actions} proposed actions · ${d.counts.opportunities} ranking opportunities.</p><div class="result-box">${esc(JSON.stringify(d.storage,null,2))}</div>`)}catch(e){toast(e.message,'bad')}}
async function loadHealth(show=false){
  state.loaded.health=true;
  try{
    state.health=(await api('/api/sites-health')).sites||[];
    state.errors.health=null;
  }catch(e){
    state.health=[];
    state.errors.health=e.message;
    if(show)toast(e.message,'bad');
  }
  state.lastUpdated=new Date().toISOString();
  siteCards();status();activity();sitemaps();renderCrawlStatus();
  if(show&&!state.errors.health)toast('Live website and sitemap checks completed');
  return !state.errors.health&&state.health.length===SITES.length;
}
async function loadGsc(show=false){
  state.loaded.gsc=true;
  if(!state.config.google){
    state.gsc=[];
    state.errors.gsc='Google service account not configured';
    if(show)toast(state.errors.gsc,'bad');
  }else{
    try{
      const d=await api('/api/gsc-overview');
      state.gsc=d.sites||[];
      state.errors.gsc=state.gsc.some(x=>x.error)?'One or more GSC properties returned an error':null;
      if(show)toast(state.errors.gsc||'Live GSC data refreshed',state.errors.gsc?'bad':'good');
    }catch(e){
      state.gsc=[];
      state.errors.gsc=e.message;
      if(show)toast(e.message,'bad');
    }
  }
  state.lastUpdated=new Date().toISOString();
  gsc();siteCards();status();chart();activity();
  return !state.errors.gsc&&state.gsc.length===SITES.length;
}
async function loadGa(show=false){
  state.loaded.ga=true;
  if(!state.config.google){
    state.ga=[];
    state.errors.ga='Google service account not configured';
    if(show)toast(state.errors.ga,'bad');
  }else{
    try{
      state.ga=(await api('/api/ga4-realtime')).sites||[];
      state.errors.ga=state.ga.some(x=>x.error||x.configured===false)?'One or more GA4 properties are unavailable':null;
      if(show)toast(state.errors.ga||'Live GA4 realtime data refreshed',state.errors.ga?'bad':'good');
    }catch(e){
      state.ga=[];
      state.errors.ga=e.message;
      if(show)toast(e.message,'bad');
    }
  }
  state.lastUpdated=new Date().toISOString();
  ga();status();activity();
  return !state.errors.ga&&state.ga.length===SITES.length;
}
async function refresh(show=true){
  sourceState('Refreshing live sources…','loading');
  const configOk=await loadConfig();
  const results=await Promise.allSettled([loadHealth(false),loadGsc(false),loadGa(false),loadFacebook(false),loadCrux(false),loadIndexProgress(false)]);
  await loadHistory();
  const coreOk=configOk&&state.health.length===SITES.length&&state.gsc.length===SITES.length&&state.ga.length===SITES.length&&!state.errors.health&&!state.errors.gsc&&!state.errors.ga&&state.health.every(x=>x.ok&&x.sitemapOk);
  sourceState(coreOk?'Live sources connected':'Some sources unavailable',coreOk?'good':'warn');
  renderOverviewVisuals();
  if(show)toast(coreOk?'Live data refreshed':'Refresh completed with unavailable sources',coreOk?'good':'bad');
  return coreOk;
}
let bootstrapPromise=null;
async function bootstrap(){
  if(bootstrapPromise)return bootstrapPromise;
  bootstrapPromise=(async()=>{
    sourceState('Loading live sources…','loading');
    for(const delay of [0,500,1200,2500]){
      if(delay)await sleep(delay);
      const ok=await refresh(false);
      if(ok){
        sourceState('Live sources connected','good');
        return true;
      }
    }
    sourceState('Some sources unavailable','warn');
    return false;
  })();
  try{return await bootstrapPromise}
  finally{bootstrapPromise=null}
}
function modal(html){$('#modalBody').innerHTML=html;$('#modalBackdrop').classList.remove('hidden')}
$('#modalClose').onclick=()=>$('#modalBackdrop').classList.add('hidden');$('#modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')e.target.classList.add('hidden')};
function requireKey(){if(key())return true;toast('Set ADMIN_ACTION_KEY in Settings first','bad');return false}
function options(){return SITES.map(s=>`<option value="${s.id}">${s.domain}</option>`).join('')}
function actionModal(type){if(!requireKey())return;const base=`<label>Website</label><select id="mSite">${options()}</select>`;if(type==='inspect')modal(`<h2>Inspect URL</h2>${base}<label>URL</label><input id="mUrl" placeholder="https://example.com/page"><button class="primary-btn" id="mGo">Inspect</button><div class="result-box hidden" id="mResult"></div>`);if(type==='sitemap')modal(`<h2>Submit sitemap</h2>${base}<label>Sitemap URL</label><input id="mUrl" value="${SITES[0].sitemap}"><button class="primary-btn" id="mGo">Submit</button><div class="result-box hidden" id="mResult"></div>`);if(type==='indexnow')modal(`<h2>IndexNow</h2>${base}<label>Changed URLs — one per line</label><textarea id="mUrl"></textarea><button class="primary-btn" id="mGo">Submit</button><div class="result-box hidden" id="mResult"></div>`);$('#mSite').onchange=e=>{if(type==='sitemap')$('#mUrl').value=by(SITES,e.target.value).sitemap};$('#mGo').onclick=async()=>{const s=by(SITES,$('#mSite').value),box=$('#mResult');box.classList.remove('hidden');box.textContent='Working…';try{let d;if(type==='inspect')d=await api('/api/url-inspect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({inspectionUrl:$('#mUrl').value.trim(),siteUrl:s.gscProperty})});if(type==='sitemap')d=await api('/api/gsc-submit-sitemap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({siteUrl:s.gscProperty,sitemapUrl:$('#mUrl').value.trim()})});if(type==='indexnow')d=await api('/api/indexnow-submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:s.domain,urls:$('#mUrl').value.split(/\n+/).map(x=>x.trim()).filter(Boolean)})});box.textContent=JSON.stringify(d,null,2)}catch(e){box.textContent=e.message}}}
$$('[data-action]').forEach(b=>b.onclick=()=>actionModal(b.dataset.action));
function renderSearchIntel(){
  const data=state.searchIntel;
  if(!data){
    $('#searchIntelSummary').innerHTML='';
    return;
  }
  const valid=(data.sites||[]).filter(x=>!x.error);
  const rising=valid.reduce((n,x)=>n+(x.rising?.length||0),0);
  const falling=valid.reduce((n,x)=>n+(x.falling?.length||0),0);
  const cannibal=valid.reduce((n,x)=>n+(x.cannibalization?.length||0),0);
  const asia=valid.reduce((n,x)=>n+Number((x.regionSummary||[]).find(r=>r.region==='Asia')?.clicks||0),0);
  const europe=valid.reduce((n,x)=>n+Number((x.regionSummary||[]).find(r=>r.region==='Europe')?.clicks||0),0);
  $('#searchIntelSummary').innerHTML=[
    ['Rising queries',rising,'vs previous 28d'],
    ['Falling queries',falling,'needs review'],
    ['Cannibalization',cannibal,'multi-page queries'],
    ['Asia + Europe',fmt(asia+europe),'priority-region clicks']
  ].map(x=>`<div class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('');
  $('#searchIntelSites').innerHTML=(data.sites||[]).map(x=>{
    if(x.error)return `<tr><td class="table-domain">${esc(x.domain)}</td><td colspan="5"><span class="tag bad">${esc(x.error)}</span></td></tr>`;
    const asia=(x.regionSummary||[]).find(r=>r.region==='Asia')?.clicks||0;
    const europe=(x.regionSummary||[]).find(r=>r.region==='Europe')?.clicks||0;
    return `<tr><td class="table-domain">${esc(x.domain)}</td><td>${fmt(asia)}</td><td>${fmt(europe)}</td><td><span class="tag good">${x.rising?.length||0}</span></td><td><span class="tag warn">${x.falling?.length||0}</span></td><td>${x.cannibalization?.length||0}</td></tr>`;
  }).join('');
  const movers=[];
  for(const x of valid){
    for(const q of (x.rising||[]).slice(0,4)) movers.push({dir:'↑',site:x.domain,...q});
    for(const q of (x.falling||[]).slice(0,4)) movers.push({dir:'↓',site:x.domain,...q});
  }
  movers.sort((a,b)=>Math.abs(Number(b.clicksChange||0))-Math.abs(Number(a.clicksChange||0)));
  $('#searchIntelMovers').innerHTML=movers.length?movers.slice(0,20).map(x=>`<tr><td><span class="tag ${x.dir==='↑'?'good':'bad'}">${x.dir}</span></td><td class="table-domain">${esc(x.site)}</td><td>${esc(x.query)}</td><td>${fmt(x.clicks)}</td><td>${x.clicksChange==null?'—':(x.clicksChange>0?'+':'')+Number(x.clicksChange).toFixed(0)+'%'}</td><td>${Number(x.position||0).toFixed(1)}</td></tr>`).join(''):'<tr><td colspan="6">No significant movers found.</td></tr>';
}
async function runSearchIntel(){
  const b=$('#runSearchIntelBtn'),old=b.textContent;b.disabled=true;b.textContent='Analyzing…';
  try{
    state.searchIntel=await api('/api/search-intelligence',{timeoutMs:60000});
    renderSearchIntel();
    toast('Search intelligence updated');
  }catch(e){toast(e.message,'bad')}
  finally{b.disabled=false;b.textContent=old}
}
function renderDeepAudit(){
  const d=state.deepAudit;if(!d)return;
  $('#deepAuditRepo').textContent=d.site?.repository||'Repository';
  $('#deepAuditSummary').innerHTML=[
    ['Audit score',d.score,'heuristic'],
    ['Pages checked',d.pagesChecked,'live crawl'],
    ['Critical + high',Number(d.summary?.critical||0)+Number(d.summary?.high||0),'priority issues'],
    ['Broken links',d.summary?.brokenLinks??0,'checked internal links']
  ].map(x=>`<div class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('');
  $('#deepAuditIssues').innerHTML=(d.issues||[]).length?(d.issues||[]).slice(0,60).map(i=>`<tr><td><span class="tag ${i.severity==='critical'||i.severity==='high'?'bad':i.severity==='medium'?'warn':'good'}">${esc(i.severity)}</span></td><td>${esc(i.code)}</td><td title="${esc(i.url)}">${esc(String(i.url||'').replace(/^https?:\/\//,'').slice(0,48))}</td><td>${esc(i.message)}</td></tr>`).join(''):'<tr><td colspan="4">No issues detected in the crawled sample.</td></tr>';
  $('#deepAuditPages').innerHTML=(d.pages||[]).map(p=>`<tr><td>${p.status??'—'}</td><td title="${esc(p.url)}">${esc(String(p.url||'').replace(/^https?:\/\//,'').slice(0,54))}</td><td>${p.latency??'—'} ms</td><td>${esc((p.title||'—').slice(0,55))}</td><td>${p.issues?.length||0}</td></tr>`).join('')||'<tr><td colspan="5">No pages returned.</td></tr>';
}
async function runDeepAudit(){
  const b=$('#runDeepAuditBtn'),old=b.textContent,site=$('#auditSiteSelect').value;
  b.disabled=true;b.textContent='Crawling…';
  try{
    state.deepAudit=await api('/api/deep-audit?site='+encodeURIComponent(site)+'&limit=12',{timeoutMs:60000});
    renderDeepAudit();
    toast('Deep audit completed');
  }catch(e){toast(e.message,'bad')}
  finally{b.disabled=false;b.textContent=old}
}


function renderOverviewInsights(){
 renderPortfolioDetails();
 renderOverviewVisuals();
 const host=$('#overviewInsights');if(!host)return;
 const d=state.indexProgress,p=d?.portfolio;
 if(!p){host.innerHTML='<div class="insight-item"><strong>Indexing insight</strong><span>'+esc(state.errors.indexProgress||'Loading verified indexing data…')+'</span></div>';return}
 const inspected=Number(p.indexed||0)+Number(p.notIndexed||0);
 const ratio=inspected?Number(p.notIndexed||0)/inspected:null;
 const problem=ratio!==null&&ratio>.6;
 const errors=Number(p.errors||0);
 host.innerHTML='<div class="insight-item"><strong>'+(problem?'Indexing needs attention':'Indexing coverage')+'</strong><span>'+fmt(p.indexed)+' verified indexed of '+fmt(p.totalPages)+' sitemap URLs · '+fmt(p.remaining)+' unchecked. '+(problem?(ratio*100).toFixed(1)+'% of inspected URLs have not passed indexing.':'Latest saved Google inspection results.')+'</span></div><button class="ghost-btn" data-view-jump="crawl">See crawl status →</button>';
 host.querySelector('button').onclick=()=>view('crawl');
}

function renderCrawlStatus(){
 const box=$('#crawlSummary');if(!box)return;
 const d=state.indexProgress,p=d?.portfolio||{},valid=Boolean(d&&!state.errors.indexProgress);
 const total=Number(p.totalPages||0),indexed=Number(p.indexed||0),notIndexed=Number(p.notIndexed||0),unchecked=Number(p.remaining||0),errors=Number(p.errors||0);
 const items=[['Sitemap URLs',total,'Across inspected properties'],['Verified indexed',indexed,'Google inspection PASS'],['Not indexed',notIndexed,'Inspected, not PASS'],['Unchecked',unchecked,'No saved inspection verdict'],['Inspection errors',errors,'Check Google API / permissions']];
 box.innerHTML=items.map(([label,value,help])=>'<div class="metric-card"><span>'+esc(label)+'</span><strong>'+(valid?fmt(value):'—')+'</strong><small>'+esc(valid?help:(state.errors.indexProgress||'Loading Google data…'))+'</small></div>').join('');
 const bar=$('#crawlPortfolioBar');bar.innerHTML=valid&&total?'<div class="crawl-segment indexed" style="width:'+(indexed/total*100)+'%" title="Verified indexed"></div><div class="crawl-segment excluded" style="width:'+(notIndexed/total*100)+'%" title="Verified not indexed"></div><div class="crawl-segment failed" style="width:'+(errors/total*100)+'%" title="Inspection errors"></div><div class="crawl-segment unchecked" style="width:'+(unchecked/total*100)+'%" title="Unchecked"></div>':'<div class="crawl-segment unchecked" style="width:100%"></div>';
 $('#crawlExplanation').textContent=valid?fmt(indexed)+' indexed · '+fmt(notIndexed)+' not indexed · '+fmt(errors)+' inspection errors · '+fmt(unchecked)+' unchecked. Inspected fraction: '+(total?((total-unchecked)/total*100).toFixed(1):'0')+'%. Unchecked is unknown, not necessarily excluded.':'Data unavailable: '+(state.errors.indexProgress||'Waiting for inspection data');
 const H=Object.fromEntries(state.health.map(x=>[x.id,x]));
 $('#crawlTable').innerHTML=valid?(d.sites||[]).map(s=>{
 const h=H[s.id],siteStatus=!state.loaded.health?'Unknown':!h?'Unavailable':h.ok?'Online':'Issue',sitemapStatus=!state.loaded.health?'Unknown':!h?'Unavailable':h.sitemapOk?'Healthy':'Issue';
 if(s.error)return '<tr><td class="table-domain">'+esc(s.domain)+'</td><td colspan="8">'+esc(s.error)+'</td></tr>';
 return '<tr><td class="table-domain">'+esc(s.domain)+'</td><td>'+esc(siteStatus)+'</td><td>'+esc(sitemapStatus)+'</td><td>'+fmt(s.totalPages)+'</td><td>'+fmt(s.indexed)+'</td><td>'+fmt(s.notIndexed)+'</td><td>'+fmt(s.remaining)+'</td><td>'+Number(s.verifiedPercent||0).toFixed(1)+'%</td><td>'+(s.lastUpdated?new Date(s.lastUpdated).toLocaleString():'Never')+'</td></tr>';
 }).join(''):'<tr><td colspan="9">'+esc(state.errors.indexProgress||'Loading…')+'</td></tr>';
}
async function loadCrawlSample(){
 const btn=$('#crawlSampleBtn');if(!btn)return;btn.disabled=true;btn.textContent='Inspecting…';
 try{
  const d=await api('/api/index-coverage?sample=3',{timeoutMs:60000});
  const rows=(d.sites||[]).flatMap(s=>s.error?[{domain:s.domain,error:s.error}]:(s.rows||[]).map(r=>({...r,domain:s.domain})));
  $('#crawlSampleTable').innerHTML=rows.length?rows.map(r=>'<tr><td class="table-domain">'+esc(r.domain)+'</td><td title="'+esc(r.url||'')+'">'+esc((r.url||'—').replace('https://','').replace('http://','').slice(0,68))+'</td><td>'+esc(r.verdict||'—')+'</td><td>'+esc(r.coverageState||r.error||'—')+'</td><td>'+(r.lastCrawlTime?new Date(r.lastCrawlTime).toLocaleDateString():'—')+'</td><td>'+esc(r.pageFetchState||'—')+'</td></tr>').join(''):'<tr><td colspan="6">No sampled URL data returned.</td></tr>';
  toast('Google crawl sample loaded');
 }catch(e){$('#crawlSampleTable').innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>';toast(e.message,'bad')}
 finally{btn.disabled=false;btn.textContent='Inspect sample (up to 3 per site)'}
}

function renderIndexProgress(){
  const d=state.indexProgress;
  const p=d?.portfolio||{};
  const complete=Boolean(d&&!state.errors.indexProgress);
  const cards=[
    ['Total sitemap pages',complete?fmt(p.totalPages):'—','Live sitemap count'],
    ['Verified indexed',complete?fmt(p.indexed):'—','Google URL Inspection PASS'],
    ['Verified not indexed',complete?fmt(p.notIndexed):'—','Checked URLs not passing'],
    ['Remaining unchecked',complete?fmt(p.remaining):'—','Will be verified in batches'],
    ['Verification progress',complete?(Number(p.verifiedPercent||0).toFixed(1)+'%'):'—','Checked / total sitemap URLs']
  ];
  $('#indexProgressSummary').innerHTML=cards.map(x=>`<div class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('');
  renderCrawlStatus();renderOverviewInsights();
  $('#indexProgressTable').innerHTML=complete?(d.sites||[]).map(x=>{
    if(x.error)return `<tr><td class="table-domain">${esc(x.domain)}</td><td colspan="6"><span class="tag bad">${esc(x.error)}</span></td></tr>`;
    return `<tr><td class="table-domain">${esc(x.domain)}</td><td>${fmt(x.totalPages)}</td><td><span class="tag good">${fmt(x.indexed)}</span></td><td><span class="tag ${x.notIndexed?'warn':'good'}">${fmt(x.notIndexed)}</span></td><td>${fmt(x.remaining)}</td><td>${Number(x.verifiedPercent||0).toFixed(1)}%</td><td>${x.lastUpdated?new Date(x.lastUpdated).toLocaleString():'Not started'}</td></tr>`;
  }).join(''):`<tr><td colspan="7">${esc(state.errors.indexProgress||'Loading verified indexing progress…')}</td></tr>`;
}
async function loadIndexProgress(show=false){
  state.loaded.indexProgress=true;
  try{
    state.indexProgress=await api('/api/index-progress',{timeoutMs:30000});
    state.errors.indexProgress=null;
    renderIndexProgress();
    if(show)toast('Indexing progress refreshed');
    return true;
  }catch(e){
    state.indexProgress=null;
    state.errors.indexProgress=e.message;
    renderIndexProgress();
    if(show)toast(e.message,'bad');
    return false;
  }
}
async function verifyNextIndexBatch(){
  if(!requireKey())return;
  const b=$('#verifyIndexBatchBtn'),old=b.textContent,site=$('#indexProgressSite').value;
  b.disabled=true;b.textContent='Verifying…';
  try{
    const d=await api('/api/index-progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({site,batch:5}),timeoutMs:60000});
    toast('Verified '+Number(d.sites?.[0]?.advanced||0)+' new URL(s)');
    await loadIndexProgress(false);
  }catch(e){toast(e.message,'bad')}
  finally{b.disabled=false;b.textContent=old}
}

function renderIndexCoverage(){
  const d=state.indexCoverage;
  const rows=[];
  for(const site of (d?.sites||[])){
    if(site.error){rows.push(`<tr><td class="table-domain">${esc(site.domain)}</td><td colspan="4"><span class="tag bad">${esc(site.error)}</span></td></tr>`);continue}
    for(const r of (site.rows||[])){
      rows.push(`<tr><td class="table-domain">${esc(site.domain)}</td><td title="${esc(r.url)}">${esc(String(r.url||'').replace(/^https?:\/\//,'').slice(0,50))}</td><td><span class="tag ${r.verdict==='PASS'?'good':r.error?'bad':'warn'}">${esc(r.verdict||'ERROR')}</span></td><td>${esc(r.coverageState||r.error||'—')}</td><td>${r.lastCrawlTime?new Date(r.lastCrawlTime).toLocaleDateString():'—'}</td></tr>`);
    }
  }
  $('#indexCoverageTable').innerHTML=rows.length?rows.join(''):'<tr><td colspan="5">No inspection data returned.</td></tr>';
}
async function runIndexCoverage(){
  const b=$('#runIndexCoverageBtn'),old=b.textContent;b.disabled=true;b.textContent='Inspecting…';
  try{
    state.indexCoverage=await api('/api/index-coverage?sample=3',{timeoutMs:60000});
    renderIndexCoverage();
    toast('Index coverage sample completed');
  }catch(e){toast(e.message,'bad')}
  finally{b.disabled=false;b.textContent=old}
}

async function opportunities(){if(!state.config.google)return toast('Connect Google service account first','bad');try{const rows=(await api('/api/gsc-opportunities')).opportunities||[];$('#opportunityTable').innerHTML=rows.length?rows.slice(0,25).map(x=>`<tr><td class="table-domain">${esc(x.domain)}</td><td>${esc(x.query)}</td><td>${Number(x.position).toFixed(1)}</td><td>${fmt(x.impressions)}</td><td>${(Number(x.ctr)*100).toFixed(2)}%</td><td title="${esc(x.page)}">${esc(x.page.replace(/^https?:\/\//,'').slice(0,42))}</td></tr>`).join(''):'<tr><td colspan="6">No matching opportunities found.</td></tr>';toast(`Found ${rows.length} opportunities`)}catch(e){toast(e.message,'bad')}}
async function runAudit(){const b=$('#runAuditBtn'),old=b.innerHTML;b.innerHTML='↻ Auditing';b.disabled=true;try{const d=await api('/api/technical-audit'),rows=(d.sites||[]).map(s=>`<div class="audit-row"><div class="score-orb" style="--score:${s.score}"><b>${s.score}</b></div><div><strong>${s.domain}</strong><small>${s.latency||'—'} ms · ${s.issues?.length||0} issue(s)</small><p>${s.issues?.slice(0,4).map(i=>`• ${esc(i.message)}`).join('<br>')||'✓ No basic technical issues detected'}</p></div></div>`).join('');modal(`<h2>Technical SEO audit</h2><p>Homepage, metadata, robots.txt and sitemap checks.</p>${rows}`);toast('Technical audit completed')}catch(e){toast(e.message,'bad')}finally{b.innerHTML=old;b.disabled=false}}
$('#refreshCrawlBtn').onclick=async()=>{await Promise.all([loadHealth(false),loadIndexProgress(true)])};$('#crawlSampleBtn').onclick=loadCrawlSample;
$('#refreshBtn').onclick=()=>refresh(true);$('#runSearchIntelBtn').onclick=runSearchIntel;$('#runDeepAuditBtn').onclick=runDeepAudit;$('#runIndexCoverageBtn').onclick=runIndexCoverage;$('#verifyIndexBatchBtn').onclick=verifyNextIndexBatch;$('#refreshFacebookBtn').onclick=()=>loadFacebook(true);$('#refreshCruxBtn').onclick=()=>loadCrux(true);$('#runPagespeedBtn').onclick=loadPageSpeed;$('#historyCruxBtn').onclick=showCruxHistory;$('#discoverAnalyticsBtn').onclick=discoverAnalytics;$('#runAgentBtn').onclick=runAgent;$('#checkSitesBtn').onclick=()=>loadHealth(true);$('#sitemapRefreshBtn').onclick=()=>loadHealth(true);$('#refreshGscBtn').onclick=()=>loadGsc(true);$('#refreshGaBtn').onclick=()=>loadGa(true);$('#runAuditBtn').onclick=runAudit;$('#findOpportunitiesBtn').onclick=opportunities;
$('#saveAdminKey').onclick=()=>{const v=$('#adminKey').value.trim();if(!v)return toast('Enter ADMIN_ACTION_KEY','bad');sessionStorage.setItem('seo-admin-key',v);$('#adminKey').value='';toast('Admin key loaded for this session')};$('#clearAdminKey').onclick=()=>{sessionStorage.removeItem('seo-admin-key');toast('Admin key cleared')};
$('#saveFbRpm').onclick=()=>{const low=Number($('#fbRpmLow').value),high=Number($('#fbRpmHigh').value);if(!Number.isFinite(low)||!Number.isFinite(high)||low<0||high<low||high<=0)return toast('Enter a valid RPM range','bad');localStorage.setItem('fb-rpm-low',String(low));localStorage.setItem('fb-rpm-high',String(high));facebook();toast('Facebook earnings model updated')};
$('#clearFbRpm').onclick=()=>{localStorage.removeItem('fb-rpm-low');localStorage.removeItem('fb-rpm-high');$('#fbRpmLow').value='';$('#fbRpmHigh').value='';facebook();toast('Facebook earnings estimate cleared')};$('#testLineBtn').onclick=async()=>{if(!requireKey())return;try{await api('/api/line-test',{method:'POST'});toast('Test LINE notification sent')}catch(e){toast(e.message,'bad')}};
siteCards();gsc();ga();facebook();status();activity();sitemaps();actions();chart();integrations();
$('#auditSiteSelect').innerHTML=options();$('#indexProgressSite').innerHTML=options();
const storedRpm=fbRpm();if(storedRpm){$('#fbRpmLow').value=storedRpm.low;$('#fbRpmHigh').value=storedRpm.high}
renderIndexProgress();
window.seoPortfolioSites=()=>SITES.map(s=>({...s}));
const hash=location.hash.slice(1);if(hash&&$(`#view-${hash}`))view(hash);
bootstrap();
window.addEventListener('pageshow',e=>{if(e.persisted||!state.health.length||!state.gsc.length||!state.ga.length||!state.facebook)bootstrap()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(!state.health.length||!state.gsc.length||!state.ga.length||!state.facebook))bootstrap()});
