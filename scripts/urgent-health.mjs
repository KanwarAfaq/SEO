// Exception-only SEO health notifications. Quiet unless a confirmed incident
// starts, changes, or recovers. Persistent state avoids repeats across Actions.
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {getSites} from '../api/_lib/config.js';
import {checkSite} from './monitor-health.mjs';
const require=createRequire(import.meta.url);
const {buildHealthAlert}=require('../api/_lib/line-cards.js');
const sites=getSites();
const stateFile='data/urgent-health-state.json';
const dry=process.env.SEO_ALERT_DRY_RUN==='true'||process.argv.includes('--dry-run');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function failures(rows){
 const issues=[];
 for(const row of rows){
  if(row.status!=='OK')issues.push(row.domain+': homepage '+row.status);
  if(row.sitemap!=='OK')issues.push(row.domain+': sitemap unavailable');
  if(row.robots!=='OK')issues.push(row.domain+': robots configuration '+row.robots);
  if((row.issues||[]).some(x=>x.startsWith('CRITICAL: homepage blocks indexing')))issues.push(row.domain+': critical noindex');
 }
 return [...new Set(issues)].sort();
}
let old={issues:[]};try{old=JSON.parse(await readFile(stateFile,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const first=await Promise.all(sites.map(s=>checkSite(s)));
await delay(2500);
const second=await Promise.all(sites.map(s=>checkSite(s)));
const a=new Set(failures(first)),b=new Set(failures(second));
const confirmed=[...b].filter(x=>a.has(x)).sort();
const previous=(old.issues||[]).slice().sort();
const changed=JSON.stringify(confirmed)!==JSON.stringify(previous);
const now=new Date().toISOString();
const report={checkedAt:now,confirmed,previous,changed,probeCount:2,sites:second.map(x=>({domain:x.domain,status:x.status,sitemap:x.sitemap,robots:x.robots}))};
await mkdir('reports',{recursive:true});
await writeFile('reports/urgent-health.json',JSON.stringify(report,null,2));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,
 '# SEO urgent health\n\n'+(changed?'State changed. ':'No change. ')+confirmed.length+' confirmed incidents.\n');
console.log(JSON.stringify({changed,confirmed:confirmed.length,previous:previous.length,dry}));
if(dry){console.log('URGENT_HEALTH_DRY_RUN_OK');process.exit(0)}
if(!changed){console.log('URGENT_HEALTH_QUIET');process.exit(0)}
const token=process.env.LINE_CHANNEL_ACCESS_TOKEN,to=process.env.LINE_USER_ID;
if(!token||!to)throw Error('Cannot notify status transition: LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID missing');
const payload=buildHealthAlert(confirmed,sites,now);
const retryKey=randomUUID();
let accepted=false;
for(let attempt=0;attempt<3;attempt++){
 const r=await fetch('https://api.line.me/v2/bot/message/push',{
  method:'POST',signal:AbortSignal.timeout(15000),
  headers:{authorization:'Bearer '+token,'content-type':'application/json','x-line-retry-key':retryKey},
  body:JSON.stringify({to,messages:[payload]})
 });
 if(r.ok||(r.status===409&&r.headers.get('x-line-accepted-request-id'))){accepted=true;break}
 if(r.status!==429&&r.status<500)throw Error('LINE alert rejected: HTTP '+r.status);
 await delay(1500*(2**attempt));
}
if(!accepted)throw Error('LINE alert was not accepted; status was not recorded');
await mkdir('data',{recursive:true});
await writeFile(stateFile,JSON.stringify({issues:confirmed,lastChangedAt:now},null,2)+'\n');
console.log(confirmed.length?'URGENT_HEALTH_ALERT_ACCEPTED':'URGENT_HEALTH_RECOVERY_ACCEPTED');
