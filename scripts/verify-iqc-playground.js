// Full IQC1–5 Playground: live pictures, serialized requests, defaults, snippets, headers.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { prepareChromium } = require("../src/services/iqc-runtime");
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const dir = process.env.QA_DIR || "/home/user/qa/iqc-playground-all";
fs.mkdirSync(dir, { recursive: true });
let total = 0;
const ok = (label, value = true) => {
  assert(value, label);
  total++;
  console.log("PASS " + label);
};
const input = (p, id, value) =>
  p.$eval(
    "#" + id,
    (e, v) => {
      e.value = v;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value,
  );
async function image(p, type, pesan) {
  await p.waitForFunction(
    ({ type, pesan }) => {
      const i = document.querySelector("#pgResponseCode img");
      if (!i?.complete || !i.naturalWidth) return false;
      const u = new URL(i.dataset.endpoint, location.origin),
        model = pgIqc.info(i.dataset.endpoint)?.type;
      return (
        model === type &&
        (!pesan ||
          u.searchParams.get(type === "iqc3" ? "lirik" : "pesan") === pesan) &&
        document.getElementById("pgStatusBadge").textContent.includes("200") &&
        !document.getElementById("pgSubmitBtn").disabled
      );
    },
    { timeout: 70000 },
    { type, pesan },
  );
}
(async () => {
  const r = await prepareChromium(),
    browser = await r.puppeteer.launch({
      args: r.chromium.args,
      env: r.env,
      executablePath: r.executablePath,
      headless: "shell",
      defaultViewport: { width: 1600, height: 1000 },
    });
  try {
    const p = await browser.newPage(),
      errors = [],
      calls = [];
    let concurrent = 0,
      maxConcurrent = 0;
    const pending = new Set();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (req) => {
      const u = new URL(req.url());
      if (/^\/(api\/)?(?:iqc[2345]?|qc[45])\/?$/.test(u.pathname)) {
        calls.push({ url: req.url(), method: req.method() });
        pending.add(req);
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
      }
    });
    for (const event of ["requestfinished", "requestfailed"])
      p.on(event, (req) => {
        if (pending.delete(req)) concurrent--;
      });
    await p.goto(base + "/docs?playground=iqc#playground", {
      waitUntil: "load",
    });
    await image(p, "iqc");
    ok("Default IQC1 otomatis menjadi gambar");
    ok(
      "Default pesan terisi nyata",
      await p.$eval(
        "#pgIqcText",
        (e) => e.value === "see u, hopefully we will meet in the next life.",
      ),
    );
    ok(
      "Lima model pilihan",
      await p.$$eval("[data-iqc-type]", (a) => a.length === 5),
    );
    ok("Auto default aktif", await p.$eval("#pgIqcAuto", (e) => e.checked));
    const types = ["iqc", "iqc2", "iqc3", "iqc4", "iqc5"];
    for (const type of types) {
      await p.evaluate((t) => {
        pgIqc.select(t);
        pgIqc.reset();
      }, type);
      await image(p, type);
      ok(
        type + " default terisi dan punya gambar",
        await p.$eval("#pgIqcText", (e) => e.value.length > 0),
      );
      ok(
        type + " default guide tersedia",
        await p.$eval("#pgIqcDefaultValues", (e) => e.children.length > 0),
      );
      ok(
        type + " header sesuai model",
        await p.$eval(
          "#pgIqcHeaderReference",
          (e) =>
            e.textContent.includes("X-IQC-Width") &&
            e.textContent.includes("Access-Control-Expose-Headers"),
        ),
      );
      ok(
        type + " dimensi nyata dari header",
        await p.$eval(
          "#pgResponseInfo",
          (e) =>
            e.textContent.includes("x-iqc-width") &&
            e.textContent.includes("x-iqc-height") &&
            e.textContent.includes("content-disposition"),
        ),
      );
      ok(
        type + " tidak ada opsi HTML",
        await p.$$eval("#pgIqcFormat option,#pgIqcWaFormat option", (a) =>
          a.every((e) => e.value !== "html"),
        ),
      );
      const text = "Pesan " + type + " & # $money ❤\nBaris kedua.";
      await input(p, "pgIqcText", text);
      if (type === "iqc" || type === "iqc2") {
        await input(p, "pgIqcMode", "dark");
        await input(p, "pgIqcSeed", "42");
        if (type === "iqc2") await input(p, "pgIqcName", "O'Connor");
      }
      if (type === "iqc3") {
        await input(p, "pgIqcSong", "Lagu input user");
        await input(p, "pgIqcArtist", "Artis input user");
        await input(p, "pgIqcBg", "solid");
        await input(p, "pgIqcHexSolid", "#275c74");
        await input(p, "pgIqcTime", "1:24");
      }
      if (type === "iqc4") {
        await input(p, "pgIqcWaMode", "dark");
        await input(p, "pgIqcReaction", "👍");
        await input(p, "pgIqcWaTime", "21.30");
        await input(p, "pgIqcStatusTime", "21.32");
        await input(p, "pgIqcBattery", "67");
        await input(p, "pgIqcNetwork", "5G");
        await input(p, "pgIqcLanguage", "id");
        await input(p, "pgIqcStar", "0");
      }
      if (type === "iqc5") {
        await input(p, "pgIqcName", "Nama user");
        await input(p, "pgIqcNameColor", "#63c5a4");
        await input(p, "pgIqcProfileSource", "none");
        await input(p, "pgIqcWaMode", "light");
        await input(p, "pgIqcReaction", "🙏");
        await input(p, "pgIqcWaTime", "18:30");
        await input(p, "pgIqcStar", "1");
      }
      await image(p, type, text);
      ok(type + " edit otomatis menghasilkan gambar terbaru");
      const expected = await p.$eval("#pgEndpoint", (e) =>
        Object.fromEntries(new URL(e.value, location.origin).searchParams),
      );
      ok(
        type + " input → URL tepat",
        expected[type === "iqc3" ? "lirik" : "pesan"] === text &&
          !("html" in expected),
      );
      for (const language of ["curl", "javascript", "python", "php", "go"]) {
        await p.evaluate((l) => pgIqc.language(l), language);
        const code = await p.$eval("#pgIqcCode", (e) => e.textContent);
        ok(
          type + " kode mengikuti isian " + language,
          code.includes(type) &&
            Object.keys(expected).every((k) => code.includes(k)) &&
            !code.includes(".html"),
        );
        if (language === "javascript")
          new Function("return async function(){" + code + "}");
      }
      ok(
        type + " hasil hanya img/bukan iframe",
        await p.$$eval("#pgResponseCode iframe", (a) => a.length === 0),
      );
      ok(
        type + " nama file gambar tepat",
        await p.$eval(
          "#pgResponseCode a",
          (e, type) =>
            e.download === type + (type === "iqc5" ? ".png" : ".jpg"),
          type,
        ),
      );
      ok(
        type + " petunjuk sesuai tipe",
        await p.$eval(
          "#pgIqcHowTo",
          (e) =>
            e.textContent.includes("GET") &&
            e.textContent.includes("blob/binary"),
        ),
      );
    }
    // Fast edits cause a single trailing request, rather than one request per key.
    const before = calls.length;
    await input(p, "pgIqcText", "Satu");
    await input(p, "pgIqcText", "Dua");
    await input(p, "pgIqcText", "Tiga");
    await image(p, "iqc5", "Tiga");
    ok("Debounce menggabungkan edit cepat", calls.length === before + 1);
    // An edit during a render must not paint the obsolete response.
    await input(
      p,
      "pgIqcText",
      "Render awal unik " + Date.now() + " " + "catatan ".repeat(75),
    );
    await p.waitForFunction(
      () => document.getElementById("pgSubmitBtn").disabled,
      { timeout: 15000 },
    );
    await input(
      p,
      "pgIqcText",
      "Ini isian terbaru saat render masih berjalan.",
    );
    await image(p, "iqc5", "Ini isian terbaru saat render masih berjalan.");
    ok("Hasil lama tidak menimpa input terbaru");
    ok("Maksimal satu request render aktif", maxConcurrent <= 1);
    // Pausing does not stop dynamic code generation.
    await p.locator("#pgIqcAuto").click();
    const paused = calls.length;
    await input(p, "pgIqcText", "Saat dijeda, kode tetap mengikuti input.");
    await p.waitForFunction(
      () =>
        document.getElementById("pgIqcCode").textContent.includes("Saat") ||
        document.getElementById("pgIqcCode").textContent.includes("Saat+"),
    );
    await new Promise((r) => setTimeout(r, 1200));
    ok("Jeda auto tidak membuat request", calls.length === paused);
    ok(
      "URL tetap mengikuti saat dijeda",
      await p.$eval(
        "#pgIqcUrl",
        (e) =>
          new URL(e.value).searchParams.get("pesan") ===
          "Saat dijeda, kode tetap mengikuti input.",
      ),
    );
    await p.locator("#pgSubmitBtn").click();
    await image(p, "iqc5", "Saat dijeda, kode tetap mengikuti input.");
    ok("Kirim manual tetap menghasilkan gambar");
    await input(
      p,
      "pgEndpoint",
      "/api/qc5?nama=Alias&message=Halo+alias&warnaNama=61bbba&avatar=none&reaksi=haha&waktu=18%3A30&star=false&lang=en&html=1",
    );
    await p.$eval("#pgEndpoint", (e) =>
      e.dispatchEvent(new Event("change", { bubbles: true })),
    );
    ok(
      "Alias URL mengisi semua field",
      await p.evaluate(
        () =>
          document.getElementById("pgIqcName").value === "Alias" &&
          document.getElementById("pgIqcReaction").value === "😂" &&
          document.getElementById("pgIqcProfileSource").value === "none",
      ),
    );
    ok(
      "html=1 dinormalisasi ke gambar",
      await p.$eval(
        "#pgEndpoint",
        (e) => !new URL(e.value, location.origin).searchParams.has("html"),
      ),
    );
    // IQC5 file changes code and method as well as the returned picture.
    await p.evaluate(() => pgIqc.preset("upload"));
    await (
      await p.$("#pgIqcProfileFile")
    ).uploadFile(path.join(__dirname, "../public/images/iqc5-avatar-demo.png"));
    ok(
      "Upload mengubah metode POST",
      await p.$eval("#pgMethod", (e) => e.value === "POST"),
    );
    ok(
      "Cara pakai upload menjelaskan boundary",
      await p.$eval(
        "#pgIqcHowTo",
        (e) =>
          e.textContent.includes("multipart") &&
          e.textContent.includes("boundary"),
      ),
    );
    for (const language of ["curl", "javascript", "python", "php", "go"]) {
      await p.evaluate((l) => pgIqc.language(l), language);
      ok(
        "Kode upload " + language,
        await p.$eval("#pgIqcCode", (e) =>
          /FormData|profile=@|files=|CURLFile|multipart.NewWriter/.test(
            e.textContent,
          ),
        ),
      );
      ok(
        "Nama file asli di kode " + language,
        await p.$eval("#pgIqcCode", (e) =>
          e.textContent.includes("iqc5-avatar-demo.png"),
        ),
      );
      if (language === "javascript") {
        const code = await p.$eval("#pgIqcCode", (e) => e.textContent);
        new Function("return async function(){" + code + "}");
      }
    }
    await p.locator("#pgSubmitBtn").click();
    await image(p, "iqc5");
    ok("Upload profil tetap membalas gambar");
    await p.evaluate(() => pgIqc.reset());
    ok(
      "Reset mengembalikan default lengkap",
      await p.evaluate(
        () =>
          document.getElementById("pgIqcName").value === "★" &&
          document.getElementById("pgIqcProfileSource").value === "default" &&
          document.getElementById("pgIqcWaTime").value === "10:00",
      ),
    );
    await p.locator("#pgIqcAuto").click();
    await image(p, "iqc5");
    await p.$eval("#playground", (e) =>
      e.scrollIntoView({ behavior: "instant" }),
    );
    await p.screenshot({
      path: path.join(dir, "desktop.png"),
      fullPage: false,
    });
    for (const type of types) {
      await p.evaluate((t) => pgIqc.select(t), type);
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await p.setViewport({ width, height: 900 });
        ok(
          type + " tanpa overflow " + width,
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
    }
    await p.setViewport({ width: 390, height: 844 });
    await p.$eval("#playground", (e) =>
      e.scrollIntoView({ behavior: "instant" }),
    );
    await p.screenshot({ path: path.join(dir, "mobile.png") });
    await p.evaluate(() => pgIqc.pause());
    await p.evaluate(() => applyPreset("health"));
    await p.locator("#pgSubmitBtn").click();
    await p.waitForFunction(
      () => !document.getElementById("pgSubmitBtn").disabled,
      { timeout: 70000 },
    );
    ok(
      "Endpoint non-IQC manual tidak rusak",
      await p.$eval("#pgStatusBadge", (e) => e.textContent.includes("200")),
    );
    ok(
      "Referensi header statis semua model",
      await p.$eval(
        "#iqc-headers-reference",
        (e) =>
          e.textContent.includes("X-IQC-Source") &&
          e.textContent.includes("X-IQC-Cache"),
      ),
    );
    ok("Tidak ada JavaScript error", errors.length === 0);
    console.log("TOTAL " + total + " PASS");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("FAIL", e.stack);
  process.exitCode = 1;
});
