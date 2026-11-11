import { cwvGood, finite } from './site-signals.mjs';
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
  const valid = rows.map(row => gsc?.sites?.find(s => s.id === row.id || s.domain === row.domain)).filter(s => s && !s.error && finite(s.clicks) && finite(s.impressions));
  const complete = rows.length > 0 && valid.length === rows.length && valid.every(s => s.range?.start === valid[0]?.range?.start && s.range?.end === valid[0]?.range?.end);
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
    txt('SEO PORTFOLIO PULSE',{size:'xl',color:color.ink,weight:'bold',margin:'sm'}),
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

// One push message, with a summary plus one swipeable detail card per site.
// Five short visual cards. Detailed explanations remain in the web dashboard and audit artifact.
export function buildDetailedDigest(summary, sites, base) {
  const maxImpressions=Math.max(1,...sites.map(s=>Number(s.gsc?.impressions||0)));
  const cards=sites.slice(0,5).map(s=>{
    const g=s.gsc&&!s.gsc.error?s.gsc:null;
    const idx=s.indexing&&!s.indexing.error?s.indexing:null;
    const checked=Number(idx?.checked||0),pass=Number(idx?.indexed||0),excluded=Number(idx?.notIndexed||0);
    const up=s.status==='OK'&&s.sitemap==='OK'&&s.robots==='OK';
    const graph=[
      {type:'box',layout:'horizontal',contents:[
        txt('INDEXED',{size:'xxs',color:color.green,flex:1}),
        txt('EXCLUDED',{size:'xxs',color:color.red,flex:1}),
        txt('OTHER',{size:'xxs',color:color.muted,flex:1})
      ]},
      {type:'box',layout:'horizontal',margin:'sm',contents:[
        txt(idx?number(pass):'—',{size:'lg',weight:'bold',color:color.green,flex:1}),
        txt(idx?number(excluded):'—',{size:'lg',weight:'bold',color:color.red,flex:1}),
        txt(idx?number(Math.max(0,checked-pass-excluded)):'—',{size:'lg',weight:'bold',color:color.muted,flex:1})
      ]},
      {type:'box',layout:'horizontal',height:'9px',cornerRadius:'5px',backgroundColor:'#E2E8F0',contents:
        idx&&checked>0?[
          {type:'box',layout:'vertical',flex:Math.max(1,pass),backgroundColor:color.green},
          {type:'box',layout:'vertical',flex:Math.max(1,excluded),backgroundColor:color.red},
          {type:'box',layout:'vertical',flex:Math.max(1,checked-pass-excluded),backgroundColor:'#CBD5E1'}
        ].filter((_,i)=>[pass,excluded,checked-pass-excluded][i]>0):
        [{type:'box',layout:'vertical',flex:1,backgroundColor:'#CBD5E1'}]
      }
    ];
    const body=[
      txt(s.domain,{size:'lg',weight:'bold',color:color.ink}),
      txt(up?'● UP':'● REVIEW',{color:up?color.green:color.red,weight:'bold',margin:'sm',size:'xxs'}),
      {type:'separator',margin:'lg'},
      txt('GOOGLE SEARCH · 28 DAYS',{size:'xxs',color:color.muted,weight:'bold',margin:'md'}),
      {type:'box',layout:'horizontal',margin:'sm',contents:[
        {type:'box',layout:'vertical',flex:1,contents:[txt(g?number(g.clicks):'—',{size:'xxl',weight:'bold'}),txt('CLICKS',{size:'xxs',color:color.muted})]},
        {type:'box',layout:'vertical',flex:1,contents:[txt(g?number(g.impressions):'—',{size:'xxl',weight:'bold'}),txt('IMPRESSIONS',{size:'xxs',color:color.muted})]}
      ]},
      {type:'box',layout:'horizontal',height:'6px',margin:'md',cornerRadius:'3px',contents:[
        {type:'box',layout:'vertical',flex:Math.max(1,Number(g?.impressions||0)),backgroundColor:color.blue},
        {type:'box',layout:'vertical',flex:Math.max(1,maxImpressions-Number(g?.impressions||0)),backgroundColor:'#E2E8F0'}
      ]},
      {type:'separator',margin:'lg'},
      txt('GOOGLE URL INSPECTIONS · SAMPLE',{size:'xxs',color:color.muted,weight:'bold',margin:'md'}),
      ...graph,
      txt('Inspected URLs only; not full index coverage',{size:'xxs',color:color.muted,wrap:true,margin:'sm'}),
      txt(s.actions?.length?'● '+s.actions.length+' flagged':'● No priority alerts',{size:'xxs',color:s.actions?.length?color.red:color.green,margin:'md'})
    ];
    const card={type:'bubble',size:'mega',body:{type:'box',layout:'vertical',paddingAll:'18px',contents:body}};
    try{const u=new URL(base);if(u.protocol==='https:')card.footer={type:'box',layout:'vertical',contents:[
      {type:'button',style:'link',height:'sm',action:{type:'uri',label:'Dashboard',uri:u.origin+'/#indexing'},color:color.blue}
    ]}}catch{}
    return card;
  });
  return {...summary,contents:{type:'carousel',contents:[summary.contents,...cards]}};
}
