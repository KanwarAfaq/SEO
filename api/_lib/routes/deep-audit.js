const { getSites } = require('../config');
const { extendedChecks } = require('../onpage-extras');

const UA = 'SEO-Control-Center-Deep-Audit/1.0';
const clean = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function match(html, re) {
  const m = html.match(re);
  return m ? clean(m[1] || '') : '';
}
function hostKey(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./,''); } catch { return ''; }
}
function sameOrigin(url, origin) {
  return Boolean(hostKey(url) && hostKey(url) === hostKey(origin));
}
function normalizeLink(href, base) {
  try {
    if (!href || /^(#|mailto:|tel:|javascript:|data:)/i.test(href)) return null;
    const u = new URL(href, base);
    u.hash = '';
    return u.href;
  } catch { return null; }
}
async function fetchText(url, timeout=9000) {
  const start = Date.now();
  const r = await fetch(url, { redirect:'follow', signal:AbortSignal.timeout(timeout), headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'} });
  const text = await r.text();
  return { r, text, latency: Date.now()-start };
}
async function sitemapUrls(url, origin, depth=0, seen=new Set()) {
  if (depth > 1 || seen.has(url)) return [];
  seen.add(url);
  const { r, text } = await fetchText(url, 10000);
  if (!r.ok) throw new Error('Sitemap HTTP ' + r.status);
  const locs=[...text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].trim());
  if (/<sitemapindex\b/i.test(text)) {
    const out=[];
    for (const loc of locs.slice(0,20)) {
      try { out.push(...await sitemapUrls(loc, origin, depth+1, seen)); } catch {}
      if (out.length >= 500) break;
    }
    return [...new Set(out)].slice(0,500);
  }
  return [...new Set(locs.filter(x=>sameOrigin(x, origin)))].slice(0,500);
}
function analyzeHtml(url, html, response) {
  const title = match(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
    match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const canonical =
    match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) ||
    match(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const robots =
    match(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
    match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i);
  const h1Count=(html.match(/<h1(?:\s|>)/gi)||[]).length;
  const schemaCount=(html.match(/<script[^>]+type=["']application\/ld\+json["']/gi)||[]).length;
  const lang=match(html, /<html[^>]+lang=["']([^"']+)["']/i);
  const viewport=/<meta[^>]+name=["']viewport["']/i.test(html);
  const links=[];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const u=normalizeLink(m[1], url); if(u) links.push(u);
  }
  const imgs=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
  const missingAlt=imgs.filter(tag=>!(/\balt=["'][^"']*["']/i.test(tag))).length;
  const issues=[];
  if (!response.ok) issues.push({severity:'critical',code:'http',message:'HTTP '+response.status});
  if (!title) issues.push({severity:'high',code:'title_missing',message:'Missing title'});
  else if (title.length < 20 || title.length > 65) issues.push({severity:'low',code:'title_length',message:'Title length '+title.length});
  if (!description) issues.push({severity:'medium',code:'description_missing',message:'Missing meta description'});
  else if (description.length < 70 || description.length > 170) issues.push({severity:'low',code:'description_length',message:'Description length '+description.length});
  if (!canonical) issues.push({severity:'medium',code:'canonical_missing',message:'Missing canonical'});
  if (/noindex/i.test(robots)) issues.push({severity:'critical',code:'noindex',message:'noindex detected'});
  if (h1Count===0) issues.push({severity:'medium',code:'h1_missing',message:'Missing H1'});
  if (h1Count>1) issues.push({severity:'low',code:'h1_multiple',message:h1Count+' H1 headings'});
  if (!viewport) issues.push({severity:'medium',code:'viewport_missing',message:'Missing viewport'});
  if (schemaCount===0) issues.push({severity:'low',code:'schema_missing',message:'No JSON-LD'});
  if (missingAlt>0) issues.push({severity:'low',code:'image_alt',message:missingAlt+' images missing alt'});
  return { title, description, canonical, robots, h1Count, schemaCount, lang, viewport, links:[...new Set(links)], missingAlt, issues };
}
async function crawlPage(url, origin) {
  const start=Date.now();
  try {
    const { r, text, latency }=await fetchText(url,9000);
    const type=r.headers.get('content-type')||'';
    if(!/text\/html|application\/xhtml\+xml/i.test(type)) {
      return {url,status:r.status,finalUrl:r.url,latency,bytes:Buffer.byteLength(text),issues:r.ok?[]:[{severity:'critical',code:'http',message:'HTTP '+r.status}],links:[]};
    }
    const a=analyzeHtml(url,text,r);
    const extra=extendedChecks({url,html:text,canonical:a.canonical,headers:r.headers});
    a.issues.push(...extra.issues);
    a.extended=extra.checks;
    return {url,status:r.status,finalUrl:r.url,latency,bytes:Buffer.byteLength(text),...a,internalLinks:a.links.filter(x=>sameOrigin(x,origin)).length,externalLinks:a.links.filter(x=>!sameOrigin(x,origin)).length};
  } catch(e) {
    return {url,status:null,latency:Date.now()-start,error:e.message,issues:[{severity:'critical',code:'unreachable',message:e.message}],links:[]};
  }
}
async function mapLimit(items, limit, fn) {
  const out=new Array(items.length); let i=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const idx=i++;if(idx>=items.length)return;out[idx]=await fn(items[idx],idx);}});
  await Promise.all(workers); return out;
}
async function checkLink(url) {
  try {
    let r=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(6000),headers:{'user-agent':UA}});
    if ([403,405].includes(r.status)) r=await fetch(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(6000),headers:{'user-agent':UA,'range':'bytes=0-1024'}});
    return {url,status:r.status,ok:r.status<400};
  } catch(e) { return {url,status:null,ok:false,error:e.message}; }
}
module.exports=async function handler(req,res){
  res.setHeader('cache-control','no-store');
  const sites=getSites();
  const siteId=req.query?.site || req.body?.site || sites[0]?.id;
  const site=sites.find(s=>s.id===siteId);
  if(!site) return res.status(400).json({error:'Unknown site'});
  const limit=Math.min(20,Math.max(5,Number(req.query?.limit||req.body?.limit||12)));
  const origin=new URL(site.url).origin;
  try{
    let urls=await sitemapUrls(site.sitemap,origin);
    if(!urls.length) urls=[site.url];
    else if(!urls.some(u=>sameOrigin(u,origin)&&new URL(u).pathname==='/')) urls.unshift(site.url);
    urls=[...new Set(urls)].slice(0,limit);
    const pages=await mapLimit(urls,4,u=>crawlPage(u,origin));

    const titleGroups=new Map(), descGroups=new Map();
    for(const p of pages){
      if(p.title){const k=p.title.toLowerCase();titleGroups.set(k,[...(titleGroups.get(k)||[]),p.url]);}
      if(p.description){const k=p.description.toLowerCase();descGroups.set(k,[...(descGroups.get(k)||[]),p.url]);}
    }
    const duplicateTitles=[...titleGroups.entries()].filter(([,v])=>v.length>1).map(([title,urls])=>({title,urls}));
    const duplicateDescriptions=[...descGroups.entries()].filter(([,v])=>v.length>1).map(([description,urls])=>({description,urls}));

    const internal=[...new Set(pages.flatMap(p=>(p.links||[]).filter(x=>sameOrigin(x,origin))))].filter(x=>!urls.includes(x)).slice(0,30);
    const checkedLinks=await mapLimit(internal,6,checkLink);
    const brokenLinks=checkedLinks.filter(x=>!x.ok);

    const issueRows=pages.flatMap(p=>(p.issues||[]).map(i=>({...i,url:p.url})));
    duplicateTitles.forEach(d=>issueRows.push({severity:'medium',code:'duplicate_title',message:'Duplicate title on '+d.urls.length+' pages',url:d.urls[0]}));
    duplicateDescriptions.forEach(d=>issueRows.push({severity:'low',code:'duplicate_description',message:'Duplicate description on '+d.urls.length+' pages',url:d.urls[0]}));
    brokenLinks.forEach(b=>issueRows.push({severity:'high',code:'broken_internal_link',message:'Broken internal link'+(b.status?' HTTP '+b.status:''),url:b.url}));
    const priority={critical:100,high:75,medium:50,low:25};
    const suggestedFixes={
      http:'Repair the failing URL or redirect to its correct canonical destination',
      noindex:'Remove unintended noindex directives before requesting recrawl',
      canonical_missing:'Publish an absolute, correct rel=canonical',
      title_missing:'Write a unique descriptive title for this page',
      description_missing:'Add a useful and distinct meta description',
      duplicate_title:'Differentiate the page topic and title from other pages',
      duplicate_description:'Write a page-specific search snippet description',
      h1_missing:'Add one clear page topic heading in server-rendered HTML',
      broken_internal_link:'Update or remove broken internal link targets',
      schema_missing:'Add relevant valid structured data only where appropriate'
    };
    for(const issue of issueRows){
      issue.priority=priority[issue.severity]||10;
      issue.fix=issue.fix||suggestedFixes[issue.code]||'Review this signal and fix only if it impacts users or crawling';
    }

    const severity={critical:4,high:3,medium:2,low:1};
    issueRows.sort((a,b)=>(severity[b.severity]||0)-(severity[a.severity]||0));
    const score=Math.max(0,100-Math.min(100,issueRows.reduce((n,i)=>n+({critical:15,high:8,medium:4,low:1}[i.severity]||1),0)));

    res.status(200).json({
      source:'Live crawl',
      scope:'Sample of sitemap pages; checks initial HTML, not the browser-rendered DOM. Broken internal links are sampled.',
      checkedAt:new Date().toISOString(),
      site:{id:site.id,domain:site.domain,url:site.url,repository:site.repository,market:site.market,priorityRegions:site.priorityRegions},
      sitemapUrlsFound:urls.length,
      pagesChecked:pages.length,
      linkChecks:checkedLinks.length,
      score,
      summary:{
        critical:issueRows.filter(x=>x.severity==='critical').length,
        high:issueRows.filter(x=>x.severity==='high').length,
        medium:issueRows.filter(x=>x.severity==='medium').length,
        low:issueRows.filter(x=>x.severity==='low').length,
        brokenLinks:brokenLinks.length,
        duplicateTitles:duplicateTitles.length,
        duplicateDescriptions:duplicateDescriptions.length
      },
      issues:issueRows.slice(0,100),
      topFixes:issueRows.slice(0,8).map(x=>({url:x.url,severity:x.severity,code:x.code,priority:x.priority,fix:x.fix})),
      pages:pages.map(({links,...p})=>p),
      brokenLinks
    });
  }catch(e){res.status(500).json({error:e.message});}
};
