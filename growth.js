(function(){
const $=id=>document.getElementById(id), num=x=>Number(x||0), fmt=x=>num(x).toLocaleString(), clean=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=a=>a.reduce((t,x)=>({clicks:t.clicks+num(x.clicks),impressions:t.impressions+num(x.impressions),weighted:t.weighted+num(x.position)*num(x.impressions)}),{clicks:0,impressions:0,weighted:0});
const metric=(label,value,note)=>'<div class="metric-card"><span>'+clean(label)+'</span><strong>'+clean(value)+'</strong><small>'+clean(note)+'</small></div>';
let data=null,range=28;
function render(){
if(!data)return;
const sites=data.gsc.sites||[],good=sites.filter(s=>!s.error),tot=sum(good.flatMap(s=>(s.series||[]).slice(-range))),partial=good.length!==sites.length;
$('growthMetrics').innerHTML=[
metric('Clicks',fmt(tot.clicks),range+' days · '+good.length+'/4 sites'),
metric('Impressions',fmt(tot.impressions),partial?'Partial data':tot.impressions<100?'Early signal · low sample':'Observed GSC data'),
metric('CTR',tot.impressions?(100*tot.clicks/tot.impressions).toFixed(2)+'%':'—','Clicks divided by impressions'),
metric('Position',tot.impressions?(tot.weighted/tot.impressions).toFixed(1):'—','Impression-weighted average')
].join('');
$('growthSites').innerHTML=sites.map(s=>{if(s.error)return '<tr><td>'+clean(s.id)+'</td><td colspan="5">'+clean(s.error)+'</td></tr>';
const v=sum((s.series||[]).slice(-range)),prev=sum((s.series||[]).slice(-range*2,-range));
return '<tr><td>'+clean(s.id)+'</td><td>'+fmt(v.clicks)+'</td><td>'+fmt(v.impressions)+'</td><td>'+(v.impressions?(100*v.clicks/v.impressions).toFixed(2)+'%':'—')+'</td><td>'+(prev.impressions?((v.impressions-prev.impressions)*100/prev.impressions).toFixed(1)+'%':'No baseline')+'</td><td>'+(v.impressions<30?'Small sample':'Observed')+'</td></tr>';}).join('');
const days=new Map();good.forEach(s=>(s.series||[]).slice(-range).forEach(p=>{if(p.date)days.set(p.date,(days.get(p.date)||0)+num(p.impressions))}));
const points=[...days].sort((a,b)=>a[0].localeCompare(b[0])),high=Math.max(1,...points.map(x=>x[1]));
$('growthTimeline').innerHTML=points.length?points.map(([date,value])=>'<div class="growth-bar" title="'+clean(date)+': '+fmt(value)+' impressions" style="height:'+Math.max(3,Math.round(value*100/high))+'%"></div>').join(''):'No impression history available';
const p=data.index?.portfolio;
$('growthIndex').innerHTML=p?[metric('Sitemap URLs',fmt(p.totalPages),'Discovered from live sitemaps'),metric('Verified indexed',fmt(p.indexed),'Google inspection PASS'),metric('Verified not indexed',fmt(p.notIndexed),'Checked, needs review'),metric('Unchecked',fmt(p.remaining),'Unknown indexing status')].join(''):metric('Index progress','Unavailable','See Indexing for error details');
const reasons=(data.index?.sites||[]).flatMap(site=>(site.indexingReasons||[]).slice(0,3).map(r=>({...r,domain:site.domain})));
$('growthIndexReasons').innerHTML=reasons.length?'<b>Indexing diagnoses (inspected URLs):</b> '+reasons.slice(0,6).map(r=>clean(r.domain+': '+r.label+' ('+r.count+')')).join(' · '):'No per-page exclusion reasons in inspected records yet.';
const refs=data.offpage;
$('growthReferrals').innerHTML=!refs?'<p>Enter your admin key in Settings to view source-backed referral data.</p>':(refs.sites||[]).map(s=>{
  if(s.error)return '<p>'+clean(s.domain)+': '+clean(s.error)+'</p>';
  if(!s.configured)return '<p>'+clean(s.domain)+': GA4 not configured</p>';
  const top=(s.referringSources||[]).slice(0,3).map(x=>clean(x.source)+' ('+fmt(x.currentSessions)+')').join(', ')||'None reported';
  return '<p><b>'+clean(s.domain)+'</b> · '+fmt(s.totals?.currentSessions)+' referral sessions / 28 days · '+clean(s.totals?.changePct==null?'no baseline':s.totals.changePct+'% vs prior 28 days')+'<br>Sources: '+top+'</p>';
}).join('');
const snapshots=(data.history?.snapshots||[]).filter(x=>x.source==='agent').slice(0,12);
$('growthHistory').innerHTML=snapshots.length?snapshots.map(x=>'<tr><td>'+clean(x.site_id)+'</td><td>'+clean(x.captured_at||'—')+'</td><td>'+clean(x.gsc_impressions??'—')+'</td><td>'+clean(x.gsc_clicks??'—')+'</td><td>'+clean(x.technical_score??'—')+'</td></tr>').join(''):'<tr><td colspan="5">History unavailable. Add your admin key in Settings if needed.</td></tr>';
const recommendations=[];
if(partial)recommendations.push('Restore missing Search Console property data before trusting portfolio totals.');
if(tot.impressions<100)recommendations.push('Low impressions: prioritize indexing coverage and content discovery, not CTR optimization.');
if(p?.remaining>0)recommendations.push(fmt(p.remaining)+' URLs have not been inspected. Use verified batches in Indexing.');
if(!recommendations.length)recommendations.push('Review keyword opportunities and approve suggested improvements in Actions.');
$('growthRecommendations').innerHTML=recommendations.map(v=>'<p>• '+clean(v)+'</p>').join('');
$('growthStatus').textContent=range+'-day Google Search Console · '+good.length+'/4 sites · missing data is never counted as zero';
}
async function get(url,headers){const r=await fetch(url,{headers,cache:'no-store'}),j=await r.json();if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j}
async function load(){ $('growthStatus').textContent='Loading source data…';const key=sessionStorage.getItem('seo-admin-key');
const [g,i,h,ref]=await Promise.allSettled([get('/api/gsc-overview?days=90'),get('/api/index-progress'),key?get('/api/seo-history',{'x-admin-key':key}):Promise.resolve(null),key?get('/api/referral-audit',{'x-admin-key':key}):Promise.resolve(null)]);
if(g.status==='rejected'){$('growthStatus').textContent='Search Console unavailable: '+g.reason.message;return}
data={gsc:g.value,index:i.status==='fulfilled'?i.value:null,history:h.status==='fulfilled'?h.value:null,offpage:ref.status==='fulfilled'?ref.value:{sites:[{domain:'GA4',error:ref.reason.message}]}};render();
}
window.seoGrowth={load,setRange:n=>{if(![7,28,90].includes(n))return;range=n;if(data)render();else load()}};
})();