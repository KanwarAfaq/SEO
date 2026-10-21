import { cwvGood, finite, portfolioSeries, pctChange } from './site-signals.mjs';
// One compact LINE Flex card; intentionally does not list page links or claim API acceptance means indexed.
const number = n => n == null || !Number.isFinite(Number(n)) ? '—' : Math.round(Number(n)).toLocaleString('en-US');
const cut = (s, max=50) => String(s || '').slice(0, max);
const color = { green:'#059669', red:'#DC2626', amber:'#D97706', slate:'#334155', muted:'#64748B', ink:'#0F172A', blue:'#2563EB', track:'#E2E8F0' };

function txt(text, opts={}) {
  return { type:'text', text:String(text), size:'xs', color:color.slate, wrap:false, ...opts };
}
function bar(value, total) {
  if (!total || !Number.isFinite(value)) return '────────';
  const n = Math.min(8, Math.max(0, Math.round(value / total * 8)));
  return '█'.repeat(n) + '░'.repeat(8-n);
}

const scoreColor = score => score == null ? color.muted : score >= 80 ? color.green : score >= 50 ? color.amber : color.red;
const arrow = pct => pct == null ? '' : pct > 0 ? '▲ +' + pct + '%' : pct < 0 ? '▼ ' + pct + '%' : '● 0%';
const arrowColor = pct => pct == null || pct === 0 ? color.muted : pct > 0 ? color.green : color.red;

// Flex has no chart element, so a sparkline is a row of bottom-aligned bars (works in every LINE client, no image hosting).
export function sparkBars(series, { height = 34, fill = color.blue } = {}) {
  if (!Array.isArray(series) || series.length < 2) return txt('Daily trend unavailable', { size: 'xxs', color: color.muted });
  const max = Math.max(...series, 1);
  return { type: 'box', layout: 'horizontal', height: height + 'px', alignItems: 'flex-end', spacing: 'xs', contents: series.map(v => ({
    type: 'box', layout: 'vertical', flex: 1, height: Math.max(3, Math.round(v / max * height)) + 'px',
    backgroundColor: v > 0 ? fill : color.track, cornerRadius: '2px', contents: [{ type: 'filler' }]
  })) };
}
// Health score bar: filled share of a grey track; width is a percentage so it scales on any screen.
export function scoreBar(score, { height = 6 } = {}) {
  const track = { type: 'box', layout: 'horizontal', height: height + 'px', backgroundColor: color.track, cornerRadius: '3px' };
  if (score == null) return { ...track, contents: [{ type: 'filler' }] };
  const pct = Math.max(2, Math.min(100, score));
  return { ...track, contents: [
    { type: 'box', layout: 'vertical', width: pct + '%', backgroundColor: scoreColor(score), cornerRadius: '3px', contents: [{ type: 'filler' }] }
  ] };
}
// Pass / fail / unknown dots per check, e.g. ● HTTP ● Sitemap ● CWV (grey = no data, never counted as pass).
export function checkDots(checks = []) {
  const contents = checks.flatMap(c => [
    { type: 'span', text: '● ', color: c.ok === null ? color.muted : c.ok ? color.green : color.red, size: 'xxs' },
    { type: 'span', text: c.key + '  ', color: color.slate, size: 'xxs' }
  ]);
  return { type: 'text', contents, wrap: true, size: 'xxs', margin: 'sm' };
}

