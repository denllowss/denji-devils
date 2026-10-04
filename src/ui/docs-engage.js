/* Engagement & bounce-rate layer — static, no network, no API change. */
const docsEngage = (() => {
  const $ = id => document.getElementById(id);
  const desktop = matchMedia('(min-width:1024px)');
  const RELATED = {
    dl: [
      { label: 'Stream / Proxy', href: '#ep-stream', action: () => setupPlayground('GET','/api/stream?url=URL_MEDIA_ANDA') },
      { label: 'Health', href: '#ep-health', action: () => setupPlayground('GET','/api/health') },
      { label: 'Buka Downloader Web', href: '/dl' },
    ],
    stream: [
      { label: 'Downloader', href: '#ep-dl', action: () => applyPreset('tiktok') },
      { label: 'Profile', href: '#ep-profile', action: () => setupPlayground('GET','/api/profile') },
      { label: 'Docs Playground', href: '#playground' },
    ],
    health: [
      { label: 'Profile', href: '#ep-profile', action: () => setupPlayground('GET','/api/profile') },
      { label: 'Downloader', href: '#ep-dl', action: () => applyPreset('tiktok') },
      { label: 'IQC5', href: '#ep-iqc5', action: () => applyPreset('iqc5') },
    ],
    profile: [
      { label: 'Linktree', href: '/' },
      { label: 'Downloader', href: '/dl' },
      { label: 'Docs', href: '/docs' },
    ],
    iqc: [
      { label: 'IQC2 WhatsApp', href: '#ep-iqc2', action: () => applyPreset('iqc2') },
      { label: 'IQC3 Musik', href: '#ep-iqc3', action: () => applyPreset('iqc3') },
      { label: 'Editor IG', href: '/app' },
    ],
    iqc2: [
      { label: 'IQC1 Instagram', href: '#ep-iqc', action: () => applyPreset('iqc') },
      { label: 'IQC5 Profil', href: '#ep-iqc5', action: () => applyPreset('iqc5') },
      { label: 'SSGC Grup', href: '#ep-ssgc', action: () => applyPreset('ssgc') },
    ],
    iqc3: [
      { label: 'IQC4 Reaksi', href: '#ep-iqc4', action: () => applyPreset('iqc4') },
      { label: 'IQC1', href: '#ep-iqc', action: () => applyPreset('iqc') },
      { label: 'Editor Musik', href: '/app3' },
    ],
    iqc4: [
      { label: 'IQC5 Profil', href: '#ep-iqc5', action: () => applyPreset('iqc5') },
      { label: 'SSGC Grup', href: '#ep-ssgc', action: () => applyPreset('ssgc') },
      { label: 'Editor Reaksi', href: '/app4' },
    ],
    iqc5: [
      { label: 'SSGC Grup', href: '#ep-ssgc', action: () => applyPreset('ssgc') },
      { label: 'Lowquality', href: '#ep-lowquality', action: () => applyPreset('lowquality') },
      { label: 'Editor Profil', href: '/app5' },
    ],
    ssgc: [
      { label: 'IQC5 Profil', href: '#ep-iqc5', action: () => applyPreset('iqc5') },
      { label: 'Lowquality', href: '#ep-lowquality', action: () => applyPreset('lowquality') },
      { label: 'Editor Grup', href: '/ssgc-app' },
    ],
    lowquality: [
      { label: 'SSGC Grup', href: '#ep-ssgc', action: () => applyPreset('ssgc') },
      { label: 'IQC5 Profil', href: '#ep-iqc5', action: () => applyPreset('iqc5') },
      { label: 'Playground JPEG', href: '/lowquality-app' },
    ],
  };
  const EDITOR = {
    iqc: '/app',
    iqc2: '/app',
    iqc3: '/app3',
    iqc4: '/app4',
    iqc5: '/app5',
    ssgc: '/ssgc-app',
    lowquality: '/lowquality-app',
  };
  function track(name, data = {}, opts) {
    try {
      // Flags observability - https://vercel.com/docs/flags/observability/web-analytics
      const allFlags = (typeof window.DENJI_GET_FLAGS === 'function') ? window.DENJI_GET_FLAGS() : {};
      const flagKeys = (opts && opts.flags) ? opts.flags : Object.keys(allFlags);
      const enriched = Object.assign({}, data || {});
      try { for (const [k,v] of Object.entries(allFlags)) enriched['flag_'+k] = v ? 1 : 0; } catch {}
      if (typeof window.DENJI_TRACK === 'function') {
        window.DENJI_TRACK(name, enriched, { flags: flagKeys });
        return;
      }
      if (typeof window.va === 'function') window.va('event', { name, data: enriched, flags: flagKeys });
      if (window.va && typeof window.va.track === 'function') window.va.track(name, enriched, { flags: flagKeys });
      if (window.__denji_analytics_track) window.__denji_analytics_track(name, enriched, { flags: flagKeys });
    } catch (_) {}
  }
  function create(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  }
  function injectRelated() {
    document.querySelectorAll('.section-card.endpoint').forEach(sec => {
      if (sec.querySelector('.docs-related')) return;
      const id = sec.id.replace('ep-','');
      const items = RELATED[id];
      if (!items) return;
      const wrap = create('div','docs-related');
      const title = create('div','docs-related-title');
      title.textContent = 'Lanjut eksplor · terkait ' + id.toUpperCase();
      const row = create('div','docs-related-row');
      items.forEach(it => {
        const a = create('a','docs-related-link');
        a.href = it.href;
        a.textContent = it.label;
        if (it.action) {
          a.addEventListener('click', e => {
            if (it.href.startsWith('#')) {
              e.preventDefault();
              track('docs_related_click', { from: id, to: it.label });
              it.action();
              smoothScrollTo(it.href.slice(1));
            } else {
              track('docs_related_click', { from: id, to: it.label });
            }
          });
        } else {
          a.addEventListener('click', () => track('docs_related_click', { from: id, to: it.label }));
        }
        row.append(a);
      });
      wrap.append(title, row);
      // place before code column ends, inside ep-col
      const col = sec.querySelector('.ep-col');
      if (col) col.append(wrap);
    });
  }
  function ensureNextStep() {
    const result = $('pgImageResult');
    if (!result) return null;
    let box = result.querySelector('.docs-next-step');
    if (box) return box;
    box = create('div','docs-next-step');
    box.hidden = true;
    box.innerHTML = `
      <div class="docs-next-head"><strong>Lanjut setelah hasil ini</strong><span class="docs-next-model" id="docsNextModel">API</span></div>
      <div class="docs-next-actions" id="docsNextActions"></div>
      <div class="docs-next-presets" id="docsNextPresets" hidden><span>Coba preset lain:</span><div class="docs-next-chips" id="docsNextChips"></div></div>
      <p class="docs-next-hint" id="docsNextHint">Hasil memakai satu respons untuk preview dan unduh. Pilih preset lain untuk membandingkan tanpa mengetik ulang.</p>
    `;
    const container = result.querySelector('.response-code-container');
    if (container) container.after(box);
    else result.append(box);
    return box;
  }
  function renderNextStep() {
    const box = ensureNextStep();
    if (!box) return;
    const endpoint = $('pgEndpoint').value.trim();
    const info = pgIqc.info(endpoint);
    const isImage = !!info;
    const model = info?.type || 'API';
    $('docsNextModel').textContent = model.toUpperCase();
    const actions = $('docsNextActions');
    actions.replaceChildren();
    const add = (label, href, cls, onClick) => {
      const a = create(href ? 'a' : 'button', cls);
      a.textContent = label;
      if (href) a.href = href;
      if (onClick) a.addEventListener('click', e => { if (href && href.startsWith('#')) e.preventDefault(); onClick(e); });
      a.addEventListener('click', () => track('playground_next_click', { model, label }));
      actions.append(a);
      return a;
    };
    if (isImage) {
      const ed = EDITOR[model];
      if (ed) add('Buka editor ' + model.toUpperCase(), ed, 'docs-next-editor');
      add('Coba preset lain', null, '', () => {
        const sel = $('pgIqcPreset');
        if (sel && sel.options.length > 1) {
          const cur = sel.value;
          const next = [...sel.options].find(o => o.value !== cur && o.value !== 'custom');
          if (next) pgIqc.preset(next.value);
        }
        track('playground_try_preset', { model });
      });
      const rel = RELATED[model] || [];
      rel.slice(0,2).forEach(r => {
        add(r.label, r.href, '', e => {
          if (r.action) { if (r.href.startsWith('#')) e.preventDefault(); r.action(); if (r.href.startsWith('#')) smoothScrollTo(r.href.slice(1)); }
        });
      });
      add('Lihat docs ' + model.toUpperCase(), '#ep-' + model, '', e => { e.preventDefault(); smoothScrollTo('ep-' + model); });
    } else {
      // generic downloader path
      add('Coba /api/stream', null, '', () => { setupPlayground('GET','/api/stream?url=URL_MEDIA_ANDA'); track('playground_next_click',{model:'stream'}); });
      add('Coba IQC5', null, '', () => { applyPreset('iqc5'); });
      add('Buka Docs', '#ep-dl', '', e => { e.preventDefault(); smoothScrollTo('ep-dl'); });
    }
    // presets chips
    const chipsWrap = $('docsNextPresets');
    const chips = $('docsNextChips');
    chips.replaceChildren();
    if (isImage && pgIqc && typeof pgIqc === 'object') {
      const sel = $('pgIqcPreset');
      if (sel) {
        const opts = [...sel.options].filter(o => o.value !== 'custom').slice(0,6);
        if (opts.length) {
          chipsWrap.hidden = false;
          opts.forEach(o => {
            const b = create('button');
            b.type = 'button';
            b.textContent = o.textContent;
            b.addEventListener('click', () => { pgIqc.preset(o.value); track('playground_preset_chip',{model, preset:o.value}); });
            chips.append(b);
          });
        } else chipsWrap.hidden = true;
      }
    } else chipsWrap.hidden = true;
    box.hidden = false;
  }
  function injectQuick() {
    if (document.querySelector('.docs-quick')) return;
    const hero = document.querySelector('.hero-banner');
    if (!hero) return;
    const bar = create('div','docs-quick');
    bar.innerHTML = `
      <a href="#playground" class="docs-quick-primary">▶ Playground</a>
      <a href="#ep-dl">Downloader</a>
      <a href="#ep-ssgc">SSGC Grup</a>
      <a href="#ep-iqc5">IQC5 Profil</a>
      <a href="/ssgc-app">Editor SSGC</a>
      <a href="/app5">Editor IQC5</a>
      <button type="button" id="docsQuickSearch">⌕ Cari</button>
    `;
    hero.after(bar);
    bar.querySelectorAll('a').forEach(a => a.addEventListener('click', () => track('docs_quick_click',{href:a.getAttribute('href')})));
    $('docsQuickSearch')?.addEventListener('click', () => { const s=$('endpointSearch'); if(s){ s.focus(); s.scrollIntoView({behavior:'smooth',block:'center'});} track('docs_quick_search'); });
  }
  function injectFooterExplore() {
    const footer = document.querySelector('.site-footer .footer-nav');
    if (!footer || footer.querySelector('[data-engage]')) return;
    const extra = [
      { href: '/docs#playground', label: 'Playground Interaktif' },
      { href: '/ssgc-app', label: 'Editor SSGC Grup' },
      { href: '/app5', label: 'Editor IQC5 Profil' },
      { href: '/lowquality-app', label: 'Lowquality JPEG' },
      { href: '/docs#ep-dl', label: 'API Downloader' },
    ];
    extra.forEach(it => {
      const a = create('a','footer-btn');
      a.dataset.engage = '1';
      a.href = it.href;
      a.innerHTML = `<span>${it.label}</span>`;
      a.addEventListener('click', () => track('footer_explore',{label:it.label}));
      footer.append(a);
    });
  }
  function observeResults() {
    const code = $('pgResponseCode');
    if (!code) return;
    const obs = new MutationObserver(() => {
      const hasImg = !!code.querySelector('img.res-img');
      const status = $('pgStatusBadge')?.textContent || '';
      const isOk = status.includes('200');
      const box = ensureNextStep();
      if (!box) return;
      if ((hasImg && isOk) || (!hasImg && status && !status.includes('Ready'))) {
        renderNextStep();
      }
    });
    obs.observe(code, { childList: true, subtree: true });
    // also watch status badge
    const badge = $('pgStatusBadge');
    if (badge) new MutationObserver(() => {
      if (badge.textContent.includes('200')) renderNextStep();
    }).observe(badge, { childList: true, characterData: true, subtree: true });
  }
  function init() {
    injectQuick();
    injectRelated();
    injectFooterExplore();
    ensureNextStep();
    observeResults();
    // track initial view
    track('docs_view', { path: location.pathname + location.search });
    document.addEventListener('click', e => {
      const link = e.target.closest('a.toc-link, .preset-btn, .btn-try-ep, .docs-related-link, .footer-btn, .explore-btn');
      if (link) track('docs_click', { text: link.textContent?.trim().slice(0,40), href: link.getAttribute('href') || '' });
    });
    // scroll depth to understand engagement and lower bounce
    let depths = new Set();
    window.addEventListener('scroll', () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h <= 0) return;
      const p = Math.round((scrollY / h) * 100);
      [25,50,75,90].forEach(d => {
        if (p >= d && !depths.has(d)) {
          depths.add(d);
          track('docs_scroll', { depth: d });
        }
      });
    }, { passive: true });
    // time on page
    let t0 = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const sec = Math.round((Date.now() - t0)/1000);
        if (sec > 10) track('docs_time', { seconds: sec });
      }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
  return { track, renderNextStep };
})();
