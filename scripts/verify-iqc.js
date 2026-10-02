// Jalankan setelah npm start; atau BASE_URL=https://domain.vercel.app npm run test:iqc.
// Uji render JPG nyata tanpa dependensi pengujian tambahan.
const assert = require('node:assert/strict');
const base = (process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');

function jpegSize(buffer) {
  for (let p = 2; p < buffer.length - 9;) {
    if (buffer[p] !== 255) { p++; continue; }
    const marker = buffer[p + 1];
    if (marker === 192 || marker === 194) {
      return [buffer.readUInt16BE(p + 7), buffer.readUInt16BE(p + 5)];
    }
    if (marker === 217 || marker === 218) break;
    if (marker === 216 || marker === 1 || (marker >= 208 && marker <= 215)) { p += 2; continue; }
    p += 2 + buffer.readUInt16BE(p + 2);
  }
  return [];
}

async function checkImage(endpoint, params) {
  const url = base + endpoint + '?' + new URLSearchParams(params);
  const start = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(70000) });
  const image = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200, `${endpoint}: status ${response.status}, ${response.headers.get('x-iqc-error-code') || 'render gagal / belum di-deploy'}`);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(jpegSize(image), [1350, 2400]);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const expected = endpoint.endsWith('iqc2') || params.v2 === '1' ? '2' : '1';
  assert.equal(response.headers.get('x-iqc-variant'), expected);
  assert.equal(response.headers.get('x-iqc-renderer'), 'chromium-153-node24');
  assert.equal(response.headers.get('x-iqc-error-code'), null);
  console.log(`PASS ${endpoint} ${params.mode} — 1350 × 2400, ${image.length} bytes, ${Date.now() - start} ms`);
}

(async () => {
  for (const endpoint of ['/iqc', '/iqc2']) {
    for (const mode of ['light', 'dark']) {
      await checkImage(endpoint, { pesan: 'halo ❤\nDenji API', name: 'Denji', mode, seed: '42' });
    }
  }
  await checkImage('/api/iqc', { pesan: 'halo ❤', mode: 'light', seed: '42' });
  await checkImage('/api/iqc2', { pesan: 'halo ❤', name: 'Denji', mode: 'dark', seed: '42' });
  await checkImage('/iqc', { pesan: 'halo ❤', name: 'Denji', mode: 'dark', seed: '42', v2: '1' });
  const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(10000) });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  console.log('PASS /api/health — endpoint lama tetap bekerja');
  console.log('Semua uji IQC lulus.');
})().catch(error => {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
});
