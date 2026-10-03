# Denji API

Linktree, media downloader, dokumentasi API, dan generator IQC / SSGC dalam satu project Express + HTML statis. Runtime deployment: Node.js 24.x. Gunakan Node 24 juga untuk instalasi/pengujian lokal.

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
| GET | `/iqc3`, `/api/iqc3` | JPG iMessage / Apple Music, lirik dan warna dinamis |
| GET | `/iqc4`, `/api/iqc4`, `/qc4`, `/api/qc4` | WhatsApp iOS reaksi + pesan + menu dari foto |
| GET / POST | `/iqc5`, `/api/iqc5`, `/qc5`, `/api/qc5` | WhatsApp profil/nama, PNG default identik foto, JPG opsional |
| GET / POST | `/ssgc`, `/api/ssgc` | Info grup WhatsApp, JPG default identik foto; nama/deskripsi/profil/batas/full dapat diubah |
| GET / POST | `/lowquality`, `/api/lowquality` | Kompresi JPEG berulang dari URL/upload |

Halaman: `/` (linktree), `/dl` (downloader), `/docs` (dokumentasi + playground), `/app` (editor quote Instagram), `/app3` (editor musik/lirik IQC3), `/app4` (editor reaksi IQC4), `/app5` (editor profil/nama IQC5), `/ssgc-app` (editor info grup; alias `/app-ssgc`).

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

## IQC3 — iMessage × Apple Music

Uji endpoint setelah server berjalan: `npm run test:iqc3`. Untuk deployment: `BASE_URL=https://domain-anda.vercel.app npm run test:iqc3`.

Berdasarkan foto referensi pengguna. Endpoint `/iqc3` (alias `/api/iqc3`) menghasilkan JPG quote musik iMessage; editor lengkap ada di `/app3`.

- **Default persis foto:** tanpa perubahan parameter, API mengirim JPEG referensi asli, identik byte/piksel. Reaksi dan menu tidak digambar ulang.
- **Konten dapat diubah:** lirik, nama musik, artis, dan label waktu. Maksimum 1000 karakter lirik, 100 karakter nama lagu/artis.
- **Tinggi otomatis:** saat teks diubah, kartu musik/menu dan tinggi gambar menyesuaikan. Lebar 736 px, tinggi minimal 1308 px; lirik tidak dipotong secara visual. Hasil bukan selalu rasio 9:16.
- **Gradient atau solid:** warna diterapkan pada kartu lirik/musik; latar layar blur tetap mengambil foto. Default gradient menggunakan tekstur foto. Warna khusus memakai dua stop gradient atau satu warna solid.
- Hasil adalah gambar statis, bukan pemutar audio. Teks dinamis memakai font Inter; desain/ikon/latar berasal dari foto. Tidak menjanjikan font iOS dinamis yang identik pixel-per-pixel.

```bash
# Foto referensi asli
curl 'http://localhost:3000/iqc3' -o iqc3.jpg

# Teks & gradient khusus
curl --get 'http://localhost:3000/iqc3' \
  --data-urlencode 'lirik=Langit sore dan lagu favorit kita.' \
  --data-urlencode 'music=Good Days' \
  --data-urlencode 'artist=SZA' \
  --data 'bg=gradient&color1=2e617b&color2=312553&angle=135' \
  -o iqc3.jpg

# Latar solid
curl --get 'http://localhost:3000/iqc3' \
  --data-urlencode 'lirik=Pesanmu di sini' \
  --data 'bg=solid&color=1f4260' \
  -o iqc3-solid.jpg
```

| Parameter | Perilaku |
| --- | --- |
| `lirik` | Lirik/pesan. Alias `lyrics` atau `pesan`. Baris baru didukung; 1000 karakter. |
| `music` | Nama musik. Default Good Days; alias `judul`, `title`, `lagu`. |
| `artist` | Artis. Default SZA; alias `artis`. |
| `bg` | `gradient` (default) atau `solid`. Alias `background`. |
| `color1`, `color2` | Hex warna gradient, dengan/tanpa `#`. Gunakan URL encoding bila memakai `#`. |
| `color` | Hex untuk mode solid. |
| `angle` | Sudut gradient 0–360°, default 135. |
| `time` | Label waktu, default 0:03, maksimum 10 karakter. |
| `html` | `1` untuk template preview HTML; selain itu JPG. |

