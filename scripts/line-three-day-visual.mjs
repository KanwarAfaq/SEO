// Compact LINE Flex carousel for the five-site SEO control center.
// Only tracked Google URL Inspection results appear in the index bar; pending remains unknown.
const colors={ink:'#172033',muted:'#64748B',bg:'#F1F5F9',ok:'#16A34A',bad:'#DC2626',pending:'#94A3B8',warn:'#F59E0B',blue:'#2563EB'};
const n=v=>v==null||!Number.isFinite(Number(v))?'—':Math.max(0,Math.round(Number(v))).toLocaleString('en-US');
const t=(value,opts={})=>({type:'text',text:String(value??'—'),size:'xs',color:colors.ink,wrap:false,...opts});
const col=(items,opts={})=>({type:'box',layout:'vertical',contents:items,...opts});
const row=(items,opts={})=>({type:'box',layout:'horizontal',contents:items,...opts});
const legend=(label,color,val)=>col([t(label,{color:colors.muted,size:'xxs'}),t(n(val),{size:'xl',color,weight:'bold',margin:'xs'})],{flex:1});
const bar=(parts,blankColor=colors.bg)=>{
  const segments=parts.filter(p=>Number(p.value)>0).map(p=>({type:'box',layout:'vertical',height:'10px',backgroundColor:p.color,flex:Math.max(1,Math.round(Number(p.value)))}));
  if(!segments.length)segments.push({type:'box',layout:'vertical',height:'10px',backgroundColor:blankColor,flex:1});
  return row(segments,{height:'10px',cornerRadius:'5px',backgroundColor:colors.bg});
};
const percent=(a,b)=>b>0?Math.round(Number(a||0)/Number(b)*100)+'%':'—';
function siteCard(r,base){
 const i=r.inspection||null,g=r.gsc||null,total=Number(i?.total||0),indexed=Number(i?.indexed||0),excluded=Number(i?.notIndexed||0),pending=Math.max(0,Number(i?.unchecked??Math.max(0,total-indexed-excluded)));
 const up=r.http==='OK'&&r.robots==='OK'&&r.sitemap==='OK';
 const baseUrl=new URL(base).origin;
 const body=[
  t(r.domain,{size:'lg',weight:'bold'}),
  t(up?'● HEALTHY':'● CHECK SITE',{color:up?colors.ok:colors.bad,weight:'bold',size:'xxs',margin:'sm'}),
  {type:'separator',margin:'md'},
  row([t('GOOGLE INDEXING',{color:colors.muted,size:'xxs',weight:'bold',flex:1}),t(n(total)+' tracked',{size:'xxs',color:colors.muted,align:'end'})],{margin:'md'}),
  row([legend('INDEXED',colors.ok,indexed),legend('NOT INDEXED',colors.bad,excluded),legend('PENDING',colors.pending,pending)],{margin:'md'}),
  {...bar([{value:indexed,color:colors.ok},{value:excluded,color:colors.bad},{value:pending,color:colors.pending}]),margin:'md'},
  row([t(percent(indexed,total)+' indexed',{color:colors.muted,size:'xxs'}),t('Pending ≠ excluded',{color:colors.muted,size:'xxs',align:'end',flex:1})],{margin:'sm'}),
  {type:'separator',margin:'lg'},
  t('GOOGLE SEARCH · 28 DAYS',{color:colors.muted,size:'xxs',weight:'bold',margin:'md'}),
  row([legend('CLICKS',colors.blue,g?.clicks),legend('IMPRESSIONS',colors.ink,g?.impressions)],{margin:'sm'}),
  ...(r.notes?.length?[t('● '+String(r.notes[0]).slice(0,64),{color:colors.warn,size:'xxs',wrap:true,margin:'md'})]:[])
 ];
 const bubble={type:'bubble',size:'mega',body:col(body,{paddingAll:'18px'})};
 bubble.footer=col([{type:'button',action:{type:'uri',label:'Open dashboard',uri:baseUrl+'/#indexing'},height:'sm',style:'link',color:colors.blue}]);
 return bubble;
}
export function buildThreeDayVisual(report,base){
 const sites=report.sites||[],tot=report.indexingCounts||{};
 const total=Number(tot.tracked??sites.reduce((a,s)=>a+Number(s.inspection?.total||0),0));
 const indexed=Number(tot.indexed??sites.reduce((a,s)=>a+Number(s.inspection?.indexed||0),0));
 const excluded=Number(tot.notIndexed??sites.reduce((a,s)=>a+Number(s.inspection?.notIndexed||0),0));
 const pending=Math.max(0,Number(tot.pending??total-indexed-excluded));
 const healthy=Number(report.healthy||0);
 const date=String(report.checkedAt||'').slice(0,10);
 const dataGaps=Array.isArray(report.sourceGaps)?report.sourceGaps.length:0;
 const main=[
  t('SEO · THREE-DAY PULSE',{size:'xs',color:colors.blue,weight:'bold'}),
  t(date||'Latest report',{size:'xxs',margin:'sm',color:colors.muted}),
  row([col([t(n(healthy)+' / '+n(sites.length),{size:'xxl',weight:'bold'}),t('SITES HEALTHY',{size:'xxs',color:colors.muted})],{flex:1}),
    col([t(n(indexed)+' / '+n(total),{size:'xxl',weight:'bold'}),t('VERIFIED INDEXED',{size:'xxs',color:colors.muted})],{flex:1})],{margin:'lg'}),
  {type:'separator',margin:'lg'},
  t('TRACKED URL INSPECTION',{size:'xxs',weight:'bold',color:colors.muted,margin:'lg'}),
  row([legend('INDEXED',colors.ok,indexed),legend('NOT INDEXED',colors.bad,excluded),legend('PENDING',colors.pending,pending)],{margin:'md'}),
  {...bar([{value:indexed,color:colors.ok},{value:excluded,color:colors.bad},{value:pending,color:colors.pending}]),margin:'md'},
  t('Pending is uninspected — not automatically excluded',{size:'xxs',color:colors.muted,wrap:true,margin:'sm'}),
  {type:'separator',margin:'lg'},
  t('SEARCH IMPRESSIONS BY SITE',{size:'xxs',color:colors.muted,weight:'bold',margin:'lg'})
 ];
 const max=Math.max(1,...sites.map(s=>Number(s.gsc?.impressions||0)));
 for(const r of sites){
  const value=r.gsc?.impressions;
  const width=value!=null?Math.max(1,Number(value)||0):0;
  main.push(row([t(r.domain,{flex:3,size:'xxs'}),t(n(value),{size:'xxs',align:'end',flex:1,color:colors.blue})],{margin:'sm'}));
  main.push({...bar([{value:width,color:colors.blue},{value:Math.max(0,max-width),color:colors.bg}]),margin:'xs',height:'6px'});
 }
 if(dataGaps)main.push(t('⚠ '+dataGaps+' data source issue'+(dataGaps===1?'':'s'),{size:'xxs',color:colors.bad,margin:'md'}));
 const bubble={type:'bubble',size:'mega',body:col(main,{paddingAll:'18px'}),footer:col([{type:'button',action:{type:'uri',uri:new URL(base).origin+'/#indexing',label:'Dashboard'},height:'sm',style:'link',color:colors.blue}])};
 const carousel={type:'carousel',contents:[bubble,...sites.slice(0,5).map(s=>siteCard(s,base))]};
 const altText='SEO '+date+': '+healthy+'/'+sites.length+' sites up · '+n(indexed)+' indexed · '+n(excluded)+' excluded · '+n(pending)+' pending';
 return {type:'flex',altText:altText.slice(0,350),contents:carousel};
}
