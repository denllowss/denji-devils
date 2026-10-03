const pgIqc = (function () {
  const $ = (id) => document.getElementById(id);
  const headerReference = __IQC_HEADER_REFERENCE__;
  const originalMessage = "see u, hopefully we will meet in the next life.";
  const originalLyrics = "I don't regret, just pretend shit never happened";
  const models = {
    iqc: {
      title: "IQC1 · Instagram DM",
      output: "1350 × 2400 JPG",
      routes: ["/iqc", "/api/iqc"],
      textHelp:
        "Maks. 1000 karakter. Emoji, baris baru, *tebal*, _miring_, ~coret~, `kode`, daftar dan kutipan didukung.",
      seedHelp:
        "Default terang. Seed mengunci wallpaper + baterai dalam menit WIB yang sama; jam tetap berjalan. Kosongkan seed untuk acak.",
      presets: [
        {
          id: "default",
          name: "Default API",
          help: "Nilai default diisi eksplisit: pesan bawaan, tema terang; seed kosong untuk wallpaper/baterai acak.",
          value: {},
        },
        {
          id: "light",
          name: "Pesan singkat · terang",
          help: "Contoh dasar pesan, mode light dan seed 42.",
          value: {
            text: "Halo, ini quote pertamaku ❤",
            mode: "light",
            seed: "42",
          },
        },
        {
          id: "dark",
          name: "Pesan singkat · gelap",
          help: "Parameter mode=dark memaksa tampilan gelap.",
          value: { text: "Sampai bertemu lagi 🌙", mode: "dark", seed: "42" },
        },
        {
          id: "multiline",
          name: "Baris baru & emoji",
          help: "Enter menjadi baris baru. URLSearchParams mengubahnya menjadi %0A.",
          value: {
            text: "Halo, Denji! 💕\nSemoga harimu menyenangkan.\nSampai bertemu lagi ✨",
            mode: "light",
            seed: "42",
          },
        },
        {
          id: "format",
          name: "Format teks lengkap",
          help: "Tebal, miring, coret, kode, daftar dan kutipan bisa digabung.",
          value: {
            text: "*Tebal* · _miring_ · ~coret~ · `kode`\n- Poin pertama\n- Poin kedua\n1. Langkah satu\n2. Langkah dua\n> Kutipan favorit",
            mode: "dark",
            seed: "42",
          },
        },
        {
          id: "random",
          name: "Wallpaper & baterai acak",
          help: "Tanpa seed, hasil dapat berbeda pada setiap request.",
          value: {
            text: "Setiap hari punya cerita baru ✨",
            mode: "light",
            seed: "",
          },
        },
      ],
    },
    iqc2: {
      title: "IQC2 · WhatsApp iOS",
      output: "1350 × 2400 JPG",
      routes: ["/iqc2", "/api/iqc2", "/iqc?v2=1", "/api/iqc?v2=1"],
      textHelp:
        "Maks. 1000 karakter. Format teks sama seperti IQC1. Nama di kartu diatur lewat name.",
      seedHelp:
        "Default gelap. Seed mengunci baterai; latar WhatsApp tetap. Jam WIB berjalan, jadi gambar dapat berubah saat menit berganti.",
      presets: [
        {
          id: "default",
          name: "Default API · Jidar",
          help: "Default terisi: nama Jidar, tema gelap dan pesan bawaan; seed tetap opsional.",
          value: {},
        },
        {
          id: "dark",
          name: "Nama Denji · gelap",
          help: "Contoh lengkap pesan, name, mode dan seed.",
          value: {
            text: "Halo ges, ini IQC2 👋",
            name: "Denji",
            mode: "dark",
            seed: "42",
          },
        },
        {
          id: "light",
          name: "Nama khusus · terang",
          help: "Nama bisa diubah, maksimal 30 karakter.",
          value: {
            text: "Pesanmu layak diingat ❤",
            name: "Sahabat",
            mode: "light",
            seed: "42",
          },
        },
        {
          id: "multiline",
          name: "Nama + baris baru + emoji",
          help: "Gabungkan name dengan pesan multibaris dan emoji.",
          value: {
            text: "Halo, Denji! 💕\nJangan lupa istirahat.\nKamu sudah berusaha hari ini ✨",
            name: "Denji",
            mode: "dark",
            seed: "42",
          },
        },
        {
          id: "format",
          name: "Format teks & daftar",
          help: "Format WhatsApp: *tebal*, _miring_, ~coret~, kode dan daftar.",
          value: {
            text: "*Catatan hari ini*\n- Minum air\n- _Istirahat cukup_\n> Pelan-pelan juga sampai.",
            name: "Denji",
            mode: "dark",
            seed: "42",
          },
        },
        {
          id: "alias",
          name: "Alias /iqc?v2=1",
          help: "v2=1 pada /iqc menghasilkan IQC2; seluruh field IQC2 tetap tersedia.",
          value: {
            route: "/iqc?v2=1",
            text: "Versi WhatsApp lewat alias v2=1",
            name: "Denji",
            mode: "dark",
            seed: "42",
          },
        },
      ],
    },
    iqc5: {
      title: "IQC5 · WhatsApp Profil & Nama",
      output: "736 px · PNG/JPG · tinggi otomatis",
      routes: ["/iqc5", "/api/iqc5", "/qc5", "/api/qc5"],
      textHelp:
        "Maks. 1000 karakter. pesan/message/text, Enter, emoji dan format WhatsApp. Nama maks. 30; avatar URL/upload; tinggi mengikuti teks.",
      presets: [
        {
          id: "default",
          name: "Foto referensi · PNG persis",
          help: "Semua nilai sesuai foto. Nama ★, avatar bawaan, dark, menu Indonesia, tanpa badge. PNG asli byte-identik.",
          value: {},
        },
        {
          id: "name",
          name: "Nama & warna khusus",
          help: "name dan nameColor mengganti nama. Avatar bawaan tetap sesuai foto.",
          value: {
            name: "Denji",
            nameColor: "#63c5a4",
            text: "Halo, ini nama dan ceritaku. ❤",
          },
        },
        {
          id: "profile",
          name: "Foto profil URL · gelap",
          help: "URL gambar publik diambil lewat downloader aman setelah isian valid dan jeda edit. Jeda otomatis dapat dimatikan.",
          value: {
            name: "Denji",
            text: "Halo, ini profil dan namaku. ❤",
            profileSource: "url",
            profileUrl: "https://jpeg.wavebeem.com/icon.jpg",
          },
        },
        {
          id: "light",
          name: "Terang · reaksi 👍",
          help: "Tema terang, badge reaksi dan pilihan bintang dapat diubah.",
          value: {
            name: "Sahabat",
            mode: "light",
            reaction: "👍",
            text: "Hari ini juga punya cerita baik. ✨",
          },
        },
        {
          id: "long",
          name: "Pesan panjang · autoheight",
          help: "Bubble bertambah tinggi; avatar dan menu bergeser tanpa terpotong.",
          value: {
            name: "Sahabat",
            text:
              "*Catatan untuk diri sendiri*\n" +
              "Kamu sudah berusaha, tetap berjalan pelan-pelan. ".repeat(15),
          },
        },
        {
          id: "minimal",
          name: "Tanpa profil / menu / reaksi",
          help: "profile=none, menu=0 dan reactions=0 untuk tampilan minimal.",
          value: {
            name: "Denji",
            text: "Pesan singkat tanpa menu.",
            profileSource: "none",
            menu: "0",
            reactions: "0",
          },
        },
        {
          id: "upload",
          name: "Upload foto sendiri",
          help: "Pilih satu foto. Preview/unduh memakai POST multipart; seluruh parameter dan kode lima bahasa mengikuti isian.",
          value: {
            name: "Denji",
            text: "Ini foto profilku. ❤",
            profileSource: "upload",
          },
        },
        {
          id: "image",
          name: "Pratinjau gambar · PNG",
          help: "PNG hasil edit dengan header asli. Template HTML tetap dapat diminta melalui API lanjutan.",
          value: {
            name: "Denji",
            format: "png",
            text: "Pratinjau gambar IQC5.",
          },
        },
        {
          id: "jpg",
          name: "Ekspor JPG",
          help: "format=jpg membuat JPEG yang lebih kecil. Default persis berlaku pada PNG, bukan JPEG.",
          value: { format: "jpg" },
        },
      ],
    },
    iqc4: {
      title: "IQC4 · WhatsApp Reaksi",
      output: "555 px · tinggi otomatis",
      routes: ["/iqc4", "/api/iqc4", "/qc4", "/api/qc4"],
      textHelp:
        "Maks. 1000 karakter. Cara ubah sama seperti IQC1/IQC2: pesan. Alias message/text didukung. Emoji, Enter dan format WhatsApp; tinggi otomatis.",
      presets: [
        {
          id: "default",
          name: "Foto referensi · persis",
          help: "Semua default sama dengan foto; JPEG asli byte-identik.",
          value: {},
        },
        {
          id: "light",
          name: "Pesan khusus · terang",
          help: "Cukup ubah pesan; mode light, love, bintang dan menu sesuai foto.",
          value: { text: "note: kamu tidak gagal, kamu sedang belajar." },
        },
        {
          id: "dark",
          name: "Gelap · reaksi 👍",
          help: "Tema, reaksi, dua jam, baterai dan jaringan dapat diganti.",
          value: {
            text: "Pelan-pelan juga sampai. ✨",
            mode: "dark",
            reaction: "👍",
            time: "21.30",
            statusTime: "21.32",
            battery: "67",
            network: "5G",
          },
        },
        {
          id: "format",
          name: "Format, Enter & menu Indonesia",
          help: "Tebal, miring, daftar, kutipan dan emoji. lang=id untuk label menu.",
          value: {
            text: "*Catatan hari ini* 💕\n- Minum air\n- _Istirahat cukup_\n> Kamu sudah berusaha. ❤",
            language: "id",
            reaction: "🙏",
          },
        },
        {
          id: "minimal",
          name: "Tanpa popup & reaksi",
          help: "menu=0 dan reactions=0 menyembunyikan popup; reaction=none tanpa badge.",
          value: {
            text: "Kamu sudah cukup. ❤",
            star: "0",
            menu: "0",
            reactions: "0",
            reaction: "none",
          },
        },
        {
          id: "image",
          name: "Pratinjau gambar",
          help: "JPG hasil isian sendiri. Template HTML tetap tersedia melalui API lanjutan; Playground menampilkan gambar.",
          value: { format: "jpg", text: "Pratinjau gambar IQC4." },
        },
      ],
    },
    iqc3: {
      title: "IQC3 · iMessage Music",
      output: "736 px · tinggi otomatis",
      routes: ["/iqc3", "/api/iqc3"],
      textHelp:
        "Maks. 1000 karakter. Lirik berupa teks biasa (bukan markup WhatsApp). Baris baru didukung; tinggi gambar mengikuti teks.",
      presets: [
        {
          id: "default",
          name: "Foto referensi · persis",
          help: "Nilai default sama dengan foto asli; hasil JPEG identik dengan referensi.",
          value: {},
        },
        {
          id: "gradient",
          name: "Gradient biru–ungu",
          help: "Latar gradient memakai color1, color2 dan angle. Musik/artis ikut berubah.",
          value: {
            text: "Langit sore dan lagu favorit kita.",
            music: "Blue Hour",
            artist: "Denji",
            bg: "gradient",
            color1: "#2e617b",
            color2: "#312553",
            angle: "135",
          },
        },
        {
          id: "solid",
          name: "Warna solid",
          help: "bg=solid menggunakan color. Field gradient tidak dikirim.",
          value: {
            text: "Pesanmu di sini.",
            music: "Our Song",
            artist: "Denji",
            bg: "solid",
            color: "#1f4260",
          },
        },
        {
          id: "long",
          name: "Lirik panjang · tinggi otomatis",
          help: "Kartu dan posisi menu bertambah tinggi; lirik tidak dipotong secara visual.",
          value: {
            text:
              "Ada lagu yang selalu mengingatkanku padamu.\n\n" +
              "Di antara hari yang ramai, suara kita masih menemukan jalan pulang. ".repeat(
                8,
              ),
            music: "Our Song",
            artist: "Denji",
            bg: "gradient",
            color1: "#6b6040",
            color2: "#704600",
          },
        },
        {
          id: "metadata",
          name: "Nama lagu, artis & waktu",
          help: "music, artist dan time mengganti label di kartu.",
          value: {
            text: "Bagian favorit dari sebuah cerita.",
            music: "Cerita Kita",
            artist: "Nama Artismu",
            time: "1:24",
            bg: "gradient",
            color1: "#8a4161",
            color2: "#34315c",
            angle: "90",
          },
        },
        {
          id: "image",
          name: "Pratinjau gambar",
          help: "JPG dari seluruh isian musik/lirik. Lihat header dan unduh respons gambar yang sama.",
          value: {
            format: "jpg",
            text: "Pratinjau gambar dari isian Playground.",
            music: "Good Days",
            artist: "SZA",
          },
        },
      ],
    },
  };
  const forms = {};
  let autoEnabled = true,
    busy = false,
    pending = false,
    renderTimer,
    lastCompletedKey = "";
  let active = null,
    lang = "curl",
    currentCode = "",
    timer,
    profileFile = null;
  function defaults(type) {
    return {
      route: models[type].routes[0],
      text:
        type === "iqc3"
          ? originalLyrics
          : ["iqc", "iqc2"].includes(type)
            ? originalMessage
            : "",
      name: type === "iqc2" ? "Jidar" : "",
      mode: type === "iqc" ? "light" : type === "iqc2" ? "dark" : "",
      seed: "",
      music: "Good Days",
      artist: "SZA",
      time: "0:03",
      bg: "gradient",
      color1: "#6b6040",
      color2: "#704600",
      color: "#66502d",
      angle: "135",
      format: "jpg",
      preset: "custom",
      extra: [],
      statusTime: "07.54",
      reaction: "❤️",
      star: "1",
      menu: "1",
      reactions: "1",
      battery: "90",
      network: "4G",
      language: "en",
      ...(type === "iqc4"
        ? {
            text: "note: ga ada yang namanya manusia gagal",
            time: "20.15",
            mode: "light",
          }
        : {}),
      profileSource: "default",
      profileUrl: "",
      nameColor: "#b83e91",
      profileColor: "#8f0835",
      ...(type === "iqc5"
        ? {
            text: "dikasih muka cakep , ngapain harus faker? 🤣🤤",
            name: "★",
            time: "10:00",
            mode: "dark",
            reaction: "none",
            star: "0",
            language: "id",
            format: "png",
          }
        : {}),
    };
  }
  function info(endpoint) {
    try {
      const url = new URL(endpoint, ORIGIN),
        m = url.pathname.match(/^\/(?:api\/)?(?:iqc([2345])?|qc([45]))\/?$/);
      if (!m || url.origin !== ORIGIN) return null;
      const type =
        (m[1] || m[2]) === "5"
          ? "iqc5"
          : (m[1] || m[2]) === "4"
            ? "iqc4"
            : m[1] === "3"
              ? "iqc3"
              : m[1] === "2" || url.searchParams.get("v2") === "1"
                ? "iqc2"
                : "iqc";
      let route = url.pathname.replace(/\/$/, "");
      if (type === "iqc2" && !m[1]) route += "?v2=1";
      return { type, url, route };
    } catch (e) {
      return null;
    }
  }
  function color(value, fallback) {
    const v = String(value || "").replace(/^#/, "");
    return /^[\da-f]{6}$/i.test(v) ? "#" + v.toLowerCase() : fallback;
  }
  function value(key, fallback, limit) {
    return String(key ?? fallback).slice(0, limit || 1000);
  }
  function fromEndpoint(options = {}) {
    const i = info($("pgEndpoint").value.trim());
    $("pgIqcControls").hidden = !i;
    $("pgIqcLearning").hidden = !i;
    $("playground").toggleAttribute("data-iqc", !!i);
    $("pgMethod").disabled = !!i;
    $("pgIqcControls")
      .querySelectorAll("input,textarea,select")
      .forEach((e) => (e.disabled = !i));
    if (!i) {
      active = null;
      clearTimeout(renderTimer);
      pending = false;
      busy = false;
      $("pgIqcLiveStatus").textContent =
        "Endpoint lain: gunakan Kirim untuk menjalankan request manual.";
      return;
    }
    active = i.type;
    $("pgMethod").value = "GET";
    const s = defaults(active),
      q = i.url.searchParams,
      old = forms[active] || s;
    s.route = i.route;
    s.text = value(
      active === "iqc3"
        ? (q.get("lirik") ?? q.get("lyrics") ?? q.get("pesan"))
        : (q.get("pesan") ??
            (["iqc4", "iqc5"].includes(active)
              ? (q.get("message") ?? q.get("text"))
              : null)),
      s.text,
      1000,
    );
    s.mode = ["light", "dark"].includes((q.get("mode") || "").toLowerCase())
      ? q.get("mode").toLowerCase()
      : s.mode;
    s.seed = /^\d+$/.test(q.get("seed") || "")
      ? String(Number(q.get("seed")) >>> 0)
      : "";
    s.name = value(q.get("name"), s.name, 30).trim();
    if (active === "iqc4") {
      s.mode = q.get("mode") === "dark" ? "dark" : "light";
      s.time = value(q.get("time") ?? q.get("waktu"), s.time, 5);
      s.statusTime = value(
        q.get("statusTime") ?? q.get("status_time") ?? q.get("jam"),
        s.statusTime,
        5,
      );
      const reaction = q.get("reaction") ?? q.get("emoji") ?? q.get("reaksi");
      const aliases = {
        heart: "❤️",
        like: "👍",
        haha: "😂",
        wow: "😮",
        sad: "😢",
        pray: "🙏",
        "❤": "❤️",
        "😭": "😢",
        "😯": "😮",
      };
      s.reaction =
        aliases[reaction] ||
        (["❤️", "👍", "😂", "😮", "😢", "🙏", "none"].includes(reaction)
          ? reaction
          : s.reaction);
      for (const k of ["star", "menu", "reactions"])
        s[k] = ["0", "false", "no", "off"].includes(q.get(k)) ? "0" : "1";
      s.battery = value(q.get("battery") ?? q.get("baterai"), s.battery, 3);
      const n = (q.get("network") || s.network)
        .toUpperCase()
        .replace("WI-FI", "WIFI");
      s.network = ["4G", "5G", "LTE", "3G", "WIFI"].includes(n) ? n : s.network;
      s.language = (q.get("lang") || q.get("language")) === "id" ? "id" : "en";
      s.format = "jpg";
    }
    if (active === "iqc3") {
      s.music = value(
        q.get("music") ?? q.get("judul") ?? q.get("title") ?? q.get("lagu"),
        s.music,
        100,
      );
      s.artist = value(q.get("artist") ?? q.get("artis"), s.artist, 100);
      s.time = value(q.get("time"), s.time, 10);
      s.bg =
        (q.get("bg") || q.get("background")) === "solid" ? "solid" : "gradient";
      s.color1 = color(
        q.get("color1"),
        s.bg === "solid" ? old.color1 : s.color1,
      );
      s.color2 = color(
        q.get("color2"),
        s.bg === "solid" ? old.color2 : s.color2,
      );
      s.color = color(
        q.get("color"),
        s.bg === "gradient" ? old.color : s.color,
      );
      s.angle =
        q.has("angle") && Number.isFinite(Number(q.get("angle")))
          ? String(Math.max(0, Math.min(360, Number(q.get("angle")))))
          : s.angle;
      s.format = "jpg";
    }
    if (active === "iqc5") {
      s.name = value(q.get("name") ?? q.get("nama"), s.name, 30);
      s.nameColor = color(
        q.get("nameColor") ?? q.get("warnaNama"),
        s.nameColor,
      );
      s.profileColor = color(q.get("profileColor"), s.profileColor);
      s.mode = q.get("mode") === "light" ? "light" : "dark";
      s.time = value(q.get("time") ?? q.get("waktu"), s.time, 5);
      const aliases = {
          heart: "❤️",
          like: "👍",
          haha: "😂",
          wow: "😮",
          sad: "😢",
          pray: "🙏",
          "❤": "❤️",
          0: "none",
        },
        r = q.get("reaction") ?? q.get("emoji") ?? q.get("reaksi");
      s.reaction =
        aliases[r] ||
        (["❤️", "👍", "😂", "😮", "😢", "🙏", "none"].includes(r)
          ? r
          : s.reaction);
      for (const k of ["star", "menu", "reactions"])
        s[k] = q.has(k)
          ? ["0", "false", "off", "no"].includes(q.get(k))
            ? "0"
            : ["1", "true", "on", "yes"].includes(q.get(k))
              ? "1"
              : s[k]
          : s[k];
      s.language = (q.get("lang") || q.get("language")) === "en" ? "en" : "id";
      s.format = ["jpg", "jpeg"].includes(q.get("format")) ? "jpg" : "png";
      const profile = q.get("profile") ?? q.get("avatar") ?? q.get("pp");
      if (profile === null && old.profileSource === "upload") {
        s.profileSource = "upload";
      } else if (["none", "0", "off"].includes(profile)) {
        s.profileSource = "none";
      } else if (profile && !["", "default"].includes(profile)) {
        s.profileSource = "url";
        s.profileUrl = value(profile, "", 2048);
      }
    }
    const known = new Set(
      active === "iqc5"
        ? [
            "pesan",
            "message",
            "text",
            "name",
            "nama",
            "nameColor",
            "warnaNama",
            "profileColor",
            "profile",
            "avatar",
            "pp",
            "mode",
            "time",
            "waktu",
            "reaction",
            "emoji",
            "reaksi",
            "star",
            "menu",
            "reactions",
            "lang",
            "language",
            "html",
            "format",
          ]
        : active === "iqc4"
          ? [
              "pesan",
              "message",
              "text",
              "mode",
              "time",
              "waktu",
              "statusTime",
              "status_time",
              "jam",
              "reaction",
              "emoji",
              "reaksi",
              "star",
              "menu",
              "reactions",
              "battery",
              "baterai",
              "network",
              "lang",
              "language",
              "html",
            ]
          : active === "iqc3"
            ? [
                "lirik",
                "lyrics",
                "pesan",
                "music",
                "judul",
                "title",
                "lagu",
                "artist",
                "artis",
                "time",
                "bg",
                "background",
                "color1",
                "color2",
                "color",
                "angle",
                "html",
              ]
            : ["pesan", "mode", "seed", "name", "v2"],
    );
    s.extra = [...q].filter(([key]) => !known.has(key));
    s.preset = old.preset || "custom";
    forms[active] = s;
    paint();
    $("pgEndpoint").value = endpoint(s);
    learning();
    if (!options.quiet) schedule();
  }
  function paint() {
    if (!active) return;
    const model = models[active],
      s = forms[active];
    $("pgIqcControls")
      .querySelectorAll("input,textarea,select")
      .forEach((e) => (e.disabled = false));
    s.format = active === "iqc5" && s.format !== "jpg" ? "png" : "jpg";
    $("pgIqcTitle").textContent = model.title;
    $("pgIqcOutput").textContent = model.output;
    document
      .querySelectorAll("[data-iqc-type]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.iqcType === active)),
      );
    $("pgIqcNameWrap").hidden = !["iqc2", "iqc5"].includes(active);
    $("pgIqcProfile").hidden = active !== "iqc5";
    $("pgIqcLegacy").hidden = ["iqc3", "iqc4", "iqc5"].includes(active);
    $("pgIqcWa").hidden = !["iqc4", "iqc5"].includes(active);
    $("pgIqcMusic").hidden = active !== "iqc3";
    $("pgIqcFormatting").hidden = active === "iqc3";
    $("pgIqcTextLabel").textContent =
      active === "iqc3" ? "Lirik / pesan" : "Isi pesan";
    $("pgIqcTextParam").textContent = active === "iqc3" ? "lirik" : "pesan";
    $("pgIqcTextHelp").textContent = model.textHelp;
    $("pgIqcSeedHelp").textContent = model.seedHelp || "";
    $("pgIqcMode").options[0].textContent =
      active === "iqc" ? "Default · terang" : "Default · gelap";
    const route = $("pgIqcRoute");
    route.replaceChildren();
    model.routes.forEach((v) => route.add(new Option(v, v)));
    if (!model.routes.includes(s.route))
      route.add(new Option(s.route, s.route));
    route.value = s.route;
    $("pgIqcRouteHelp").textContent =
      active === "iqc2"
        ? "Alias /iqc?v2=1 dan /api/iqc?v2=1 juga menghasilkan WhatsApp. /iqc2 selalu versi 2."
        : "Rute /api/... adalah alias fungsi serverless; hasilnya sama.";
    const preset = $("pgIqcPreset");
    preset.replaceChildren();
    preset.add(new Option("Isian khusus", "custom"));
    model.presets.forEach((p) => preset.add(new Option(p.name, p.id)));
    preset.value = s.preset;
    const p = model.presets.find((p) => p.id === s.preset);
    $("pgIqcPresetHint").textContent = p
      ? p.help
      : "Ubah setiap parameter di bawah. URL dan contoh kode mengikuti isian.";
    const ids = {
      text: "Text",
      name: "Name",
      mode: "Mode",
      seed: "Seed",
      music: "Song",
      artist: "Artist",
      time: "Time",
      bg: "Bg",
      angle: "Angle",
      format: "Format",
      statusTime: "StatusTime",
      reaction: "Reaction",
      star: "Star",
      menu: "Menu",
      reactions: "Reactions",
      battery: "Battery",
      network: "Network",
      language: "Language",
    };
    Object.entries(ids).forEach(
      ([key, id]) => ($("pgIqc" + id).value = s[key]),
    );
    $("pgIqcWaFormat").replaceChildren();
    (active === "iqc5"
      ? [
          ["png", "PNG · lossless, default persis"],
          ["jpg", "JPG · gambar"],
        ]
      : [["jpg", "JPG · gambar"]]
    ).forEach(([v, t]) => $("pgIqcWaFormat").add(new Option(t, v)));
    for (const k of [
      "profileSource",
      "profileUrl",
      "nameColor",
      "profileColor",
    ])
      $("pgIqc" + k[0].toUpperCase() + k.slice(1)).value = s[k];
    $("pgIqcStatusTime").closest(".iqc-columns").hidden = active === "iqc5";
    $("pgIqcBattery").closest(".iqc-columns").hidden = active === "iqc5";
    if (active === "iqc5") {
      $("pgIqcWaTime").closest(".iqc-columns").hidden = false;
      $("pgIqcStatusTime").parentElement.hidden = true;
    } else $("pgIqcStatusTime").parentElement.hidden = false;
    $("pgIqcLanguage").options[0].textContent =
      active === "iqc5" ? "English" : "English · sesuai foto";
    $("pgIqcLanguage").options[1].textContent =
      active === "iqc5" ? "Indonesia · sesuai foto" : "Bahasa Indonesia";
    $("pgIqcWaOutputParam").textContent = active === "iqc5" ? "format" : "JPG";
    $("pgIqcWaHelp").replaceChildren();
    $("pgIqcWaHelp").append(
      document.createTextNode(
        active === "iqc5"
          ? "Jam HH.mm / HH:mm. Nama, profil dan menu mengikuti teks; PNG default identik foto. "
          : "Jam HH.mm / HH:mm. Default memakai foto asli; tanpa name atau seed. ",
      ),
    );
    const editorLink = document.createElement("a");
    editorLink.href = active === "iqc5" ? "/app5" : "/app4";
    editorLink.textContent = "Buka editor pratinjau langsung";
    $("pgIqcWaHelp").append(editorLink);
    $("pgIqcStar").options[0].textContent =
      active === "iqc5" ? "Aktif · Hapus Bintang" : "Aktif · Unstar";
    $("pgIqcStar").options[1].textContent =
      active === "iqc5" ? "Nonaktif · Beri Bintang" : "Nonaktif · Star";
    $("pgIqcWaMode").value = s.mode || "light";
    $("pgIqcWaTime").value = s.time;
    $("pgIqcWaFormat").value = s.format;
    [
      ["color1", "Color1", "Hex1"],
      ["color2", "Color2", "Hex2"],
      ["color", "Color", "HexSolid"],
    ].forEach(([key, picker, hex]) => {
      $("pgIqc" + picker).value = s[key];
      $("pgIqc" + hex).value = s[key];
      $("pgIqc" + hex).setCustomValidity("");
    });
    visibility();
    guide();
  }
  function visibility() {
    const three = active === "iqc3",
      solid = $("pgIqcBg").value === "solid";
    $("pgIqcGradient").hidden = solid;
    $("pgIqcSolid").hidden = !solid;
    $("pgIqcCount").textContent = $("pgIqcText").value.length + " / 1000";
    $("pgIqcAngleValue").textContent = $("pgIqcAngle").value + "°";
    ["Hex1", "Hex2", "Color1", "Color2", "Angle"].forEach(
      (id) => ($("pgIqc" + id).disabled = !three || solid),
    );
    ["HexSolid", "Color"].forEach(
      (id) => ($("pgIqc" + id).disabled = !three || !solid),
    );
    $("pgIqcSeed").disabled = three || ["iqc4", "iqc5"].includes(active);
    $("pgIqcWa")
      .querySelectorAll("input,select")
      .forEach((e) => (e.disabled = !["iqc4", "iqc5"].includes(active)));
    if (active === "iqc5")
      ["StatusTime", "Battery", "Network"].forEach(
        (id) => ($("pgIqc" + id).disabled = true),
      );
    const five = active === "iqc5",
      source = $("pgIqcProfileSource").value;
    $("pgIqcProfile")
      .querySelectorAll("input,select")
      .forEach((e) => (e.disabled = !five));
    $("pgIqcProfileUrlWrap").hidden = source !== "url";
    $("pgIqcProfileFileWrap").hidden = source !== "upload";
    $("pgIqcProfileUrl").disabled = !five || source !== "url";
    $("pgIqcProfileUrl").required = five && source === "url";
    $("pgIqcProfileFile").disabled = !five || source !== "upload";
    $("pgMethod").value = five && source === "upload" ? "POST" : "GET";
    if (five)
      $("pgHint").textContent =
        source === "upload"
          ? "POST · upload multipart"
          : "GET · parameter form";
  }
  function read() {
    const s = forms[active];
    const ids = {
      text: "Text",
      name: "Name",
      mode: "Mode",
      seed: "Seed",
      music: "Song",
      artist: "Artist",
      time: "Time",
      bg: "Bg",
      angle: "Angle",
      format: "Format",
      statusTime: "StatusTime",
      reaction: "Reaction",
      star: "Star",
      menu: "Menu",
      reactions: "Reactions",
      battery: "Battery",
      network: "Network",
      language: "Language",
      route: "Route",
    };
    Object.entries(ids).forEach(
      ([key, id]) => (s[key] = $("pgIqc" + id).value),
    );
    if (["iqc4", "iqc5"].includes(active)) {
      s.mode = $("pgIqcWaMode").value;
      s.time = $("pgIqcWaTime").value;
      s.format = $("pgIqcWaFormat").value;
    }
    if (active === "iqc5")
      for (const k of [
        "profileSource",
        "profileUrl",
        "nameColor",
        "profileColor",
      ])
        s[k] = $("pgIqc" + k[0].toUpperCase() + k.slice(1)).value;
    s.color1 = $("pgIqcColor1").value;
    s.color2 = $("pgIqcColor2").value;
    s.color = $("pgIqcColor").value;
    return s;
  }
  function endpoint(s, type = active) {
    const url = new URL(s.route, ORIGIN),
      q = url.searchParams;
    for (const [key, v] of s.extra || []) q.append(key, v);
    const text = s.text.trim();
    if (text) q.set(type === "iqc3" ? "lirik" : "pesan", text);
    if (type === "iqc5") {
      if (s.name.trim()) q.set("name", s.name.trim());
      q.set("nameColor", s.nameColor);
      q.set("profileColor", s.profileColor);
      if (s.profileSource === "url")
        q.set("profile", s.profileUrl.trim() || "default");
      else if (s.profileSource !== "upload")
        q.set("profile", s.profileSource === "none" ? "none" : "default");
      q.set("mode", s.mode || "dark");
      q.set("reaction", s.reaction);
      q.set("time", s.time);
      q.set("star", s.star);
      q.set("menu", s.menu);
      q.set("reactions", s.reactions);
      q.set("lang", s.language);
      q.set("format", s.format === "jpg" ? "jpg" : "png");
    } else if (type === "iqc4") {
      q.set("mode", s.mode || "light");
      q.set("reaction", s.reaction);
      q.set("time", s.time);
      q.set("statusTime", s.statusTime);
      q.set("star", s.star);
      q.set("menu", s.menu);
      q.set("reactions", s.reactions);
      q.set("battery", s.battery);
      q.set("network", s.network);
      q.set("lang", s.language);
    } else if (type === "iqc3") {
      if (s.music.trim()) q.set("music", s.music.trim());
      if (s.artist.trim()) q.set("artist", s.artist.trim());
      if (s.time.trim()) q.set("time", s.time.trim());
      q.set("bg", s.bg);
      if (s.bg === "solid") {
        q.set("color", s.color);
      } else {
        q.set("color1", s.color1);
        q.set("color2", s.color2);
        q.set("angle", s.angle);
      }
    } else {
      if (s.mode) q.set("mode", s.mode);
      if (s.seed !== "") q.set("seed", s.seed);
      if (type === "iqc2" && s.name.trim()) q.set("name", s.name.trim());
    }
    q.delete("html");
    return url.pathname + (q.toString() ? "?" + q.toString() : "");
  }
  function changed(event) {
    if (!active) return;
    const target = event && event.target;
    if (target?.id === "pgIqcProfileFile") {
      profileFile = target.files[0] || null;
      const help = $("pgIqcProfileFileHelp");
      if (profileFile && profileFile.size > 2 * 1024 * 1024) {
        profileFile = null;
        target.value = "";
        help.textContent = "Foto maksimum 2 MB. Pilih file lebih kecil.";
      } else
        help.textContent = profileFile
          ? "Siap: " +
            profileFile.name +
            " · " +
            Math.round(profileFile.size / 1024) +
            " KB. Dipakai untuk preview gambar / Kirim."
          : "Pilih foto maks. 2 MB / 4 MP.";
    }
    const links = [
      ["pgIqcColor1", "pgIqcHex1"],
      ["pgIqcColor2", "pgIqcHex2"],
      ["pgIqcColor", "pgIqcHexSolid"],
    ];
    for (const [picker, hex] of links) {
      if (target?.id === picker) $(hex).value = $(picker).value;
      if (target?.id === hex) {
        const v = color($(hex).value, null);
        $(hex).setCustomValidity(
          v ? "" : "Gunakan 6 digit hex, dengan atau tanpa #.",
        );
        if (!v) return;
        $(picker).value = v;
      }
    }
    read();
    forms[active].preset = "custom";
    $("pgIqcPreset").value = "custom";
    $("pgIqcPresetHint").textContent =
      "Isian khusus. Pilih contoh lagi untuk membandingkan parameter.";
    visibility();
    $("pgEndpoint").value = endpoint(forms[active]);
    learning();
    guide();
    savePlayground();
    $("pgIqcNote").textContent =
      "URL dan kode sudah mengikuti isian terbaru. Preview gambar diperbarui setelah jeda edit.";
    schedule();
  }
  function select(type) {
    if (!models[type]) return;
    if (active) read();
    active = type;
    forms[type] ||= defaults(type);
    $("pgMethod").value = "GET";
    $("pgBody").value = "";
    $("pgIqcControls").hidden = false;
    $("pgIqcLearning").hidden = false;
    $("pgMethod").disabled = true;
    $("playground").setAttribute("data-iqc", "");
    paint();
    $("pgEndpoint").value = endpoint(forms[active]);
    $("pgBodyWrap").style.display = "none";
    $("pgHint").textContent = "GET · parameter form";
    learning();
    savePlayground();
    $("pgIqcNote").textContent =
      "Isian default dapat dilihat, diedit, atau direset. Output Playground selalu berupa gambar.";
    schedule(250);
  }
  function preset(id) {
    if (!active || id === "custom") return;
    const p = models[active].presets.find((p) => p.id === id);
    if (!p) return;
    forms[active] = Object.assign(defaults(active), p.value, { preset: id });
    lastCompletedKey = "";
    paint();
    $("pgEndpoint").value = endpoint(forms[active]);
    learning();
    savePlayground();
    $("pgIqcNote").textContent = p.help;
    schedule(250);
  }
  function reset() {
    preset("default");
    showToast("Parameter " + models[active].title + " direset");
  }
  function randomSeed() {
    if (!active || ["iqc3", "iqc4", "iqc5"].includes(active)) return;
    const a = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(a);
    else a[0] = Math.random() * 4294967296;
    $("pgIqcSeed").value = String(a[0]);
    changed();
  }
  function format(mark) {
    const e = $("pgIqcText"),
      start = e.selectionStart,
      end = e.selectionEnd,
      text = e.value.slice(start, end) || "teks";
    e.setRangeText(mark + text + mark, start, end, "select");
    if (e.value.length > 1000) e.value = e.value.slice(0, 1000);
    e.focus();
    changed();
  }
  function filename(i) {
    return i
      ? i.type +
          (i.type === "iqc5" &&
          !["jpg", "jpeg"].includes(i.url.searchParams.get("format"))
            ? ".png"
            : ".jpg")
      : "iqc.jpg";
  }
  const shell = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
  const php = (s) =>
    "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  function generated(language) {
    const i = info($("pgEndpoint").value.trim());
    if (!i) return "";
    const url = i.url,
      entries = [...url.searchParams],
      baseUrl = url.origin + url.pathname,
      file = filename(i);
    if (i.type === "iqc5" && forms.iqc5?.profileSource === "upload") {
      const photo = profileFile?.name || "foto.png";
      const info =
        "# POST multipart · pilih foto; letakkan file di folder eksekusi";
      if (language === "curl")
        return (
          info +
          "\n" +
          [
            "curl --fail --show-error " + shell(url.href),
            "  -F " + shell("profile=@" + photo),
            "  -o " + shell(file),
          ].join(String.fromCharCode(32, 92, 10))
        );
      if (language === "javascript")
        return `// Foto yang dipilih: ${JSON.stringify(photo)}
const form = new FormData();
form.append("profile", document.querySelector("input[type=file]").files[0]);
// Jangan set Content-Type sendiri: browser membuat boundary multipart.
const response = await fetch(${JSON.stringify(url.href)}, {method:"POST", body:form});
if (!response.ok) throw new Error("HTTP " + response.status);
const blob = await response.blob();
const fileURL = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = fileURL;
link.download = ${JSON.stringify(file)};
link.click();
setTimeout(() => URL.revokeObjectURL(fileURL), 30000);`;
      if (language === "python")
        return `import requests

with open(${JSON.stringify(photo)}, "rb") as image:
    res = requests.post(${JSON.stringify(url.href)}, files={"profile": image}, timeout=70)
res.raise_for_status()
with open(${JSON.stringify(file)}, "wb") as output:
    output.write(res.content)`;
      if (language === "php")
        return `<?php
$curl = curl_init(${php(url.href)});
curl_setopt_array($curl, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => ["profile" => new CURLFile(${php(photo)})],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 70,
]);
$result = curl_exec($curl);
if ($result === false || curl_getinfo($curl, CURLINFO_HTTP_CODE) !== 200) throw new Exception("Upload gagal");
file_put_contents(${php(file)}, $result);
curl_close($curl);`;
      return `package main

import ("bytes"; "io"; "mime/multipart"; "net/http"; "os"; "time")
func main() {
  var body bytes.Buffer
  writer := multipart.NewWriter(&body)
  photo, err := os.Open(${JSON.stringify(photo)}); if err != nil { panic(err) }; defer photo.Close()
  part, err := writer.CreateFormFile("profile", ${JSON.stringify(photo)}); if err != nil { panic(err) }
  if _, err = io.Copy(part, photo); err != nil { panic(err) }
  writer.Close()
  req, err := http.NewRequest("POST", ${JSON.stringify(url.href)}, &body); if err != nil { panic(err) }
  req.Header.Set("Content-Type", writer.FormDataContentType())
  client := &http.Client{Timeout: 70 * time.Second}
  res, err := client.Do(req); if err != nil { panic(err) }; defer res.Body.Close()
  if res.StatusCode != 200 { panic(res.Status) }
  output, err := os.Create(${JSON.stringify(file)}); if err != nil { panic(err) }; defer output.Close()
  if _, err := io.Copy(output, res.Body); err != nil { panic(err) }
}`;
    }
    if (language === "curl")
      return (
        "# Sukses: " +
        (file.endsWith(".html")
          ? "template HTML"
          : file.endsWith(".png")
            ? "gambar PNG"
            : "gambar JPG") +
        "\ncurl --fail --show-error --location " +
        shell(url.href) +
        " \\\n  -o " +
        shell(file)
      );
    if (language === "javascript") {
      const params =
        entries.length === new Set(entries.map((v) => v[0])).size
          ? Object.fromEntries(entries)
          : entries;
      return (
        "const params = " +
        JSON.stringify(params, null, 2) +
        ";\nconst url = new URL(" +
        JSON.stringify(baseUrl) +
        ');\nurl.search = new URLSearchParams(params).toString();\n\nconst response = await fetch(url);\nif (!response.ok) throw new Error("HTTP " + response.status);\nconst blob = await response.blob();\nconst fileURL = URL.createObjectURL(blob);\n// ' +
        (file.endsWith(".html")
          ? "Gunakan sebagai src iframe terisolasi."
          : "Gunakan sebagai src gambar atau tautan unduh.") +
        '\nconst link = document.createElement("a");\nlink.href = fileURL;\nlink.download = ' +
        JSON.stringify(file) +
        ";\nlink.click();\nsetTimeout(() => URL.revokeObjectURL(fileURL), 30000);"
      );
    }
    if (language === "python")
      return (
        "import requests\n\nparams = " +
        JSON.stringify(Object.fromEntries(entries), null, 2) +
        "\nres = requests.get(" +
        JSON.stringify(baseUrl) +
        ", params=params, timeout=70)\nres.raise_for_status()\nwith open(" +
        JSON.stringify(file) +
        ', "wb") as f:\n    f.write(res.content)'
      );
    if (language === "php")
      return (
        "<?php\n$params = [\n" +
        entries
          .map(([k, v]) => "  " + php(k) + " => " + php(v) + ",")
          .join("\n") +
        "\n];\n$url = " +
        php(baseUrl) +
        ' . "?" . http_build_query($params);\n$content = file_get_contents($url);\nif ($content === false) throw new Exception("Request gagal");\nfile_put_contents(' +
        php(file) +
        ", $content);"
      );
    return (
      'package main\n\nimport (\n  "io"\n  "net/http"\n  "net/url"\n  "os"\n  "time"\n)\n\nfunc main() {\n  q := url.Values{}\n' +
      entries
        .map(
          ([k, v]) =>
            "  q.Add(" + JSON.stringify(k) + ", " + JSON.stringify(v) + ")",
        )
        .join("\n") +
      "\n  client := &http.Client{Timeout: 70 * time.Second}\n  res, err := client.Get(" +
      JSON.stringify(baseUrl) +
      ' + "?" + q.Encode())\n  if err != nil { panic(err) }\n  defer res.Body.Close()\n  if res.StatusCode != 200 { panic(res.Status) }\n  f, err := os.Create(' +
      JSON.stringify(file) +
      ")\n  if err != nil { panic(err) }\n  defer f.Close()\n  if _, err := io.Copy(f, res.Body); err != nil { panic(err) }\n}"
    );
  }
  function learning() {
    const i = info($("pgEndpoint").value.trim());
    if (!i) return;
    $("pgIqcUrl").value = i.url.href;
    const entries = [...i.url.searchParams];
    $("pgIqcParamCount").textContent = "(" + entries.length + ")";
    const table = $("pgIqcQuery");
    table.replaceChildren();
    if (!entries.length) {
      const tr = document.createElement("tr"),
        td = document.createElement("td");
      td.colSpan = 2;
      td.textContent = "Tidak ada query — API memakai nilai default.";
      tr.append(td);
      table.append(tr);
    }
    entries.forEach(([key, v]) => {
      const row = document.createElement("tr");
      [key, v].forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        row.append(td);
      });
      table.append(row);
    });
    currentCode = generated(lang);
    $("pgIqcCode").innerHTML = highlight(currentCode, LANG_MAP[lang]);
    document
      .querySelectorAll("[data-iqc-lang]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.iqcLang === lang)),
      );
    if (!$("pgSubmitBtn").disabled) $("pgBtnText").textContent = "Kirim";
  }
  function language(v) {
    if (!["curl", "javascript", "python", "php", "go"].includes(v)) return;
    lang = v;
    learning();
    savePlayground();
  }
  function init() {
    $("pgIqcControls").addEventListener("input", (e) => {
      if (["pgIqcPreset", "pgIqcAuto"].includes(e.target.id)) return;
      changed(e);
    });
    $("pgIqcProfileFile").addEventListener("change", changed);
    $("pgIqcAuto").checked = autoEnabled;
    $("pgIqcAuto").addEventListener("change", () => {
      autoEnabled = $("pgIqcAuto").checked;
      clearTimeout(renderTimer);
      pending = false;
      savePlayground();
      if (autoEnabled) schedule(0);
      else
        $("pgIqcLiveStatus").textContent =
          "Pratinjau otomatis dijeda. URL/kode tetap diperbarui; tekan Kirim untuk gambar.";
    });
    $("pgEndpoint").addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fromEndpoint();
        savePlayground();
      }, 350);
    });
    $("pgEndpoint").addEventListener("change", () => {
      clearTimeout(timer);
      fromEndpoint();
      savePlayground();
    });
  }
  function restore(saved) {
    if (!saved || typeof saved !== "object") return;
    if (typeof saved.auto === "boolean") {
      autoEnabled = saved.auto;
      $("pgIqcAuto").checked = autoEnabled;
    }
    if (["curl", "javascript", "python", "php", "go"].includes(saved.lang))
      lang = saved.lang;
    for (const type of Object.keys(models))
      if (saved.forms?.[type] && typeof saved.forms[type] === "object") {
        const s = defaults(type),
          raw = saved.forms[type];
        for (const k of Object.keys(s))
          if (k !== "extra" && typeof raw[k] === "string")
            s[k] = raw[k].slice(0, 1000);
        ["color1", "color2", "color"].forEach(
          (k) => (s[k] = color(s[k], defaults(type)[k])),
        );
        if (!models[type].routes.includes(s.route))
          s.route = models[type].routes[0];
        forms[type] = s;
      }
  }

  function rows(id, entries) {
    const table = $(id);
    table.replaceChildren();
    for (const cells of entries) {
      const tr = document.createElement("tr");
      for (const text of cells) {
        const td = document.createElement("td");
        td.textContent = text;
        tr.append(td);
      }
      table.append(tr);
    }
  }
  function headers(type = active) {
    return [...headerReference.common, ...(headerReference.models[type] || [])];
  }
  function guide() {
    if (!active) return;
    const d = defaults(active),
      url = new URL(endpoint(d, active), ORIGIN),
      file = filename(info(url.href));
    $("pgIqcDefaultTitle").textContent = "Default " + models[active].title;
    $("pgIqcDefaultUrl").href = ORIGIN + models[active].routes[0];
    $("pgIqcDefaultUrl").textContent = "Buka gambar default API ↗";
    rows(
      "pgIqcDefaultValues",
      [...url.searchParams].concat(
        ["iqc", "iqc2"].includes(active)
          ? [["seed", "acak (opsional; kosong untuk acak)"]]
          : [],
      ),
    );
    $("pgIqcDefaultNote").textContent = ["iqc", "iqc2"].includes(active)
      ? "Pesan/nama/tema default diisi nyata. Jam mengikuti WIB; seed kosong membuat wallpaper/baterai acak. Reset tidak menghapus contoh default."
      : "Default memakai file foto referensi. Setelah diedit, gambar dirender ulang; tinggi mengikuti teks. Default PNG/JPG mengikuti model.";
    $("pgIqcHowTo").textContent =
      active === "iqc5" && forms[active]?.profileSource === "upload"
        ? "POST multipart: pilih satu foto (maks. 2 MB / 4 MP). Seluruh isian masuk query, foto masuk field profile. Jangan set Content-Type sendiri di browser; FormData membuat boundary. Kode lima bahasa memakai isian dan nama file Anda. Letakkan foto di folder eksekusi saat menjalankan contoh CLI."
        : "GET tanpa body JSON. Isi parameter, salin URL atau kode bahasa pilihan, lalu baca respons sebagai blob/binary dan simpan " +
          file +
          ". Accept: " +
          (file.endsWith(".png") ? "image/png" : "image/jpeg") +
          " opsional; Content-Type request tidak diperlukan.";
    $("pgIqcHeadersTitle").textContent =
      "Header tersedia · " + active.toUpperCase();
    rows("pgIqcHeaderReference", headers());
  }
  function requestKey() {
    const i = info($("pgEndpoint").value.trim());
    if (!i) return "";
    const upload = i.type === "iqc5" && forms.iqc5?.profileSource === "upload";
    return JSON.stringify([
      i.url.href,
      upload ? "POST" : "GET",
      upload && profileFile
        ? [profileFile.name, profileFile.size, profileFile.lastModified]
        : null,
    ]);
  }
  function canRender() {
    return (
      active &&
      $("playgroundForm").checkValidity() &&
      !(
        active === "iqc5" &&
        forms.iqc5?.profileSource === "upload" &&
        !profileFile
      )
    );
  }
  function schedule(delay = 850) {
    clearTimeout(renderTimer);
    if (!active) return;
    const key = requestKey();

    const image = $("pgResponseCode").querySelector("img");
    if (image && image.dataset.requestKey !== key) {
      const link = $("pgResponseCode").querySelector("a.res-download");
      if (link) {
        link.setAttribute("aria-disabled", "true");
        link.style.pointerEvents = "none";
      }
    }
    if (!autoEnabled) {
      $("pgIqcLiveStatus").textContent =
        "Otomatis dijeda. URL/kode mengikuti isian; gambar sebelumnya belum diperbarui. Tekan Kirim.";
      return;
    }
    if (key === lastCompletedKey && !busy) return;
    $("pgIqcLiveStatus").textContent = canRender()
      ? "Isian berubah · menyiapkan gambar terbaru…"
      : "Lengkapi isian yang valid / pilih foto untuk melihat gambar.";
    renderTimer = setTimeout(() => {
      if (!active || !autoEnabled || !canRender()) return;
      if (busy) {
        pending = true;
        $("pgIqcLiveStatus").textContent =
          "Render berjalan · perubahan terbaru menunggu giliran, tanpa request paralel.";
        return;
      }
      if (requestKey() === lastCompletedKey) return;
      executePlayground({ preventDefault() {} }, { automatic: true });
    }, delay);
  }
  function beginRequest() {
    clearTimeout(renderTimer);
    busy = true;
    pending = false;
  }
  function finishRequest(key) {
    busy = false;
    lastCompletedKey = key;
    const changed = requestKey() !== key;
    if (active && autoEnabled && (pending || changed)) {
      pending = false;
      schedule(0);
    }
  }
  function pause() {
    autoEnabled = false;
    pending = false;
    busy = false;
    clearTimeout(renderTimer);
    $("pgIqcAuto").checked = false;
    savePlayground();
  }

  return {
    headers,
    guide,
    requestKey,
    canRender,
    schedule,
    beginRequest,
    finishRequest,
    pause,
    busy: () => busy,
    info,
    select,
    preset,
    reset,
    randomSeed,
    format,
    language,
    fromEndpoint,
    init,
    learning,
    filename,
    generated,
    restore,
    upload: () => {
      const i = info($("pgEndpoint").value.trim());
      return i?.type === "iqc5" && forms.iqc5?.profileSource === "upload"
        ? { file: profileFile }
        : null;
    },
    snapshot: () => ({ forms, lang, auto: autoEnabled }),
    copyUrl: () => copyText($("pgIqcUrl").value, "URL lengkap disalin"),
    copyCode: () => copyText(currentCode, "Contoh kode disalin"),
  };
})();
