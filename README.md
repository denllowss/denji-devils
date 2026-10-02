# Denji API

Linktree, media downloader, dokumentasi API, dan generator IQC dalam satu project Express + HTML statis. Runtime deployment: Node.js 24.x. Gunakan Node 24 juga untuk instalasi/pengujian lokal.

## Jalankan lokal

```bash
npm install
npm start
```

Uji render nyata (server harus sedang berjalan):

```bash
npm run test:iqc
# Regression test Node 24/Vercel tanpa server dan tanpa flag AWS:
npm run test:iqc:runtime
# Untuk memeriksa deployment:
# BASE_URL=https://domain-anda.vercel.app npm run test:iqc
```

Buka `http://localhost:3000`. Port dapat diatur dengan variabel lingkungan `PORT`. Chromium dimuat hanya ketika endpoint IQC dipanggil; browser hangat dipakai ulang untuk request berikutnya.

## Endpoint

| Method | Path | Hasil |
| --- | --- | --- |
| GET / POST | `/api/dl` | JSON hasil media downloader |
| GET | `/api/stream`, `/api/proxy` | Stream/proxy media |
| GET | `/api/health` | JSON status server |
| GET | `/api/profile` | JSON profil |
| GET | `/iqc`, `/api/iqc` | JPG quote Instagram |
| GET | `/iqc2`, `/api/iqc2` | JPG quote menu konteks WhatsApp |

Halaman: `/` (linktree), `/dl` (downloader), `/docs` (dokumentasi + playground), `/app` (editor quote Instagram).

## IQC

