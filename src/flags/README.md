# Denji Flags + Vercel Web Analytics - Integrasi Keseluruhan

Integrasi mengikuti docs resmi:
- https://vercel.com/docs/analytics/quickstart
- https://vercel.com/docs/analytics/custom-events
- https://vercel.com/docs/analytics/package
- https://vercel.com/docs/flags/observability/web-analytics
- https://vercel.com/docs/flags/flags-explorer/reference

## Ringkasan

Project Denji adalah static HTML + Express (Node 24.x) tanpa Next.js. Web Analytics diintegrasikan untuk semua halaman via 2 metode yang saling fallback:

1. **HTML5 official** (paling andal di Vercel):
```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```
File `public/js/analytics-init.js` berisi init queue `va` & `si` dan dimuat synchronous di `<head>` semua halaman.

2. **@vercel/analytics package** via CDN dynamic import di `public/js/config.js`:
```js
import(`https://cdn.jsdelivr.net/npm/@vercel/analytics@2.0.1/dist/index.mjs`)
  .then(m => m.inject({ mode: "auto", beforeSend: redactSensitive }))
import(`https://cdn.jsdelivr.net/npm/@vercel/speed-insights@2.0.0/dist/index.mjs`)
  .then(m => m.injectSpeedInsights())
```
Ini memberikan `beforeSend` untuk redact data sensitif dan `track()` dengan flags support.

Server Express lokal (`server.js`) membalas stub JS kosong untuk `/_vercel/insights/script.js` dan `/_vercel/speed-insights/script.js` agar tidak 404, tanpa merekam metrik.

## Feature Flags

### Definisi
`src/flags/definitions.json` berisi 7 flags:

- `docs_desktop_workspace` - layout workspace desktop dua panel
- `docs_engage_layer` - related links, next-step, quick bar, footer explore
- `home_grouping` - homepage grouping dengan badge Populer/Baru/Update
- `playground_auto_preview` - auto preview 850ms debounce, satu render aktif
- `ssgc_full_layout` - SSGC full inline centered, balanced inset 46px, WA formatting
- `iqc_emoji_transparent` - fix emoji tepi putih dengan RGBA PNG
- `analytics_custom_events` - custom events tracking untuk bounce-rate reduction

Setiap flag punya `description`, `origin` (URL docs), dan `options` true/false dengan label.

### Emisi ke DOM untuk Web Analytics
Web Analytics otomatis lookup flag values di DOM via `data-flag-values`. Emisi dilakukan di `public/js/config.js`:

```html
<script type="application/json" data-flag-definitions>
  { "docs_desktop_workspace": { "description": "...", "options": [...] }, ... }
</script>
<script type="application/json" data-flag-values>
  { "docs_desktop_workspace": true, ... }
</script>
```

Fungsi `denjiEmitFlags()` di config.js membuat 2 script tag dengan `data-denji="1"` agar mudah dihapus/re-emit saat flag berubah via `?flag_<key>=0/1` atau localStorage `denji_flag_<key>`.

Global:
- `window.DENJI_FLAGS` - semua flag values
- `window.DENJI_FLAG_DEFINITIONS` - definisi
- `window.DENJI_GET_FLAG(key)` - baca satu flag
- `window.DENJI_GET_FLAGS()` - baca semua
- `window.DENJI_SET_FLAG(key, bool)` - set via localStorage + reload

### Flags Explorer Discovery Endpoint
Vercel Toolbar / Flags Explorer akan request `/.well-known/vercel/flags` untuk mendapatkan definisi.

- `vercel.json` rewrite: `/.well-known/vercel/flags` -> `/api/flags`
- `api/flags.js` mengembalikan:
```json
{
  "definitions": { "flagName": { "description": "...", "options": [...] } },
  "hints": [],
  "overrideEncryptionMode": "plaintext" // atau "encrypted" jika FLAGS_SECRET set
}
```
Jika `FLAGS_SECRET` env var diset di Vercel Dashboard, endpoint memverifikasi `Authorization` header dan mengembalikan 401 jika gagal. Untuk dev tanpa secret, selalu allow.

File `src/flags/index.js` menyediakan:
- `safeJsonStringify` - anti XSS
- `getFlag(key, req)` - dengan override dari query `?flag_<key>=1`, cookie `vercel-flag-overrides`, env `FLAG_<KEY>`, dan default
- `getAllFlags(req)`
- `reportValue(key, value)` - memanggil `reportValue` dari package `flags` jika tersedia, fallback ke console.log `[FLAGS]`
- `reportAllFlags(req)` - report semua

### Client-side tracking dengan flags
Sesuai https://vercel.com/docs/flags/observability/web-analytics#tracking-feature-flags-in-client-side-events

```js
import { track } from '@vercel/analytics';
track('My Event', {}, { flags: ['summer-sale'] });
```

Di project ini, helper `track()` di `public/js/app.js` dan `src/ui/docs-engage.js` sudah flags-aware:

```js
function track(name, data, opts) {
  const allFlags = DENJI_GET_FLAGS();
  const flagKeys = opts?.flags || Object.keys(allFlags);
  const enriched = { ...data };
  for (const [k,v] of Object.entries(allFlags)) enriched['flag_'+k] = v ? 1 : 0;
  if (window.DENJI_TRACK) DENJI_TRACK(name, enriched, { flags: flagKeys });
  else {
    va('event', { name, data: enriched, flags: flagKeys });
    va.track(name, enriched, { flags: flagKeys });
  }
}
```

`public/js/config.js` juga menyediakan `window.DENJI_TRACK` yang:
- auto-include semua flag keys
- enrich data dengan `flag_<key>=1/0`
- kirim ke `window.va` dan `window.__denji_analytics_track` (dari @vercel/analytics)
- juga kirim ke server `/api/analytics/track` via fetch keepalive untuk server-side observability

Custom events yang sudah ada:
- `home_view`, `home_link_click`, `home_share`
- `docs_view`, `docs_click`, `docs_related_click`, `docs_quick_click`, `docs_quick_search`, `docs_scroll` (25/50/75/90), `docs_time`, `playground_next_click`, `playground_preset_chip`, `footer_explore`, dll
- `denji_page_view` - auto track dengan flags_enabled count

Semua event akan otomatis ter-annotate dengan flags karena `data-flag-values` ada di DOM.

### Server-side tracking
Sesuai https://vercel.com/docs/flags/observability/web-analytics#server-side-tracking

```js
import { reportValue } from 'flags';
reportValue('summer-sale', false);

