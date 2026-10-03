// IQC3 — iMessage / Apple Music lyrics card, berdasarkan foto pengguna.
const exposedHeaders = require('../src/shared/iqc-header-reference.json').exposed.join(', ');
const { imageSize } = require('image-size');
const fs = require('node:fs');
const path = require('node:path');
const { errorCode } = require('../src/services/iqc-runtime');
const iqc = require('./iqc');

const DEFAULTS = Object.freeze({
  lyrics: "I don't regret, just pretend shit never happened",
  music: 'Good Days', artist: 'SZA', time: '0:03',
  background: 'gradient', color1: '#6b6040', color2: '#704600', color: '#66502d', angle: 135
});
let template, reference;
const cache = new Map();
const inflight = new Map();

function readFile(filename) {
  const paths = [path.join(__dirname, filename), path.join(process.cwd(), 'api', filename), path.join(process.cwd(), filename)];
  for (const candidate of paths) {
    try { return fs.readFileSync(candidate); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const error = new Error('Asset/template IQC3 tidak masuk bundle deployment.');
  error.code = 'TEMPLATE_NOT_FOUND'; throw error;
}
function text(value, fallback, limit) {
  const cleaned = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  return cleaned ? cleaned.slice(0, limit) : fallback;
}
function hex(value, fallback) {
  const v = String(value || '').replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{6}$/.test(v) ? '#' + v : fallback;
}
function parameters(req) {
  const q = new URL(req.url, 'http://iqc.local').searchParams;
  const mode = q.get('bg') || q.get('background') || 'gradient';
  const angleValue = q.get('angle');
  const angle = angleValue !== null && Number.isFinite(Number(angleValue)) ? Math.max(0, Math.min(360, Number(angleValue))) : DEFAULTS.angle;
  const p = {
    lyrics: text(q.get('lirik') ?? q.get('lyrics') ?? q.get('pesan'), DEFAULTS.lyrics, 1000),
    music: text(q.get('music') ?? q.get('judul') ?? q.get('title') ?? q.get('lagu'), DEFAULTS.music, 100),
    artist: text(q.get('artist') ?? q.get('artis'), DEFAULTS.artist, 100),
    time: text(q.get('time'), DEFAULTS.time, 10),
    background: mode === 'solid' ? 'solid' : 'gradient',
    color1: hex(q.get('color1'), DEFAULTS.color1),
    color2: hex(q.get('color2'), DEFAULTS.color2),
    color: hex(q.get('color'), DEFAULTS.color), angle
  };
  p.reference = Object.keys(DEFAULTS).every(key => p[key] === DEFAULTS[key]);
  p.referenceGradient = p.background === 'gradient' && p.color1 === DEFAULTS.color1 && p.color2 === DEFAULTS.color2 && p.angle === DEFAULTS.angle;
  return { p, html: q.get('html') === '1' };
}
function buildHtml(p) {
  if (!template) template = readFile('_template3.html').toString('utf8');
  const json = JSON.stringify(p).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return template.replace('__IQC3_DATA__', () => json);
}
async function image(p) {
  if (p.reference) {
    if (!reference) reference = readFile('iqc3-assets/reference.jpg');
    // Default memakai foto asli: piksel, font, ikon & framing identik.
    return reference;
  }
  const key = JSON.stringify(p);
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);
  const pending = iqc.renderImage(buildHtml(p), {
    width: 736, height: 1308, scale: 1, fullPage: true, variant: 3, quality: 95
  }).then(result => {
    const buffer = Buffer.from(result);
    cache.set(key, buffer);
    if (cache.size > 12) cache.delete(cache.keys().next().value);
    return buffer;
  }).finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
  res.setHeader('X-IQC-Variant', '3');
  res.setHeader('X-IQC-Renderer', 'chromium-153-node24');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({status:'error',code:405,message:'IQC3 menggunakan GET'})); return;
  }
  const { p, html } = parameters(req);
  try {
    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(buildHtml(p)); return;
    }
    let result;
    try { result = await image(p); }
    catch (_) { result = await image(p); }
    const size = imageSize(result);
    res.setHeader('X-IQC-Width', String(size.width));
    res.setHeader('X-IQC-Height', String(size.height));
    res.setHeader('Content-Disposition', 'inline; filename="iqc3.jpg"');
    res.setHeader('X-IQC-Source', p.reference ? 'reference-photo' : 'dynamic-render');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(result.length));
    res.end(result);
  } catch (error) {
    console.error('[iqc3]', errorCode(error), error.stack);
    res.statusCode = 500;
    res.setHeader('X-IQC-Error-Code', errorCode(error));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({status:'error',code:500,message:'Gagal membuat IQC3',error:errorCode(error)}));
  }
};