`X-IQC-Variant: 3` dan `X-IQC-Source: reference-photo` / `dynamic-render` membedakan hasil. Error IQC3 berupa JSON + header `X-IQC-Error-Code`; sukses selalu JPG. Semua asset/template dikemas bersama fungsi Vercel; tidak perlu sumber gambar/font eksternal.

Editor `/app3` menyediakan pratinjau browser instan lewat template HTML yang sama. Render server hanya diperlukan saat unduh/buka JPG. `api/iqc3-assets/` berisi JPEG referensi dan asset turunannya dari foto yang diberikan; `_template3.html` menanamkan asset/font sebagai data URI.


## Playground IQC lengkap

Buka `/docs#playground`, kemudian pilih IQC1, IQC2, IQC3, atau IQC4. Tiap versi mempunyai form khusus seluruh parameter yang didukung, 6 contoh siap coba (24 total), penjelasan batas/default, alias endpoint, URL dan inspector query, serta contoh cURL/JavaScript/Python/PHP/Go yang mengikuti isian.

- IQC1: pesan (baris baru/emoji/format WhatsApp), mode, seed, `/iqc` / `/api/iqc`.
- IQC2: semua field IQC1 + nama, alias `/iqc2`, `/api/iqc2`, `/iqc?v2=1`, `/api/iqc?v2=1`.
- IQC3: lirik, musik, artis, gradient/solid, warna hex, sudut, label waktu, JPG/HTML, dan alias API.
- IQC4: pesan, tema, reaksi, dua jam, bintang/menu/bar reaksi, baterai, jaringan, bahasa menu dan JPG/HTML.
- Edit otomatis memperbarui gambar setelah jeda 850 ms, dengan satu render aktif. Otomatis dapat dijeda; **Kirim** tetap tersedia. Preview dan unduh menggunakan satu respons yang sama. HTML hanya tersedia melalui API lanjutan, bukan output Playground.
- Status HTTP, ukuran, dimensi, renderer, cache/source dan kode error tersedia di detail respons. Gambar fallback IQC1/IQC2 tidak dianggap sebagai HTTP sukses.
- Isian disimpan per versi di browser; bisa kembali ke contoh default lewat Reset. URL manual dapat mengisi form kembali.

Tautan langsung: `/docs?playground=iqc#playground`, `/docs?playground=iqc2#playground`, `/docs?playground=iqc3#playground`. Contoh spesifik: `/docs?playground=iqc3&preset=solid#playground`.

## Lowquality — JPEG Deep Fry API

