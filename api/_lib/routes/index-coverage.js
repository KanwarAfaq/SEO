const { getSites } = require('../config');
const { googleFetch } = require('../google');
const SCOPE=['https://www.googleapis.com/auth/webmasters.readonly'];
const UA='SEO-Control-Center-Index-Sample/1.0';
function hostKey(value){try{return new URL(value).hostname.toLowerCase().replace(/^www\./,'')}catch{return''}}
function sameSite(url,origin){return Boolean(hostKey(url)&&hostKey(url)===hostKey(origin))}

async function fetchXml(url){
  const r=await fetch(url,{signal:AbortSignal.timeout(9000),headers:{'user-agent':UA}});
  const text=await r.text();
  if(!r.ok)throw new Error('Sitemap HTTP '+r.status);
  return text;
}
async function sitemapUrls(url,origin,depth=0,seen=new Set()){
  if(depth>1||seen.has(url))return[];seen.add(url);
  const text=await fetchXml(url);
  const locs=[...text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].trim());
  if(/<sitemapindex\b/i.test(text)){
    const out=[];for(const loc of locs.slice(0,15)){try{out.push(...await sitemapUrls(loc,origin,depth+1,seen));}catch{}if(out.length>=300)break;}return[...new Set(out)].slice(0,300);
  }
  return [...new Set(locs.filter(x=>sameSite(x,origin)))].slice(0,300);
}
function sampleEvenly(urls,n){
  if(urls.length<=n)return urls;
  const out=[];for(let i=0;i<n;i++){const idx=Math.round(i*(urls.length-1)/(n-1));out.push(urls[idx]);}return[...new Set(out)];
}
async function inspect(site,url){
  const r=await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({inspectionUrl:url,siteUrl:site.gscProperty,languageCode:'en-US'})
  },SCOPE);
  const d=await r.json();
  if(!r.ok)throw new Error(d?.error?.message||('Inspection '+r.status));
  const x=d.inspectionResult?.indexStatusResult||{};
  return {url,verdict:x.verdict||null,coverageState:x.coverageState||null,robotsTxtState:x.robotsTxtState||null,indexingState:x.indexingState||null,pageFetchState:x.pageFetchState||null,lastCrawlTime:x.lastCrawlTime||null,googleCanonical:x.googleCanonical||null,userCanonical:x.userCanonical||null};
}
module.exports=async function handler(req,res){
  res.setHeader('cache-control','no-store');
  const sites=getSites();const only=req.query?.site;const n=Math.min(5,Math.max(2,Number(req.query?.sample||3)));
  const selected=only?sites.filter(s=>s.id===only):sites;if(only&&!selected.length)return res.status(400).json({error:'Unknown site'});
  const results=[];
  for(const site of selected){
    try{
      const origin=new URL(site.url).origin;let urls=await sitemapUrls(site.sitemap,origin);if(!urls.length)urls=[site.url];else if(!urls.some(u=>sameSite(u,origin)&&new URL(u).pathname==='/'))urls.unshift(site.url);
      const sampled=sampleEvenly(urls,n),rows=[];
      for(const url of sampled){try{rows.push(await inspect(site,url));}catch(e){rows.push({url,error:e.message});}}
      results.push({id:site.id,domain:site.domain,repository:site.repository,sitemapUrlCount:urls.length,sampleSize:rows.length,
        pass:rows.filter(x=>x.verdict==='PASS').length,partial:rows.filter(x=>x.verdict&&x.verdict!=='PASS').length,errors:rows.filter(x=>x.error).length,rows});
    }catch(e){results.push({id:site.id,domain:site.domain,error:e.message});}
  }
  res.status(200).json({source:'Google URL Inspection API',sampleNote:'Sample only; not sitewide coverage',sites:results});
};
