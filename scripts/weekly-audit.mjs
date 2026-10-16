// Weekly audit consumes existing deployed APIs; no Google or GA credentials leave Vercel.
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE=(process.env.SEO_DASHBOARD_BASE||'https://seo-kmafaq.vercel.app').replace(/\/$/,'');
const SITE=process.env.SEO_SITE_ID||'anytool';
const IDS=['anytool','kmafaq-online','kmafaq-site','scholarportal'];
if(!IDS.includes(SITE))throw new Error('Unknown configured site ID');
if(!process.env.ADMIN_ACTION_KEY)throw new Error('ADMIN_ACTION_KEY required for secure referral analytics');

const headers={'user-agent':'SEO-Weekly-Audit/1.0','x-admin-key':process.env.ADMIN_ACTION_KEY};
if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers['x-vercel-protection-bypass']=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

async function call(url){
  const resp=await fetch(BASE+url,{headers,signal:AbortSignal.timeout(65000)});
  const data=await resp.json().catch(()=>null);
  if(!resp.ok||!data)throw new Error(url+' HTTP '+resp.status+': '+String(data?.error||'Bad response').slice(0,160));
  return data;
}
const [crawlR,indexR,refR]=await Promise.allSettled([
  call('/api/deep-audit?site='+SITE+'&limit=10'),
  call('/api/index-progress?site='+SITE),
  call('/api/referral-audit?site='+SITE)
]);
const report={
  site:SITE,checkedAt:new Date().toISOString(),
  source:'Live HTML crawl + Google URL Inspection history + GA4 Referral channel',
  onPage:crawlR.status==='fulfilled'?crawlR.value:{error:crawlR.reason.message},
  indexing:indexR.status==='fulfilled'?indexR.value.sites?.[0]||{error:'No site result'}:{error:indexR.reason.message},
  offPage:refR.status==='fulfilled'?refR.value.sites?.[0]||{error:'No site result'}:{error:refR.reason.message}
};
const warnings=[];
if(report.onPage.error)warnings.push('On-page crawl: '+report.onPage.error);
if(report.indexing.error)warnings.push('Indexing: '+report.indexing.error);
if(report.offPage.error)warnings.push('GA4 referral analytics: '+report.offPage.error);
if(report.offPage.configured===false)warnings.push('GA4 property is not configured');

const topFixes=(report.onPage.topFixes||[]).slice(0,5);
const reasonGroups=(report.indexing.indexingReasons||[]).slice(0,5);
const referral=report.offPage.totals||{};
const md=[
  '# Weekly SEO Audit — '+SITE,
  '',
  '**Checked:** '+report.checkedAt,
  '',
  '| Layer | Result |',
  '|---|---|',
  '| On-page (sample) | '+(report.onPage.error?'Error':report.onPage.pagesChecked+' pages, score '+report.onPage.score+'/100')+' |',
  '| Indexing (inspected sitemap sample) | '+(report.indexing.error?'Error':(report.indexing.indexed??'—')+' indexed / '+(report.indexing.checked??'—')+' inspected; '+(report.indexing.remaining??'—')+' not inspected')+' |',
  '| Off-page (GA4 referral traffic, NOT backlinks) | '+(report.offPage.error?'Error':report.offPage.configured===false?'Not configured':(referral.currentSessions??'—')+' sessions / previous '+(referral.previousSessions??'—'))+' |',
  '',
  '## Top recommended fixes',
  ...(!topFixes.length?['No on-page fixes identified in sampled pages, or crawl failed.']:topFixes.map(x=>'- **'+x.severity+'** '+x.code+': '+x.fix+' ('+x.url+')')),
  '',
  '## Most common indexing diagnoses',
  ...(!reasonGroups.length?['No non-indexed inspection diagnoses available.']:reasonGroups.map(x=>'- **'+x.label+'**: '+x.count+' pages — '+x.action)),
  '',
  '## Important caveats',
  '- Page checks are sampled and inspect fetched HTML; JavaScript-rendered pages may need browser-based validation.',
  '- Indexing status is from individual inspected URLs, not a full-site GSC Pages total.',
  '- Referral sessions are traffic, not a measurement of external backlinks.',
  '- Sitemap submission and recrawling do not guarantee indexing.',
  ...(warnings.length?['','## Data warnings',...warnings.map(x=>'- '+x)]:[])
].join('\n');
await fs.mkdir('reports',{recursive:true});
await fs.writeFile(path.join('reports',SITE+'.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join('reports',SITE+'.md'),md+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,md+'\n');
console.log(JSON.stringify({site:SITE,pagesChecked:report.onPage.pagesChecked,score:report.onPage.score,
  indexing:{checked:report.indexing.checked,indexed:report.indexing.indexed,topReasons:reasonGroups.map(x=>x.reason)},
  referrals:referral.currentSessions??null,warnings},null,2));
if(warnings.some(x=>/crawl:|indexing:|analytics:/.test(x)))process.exitCode=1;
