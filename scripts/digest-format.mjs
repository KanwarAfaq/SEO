// One compact LINE Flex card; intentionally does not list page links or claim API acceptance means indexed.
const number = n => n == null || !Number.isFinite(Number(n)) ? '—' : Math.round(Number(n)).toLocaleString('en-US');
const cut = (s, max=50) => String(s || '').slice(0, max);
const color = { green:'#059669', red:'#DC2626', slate:'#334155', muted:'#64748B', ink:'#0F172A', blue:'#2563EB' };

function txt(text, opts={}) {
  return { type:'text', text:String(text), size:'xs', color:color.slate, wrap:false, ...opts };
}
function bar(value, total) {
  if (!total || !Number.isFinite(value)) return '────────';
  const n = Math.min(8, Math.max(0, Math.round(value / total * 8)));
  return '█'.repeat(n) + '░'.repeat(8-n);
}

export function buildDigest({ stamp, rows=[], gsc=null, indexing=null, submission=null, incidents=[], errors=[], base='' }) {
  const valid = gsc?.sites?.filter(s => !s.error) || [];
  const complete = rows.length > 0 && valid.length === rows.length;
  const clicks = complete ? valid.reduce((n,s)=>n+Number(s.clicks||0),0) : null;
  const impressions = complete ? valid.reduce((n,s)=>n+Number(s.impressions||0),0) : null;
  const range = valid[0]?.range;
  const sameRange = valid.every(s=>s.range?.start===range?.start && s.range?.end===range?.end);
  const start = sameRange ? range?.start : null;
  const end = sameRange ? range?.end : null;
  const health = rows.filter(r=>r.status==='OK'&&r.sitemap==='OK').length;
  const indexingChecked = Number(indexing?.checked||0);
  const indexed = Number(indexing?.indexed||0);
  const affected = incidents.length + errors.length + Number(submission?.counts?.failed||0);
  const statusText = affected || !complete ? 'NEEDS REVIEW' : 'HEALTHY';
  const statusColor = affected || !complete ? color.red : color.green;
  const perSite = rows.map(row => ({ ...row, metric:valid.find(v=>v.id===row.id || v.domain===row.domain) }));
  const biggest = valid.reduce((n,s)=>n+Number(s.impressions||0),0);
  const lines = perSite.map(row=>{
    const metric = row.metric;
    const isUp = row.status==='OK' && row.sitemap==='OK';
    const measure = metric ? number(metric.clicks) + ' / ' + number(metric.impressions) : 'unavailable';
    return {
      type:'box',layout:'vertical',margin:'md',spacing:'xs',contents:[
        {type:'box',layout:'horizontal',contents:[
          txt((isUp?'● ':'● ')+cut(row.domain,32),{flex:5,color:isUp?color.green:color.red,weight:'bold'}),
          txt(measure,{align:'end',flex:5,color:metric?color.ink:color.red})
        ]},
        txt(metric?bar(Number(metric.impressions||0),biggest):'────────',{color:color.blue,size:'xxs'})
      ]
    };
  });
  const indexLabel = indexing
    ? number(indexed) + ' indexed / ' + number(indexingChecked) + ' inspected'
    : 'Inspection data unavailable';
  const submitLabel = submission
    ? number(submission.counts?.submitted) + ' submitted · ' + number(submission.counts?.current) + ' current' +
      (submission.counts?.failed ? ' · ' + number(submission.counts.failed) + ' failed' : '')
    : 'Not checked';
  const issuesSummary = incidents.length ? cut(incidents[0],80) : errors.length ? cut(errors[0],80) :
    submission?.counts?.failed ? 'Sitemap submission errors' : !complete ? 'GSC data incomplete' : 'No critical issues detected';
  const summary = [
    'SEO ' + statusText + ' · ' + stamp,
    'GSC Web ' + (start&&end?start+'–'+end:'period unknown') + ': '+number(clicks)+' clicks / '+number(impressions)+' impressions',
    'Sites '+health+'/'+rows.length+' · Index inspection '+indexLabel,
    'Sitemaps '+submitLabel+' · Alerts '+affected
  ].join('\n').slice(0,380);
  const contents=[
    txt(statusText,{size:'xs',color:statusColor,weight:'bold'}),
    txt('SEO DAILY PULSE',{size:'xl',color:color.ink,weight:'bold',margin:'sm'}),
    txt(stamp,{color:color.muted,margin:'xs'}),
    {type:'separator',margin:'lg'},
    txt('GOOGLE SEARCH · WEB · '+(gsc?.days||28)+' DAYS',{size:'xxs',color:color.muted,weight:'bold',margin:'lg'}),
    {type:'box',layout:'horizontal',margin:'sm',contents:[
      {type:'box',layout:'vertical',flex:1,contents:[txt(number(clicks),{size:'xxl',weight:'bold',color:color.ink}),txt('Clicks',{color:color.muted})]},
      {type:'box',layout:'vertical',flex:1,contents:[txt(number(impressions),{size:'xxl',weight:'bold',color:color.ink}),txt('Impressions',{color:color.muted})]}
    ]},
    txt(start&&end?start+' to '+end+' · final data · Pacific dates':'GSC dates unavailable',{color:color.muted,size:'xxs',margin:'sm'}),
    {type:'separator',margin:'lg'},
    {type:'box',layout:'horizontal',margin:'lg',contents:[
      txt('SITES  '+health+'/'+rows.length+' UP',{weight:'bold'}),
      txt('Clicks / Impressions',{align:'end',size:'xxs',color:color.muted,flex:2})
    ]},
    ...lines,
    {type:'separator',margin:'lg'},
    txt('INDEX INSPECTION',{weight:'bold',margin:'lg',size:'xxs',color:color.muted}),
    txt(indexLabel,{weight:'bold',margin:'xs',color:color.ink}),
    txt('Sample of sitemap URLs; not GSC sitewide indexing totals',{size:'xxs',color:color.muted,wrap:true,margin:'xs'}),
    txt('Sitemap sync: '+submitLabel,{margin:'md',wrap:true}),
    txt('Alerts: '+affected+' · '+issuesSummary,{margin:'md',wrap:true,color:affected?color.red:color.green})
  ];
  const body={type:'box',layout:'vertical',paddingAll:'18px',spacing:'none',contents};
  const bubble={type:'bubble',size:'mega',body};
  try{
    const u=new URL(base);
    if(u.protocol==='https:') bubble.footer={type:'box',layout:'vertical',contents:[
      {type:'button',style:'link',height:'sm',color:color.blue,action:{type:'uri',label:'Open SEO dashboard',uri:u.origin}}
    ]};
  }catch{}
  return {type:'flex',altText:summary,contents:bubble};
}
