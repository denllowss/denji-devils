const GAMBAR = {
  fotoAtas : "https://i.imgur.com/THE7Eb7.jpeg",
  logo     : "https://i.8upload.com/image/d4836d32cf164939/proyek-baru-29-2948c6c.png",
  link1    : "https://iili.io/Ce4o8vf.webp",
  link2    : "https://iili.io/Ce4ogTl.webp",
  link3    : "https://iili.io/Ce4otvj.webp",
  anacry   : "https://i.8upload.com/image/201d47b3f9c22ecb/aaa8eb83229997f26c302807c9d54fa7.png",
  link4    : "https://iili.io/Ce4x33g.webp",
  tiktok   : "https://iili.io/Ce4xFaa.webp",
};

const PENGATURAN = {
  judulHalaman      : "Denji Web",
  namaTeks          : "denji",
  bio               : "harvey, nobody know what i see",
  tampilkanFotoAtas : true,
  tampilkanLogo     : true,
  tampilkanVerified : true,
  tulisanVerified   : "Verified",
  warna : {
    latar       : "#c8d97c",
    tombol      : "#f1fcbd",
    garisTombol : "#323c1f",
    teksTombol  : "#1e2330",
    teksHalaman : "#2c351e",
  },
};

const IKLAN = {
  aktif     : false,
  urlScript : "https://quge5.com/88/tag.min.js",
  zoneId    : "289379",
};

const LINK = [
  { judul: "Media Downloader (TikTok & IG)", url: "/dl", gambar: "" },
  { judul: "Dokumentasi API & Playground", url: "/docs", gambar: "" },
  { judul: "IQC — Quote Card IG (JPG)", url: "/app", gambar: "" },
  { judul: "IQC3 — iMessage Music & Lirik", url: "/app3", gambar: "" },
  { judul: "IQC4 — WhatsApp Reaksi & Menu", url: "/app4", gambar: "" },
  { judul: "IQC5 — WhatsApp Profil & Nama", url: "/app5", gambar: "" },
  { judul: "SSGC — Info Grup WhatsApp", url: "/ssgc-app", gambar: "" },
  { judul: "Lowquality — JPEG Deep Fry", url: "/lowquality-app", gambar: "" },
  { judul: "Channel Wa (koleksi sticker)", url: "https://whatsapp.com/channel/0029VbBDyGpEFeXu4KTwvo08", gambar: "" },
  { judul: "Nomor wa", url: "https://wa.me/18674678687", gambar: "" },
];

const SOSIAL = [
  { jenis: "instagram", url: "https://instagram.com" },
  { jenis: "tiktok",    url: "https://www.tiktok.com/@inidenjiww?_r=1&_t=ZS-98NmL8bGBee" },
  { jenis: "pinterest", url: "https://www.pinterest.com" },
  { jenis: "linkedin",  url: "https://linkedin.com" },
  { jenis: "email",     url: "mailto:nothing@mail.lol" },
];

const ANIMASI = {
  aktif : true,
  masukHalaman : true,
  fotoBernapas : true,
  logoMengambang: true,
  hoverTombol : true,
  efekSentuh : true,
  kecepatan : 1.25,
};

const ANALITIK = {
  aktif         : true,
  speedInsights : true,
  mode          : "auto",
  versi         : {
    analytics     : "2.0.1",
    speedInsights : "2.0.0",
  },
  // https://vercel.com/docs/analytics/custom-events#limitations - redaksi data sensitif
  redactSensitive : true,
};

