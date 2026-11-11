// Public read-only indexing dashboard: GSC Wizard baseline + native URL Inspection refresh.
(() => {
  'use strict';
  let report=null,details=[],detailError=null;
  const el=id=>document.getElementById(id);
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v==null?'—':Number(v).toLocaleString();
  const when=value=>value?new Date(value).toLocaleString():'Unavailable';
  async function request(url){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const r=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      const json=await r.json();
      if(!r.ok)throw Error(json.error||'HTTP '+r.status);
      return json;
    }finally{clearTimeout(timeout)}
  }
  function renderCounts(){
    if(!report)return;
    const totals=report.counts;
    const summary=el('indexingMonitorSummary');
    if(summary)summary.innerHTML=[
      ['Tracked URLs',totals.tracked,'Tracked population; not the full GSC Pages report'],
      ['Verified indexed',totals.indexed,'Google URL Inspection PASS'],
      ['Verified not indexed',totals.notIndexed,'Exact Google coverage reasons below'],
      ['Pending inspection',totals.pending,'Unknown, not assumed to be excluded'],
      ['Inspection errors',totals.errors,'No valid index verdict yet']
    ].map(([label,value,hint])=>'<div class="metric-card"><span>'+escape(label)+'</span><strong>'+num(value)+'</strong><small>'+escape(hint)+'</small></div>').join('');
    const timestamp=el('indexingMonitorTimestamp');
    if(timestamp)timestamp.textContent='Latest verified evidence: '+when(report.lastSuccessfulRefreshAt||report.baselineAt)+
      (report.lastSuccessfulRefreshAt?' · Scheduled native Google inspection refresh':' · Baseline from GSC Wizard; scheduled refresh not yet confirmed')+
      '. Saved snapshots refresh every three days. Reloading this view does not consume Google inspection quota.';
    const table=el('indexingMonitorTable');
    if(table)table.innerHTML=report.sites.map(s=>'<tr><td class="table-domain">'+escape(s.domain)+'</td><td>'+num(s.totalTracked)+'</td>'+
     '<td><span class="tag good">'+num(s.indexed)+'</span></td>'+
     '<td><span class="tag '+(s.notIndexed?'warn':'good')+'">'+num(s.notIndexed)+'</span></td>'+
     '<td>'+num(s.pending)+'</td><td>'+num(s.errors)+'</td>'+
     '<td>'+escape(s.reasons?.length?s.reasons[0].label+' ('+s.reasons[0].count+')':'No confirmed exclusions')+'</td></tr>').join('');
    const host=el('indexingMonitorReasons');
    if(host)host.innerHTML='<h3 style="margin:20px 0 10px">Google coverage reasons & recommended fixes</h3>'+
      report.sites.map(s=>'<details style="margin:8px 0;padding:12px;border:1px solid var(--line);border-radius:12px"'+(s.notIndexed?' open':'')+'>'+
       '<summary><strong>'+escape(s.domain)+'</strong> · '+num(s.notIndexed)+' not indexed · '+num(s.pending)+' pending</summary>'+
       (s.nativeSourceError?'<p class="panel-copy">Last refresh issue: '+escape(s.nativeSourceError)+'</p>':'')+
       (s.reasons?.length?'<div class="data-table-wrap"><table><thead><tr><th>Exact Google reason</th><th>Pages</th><th>Recommended work</th><th>Example URL</th></tr></thead><tbody>'+
          s.reasons.map(r=>'<tr><td>'+escape(r.label)+'</td><td>'+num(r.count)+'</td><td>'+escape(r.action)+'</td><td>'+
          (r.examples?.[0]?'<a href="'+escape(r.examples[0])+'" target="_blank" rel="noopener noreferrer">'+escape(r.examples[0].replace(/^https?:\/\//,'').slice(0,78))+'</a>':'—')+'</td></tr>').join('')+
          '</tbody></table></div>':'<p class="panel-copy">No confirmed exclusions among inspected pages.</p>')+'</details>').join('');
  }
  function renderDaily(){
    if(!report)return;
    const table=el('dailySeoTable');
    if(!table)return;
    // Use live health and GSC clicks as-is; indexed counts come from the dated monitor snapshot.
    table.innerHTML=report.sites.map(s=>{
      const site=Array.isArray(window.seoPortfolioSites?.())?window.seoPortfolioSites().find(x=>x.id===s.id):null;
      const h=typeof state!=='undefined'?state.health.find(x=>x.id===s.id):null;
      const g=typeof state!=='undefined'?state.gsc.find(x=>x.id===s.id):null;
      const health=h&&typeof h.ok==='boolean'?(h.ok?(h.sitemapOk?'Online · sitemap OK':'Online · sitemap issue'):'HTTP issue'):'Unverified';
      const hasGsc=g&&!g.error&&g.clicks!=null;
      const ctr=hasGsc&&Number(g.impressions)>0?(Number(g.clicks)/Number(g.impressions)*100).toFixed(2)+'%':'—';
      return '<tr><td class="table-domain">'+escape(site?.domain||s.domain)+'</td><td>'+escape(health)+'</td>'+
       '<td>'+(hasGsc?num(g.clicks):'—')+'</td><td>'+(hasGsc?num(g.impressions):'—')+'</td><td>'+ctr+'</td>'+
       '<td>'+num(s.indexed)+'</td><td>'+num(s.notIndexed)+'</td><td>'+num(s.pending)+'</td>'+
       '<td>'+escape(s.reasons?.length?s.reasons[0].label+' ('+s.reasons[0].count+')':'No confirmed exclusions')+'</td></tr>';
    }).join('');
    if(el('dailySeoUpdated'))el('dailySeoUpdated').textContent=
      'Live traffic / site checks; saved Google indexing snapshot at '+when(report.lastSuccessfulRefreshAt||report.baselineAt)+
      '. The indexing review runs every three days. Pending inspection ≠ excluded.';
  }
  async function load(show=false){
    if(el('indexingMonitorTimestamp'))el('indexingMonitorTimestamp').textContent='Loading saved Google inspection snapshot…';
    try{
      report=await request('/api/indexing-monitor');
      renderCounts();renderDaily();
      if(show&&typeof toast==='function')toast('Saved Google indexing report loaded');
    }catch(error){
      if(el('indexingMonitorTimestamp'))el('indexingMonitorTimestamp').textContent='Indexing report unavailable: '+error.message;
      if(el('indexingMonitorTable'))el('indexingMonitorTable').innerHTML='<tr><td colspan="7">'+escape(error.message)+'</td></tr>';
    }
  }
  function renderDetails(){
    const filter=el('indexingDetailsFilter')?.value||'all';
    const rows=details.filter(r=>filter==='all'||r.status===filter);
    const host=el('indexingDetailsTable');if(!host)return;
    host.innerHTML=rows.length?rows.map(r=>{
      const link=r.url?.startsWith('https://')?'<a href="'+escape(r.url)+'" rel="noopener noreferrer" target="_blank">'+escape(r.url.replace(/^https?:\/\//,'').slice(0,90))+'</a>':escape(r.url||'—');
      const reason=String(r.coverageState||'Google did not provide a reason')+(r.userCanonical&&r.googleCanonical&&r.userCanonical!==r.googleCanonical?' · Canonical mismatch: '+r.googleCanonical:'');
      const label=r.status==='INDEXED'?'Indexed':r.status==='NOT_INDEXED'?'Not indexed':'Error';
      return '<tr><td class="table-domain">'+link+'</td><td><span class="tag '+(r.status==='INDEXED'?'good':'warn')+'">'+label+'</span></td>'+
       '<td>'+escape(reason)+'</td><td>'+escape(r.action||'Review live page')+'</td><td>'+escape(when(r.checkedAt))+'</td></tr>';
    }).join(''):'<tr><td colspan="5">'+escape(detailError||'No inspected URLs match this filter. Pending URLs have not been inspected.')+'</td></tr>';
  }
  async function loadDetails(){
    const site=el('indexingDetailsSite')?.value;
    if(!site)return;
    const button=el('loadIndexingDetailsBtn');
    if(button){button.disabled=true;button.textContent='Loading…'}
    try{
      const result=await request('/api/indexing-monitor?details=1&site='+encodeURIComponent(site));
      details=result.sites?.[0]?.inspectedUrls||[];detailError=null;
      if(el('indexingDetailsNote'))el('indexingDetailsNote').textContent=
        details.length+' saved verified URL inspections for '+site+'. Uninspected pages are not listed. This is not the full Search Console Pages report.';
    }catch(error){details=[];detailError=error.message}
    renderDetails();
    if(button){button.disabled=false;button.textContent='Load inspected URLs'}
  }
  const originalDaily=window.renderDailyBoard;
  if(typeof originalDaily==='function')window.renderDailyBoard=function(...args){originalDaily(...args);renderDaily()};
  const refresh=el('refreshIndexingMonitor'),detailsBtn=el('loadIndexingDetailsBtn'),filter=el('indexingDetailsFilter');
  if(refresh)refresh.onclick=()=>load(true);
  if(detailsBtn)detailsBtn.onclick=loadDetails;
  if(filter)filter.onchange=renderDetails;
  if(el('refreshDailyBoard')){
    const previous=el('refreshDailyBoard').onclick;
    el('refreshDailyBoard').onclick=async()=>{if(previous)await previous();await load(true)}
  }
  load();
})();
