const SITES=[
{id:'anytool',name:'AnyTool',domain:'anytool.online',url:'https://anytool.online',sitemap:'https://anytool.online/sitemap.xml',gscProperty:'sc-domain:anytool.online',c:'#32c9e8'},
{id:'kmafaq-online',name:'KMAFAQ Online',domain:'kmafaq.online',url:'https://kmafaq.online',sitemap:'https://kmafaq.online/sitemap.xml',gscProperty:'sc-domain:kmafaq.online',c:'#8b6cff'},
{id:'kmafaq-site',name:'KMAFAQ Site',domain:'kmafaq.site',url:'https://kmafaq.site',sitemap:'https://kmafaq.site/sitemap.xml',gscProperty:'sc-domain:kmafaq.site',c:'#35d2a0'},
{id:'scholarportal',name:'ScholarPortal',domain:'scholarportal.site',url:'https://scholarportal.site',sitemap:'https://scholarportal.site/sitemap.xml',gscProperty:'sc-domain:scholarportal.site',c:'#ff9c58'}];
const state={health:[],gsc:[],ga:[],cwv:[],pagespeed:[],history:null,config:{},loaded:{health:false,gsc:false,ga:false,crux:false},errors:{health:null,gsc:null,ga:null,crux:null},lastUpdated:null};
const $=q=>document.querySelector(q),$=q=>[...document.querySelectorAll(q)],fmt=n=>n==null?'—':Number(n).toLocaleString(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=()=>sessionStorage.getItem('seo-admin-key')||'';
function toast(msg,type='good'){const e=document.createElement('div');e.className=`toast ${type}`;e.textContent=msg;$('#toastWrap').append(e);setTimeout(()=>e.remove(),4200)}
async function api(url,opt={}){const headers={...(opt.headers||{})};if(key())headers['x-admin-key']=key();const r=await fetch(url,{...opt,headers});let d={};try{d=await r.json()}catch{d={error:await r.text()}}if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d}
function view(name){$$('.content').forEach(x=>x.classList.add('hidden'));$(`#view-${name}`)?.classList.remove('hidden');$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===name));$('#pageTitle').textContent={overview:'Overview',search:'Google Search',realtime:'Live Traffic',performance:'Core Web Vitals',indexing:'Indexing',actions:'Actions',alerts:'Alerts',integrations:'Integrations',settings:'Settings'}[name]||name;$('#sidebar').classList.remove('open');history.replaceState(null,'',`#${name}`)}
$$('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$$('[data-view-jump]').forEach(b=>b.onclick=()=>view(b.dataset.viewJump));$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
const by=(arr,id)=>arr.find(x=>x.id===id)||{};
function siteCards(){
  const H=Object.fromEntries(state.health.map(x=>[x.id,x]));
  $('#siteGrid').innerHTML=SITES.map(s=>{
    const h=H[s.id],g=by(state.gsc,s.id);
    const healthKnown=state.loaded.health&&h;
    const healthText=!healthKnown?'UNKNOWN':h.ok?'ONLINE':'ISSUE';
    const healthClass=!healthKnown?'warn':h.ok?'':'bad';
    const gscLive=g&&!g.error;
    return `<article class="site-card" style="--accent:${s.c}"><div class="site-top"><div class="site-avatar">${s.name[0]}</div><span class="health-badge ${healthClass}"><i></i>${healthText}</span></div><div class="site-name">${esc(s.name)}</div><div class="site-domain">${s.domain}</div><div class="site-bottom"><div class="tiny-metric"><b>${healthKnown&&h.latency!=null?h.latency+' ms':'—'}</b><span>response</span></div><div class="tiny-metric"><b>${gscLive?fmt(g.clicks):'—'}</b><span>GSC clicks</span></div><div class="tiny-metric"><b>${gscLive&&g.position!=null?Number(g.position).toFixed(1):'—'}</b><span>GSC position</span></div></div></article>`;
  }).join('');
}
function status(){
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
  rows.push([gscOk===SITES.length?'⌕':'!',gscOk===SITES.length?'Search Console live':'Search Console unavailable',gscOk===SITES.length?'4/4 properties loaded from Google':(state.errors.gsc||gscOk+'/4 properties loaded')]);
  const gaOk=state.ga.filter(x=>x.configured!==false&&!x.error).length;
  rows.push([gaOk===SITES.length?'◉':'!',gaOk===SITES.length?'GA4 realtime live':'GA4 realtime unavailable',gaOk===SITES.length?'4/4 properties loaded from Google':(state.errors.ga||gaOk+'/4 properties loaded')]);
  rows.push(['⚡','Safe action mode','Write actions require your admin key']);
  $('#activityList').innerHTML=rows.slice(0,5).map(r=>`<div class="activity"><span class="activity-icon">${r[0]}</span><div><b>${esc(r[1])}</b><span>${esc(r[2])}</span></div><time>live</time></div>`).join('');
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
    return `<tr><td class="table-domain">${s.domain}</td><td>${live?fmt(x.clicks):'—'}</td><td>${live?fmt(x.impressions):'—'}</td><td>${live&&x.ctr!=null?(Number(x.ctr)*100).toFixed(2)+'%':'—'}</td><td>${live&&x.position!=null?Number(x.position).toFixed(1):'—'}</td><td><span class="tag ${live?'good':'bad'}">${live?'LIVE GSC':esc(x?.error||state.errors.gsc||'Unavailable')}</span></td></tr>`;
  }).join('');
}
function ga(){
  const valid=state.ga.filter(x=>x.configured!==false&&!x.error);
  const complete=valid.length===SITES.length;
  const total=complete?valid.reduce((sum,x)=>sum+Number(x.activeUsers||0),0):null;
  $('#liveTotal').textContent=fmt(total);
  const coverage=$('#liveCoverage');if(coverage)coverage.textContent=complete?'4/4 properties · Google Analytics Realtime':valid.length+'/4 properties available';
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
    $('#actionQueue').innerHTML=persisted.slice(0,30).map(a=>`<article class="queue-card"><span class="queue-icon">⚡</span><div><h3>${esc(a.title)}</h3><p>${esc(a.rationale||a.action_type)}</p><div class="queue-meta"><span class="tag warn">${esc(a.action_type)}</span><span class="tag ${a.status==='succeeded'?'good':'warn'}">${esc(a.status)}</span></div></div><div class="queue-actions">${a.status==='suggested'?'<button class="small-btn" data-approve="'+a.id+'">Approve</button><button class="small-btn" data-reject="'+a.id+'">Reject</button>':''}</div></article>`).join('');
    $('[data-approve]').forEach(b=>b.onclick=()=>updateAction(b.dataset.approve,'approved'));
    $('[data-reject]').forEach(b=>b.onclick=()=>updateAction(b.dataset.reject,'rejected'));
    return;
  }
  const rows=[['◎','Inspect URLs','Check Google indexed state','Google'],['⇧','Submit sitemap','Resubmit when sitemap changes','GSC'],['↗','Notify IndexNow','Send changed URLs to supported engines','IndexNow'],['✦','Technical audit','Run fast metadata/robots/sitemap checks','Agent']];
  $('#actionQueue').innerHTML=rows.map((r,i)=>`<article class="queue-card"><span class="queue-icon">${r[0]}</span><div><h3>${r[1]}</h3><p>${r[2]}</p><div class="queue-meta"><span class="tag warn">${r[3]}</span><span class="tag good">${i===3?'Live':'Approval'}</span></div></div><div class="queue-actions"><button class="small-btn" data-go="${i===3?'audit':'indexing'}">Open</button></div></article>`).join('');
  $('[data-go]').forEach((b,i)=>b.onclick=()=>i===3?runAudit():view('indexing'));
}
function integrations(){const cards=[['google','G','Google Search + Analytics','GSC, inspection, GA4 realtime and Admin API','#4285f4'],['googleApiKey','C','CrUX + PageSpeed','Field data and Lighthouse diagnostics','#22d3ee'],['line','L','LINE Messaging API','Four scheduled digests each day','#06c755'],['seoStorage','S','Supabase SEO History','Snapshots, issues, actions and change tracking','#8b5cf6'],['indexNow','I','IndexNow','Notify supported search engines','#00b7c7'],['adminProtection','↯','Action Security','Protect production write actions','#f59e0b']];$('#integrationGrid').innerHTML=cards.map(c=>`<article class="integration-card"><div class="integration-logo" style="--ia:${c[4]}">${c[1]}</div><h3>${c[2]}</h3><p>${c[3]}</p><div class="integration-status ${state.config[c[0]]?'connected':''}"><i></i>${state.config[c[0]]?'Configured':'Needs setup'}</div></article>`).join('');$('#lineStatusText').textContent=state.config.line?'Credentials configured':'Waiting for credentials'}
async function loadConfig(){try{state.config=await api('/api/config-status')}catch{state.config={}}integrations()}
function cwvStatus(type,val){
  if(val==null)return ['—','warn'];
  if(type==='lcp')return [val<=2500?'Good':val<=4000?'Needs improvement':'Poor',val<=2500?'good':val<=4000?'warn':'bad'];
  if(type==='inp')return [val<=200?'Good':val<=500?'Needs improvement':'Poor',val<=200?'good':val<=500?'warn':'bad'];
  if(type==='cls')return [val<=0.1?'Good':val<=0.25?'Needs improvement':'Poor',val<=0.1?'good':val<=0.25?'warn':'bad'];
  return ['—','warn'];
}
function renderCwv(){
  const good=state.cwv.filter(x=>!x.error&&cwvStatus('lcp',Number(x.lcp?.p75))[0]==='Good'&&cwvStatus('inp',Number(x.inp?.p75))[0]==='Good'&&cwvStatus('cls',Number(x.cls?.p75))[0]==='Good').length;
  $('#cwvSummary').innerHTML=[['Origins with CrUX',state.cwv.filter(x=>!x.error).length+'/4'],['All CWV good',good+'/4'],['PageSpeed scans',state.pagespeed.filter(x=>!x.error).length+'/4'],['History storage',state.config.seoStorage?'Connected':'Needs secret']].map(x=>`<div class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>SEO performance monitoring</small></div>`).join('');
  $('#cwvTable').innerHTML=state.cwv.length?state.cwv.map(x=>{if(x.error)return `<tr><td class="table-domain">${x.domain}</td><td colspan="3">No CrUX data</td><td><span class="tag warn">${esc(x.error).slice(0,80)}</span></td></tr>`;const l=Number(x.lcp?.p75),i=Number(x.inp?.p75),cl=Number(x.cls?.p75),st=[cwvStatus('lcp',l),cwvStatus('inp',i),cwvStatus('cls',cl)];const worst=st.some(s=>s[0]==='Poor')?['Poor','bad']:st.some(s=>s[0]==='Needs improvement')?['Needs improvement','warn']:['Good','good'];return `<tr><td class="table-domain">${x.domain}</td><td>${l?Math.round(l)+' ms':'—'}</td><td>${i?Math.round(i)+' ms':'—'}</td><td>${cl?cl.toFixed(3):'—'}</td><td><span class="tag ${worst[1]}">${worst[0]}</span></td></tr>`}).join(''):'<tr><td colspan="5">CrUX data not loaded yet.</td></tr>';
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
  renderCwv();
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
  siteCards();status();activity();sitemaps();
  if(show&&!state.errors.health)toast('Live website and sitemap checks completed');
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
}
async function refresh(){await loadConfig();await Promise.all([loadHealth(),loadGsc(),loadGa(),loadCrux()]);await loadHistory();toast('Dashboard refreshed')}
function modal(html){$('#modalBody').innerHTML=html;$('#modalBackdrop').classList.remove('hidden')}
$('#modalClose').onclick=()=>$('#modalBackdrop').classList.add('hidden');$('#modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')e.target.classList.add('hidden')};
function requireKey(){if(key())return true;toast('Set ADMIN_ACTION_KEY in Settings first','bad');return false}
function options(){return SITES.map(s=>`<option value="${s.id}">${s.domain}</option>`).join('')}
function actionModal(type){if(!requireKey())return;const base=`<label>Website</label><select id="mSite">${options()}</select>`;if(type==='inspect')modal(`<h2>Inspect URL</h2>${base}<label>URL</label><input id="mUrl" placeholder="https://example.com/page"><button class="primary-btn" id="mGo">Inspect</button><div class="result-box hidden" id="mResult"></div>`);if(type==='sitemap')modal(`<h2>Submit sitemap</h2>${base}<label>Sitemap URL</label><input id="mUrl" value="${SITES[0].sitemap}"><button class="primary-btn" id="mGo">Submit</button><div class="result-box hidden" id="mResult"></div>`);if(type==='indexnow')modal(`<h2>IndexNow</h2>${base}<label>Changed URLs — one per line</label><textarea id="mUrl"></textarea><button class="primary-btn" id="mGo">Submit</button><div class="result-box hidden" id="mResult"></div>`);$('#mSite').onchange=e=>{if(type==='sitemap')$('#mUrl').value=by(SITES,e.target.value).sitemap};$('#mGo').onclick=async()=>{const s=by(SITES,$('#mSite').value),box=$('#mResult');box.classList.remove('hidden');box.textContent='Working…';try{let d;if(type==='inspect')d=await api('/api/url-inspect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({inspectionUrl:$('#mUrl').value.trim(),siteUrl:s.gscProperty})});if(type==='sitemap')d=await api('/api/gsc-submit-sitemap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({siteUrl:s.gscProperty,sitemapUrl:$('#mUrl').value.trim()})});if(type==='indexnow')d=await api('/api/indexnow-submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:s.domain,urls:$('#mUrl').value.split(/\n+/).map(x=>x.trim()).filter(Boolean)})});box.textContent=JSON.stringify(d,null,2)}catch(e){box.textContent=e.message}}}
$$('[data-action]').forEach(b=>b.onclick=()=>actionModal(b.dataset.action));
async function opportunities(){if(!state.config.google)return toast('Connect Google service account first','bad');try{const rows=(await api('/api/gsc-opportunities')).opportunities||[];$('#opportunityTable').innerHTML=rows.length?rows.slice(0,25).map(x=>`<tr><td class="table-domain">${esc(x.domain)}</td><td>${esc(x.query)}</td><td>${Number(x.position).toFixed(1)}</td><td>${fmt(x.impressions)}</td><td>${(Number(x.ctr)*100).toFixed(2)}%</td><td title="${esc(x.page)}">${esc(x.page.replace(/^https?:\/\//,'').slice(0,42))}</td></tr>`).join(''):'<tr><td colspan="6">No matching opportunities found.</td></tr>';toast(`Found ${rows.length} opportunities`)}catch(e){toast(e.message,'bad')}}
async function runAudit(){const b=$('#runAuditBtn'),old=b.innerHTML;b.innerHTML='↻ Auditing';b.disabled=true;try{const d=await api('/api/technical-audit'),rows=(d.sites||[]).map(s=>`<div class="audit-row"><div class="score-orb" style="--score:${s.score}"><b>${s.score}</b></div><div><strong>${s.domain}</strong><small>${s.latency||'—'} ms · ${s.issues?.length||0} issue(s)</small><p>${s.issues?.slice(0,4).map(i=>`• ${esc(i.message)}`).join('<br>')||'✓ No basic technical issues detected'}</p></div></div>`).join('');modal(`<h2>Technical SEO audit</h2><p>Homepage, metadata, robots.txt and sitemap checks.</p>${rows}`);toast('Technical audit completed')}catch(e){toast(e.message,'bad')}finally{b.innerHTML=old;b.disabled=false}}
$('#refreshBtn').onclick=refresh;$('#refreshCruxBtn').onclick=()=>loadCrux(true);$('#runPagespeedBtn').onclick=loadPageSpeed;$('#historyCruxBtn').onclick=showCruxHistory;$('#discoverAnalyticsBtn').onclick=discoverAnalytics;$('#runAgentBtn').onclick=runAgent;$('#checkSitesBtn').onclick=()=>loadHealth(true);$('#sitemapRefreshBtn').onclick=()=>loadHealth(true);$('#refreshGscBtn').onclick=()=>loadGsc(true);$('#refreshGaBtn').onclick=()=>loadGa(true);$('#runAuditBtn').onclick=runAudit;$('#findOpportunitiesBtn').onclick=opportunities;
$('#saveAdminKey').onclick=()=>{const v=$('#adminKey').value.trim();if(!v)return toast('Enter ADMIN_ACTION_KEY','bad');sessionStorage.setItem('seo-admin-key',v);$('#adminKey').value='';toast('Admin key loaded for this session')};$('#clearAdminKey').onclick=()=>{sessionStorage.removeItem('seo-admin-key');toast('Admin key cleared')};$('#testLineBtn').onclick=async()=>{if(!requireKey())return;try{await api('/api/line-test',{method:'POST'});toast('Test LINE notification sent')}catch(e){toast(e.message,'bad')}};
siteCards();gsc();ga();status();activity();sitemaps();actions();chart();integrations();loadConfig().then(()=>Promise.all([loadHealth(),loadGsc(),loadGa(),loadCrux()])).then(()=>loadHistory());const hash=location.hash.slice(1);if(hash&&$(`#view-${hash}`))view(hash);