export function buildDigest({ stamp, slot='', rows=[], details=[], gsc=null, indexing=null, submission=null, incidents=[], errors=[], base='' }) {
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
    const detail = details.find(d => d.id === row.id || d.domain === row.domain);
    const score = detail ? detail.score : null;
    const isUp = row.status==='OK' && row.sitemap==='OK';
    const measure = metric ? number(metric.clicks) + ' / ' + number(metric.impressions) : 'unavailable';
    const change = detail?.trend ? arrow(detail.trend.changePct) : '';
    return {
      type:'box',layout:'vertical',margin:'md',spacing:'xs',contents:[
        {type:'box',layout:'horizontal',contents:[
          txt('● '+cut(row.domain,28),{flex:5,color:isUp?color.green:color.red,weight:'bold'}),
          txt(score==null?'—':String(score),{align:'end',flex:1,color:scoreColor(score),weight:'bold'})
        ]},
        scoreBar(score),
        {type:'box',layout:'horizontal',contents:[
          txt(measure,{flex:5,size:'xxs',color:metric?color.ink:color.red}),
          txt(change,{align:'end',flex:3,size:'xxs',color:detail?.trend?arrowColor(detail.trend.changePct):color.muted})
        ]}
      ]
    };
  });
  const clicksSeries = portfolioSeries(valid, 14, 'clicks');
  const thisWeek = clicksSeries ? clicksSeries.slice(7).reduce((n,v)=>n+v,0) : null;
  const lastWeek = clicksSeries ? clicksSeries.slice(0,7).reduce((n,v)=>n+v,0) : null;
  const portfolioChange = clicksSeries ? pctChange(thisWeek, lastWeek) : null;
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
    (slot ? slot + ' · ' : '') + 'SEO ' + statusText + ' · ' + stamp,
    'GSC Web ' + (start&&end?start+'–'+end:'period unknown') + ': '+number(clicks)+' clicks / '+number(impressions)+' impressions',
    'Sites '+health+'/'+rows.length+' · Index inspection '+indexLabel,
    'Sitemaps '+submitLabel+' · Alerts '+affected
  ].join('\n').slice(0,380);
  const contents=[
    txt(statusText,{size:'xs',color:statusColor,weight:'bold'}),
    txt((slot ? slot.toUpperCase()+' · ' : '')+'SEO PORTFOLIO PULSE',{size:'lg',color:color.ink,weight:'bold',margin:'sm'}),
    txt(stamp,{color:color.muted,margin:'xs'}),
    {type:'separator',margin:'lg'},
    txt('GOOGLE SEARCH · WEB · '+(gsc?.days||28)+' DAYS',{size:'xxs',color:color.muted,weight:'bold',margin:'lg'}),
    {type:'box',layout:'horizontal',margin:'sm',contents:[
      {type:'box',layout:'vertical',flex:1,contents:[txt(number(clicks),{size:'xxl',weight:'bold',color:color.ink}),txt('Clicks',{color:color.muted})]},
      {type:'box',layout:'vertical',flex:1,contents:[txt(number(impressions),{size:'xxl',weight:'bold',color:color.ink}),txt('Impressions',{color:color.muted})]}
    ]},
    txt(start&&end?start+' to '+end+' · final data · Pacific dates':'GSC dates unavailable',{color:color.muted,size:'xxs',margin:'sm'}),
    ...(clicksSeries ? [
      {type:'box',layout:'horizontal',margin:'md',contents:[
        txt('CLICKS · LAST 14 DAYS',{size:'xxs',color:color.muted,weight:'bold',flex:5}),
        txt(portfolioChange==null?'no baseline':arrow(portfolioChange)+' vs prior 7d',{size:'xxs',align:'end',flex:5,color:arrowColor(portfolioChange),weight:'bold'})
      ]},
      {type:'box',layout:'vertical',margin:'sm',contents:[sparkBars(clicksSeries,{height:38})]}
    ] : []),
    {type:'separator',margin:'lg'},
    {type:'box',layout:'horizontal',margin:'lg',contents:[
      txt('SITES  '+health+'/'+rows.length+' UP',{weight:'bold'}),
      txt('Health score',{align:'end',size:'xxs',color:color.muted,flex:2})
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
export function buildDetailedDigest(summary, sites, base) {
  const cards = sites.slice(0, 11).map(s => {
    const g = s.gsc && !s.gsc.error ? s.gsc : null;
    const ga = s.ga4 && !s.ga4.error && s.ga4.configured !== false ? s.ga4 : null;
    const idx = s.indexing && !s.indexing.error ? s.indexing : null;
    const vitals = cwvGood(s.cwv);
    const body = [
      txt(s.domain, { size: 'lg', weight: 'bold', color: color.ink, wrap: true }),
      txt(s.actions.length ? 'REVIEW · ' + s.actions.length + ' actions' : 'NO PRIORITY ISSUE DETECTED', { color: s.actions.length ? color.red : color.green, weight: 'bold', margin: 'sm' }),
      { type: 'box', layout: 'horizontal', margin: 'md', contents: [
        txt('HEALTH SCORE', { size: 'xxs', weight: 'bold', color: color.muted, flex: 5 }),
        txt(s.score == null ? 'no data' : s.score + ' / 100', { size: 'xs', weight: 'bold', align: 'end', flex: 5, color: scoreColor(s.score) })
      ] },
      scoreBar(s.score, { height: 8 }),
      ...(s.checks ? [checkDots(s.checks)] : []),
      { type: 'box', layout: 'horizontal', margin: 'lg', contents: [
        txt('CLICKS · LAST 14 DAYS', { size: 'xxs', weight: 'bold', color: color.muted, flex: 5 }),
        txt(s.trend ? arrow(s.trend.changePct) || 'no baseline' : '', { size: 'xxs', weight: 'bold', align: 'end', flex: 5, color: s.trend ? arrowColor(s.trend.changePct) : color.muted })
      ] },
      { type: 'box', layout: 'vertical', margin: 'sm', contents: [sparkBars(s.series, { height: 36, fill: scoreColor(s.score) === color.red ? color.red : color.blue })] },
      txt(`HTTP ${s.status} · ${number(s.latency)} ms`, { margin: 'md' }),
      txt(`Robots ${s.robots} · Sitemap ${s.sitemap}`, { wrap: true }),
      txt(s.sitemapInfo ? `${number(s.sitemapInfo.entries)} ${s.sitemapInfo.kind} in sitemap` : 'Sitemap entries unavailable', { color: color.muted }),
      { type: 'separator', margin: 'md' },
      txt('GOOGLE SEARCH · FINAL 28 DAYS', { weight: 'bold', margin: 'md', size: 'xxs' }),
      txt(g ? `${number(g.clicks)} clicks / ${number(g.impressions)} impressions` : 'GSC unavailable — verify property access', { wrap: true, margin: 'xs' }),
      txt(g?.range ? `${g.range.start}–${g.range.end} · Pacific dates` : 'Date range unavailable', { color: color.muted, size: 'xxs' }),
      txt(g && g.impressions > 0 ? `CTR ${(Number(g.ctr) * 100).toFixed(1)}% · avg position ${Number(g.position).toFixed(1)}` : 'CTR / position: no measured impressions', { wrap: true }),
      txt(s.trend ? `7d clicks ${s.trend.recent} vs ${s.trend.prior} prior${s.trend.changePct === null ? ' · no baseline' : ' (' + s.trend.changePct + '%)'}` : 'Weekly trend unavailable', { wrap: true }),
      txt(ga ? `GA4 realtime: ${number(ga.activeUsers)} active users` : 'GA4 realtime unavailable / not configured', { wrap: true, margin: 'md' }),
      txt(vitals === null ? 'Core Web Vitals: insufficient/unavailable field data' : `Core Web Vitals: ${vitals ? 'GOOD' : 'NEEDS WORK'} · LCP ${s.cwv.lcp.p75}ms · INP ${s.cwv.inp.p75}ms · CLS ${s.cwv.cls.p75}`, { wrap: true }),
      { type: 'separator', margin: 'md' },
      txt('URL INSPECTION SAMPLE', { size: 'xxs', weight: 'bold', margin: 'md' }),
      txt(idx ? `${number(idx.indexed)} indexed / ${number(idx.checked)} checked · ${number(idx.notIndexed)} not indexed · ${number(idx.errors)} errors` : 'Inspection unavailable', { wrap: true }),
      txt(idx?.lastUpdated ? `Last scan: ${idx.lastUpdated.slice(0, 16)} UTC` : 'No saved scan yet', { size: 'xxs', color: color.muted, wrap: true }),
      txt('Sample only; not sitewide indexed totals.', { size: 'xxs', color: color.muted }),
      txt('PRIORITY NEXT STEPS', { size: 'xxs', weight: 'bold', margin: 'md' }),
      ...s.actions.slice(0, 3).map((a, i) => txt((i + 1) + '. ' + cut(a, 240), { wrap: true, margin: 'sm' })),
      ...(s.actions.length ? [] : [txt('Keep monitoring; review relevant search queries and helpful content.', { wrap: true, margin: 'sm' })])
    ];
    const card = { type: 'bubble', size: 'mega', body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: body } };
    try { const u = new URL(base); if (u.protocol === 'https:') card.footer = { type: 'box', layout: 'vertical', contents: [{ type: 'button', style: 'link', action: { type: 'uri', label: 'Open dashboard', uri: u.origin + '/#growth' } }] }; } catch {}
    return card;
  });
  return { ...summary, contents: { type: 'carousel', contents: [summary.contents, ...cards] } };
}
