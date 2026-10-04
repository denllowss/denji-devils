/**
 * Denji Flags - Server & shared definitions
 * Integrasi dengan Vercel Web Analytics flags observability
 * https://vercel.com/docs/flags/observability/web-analytics
 */
const fs = require('fs');
const path = require('path');

let definitions = {};
try {
  const p = path.join(__dirname, 'definitions.json');
  definitions = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch (e) {
  // fallback inline definitions for Vercel functions where fs may differ
  definitions = {
    docs_desktop_workspace: { description: 'Desktop workspace', options: [{value:true},{value:false}] },
    docs_engage_layer: { description: 'Engagement layer', options: [{value:true},{value:false}] },
    home_grouping: { description: 'Homepage grouping', options: [{value:true},{value:false}] },
    playground_auto_preview: { description: 'Auto preview', options: [{value:true},{value:false}] },
    ssgc_full_layout: { description: 'SSGC full layout', options: [{value:true},{value:false}] },
    iqc_emoji_transparent: { description: 'Transparent emoji', options: [{value:true},{value:false}] },
    analytics_custom_events: { description: 'Custom events', options: [{value:true},{value:false}] }
  };
}

// Default values - all true karena fitur sudah ship di eb2d3ac
const DEFAULT_VALUES = {
  docs_desktop_workspace: true,
  docs_engage_layer: true,
  home_grouping: true,
  playground_auto_preview: true,
  ssgc_full_layout: true,
  iqc_emoji_transparent: true,
  analytics_custom_events: true
};

/**
 * Safe JSON stringify to prevent XSS in script tags
 * Mirip safeJsonStringify dari 'flags' package
 */
function safeJsonStringify(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Get flag value with override support from:
 * - query param ?flag_<key>=1/0
 * - cookie vercel-flag-overrides (plaintext JSON)
 * - env var FLAG_<KEY>
 * - default
 */
function getFlag(key, req) {
  const normalized = String(key).toLowerCase();
  // env override
  const envKey = 'FLAG_' + normalized.toUpperCase();
  if (process.env[envKey] !== undefined) {
    const v = process.env[envKey];
    if (['1','true','on','yes'].includes(String(v).toLowerCase())) return true;
    if (['0','false','off','no'].includes(String(v).toLowerCase())) return false;
  }
  if (req) {
    // query override ?flag_docs_desktop_workspace=0
    const q = req.query || {};
    const qk = 'flag_' + normalized;
    if (qk in q) {
      const v = String(q[qk]).toLowerCase();
      if (['1','true','on','yes'].includes(v)) return true;
      if (['0','false','off','no'].includes(v)) return false;
    }
    // cookie vercel-flag-overrides plaintext fallback
    try {
      const cookie = req.headers && req.headers.cookie || '';
      const m = cookie.match(/vercel-flag-overrides=([^;]+)/);
      if (m) {
        const decoded = decodeURIComponent(m[1]);
        let parsed;
        try { parsed = JSON.parse(decoded); } catch { 
          // try base64?
          try { parsed = JSON.parse(Buffer.from(decoded, 'base64').toString()); } catch {}
        }
        if (parsed && normalized in parsed) {
          return !!parsed[normalized];
        }
        // also support camelCase keys
        const camel = normalized.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (parsed && camel in parsed) return !!parsed[camel];
      }
    } catch {}
  }
  return DEFAULT_VALUES[normalized] !== undefined ? DEFAULT_VALUES[normalized] : false;
}

function getAllFlags(req) {
  const out = {};
  for (const k of Object.keys(definitions)) {
    out[k] = getFlag(k, req);
  }
  return out;
}

/**
 * Report flag value for observability
 * Di Vercel, ini akan muncul di Runtime Logs dan dihubungkan ke Web Analytics
 * Implementasi mengikuti `reportValue` dari 'flags' package
 * Jika package 'flags' tersedia, gunakan itu; jika tidak, fallback ke console + header
 */
let _flagsModule = null;
function getFlagsModule() {
  if (_flagsModule !== null) return _flagsModule;
  try {
    _flagsModule = require('flags');
  } catch {
    _flagsModule = false;
  }
  return _flagsModule;
}

function reportValue(key, value) {
  const fm = getFlagsModule();
  if (fm && typeof fm.reportValue === 'function') {
    try { fm.reportValue(key, value); return; } catch {}
  }
  // Fallback: log for observability, also set for Vercel to pick up if possible
  if (process.env.VERCEL) {
    // Vercel Runtime Logs will capture this pattern
    console.log(`[FLAGS] ${key}=${JSON.stringify(value)}`);
  }
}

function reportAllFlags(req) {
  const all = getAllFlags(req);
  for (const [k, v] of Object.entries(all)) {
    reportValue(k, v);
  }
  return all;
}

module.exports = {
  definitions,
  DEFAULT_VALUES,
  safeJsonStringify,
  getFlag,
  getAllFlags,
  reportValue,
  reportAllFlags
};
