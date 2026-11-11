// LINE Flex cards for urgent health alerts and connection tests.
// Keep detailed issue explanations in the dashboard, not chat-length LINE text.
const colors={red:'#DC2626',green:'#16A34A',ink:'#0F172A',muted:'#64748B',blue:'#2563EB'};
const label=(value,opts={})=>({type:'text',text:String(value),size:'xs',color:colors.ink,...opts});
function buildHealthAlert(incidents,sites,stamp,base='https://seo-kmafaq.vercel.app'){
 const issues=Array.isArray(incidents)?incidents:[];
 const tiles=(sites||[]).slice(0,5).map(s=>{
  const bad=issues.some(x=>String(x).startsWith(s.domain+':'));
  return {type:'box',layout:'horizontal',margin:'sm',contents:[
   label(s.domain,{flex:3,weight:'bold'}),
   label(bad?'● CHECK':'● OK',{flex:1,align:'end',color:bad?colors.red:colors.green,weight:'bold'})
  ]};
 });
 const body=[
  label('SEO · LIVE HEALTH',{size:'xs',weight:'bold',color:colors.red}),
  label(issues.length+' alert'+(issues.length===1?'':'s'),{size:'xxl',weight:'bold',margin:'md'}),
  {type:'separator',margin:'lg'},
  ...tiles,
  {type:'separator',margin:'lg'},
  label('CHECK THE DASHBOARD',{color:colors.muted,weight:'bold',size:'xxs',margin:'md'}),
  label(String(stamp).slice(0,16)+' UTC',{color:colors.muted,size:'xxs',margin:'sm'})
 ];
 return {type:'flex',altText:'SEO health: '+issues.length+' issue'+(issues.length===1?'':'s')+' detected',contents:{
  type:'bubble',size:'mega',body:{type:'box',layout:'vertical',paddingAll:'18px',contents:body},
  footer:{type:'box',layout:'vertical',contents:[{type:'button',style:'link',color:colors.blue,action:{type:'uri',label:'Open SEO dashboard',uri:new URL(base).origin}}]}
 }};
}
function buildConnectionCard(stamp){
 return {type:'flex',altText:'SEO Control Center · LINE connected',contents:{
  type:'bubble',size:'mega',body:{type:'box',layout:'vertical',paddingAll:'20px',contents:[
   label('SEO CONTROL CENTER',{color:colors.blue,weight:'bold'}),
   label('CONNECTED',{color:colors.green,weight:'bold',size:'xxl',margin:'lg'}),
   label('● 5 websites monitored',{color:colors.ink,margin:'lg'}),
   label(String(stamp).slice(0,16)+' UTC',{color:colors.muted,size:'xxs',margin:'sm'})
  ]}
 }};
}
module.exports={buildHealthAlert,buildConnectionCard};
