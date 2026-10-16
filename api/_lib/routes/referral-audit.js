const { getSites, requireAdmin } = require('../config');
const { googleFetch } = require('../google');

const SCOPE=['https://www.googleapis.com/auth/analytics.readonly'];
const dateUtc=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);

function sanitizeSource(source){
  const value=String(source||'').trim().slice(0,120);
  return value && !/^\(not set\)|^\(direct\)$/i.test(value) ? value : null;
}
function summarize(rows){
  const groups=new Map();
  for(const row of rows||[]){
    const source=sanitizeSource(row.dimensionValues?.[0]?.value);
    const period=row.dimensionValues?.[1]?.value;
    if(!source||!['current','previous'].includes(period))continue;
    const sessions=Number(row.metricValues?.[0]?.value||0);
    const engaged=Number(row.metricValues?.[1]?.value||0);
    if(!Number.isFinite(sessions)||sessions<0)continue;
    const current=groups.get(source)||{source,currentSessions:0,previousSessions:0,currentEngagedSessions:0};
    if(period==='current'){
      current.currentSessions+=sessions;current.currentEngagedSessions+=Math.max(0,engaged||0);
    }else current.previousSessions+=sessions;
    groups.set(source,current);
  }
  const sources=[...groups.values()].sort((a,b)=>b.currentSessions-a.currentSessions);
  const totals=sources.reduce((o,row)=>{
    o.currentSessions+=row.currentSessions;o.previousSessions+=row.previousSessions;
    o.engagedSessions+=row.currentEngagedSessions;return o;
  },{currentSessions:0,previousSessions:0,engagedSessions:0});
  const changePct=totals.previousSessions>0
    ? Number(((totals.currentSessions/totals.previousSessions-1)*100).toFixed(1))
    : null;
  return {totals:{...totals,changePct},referringSources:sources.slice(0,12),
    referringSourcesCount:sources.filter(s=>s.currentSessions>0).length};
}

async function runSite(site){
  if(!site.ga4PropertyId)return {id:site.id,domain:site.domain,configured:false,
    note:'GA4 property ID is not configured. Referral metrics unavailable.'};
  const currentEnd=dateUtc(-2),currentStart=dateUtc(-29);
  const previousEnd=dateUtc(-30),previousStart=dateUtc(-57);
  const url='https://analyticsdata.googleapis.com/v1beta/properties/'+encodeURIComponent(site.ga4PropertyId)+':runReport';
  const r=await googleFetch(url,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({
      dateRanges:[
        {name:'current',startDate:currentStart,endDate:currentEnd},
        {name:'previous',startDate:previousStart,endDate:previousEnd}
      ],
      dimensions:[{name:'sessionSource'},{name:'dateRange'}],
      metrics:[{name:'sessions'},{name:'engagedSessions'}],
      dimensionFilter:{filter:{fieldName:'sessionDefaultChannelGroup',
        stringFilter:{matchType:'EXACT',value:'Referral'}}},
      limit:500
    })
  },SCOPE);
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data?.error?.message||'GA4 referral query HTTP '+r.status);
  return {
    id:site.id,domain:site.domain,configured:true,
    ranges:{current:{start:currentStart,end:currentEnd},previous:{start:previousStart,end:previousEnd}},
    ...summarize(data.rows),
    rowLimit:500,
    note:'GA4 Referral channel sessions: real referral traffic, NOT a backlink inventory or authority score.'
  };
}

module.exports=async function handler(req,res){
  res.setHeader('cache-control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'GET required'});
  if(!requireAdmin(req))return res.status(401).json({error:'Admin authorization required'});
  const selectedId=req.query?.site;
  const all=getSites();
  const sites=selectedId?all.filter(site=>site.id===selectedId):all;
  if(!sites.length)return res.status(400).json({error:'Unknown site'});
  const results=await Promise.all(sites.map(async site=>{
    try{return await runSite(site);}
    catch(e){return {id:site.id,domain:site.domain,configured:true,error:e.message};}
  }));
  return res.status(200).json({
    source:'GA4 Data API',
    interpretation:'Referral traffic is a useful off-page discovery signal; it is not a backlink count. External backlink provider access or GSC Links export is needed for a backlink inventory.',
    sites:results
  });
};
module.exports._test={sanitizeSource,summarize};
