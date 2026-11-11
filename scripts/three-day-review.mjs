import {mkdir,writeFile,appendFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import monitorCore from '../api/_lib/indexing-monitor.js';
import {buildThreeDayVisual} from './line-three-day-visual.mjs';
import config from '../api/_lib/config.js';
import {checkSite} from './monitor-health.mjs';
const sites=config.getSites(),base=process.env.SEO_DASHBOARD_BASE||'https://seo-kmafaq.vercel.app';
const dry=process.argv.includes('--dry-run')||process.env.SEO_THREE_DAY_DRY_RUN==='true';
async function api(path){
 const headers={'user-agent':'SEO-ThreeDay/1.0'};
 if(process.env.ADMIN_ACTION_KEY)headers['x-admin-key']=process.env.ADMIN_ACTION_KEY;
 if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers['x-vercel-protection-bypass']=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
 const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(35000)});
 const raw=await r.text();let data;
 try{data=JSON.parse(raw)}catch{throw Error(path+': non-JSON HTTP '+r.status)}
 if(!r.ok||data.error)throw Error(data.error||'HTTP '+r.status);
 return data;
}
const baseline=JSON.parse(await readFile('data/indexing-baseline.json','utf8'));
let refreshed={};
try{refreshed=JSON.parse(await readFile('data/indexing-refresh.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const indexMonitor=monitorCore.buildIndexingMonitor(baseline,refreshed);
const health=await Promise.all(sites.map(s=>checkSite(s)));
const sources={};const gaps=[];
for(const [name,url] of Object.entries({gsc:'/api/gsc-overview'})){
 try{sources[name]=await api(url)}catch(e){gaps.push(name+': '+e.message);sources[name]={sites:[]}}
}
sources.indexing={sites:indexMonitor.sites.map(s=>({
 id:s.id,domain:s.domain,totalPages:s.totalTracked,indexed:s.indexed,notIndexed:s.notIndexed,
 remaining:s.pending,errors:s.errors,lastUpdated:s.lastNativeSweepAt||s.baselineCapturedAt,
 indexingReasons:s.reasons.map(r=>({label:r.label,count:r.count,action:r.action})),
 error:s.nativeSourceError||null
}))};
for(const row of indexMonitor.sites)if(row.nativeSourceError)gaps.push(row.domain+' URL Inspection refresh: '+row.nativeSourceError);
const rows=sites.map(s=>{
 const h=health.find(x=>x.id===s.id)||{},g=sources.gsc.sites?.find(x=>x.id===s.id),i=sources.indexing.sites?.find(x=>x.id===s.id);
 const notes=[...(h.issues||[])];
 if(g?.error)notes.push('GSC: '+g.error);
 if(i?.error)notes.push('Indexing refresh: '+i.error);
 if(i?.indexingReasons?.length)notes.push('Indexing: '+i.indexingReasons[0].label+' ('+i.indexingReasons[0].count+' inspected)');
 return {id:s.id,domain:s.domain,repository:s.repository,http:h.status||'UNKNOWN',sitemap:h.sitemap||'UNKNOWN',robots:h.robots||'UNKNOWN',
  gsc:g&&!g.error&&g.clicks!=null?{clicks:g.clicks,impressions:g.impressions,range:g.range}:null,
  inspection:i&&i.totalPages!=null?{indexed:i.indexed,notIndexed:i.notIndexed,unchecked:i.remaining,total:i.totalPages,lastUpdated:i.lastUpdated,reasons:i.indexingReasons}:null,
  notes};
});
const healthy=rows.filter(r=>r.http==='OK'&&r.sitemap==='OK'&&r.robots==='OK').length;
const checkedAt=new Date().toISOString();
const summary=['SEO THREE-DAY REVIEW · '+checkedAt.slice(0,10),'Sites healthy: '+healthy+'/'+rows.length,
...rows.map(r=>['','• '+r.domain+' — '+r.http+' / sitemap '+r.sitemap,r.gsc?'GSC 28d: '+r.gsc.clicks+' clicks / '+r.gsc.impressions+' impressions':'GSC: unavailable',r.inspection?'Tracked '+r.inspection.total+': '+r.inspection.indexed+' indexed · '+r.inspection.notIndexed+' not indexed · '+r.inspection.unchecked+' uninspected':'Index inspections: unavailable',r.inspection?.reasons?.length?'Reasons: '+r.inspection.reasons.slice(0,3).map(v=>v.label+' ('+v.count+')').join('; '):'No confirmed exclusions yet',...r.notes.slice(0,2).map(n=>'⚠ '+n.slice(0,110))].join('\n')),
...(gaps.length?['','DATA GAPS: '+gaps.map(v=>v.slice(0,100)).join('; ')]:[]),
'',base,'Unchecked URLs are unknown; indexed status is from inspected URLs only.'].join('\n').slice(0,4900);
const report={checkedAt,healthy,siteCount:rows.length,sites:rows,sourceGaps:gaps,dashboard:base,indexingSnapshotAt:indexMonitor.lastSuccessfulRefreshAt||indexMonitor.baselineAt,indexingCounts:indexMonitor.counts,note:'Inspected URLs only, not full GSC Pages coverage. Pending URLs can already be indexed.'};
const visual=buildThreeDayVisual(report,base);
const md=['# Three-day SEO report · '+checkedAt,'',summary,'','## Details','Data sources: live HTTP health, GSC 28-day Search Analytics, GSC Wizard tracker baseline and updated saved Google URL Inspections.','No indexing request or code mutation occurs in this workflow.'].join('\n');
await mkdir('reports',{recursive:true});
await writeFile('reports/three-day-review.json',JSON.stringify(report,null,2));
await writeFile('reports/three-day-review.md',md);
await writeFile('reports/three-day-line-preview.txt',summary);
await writeFile('reports/three-day-line-visual.json',JSON.stringify(visual,null,2));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,md+'\n');
console.log(JSON.stringify({healthy,total:rows.length,dataGaps:gaps.length,dryRun:dry}));
if(dry){console.log('DRY_RUN_OK (LINE not contacted)');process.exit(0)}
const token=process.env.LINE_CHANNEL_ACCESS_TOKEN,to=process.env.LINE_USER_ID;
if(!token||!to)throw Error('Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID; report saved but no message sent');
const retryKey=randomUUID();
for(let attempt=0;attempt<3;attempt++){
 try{
  const r=await fetch('https://api.line.me/v2/bot/message/push',{method:'POST',signal:AbortSignal.timeout(15000),
   headers:{authorization:'Bearer '+token,'content-type':'application/json','x-line-retry-key':retryKey},
   body:JSON.stringify({to,messages:[visual]})});
  if(r.ok||(r.status===409&&r.headers.get('x-line-accepted-request-id'))){console.log('LINE_THREE_DAY_ACCEPTED');process.exit(0)}
  if(r.status<500&&r.status!==429)throw Object.assign(Error('LINE HTTP '+r.status),{permanent:true});
  throw Error('Transient LINE HTTP '+r.status);
 }catch(e){if(e.permanent||attempt===2)throw e}
 await new Promise(resolve=>setTimeout(resolve,1500*(2**attempt)));
}
