// Guard Vercel's 256-character glob limit and keep the main API bundle light.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../vercel.json');
let total = 0;
function ok(label) { total++; console.log('PASS ' + label); }
for (const [name, settings] of Object.entries(config.functions)) {
  assert(name.length <= 256, 'Function pattern exceeds 256 characters: ' + name);
  assert(fs.existsSync(path.join(__dirname, '..', name)), 'Function file missing: ' + name);
  for (const key of ['includeFiles', 'excludeFiles']) if (settings[key] !== undefined) {
    assert.equal(typeof settings[key], 'string');
    assert(settings[key].length <= 256, name + '.' + key + ' exceeds 256 characters');
    ok(name + '.' + key + ': ' + settings[key].length + '/256 characters');
  }
}
assert.equal(typeof path.matchesGlob, 'function', 'Run this test with the project Node.js 24 runtime.');
const pattern = config.functions['api/index.js'].excludeFiles;
const excluded = [
  'api/iqc.js','api/iqc2.js','api/iqc3.js','api/iqc4.js','api/iqc5.js','api/ssgc.js','api/lowquality.js',
  'api/_template.html','api/_template2.html','api/_template3.html','api/_template4.html','api/_template5.html','api/_template-ssgc.html',
  'api/iqc3-assets/reference.jpg','api/iqc4-assets/reaction-58.png','api/iqc5-assets/reference.png',
  'api/iqc5-assets/roboto-400.woff2','api/ssgc-assets/reference.jpg','api/ssgc-assets/noto-serif-700.woff2','src/services/iqc-runtime.js','src/services/lowquality.js',
  'node_modules/@sparticuz/chromium/bin/chromium.br',
  'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js',
  'node_modules/@puppeteer/browsers/lib/esm/main.js'
];
for (const file of excluded) { assert(path.matchesGlob(file, pattern), 'Heavy asset not excluded: ' + file); ok('Excluded ' + file); }
for (const file of ['api/index.js','server.js','src/services/tiktok.js','src/services/instagram.js','src/services/video.js','src/shared/iqc-header-reference.json','src/shared/ssgc-header-reference.json']) {
  assert(!path.matchesGlob(file, pattern), 'Main API dependency incorrectly excluded: ' + file); ok('Kept ' + file);
}
console.log('TOTAL ' + total + ' PASS');
