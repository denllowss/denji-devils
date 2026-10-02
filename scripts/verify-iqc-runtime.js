// Regression test: Node 24, Linux, TMPDIR baru, tanpa library NSS sistem.
// Bootstrap harus bekerja di Vercel dengan / tanpa flag AWS, serta lokal.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

function jpegSize(buffer) {
  for (let p = 2; p < buffer.length - 9;) {
    if (buffer[p] !== 255) { p++; continue; }
    const marker = buffer[p + 1];
    if (marker === 192 || marker === 194) return [buffer.readUInt16BE(p + 7), buffer.readUInt16BE(p + 5)];
    if (marker === 217 || marker === 218) break;
    if (marker === 216 || marker === 1 || (marker >= 208 && marker <= 215)) { p += 2; continue; }
    p += 2 + buffer.readUInt16BE(p + 2);
  }
  return [];
}

async function invoke(handler, url, method = 'GET') {
  const headers = {};
  let data;
  const response = { statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = String(value); },
    end(value) { data = value ? Buffer.from(value) : Buffer.alloc(0); }
  };
  await handler({ method, url }, response);
  return { status: response.statusCode, headers, data };
}

async function childTest() {
  const iqc = require('../api/iqc');
  const iqc2 = require('../api/iqc2');
  const renderer = require('../src/services/iqc-runtime');
  const reports = [];
  const preflight = await invoke(iqc, '/api/iqc', 'OPTIONS');
  assert.equal(preflight.status, 204);
  assert(!fs.existsSync(path.join(os.tmpdir(), 'chromium')), 'OPTIONS tidak boleh meluncurkan Chromium');
  for (const [handler, endpoint, variant] of [[iqc, '/api/iqc', '1'], [iqc2, '/api/iqc2', '2']]) {
    for (const mode of ['light', 'dark']) {
      const q = new URLSearchParams({ pesan: 'halo ❤\n*Denji API*', name: 'Denji & teman', seed: '42', mode, v2: '0' });
      const start = Date.now();
      const result = await invoke(handler, endpoint + '?' + q);
      assert.equal(result.status, 200, result.headers['x-iqc-error-code']);
      assert.equal(result.headers['content-type'], 'image/jpeg');
      assert.deepEqual(jpegSize(result.data), [1350, 2400]);
      assert.equal(result.headers['x-iqc-variant'], variant);
      assert.equal(result.headers['x-iqc-renderer'], 'chromium-153-node24');
      assert.equal(result.headers['access-control-allow-origin'], '*');
      assert.equal(result.headers['cache-control'], 'no-store');
      reports.push(`${endpoint} ${mode}: 200 JPEG 1350x2400, ${Date.now() - start}ms`);
      const cached = await invoke(handler, endpoint + '?' + q);
      assert.equal(cached.status, 200);
      // Cache bersifat per menit; jika berganti menit, render baru tetap valid.
      if (cached.headers['x-iqc-cache'] === 'HIT') assert(result.data.equals(cached.data));
    }
  }
  const post = await invoke(iqc, '/api/iqc', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers['x-iqc-error-code'], 'METHOD_NOT_ALLOWED');
  assert.equal(renderer.errorCode(new Error('libnss3.so: cannot open shared object file')), 'CHROMIUM_LIBRARY_MISSING');
  assert.equal(renderer.errorCode(Object.assign(new Error(), { code: 'TEMPLATE_NOT_FOUND' })), 'TEMPLATE_NOT_FOUND');
  // Cache perbaikan boleh dipakai proses berikutnya tanpa ekstraksi ulang.
  assert(fs.existsSync(path.join(os.tmpdir(), 'al2023', 'lib', 'libnss3.so')));
  assert(fs.existsSync(path.join(os.tmpdir(), 'al2023', 'lib', 'libnspr4.so')));
  console.log('RESULT ' + JSON.stringify(reports));
}

async function runEnvironment(name, overrides) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'denji-iqc-test-'));
  const env = { ...process.env, TMPDIR: tmp, NODE_ENV: 'production' };
  for (const key of ['VERCEL', 'VERCEL_ENV', 'AWS_EXECUTION_ENV', 'AWS_LAMBDA_JS_RUNTIME', 'LD_LIBRARY_PATH', 'FONTCONFIG_PATH', 'CODEBUILD_BUILD_IMAGE']) delete env[key];
  Object.assign(env, overrides);
  const child = spawn(process.execPath, [__filename, '--child'], { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { errors += data; });
  const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch (_) {} }, 90000);
  try {
    const status = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    assert.equal(status, 0, `${name}: ${errors || output}`);
    const line = output.split('\n').find(s => s.startsWith('RESULT '));
    assert(line, `${name}: hasil tidak diterima`);
    console.log('PASS ' + name);
    JSON.parse(line.slice(7)).forEach(report => console.log('  ' + report));
  } finally {
    clearTimeout(timer);
    try { process.kill(-child.pid, 'SIGKILL'); } catch (_) {}
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv.includes('--child')) {
  childTest().then(() => process.exit(0)).catch(error => { console.error(error.stack); process.exit(1); });
} else {
  (async () => {
    assert(Number(process.versions.node.split('.')[0]) >= 24, 'Uji ini harus dijalankan dengan Node.js 24+');
    assert.equal(process.platform, 'linux', 'Chromium serverless menggunakan Linux');
    await runEnvironment('Vercel tanpa flag AWS (regresi libnss3.so)', { VERCEL: '1' });
    await runEnvironment('Vercel / AWS runtime Node 24', { VERCEL: '1', AWS_EXECUTION_ENV: 'AWS_Lambda_nodejs24.x', AWS_LAMBDA_JS_RUNTIME: 'nodejs24.x' });
    await runEnvironment('Linux lokal tanpa spoof runtime', {});
    console.log('Semua uji bootstrap IQC/IQC2 lulus.');
  })().catch(error => { console.error('FAIL:', error.message); process.exitCode = 1; });
}
