const { getSites, requireAdmin } = require('../config');
const { googleFetch } = require('../google');
const { seoStore } = require('../seo-store');
const { summarizeReasons, reason } = require('../indexing-diagnostics');

const SCOPE=['https://www.googleapis.com/auth/webmasters.readonly'];
const UA='SEO-Control-Center-Index-Progress/1.0';

function hostKey(value){try{return new URL(value).hostname.toLowerCase().replace(/^www\./,'')}catch{return''}}
function sameSite(url,origin){return Boolean(hostKey(url)&&hostKey(url)===hostKey(origin))}
function storageAuthorized(req){
  const supplied=String(req.headers?.['x-seo-storage-secret']||'');
  return Boolean(process.env.SEO_STORAGE_SECRET && supplied && supplied===process.env.SEO_STORAGE_SECRET);
}
function canAdvance(req){return requireAdmin(req)||storageAuthorized(req)}

async function fetchXml(url){
  const r=await fetch(url,{signal:AbortSignal.timeout(9000),headers:{'user-agent':UA}});
  const text=await r.text();
  if(!r.ok)throw new Error('Sitemap HTTP '+r.status);
  return text;
}
async function sitemapUrls(url,origin,depth=0,seen=new Set()){
  if(depth>2||seen.has(url))return[];
  seen.add(url);
  const text=await fetchXml(url);
  const locs=[...text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].trim());
  if(/<sitemapindex\b/i.test(text)){
    const out=[];
    for(const loc of locs.slice(0,40)){
      try{out.push(...await sitemapUrls(loc,origin,depth+1,seen))}catch{}
      if(out.length>=1500)break;
    }
    return [...new Set(out)].slice(0,1500);
  }
  return [...new Set(locs.filter(x=>sameSite(x,origin)))].slice(0,1500);
}
async function inspect(site,url){
  const r=await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({inspectionUrl:url,siteUrl:site.gscProperty,languageCode:'en-US'})
  },SCOPE);
  const d=await r.json();
  if(!r.ok)throw new Error(d?.error?.message||('Inspection '+r.status));
  const x=d.inspectionResult?.indexStatusResult||{};
  return {
    url,
    verdict:x.verdict||null,
    coverageState:x.coverageState||null,
    robotsTxtState:x.robotsTxtState||null,
    indexingState:x.indexingState||null,
    pageFetchState:x.pageFetchState||null,
    lastCrawlTime:x.lastCrawlTime||null,
    googleCanonical:x.googleCanonical||null,
    userCanonical:x.userCanonical||null,
    checkedAt:new Date().toISOString()
  };
}
function latestStates(history){
  const out={};
  for(const row of history?.snapshots||[]){
    if(row?.source!=='indexing'||out[row.site_id])continue;
    const state=row?.metadata?.indexingState;
    if(state&&typeof state==='object')out[row.site_id]=state;
  }
  return out;
}
function normalizeRecords(state,urls){
  const valid=new Set(urls);
  const src=state?.records&&typeof state.records==='object'?state.records:{};
  const out={};
  for(const [url,row] of Object.entries(src))if(valid.has(url))out[url]=row;
  return out;
}
function summarize(site,urls,records,lastUpdated=null){
  let indexed=0,notIndexed=0,errors=0;
  for(const url of urls){
    const r=records[url];
    if(!r)continue;
    if(r.error)errors++;
    else if(r.verdict==='PASS')indexed++;
    else notIndexed++;
  }
  // Inspection API errors are not completed inspections and must be retried.
  const checked=indexed+notIndexed;
  const remaining=Math.max(0,urls.length-checked);
  return {
    id:site.id,domain:site.domain,repository:site.repository,
    totalPages:urls.length,checked,indexed,notIndexed,errors,remaining,
    verifiedPercent:urls.length?Number((checked/urls.length*100).toFixed(1)):0,
    indexedPercentOfVerified:(indexed+notIndexed)?Number((indexed/(indexed+notIndexed)*100).toFixed(1)):null,
    indexingReasons:summarizeReasons(records,urls).slice(0,8),
    lastUpdated:lastUpdated||null
  };
}
async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i)}});
  await Promise.all(workers);return out;
}

