import {buildDigest,buildDetailedDigest} from './digest-format.mjs';
const sites=['anytool.online','scholarportal.site','kmafaq.site','kmafaq.online','worksheet.live'].map((domain,i)=>({id:String(i),domain,status:'OK',sitemap:'OK',robots:'OK',issues:[]}));
const gsc={days:28,sites:sites.map((s,i)=>({id:s.id,domain:s.domain,clicks:i,impressions:100+i*20,range:{start:'2026-10-20',end:'2026-11-16'}}))};
const report=buildDigest({stamp:'2026-11-19',rows:sites,gsc,base:'https://seo-kmafaq.vercel.app'});
const detailed=buildDetailedDigest(report,sites.map((s,i)=>({...s,gsc:gsc.sites[i],indexing:{checked:10,indexed:5,notIndexed:4},actions:[]})),'https://seo-kmafaq.vercel.app');
for(const [name,item] of [['summary',report],['carousel',detailed]]){
 if(item.type!=='flex')throw Error('Expected visual Flex message');
 const size=Buffer.byteLength(JSON.stringify(item));
 if(size>50000)throw Error('Flex message exceeds safe LINE payload: '+name+' '+size);
 const token=process.env.LINE_CHANNEL_ACCESS_TOKEN;
 if(!token){console.log('SKIP validation without token');break}
 const response=await fetch('https://api.line.me/v2/bot/message/validate/push',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({messages:[item]})});
 const reason=await response.text();
 console.log('LINE_VALIDATE '+name+' HTTP '+response.status+' size='+size+' '+(response.ok?'PASS':reason.slice(0,2100)));
 if(!response.ok)process.exitCode=1;
}
