// All IQC variants publish real image metadata and a readable CORS contract.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { imageSize } = require("image-size");
const spec = require("../src/shared/iqc-header-reference.json");
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
let count = 0;
const ok = (n) => {
  count++;
  console.log("PASS " + n);
};
const get = (url, options) =>
  fetch(base + url, { ...options, signal: AbortSignal.timeout(70000) });
(async () => {
  for (const [type, route, n] of [
    ["iqc", "/iqc?seed=42", 1],
    ["iqc2", "/iqc2?seed=42", 2],
    ["iqc3", "/iqc3", 3],
    ["iqc4", "/iqc4", 4],
    ["iqc5", "/iqc5", 5],
  ]) {
    const r = await get(route, { headers: { Origin: "https://example.com" } });
    assert.equal(r.status, 200);
    const bytes = Buffer.from(await r.arrayBuffer()),
      size = imageSize(bytes);
    assert.equal(r.headers.get("X-IQC-Variant"), String(n));
    assert.equal(
      r.headers.get("Content-Type"),
      n === 5 ? "image/png" : "image/jpeg",
    );
    assert.equal(r.headers.get("X-IQC-Width"), String(size.width));
    assert.equal(r.headers.get("X-IQC-Height"), String(size.height));
    assert.equal(r.headers.get("Content-Length"), String(bytes.length));
    assert(r.headers.get("Content-Disposition").includes(type + "."));
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff");
    ok(type + " actual bytes, MIME, width/height, filename");
    const exposed = r.headers
      .get("Access-Control-Expose-Headers")
      .split(/,\s*/);
    assert(spec.exposed.every((h) => exposed.includes(h)));
    assert.equal(r.headers.get("Access-Control-Allow-Origin"), "*");
    assert(!r.headers.get("X-IQC-Error-Code"));
    ok(type + " readable CORS headers, no success error code");
    if (n <= 2) assert(["MISS", "HIT"].includes(r.headers.get("X-IQC-Cache")));
    else assert.equal(r.headers.get("X-IQC-Source"), "reference-photo");
    ok(type + " model-specific cache/source header");
    const head = await get(route, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert(head.headers.get("X-IQC-Width"));
    ok(type + " HEAD metadata without body");
    const opts = await get("/" + type, { method: "OPTIONS" });
    assert.equal(opts.status, 204);
    assert.equal(opts.headers.get("Access-Control-Allow-Origin"), "*");
    assert(opts.headers.get("Access-Control-Allow-Methods").includes("GET"));
    ok(type + " OPTIONS contract");
    if (n >= 3) {
      const file = n === 5 ? "reference.png" : "reference.jpg";
      assert(
        bytes.equals(
          fs.readFileSync(
            path.join(__dirname, "../api", type + "-assets", file),
          ),
        ),
      );
      ok(type + " original reference bytes unchanged");
    }
  }
  const jpg = await get("/iqc5?format=jpg");
  assert.equal(jpg.headers.get("Content-Type"), "image/jpeg");
  assert.equal(jpg.headers.get("X-IQC-Source"), "reference-converted");
  ok("IQC5 JPG metadata distinguishes conversion");
  console.log("TOTAL " + count + " PASS");
})().catch((e) => {
  console.error("FAIL", e.stack);
  process.exitCode = 1;
});
