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

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (IKLAN.aktif && IKLAN.urlScript) {
    const el = document.createElement("script");
    el.src = IKLAN.urlScript;
    if (IKLAN.zoneId) {
      el.setAttribute("data-zone", IKLAN.zoneId);
    }
    el.async = true;
    el.setAttribute("data-cfasync", "false");
    document.head.appendChild(el);
  }
}
