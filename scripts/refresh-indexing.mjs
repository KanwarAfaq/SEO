// Refresh saved Google URL Inspection results through the existing protected SEO API.
// GSC Wizard tracker snapshot is the seed; this job never treats uninspected URLs as excluded.
import {mkdir,readFile,writeFile,appendFile} from 'node:fs/promises';
import config from '../api/_lib/config.js';
import core from '../api/_lib/indexing-monitor.js';
const {buildIndexingMonitor}=core;
const dry=process.argv.includes('--dry-run')||process.env.SEO_THREE_DAY_DRY_RUN==='true';
const base=(process.env.SEO_DASHBOARD_BASE||'https://seo-kmafaq.vercel.app').replace(/\/$/,'');
const batch=10,rounds=4;
const baseline=JSON.parse(await readFile('data/indexing-baseline.json','utf8'));
let prior={sites:[]};
try{prior=JSON.parse(await readFile('data/indexing-refresh.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const configSites=config.getSites();
const now=new Date().toISOString();
const request=async(path,body)=>{
 const headers={'accept':'application/json','cache-control':'no-cache','user-agent':'SEO-Indexing-ThreeDay/1.0'};
 if(process.env.ADMIN_ACTION_KEY)headers['x-admin-key']=process.env.ADMIN_ACTION_KEY;
 if(process.env.SEO_STORAGE_SECRET)headers['x-seo-storage-secret']=process.env.SEO_STORAGE_SECRET;
 if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers['x-vercel-protection-bypass']=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
 if(body)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 const raw=await r.text();let value;
 try{value=JSON.parse(raw)}catch{throw Error('Non-JSON SEO API HTTP '+r.status+' '+path)}
 if(!r.ok||value.error)throw Error(value.error||'HTTP '+r.status);
 return value;
};
const updates=[];
for(const b of baseline.sites){
 const site=configSites.find(s=>s.id===b.id);
 const old=(prior.sites||[]).find(s=>s.id===b.id)||{};
 const row={...old,id:b.id,domain:b.domain,advanced:0,error:null,lastAttemptAt:now};
 if(dry){row.note='Dry run: no Google inspection queries were performed';updates.push(row);continue}
 if(!site){row.error='Site disabled or absent in SEO config';updates.push(row);continue}
 if(!process.env.ADMIN_ACTION_KEY&&!process.env.SEO_STORAGE_SECRET){row.error='Missing ADMIN_ACTION_KEY or SEO_STORAGE_SECRET in GitHub Actions secrets';updates.push(row);continue}
 let advanced=0,problem=null;
 for(let i=0;i<rounds;i++){
  try{
   const result=await request('/api/index-progress',{site:b.id,batch});
   const scan=result.sites?.find(r=>r.id===b.id);
   if(!scan||scan.error)throw Error(scan?.error||'Site missing from inspection API response');
   const n=Number(scan.advanced||0);
   advanced+=n;
   if(n<batch)break;
  }catch(e){problem=e.message;break}
 }
 row.advanced=advanced;
 try{
  const result=await request('/api/index-progress?details=1&site='+encodeURIComponent(b.id)+'&limit=1500');
  const current=result.sites?.find(r=>r.id===b.id);
  if(!current||current.error)throw Error(current?.error||'Missing site details');
  const records=result.inspectedUrls||[];
  if(!Array.isArray(records))throw Error('Invalid saved inspection rows');
  if(advanced>0&&!records.length)throw Error('Inspections advanced but no saved evidence was available');
  // Keep the last successful per-URL state when the backend temporarily fails.
  const byUrl=new Map((old.inspectedUrls||[]).map(r=>[r.url,r]));
  for(const r of records)if(r.url){
   const oldRecord=byUrl.get(r.url);
   if(r.status==='ERROR'&&oldRecord&&oldRecord.status!=='ERROR')continue;
   const newAt=Date.parse(r.checkedAt||0)||0, oldAt=Date.parse(oldRecord?.checkedAt||0)||0;
   if(!oldRecord||newAt>=oldAt)byUrl.set(r.url,r);
  }
  row.inspectedUrls=[...byUrl.values()];
  row.totalPages=Number(current.totalPages||0);
  if(advanced>0)row.sweepCompletedAt=new Date().toISOString();
 }catch(e){problem=[problem,e.message].filter(Boolean).join('; ')}
 row.error=problem;
 updates.push(row);
 console.log('[indexing] '+b.domain+' newly inspected='+advanced+' saved='+Number(row.inspectedUrls?.length||0)+(row.error?' error='+row.error:''));
}
const refreshed={schemaVersion:1,capturedAt:now,source:'SEO native Search Console URL Inspection API',sites:updates};
if(!dry)await writeFile('data/indexing-refresh.json',JSON.stringify(refreshed,null,2)+'\n');
const report=buildIndexingMonitor(baseline,dry?prior:refreshed);
const lines=['# Three-day Google index coverage (tracked URLs)','',
 'Generated: '+now,
 'Verified URL Inspection is not the full Google Search Console Pages report.',
 'Pending = not inspected by this tracker; it may already be indexed.',
 '',
 '| Website | Tracked | Indexed | Not indexed | Pending | Errors | New checks | Connection |',
 '|---|---:|---:|---:|---:|---:|---:|---|',
 ...report.sites.map(s=>'| '+s.domain+' | '+s.totalTracked+' | '+s.indexed+' | '+s.notIndexed+' | '+s.pending+' | '+s.errors+' | '+s.nativeAdvanced+' | '+(s.nativeSourceError||'OK')+' |'),
 '',
 ...report.sites.flatMap(s=>['## '+s.domain,...s.reasons.map(r=>'- '+r.label+': '+r.count+' URL(s). Next: '+r.action),...(s.nativeSourceError?['- Source error: '+s.nativeSourceError]:[])])
];
await mkdir('reports',{recursive:true});
await writeFile('reports/three-day-indexing.json',JSON.stringify(report,null,2));
await writeFile('reports/three-day-indexing.md',lines.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
console.log('INDEXING_REPORT_READY '+JSON.stringify(report.counts));
if(report.sites.every(s=>s.nativeSourceError))console.error('ALL_GOOGLE_SOURCES_UNAVAILABLE: retained last known results; LINE review must show data gaps');
