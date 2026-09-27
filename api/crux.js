const { getSites } = require('./_lib/config');

const METRICS = ['largest_contentful_paint','interaction_to_next_paint','cumulative_layout_shift','first_contentful_paint'];

function summarize(metric) {
  if (!metric) return null;
  return {
    p75: metric.percentiles?.p75 ?? null,
    good: metric.histogram?.[0]?.density ?? null,
    needsImprovement: metric.histogram?.[1]?.density ?? null,
    poor: metric.histogram?.[2]?.density ?? null
  };
}

async function query(origin, history=false) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is required for CrUX');
  const endpoint = history ? 'records:queryHistoryRecord' : 'records:queryRecord';
  const r = await fetch('https://chromeuxreport.googleapis.com/v1/' + endpoint + '?key=' + encodeURIComponent(key), {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ origin, metrics: METRICS })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || ('CrUX ' + r.status));
  return d.record;
}

module.exports = async function handler(req,res) {
  res.setHeader('cache-control','no-store');
  const mode = req.query?.history === '1' ? 'history' : 'current';
  const requested = req.query?.site;
  const sites = requested ? getSites().filter(s => s.id === requested) : getSites();
  const out = [];
  for (const site of sites) {
    try {
      const record = await query(site.url, mode === 'history');
      if (mode === 'history') {
        out.push({
          id: site.id,
          domain: site.domain,
          collectionPeriods: record.collectionPeriods || [],
          metrics: record.metrics || {}
        });
      } else {
        const m = record.metrics || {};
        out.push({
          id: site.id,
          domain: site.domain,
          formFactor: record.key?.formFactor || null,
          lcp: summarize(m.largest_contentful_paint),
          inp: summarize(m.interaction_to_next_paint),
          cls: summarize(m.cumulative_layout_shift),
          fcp: summarize(m.first_contentful_paint)
        });
      }
    } catch (e) { out.push({ id: site.id, domain: site.domain, error: e.message }); }
  }
  res.status(200).json({ mode, sites: out });
};
