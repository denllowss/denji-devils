// IQC5 API regression: exact PNG, profiles, autoheight, formats and safe input.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { imageSize } = require("image-size");
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
let total = 0;
const ok = (n) => {
  total++;
  console.log("PASS " + n);
};
const get = (route, options) =>
  fetch(base + route, { ...options, signal: AbortSignal.timeout(70000) });
const query = (o) => "/iqc5?" + new URLSearchParams(o);
async function image(route, label, options) {
  const r = await get(route, options);
  assert.equal(
    r.status,
    200,
    "HTTP " + r.status + " " + r.headers.get("X-IQC-Error-Code"),
  );
  assert.equal(r.headers.get("X-IQC-Variant"), "5");
  const b = Buffer.from(await r.arrayBuffer()),
    s = imageSize(b);
  assert.equal(s.width, 736);
  assert(s.height >= 1308);
  assert.equal(
    r.headers.get("content-type"),
    s.type === "png" ? "image/png" : "image/jpeg",
  );
  assert.equal(Number(r.headers.get("X-IQC-Height")), s.height);
  ok(label + " " + s.type + " " + s.width + "×" + s.height);
  return { b, s, r };
}
async function error(route, status, label, options) {
  const r = await get(route, options);
  assert.equal(r.status, status);
  const j = await r.json();
  assert.equal(j.code, status);
  assert.equal(j.error, r.headers.get("X-IQC-Error-Code"));
  ok(label + " → JSON " + status);
}
(async () => {
  const lazyRequest = {method:"POST",url:"/iqc5",headers:{"content-type":"application/json"}};
  Object.defineProperty(lazyRequest,"body",{get(){throw new SyntaxError("Malformed JSON");}});
  const lazyHeaders={};let lazyBody;
  const lazyResponse={statusCode:200,setHeader(name,value){lazyHeaders[name]=value;},end(value){lazyBody=JSON.parse(value);}};
  await require('../api/iqc5')(lazyRequest,lazyResponse);
  assert.equal(lazyResponse.statusCode,400);assert.equal(lazyBody.error,"INVALID_BODY");
  ok("Vercel lazy JSON parser returns safe 400");
  const original = await image("/iqc5", "Default");
  assert(
    original.b.equals(
      fs.readFileSync(path.join(__dirname, "../api/iqc5-assets/reference.png")),
    ),
  );
  assert.equal(original.r.headers.get("X-IQC-Source"), "reference-photo");
  ok("PNG default byte-identik foto 736×1308");
  for (const route of ["/api/iqc5", "/qc5", "/api/qc5"])
    assert((await image(route, "Alias " + route)).b.equals(original.b));
  await image(
    query({
      name: "Denji",
      pesan: "Halo ❤",
      nameColor: "63c5a4",
      profileColor: "801c45",
    }),
    "Nama, warna nama/avatar dan pesan",
  );
  const custom = await image(
    query({ time: "10.01" }),
    "Jam khusus dengan teks asli",
  );
  assert.equal(custom.s.height, 1308);
  assert.equal(custom.r.headers.get("X-IQC-Source"), "dynamic-render");
  await image(
    query({
      nama: "Sahabat",
      message:
        "*Halo* & # ❤\n_italic_ ~coret~ `kode`\n- Satu\n- Dua\n> Kutipan",
      mode: "light",
      emoji: "pray",
      waktu: "21.30",
      lang: "en",
      star: 1,
    }),
    "Alias + tema terang + format + reaksi + bintang",
  );
  const long = await image(
    query({
      name: "Nama yang cukup panjang sekali",
      text: "Kamu sudah berusaha hari ini. ❤\n".repeat(30),
    }),
    "Teks panjang",
  );
  assert(long.s.height > 1308);
  ok("autoheight: bubble/avatar/menu tidak terpotong");
  await image(
    query({
      name: "Denji",
      pesan: "Minimal.",
      profile: "none",
      menu: 0,
      reactions: 0,
      reaction: "none",
    }),
    "Tanpa avatar/menu/bar",
  );
  const jpg = await image(query({ format: "jpg" }), "JPG default");
  assert.equal(jpg.s.type, "jpg");
  assert.equal(jpg.r.headers.get("X-IQC-Source"), "reference-converted");
  await image(
    query({
      name: "Denji",
      pesan: "JPG khusus.",
      format: "jpeg",
      reaction: "😮",
    }),
    "JPEG kustom",
  );
  const profile = fs.readFileSync(
    path.join(__dirname, "../public/images/iqc5-avatar-demo.png"),
  );
  let form = new FormData();
  form.append("name", "Denji");
  form.append("pesan", "Halo, ini profilku. ❤");
  form.append(
    "profile",
    new Blob([profile], { type: "image/png" }),
    "profil.png",
  );
  await image("/iqc5", "Upload multipart", { method: "POST", body: form });
  await image("/api/iqc5", "JSON profileData", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Denji",
      pesan: "Halo JSON.",
      profileData: "data:image/png;base64," + profile.toString("base64"),
    }),
  });
  await image(query({ name: "Denji", format: "jpg" }), "Raw image body", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: profile,
  });
  const html = await get(
    query({
      name: "<script>bad</script>",
      pesan: "</script><img src=x onerror=alert(1)> ❤",
      html: 1,
    }),
  );
  assert.equal(html.status, 200);
  assert(html.headers.get("content-type").includes("text/html"));
  const h = await html.text();
  assert(h.includes("\\u003cscript>"));
  assert(!h.includes("<script>bad</script>"));
  assert(h.includes("window.__iqc5Ready"));
  ok("HTML offline + nama/pesan di-escape aman");
  const jsonHtml = await get(query({ name: "Query override", html: 1 }), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Body name",
      message: "Halo body",
      profileData: profile.toString("base64"),
    }),
  });
  const ht = await jsonHtml.text();
  assert(ht.includes('"name":"Query override"'));
  assert(ht.includes('"message":"Halo body"'));
  assert(ht.includes('"profileKind":"image"'));
  ok("Query mengoverride body, JSON profile embedded");
  const aliasOverride = await get(
    query({ nama: "Alias query", message: "Pesan alias query", html: 1 }),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Nama body", pesan: "Pesan body" }),
    },
  );
  const aliasHtml = await aliasOverride.text();
  assert(
    aliasHtml.includes('"name":"Alias query"') &&
      aliasHtml.includes('"message":"Pesan alias query"'),
  );
  ok("Query alias mengoverride field canonical body");
  await image(
    query({
      name: "Denji",
      profile: "https://jpeg.wavebeem.com/icon.jpg",
      pesan: "Profil URL publik.",
    }),
    "URL publik melalui downloader aman",
  );
  for (const url of [
    "http://127.0.0.1/image.png",
    "http://localhost/foto.png",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.1.1/a.png",
    "http://[::1]/a.png",
    "file:///etc/passwd",
    "https://user:pass@example.com/a.png",
  ])
    await error(query({ profile: url }), 400, "SSRF ditolak " + url);
  await error("/iqc5", 405, "PUT ditolak", { method: "PUT" });
  await error("/iqc5", 400, "JSON salah", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{bad",
  });
  await error("/iqc5", 415, "Body tidak didukung", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "hello",
  });
  await error("/iqc5", 415, "SVG ditolak", {
    method: "POST",
    headers: { "content-type": "image/svg+xml" },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"/>',
  });
  await error("/iqc5", 415, "Raster tidak valid", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: "not png",
  });
  const largePixels = Buffer.from(profile);
  largePixels.writeUInt32BE(3000, 16);
  largePixels.writeUInt32BE(1500, 20);
  await error("/iqc5", 413, "Dimensi >4 MP ditolak", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: largePixels,
  });
  const brokenPng = profile.subarray(0, 33);
  await error("/iqc5", 415, "Header PNG ada, decoding gagal aman", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: brokenPng,
  });
  await error("/iqc5", 413, "Foto >2 MB ditolak", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  form = new FormData();
  form.append(
    "profile",
    new Blob([Buffer.alloc(2 * 1024 * 1024 + 1)], { type: "image/png" }),
    "large.png",
  );
  await error("/iqc5", 413, "Multipart >2 MB ditolak", {
    method: "POST",
    body: form,
  });
  form = new FormData();
  form.append("profile", new Blob([profile], { type: "image/png" }), "one.png");
  form.append("avatar", new Blob([profile], { type: "image/png" }), "two.png");
  await error("/iqc5", 400, "Dua file ditolak", { method: "POST", body: form });
  await error(
    query({ profile: "https://jpeg.wavebeem.com/icon.jpg" }),
    400,
    "URL + upload ambigu",
    { method: "POST", headers: { "content-type": "image/png" }, body: profile },
  );
  const head = await get("/qc5", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal(head.headers.get("content-type"), "image/png");
  ok("HEAD tanpa body");
  const options = await get("/api/qc5", { method: "OPTIONS" });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("access-control-allow-origin"), "*");
  ok("CORS preflight");
  const cached = await image(
    query({ time: "10.01" }),
    "Cache render konsisten",
  );
  const again = await get(query({ time: "10.01" }));
  assert(Buffer.from(await again.arrayBuffer()).equals(cached.b));
  ok("hasil cache byte-konsisten selama entry tersimpan");
  console.log("TOTAL " + total + " PASS");
})().catch((e) => {
  console.error("FAIL", e.stack);
  process.exitCode = 1;
});
