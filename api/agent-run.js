const { requireAdmin, getSites } = require('./_lib/config');
const { seoStore } = require('./_lib/seo-store');

function invoke(handler, req={}) {
  return new Promise((resolve,reject)=>{
    let statusCode=200, body=null;
    const res={
      setHeader(){},
      status(code){statusCode=code; return this;},
      json(data){body=data; resolve({statusCode,body}); return this;}
    };
    Promise.resolve(handler(req,res)).catch(reject);
  });
}
function severityFromCwv(type,val){
  if(type==='lcp') return val>4000?'critical':val>2500?'high':null;
  if(type==='inp') return val>500?'critical':val>200?'high':null;
  if(type==='cls') return val>0.25?'critical':val>0.1?'high':null;
  return null;
}
module.exports=async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST required'});
  if(!requireAdmin(req)) return res.status(401).json({error:'Unauthorized'});
  const startedAt=new Date().toISOString();
  try{
    const [healthR,gscR,gaR,auditR,cruxR,oppR]=await Promise.all([
      invoke(require('./sites-health'),{}),
      invoke(require('./gsc-overview'),{}),
      invoke(require('./ga4-realtime'),{}),
      invoke(require('./technical-audit'),{}),
      invoke(require('./crux'),{query:{}}),
      invoke(require('./gsc-opportunities'),{})
    ]);
    const health=healthR.body?.sites||[], gsc=gscR.body?.sites||[], ga=gaR.body?.sites||[], audits=auditR.body?.sites||[], crux=cruxR.body?.sites||[], opps=oppR.body?.opportunities||[];
    const sites=getSites();
    const by=(arr,id)=>arr.find(x=>x.id===id)||{};
    const issues=[], actions=[], snapshots=[];
    for(const site of sites){
      const h=by(health,site.id), g=by(gsc,site.id), a=by(ga,site.id), t=by(audits,site.id), c=by(crux,site.id);
      if(h.ok===false) issues.push({site_id:site.id,fingerprint:'site-down',category:'availability',severity:'critical',title:'Website unavailable',details:{status:h.status,error:h.error}});
      if(h.sitemapOk===false) issues.push({site_id:site.id,fingerprint:'sitemap-fail',category:'indexing',severity:'high',title:'Sitemap unavailable',details:{status:h.sitemapStatus,url:h.sitemapUrl}});
      if(Number(t.score)<80) issues.push({site_id:site.id,fingerprint:'technical-score-low',category:'technical',severity:Number(t.score)<60?'high':'medium',title:'Technical SEO audit needs attention',details:{score:t.score,issues:(t.issues||[]).slice(0,8)}});
      for(const k of ['lcp','inp','cls']){
        const val=c?.[k]?.p75;
        const sev=val==null?null:severityFromCwv(k,Number(val));
        if(sev) issues.push({site_id:site.id,fingerprint:'cwv-'+k,category:'performance',severity:sev,title:'Core Web Vital '+k.toUpperCase()+' needs improvement',details:{p75:val}});
      }
      snapshots.push({
        site_id:site.id, captured_at:new Date().toISOString(), source:'agent',
        site_ok:h.ok??null,http_status:h.status||null,latency_ms:h.latency||null,
        sitemap_ok:h.sitemapOk??null,sitemap_status:h.sitemapStatus||null,sitemap_entries:h.urlCount??null,
        gsc_clicks:g.clicks??null,gsc_impressions:g.impressions??null,gsc_ctr:g.ctr??null,gsc_position:g.position??null,
        ga4_active_users:a.activeUsers??null,cwv:c?.error?{}:{lcp:c.lcp,inp:c.inp,cls:c.cls,fcp:c.fcp},
        technical_score:t.score??null,issue_count:0,metadata:{gsc_error:g.error||null,ga_error:a.error||null,crux_error:c.error||null}
      });
    }
    for(const o of opps.slice(0,20)){
      actions.push({
        site_id:o.siteId,fingerprint:'gsc-opportunity:'+o.query+':'+o.page,action_type:'content_optimization',
        status:'suggested',title:'Improve ranking opportunity: '+o.query,
        rationale:'High impressions with position '+Number(o.position).toFixed(1)+' and CTR '+(Number(o.ctr)*100).toFixed(2)+'%',
        payload:{query:o.query,page:o.page,impressions:o.impressions,position:o.position,ctr:o.ctr,priorityScore:o.priorityScore}
      });
    }
    for(const i of issues){
      if(i.category==='technical'||i.category==='performance'){
        actions.push({site_id:i.site_id,fingerprint:'fix:'+i.fingerprint,action_type:'investigate_fix',status:'suggested',title:'Investigate '+i.title,rationale:'Detected by automated SEO agent',payload:{issue:i}});
      }
    }
    snapshots.forEach(s=>s.issue_count=issues.filter(i=>i.site_id===s.site_id).length);
    const storage={};
    try{storage.snapshots=await seoStore('snapshot',{rows:snapshots});}catch(e){storage.snapshots={error:e.message}}
    try{storage.issues=await seoStore('issues_sync',{rows:issues});}catch(e){storage.issues={error:e.message}}
    try{storage.actions=await seoStore('action_suggest',{rows:actions});}catch(e){storage.actions={error:e.message}}
    try{storage.run=await seoStore('agent_run',{row:{run_type:'seo_agent',status:'succeeded',started_at:startedAt,finished_at:new Date().toISOString(),summary:'Automated portfolio SEO analysis',counts:{sites:sites.length,issues:issues.length,actions:actions.length,opportunities:opps.length},metadata:{storage}}});}catch(e){storage.run={error:e.message}}
    res.status(200).json({ok:true,counts:{sites:sites.length,issues:issues.length,actions:actions.length,opportunities:opps.length},issues,actions,storage});
  }catch(e){
    try{await seoStore('agent_run',{row:{run_type:'seo_agent',status:'failed',started_at:startedAt,finished_at:new Date().toISOString(),error:e.message}})}catch{}
    res.status(500).json({error:e.message});
  }
};
