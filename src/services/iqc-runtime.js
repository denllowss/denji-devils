// Bootstrap yang sama untuk Vercel Functions dan Express lokal (Node.js 24).
// Tidak mengganti AWS_LAMBDA_JS_RUNTIME / versi Node untuk mengelabui deteksi.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let modulesPromise = null;
let preparationPromise = null;

function loadModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core')
    ]).then(([chromiumModule, puppeteerModule]) => ({
      chromiumModule,
      chromium: chromiumModule.default,
      puppeteer: puppeteerModule.default || puppeteerModule
    })).catch(error => { modulesPromise = null; throw error; });
  }
  return modulesPromise;
}

function runtimeError(code, message, cause) {
  const error = new Error(message, { cause });
  error.code = code;
  return error;
}

async function prepareChromium() {
  if (preparationPromise) return preparationPromise;
  preparationPromise = (async () => {
    const modules = await loadModules();
    // Path absolut dari paket terpasang, bukan __dirname hasil bundle fungsi.
    const packageRoot = path.join(path.dirname(require.resolve('@sparticuz/chromium')), '..');
    const bin = path.join(packageRoot, 'bin');
    const version = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version;
    const tmp = os.tmpdir();
    const binary = path.join(tmp, 'chromium');
    const libraries = path.join(tmp, 'al2023', 'lib');
    const marker = path.join(tmp, 'denji-iqc-chromium.version');
    let previousVersion;
    try { previousVersion = fs.readFileSync(marker, 'utf8').trim(); } catch (_) {}

    const archives = ['chromium.br', 'fonts.tar.br', 'swiftshader.tar.br', 'al2023.tar.br'];
    if (archives.some(file => !fs.existsSync(path.join(bin, file)))) {
      throw runtimeError('CHROMIUM_ASSETS_MISSING', 'Arsip binari Chromium tidak masuk bundle deployment.');
    }

    // executablePath() mengembalikan /tmp/chromium yang sudah ada tanpa
    // mengekstrak library lagi. Perbaiki cache parsial / binari versi lama.
    if (previousVersion !== version) {
      fs.rmSync(binary, { force: true });
      fs.rmSync(path.join(tmp, 'fonts'), { recursive: true, force: true });
      for (const file of ['libEGL.so', 'libGLESv2.so', 'libvk_swiftshader.so', 'libvulkan.so.1', 'vk_swiftshader_icd.json']) {
        fs.rmSync(path.join(tmp, file), { force: true });
      }
      fs.rmSync(path.join(tmp, 'al2023'), { recursive: true, force: true });
    }
    if (process.platform === 'linux') {
      const required = ['libnss3.so', 'libnspr4.so', 'libnssutil3.so'];
      if (required.some(file => !fs.existsSync(path.join(libraries, file)))) {
        fs.rmSync(path.join(tmp, 'al2023'), { recursive: true, force: true });
        // API publik paket: ekstraksi eksplisit, juga berlaku tanpa flag AWS.
        await modules.chromiumModule.inflate(path.join(bin, 'al2023.tar.br'));
      }
      modules.chromiumModule.setupLambdaEnvironment(libraries);
    }
    const executablePath = await modules.chromium.executablePath(bin);
    fs.writeFileSync(marker, version);
    const libPath = [...new Set([
      libraries,
      path.dirname(executablePath),
      ...(process.env.LD_LIBRARY_PATH || '').split(':').filter(Boolean)
    ])].join(':');
    return {
      ...modules,
      executablePath,
      env: {
        ...process.env,
        LD_LIBRARY_PATH: libPath,
        FONTCONFIG_PATH: process.env.FONTCONFIG_PATH || path.join(tmp, 'fonts')
      }
    };
  })().catch(error => { preparationPromise = null; throw error; });
  return preparationPromise;
}

function errorCode(error) {
  if (error && ['CHROMIUM_ASSETS_MISSING', 'TEMPLATE_NOT_FOUND'].includes(error.code)) return error.code;
  const message = String(error && error.message || error);
  if (/shared libraries|libnss|libnspr|cannot open shared object|GLIBC|NSPR_/i.test(message)) return 'CHROMIUM_LIBRARY_MISSING';
  if (/Exec format|wrong ELF|architecture/i.test(message)) return 'CHROMIUM_ARCH_MISMATCH';
  if (/Failed to launch|spawn.*ENOENT|input directory|browser process/i.test(message)) return 'CHROMIUM_START_FAILED';
  if (/Target closed|Session closed|Browser has been closed|detached|Disconnect|Connection closed/i.test(message)) return 'BROWSER_DISCONNECTED';
  if (/timeout|timed out/i.test(message)) return 'RENDER_TIMEOUT';
  return 'RENDER_FAILED';
}

module.exports = { prepareChromium, errorCode };