import { track } from '@vercel/analytics/server';
track('My Event', {}, { flags: ['summer-sale'] });
```

Di project ini:
- `src/flags/server-helpers.js` menyediakan `reportFlags(req)` dan `trackServerEvent(name, data, flagKeys, req)`
- `server.js` middleware melaporkan semua flags untuk setiap request via `X-Denji-Flags` header dan `reportValue`
- `server.js` punya endpoint `POST /api/analytics/track` yang menerima `{name, data, flags}` dan memanggil `track` dari `@vercel/analytics/server`
- Semua API image (`api/iqc.js`, `api/iqc3.js`, `api/iqc4.js`, `api/iqc5.js`, `api/ssgc.js`, `api/lowquality.js`) memanggil `reportFlags(req)` di awal handler
- `api/flags.js` juga report flags sebelum return definitions

Jika `VERCEL_URL` tidak ada (lokal), `@vercel/analytics/server` akan log `[Vercel Web Analytics] Can't find VERCEL_URL` - ini normal, tracking hanya aktif di Vercel.

## Redaksi Data Sensitif
`beforeSend` di `config.js`:
- ignore event jika URL mengandung `/private`, `/admin`, `token`, `email=`, `password=`, `secret=`
- redact query params sensitif: `token`, `password`, `secret`, `email`, `phone`, `wa`, `nomor` -> `[redacted]`
- Sesuai https://vercel.com/docs/analytics/redacting-sensitive-data

## Cara Aktifkan di Vercel Dashboard

1. Deploy project ke Vercel
2. Vercel Dashboard -> Project -> Analytics -> Enable Web Analytics
3. Vercel Dashboard -> Project -> Speed Insights -> Enable
4. (Opsional) Set `FLAGS_SECRET` env var untuk encrypted overrides:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   Tambahkan sebagai env var di Vercel, scope Production & Preview, mark Sensitive.

Setelah deploy, cek Network tab: harus ada request ke `/<unique-path>/view` dan `/<unique-path>/event` (atau `/_vercel/insights/...`).

## Debug Lokal

- Buka console, jalankan `DENJI_LIST_FLAGS()` untuk lihat flags
- `localStorage.setItem('denji_debug_flags','1')` untuk log flags emit
- `DENJI_SET_FLAG('home_grouping', false)` untuk override
- URL override: `?flag_docs_desktop_workspace=0`
- `localStorage.setItem('denji_flag_docs_desktop_workspace','0')` lalu reload

## File Penting

- `public/js/analytics-init.js` - init queues va/si
- `public/js/config.js` - inject analytics + flags emission + DENJI_TRACK + beforeSend
- `public/js/flags.js` - standalone flags fallback
- `src/ui/analytics.js` - full integration embedded inline di docs.html
- `src/flags/definitions.json` - flag definitions
- `src/flags/index.js` - server shared logic
- `src/flags/server-helpers.js` - server tracking helpers
- `api/flags.js` - discovery endpoint
- `server.js` - middleware flags + analytics track endpoint + discovery routes
- `vercel.json` - rewrites untuk `/.well-known/vercel/flags` dan `api/flags`, functions includeFiles untuk src/flags
- `public/js/app.js` & `src/ui/docs-engage.js` - track flags-aware

## Verifikasi

```bash
npm run test:analytics
npm run test:vercel
```

`verify-analytics.js` mengecek 25 poin: analytics-init, config.js flags, definitions.json, discovery endpoint, vercel.json rewrites, HTML integration di 9 halaman, server middleware, track flags-aware, dependencies.

Semua halaman yang diuji:
- `/` (index.html)
- `/docs` (docs.html)
- `/dl` (dl.html)
- `/app` (app.html)
- `/app3` (app3.html)
- `/app4` (app4.html)
- `/app5` (app5.html)
- `/ssgc-app` (ssgc-app.html)
- `/lowquality-app` (lowquality.html)
