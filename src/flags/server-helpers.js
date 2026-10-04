/**
 * Server-side helpers for Vercel Web Analytics + Flags
 * https://vercel.com/docs/flags/observability/web-analytics#server-side-tracking
 */
function reportFlags(req) {
  try {
    const flags = require('./index');
    return flags.reportAllFlags(req);
  } catch { return {}; }
}

async function trackServerEvent(name, data, flagKeys, req) {
  const allFlags = reportFlags(req);
  const flags = flagKeys || Object.keys(allFlags);
  // Report individual flag values for observability
  try {
    const { reportValue } = require('./index');
    for (const k of flags) {
      try { reportValue(k, allFlags[k]); } catch {}
    }
  } catch {}
  // Try @vercel/analytics/server track
  try {
    const { track } = require('@vercel/analytics/server');
    if (typeof track === 'function') {
      await track(name, data || {}, { flags });
      return true;
    }
  } catch (e) {
    // fallback log
    if (process.env.VERCEL) {
      console.log(`[Analytics Server] ${name} ${JSON.stringify(data||{})} flags=${flags.join(',')}`);
    }
  }
  return false;
}

module.exports = { reportFlags, trackServerEvent };
