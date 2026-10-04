#!/usr/bin/env node
/**
 * Verify Vercel Web Analytics + Flags observability integration
 * https://vercel.com/docs/analytics/quickstart
 * https://vercel.com/docs/flags/observability/web-analytics
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); }
function ok(msg) { console.log('PASS:', msg); }

const htmlFiles = [
  'public/index.html',
  'public/docs.html',
  'public/dl.html',
  'public/app.html',
  'public/app3.html',
  'public/app4.html',
  'public/app5.html',
  'public/ssgc-app.html',
  'public/lowquality.html'
];

let checks = 0;

// 1. Check analytics-init.js exists
assert(fs.existsSync(path.join(ROOT, 'public/js/analytics-init.js')), 'analytics-init.js exists');
ok('analytics-init.js exists'); checks++;
const initContent = fs.readFileSync(path.join(ROOT, 'public/js/analytics-init.js'), 'utf8');
assert(initContent.includes('window.va'), 'analytics-init contains window.va');
assert(initContent.includes('window.si'), 'analytics-init contains window.si');
ok('analytics-init contains va & si queues'); checks++;

// 2. Check config.js contains full integration
const configPath = path.join(ROOT, 'public/js/config.js');
assert(fs.existsSync(configPath), 'config.js exists');
const configContent = fs.readFileSync(configPath, 'utf8');
assert(configContent.includes('data-flag-definitions'), 'config.js emits flag definitions');
assert(configContent.includes('data-flag-values'), 'config.js emits flag values');
assert(configContent.includes('beforeSend'), 'config.js has beforeSend redaction');
assert(configContent.includes('_vercel/insights/script.js'), 'config.js has fallback insights script');
assert(configContent.includes('_vercel/speed-insights'), 'config.js has speed-insights fallback');
assert(configContent.includes('DENJI_TRACK'), 'config.js has DENJI_TRACK with flags');
assert(configContent.includes('DENJI_FLAG_DEFS'), 'config.js has flag definitions');
ok('config.js full analytics + flags integration'); checks++;

// 3. Check flags definitions
const flagsDefPath = path.join(ROOT, 'src/flags/definitions.json');
assert(fs.existsSync(flagsDefPath), 'flags definitions.json exists');
const defs = JSON.parse(fs.readFileSync(flagsDefPath, 'utf8'));
const expectedFlags = ['docs_desktop_workspace','docs_engage_layer','home_grouping','playground_auto_preview','ssgc_full_layout','iqc_emoji_transparent','analytics_custom_events'];
for (const f of expectedFlags) {
  assert(defs[f], `flag ${f} defined`);
  assert(defs[f].description, `flag ${f} has description`);
  assert(Array.isArray(defs[f].options), `flag ${f} has options`);
}
ok(`flags definitions.json has ${expectedFlags.length} flags`); checks++;

// 4. Check src/flags/index.js
assert(fs.existsSync(path.join(ROOT, 'src/flags/index.js')), 'src/flags/index.js exists');
const flagsIndex = fs.readFileSync(path.join(ROOT, 'src/flags/index.js'), 'utf8');
assert(flagsIndex.includes('reportValue'), 'flags/index.js has reportValue');
assert(flagsIndex.includes('safeJsonStringify'), 'flags/index.js has safeJsonStringify');
ok('src/flags/index.js exists with reportValue'); checks++;

// 5. Check api/flags.js discovery endpoint
assert(fs.existsSync(path.join(ROOT, 'api/flags.js')), 'api/flags.js exists');
const flagsApi = fs.readFileSync(path.join(ROOT, 'api/flags.js'), 'utf8');
assert(flagsApi.includes('definitions'), 'api/flags.js returns definitions');
assert(flagsApi.includes('/.well-known/vercel/flags'), 'api/flags.js mentions discovery endpoint or vercel.json rewrite will handle');
ok('api/flags.js discovery endpoint exists'); checks++;

// 6. Check vercel.json rewrites for flags
const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rewrites = vercelJson.rewrites || [];
const hasFlagsRewrite = rewrites.some(r => r.source === '/.well-known/vercel/flags');
assert(hasFlagsRewrite, 'vercel.json has /.well-known/vercel/flags rewrite');
ok('vercel.json has flags discovery rewrite'); checks++;
const hasApiFlags = rewrites.some(r => r.source === '/api/flags');
assert(hasApiFlags, 'vercel.json has /api/flags rewrite');
ok('vercel.json has /api/flags rewrite'); checks++;

// 7. Check functions includeFiles for flags
const funcs = vercelJson.functions || {};
assert(funcs['api/flags.js'], 'vercel.json has api/flags.js function');
assert(funcs['api/flags.js'].includeFiles && funcs['api/flags.js'].includeFiles.includes('src/flags'), 'api/flags.js includes src/flags');
ok('vercel.json functions include src/flags for api/flags.js'); checks++;
for (const k of ['api/iqc.js','api/iqc3.js','api/iqc4.js','api/iqc5.js','api/ssgc.js','api/lowquality.js']) {
  assert(funcs[k] && funcs[k].includeFiles && funcs[k].includeFiles.includes('src/flags'), `${k} includes src/flags`);
}
ok('All image API functions include src/flags for server-side reporting'); checks++;

// 8. Check HTML files have analytics integration
for (const rel of htmlFiles) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('SKIP (not found):', rel); continue; }
  const html = fs.readFileSync(p, 'utf8');
  assert(html.includes('analytics-init.js'), `${rel} includes analytics-init.js`);
  assert(html.includes('config.js'), `${rel} includes config.js`);
  assert(html.includes('_vercel/insights/script.js'), `${rel} includes insights fallback`);
  assert(html.includes('_vercel/speed-insights'), `${rel} includes speed-insights fallback`);
  ok(`${rel} has full analytics integration`); checks++;
}

// 9. Check src/ui/analytics.js exists
assert(fs.existsSync(path.join(ROOT, 'src/ui/analytics.js')), 'src/ui/analytics.js exists');
const analyticsUi = fs.readFileSync(path.join(ROOT, 'src/ui/analytics.js'), 'utf8');
assert(analyticsUi.includes('DENJI_TRACK'), 'analytics.js has DENJI_TRACK');
assert(analyticsUi.includes('data-flag-values'), 'analytics.js emits flag values');
ok('src/ui/analytics.js exists with flags observability'); checks++;

// 10. Check public/js/flags.js
assert(fs.existsSync(path.join(ROOT, 'public/js/flags.js')), 'public/js/flags.js exists');
ok('public/js/flags.js exists'); checks++;

// 11. Check server.js has flags middleware and analytics track endpoint
const serverContent = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
assert(serverContent.includes('denjiFlags') || serverContent.includes('reportFlags') || serverContent.includes('src/flags'), 'server.js has flags middleware');
assert(serverContent.includes('/.well-known/vercel/flags'), 'server.js has flags discovery route');
assert(serverContent.includes('/api/analytics/track'), 'server.js has analytics track endpoint');
ok('server.js has flags middleware + discovery + analytics track'); checks++;

// 12. Check app.js and docs-engage.js use flags-aware track
const appJs = fs.readFileSync(path.join(ROOT, 'public/js/app.js'), 'utf8');
assert(appJs.includes('DENJI_GET_FLAGS') || appJs.includes('flag_'), 'app.js track includes flags');
ok('public/js/app.js track is flags-aware'); checks++;
const engageJsPath = path.join(ROOT, 'src/ui/docs-engage.js');
if (fs.existsSync(engageJsPath)) {
  const engageContent = fs.readFileSync(engageJsPath, 'utf8');
  assert(engageContent.includes('DENJI_GET_FLAGS') || engageContent.includes('flag_'), 'docs-engage.js track includes flags');
  ok('src/ui/docs-engage.js track is flags-aware'); checks++;
}

// 13. Check package.json has @vercel/analytics, @vercel/speed-insights, flags
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert(pkg.dependencies['@vercel/analytics'], 'package.json has @vercel/analytics');
assert(pkg.dependencies['@vercel/speed-insights'], 'package.json has @vercel/speed-insights');
assert(pkg.dependencies['flags'], 'package.json has flags SDK');
ok('package.json has all analytics + flags dependencies'); checks++;

console.log(`\nAll ${checks} checks PASS - Vercel Web Analytics + Flags observability integrated keseluruhan`);
