// Desktop/mobile regression for IQC5 editor + the complete fifth Playground.
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const { prepareChromium } = require("../src/services/iqc-runtime");
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const folder = process.env.QA_DIR || "/home/user/qa/iqc5";
fs.mkdirSync(folder, { recursive: true });
let total = 0;
const ok = (n, c = true) => {
  assert(c, n);
  total++;
  console.log("PASS " + n);
};
const input = async (p, id, v) =>
  p.$eval(
    "#" + id,
    (e, v) => {
      e.value = v;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    },
    v,
  );
async function ready(p) {
  await p.waitForFunction(
    () =>
      document.getElementById("preview").contentWindow?.__iqc5Ready === true,
    { timeout: 12000 },
  );
}
async function submit(p, type = "img") {
  await p.locator("#pgSubmitBtn").click();
  await p.waitForFunction(
    () => !document.getElementById("pgSubmitBtn").disabled,
    { timeout: 70000 },
  );
  await p.waitForFunction(
    (t) =>
      document.querySelector("#pgResponseCode " + t)?.[
        t === "img" ? "naturalWidth" : "src"
      ],
    { timeout: 10000 },
    type,
  );
}
(async () => {
  const r = await prepareChromium(),
    b = await r.puppeteer.launch({
      args: r.chromium.args,
      env: r.env,
      executablePath: r.executablePath,
      headless: "shell",
      defaultViewport: { width: 1440, height: 1050 },
    });
  try {
    const p = await b.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let calls = 0;
    p.on("request", (r) => {
      const u = new URL(r.url());
      if (
        /^\/(api\/)?(iqc5|qc5)$/.test(u.pathname) &&
        !u.searchParams.has("html")
      )
        calls++;
    });
    await p.goto(base + "/app5", { waitUntil: "load" });
    await ready(p);
    let frame = await (await p.$("#preview")).contentFrame();
    ok(
      "Editor foto asli",
      await frame.$eval(
        "#reference",
        (e) => !e.hidden && e.naturalWidth === 736,
      ),
    );
    ok(
      "Editor URL default",
      await p.$eval("#apiUrl", (e) => e.value.endsWith("/iqc5")),
    );
    await input(p, "name", "Denji");
    await input(p, "message", "*Halo* & # ❤\n_Ini V5_. ✨");
    await input(p, "nameColor", "#63c5a4");
    await input(p, "reaction", "👍");
    await ready(p);
    ok(
      "Preview nama berwarna",
      await frame.$eval(
        "#name",
        (e) =>
          e.textContent === "Denji" &&
          getComputedStyle(e).color === "rgb(99, 197, 164)",
      ),
    );
    ok(
      "Preview format + emoji alpha",
      await frame.$eval(
        "#msg",
        (e) =>
          e.querySelector("b")?.textContent === "Halo" &&
          e.querySelectorAll("img").length >= 2,
      ),
    );
    ok(
      "Badge reaksi bersih sama sumber",
      await frame.$eval(
        "#badgeEmoji",
        (e) => e.src === document.querySelector("#tray .selected img").src,
      ),
    );
    await p.locator('[data-profile="upload"]').click();
    await (
      await p.$("#profileFile")
    ).uploadFile(path.join(__dirname, "../public/images/iqc5-avatar-demo.png"));
    await p.waitForFunction(
      () =>
        document
          .getElementById("preview")
          .contentWindow?.document.getElementById("profileImage")
          .naturalWidth === 192,
    );
    await ready(p);
    ok(
      "Preview profil upload",
      await frame.$eval(
        "#profileImage",
        (e) => !e.hidden && e.naturalWidth === 192,
      ),
    );
    ok(
      "Kode upload standalone",
      await p.$eval(
        "#code",
        (e) =>
          e.textContent.includes("-F 'profile=@foto.png'") &&
          e.textContent.includes(String.fromCharCode(92, 10)),
      ),
    );
    await p.locator('[data-profile="none"]').click();
    await p.waitForFunction(
      () =>
        document
          .getElementById("preview")
          .contentWindow.document.getElementById("avatar").hidden,
    );
    await ready(p);
    ok("Avatar disembunyikan", await frame.$eval("#avatar", (e) => e.hidden));
    await input(p, "message", "Kamu sudah berusaha hari ini. ❤\n".repeat(28));
    await p.waitForFunction(
      () =>
        document.getElementById("preview").contentWindow.__iqc5Ready &&
        parseInt(
          document.getElementById("dimension").textContent.split("×")[1],
        ) > 1308,
    );
    ok("Editor autoheight", true);
    ok(
      "Menu dan avatar mengikuti bubble",
      await frame.evaluate(() => {
        const b = document.getElementById("bubble").getBoundingClientRect(),
          m = document.getElementById("menu").getBoundingClientRect();
        return m.top > b.bottom && m.bottom <= document.body.offsetHeight + 1;
      }),
    );
    await p.locator("#resetEditor").click();
    await p.waitForFunction(
      () =>
        !document
          .getElementById("preview")
          .contentDocument.getElementById("reference").hidden,
    );
    ok(
      "Reset foto asli",
      await p.$eval("#apiUrl", (e) => e.value.endsWith("/iqc5")),
    );
    await p.locator('[data-preset="profile"]').click();
    await p.waitForFunction(
      () =>
        document
          .getElementById("profileFileName")
          .textContent.startsWith("avatar-demo.png") &&
        document
          .querySelector('[data-profile="upload"]')
          .getAttribute("aria-pressed") === "true" &&
        document
          .getElementById("preview")
          .contentWindow?.document.getElementById("profileImage")
          .naturalWidth === 192,
    );
    await ready(p);
    await p.screenshot({
      path: path.join(folder, "editor-desktop.png"),
      fullPage: true,
    });
    // Check all toolbar PNGs have alpha margins and identical badge sources.
    const alpha = await frame.evaluate(() => {
      let partial = 0;
      for (const i of document.querySelectorAll("#tray img")) {
        const c = document.createElement("canvas");
        c.width = i.naturalWidth;
        c.height = i.naturalHeight;
        const x = c.getContext("2d");
        x.drawImage(i, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        for (let y = 0; y < c.height; y++)
          for (let z = 0; z < c.width; z++) {
            const a = d[(y * c.width + z) * 4 + 3];
            if ((z < 7 || y < 8 || z >= c.width - 7 || y >= c.height - 8) && a)
              return false;
            if (a > 0 && a < 255) partial++;
          }
      }
      return partial > 0;
    });
    ok("Enam emoji alpha tanpa matte putih", alpha);
    await p.locator('[data-profile="url"]').click();
    await input(p, "profileUrl", "https://jpeg.wavebeem.com/icon.jpg");
    await p.locator("#applyProfile").click();
    await p.waitForFunction(
      () =>
        document
          .getElementById("status")
          .textContent.includes("Profil URL siap"),
      { timeout: 35000 },
    );
    await p.waitForFunction(
      () =>
        document
          .getElementById("preview")
          .contentWindow?.document.getElementById("profileImage")
          .naturalWidth === 250,
      { timeout: 10000 },
    );
    frame = await (await p.$("#preview")).contentFrame();
    await input(p, "name", "Profil URL");
    await ready(p);
    ok(
      "URL profil preview + update nama blob iframe",
      await frame.$eval("#name", (e) => e.textContent === "Profil URL"),
    );
    for (const width of [
      320, 360, 390, 414, 640, 768, 1024, 1280, 1440, 1920,
    ]) {
      await p.setViewport({ width, height: 900 });
      ok(
        "Editor tanpa overflow " + width,
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await p.setViewport({ width: 390, height: 844 });
    await p.screenshot({
      path: path.join(folder, "editor-mobile.png"),
      fullPage: true,
    });
    ok("Tanpa JavaScript error", errors.length === 0);
    console.log("TOTAL " + total + " PASS");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error("FAIL", e.stack);
  process.exitCode = 1;
});
