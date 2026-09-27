const { getSites } = require('./_lib/config');
const { googleFetch } = require('./_lib/google');
const SCOPE = ['https://www.googleapis.com/auth/webmasters.readonly'];
const iso = d => d.toISOString().slice(0,10);

async function getOpportunities(site) {
  const end = new Date(Date.now() - 2 * 86400000);
  const start = new Date(end.getTime() - 27 * 86400000);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gscProperty)}/searchAnalytics/query`;
  const r = await googleFetch(endpoint, {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({startDate:iso(start),endDate:iso(end),dimensions:['query','page'],rowLimit:5000})
  }, SCOPE);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `GSC ${r.status}`);
  return (data.rows||[])
    .map(row=>({siteId:site.id,domain:site.domain,query:row.keys?.[0]||'',page:row.keys?.[1]||'',clicks:row.clicks||0,impressions:row.impressions||0,ctr:row.ctr||0,position:row.position||0}))
    .filter(x=>x.impressions>=50 && x.position>=4 && x.position<=20 && x.ctr<0.08)
    .map(x=>({...x,priorityScore:Math.round(x.impressions * Math.max(.15,1-x.ctr) * Math.max(.2,(21-x.position)/17))}))
    .sort((a,b)=>b.priorityScore-a.priorityScore)
    .slice(0,25);
}

module.exports = async function handler(req,res) {
  res.setHeader('cache-control','no-store');
  try {
    const all = [];
    for (const site of getSites()) {
      try { all.push(...await getOpportunities(site)); }
      catch (e) { all.push({siteId:site.id,domain:site.domain,error:e.message}); }
    }
    const opportunities = all.filter(x=>!x.error).sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,50);
    const errors = all.filter(x=>x.error);
    res.status(200).json({ opportunities, errors });
  } catch(e) { res.status(500).json({error:e.message}); }
};
