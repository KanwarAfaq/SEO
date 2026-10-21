(function() {
  const M = window.SEOModel, $ = id => document.getElementById(id);
  const clean = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => M.finite(n) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—';
  const pct = n => M.finite(n) ? Number(n).toFixed(1) + '%' : 'No baseline';
  const badge = (text, type = 'warn') => '<span class="tag ' + type + '">' + clean(text) + '</span>';
  const card = (title, value, note) => '<div class="metric-card"><span>' + clean(title) + '</span><strong>' + clean(value) + '</strong><small>' + clean(note) + '</small></div>';
  const colors = ['#245bdb', '#16866e', '#9255bd', '#dc8236', '#42899e'];
  let data = null, range = 28, siteId = 'all', metric = 'impressions', sequence = 0;
  const find = (source, id) => data?.[source]?.sites?.find(s => s.id === id);
  const selected = () => (data?.registry || []).filter(s => siteId === 'all' || s.id === siteId);
  function renderChart(summary) {
    const a = summary.points, b = summary.priorPoints;
    if (!a.length) { $('growthTimeline').innerHTML = '<p class="growth-empty">Search history unavailable. Other signals are shown below.</p>'; $('growthDaily').innerHTML = '<tr><td colspan="4">No data</td></tr>'; return; }
    const high = Math.max(1, ...a.map(p => p.value), ...b.map(p => p.value));
    const line = points => points.map((p, i) => (i ? 'L' : 'M') + (46 + i / Math.max(1, points.length - 1) * 608).toFixed(1) + ',' + (199 - p.value / high * 164).toFixed(1)).join(' ');
    const grid = [0, .5, 1].map(f => '<line x1="46" x2="654" y1="' + (199 - f * 164) + '" y2="' + (199 - f * 164) + '" stroke="#e5ecf4"/><text x="40" y="' + (203 - f * 164) + '" text-anchor="end">' + clean(fmt(high * f)) + '</text>').join('');
    $('growthTimeline').innerHTML = '<svg viewBox="0 0 680 235" role="img" aria-label="' + clean(metric + ' comparison. Exact values in daily data table below.') + '"><g font-size="10" fill="#607188">' + grid + '<text x="46" y="224">' + a[0].date + '</text><text x="654" y="224" text-anchor="end">' + a.at(-1).date + '</text></g>' + (b.length ? '<path d="' + line(b) + '" fill="none" stroke="#9babc3" stroke-width="2" stroke-dasharray="6 5"/>' : '') + '<path d="' + line(a) + '" fill="none" stroke="#245bdb" stroke-width="3" stroke-linejoin="round"/></svg>';
    $('growthDaily').innerHTML = a.map((p, i) => '<tr><td>' + p.date + '</td><td>' + fmt(p.value) + '</td><td>' + (b[i]?.date || '—') + '</td><td>' + fmt(b[i]?.value) + '</td></tr>').join('');
  }
  function render() {
    if (!data) return;
    const s = M.summarize(data.registry, data.gsc, siteId, metric), known = s.valid.length, total = s.selected.length;
    const delta = s.previous ? M.change(s.current.clicks, s.previous.clicks) : null;
    const period = s.range ? s.range.start + ' to ' + s.range.end : 'Date range unavailable';
    $('growthStatus').textContent = period + ' · Pacific dates · ' + known + '/' + total + ' sites with usable GSC data';
    $('growthUpdated').textContent = 'Refreshed ' + new Date(data.loadedAt).toLocaleTimeString();
    $('growthSummary').innerHTML = '<div><span class="eyebrow">' + (s.complete ? 'MEASURED PORTFOLIO' : 'PARTIAL DATA') + '</span><h2>' + (known ? fmt(s.current.clicks) + ' search clicks across ' + known + ' website' + (known === 1 ? '' : 's') : 'Search data needs attention') + '</h2><p>' + (s.previous ? (delta === null ? 'No clicks in the prior period; a percentage change would be misleading.' : (delta >= 0 ? '+' : '') + pct(delta) + ' versus the previous ' + range + ' calendar days.') : 'A complete prior-period baseline is unavailable.') + ' ' + (!s.complete ? 'Totals include available sites only.' : 'Finalized Google data; not today’s traffic.') + '</p></div>' + badge(s.complete ? 'GSC ready' : 'Review data sources', s.complete ? 'good' : 'warn');
    $('growthMetrics').innerHTML = [card('Search clicks', known ? fmt(s.current.clicks) : '—', known + '/' + total + ' sites · ' + range + ' days'), card('Impressions', known ? fmt(s.current.impressions) : '—', s.complete ? 'Finalized Web search data' : 'Partial / unavailable coverage'), card('Click-through rate', s.current.ctr === null ? '—' : pct(s.current.ctr * 100), 'Clicks ÷ impressions'), card('Average position', fmt(s.current.position), 'Weighted by impressions; lower is better')].join('');
    renderChart(s);
    const contribution = [...s.valid].sort((a, b) => b.metric[metric] - a.metric[metric]);
    const combined = contribution.reduce((n, x) => n + Number(x.metric[metric]), 0);
    $('growthShare').innerHTML = contribution.length ? contribution.map((x, i) => '<div class="share-row"><div><span>' + clean(x.domain) + '</span><b>' + fmt(x.metric[metric]) + '</b></div><div class="share-track"><i style="width:' + (combined ? Number(x.metric[metric]) / combined * 100 : 0) + '%;background:' + colors[i % colors.length] + '"></i></div><small>' + (combined ? pct(Number(x.metric[metric]) / combined * 100) + ' of measured ' + metric : 'No ' + metric + ' in this period') + '</small></div>').join('') : '<p class="growth-empty">No measured contribution yet.</p>';
    $('growthSites').innerHTML = s.rows.map(row => { const x = row.metric; if (!M.usable(x)) return '<tr><td>' + clean(row.domain) + '</td><td colspan="5">' + badge(x?.error || 'Data unavailable') + '</td></tr>'; return '<tr><td>' + clean(row.domain) + '</td><td>' + fmt(x.clicks) + '</td><td>' + fmt(x.impressions) + '</td><td>' + (x.impressions ? pct(x.ctr * 100) : '—') + '</td><td>' + (M.usable(x.comparison) ? pct(M.change(x.clicks, x.comparison.clicks)) : 'No baseline') + '</td><td>' + badge(x.impressions < 30 ? 'Small sample' : 'Measured', 'good') + '</td></tr>'; }).join('');
    renderIndex(); renderConnections(); renderActions(); renderHistory();
    $('growthErrors').innerHTML = Object.entries(data.errors).map(([name, error]) => '<p><b>' + clean(name) + ':</b> ' + clean(error) + '</p>').join('');
    document.querySelectorAll('[data-growth-range]').forEach(b => { const active = Number(b.dataset.growthRange) === range; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  }
  function renderIndex() {
    const sites = selected().map(s => ({ ...s, item: find('index', s.id) })).map(s => ({ ...s, counts: M.indexSegments(s.item) }));
    const valid = sites.filter(s => s.counts), sum = key => valid.reduce((n, s) => n + s.counts[key], 0), partial = valid.length + '/' + sites.length + ' sites';
    $('growthIndex').innerHTML = [card('Sitemap URLs', valid.length ? fmt(sum('total')) : '—', partial), card('Indexed in sample', valid.length ? fmt(sum('indexed')) : '—', 'Google inspection PASS'), card('Not indexed in sample', valid.length ? fmt(sum('excluded')) : '—', 'Review exclusion reasons'), card('Unchecked / errors', valid.length ? fmt(sum('unchecked')) : '—', 'Unknown, not proof of exclusion')].join('');
    $('growthIndexBars').innerHTML = sites.map(s => {
      const c = s.counts;
      if (!c) return '<div class="index-row"><b>' + clean(s.domain) + '</b><p>Inspection unavailable</p></div>';
      const width = value => c.total ? value * 100 / c.total : 0;
      return '<div class="index-row"><div><b>' + clean(s.domain) + '</b><span>' + c.percent + '% inspected</span></div><div class="crawl-bar" role="img" aria-label="' + clean(s.domain + ': ' + c.indexed + ' indexed, ' + c.excluded + ' not indexed, ' + c.unchecked + ' unknown') + '"><i class="crawl-segment indexed" style="width:' + width(c.indexed) + '%"></i><i class="crawl-segment excluded" style="width:' + width(c.excluded) + '%"></i><i class="crawl-segment unchecked" style="width:' + width(c.unchecked) + '%"></i></div><small>' + c.indexed + ' indexed · ' + c.excluded + ' not indexed · ' + c.unchecked + ' unknown (' + c.errors + ' API errors) · Last scan: ' + clean(s.item.lastUpdated ? new Date(s.item.lastUpdated).toLocaleString() : 'not started') + '</small></div>';
    }).join('');
    $('growthIndexReasons').innerHTML = sites.flatMap(s => (s.item?.indexingReasons || []).slice(0, 2).map(r => '<p><b>' + clean(s.domain) + ':</b> ' + clean(r.label) + ' · ' + fmt(r.count) + ' URLs — ' + clean(r.action) + '</p>')).join('') || 'No exclusion diagnoses returned. This does not prove that every URL is indexed.';
  }
  function renderConnections() {
    $('growthConnections').innerHTML = selected().map(s => {
      const h = find('health', s.id), g = find('gsc', s.id), ga = find('ga', s.id), v = find('cwv', s.id);
      const vitals = v && !v.error && [v.lcp?.p75, v.inp?.p75, v.cls?.p75].every(M.finite);
      return '<tr><td>' + clean(s.domain) + '</td><td>' + badge(h ? (h.ok && h.sitemapOk ? 'Ready' : 'Check site / sitemap') : 'Unavailable', h?.ok && h.sitemapOk ? 'good' : 'warn') + '</td><td>' + badge(M.usable(g) ? 'Ready' : g?.error || 'Unavailable', M.usable(g) ? 'good' : 'warn') + '</td><td>' + badge(ga?.configured && !ga.error ? 'Ready · ' + fmt(ga.activeUsers) + ' active' : ga?.error || 'Not configured / unavailable', ga?.configured && !ga.error ? 'good' : 'warn') + '</td><td>' + badge(vitals ? 'Field data available' : 'Insufficient / unavailable', vitals ? 'good' : 'warn') + '</td></tr>';
    }).join('');
  }
  function renderActions() {
    const actions = [];
    for (const s of selected()) {
      const h = find('health', s.id), g = find('gsc', s.id), ga = find('ga', s.id), idx = find('index', s.id);
      if (h && (!h.ok || !h.sitemapOk)) actions.push({ rank: 0, site: s.domain, title: 'Restore crawl access', text: 'Check homepage HTTP status and sitemap content before other optimization.' });
      if (!M.usable(g)) actions.push({ rank: 1, site: s.domain, title: 'Verify Search Console access', text: g?.error || 'The property did not return usable search data.' });
      if (!ga?.configured || ga.error) actions.push({ rank: 1, site: s.domain, title: 'Verify GA4 connection', text: ga?.error || 'Set the GA4 property ID and grant the service account Viewer access.' });
      for (const r of (idx?.indexingReasons || []).slice(0, 1)) actions.push({ rank: r.severity === 'critical' ? 0 : 2, site: s.domain, title: r.label + ' · ' + r.count + ' inspected URLs', text: r.action });
      if (M.usable(g) && M.usable(g.comparison) && g.comparison.clicks >= 30 && M.change(g.clicks, g.comparison.clicks) <= -30) actions.push({ rank: 1, site: s.domain, title: 'Investigate falling search clicks', text: pct(M.change(g.clicks, g.comparison.clicks)) + ' over equal calendar periods. Check page/query changes and seasonality before changing content.' });
    }
    if (!actions.length) actions.push({ rank: 3, site: 'Portfolio', title: 'No priority issue detected by these checks', text: 'Review queries with meaningful impressions, improve useful content, and keep monitoring. This is not a complete SEO audit.' });
    $('growthRecommendations').innerHTML = actions.sort((a, b) => a.rank - b.rank).slice(0, 10).map(a => '<article class="growth-action"><span>' + badge(a.rank === 0 ? 'High priority' : a.rank === 1 ? 'Needs attention' : 'Review', a.rank === 0 ? 'bad' : 'warn') + '</span><small>' + clean(a.site) + '</small><h4>' + clean(a.title) + '</h4><p>' + clean(a.text) + '</p></article>').join('');
  }
  function renderHistory() {
    const ids = new Set(selected().map(s => s.id));
    const rows = (data.history?.snapshots || []).filter(s => s.source === 'agent' && ids.has(s.site_id)).slice(0, 12);
    $('growthHistory').innerHTML = rows.length ? rows.map(s => '<tr><td>' + clean(s.site_id) + '</td><td>' + clean(s.captured_at) + '</td><td>' + fmt(s.gsc_impressions) + '</td><td>' + fmt(s.gsc_clicks) + '</td><td>' + fmt(s.technical_score) + '</td></tr>').join('') : '<tr><td colspan="5">No history loaded. Use your admin key in Settings for protected records.</td></tr>';
    const digests = (data.history?.digests || []).slice(0, 4);
    $('growthDigests').innerHTML = digests.length ? digests.map(d => '<div class="digest-row"><b>' + clean(d.sent_at ? new Date(d.sent_at).toLocaleString() : 'No sent timestamp') + '</b>' + badge(d.status || 'Unknown', d.status === 'sent' ? 'good' : 'warn') + '<span>' + clean(d.summary || 'No summary') + '</span></div>').join('') : '<p class="panel-copy">No notification history loaded. Use your admin key in Settings or check the monitor workflow logs.</p>';
    const referrals = (data.offpage?.sites || []).filter(s => ids.has(s.id));
    $('growthReferrals').innerHTML = referrals.length ? referrals.map(s => '<p><b>' + clean(s.domain) + '</b> · ' + (s.error || !s.configured ? clean(s.error || 'GA4 not configured') : fmt(s.totals?.currentSessions) + ' referral sessions / 28 days · ' + pct(s.totals?.changePct) + ' vs prior period<br>Top sources: ' + (s.referringSources || []).slice(0, 3).map(r => clean(r.source) + ' (' + fmt(r.currentSessions) + ')').join(', ')) + '</p>').join('') : 'Use your session admin key to load protected referral data.';
  }
  async function get(path, headers = {}) {
    const r = await fetch(path, { headers, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(45000) });
    let j; try { j = await r.json(); } catch { throw Error('Expected JSON; check your deployment sign-in session'); }
    if (!r.ok || j.error) throw Error(j.error || 'HTTP ' + r.status); return j;
  }
  async function load() {
    const ticket = ++sequence, requestedRange = range, key = sessionStorage.getItem('seo-admin-key'), headers = key ? { 'x-admin-key': key } : {};
    $('growthRefresh').disabled = true; $('growthStatus').textContent = 'Refreshing sources…';
    const requests = { config: '/api/config-status', gsc: '/api/gsc-overview?days=' + requestedRange + '&compare=1', index: '/api/index-progress', health: '/api/sites-health', ga: '/api/ga4-realtime', cwv: '/api/crux', ...(key ? { history: '/api/seo-history', offpage: '/api/referral-audit' } : {}) };
    const next = { errors: {}, loadedAt: new Date().toISOString() };
    await Promise.all(Object.entries(requests).map(async ([name, path]) => { try { next[name] = await get(path, headers); } catch (e) { next[name] = null; next.errors[name] = e.message; } }));
    if (ticket !== sequence) return;
    next.registry = next.config?.sites || window.seoPortfolioSites?.() || [];
    data = next;
    if (!data.registry.some(s => s.id === siteId)) siteId = 'all';
    $('growthSite').innerHTML = '<option value="all">All websites</option>' + data.registry.map(s => '<option value="' + clean(s.id) + '">' + clean(s.domain) + '</option>').join('');
    $('growthSite').value = siteId;
    render(); $('growthRefresh').disabled = false; $('growthExport').disabled = !data.registry.length;
  }
  function exportCsv() {
    if (!data) return;
    const rows = [['Website', 'Start date (Pacific)', 'End date (Pacific)', 'Clicks', 'Impressions', 'CTR', 'Average position', 'Prior clicks', 'GSC status']];
    for (const site of selected()) { const s = find('gsc', site.id), ok = M.usable(s); rows.push([site.domain, ok ? s.range.start : '', ok ? s.range.end : '', ok ? s.clicks : '', ok ? s.impressions : '', ok ? s.ctr : '', ok ? s.position : '', ok && M.usable(s.comparison) ? s.comparison.clicks : '', ok ? 'Ready' : s?.error || 'Unavailable']); }
    const url = URL.createObjectURL(new Blob(['\uFEFF' + M.csv(rows)], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'seo-summary-' + range + 'd-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('growthSite').onchange = e => { siteId = e.target.value; render(); };
  $('growthMetric').onchange = e => { metric = e.target.value; render(); };
  $('growthRefresh').onclick = load; $('growthExport').onclick = exportCsv;
  document.querySelectorAll('[data-growth-range]').forEach(b => b.onclick = () => window.seoGrowth.setRange(Number(b.dataset.growthRange)));
  window.seoGrowth = { load, setRange(n) { if (![7, 28, 90].includes(n)) return; range = n; load(); } };
})();
