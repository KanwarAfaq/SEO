'use strict';
const ACTIONS = [
  [/soft 404|server error|not found|blocked \(4xx\)|blocked \(5xx\)/i, 'Check the live HTTP response and main-page content; fix server errors and empty article templates before recrawl.'],
  [/duplicate|canonical|alternate page/i, 'Align redirects, one self-canonical URL, and internal links. Remove noncanonical duplicates from XML sitemaps.'],
  [/crawled.*not indexed/i, 'Review near-duplicate/thin content, title intent, usefulness, factual accuracy and relevant internal links. Merge weak duplicates.'],
  [/discovered.*not indexed/i, 'Add links from crawlable hubs, include canonical 200 URLs in XML sitemaps, and check crawl capacity.'],
  [/unknown to Google/i, 'Verify the URL is live, self-canonical and internally linked; include important pages in the sitemap. Allow recrawl time.'],
  [/noindex|blocked by meta/i, 'Remove unintended robots noindex from public canonical pages.'],
  [/robots.txt/i, 'Review disallow rules for public pages, then recrawl after correcting robots.txt.'],
  [/redirect/i, 'Keep only final 200 canonical URLs in sitemaps and internal links.']
];
function explanation(value) {
 const v=String(value||'No coverage reason reported');
 return ACTIONS.find(([re])=>re.test(v))?.[1]||'Inspect the page in Search Console and check fetch, canonical, robots, page quality and links.';
}
function toStatus(record) {
 if(record?.error||record?.status==='ERROR')return 'ERROR';
 if(record?.status==='INDEXED'||record?.verdict==='PASS')return 'INDEXED';
 if(record?.status==='NOT_INDEXED'||(record?.verdict&&record.verdict!=='PASS'))return 'NOT_INDEXED';
 return 'PENDING';
}
function timestamp(value) {const n=Date.parse(value||'');return Number.isFinite(n)?n:0;}
function buildIndexingMonitor(baseline,refresh={}) {
 if(!baseline||!Array.isArray(baseline.sites))throw Error('Indexing baseline unavailable');
 const output=[];
 for(const site of baseline.sites) {
  const update=(refresh.sites||[]).find(r=>r.id===site.id)||null;
  const recordMap=new Map();
  for(const r of site.inspected||[])if(r?.url&&toStatus(r)!=='PENDING')recordMap.set(r.url,{...r,checkedAt:r.checkedAt||r.lastCheckAt||baseline.capturedAt});
  for(const r of update?.inspectedUrls||[]){
   if(!r?.url)continue;
   const next={...r,checkedAt:r.checkedAt||r.lastCheckAt||null};
   const old=recordMap.get(r.url);
   if(toStatus(next)==='ERROR'&&old)continue;
   const incoming=timestamp(next.checkedAt);
   const previous=timestamp(old?.checkedAt||old?.lastCheckAt);
   if(!old||incoming>=previous)recordMap.set(r.url,next);
  }
  const counts={indexed:0,notIndexed:0,errors:0};
  const groups=new Map();
  const details=[];
  for(const [url,r] of recordMap) {
   const status=toStatus(r);
   if(status==='INDEXED')counts.indexed++;
   else if(status==='NOT_INDEXED')counts.notIndexed++;
   else if(status==='ERROR')counts.errors++;
   if(status==='NOT_INDEXED'){
    const label=String(r.coverageState||'Other / Google did not specify').slice(0,180);
    const group=groups.get(label)||{label,count:0,examples:[],action:explanation(label)};
    group.count++;
    if(group.examples.length<5)group.examples.push(url);
    groups.set(label,group);
   }
   details.push({
    url,status,coverageState:r.coverageState||null,checkedAt:r.checkedAt||r.lastCheckAt||null,
    lastCrawlTime:r.lastCrawlTime||null,googleCanonical:r.googleCanonical||null,
    userCanonical:r.userCanonical||null,inspectionResultLink:r.inspectionResultLink||null,
    action:explanation(r.coverageState)
   });
  }
  const tracked=Math.max(Number(site.trackedTotal||0),Number(update?.totalPages||0),recordMap.size);
  const pending=Math.max(0,tracked-counts.indexed-counts.notIndexed-counts.errors);
  const reasons=[...groups.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  details.sort((a,b)=>({NOT_INDEXED:0,ERROR:1,INDEXED:2}[a.status]-{NOT_INDEXED:0,ERROR:1,INDEXED:2}[b.status])||String(b.checkedAt||'').localeCompare(String(a.checkedAt||'')));
  output.push({
   id:site.id,domain:site.domain,gscProperty:site.gscProperty,totalTracked:tracked,
   indexed:counts.indexed,notIndexed:counts.notIndexed,pending,errors:counts.errors,
   reasons,inspectedUrls:details,lastNativeSweepAt:update?.sweepCompletedAt||null,
   nativeAdvanced:Number(update?.advanced||0),nativeSourceError:update?.error||null,
   baselineCapturedAt:baseline.capturedAt
  });
 }
 const totals=output.reduce((a,s)=>{a.tracked+=s.totalTracked;a.indexed+=s.indexed;a.notIndexed+=s.notIndexed;a.pending+=s.pending;a.errors+=s.errors;return a},{tracked:0,indexed:0,notIndexed:0,pending:0,errors:0});
 return {source:'Google Search Console URL Inspection: GSC Wizard baseline + SEO Control Center re-inspections',
  baselineAt:baseline.capturedAt,refreshAt:refresh.capturedAt||null,
  lastSuccessfulRefreshAt:(refresh.sites||[]).map(s=>s.sweepCompletedAt).filter(Boolean).sort().at(-1)||null,
  statusNote:'Counts cover monitored/tracked URLs only, not Google Search Console sitewide Page Indexing totals. Pending means uninspected and may be indexed. This dashboard is a three-day snapshot, not live Google coverage.',
  counts:totals,sites:output};
}
module.exports={buildIndexingMonitor,explanation,toStatus};
