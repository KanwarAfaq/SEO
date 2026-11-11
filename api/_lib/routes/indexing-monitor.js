const {buildIndexingMonitor}=require('../indexing-monitor');
// Static imports guarantee that Vercel bundles both evidence files with /api/control.
const baselineSnapshot=require('../../../data/indexing-baseline.json');
const refreshedSnapshot=require('../../../data/indexing-refresh.json');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 try {
  const report=buildIndexingMonitor(baselineSnapshot,refreshedSnapshot);
  const site=req.query?.site,view=req.query?.details==='1';
  if(site&&!report.sites.some(s=>s.id===site))return res.status(400).json({error:'Unknown website'});
  if(!view)report.sites=report.sites.map(({inspectedUrls,...s})=>s);
  else if(site)report.sites=report.sites.filter(s=>s.id===site);
  else return res.status(400).json({error:'Choose site when requesting URL details'});
  return res.status(200).json(report);
 }catch(error){return res.status(503).json({error:'Saved indexing report unavailable: '+error.message})}
};
