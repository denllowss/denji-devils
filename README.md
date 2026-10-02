# Denji API

Linktree, media downloader, dokumentasi API, dan generator IQC dalam satu project Express + HTML statis. Runtime deployment: Node.js 24.x.

## Jalankan lokal

```bash
npm install
npm start
```

Uji render nyata (server harus sedang berjalan):

```bash
npm run test:iqc
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

- `api/iqc.js`: handler serverless + renderer, memakai `puppeteer-core` dan `@sparticuz/chromium`.
- `api/_template.html` dan `api/_template2.html`: template asli dengan font/emoji tertanam.
- `server.js`: adapter route Express untuk pengujian lokal.
- `app.html` dan `public/app.html`: halaman editor yang sama, ditambah navigasi Denji dan tombol unduh API.
- `docs.html` dan `public/docs.html`: dokumentasi yang sama untuk static deployment dan Express.

## Deployment Vercel

Gunakan project Vercel Denji yang sudah ada; tidak perlu membuat deployment terpisah untuk IQC.

- `api/iqc.js` menjadi fungsi tersendiri, dengan batas durasi 60 detik dan konfigurasi memori 2048 MB.
- `includeFiles: "api/_template*.html"` memasukkan kedua template dari root project.
- Route API lama diarahkan ke `api/index.js` secara eksplisit. Catch-all `/api/(.*)` tidak dipakai agar tidak mengambil alih `/api/iqc`.
- Bundle `api/index.js` mengecualikan renderer/template/dependensi Chromium IQC; endpoint downloader/health/profile tidak perlu memuat browser.
- Root `app.html` disertakan karena static deployment project ini memakai berkas HTML di root; Express menyajikan salinannya dari `public/`.

Cold start Chromium lebih lambat daripada request hangat. Render pertama lokal sudah diverifikasi menghasilkan JPG; deployment Vercel tetap perlu diuji setelah perubahan di-push/deploy. Untuk Linux lokal yang bukan runtime Vercel, library sistem Chromium mungkin perlu dipasang (misalnya NSS, NSPR, ATK, GBM, Pango, Cairo, dan ALSA).

## Analytics dan Speed Insights

`@vercel/analytics` dan `@vercel/speed-insights` sudah terpasang. Situs ini bukan Next.js, jadi bootstrap browser berada di `public/js/config.js`, menggunakan API `inject()` dan `injectSpeedInsights()` melalui ESM CDN yang versinya dipatok. Toggle-nya ada pada `ANALITIK`.

Semua halaman, termasuk editor IQC, memuat config tersebut. Contoh komponen `/next` disimpan sebagai komentar untuk migrasi Next.js, bukan dijalankan di HTML statis. Aktifkan Analytics/Speed Insights di dashboard Vercel agar data dikumpulkan. Script pengukuran `/_vercel/...` tersedia pada deployment Vercel. Express lokal membalas stub JS kosong pada dua path SDK agar browser tidak mencoba membaca fallback HTML sebagai JavaScript; tidak ada metrik yang direkam oleh stub.
