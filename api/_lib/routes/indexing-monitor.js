const fs=require('node:fs');
const path=require('node:path');
const {buildIndexingMonitor}=require('../indexing-monitor');
const load=p=>JSON.parse(fs.readFileSync(path.join(process.cwd(),p),'utf8'));
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 try {
  const baseline=load('data/indexing-baseline.json');
  let refresh={};
  try{refresh=load('data/indexing-refresh.json')}catch(error){if(error.code!=='ENOENT')throw error}
  const report=buildIndexingMonitor(baseline,refresh);
  const site=req.query?.site,view=req.query?.details==='1';
  if(site&&!report.sites.some(s=>s.id===site))return res.status(400).json({error:'Unknown website'});
  if(!view)report.sites=report.sites.map(({inspectedUrls,...s})=>s);
  else if(site)report.sites=report.sites.filter(s=>s.id===site);
  else return res.status(400).json({error:'Choose site when requesting URL details'});
  return res.status(200).json(report);
 }catch(error){return res.status(503).json({error:'Saved indexing report unavailable: '+error.message})}
};