module.exports=async function handler(req,res){
  res.setHeader('cache-control','no-store');
  const method=String(req.method||'GET').toUpperCase();
  if(!['GET','POST'].includes(method))return res.status(405).json({error:'GET or POST required'});
  if(method==='POST'&&!canAdvance(req))return res.status(401).json({error:'Admin or monitor authorization required'});

  const sites=getSites();
  const siteId=req.query?.site||req.body?.site||null;
  const selected=siteId?sites.filter(s=>s.id===siteId):sites;
  if(siteId&&!selected.length)return res.status(400).json({error:'Unknown site'});
  const batch=Math.min(10,Math.max(1,Number(req.query?.batch||req.body?.batch||5)));

  let history={snapshots:[]};
  try{history=await seoStore('dashboard')}catch(e){
    if(method==='POST')return res.status(503).json({error:'Index history storage unavailable: '+e.message});
  }
  const states=latestStates(history);
  const results=[];
  const details=[];
  const showDetails=method==='GET' && String(req.query?.details||'')==='1';

  for(const site of selected){
    try{
      const origin=new URL(site.url).origin;
      let urls=await sitemapUrls(site.sitemap,origin);
      if(!urls.length)urls=[site.url];
      else if(!urls.some(u=>sameSite(u,origin)&&new URL(u).pathname==='/'))urls.unshift(site.url);
      urls=[...new Set(urls)];

      const prior=states[site.id]||{};
      const records=normalizeRecords(prior,urls);
      // Read-only detail mode for the dashboard. Only return saved inspection evidence.
      if(showDetails){
        for(const [url,record] of Object.entries(records)){
          const triage=reason(record);
          details.push({
            id:site.id,domain:site.domain,url,
            status:record.error?'ERROR':record.verdict==='PASS'?'INDEXED':'NOT_INDEXED',
            coverageState:record.coverageState||null,
            verdict:record.verdict||null,
            reason:triage?.label||null,
            action:triage?.action||null,
            userCanonical:record.userCanonical||null,
            googleCanonical:record.googleCanonical||null,
            lastCrawlTime:record.lastCrawlTime||null,
            checkedAt:record.checkedAt||null
          });
        }
      }

      if(method==='POST'){
        const now=Date.now();
        const staleMs=7*86400000;
        let candidates=urls.filter(u=>!records[u] || (records[u].error && now-Date.parse(records[u].checkedAt||0)>6*3600000));
        if(!candidates.length){
          candidates=urls
            .filter(u=>records[u])
            .sort((a,b)=>new Date(records[a]?.checkedAt||0)-new Date(records[b]?.checkedAt||0))
            .filter(u=>now-new Date(records[u]?.checkedAt||0).getTime()>=staleMs);
        }
        const target=candidates.slice(0,batch);
        const checkedRows=await mapLimit(target,3,async url=>{
          try{return await inspect(site,url)}
          catch(e){return {url,error:e.message,checkedAt:new Date().toISOString()}}
        });
        for(const row of checkedRows)records[row.url]=row;

        const indexingState={
          version:1,
          updatedAt:new Date().toISOString(),
          totalPages:urls.length,
          records
        };
        await seoStore('snapshot',{rows:[{
          site_id:site.id,
          captured_at:new Date().toISOString(),
          source:'indexing',
          sitemap_entries:urls.length,
          cwv:{},
          pagespeed:{},
          issue_count:0,
          metadata:{indexingState}
        }]});
        results.push({...summarize(site,urls,records,indexingState.updatedAt),advanced:checkedRows.length,advancedRows:checkedRows});
      }else{
        results.push(summarize(site,urls,records,prior.updatedAt||null));
      }
    }catch(e){
      results.push({id:site.id,domain:site.domain,repository:site.repository,error:e.message});
    }
  }

  const valid=results.filter(x=>!x.error);
  const portfolio={
    totalPages:valid.reduce((n,x)=>n+x.totalPages,0),
    checked:valid.reduce((n,x)=>n+x.checked,0),
    indexed:valid.reduce((n,x)=>n+x.indexed,0),
    notIndexed:valid.reduce((n,x)=>n+x.notIndexed,0),
    errors:valid.reduce((n,x)=>n+x.errors,0),
    remaining:valid.reduce((n,x)=>n+x.remaining,0)
  };
  portfolio.verifiedPercent=portfolio.totalPages?Number((portfolio.checked/portfolio.totalPages*100).toFixed(1)):0;

  res.status(200).json({
    source:'Google URL Inspection API + live sitemaps',
    counting:'Inspected URL-by-URL; indexed is PASS among those URLs, NOT GSC sitewide indexed count; errors are not checked',
    batchSize:method==='POST'?batch:0,
    portfolio,
    sites:results,
    ...(showDetails ? { inspectedUrls:details.sort((a,b)=>{
      const rank={NOT_INDEXED:0,ERROR:1,INDEXED:2};
      return (rank[a.status]-rank[b.status])||String(b.checkedAt||'').localeCompare(String(a.checkedAt||''));
    }).slice(0,Math.min(500,Math.max(1,Number(req.query?.limit||250)))) } : {})
  });
};