Implementasi digabung langsung dari [denllowss/iqc](https://github.com/denllowss/iqc), commit `dbea0d6acf4d01d7be402a3d68154350b8b304dc`. Ini bukan proxy ke deployment IQC lain: render berjalan di project ini.

```bash
# IG: pesan/emoji, dark mode, seed untuk mengunci wallpaper & baterai
curl --get 'http://localhost:3000/iqc' \
  --data-urlencode 'pesan=halo ❤' \
  --data 'mode=dark&seed=42' \
  -o quote.jpg

# WhatsApp: nama pada kartu dapat diganti
curl --get 'http://localhost:3000/iqc2' \
  --data-urlencode 'pesan=halo ges ❤' \
  --data-urlencode 'name=Denji' \
  --data 'mode=light&seed=42' \
  -o quote2.jpg
```

| Parameter | Perilaku |
| --- | --- |
| `pesan` | Opsional; pesan default jika kosong. Maksimum 1000 karakter, mendukung emoji, baris baru, dan format teks WhatsApp. Input di-escape sebelum masuk HTML. |
| `mode` | `dark` atau `light`. Default v1: light; default v2: dark. |
| `seed` | Bilangan bulat nonnegatif. Mengunci wallpaper/baterai v1 dan baterai v2; latar v2 tetap. Tanpa seed, nilai acak diambil per request. |
| `name` | Nama pada kartu v2. Default `Jidar`, maksimum 30 karakter. Tidak digunakan pada v1. |
| `v2` | `1` pada `/iqc` setara dengan `/iqc2`. |

Endpoint IQC membolehkan CORS untuk GET publik. Respons sukses adalah **`image/jpeg`**, 1350 × 2400 px (9:16), kualitas 90 — **bukan JSON**. Bila render gagal dua kali, handler mengirim gambar fallback dengan status 500.

Header `Cache-Control: no-store` tetap dipakai, termasuk jika seed disertakan. Seed eksplisit memungkinkan cache **memori server per menit WIB**, bukan cache browser/CDN. Jam pada kartu tetap berjalan, jadi seed tidak membuat gambar identik lintas waktu. Emoji umum dan font tertanam; sebagian emoji lain dimuat dari CDN, dengan fallback bila CDN tidak tersedia.

Di `/docs`, gunakan preset **IQC · IG** atau **IQC · WhatsApp**. Playground menampilkan dan mengunduh blob JPG dari respons yang sama, tanpa request render kedua. Di `/app`, klik bubble untuk mengedit pesan lalu pilih **Unduh JPG**.

### Berkas IQC

- `api/iqc.js`: handler v1 + renderer bersama; `api/iqc2.js`: handler v2 tersendiri, memaksa versi WhatsApp tanpa bergantung pada parameter rewrite.
- `src/services/iqc-runtime.js`: bootstrap bersama Chromium 153 + Puppeteer 25, ekstraksi library NSS/NSPR AL2023, pemulihan cache `/tmp`, dan path library sebelum browser diluncurkan.
- `api/_template.html` dan `api/_template2.html`: template asli dengan font/emoji tertanam.
- `server.js`: adapter route Express untuk pengujian lokal.
- `app.html` dan `public/app.html`: halaman editor yang sama, ditambah navigasi Denji dan tombol unduh API.
- `docs.html` dan `public/docs.html`: dokumentasi yang sama untuk static deployment dan Express.

## Deployment Vercel

Gunakan project Vercel Denji yang sudah ada; tidak perlu membuat deployment terpisah untuk IQC.

- `api/iqc.js` dan `api/iqc2.js` masing-masing menjadi fungsi tersendiri, dengan batas durasi 60 detik dan konfigurasi memori 2048 MB.
- `includeFiles: "{api/_template*.html,node_modules/@sparticuz/chromium/bin/*.br}"` memasukkan kedua template dan arsip binari/library Chromium dari root project.
- Route API lama diarahkan ke `api/index.js` secara eksplisit. Catch-all `/api/(.*)` tidak dipakai agar tidak mengambil alih `/api/iqc`.
- Bundle `api/index.js` mengecualikan renderer/template/dependensi Chromium IQC; endpoint downloader/health/profile tidak perlu memuat browser.
- Root `app.html` disertakan karena static deployment project ini memakai berkas HTML di root; Express menyajikan salinannya dari `public/`.

Cold start Chromium lebih lambat daripada request hangat. Bootstrap dieksekusi/ditunggu oleh request, bukan warm-up di latar saat import. Library NSS/NSPR diekstrak eksplisit dari paket, termasuk bila Vercel tidak mengisi flag AWS; tidak perlu mengubah `AWS_LAMBDA_JS_RUNTIME` menjadi Node 20/22. Cache parsial atau binari `/tmp` dari versi lama dipulihkan sebelum launch.

`npm run test:iqc:runtime` memverifikasi render IG/WhatsApp light/dark dalam tiga lingkungan Node 24 dengan TMPDIR baru: Vercel tanpa flag AWS, Vercel/AWS Node 24, dan Linux lokal. Gunakan `BASE_URL=... npm run test:iqc` untuk menguji deployment yang sudah live.

Header `X-IQC-Renderer`, `X-IQC-Variant` dan `X-IQC-Cache` membantu verifikasi deployment. Jika status 500, `X-IQC-Error-Code` berisi kode aman (misalnya `CHROMIUM_LIBRARY_MISSING`, `CHROMIUM_ASSETS_MISSING`, atau `TEMPLATE_NOT_FOUND`); detail/stack hanya masuk log server, bukan respons publik.

Script npm memakai `scripts/run-node.js` agar Node project tidak dibayangi `node_modules/.bin/node` yang terpasang sebagai peer dependency downloader.

## Analytics dan Speed Insights

`@vercel/analytics` dan `@vercel/speed-insights` sudah terpasang. Situs ini bukan Next.js, jadi bootstrap browser berada di `public/js/config.js`, menggunakan API `inject()` dan `injectSpeedInsights()` melalui ESM CDN yang versinya dipatok. Toggle-nya ada pada `ANALITIK`.

Semua halaman, termasuk editor IQC, memuat config tersebut. Contoh komponen `/next` disimpan sebagai komentar untuk migrasi Next.js, bukan dijalankan di HTML statis. Aktifkan Analytics/Speed Insights di dashboard Vercel agar data dikumpulkan. Script pengukuran `/_vercel/...` tersedia pada deployment Vercel. Express lokal membalas stub JS kosong pada dua path SDK agar browser tidak mencoba membaca fallback HTML sebagai JavaScript; tidak ada metrik yang direkam oleh stub.
