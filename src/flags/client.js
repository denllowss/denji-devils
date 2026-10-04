/**
 * Denji Flags - Client side
 * Emits data-flag-definitions and data-flag-values for Vercel Web Analytics
 * https://vercel.com/docs/flags/observability/web-analytics
 * https://vercel.com/docs/flags/flags-explorer/reference#values
 */
(function() {
  'use strict';

  // Inline definitions to avoid extra fetch; keep in sync with definitions.json
  const DEFINITIONS = {
    "docs_desktop_workspace": {
      "description": "Aktifkan layout workspace desktop dua panel di /docs",
      "origin": "https://denji-devils.vercel.app/docs#playground",
      "options": [{ "value": true, "label": "On - Desktop workspace aktif" }, { "value": false, "label": "Off" }]
    },
    "docs_engage_layer": {
      "description": "Aktifkan engagement layer: related links, next-step panel, quick bar, footer explore",
      "origin": "https://denji-devils.vercel.app/docs",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "home_grouping": {
      "description": "Homepage grouping dengan badge dan CTA ke Playground",
      "origin": "https://denji-devils.vercel.app/",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "playground_auto_preview": {
      "description": "Playground auto preview 850ms debounce, satu render aktif",
      "origin": "https://denji-devils.vercel.app/docs#playground",
      "options": [{ "value": true, "label": "On - Auto preview" }, { "value": false, "label": "Off" }]
    },
    "ssgc_full_layout": {
      "description": "SSGC full description tatanan inline rata tengah, balanced inset, WA formatting",
      "origin": "https://denji-devils.vercel.app/ssgc-app",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "iqc_emoji_transparent": {
      "description": "Fix emoji tepi putih: genuine transparent RGBA PNG",
      "origin": "https://denji-devils.vercel.app/app5",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "analytics_custom_events": {
      "description": "Tracking custom events untuk bounce-rate reduction",
      "origin": "https://vercel.com/docs/analytics/custom-events",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    }
  };

  const DEFAULT_VALUES = {
    docs_desktop_workspace: true,
    docs_engage_layer: true,
    home_grouping: true,
    playground_auto_preview: true,
    ssgc_full_layout: true,
    iqc_emoji_transparent: true,
    analytics_custom_events: true
  };

  function safeJsonStringify(obj) {
    return JSON.stringify(obj)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  function getFlag(key) {
    try {
      // 1. URL override ?flag_<key>=0/1
      const url = new URL(window.location.href);
      const qk = 'flag_' + key;
      if (url.searchParams.has(qk)) {
        const v = url.searchParams.get(qk).toLowerCase();
        if (['1','true','on','yes'].includes(v)) return true;
        if (['0','false','off','no'].includes(v)) return false;
      }
      // 2. localStorage override
      const ls = localStorage.getItem('denji_flag_' + key);
      if (ls !== null) {
        if (['1','true','on','yes'].includes(ls.toLowerCase())) return true;
        if (['0','false','off','no'].includes(ls.toLowerCase())) return false;
      }
      // 3. cookie vercel-flag-overrides
      const m = document.cookie.match(/vercel-flag-overrides=([^;]+)/);
      if (m) {
        try {
          const decoded = decodeURIComponent(m[1]);
          const parsed = JSON.parse(decoded);
          if (key in parsed) return !!parsed[key];
        } catch {}
      }
    } catch {}
    return DEFAULT_VALUES[key] !== undefined ? DEFAULT_VALUES[key] : false;
  }

  function getAllFlags() {
    const out = {};
    for (const k of Object.keys(DEFINITIONS)) out[k] = getFlag(k);
    return out;
  }

  function emitFlags() {
    try {
      // Remove old if any
      document.querySelectorAll('script[data-flag-definitions],script[data-flag-values]').forEach(function(el){
        // only remove if we created it (has denji marker)
        if (el.getAttribute('data-denji') === '1') el.remove();
      });

      const defScript = document.createElement('script');
      defScript.type = 'application/json';
      defScript.setAttribute('data-flag-definitions', '');
      defScript.setAttribute('data-denji', '1');
      defScript.textContent = safeJsonStringify(DEFINITIONS);
      document.head.appendChild(defScript);

      const values = getAllFlags();
      const valScript = document.createElement('script');
      valScript.type = 'application/json';
      valScript.setAttribute('data-flag-values', '');
      valScript.setAttribute('data-denji', '1');
      valScript.textContent = safeJsonStringify(values);
      document.head.appendChild(valScript);

      // Expose globally for debugging and for analytics custom events
      window.DENJI_FLAGS = values;
      window.DENJI_FLAG_DEFINITIONS = DEFINITIONS;

      // Also emit as data attributes on html for easy CSS targeting
      for (const [k, v] of Object.entries(values)) {
        document.documentElement.setAttribute('data-flag-' + k.replace(/_/g, '-'), String(v));
      }

      // console debug in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || localStorage.getItem('denji_debug_flags') === '1') {
        console.log('[Denji Flags] definitions & values emitted for Web Analytics', values);
      }
    } catch (e) {
      console.warn('[Denji Flags] emit failed', e);
    }
  }

  // Emit early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', emitFlags);
  } else {
    emitFlags();
  }
  // Re-emit on flag changes (mutation observer already in Vercel Toolbar, but we also watch)
  // Also expose setter
  window.DENJI_SET_FLAG = function(key, value) {
    try {
      localStorage.setItem('denji_flag_' + key, value ? '1' : '0');
      emitFlags();
      // reload to apply? some flags need reload
      if (confirm('Flag ' + key + ' diubah ke ' + value + '. Reload untuk menerapkan?')) {
        location.reload();
      }
    } catch {}
  };

  window.DENJI_GET_FLAGS = getAllFlags;
  window.DENJI_GET_FLAG = getFlag;

  // For Web Analytics: track with flags support
  // Wrap track to auto-include flags
  window.DENJI_TRACK = function(name, data, opts) {
    try {
      const flags = opts && opts.flags ? opts.flags : Object.keys(DEFINITIONS);
      const allFlags = getAllFlags();
      // Filter to only flags that are true? But docs says pass array of flag keys to track
      // We will pass all flag keys, and also include flag values in data for debugging
      const enrichedData = Object.assign({}, data || {});
      // Add flag values as custom data prefixed with flag_ (within 255 char limit, booleans)
      for (const [k, v] of Object.entries(allFlags)) {
        // only add if analytics_custom_events enabled
        if (allFlags.analytics_custom_events) {
          enrichedData['flag_' + k] = v ? 1 : 0;
        }
      }
      if (typeof window.va === 'function') {
        // Vercel Analytics: va('event', {name, data, flags})
        // According to docs: track('My Event', {}, { flags: ['summer-sale'] })
        // For window.va, we need to use va('event', {name, data}) and flags are auto-picked from DOM
        // But we also support explicit flags via second arg? We'll call both forms
        window.va('event', { name: name, data: enrichedData, flags: flags });
        // Also try va.track
        if (window.va.track) {
          window.va.track(name, enrichedData, { flags: flags });
        }
      }
      // Also try @vercel/analytics track if loaded
      if (window.__denji_analytics_track) {
        window.__denji_analytics_track(name, enrichedData, { flags: flags });
      }
    } catch (e) {
      // fallback
      try { if (window.va) window.va('event', { name: name, data: data }); } catch {}
    }
  };

})();
