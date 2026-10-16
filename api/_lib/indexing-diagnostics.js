const RULES=[
  {key:'noindex',severity:'critical',label:'Blocked by noindex',
    action:'Remove unintended noindex meta or X-Robots-Tag on pages meant for search',
    match:r=>/BLOCKED_BY_META_TAG|BLOCKED_BY_HTTP_HEADER|noindex/i.test(r.indexingState||'')||/noindex/i.test(r.coverageState||'')},
  {key:'robots',severity:'high',label:'Blocked by robots.txt',
    action:'Remove unintended robots.txt disallow rules; verify crawling is safe before indexing',
    match:r=>/BLOCKED/i.test(r.robotsTxtState||'')||/robots.txt/i.test(r.coverageState||'')},
  {key:'server_or_missing',severity:'high',label:'Page fetch or HTTP failure',
    action:'Fix HTTP 4xx/5xx, broken redirects and availability before requesting recrawl',
    match:r=>/NOT_FOUND|SOFT_404|SERVER_ERROR|ACCESS_DENIED|BLOCKED_4XX|BLOCKED_5XX/i.test(r.pageFetchState||'')||/not found|server error|soft 404/i.test(r.coverageState||'')},
  {key:'canonical',severity:'high',label:'Canonical or duplicate mismatch',
    action:'Check rel=canonical, duplicate URLs, redirects and internal links; use one preferred indexable URL',
    match:r=>Boolean(r.googleCanonical&&r.userCanonical&&r.googleCanonical!==r.userCanonical)||
      /Duplicate|Alternate page|canonical/i.test(r.coverageState||'')},
  {key:'discovered',severity:'medium',label:'Discovered, not indexed',
    action:'Improve important pages, relevant internal linking, sitemap accuracy and crawl accessibility',
    match:r=>/Discovered.*not indexed/i.test(r.coverageState||'')},
  {key:'crawled',severity:'medium',label:'Crawled, not indexed',
    action:'Evaluate originality, quality, duplication, helpfulness and internal links; avoid thin mass-produced pages',
    match:r=>/Crawled.*not indexed/i.test(r.coverageState||'')}
];

function reason(record){
  if(!record||record.error)return null;
  if(record.verdict==='PASS')return {key:'indexed',severity:'none',label:'Indexed',action:''};
  const hit=RULES.find(x=>x.match(record));
  return hit?{key:hit.key,severity:hit.severity,label:hit.label,action:hit.action}:
    {key:'other',severity:'low',label:record.coverageState||'Other / unknown indexing status',
      action:'Inspect the URL in Search Console and compare the Google-selected and declared canonicals'};
}
function summarizeReasons(records,urls){
  const groups=new Map();
  for(const url of urls){
    const r=records[url];
    if(!r||r.error||r.verdict==='PASS')continue;
    const d=reason(r);
    if(!d)continue;
    const current=groups.get(d.key)||{reason:d.key,label:d.label,severity:d.severity,count:0,
      exampleUrl:url,action:d.action};
    current.count++;groups.set(d.key,current);
  }
  const severityRank={critical:4,high:3,medium:2,low:1};
  return [...groups.values()].sort((a,b)=>
    (severityRank[b.severity]-severityRank[a.severity])||b.count-a.count);
}

module.exports={reason,summarizeReasons};
