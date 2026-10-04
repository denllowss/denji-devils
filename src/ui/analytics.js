/**
 * Denji Analytics - Full integration for docs & all pages
 * https://vercel.com/docs/analytics/quickstart
 * https://vercel.com/docs/analytics/custom-events
 * https://vercel.com/docs/flags/observability/web-analytics
 * 
 * Fitur:
 * - Page view tracking otomatis via /_vercel/insights/script.js
 * - Speed Insights via /_vercel/speed-insights/script.js
 * - Custom events dengan flags support: track(event, data, {flags: [...]})
 * - Flags definitions & values emission via data-flag-definitions / data-flag-values
 * - beforeSend redaction untuk data sensitif
 * - Server-side tracking via /api/analytics/track dan reportValue
 */
(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  // Pastikan queues ada (fallback jika analytics-init.js belum load)
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  window.vaq = window.vaq || [];
  window.siq = window.siq || [];

  // Flags sudah di-emit oleh config.js, tapi pastikan ada untuk halaman yang tidak load config.js
  if (!window.DENJI_FLAGS) {
    try {
      const defs = {
        "docs_desktop_workspace": { "description": "Desktop workspace", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
        "docs_engage_layer": { "description": "Engagement layer", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
        "home_grouping": { "description": "Homepage grouping", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
        "playground_auto_preview": { "description": "Auto preview", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
        "ssgc_full_layout": { "description": "SSGC full layout", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
        "iqc_emoji_transparent": { "description": "Transparent emoji", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
        "analytics_custom_events": { "description": "Custom events", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] }
      };
      const defaults = { docs_desktop_workspace: true, docs_engage_layer: true, home_grouping: true, playground_auto_preview: true, ssgc_full_layout: true, iqc_emoji_transparent: true, analytics_custom_events: true };
      function safeJson(o){ return JSON.stringify(o).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026'); }
      function getFlag(k){
        try {
          const url = new URL(location.href);
          if (url.searchParams.has('flag_'+k)) {
            const v = url.searchParams.get('flag_'+k).toLowerCase();
            if (['1','true','on','yes'].includes(v)) return true;
            if (['0','false','off','no'].includes(v)) return false;
          }
          const ls = localStorage.getItem('denji_flag_'+k);
          if (ls !== null) {
            if (['1','true','on','yes'].includes(ls.toLowerCase())) return true;
            if (['0','false','off','no'].includes(ls.toLowerCase())) return false;
          }
        } catch {}
        return defaults[k] !== undefined ? defaults[k] : false;
      }
      function getAll(){ const out={}; for(const k of Object.keys(defs)) out[k]=getFlag(k); return out; }
      const all = getAll();
      if (!document.querySelector('script[data-flag-definitions]')) {
        const s = document.createElement('script'); s.type='application/json'; s.setAttribute('data-flag-definitions',''); s.setAttribute('data-denji','1'); s.textContent=safeJson(defs); document.head.appendChild(s);
      }
      if (!document.querySelector('script[data-flag-values]')) {
        const s = document.createElement('script'); s.type='application/json'; s.setAttribute('data-flag-values',''); s.setAttribute('data-denji','1'); s.textContent=safeJson(all); document.head.appendChild(s);
      }
      window.DENJI_FLAGS = all;
      window.DENJI_FLAG_DEFINITIONS = defs;
      window.DENJI_GET_FLAG = getFlag;
      window.DENJI_GET_FLAGS = getAll;
    } catch {}
  }

  // Enhanced track dengan flags support - sesuai docs flags observability
  const originalTrack = window.DENJI_TRACK;
  window.DENJI_TRACK = function(name, data, opts) {
    try {
      const allFlags = (typeof window.DENJI_GET_FLAGS === 'function') ? window.DENJI_GET_FLAGS() : window.DENJI_FLAGS || {};
      const flagKeys = (opts && opts.flags) ? opts.flags : Object.keys(allFlags);
      const enriched = Object.assign({}, data || {});
      try { for (const [k,v] of Object.entries(allFlags)) enriched['flag_'+k] = v ? 1 : 0; } catch {}
      // Kirim ke Vercel Analytics
      if (typeof window.va === 'function') {
        window.va('event', { name: name, data: enriched, flags: flagKeys });
        if (window.va.track) window.va.track(name, enriched, { flags: flagKeys });
      }
      if (window.__denji_analytics_track) {
        window.__denji_analytics_track(name, enriched, { flags: flagKeys });
      }
      // Juga coba kirim ke server untuk server-side tracking jika di Vercel
      try {
        if (navigator.sendBeacon && location.hostname !== 'localhost') {
          const payload = JSON.stringify({ name, data: enriched, flags: flagKeys });
          // sendBeacon tidak menunggu response, bagus untuk analytics
          // Tapi endpoint kita POST /api/analytics/track
          // Kita pakai fetch dengan keepalive sebagai alternatif
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(()=>{});
        }
      } catch {}
      // Panggil original jika ada
      if (originalTrack && originalTrack !== window.DENJI_TRACK) {
        try { originalTrack(name, data, opts); } catch {}
      }
    } catch {
      try { if (window.va) window.va('event', { name: name, data: data }); } catch {}
    }
  };

  // Auto track page view dengan flags (sudah di-handle di config.js juga, tapi ini fallback)
  // Hindari double track dengan cek apakah sudah pernah track denji_page_view
  if (!window.__denji_page_view_tracked) {
    window.__denji_page_view_tracked = true;
    setTimeout(function() {
      try {
        const allFlags = (typeof window.DENJI_GET_FLAGS === 'function') ? window.DENJI_GET_FLAGS() : {};
        const data = { path: location.pathname, referrer: document.referrer || '' };
        for (const [k,v] of Object.entries(allFlags)) data['flag_'+k] = v ? 1 : 0;
        data.flags_enabled = Object.values(allFlags).filter(Boolean).length;
        window.DENJI_TRACK('denji_page_view', data, { flags: Object.keys(allFlags) });
      } catch {}
    }, 1500);
  }

  // Expose helper untuk docs: list flags
  window.DENJI_LIST_FLAGS = function() {
    try {
      console.table(window.DENJI_FLAGS);
      return window.DENJI_FLAGS;
    } catch { return {}; }
  };

})();
