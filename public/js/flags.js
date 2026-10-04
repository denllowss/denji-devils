/**
 * Denji Flags - Client standalone
 * Untuk halaman yang tidak load config.js, atau sebagai fallback
 * https://vercel.com/docs/flags/observability/web-analytics
 */
(function() {
  'use strict';
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.vaq = window.vaq || [];
  const DEFINITIONS = {
    "docs_desktop_workspace": { "description": "Desktop workspace dua panel", "origin": "/docs#playground", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
    "docs_engage_layer": { "description": "Engagement layer", "origin": "/docs", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
    "home_grouping": { "description": "Homepage grouping", "origin": "/", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
    "playground_auto_preview": { "description": "Auto preview", "origin": "/docs#playground", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
    "ssgc_full_layout": { "description": "SSGC full layout", "origin": "/ssgc-app", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
    "iqc_emoji_transparent": { "description": "Transparent emoji", "origin": "/app5", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] },
    "analytics_custom_events": { "description": "Custom events", "origin": "https://vercel.com/docs/analytics/custom-events", "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }] }
  };
  const DEFAULTS = { docs_desktop_workspace: true, docs_engage_layer: true, home_grouping: true, playground_auto_preview: true, ssgc_full_layout: true, iqc_emoji_transparent: true, analytics_custom_events: true };
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
    return DEFAULTS[k] !== undefined ? DEFAULTS[k] : false;
  }
  function getAll(){ const out={}; for(const k of Object.keys(DEFINITIONS)) out[k]=getFlag(k); return out; }
  function emit(){
    try {
      document.querySelectorAll('script[data-flag-definitions][data-denji],script[data-flag-values][data-denji]').forEach(function(el){ el.remove(); });
      const d=document.createElement('script'); d.type='application/json'; d.setAttribute('data-flag-definitions',''); d.setAttribute('data-denji','1'); d.textContent=safeJson(DEFINITIONS); document.head.appendChild(d);
      const v=document.createElement('script'); v.type='application/json'; v.setAttribute('data-flag-values',''); v.setAttribute('data-denji','1'); v.textContent=safeJson(getAll()); document.head.appendChild(v);
      window.DENJI_FLAGS=getAll(); window.DENJI_FLAG_DEFINITIONS=DEFINITIONS;
    } catch {}
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', emit); else emit();
  window.DENJI_GET_FLAG=getFlag; window.DENJI_GET_FLAGS=getAll;
})();
