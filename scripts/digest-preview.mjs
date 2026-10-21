// Standalone visual report (no external assets) saved next to every digest run as reports/digest-preview.html.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => n == null || !Number.isFinite(Number(n)) ? '—' : Math.round(Number(n)).toLocaleString('en-US');
const tone = score => score == null ? '#64748b' : score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';

function spark(series, color) {
  if (!Array.isArray(series) || series.length < 2) return '<div class="na">Daily trend unavailable</div>';
  const max = Math.max(...series, 1);
  const bw = 100 / series.length;
  const bars = series.map((v, i) => {
    const h = Math.max(3, v / max * 100);
    return `<rect x="${(i * bw + bw * .12).toFixed(2)}" y="${(100 - h).toFixed(2)}" width="${(bw * .76).toFixed(2)}" height="${h.toFixed(2)}" rx="1.2" fill="${v > 0 ? color : '#e2e8f0'}"><title>${v} clicks</title></rect>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="spark" role="img" aria-label="Clicks, last ${series.length} days">${bars}</svg>`;
}
const dots = (checks = []) => checks.map(c => `<span class="chip ${c.ok === null ? 'na' : c.ok ? 'ok' : 'bad'}">${esc(c.key)}</span>`).join('');
const delta = t => !t || t.changePct == null ? '<span class="d n">no baseline</span>' : `<span class="d ${t.changePct >= 0 ? 'up' : 'down'}">${t.changePct >= 0 ? '▲ +' : '▼ '}${t.changePct}% vs prior 7d</span>`;

export function renderPreview(report, stamp, slot = '') {
  const sites = report.sites || [];
  const known = sites.filter(s => s.score != null);
  const avg = known.length ? Math.round(known.reduce((n, s) => n + s.score, 0) / known.length) : null;
  const cards = sites.map(s => {
    const g = s.gsc && !s.gsc.error ? s.gsc : null;
    return `<article class="card">
      <header><h2>${esc(s.domain)}</h2><b style="color:${tone(s.score)}">${s.score == null ? '—' : s.score}</b></header>
      <div class="bar"><i style="width:${s.score == null ? 0 : Math.max(2, s.score)}%;background:${tone(s.score)}"></i></div>
      <div class="chips">${dots(s.checks)}</div>
      <p class="k">GOOGLE SEARCH · LAST 28 FINAL DAYS</p>
      <p class="big">${g ? num(g.clicks) : '—'} <small>clicks</small> · ${g ? num(g.impressions) : '—'} <small>impressions</small></p>
      <p class="k">CLICKS · LAST 14 DAYS ${delta(s.trend)}</p>
      ${spark(s.series, '#2563eb')}
      <p class="meta">HTTP ${esc(s.status)} · ${num(s.latency)} ms · Robots ${esc(s.robots)} · Sitemap ${esc(s.sitemap)}</p>
      ${s.actions?.length ? `<ol>${s.actions.slice(0, 3).map(a => `<li>${esc(String(a).slice(0, 200))}</li>`).join('')}</ol>` : '<p class="ok-line">No priority issue detected</p>'}
    </article>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO digest ${esc(stamp)}</title><style>
:root{color-scheme:light dark;--bg:#f4f7fb;--card:#fff;--ink:#0f172a;--mut:#64748b;--line:#e2e8f0}
@media(prefers-color-scheme:dark){:root{--bg:#0b1120;--card:#121a2e;--ink:#e8eefc;--mut:#94a3b8;--line:#243049}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,sans-serif;padding:20px 16px 40px}
main{max-width:1100px;margin:auto}h1{margin:0;font-size:24px}.sub{color:var(--mut);margin:4px 0 18px}
.top{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 18px;min-width:140px}
.stat b{display:block;font-size:26px}.stat span{color:var(--mut);font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
.card header{display:flex;justify-content:space-between;align-items:baseline}.card h2{margin:0;font-size:16px}.card header b{font-size:26px}
.bar{height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin:8px 0}.bar i{display:block;height:100%;border-radius:4px}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}.chip{font-size:11px;padding:2px 8px;border-radius:99px;border:1px solid}
.chip.ok{color:#059669;border-color:#a7e3cf}.chip.bad{color:#dc2626;border-color:#f3b4b4}.chip.na{color:#64748b;border-color:var(--line)}
.k{font-size:10px;letter-spacing:.08em;color:var(--mut);font-weight:700;margin:12px 0 2px}.big{font-size:20px;font-weight:700;margin:0}.big small{font-size:12px;color:var(--mut);font-weight:400}
.spark{width:100%;height:56px;display:block}.na{color:var(--mut);font-size:12px}.meta{color:var(--mut);font-size:12px;margin:10px 0 6px}
.d{font-size:11px;margin-left:6px;text-transform:none;letter-spacing:0}.d.up{color:#059669}.d.down{color:#dc2626}.d.n{color:var(--mut)}
ol{margin:6px 0 0;padding-left:18px;font-size:12px}.ok-line{color:#059669;font-size:12px;margin:6px 0 0}
</style></head><body><main>
<h1>${esc(slot ? slot + ' · ' : '')}SEO portfolio digest</h1><p class="sub">${esc(stamp)} · GSC is finalized Web data, not real-time · URL Inspection is a sample</p>
<div class="top"><div class="stat"><b>${report.healthy}/${report.total}</b><span>sites fully healthy</span></div><div class="stat"><b style="color:${tone(avg)}">${avg ?? '—'}</b><span>average health score</span></div><div class="stat"><b>${report.incidentCount}</b><span>incidents</span></div><div class="stat"><b>${report.signals?.errors?.length ?? 0}</b><span>data gaps</span></div></div>
<div class="grid">${cards}</div></main></body></html>`;
}