API `/lowquality` (alias `/api/lowquality`) mengadaptasi algoritme Canvas dari [THE JPEG ZONE](https://jpeg.wavebeem.com/), sumber [wavebeem/the-jpeg-zone](https://github.com/wavebeem/the-jpeg-zone). Lisensi MIT dan copyright asli dipertahankan dalam `licenses/the-jpeg-zone-MIT.md` dan `THIRD_PARTY_NOTICES.md`.

Tidak memanggil situs sumber untuk memproses foto pengguna: Canvas berjalan di Chromium Denji memakai bootstrap yang sama dengan IQC. Default mengikuti sumber: **25 putaran, quality 30%, resolusi 0.125 MP**. Kualitas langkah ke-i = `(quality + ((i * 7) % 10)) / 100`; kualitas di luar rentang Canvas mengikuti perilaku browser (mis. quality=100 dengan offset >0 memakai fallback browser). Hasil dapat berbeda antarbrowser.

**Playground lengkap:** `/lowquality-app` — upload/drag/drop/paste, URL, contoh gambar, preset, sebelum/sesudah, unduh, cURL dinamis dan "goreng lagi" dari hasil terakhir. Dokumentasi tersedia di `/docs#ep-lowquality`; preset di Playground utama memakai POST JSON URL gambar publik.

### Input & parameter

- GET `?url=...`, POST JSON `{url:...}`, POST multipart field `image`, POST JSON `{image:"data:image/png;base64,..."}`, atau raw `image/*` dengan parameter query.
- Pilih **satu** sumber: URL atau upload/base64. Query mengoverride pengaturan body.
- `iterations`: 0–100 (default 25), alias `count`/`times`.
- `quality`: integer 1–100% (default 30); lebih kecil berarti lebih rusak.
- `resolution`: 0.0625–4 megapiksel atau `original` (default 0.125); alias `size`. Resize mempertahankan rasio, tidak upscale.
- `iterations=0` mengembalikan **file asli**, tanpa resize/konversi, mengikuti perilaku sumber. Format bukan selalu JPEG; header MIME dan filename mengikuti input.

```bash
# URL gambar publik
curl --get 'https://denji-devils.vercel.app/lowquality' \
  --data-urlencode 'url=https://jpeg.wavebeem.com/icon.jpg' \
  --data 'iterations=25&quality=30&resolution=0.125' \
  -o lowquality.jpg

# Upload
curl 'http://localhost:3000/lowquality' \
  -F 'image=@gambar.png' -F 'iterations=50' \
  -F 'quality=5' -F 'resolution=0.0625' \
  -o lowquality.jpg
```

**Batas:** upload/base64 3 MB, download URL 8 MB, input 16 MP/32767 px per sisi, output 4 MB, beban 100 megapiksel-putaran/request. Timeout download total 20 detik, pemrosesan 35 detik. Turunkan iterations/resolution bila mendapatkan `WORKLOAD_TOO_LARGE`.

Format JPEG, PNG, WebP, GIF, AVIF, BMP didukung; SVG tidak. JPEG memakai latar putih untuk transparansi dan tidak mempertahankan animasi. `X-Lowquality-*` menyediakan parameter, dimensi, byte input/output dan kode error. Error selalu JSON dengan status 400/413/415/422/502/504/500, bukan JPEG fallback.

URL hanya HTTP/HTTPS publik tanpa kredensial/port nonstandar. DNS diperiksa dan dipin ke IP publik, setiap redirect divalidasi, dan alamat private/loopback/link-local/reserved/metadata diblokir. Browser renderer tidak mengakses resource eksternal. Gambar hanya diproses di memori, tidak disimpan atau diunggah ke THE JPEG ZONE.

Uji lowquality setelah server berjalan: `npm run test:lowquality`. Untuk deployment: `BASE_URL=https://domain-anda.vercel.app npm run test:lowquality`.

## IQC4 — WhatsApp iOS dari foto

Endpoint `/iqc4`, alias `/api/iqc4`, `/qc4`, `/api/qc4`. Editor `/app4`; Playground lengkap `/docs?playground=iqc4#playground`. IQC1/2/3 dan lowquality tidak diganti.

**Cara ubah sama seperti IQC/IQC2:** `?pesan=teks`. Alias `message` / `text` juga didukung. Foto asli 555×1200 dipakai tanpa re-encode jika seluruh parameter default; hasil byte-identik. Setelah diubah, teks menggunakan Inter dan ikon/latar blur berasal dari foto; bukan klaim font iOS pixel-identik. Bubble membungkus otomatis dan menu bergerak ke bawah, sehingga pesan panjang tidak dipotong.

```bash
curl --get 'https://denji-devils.vercel.app/iqc4' \
  --data-urlencode 'pesan=note: kamu tidak gagal, kamu sedang belajar.' \
  --data-urlencode 'reaction=👍' \
  --data 'mode=dark&time=21.30&statusTime=21.32' \
  -o iqc4.jpg
```

| Parameter | Nilai / default |
|---|---|
| `pesan` | Maks. 1000 karakter; alias `message` / `text`. Default `note: ga ada yang namanya manusia gagal`. |
| `mode` | `light` (default) / `dark`. |
| `time` | Jam pesan HH.mm / HH:mm; default 20.15; alias `waktu`. |
| `statusTime` | Jam status bar; default 07.54; alias `jam` / `status_time`. |
| `reaction` | ❤️ (default), 👍, 😂, 😮, 😢, 🙏 atau `none`; alias `emoji` / `reaksi`. Nama heart/like/haha/wow/sad/pray diterima. |
| `star` | `1` (default) / `0`; label menu ikut berubah Unstar / Star. |
| `menu` | `1` (default) / `0` untuk popup menu. |
| `reactions` | `1` (default) / `0` untuk bar reaksi; terpisah dari badge reaction. |
| `battery` | 0–100%, default 90; alias `baterai`. ≤20% berwarna merah. |
| `network` | 4G (default), 5G, LTE, 3G, WIFI. |
| `lang` | `en` (default) / `id` untuk bahasa label menu. |
| `html` | `1` untuk template HTML; selain itu JPEG. |

Format pesan mengikuti IQC/IQC2: Enter, *tebal*, _miring_, ~coret~, kode, daftar, dan kutipan. Emoji umum disematkan sebagai PNG; karakter/emoji lain mengikuti font browser. Tidak ada `name` atau `seed` karena foto tidak menampilkan nama dan latarnya tetap. Jam IQC4 eksplisit, tidak berubah mengikuti WIB. Menu statis ini tidak melakukan aksi pada WhatsApp asli.

Template/font/ikon tersimpan sebagai data URI, tanpa mengambil asset saat request. Bootstrap Chromium153 + Node24 sama dengan renderer lama; tidak menggunakan Chromium lain. `X-IQC-Variant: 4`, `X-IQC-Source: reference-photo/dynamic-render`, serta `X-IQC-Width/Height` memberi metadata. Error aman berupa JSON 405/500 dengan `X-IQC-Error-Code`. GET, HEAD dan CORS OPTIONS didukung.

Uji: jalankan server, lalu `npm run test:iqc4`. Deployment: `BASE_URL=https://domain-anda.vercel.app npm run test:iqc4`.

### Perbaikan alpha emoji IQC4

Bar reaksi dan badge memakai PNG RGBA asli dengan tepi anti-alias transparan, bukan potongan JPEG berlatar putih. Keenam glyph dinormalisasi agar rata dan memakai sumber yang sama pada light/dark, editor, template HTML, dan JPEG API. Foto default tetap byte-identik.

Uji regresi semua 6 reaksi × 2 tema: `npm run test:iqc4:emoji`. Untuk membuat ulang asset/template secara offline (Pillow): `python3 scripts/build-iqc4-emoji-assets.py`. Jangan threshold/salin ulang emoji dari JPEG referensi karena akan menimbulkan halo putih.


## IQC5 / QC5 — Nama & Foto Profil

V5 menggunakan screenshot WhatsApp 736×1308 yang disediakan pengguna. **`GET /iqc5` mengembalikan PNG asli byte-identik**, bukan hasil render ulang. Pada render kustom, geometri mengikuti foto, font Roboto disertakan offline, nama berwarna dan avatar bulat dapat diubah, dan bubble/avatar/menu menyesuaikan tinggi pesan. Render edit tidak diklaim pixel-identik. Bintang pink **★** pada foto adalah nama pengirim default, terpisah dari opsi `star` pesan.

- Rute: `/iqc5`, `/api/iqc5`, `/qc5`, `/api/qc5` (GET, POST, HEAD, OPTIONS).
- Editor semua field + preview langsung: `/app5`.
- Playground lengkap, 9 contoh, kode lima bahasa, URL/parameter/header/unduhan: `/docs?playground=iqc5#playground`.
- Dokumentasi GET/POST, profil URL/upload, default dan error: `/docs#ep-iqc5`.
- Output default **PNG**; `format=jpg` / `format=jpeg` untuk JPEG; `html=1` untuk template HTML offline.

```bash
# PNG asli, default persis
curl --fail 'http://localhost:3000/iqc5' -o iqc5.png

# Nama dan pesan sendiri
curl --get --fail 'http://localhost:3000/iqc5' \
  --data-urlencode 'name=Denji' \
  --data-urlencode 'pesan=Halo, ini namaku. ❤' \
  -o iqc5.png

# Upload profil sendiri
curl --fail 'http://localhost:3000/iqc5' \
  -F 'name=Denji' \
  -F 'pesan=Halo, ini nama dan profilku. ❤' \
  -F 'profile=@foto.png' \
  -o iqc5.png
```

| Parameter | Default / perilaku |
| --- | --- |
| `pesan`, alias `message` / `text` | `dikasih muka cakep , ngapain harus faker? 🤣🤤`; maks. 1000, Enter/emoji/format WhatsApp |
| `name`, alias `nama` | `★`; maks. 30 karakter |
| `nameColor`, alias `warnaNama` | `#b83e91`; hex 6 digit |
| `profile`, alias `avatar` / `pp` | `default` avatar bawaan; `none` tanpa avatar; atau URL gambar publik |
| `profileColor` | `#8f0835`, untuk avatar bawaan |
| `mode` / `time` (alias `waktu`) | `dark` / `10:00`; jam HH:mm atau HH.mm |
| `reaction` (alias `emoji` / `reaksi`) | `none`; 👍 ❤️ 😂 😮 😢 🙏, alias like/heart/haha/wow/sad/pray |
| `star` / `menu` / `reactions` | `0` / `1` / `1`; bintang pesan, menu konteks, bar emoji |
| `lang`, alias `language` | `id`; `en` untuk label Inggris |
| `format` / `html` | `png` / tanpa HTML; JPEG opsional / `html=1` untuk template |

POST mendukung multipart (satu file `profile`, alias file `avatar` / `image`), JSON `profileData` base64/data URI, atau body `image/*` mentah. Parameter query mengoverride body, termasuk alias. Profil maksimal **2 MB / 4 MP**, body JSON maksimal 3 MB; JPEG/PNG/WebP/GIF/AVIF/BMP, bukan SVG. URL menggunakan downloader DNS-pinned yang sama dengan Lowquality; private/localhost/metadata, redirect berbahaya, kredensial URL dan port khusus ditolak. Foto tidak ditulis ke disk; cache hasil terbatas 10 entry di memori. Error JSON memiliki status HTTP dan `X-IQC-Error-Code`; `X-IQC-Source`, width/height membedakan foto asli dan hasil render.

Emoji toolbar dan badge menggunakan keenam PNG RGBA native IQC4 yang sudah diperbaiki, **bukan threshold/crop JPEG**; tidak menambahkan halo putih. Pesan V5 menambahkan emoji native 🤣 dan 🤤. Font Roboto berlisensi OFL tersedia di `licenses/Roboto-OFL.txt`.

```bash
# Server aktif untuk pengujian API/UI (BASE_URL dapat menunjuk produksi)
npm run test:iqc5
npm run test:iqc5:ui

# Template dan editor offline dapat dibangun ulang tanpa network
python3 scripts/build-iqc5-template.py
python3 scripts/build-iqc5-editor.py
```


## Playground gambar langsung — seluruh IQC1–IQC5

`/docs#playground` dan deep link `/docs?playground=iqc5#playground` sekarang memakai **output gambar**, bukan template HTML. Nilai default pesan/nama/tema/warna/jam sesuai API sudah terisi. Edit form → URL, tabel parameter, cara pakai dan kode cURL/JavaScript/Python/PHP/Go langsung mengikuti input; setelah jeda **850 ms**, preview gambar diperbarui otomatis. Hanya satu render aktif; perubahan saat render diproses setelahnya, dan respons lama tidak menimpa isian terbaru.

- **Pratinjau gambar otomatis** bisa dijeda; `Kirim` tetap tersedia. `Bersihkan` menghapus hasil dan menjeda otomatis.
- **Lihat / pakai default** mengisi ulang semua field relevan. Tautan **Buka gambar default API** tetap tersedia. Seed IQC1/2 opsional; kosong = acak, jam tetap WIB.
- IQC1–4: JPG; IQC5: PNG default atau JPG. Opsi HTML di Playground dihapus, tetapi `html=1` pada API IQC3–5 tetap berfungsi untuk pengguna lanjutan.
- Foto upload IQC5 menggunakan POST multipart. Semua parameter teks berada pada URL/kode; foto ada di field `profile`. Browser tidak perlu menetapkan Content-Type/boundary sendiri.
- Preview, metadata dan unduhan menggunakan **satu respons yang sama**, bukan fetch gambar kedua. Hasil lama ditandai selama render baru; error tidak dilabeli sebagai sukses.
- Header yang tersedia per model dijelaskan di `/docs#iqc-headers-reference` dan di form. Panel hasil menampilkan **semua header aktual yang terbaca oleh fetch**, HTTP, metode, ukuran dan URL request.
- Semua API IQC sekarang memberikan `X-IQC-Width`, `X-IQC-Height` dan `Content-Disposition` untuk gambar. `X-IQC-Cache` hanya IQC1/2; `X-IQC-Source` IQC3–5; `X-IQC-Error-Code` kondisional. Metadata ini diekspos melalui CORS; bytes default foto tetap sama.

Sumber UI yang mudah dirawat: `src/ui/iqc-playground.js`, `src/ui/playground-response.js`; kontrak header bersama: `src/shared/iqc-header-reference.json`. Build embedding offline/idempotent:

```bash
python3 scripts/build-docs-playground.py
npm run test:iqc:playground
npm run test:iqc:headers
```


### Validasi konfigurasi Vercel

Vercel membatasi setiap string `functions.*.includeFiles` / `excludeFiles` hingga **256 karakter**. Fungsi utama memakai satu wildcard `api/iqc*-assets/**` untuk aset IQC3–5, bukan mengulang setiap versi; total pola 228 karakter. Chromium, Puppeteer, template dan handler IQC tetap dikecualikan dari `api/index.js`, sedangkan dependency downloader utama tetap disertakan.

```bash
npm run test:vercel
```

Tes ini memeriksa batas panjang semua pola serta kecocokan file yang harus dikecualikan/dipertahankan. Jalankan dengan Node.js 24 sesuai runtime project.


## SSGC — Info Grup WhatsApp

Model tersendiri (bukan IQC6), dari JPEG pengguna 739 × 1600. API `/ssgc` / `/api/ssgc`, editor `/ssgc-app` / `/app-ssgc`, Playground `/docs?playground=ssgc#playground`.

- **Default JPG byte-identik** dengan foto asli yang disimpan di `api/ssgc-assets/reference.jpg`. `format=png` adalah konversi lossless dari gambar JPEG, bukan file asli.
- **Edit nama / deskripsi / profil:** nama maks. 64 grapheme, deskripsi maks. 2000. Nama/deskripsi panjang menggeser menu ke bawah dan memperbesar tinggi output. Font `serif` default; `titleFont=sans` memakai Roboto.
- **Baca selengkapnya:** `limit` (alias `batas`) 0–2000, default 44. Link hijau hanya muncul jika teks benar-benar terpotong. Emoji ZWJ/flag/combining mark dihitung sebagai satu grapheme, tidak dipotong di tengah. `full=1` atau `limit=0` menampilkan semua teks tanpa link.
- **Tidak mengarang bagian tersembunyi:** deskripsi default hanya teks yang terlihat pada screenshot (`WELCOME TO—VOXEN FIGHTER\n#VOXEN ANTI-DIMMING...`). Bagian setelah link tidak diketahui; masukkan sendiri teks lengkap untuk mode full.
- **Profil:** `profile=default` / `none` / URL gambar HTTP(S) publik; upload lewat POST multipart field `profile` (alias file `avatar` / `image`), POST JSON `profileData` base64/data URI, atau body `image/*` mentah. Maks. 2 MB / 4 MP. Query mengoverride body, termasuk alias.
- **Input aman:** DNS downloader di-pin ke IP publik; tiap redirect diperiksa. URL private/localhost/metadata, kredensial, port khusus, SVG dan raster rusak ditolak. Template memakai font/emoji RGBA transparan offline; renderer tidak mengakses jaringan. Body maks. 3 MB, field multipart maks. 8192 byte, gambar hasil maks. 4 MB / tinggi 20000 px.
- **Editor dan Playground:** default tersedia/resettable, preview gambar otomatis 850 ms, satu request aktif, hasil lama tidak menimpa isian baru, opsi pause/manual. Unduh memakai blob respons yang sama. URL/kode lima bahasa mengikuti semua input dan nama file pilihan. Payload SSGC dengan URL di atas 6000 karakter otomatis memakai POST JSON, atau metadata field multipart jika upload.
- **Metadata:** `X-SSGC-Variant: group-info`, `-Source`, `-Renderer`, `-Width`, `-Height`, `-Description-Length`, `-Description-Shown`, `-Description-Limit`, `-Truncated`; `-Error-Code` pada kegagalan. Semua metadata gambar/pemotongan diekspos melalui CORS. `Cache-Control: no-store`; cache render terbatas di memori.

```bash
# Default foto asli
curl --fail 'http://localhost:3000/ssgc' -o ssgc.jpg

# Nama / deskripsi / batas sebelum Baca selengkapnya
curl --get --fail 'http://localhost:3000/ssgc' \
  --data-urlencode 'name=Grup Kita' \
  --data-urlencode 'description=Selamat datang di grup kita. ❤ Tempat berbagi cerita dan belajar bersama.' \
  --data 'limit=45' -o ssgc.jpg

# Upload profil, seluruh deskripsi ditampilkan
curl --fail 'http://localhost:3000/ssgc' \
  --form-string 'name=Komunitas Denji' \
  --form-string 'description=Deskripsi lengkap Anda. ❤' \
  -F 'full=1' -F 'profile=@foto.png' -o ssgc.jpg

# JSON untuk deskripsi panjang (profil URL opsional)
curl --fail 'http://localhost:3000/api/ssgc' \
  -H 'Content-Type: application/json' \
  --data-raw '{"name":"Grup Kita","description":"Teks lengkap Anda","full":1,"format":"png"}' \
  -o ssgc.png
```

Parameter tambahan `members` / `anggota` 0–999999 (default 126); nama alias `nama` / `groupName` / `group`; deskripsi alias `deskripsi` / `desc`; profil alias `avatar` / `pp`; batas alias `descriptionLimit`; mode penuh alias `fullDescription`; font alias `font`. `html=1` menyediakan template offline API lanjutan; editor/Playground selalu mengirim gambar.

### Build & verifikasi SSGC

```bash
# Python 3 + Pillow diperlukan hanya saat membangun ulang template.
npm run build:ssgc
# Server harus berjalan. BASE_URL dapat diubah ke deployment produksi.
npm run test:ssgc
npm run test:ssgc:ui
npm run test:vercel
```

Source template `src/ui/ssgc-template.html`, controller editor `src/ui/ssgc-editor.js`, controller Playground `src/ui/iqc-playground.js`, dan referensi header `src/shared/ssgc-header-reference.json`. Builder menjaga JPEG asli tanpa recompression serta root/public HTML mirrors identik. Noto Serif berlisensi OFL di `licenses/NotoSerif-OFL.txt`; Roboto/emoji memakai aset transparan yang sama dengan IQC5.
