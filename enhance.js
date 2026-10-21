/* Dashboard add-ons: next-digest countdown, CSV export, auto-refresh. Loaded after app.js and uses its globals. */
(function () {
  'use strict';
  const $ = q => document.querySelector(q);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: setting just won't persist */ } }
  };

  // ---- 1. Next LINE digest countdown (GitHub Actions cron: 00:15, 04:15, 10:15, 14:15 UTC = Taipei 08:15, 12:15, 18:15, 22:15)
  const SLOTS = [
    { utc: [0, 15], label: 'Morning', taipei: '08:15' },
    { utc: [4, 15], label: 'Midday', taipei: '12:15' },
    { utc: [10, 15], label: 'Evening', taipei: '18:15' },
    { utc: [14, 15], label: 'Night', taipei: '22:15' }
  ];
  function nextRun(now) {
    const runs = [];
    for (let day = 0; day < 2; day++) for (const s of SLOTS) {
      const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, s.utc[0], s.utc[1]);
      runs.push({ ...s, at: t });
    }
    return { next: runs.find(r => r.at > now.getTime()), all: runs.filter(r => r.at <= now.getTime() + 864e5 && r.at > now.getTime() - 864e5) };
  }
  const fmtIn = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + ' min'; };
  function renderDigest() {
    const box = $('#digestStrip');
    if (!box) return;
    const now = new Date();
    const { next } = nextRun(now);
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const doneToday = s => todayUtc + (s.utc[0] * 60 + s.utc[1]) * 60000 <= now.getTime();
    const mine = at => new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(at));
    box.innerHTML =
      '<div class="digest-main"><span class="eyebrow">LINE DIGEST · 4× DAILY</span>' +
      '<b>Next: ' + next.label + ' · ' + next.taipei + ' Taipei</b>' +
      '<small>in ' + fmtIn(next.at - now.getTime()) + ' · your time ' + mine(next.at) + ' · GitHub may start a few minutes late</small></div>' +
      '<ol class="digest-slots" aria-label="Today\'s digest schedule">' + SLOTS.map(s => {
        const cls = s.label === next.label ? 'next' : doneToday(s) ? 'done' : '';
        return '<li class="' + cls + '"><i></i><span>' + s.taipei + '</span><small>' + s.label + '</small></li>';
      }).join('') + '</ol>';
  }

  // ---- 2. CSV export of the Google Search table (formula-injection safe, Excel-friendly BOM)
  const csvCell = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  function exportCsv() {
    if (typeof SITES === 'undefined' || !state.gsc.length) { toast('No Search Console data loaded yet', 'bad'); return; }
    const rows = [['Website', 'Clicks', 'Impressions', 'CTR %', 'Avg position', 'Health score', 'Range start', 'Range end', 'Status']];
    for (const s of SITES) {
      const g = state.gsc.find(x => x.id === s.id);
      const live = g && !g.error;
      rows.push([s.domain, live ? g.clicks : '', live ? g.impressions : '', live && g.ctr != null ? (g.ctr * 100).toFixed(2) : '',
        live && g.position != null ? Number(g.position).toFixed(1) : '', siteScore(s) ?? '', g?.range?.start || '', g?.range?.end || '', live ? 'ok' : (g?.error || 'unavailable')]);
    }
    const blob = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'seo-search-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('CSV exported');
  }

  // ---- 3. Auto-refresh (every 5 min while the tab is visible; remembered per browser)
  let timer = null;
  const INTERVAL = 5 * 60 * 1000;
  function setAuto(on) {
    store.set('seo-auto-refresh', on ? '1' : '0');
    const btn = $('#autoRefreshBtn');
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.classList.toggle('on', on); btn.title = on ? 'Auto-refresh every 5 minutes: on' : 'Auto-refresh: off'; }
    clearInterval(timer);
    timer = on ? setInterval(() => { if (document.visibilityState === 'visible') refresh(false); }, INTERVAL) : null;
  }

  function mount() {
    const strip = $('#statusStrip');
    if (strip && !$('#digestStrip')) strip.insertAdjacentHTML('afterend', '<section class="digest-strip" id="digestStrip" aria-live="off"></section>');
    const intro = $('#view-search .page-intro');
    if (intro && !$('#exportCsvBtn')) {
      const refreshBtn = $('#refreshGscBtn');
      refreshBtn?.insertAdjacentHTML('beforebegin', '<button class="ghost-btn" id="exportCsvBtn" type="button">⤓ Export CSV</button>');
      $('#exportCsvBtn').onclick = exportCsv;
    }
    const top = $('.top-actions');
    if (top && !$('#autoRefreshBtn')) {
      $('#refreshBtn')?.insertAdjacentHTML('beforebegin', '<button class="icon-btn auto-btn" id="autoRefreshBtn" type="button" aria-pressed="false">Auto</button>');
      $('#autoRefreshBtn').onclick = () => setAuto($('#autoRefreshBtn').getAttribute('aria-pressed') !== 'true');
    }
    setAuto(store.get('seo-auto-refresh') === '1');
    renderDigest();
    setInterval(renderDigest, 30000);
  }
  mount();
})();
