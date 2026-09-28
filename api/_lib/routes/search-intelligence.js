const { getSites } = require('../config');
const { googleFetch } = require('../google');
const SCOPE=['https://www.googleapis.com/auth/webmasters.readonly'];
const iso=d=>d.toISOString().slice(0,10);
const ASIA=new Set(['af','am','az','bh','bd','bt','bn','kh','cn','cy','ge','in','id','ir','iq','il','jp','jo','kz','kw','kg','la','lb','my','mv','mn','mm','np','kp','om','pk','ps','ph','qa','sa','sg','kr','lk','sy','tw','tj','th','tl','tr','tm','ae','uz','vn','ye','hk','mo']);
const EUROPE=new Set(['al','ad','at','by','be','ba','bg','hr','cz','dk','ee','fi','fr','de','gr','hu','is','ie','it','xk','lv','li','lt','lu','mt','md','mc','me','nl','mk','no','pl','pt','ro','ru','sm','rs','sk','si','es','se','ch','ua','gb','va']);

async function query(site,startDate,endDate,dimensions,rowLimit=5000){
  const endpoint='https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(site.gscProperty)+'/searchAnalytics/query';
  const r=await googleFetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({startDate,endDate,dimensions,rowLimit})},SCOPE);
  const d=await r.json();
  if(!r.ok)throw new Error(d?.error?.message||('GSC '+r.status));
  return d.rows||[];
}
function changePct(cur,prev){if(!prev)return cur>0?100:null;return ((cur-prev)/prev)*100;}
function region(code){code=String(code||'').toLowerCase();return ASIA.has(code)?'Asia':EUROPE.has(code)?'Europe':'Other';}
async function analyze(site){
  const end=new Date(Date.now()-2*86400000);
  const start=new Date(end.getTime()-27*86400000);
  const prevEnd=new Date(start.getTime()-86400000);
  const prevStart=new Date(prevEnd.getTime()-27*86400000);
  const [curQ,prevQ,qp,countries,devices]=await Promise.all([
    query(site,iso(start),iso(end),['query']),
    query(site,iso(prevStart),iso(prevEnd),['query']),
    query(site,iso(start),iso(end),['query','page'],10000),
    query(site,iso(start),iso(end),['country'],1000),
    query(site,iso(start),iso(end),['device'],20)
  ]);
  const prev=new Map(prevQ.map(r=>[r.keys?.[0]||'',r]));
  const deltas=curQ.map(r=>{
    const q=r.keys?.[0]||'',p=prev.get(q)||{};
    return {query:q,clicks:r.clicks||0,impressions:r.impressions||0,ctr:r.ctr||0,position:r.position||0,
      previousClicks:p.clicks||0,previousImpressions:p.impressions||0,
      clicksChange:changePct(r.clicks||0,p.clicks||0),impressionsChange:changePct(r.impressions||0,p.impressions||0)};
  });
  const rising=deltas.filter(x=>x.impressions>=50&&x.clicksChange!=null&&x.clicksChange>=25).sort((a,b)=>(b.clicks-b.previousClicks)-(a.clicks-a.previousClicks)).slice(0,15);
  const falling=deltas.filter(x=>x.previousImpressions>=50&&x.clicksChange!=null&&x.clicksChange<=-25).sort((a,b)=>(a.clicks-a.previousClicks)-(b.clicks-b.previousClicks)).slice(0,15);
  const groups=new Map();
  for(const r of qp){const q=r.keys?.[0]||'',page=r.keys?.[1]||'';if(!q||!page)continue;const arr=groups.get(q)||[];arr.push({page,clicks:r.clicks||0,impressions:r.impressions||0,position:r.position||0});groups.set(q,arr);}
  const cannibalization=[...groups.entries()].map(([query,pages])=>({query,pages:pages.sort((a,b)=>b.impressions-a.impressions),totalImpressions:pages.reduce((a,x)=>a+x.impressions,0)}))
    .filter(x=>x.pages.filter(p=>p.impressions>=20).length>=2&&x.totalImpressions>=100)
    .sort((a,b)=>b.totalImpressions-a.totalImpressions).slice(0,15);
  const countryRows=countries.map(r=>({country:r.keys?.[0]||'',region:region(r.keys?.[0]),clicks:r.clicks||0,impressions:r.impressions||0,ctr:r.ctr||0,position:r.position||0})).sort((a,b)=>b.clicks-a.clicks);
  const regionSummary=['Asia','Europe','Other'].map(name=>{const rows=countryRows.filter(x=>x.region===name);return {region:name,clicks:rows.reduce((a,x)=>a+x.clicks,0),impressions:rows.reduce((a,x)=>a+x.impressions,0)};});
  return {
    id:site.id,domain:site.domain,repository:site.repository,range:{current:{start:iso(start),end:iso(end)},previous:{start:iso(prevStart),end:iso(prevEnd)}},
    rising,falling,cannibalization,
    countries:countryRows.slice(0,15),regionSummary,
    devices:devices.map(r=>({device:r.keys?.[0]||'',clicks:r.clicks||0,impressions:r.impressions||0,ctr:r.ctr||0,position:r.position||0}))
  };
}
module.exports=async function handler(req,res){
  res.setHeader('cache-control','no-store');
  const sites=getSites();
  const only=req.query?.site;
  const selected=only?sites.filter(s=>s.id===only):sites;
  if(only&&!selected.length)return res.status(400).json({error:'Unknown site'});
  const results=[];
  for(const site of selected){try{results.push(await analyze(site));}catch(e){results.push({id:site.id,domain:site.domain,error:e.message});}}
  res.status(200).json({source:'Google Search Console',market:'Worldwide',priorityRegions:['Asia','Europe'],sites:results});
};