// ================================================================
// Vercel Web Analytics & Speed Insights - integrasi keseluruhan
// https://vercel.com/docs/analytics/quickstart
// https://vercel.com/docs/flags/observability/web-analytics
// ================================================================
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // 1. Init queues SEGERA - sesuai docs HTML5
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  window.vaq = window.vaq || [];
  window.siq = window.siq || [];

  // 2. Flags - definisi & nilai untuk Web Analytics observability
  //    Web Analytics otomatis lookup flag values di DOM via data-flag-values
  const DENJI_FLAG_DEFS = {
    "docs_desktop_workspace": {
      "description": "Aktifkan layout workspace desktop dua panel di /docs",
      "origin": "https://denji-devils.vercel.app/docs#playground",
      "options": [{ "value": true, "label": "On - Desktop workspace" }, { "value": false, "label": "Off" }]
    },
    "docs_engage_layer": {
      "description": "Engagement layer: related links, next-step, quick bar, footer explore",
      "origin": "https://denji-devils.vercel.app/docs",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "home_grouping": {
      "description": "Homepage grouping dengan badge dan CTA ke Playground",
      "origin": "https://denji-devils.vercel.app/",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "playground_auto_preview": {
      "description": "Playground auto preview 850ms debounce, satu render aktif",
      "origin": "https://denji-devils.vercel.app/docs#playground",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "ssgc_full_layout": {
      "description": "SSGC full description inline rata tengah, balanced inset, WA formatting",
      "origin": "https://denji-devils.vercel.app/ssgc-app",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "iqc_emoji_transparent": {
      "description": "Fix emoji tepi putih: genuine transparent RGBA PNG",
      "origin": "https://denji-devils.vercel.app/app5",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    },
    "analytics_custom_events": {
      "description": "Tracking custom events untuk bounce-rate reduction",
      "origin": "https://vercel.com/docs/analytics/custom-events",
      "options": [{ "value": true, "label": "On" }, { "value": false, "label": "Off" }]
    }
  };
  const DENJI_FLAG_DEFAULTS = {
    docs_desktop_workspace: true,
    docs_engage_layer: true,
    home_grouping: true,
    playground_auto_preview: true,
    ssgc_full_layout: true,
    iqc_emoji_transparent: true,
    analytics_custom_events: true
  };

  function denjiSafeJson(obj) {
    return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  }
  function denjiGetFlag(key) {
    try {
      const url = new URL(window.location.href);
      const qk = 'flag_' + key;
      if (url.searchParams.has(qk)) {
        const v = url.searchParams.get(qk).toLowerCase();
        if (['1','true','on','yes'].includes(v)) return true;
        if (['0','false','off','no'].includes(v)) return false;
      }
      const ls = localStorage.getItem('denji_flag_' + key);
      if (ls !== null) {
        if (['1','true','on','yes'].includes(ls.toLowerCase())) return true;
        if (['0','false','off','no'].includes(ls.toLowerCase())) return false;
      }
      const m = document.cookie.match(/vercel-flag-overrides=([^;]+)/);
      if (m) {
        try {
          const decoded = decodeURIComponent(m[1]);
          const parsed = JSON.parse(decoded);
          if (key in parsed) return !!parsed[key];
        } catch {}
      }
    } catch {}
    return DENJI_FLAG_DEFAULTS[key] !== undefined ? DENJI_FLAG_DEFAULTS[key] : false;
  }
  function denjiGetAllFlags() {
    const out = {};
    for (const k of Object.keys(DENJI_FLAG_DEFS)) out[k] = denjiGetFlag(k);
    return out;
  }
  function denjiEmitFlags() {
    try {
      document.querySelectorAll('script[data-flag-definitions][data-denji],script[data-flag-values][data-denji]').forEach(function(el){ el.remove(); });
      const defScript = document.createElement('script');
      defScript.type = 'application/json';
      defScript.setAttribute('data-flag-definitions', '');
      defScript.setAttribute('data-denji', '1');
      defScript.textContent = denjiSafeJson(DENJI_FLAG_DEFS);
      document.head.appendChild(defScript);
      const values = denjiGetAllFlags();
      const valScript = document.createElement('script');
      valScript.type = 'application/json';
      valScript.setAttribute('data-flag-values', '');
      valScript.setAttribute('data-denji', '1');
      valScript.textContent = denjiSafeJson(values);
      document.head.appendChild(valScript);
      window.DENJI_FLAGS = values;
      window.DENJI_FLAG_DEFINITIONS = DENJI_FLAG_DEFS;
      for (const [k, v] of Object.entries(values)) {
        document.documentElement.setAttribute('data-flag-' + k.replace(/_/g, '-'), String(v));
      }
    } catch {}
  }
  denjiEmitFlags();
  window.DENJI_GET_FLAG = denjiGetFlag;
  window.DENJI_GET_FLAGS = denjiGetAllFlags;
  window.DENJI_SET_FLAG = function(key, value) {
    try {
      localStorage.setItem('denji_flag_' + key, value ? '1' : '0');
      denjiEmitFlags();
      if (confirm('Flag ' + key + ' diubah ke ' + value + '. Reload?')) location.reload();
    } catch {}
  };

  // 3. beforeSend - redact sensitive data (sesuai docs redacting-sensitive-data)
  function denjiBeforeSend(event) {
    try {
      if (!ANALITIK.redactSensitive) return event;
      let url = event.url || '';
      // Redact email, token, password, private paths
      if (/\/private|\/admin|\/api\/.*token|email=|password=|secret=/i.test(url)) {
        return null; // ignore private events
      }
      // Redact query params yang sensitif
      try {
        const u = new URL(url);
        const sensitive = ['token','password','secret','email','phone','wa','nomor'];
        let changed = false;
        for (const key of [...u.searchParams.keys()]) {
          if (sensitive.some(s => key.toLowerCase().includes(s))) {
            u.searchParams.set(key, '[redacted]');
            changed = true;
          }
        }
        if (changed) event.url = u.toString();
      } catch {}
      return event;
    } catch { return event; }
  }

  // 4. Inject Vercel Analytics & Speed Insights via CDN + fallback script tags
  //    Sesuai docs: untuk HTML statis, script defer src="/_vercel/insights/script.js"
  //    inject() dari @vercel/analytics akan otomatis pakai config build-time Vercel
  if (ANALITIK.aktif) {
    // Fallback script tags - Vercel akan serve ini saat analytics enabled di dashboard
    (function() {
      if (!document.querySelector('script[src*=\"/_vercel/insights/script.js\"]')) {
        const s = document.createElement('script');
        s.defer = true;
        s.src = '/_vercel/insights/script.js';
        s.onerror = function() { /* Vercel belum enable atau lokal - abaikan */ };
        document.head.appendChild(s);
      }
    })();

    // Primary: inject via @vercel/analytics untuk support beforeSend, mode, custom events + flags
    import(`https://cdn.jsdelivr.net/npm/@vercel/analytics@${ANALITIK.versi.analytics}/dist/index.mjs`)
      .then(function (mod) {
        try {
          // Simpan track untuk dipakai di DENJI_TRACK
          window.__denji_analytics_track = mod.track;
          mod.inject({
            mode: ANALITIK.mode,
            beforeSend: denjiBeforeSend,
            // debug: ANALITIK.mode === 'development'
          });
          // Track initial page view dengan flags
          const flags = Object.keys(DENJI_FLAG_DEFS);
          const values = denjiGetAllFlags();
          // Emit page view dengan flags sudah di DOM - Web Analytics akan auto-annotate
          // Custom event untuk observability
          setTimeout(function() {
            try {
              const data = {};
              for (const [k,v] of Object.entries(values)) data['flag_'+k] = v ? 1 : 0;
              data.path = location.pathname;
              data.flags_enabled = Object.values(values).filter(Boolean).length;
              mod.track('denji_page_view', data, { flags: flags });
            } catch {}
          }, 1200);
        } catch {}
      })
      .catch(function () {});
  }

  if (ANALITIK.speedInsights) {
    (function() {
      if (!document.querySelector('script[src*=\"/_vercel/speed-insights/script.js\"]')) {
        const s = document.createElement('script');
        s.defer = true;
        s.src = '/_vercel/speed-insights/script.js';
        s.onerror = function() {};
        document.head.appendChild(s);
      }
    })();
    import(`https://cdn.jsdelivr.net/npm/@vercel/speed-insights@${ANALITIK.versi.speedInsights}/dist/index.mjs`)
      .then(function (mod) { 
        try { mod.injectSpeedInsights({ route: location.pathname, sampleRate: 1 }); } catch {}
      })
      .catch(function () {});
  }

  // 5. Global track helper dengan flags support (sesuai docs flags observability)
  //    Penggunaan: DENJI_TRACK('event_name', {data}, {flags: ['flag_key']})
  //    Atau track() lama tetap kompatibel
  window.DENJI_TRACK = window.DENJI_TRACK || function(name, data, opts) {
    try {
      const allFlags = denjiGetAllFlags();
      const flags = (opts && opts.flags) ? opts.flags : Object.keys(DENJI_FLAG_DEFS);
      const enriched = Object.assign({}, data || {});
      if (allFlags.analytics_custom_events) {
        for (const [k,v] of Object.entries(allFlags)) enriched['flag_'+k] = v ? 1 : 0;
      }
      if (typeof window.va === 'function') {
        window.va('event', { name: name, data: enriched, flags: flags });
        if (window.va.track) window.va.track(name, enriched, { flags: flags });
      }
      if (window.__denji_analytics_track) {
        window.__denji_analytics_track(name, enriched, { flags: flags });
      }
    } catch {
      try { if (window.va) window.va('event', { name: name, data: data }); } catch {}
    }
  };

  // 6. Iklan (jika aktif)
  if (IKLAN.aktif && IKLAN.urlScript) {
    const el = document.createElement("script");
    el.src = IKLAN.urlScript;
    if (IKLAN.zoneId) el.setAttribute("data-zone", IKLAN.zoneId);
    el.async = true;
    el.setAttribute("data-cfasync", "false");
    document.head.appendChild(el);
  }
}
