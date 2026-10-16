function normal(url){
  try{
    const u=new URL(url);return u.hostname.toLowerCase().replace(/^www\./,'')+
      (u.pathname.replace(/\/+$/,'')||'/')+u.search;
  }catch{return null;}
}

function extendedChecks({url,html,canonical,headers}){
  const issues=[];
  const add=(code,severity,message,fix)=>issues.push({code,severity,message,fix});
  const robotsHeader=String(headers?.get?.('x-robots-tag')||'');
  const googlebot=(html.match(/<meta\b[^>]*name=["']googlebot["'][^>]*>/i)||[])[0]||'';
  if(/noindex/i.test(robotsHeader)||/noindex/i.test(googlebot))
    add('noindex_header','critical','X-Robots-Tag or Googlebot meta contains noindex',
      'Remove unintended noindex directive from indexable pages');
  if(canonical&&normal(canonical)&&normal(canonical)!==normal(url))
    add('canonical_mismatch','high','Declared canonical differs from the requested page',
      'Review canonical and redirect strategy. Use the preferred indexable URL in internal links and sitemaps.');
  if(!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html))
    add('html_lang_missing','low','HTML language is missing','Set the correct lang attribute on the html element.');
  if(!/<meta\b[^>]*property=["']og:title["']/i.test(html))
    add('og_title_missing','low','Open Graph title is missing','Add a unique og:title for social previews');
  if(!/<meta\b[^>]*property=["']og:image["']/i.test(html))
    add('og_image_missing','low','Open Graph image is missing','Add an appropriate share image for important pages');
  const schema=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const match of schema){
    try{JSON.parse(match[1].trim());}
    catch{add('invalid_jsonld','high','Structured-data JSON-LD cannot be parsed','Fix invalid JSON syntax and validate in Google Rich Results Test');}
  }
  if((html.match(/<(?:img|script|iframe)\b[^>]*\bsrc=["']http:\/\//gi)||[]).length)
    add('mixed_content','medium','Insecure HTTP resources found on page','Replace http resources with HTTPS where supported');
  return {issues,checks:{xRobotsTag:robotsHeader,schemaScripts:schema.length}};
}
module.exports={extendedChecks,normal};
