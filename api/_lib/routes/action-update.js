const { requireAdmin } = require('../config');
const { seoStore } = require('../seo-store');
module.exports=async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST required'});
  if(!requireAdmin(req)) return res.status(401).json({error:'Unauthorized'});
  const {id,status,result}=req.body||{};
  if(!id||!['approved','rejected','succeeded','failed'].includes(status)) return res.status(400).json({error:'Valid id and status required'});
  const now=new Date().toISOString();
  const patch={status,result:result||{}};
  if(status==='approved') patch.approved_at=now;
  if(['succeeded','failed','rejected'].includes(status)) patch.completed_at=now;
  try{await seoStore('action_update',{id,patch});res.status(200).json({ok:true});}
  catch(e){res.status(500).json({error:e.message});}
};
