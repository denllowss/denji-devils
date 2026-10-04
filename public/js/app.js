(function(){
  'use strict';

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(u){
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (/^(https?:|mailto:|tel:|#|\/|..\/|.\/)/i.test(s)) return s;
    if (/^javascript:/i.test(s)) return '';
    return 'https://' + s;
  }

  function track(name, data){
    try{
      if(typeof window.va === 'function') window.va('event',{name, data});
      window.va?.track?.(name, data);
    }catch(_){}
  }

  var P = (typeof PENGATURAN !== 'undefined' && PENGATURAN) ? PENGATURAN : {};
  var W = P.warna || {};
  var L = (typeof LINK !== 'undefined' && Array.isArray(LINK)) ? LINK : [];
  var SO = (typeof SOSIAL !== 'undefined' && Array.isArray(SOSIAL)) ? SOSIAL : [];
  var G = (typeof GAMBAR !== 'undefined' && GAMBAR) ? GAMBAR : {};

  try {
    var ov = JSON.parse(localStorage.getItem('denji-edit') || 'null');
    if (ov){
      if (ov.PENGATURAN){
        P = Object.assign({}, P, ov.PENGATURAN);
        P.warna = Object.assign({}, W, (ov.PENGATURAN.warna || {}));
        W = P.warna || {};
      }
      if (ov.GAMBAR) G = Object.assign({}, G, ov.GAMBAR);
      if (ov.LINK) L = ov.LINK;
      if (ov.SOSIAL) SO = ov.SOSIAL;
    }
  } catch(e){}

  function img(v){
    if (!v) return '';
    return Object.prototype.hasOwnProperty.call(G, v) ? G[v] : v;
  }

  var rs = document.documentElement.style;
  if (W.latar) rs.setProperty('--profileBackground', W.latar);

  function hexToRgbList(hex, fallback){
    var h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
    return parseInt(h.slice(0, 2), 16) + ', ' + parseInt(h.slice(2, 4), 16) + ', ' + parseInt(h.slice(4, 6), 16);
  }

  var latarHex = W.latar || '#c8d97c';
  rs.setProperty('--latar-rgb', hexToRgbList(latarHex, '200, 217, 124'));

  function mixHex(a, b, t){
    var A = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    var B = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    var o = [];
    for (var i = 0; i < 3; i++) o.push(Math.round(A[i] * (1 - t) + B[i] * t));
    return '#' + o.map(function(v){ var s = v.toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }

  if (W.tombol) rs.setProperty('--button-style-background', W.tombol);
  if (W.garisTombol){
    rs.setProperty('--button-style-border-color', W.garisTombol);
    rs.setProperty('--button-style-shadow-color', W.garisTombol);
  }
  if (W.teksTombol) rs.setProperty('--button-style-text', W.teksTombol);
  if (W.teksHalaman){
    rs.setProperty('--bodyText', W.teksHalaman);
    rs.setProperty('--socialLinkFill', W.teksHalaman);
  }
  rs.setProperty('--button-style-background-hover', mixHex(W.tombol || '#f1fcbd', '#000000', .07));
  rs.setProperty('--frame-color', mixHex(W.latar || '#c8d97c', '#000000', .12));

  var judul = String((P.judulHalaman && String(P.judulHalaman).trim()) || (P.namaTeks && String(P.namaTeks).trim()) || 'Denji Web');
  document.title = judul;

  var pakaiHero = P.tampilkanFotoAtas !== false && !!G.fotoAtas;
  var pakaiLogo = P.tampilkanLogo !== false && !!G.logo;

  var head = pakaiLogo
    ? '<div class="logo-wrap"><img class="logo" src="' + esc(G.logo) + '" alt="' + esc(judul) + '" decoding="async" referrerpolicy="no-referrer" draggable="false"></div>'
    : '<div class="name-text">' + esc(P.namaTeks || judul) + '</div>';

  var verified = P.tampilkanVerified === false ? '' :
    '<div class="verified">' +
      '<svg class="vbadge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true">' +
        '<linearGradient id="vb-a"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0\"/></linearGradient><linearGradient id="vb-b" gradientUnits=\"userSpaceOnUse\" x1=\"11.9996\" x2=\"11.9996\" xlink:href=\"#vb-a\" y1=\".57305\" y2=\"23.2103\"/><radialGradient id=\"vb-c\" cx=\"0\" cy=\"0\" gradientTransform=\"matrix(22.7453 22.6373 -6.02829 16.9286 .626953 .573048)\" gradientUnits=\"userSpaceOnUse\" r=\"1\" xlink:href=\"#vb-a\"/><linearGradient id=\"vb-d\" gradientUnits=\"userSpaceOnUse\" x1=\"11.9996\" x2=\"11.9996\" y1=\".573048\" y2=\"23.2103\"><stop offset=\"0\" stop-opacity=\"0\"/><stop offset=\"1\" stop-opacity=\".16\"/></linearGradient><clipPath id=\"vb-e\"><path d=\"m0 0h24v24h-24z\"/></clipPath><clipPath id=\"vb-f\"><path d=\"m0 0h24v24h-24z\"/></clipPath><g clip-path=\"url(#vb-e)\"><g clip-path=\"url(#vb-f)\"><path d=\"m11.1709 1.20488c.4636-.44224 1.1936-.442242 1.6572 0l.416.39746c.4922.46936 1.2072.62118 1.8477.39258l.542-.19336c.5657-.20194 1.1866.04554 1.4629.56543l.0508.1084.2187.53125v.00098c.2589.62876.8502 1.05776 1.5283 1.10937l.5733.04395c.6389.04862 1.1269.59102 1.1084 1.23144l-.0166.5752c-.0195.67976.3459 1.31273.9443 1.63574l.5068.27344c.5638.30433.789.99767.5118 1.57519l-.2491.51856c-.2942.61319-.2181 1.34029.1973 1.87889l.3516.4551c.3913.5072.3152 1.2325-.1729 1.6475l-.4385.373c-.5182.4403-.7443 1.1349-.5839 1.7959l.1357.5596c.1512.6225-.2133 1.254-.8281 1.4345l-.5518.1621c-.6526.1915-1.1423.7344-1.2646 1.4034l-.1036.5664c-.1152.6302-.7048 1.0588-1.3398.9736l-.5703-.0762c-.6742-.0905-1.3417.2062-1.7256.7676l-.3242.4756c-.3615.5289-1.0756.6799-1.6211.3438l-.4893-.3018c-.579-.357-1.3105-.357-1.8896 0l-.4893.3018c-.5453.336-1.2585.1849-1.62009-.3438l-.32519-.4756c-.38385-.5613-1.05152-.8581-1.72559-.7676l-.57031.0762c-.63498.0851-1.2247-.3435-1.33984-.9736l-.10352-.5664c-.12229-.6689-.61123-1.2118-1.26367-1.4034l-.55274-.1621c-.61468-.1806-.97927-.8121-.82812-1.4345l.13574-.5596c.16034-.661-.06569-1.3555-.58398-1.7959l-.43848-.373c-.487957-.415-.564118-1.1403-.17285-1.6475l.35156-.4551c.41548-.5386.4917-1.2657.19727-1.87889l-.24903-.51856c-.27726-.57745-.05185-1.27081.51172-1.57519l.50684-.27344c.59852-.32298.96379-.95592.94433-1.63574l-.0166-.5752c-.01842-.64043.46957-1.18277 1.1084-1.23144l.57422-.04395c.6781-.05175 1.26871-.48136 1.52734-1.11035l.21973-.53125c.24365-.59257.90929-.88923 1.51269-.67383l.542.19336c.6405.22869 1.35547.07673 1.84767-.39258z\" fill=\"#d29016\"/><path d=\"m11.1709 1.20488c.4636-.44224 1.1936-.442242 1.6572 0l.416.39746c.4922.46936 1.2072.62118 1.8477.39258l.542-.19336c.5657-.20194 1.1866.04554 1.4629.56543l.0508.1084.2187.53125v.00098c.2589.62876.8502 1.05776 1.5283 1.10937l.5733.04395c.6389.04862 1.1269.59102 1.1084 1.23144l-.0166.5752c-.0195.67976.3459 1.31273.9443 1.63574l.5068.27344c.5638.30433.789.99767.5118 1.57519l-.2491.51856c-.2942.61319-.2181 1.34029.1973 1.87889l.3516.4551c.3913.5072.3152 1.2325-.1729 1.6475l-.4385.373c-.5182.4403-.7443 1.1349-.5839 1.7959l.1357.5596c.1512.6225-.2133 1.254-.8281 1.4345l-.5518.1621c-.6526.1915-1.1423.7344-1.2646 1.4034l-.1036.5664c-.1152.6302-.7048 1.0588-1.3398.9736l-.5703-.0762c-.6742-.0905-1.3417.2062-1.7256.7676l-.3242.4756c-.3615.5289-1.0756.6799-1.6211.3438l-.4893-.3018c-.579-.357-1.3105-.357-1.8896 0l-.4893.3018c-.5453.336-1.2585.1849-1.62009-.3438l-.32519-.4756c-.38385-.5613-1.05152-.8581-1.72559-.7676l-.57031.0762c-.63498.0851-1.2247-.3435-1.33984-.9736l-.10352-.5664c-.12229-.6689-.61123-1.2118-1.26367-1.4034l-.55274-.1621c-.61468-.1806-.97927-.8121-.82812-1.4345l.13574-.5596c.16034-.661-.06569-1.3555-.58398-1.7959l-.43848-.373c-.487957-.415-.564118-1.1403-.17285-1.6475l.35156-.4551c.41548-.5386.4917-1.2657.19727-1.87889l-.24903-.51856c-.27726-.57745-.05185-1.27081.51172-1.57519l.50684-.27344c.59852-.32298.96379-.95592.94433-1.63574l-.0166-.5752c-.01842-.64043.46957-1.18277 1.1084-1.23144l.57422-.04395c.6781-.05175 1.26871-.48136 1.52734-1.11035l.21973-.53125c.24365-.59257.90929-.88923 1.51269-.67383l.542.19336c.6405.22869 1.35547.07673 1.84767-.39258z\" fill=\"url(#vb-b)\" fill-opacity=\".2\"/><path d=\"m11.1709 1.20488c.4636-.44224 1.1936-.442242 1.6572 0l.416.39746c.4922.46936 1.2072.62118 1.8477.39258l.542-.19336c.5657-.20194 1.1866.04554 1.4629.56543l.0508.1084.2187.53125v.00098c.2589.62876.8502 1.05776 1.5283 1.10937l.5733.04395c.6389.04862 1.1269.59102 1.1084 1.23144l-.0166.5752c-.0195.67976.3459 1.31273.9443 1.63574l.5068.27344c.5638.30433.789.99767.5118 1.57519l-.2491.51856c-.2942.61319-.2181 1.34029.1973 1.87889l.3516.4551c.3913.5072.3152 1.2325-.1729 1.6475l-.4385.373c-.5182.4403-.7443 1.1349-.5839 1.7959l.1357.5596c.1512.6225-.2133 1.254-.8281 1.4345l-.5518.1621c-.6526.1915-1.1423.7344-1.2646 1.4034l-.1036.5664c-.1152.6302-.7048 1.0588-1.3398.9736l-.5703-.0762c-.6742-.0905-1.3417.2062-1.7256.7676l-.3242.4756c-.3615.5289-1.0756.6799-1.6211.3438l-.4893-.3018c-.579-.357-1.3105-.357-1.8896 0l-.4893.3018c-.5453.336-1.2585.1849-1.62009-.3438l-.32519-.4756c-.38385-.5613-1.05152-.8581-1.72559-.7676l-.57031.0762c-.63498.0851-1.2247-.3435-1.33984-.9736l-.10352-.5664c-.12229-.6689-.61123-1.2118-1.26367-1.4034l-.55274-.1621c-.61468-.1806-.97927-.8121-.82812-1.4345l.13574-.5596c.16034-.661-.06569-1.3555-.58398-1.7959l-.43848-.373c-.487957-.415-.564118-1.1403-.17285-1.6475l.35156-.4551c.41548-.5386.4917-1.2657.19727-1.87889l-.24903-.51856c-.27726-.57745-.05185-1.27081.51172-1.57519l.50684-.27344c.59852-.32298.96379-.95592.94433-1.63574l-.0166-.5752c-.01842-.64043.46957-1.18277 1.1084-1.23144l.57422-.04395c.6781-.05175 1.26871-.48136 1.52734-1.11035l.21973-.53125c.24365-.59257.90929-.88923 1.51269-.67383l.542.19336c.6405.22869 1.35547.07673 1.84767-.39258z\" fill=\"url(#vb-c)\" fill-opacity=\".55\"/><path d=\"m11.1709 1.20488c.4636-.44224 1.1936-.442242 1.6572 0l.416.39746c.4922.46936 1.2072.62118 1.8477.39258l.542-.19336c.5657-.20194 1.1866.04554 1.4629.56543l.0508.1084.2187.53125v.00098c.2589.62876.8502 1.05776 1.5283 1.10937l.5733.04395c.6389.04862 1.1269.59102 1.1084 1.23144l-.0166.5752c-.0195.67976.3459 1.31273.9443 1.63574l.5068.27344c.5638.30433.789.99767.5118 1.57519l-.2491.51856c-.2942.61319-.2181 1.34029.1973 1.87889l.3516.4551c.3913.5072.3152 1.2325-.1729 1.6475l-.4385.373c-.5182.4403-.7443 1.1349-.5839 1.7959l.1357.5596c.1512.6225-.2133 1.254-.8281 1.4345l-.5518.1621c-.6526.1915-1.1423.7344-1.2646 1.4034l-.1036.5664c-.1152.6302-.7048 1.0588-1.3398.9736l-.5703-.0762c-.6742-.0905-1.3417.2062-1.7256.7676l-.3242.4756c-.3615.5289-1.0756.6799-1.6211.3438l-.4893-.3018c-.579-.357-1.3105-.357-1.8896 0l-.4893.3018c-.5453.336-1.2585.1849-1.62009-.3438l-.32519-.4756c-.38385-.5613-1.05152-.8581-1.72559-.7676l-.57031.0762c-.63498.0851-1.2247-.3435-1.33984-.9736l-.10352-.5664c-.12229-.6689-.61123-1.2118-1.26367-1.4034l-.55274-.1621c-.61468-.1806-.97927-.8121-.82812-1.4345l.13574-.5596c.16034-.661-.06569-1.3555-.58398-1.7959l-.43848-.373c-.487957-.415-.564118-1.1403-.17285-1.6475l.35156-.4551c.41548-.5386.4917-1.2657.19727-1.87889l-.24903-.51856c-.27726-.57745-.05185-1.27081.51172-1.57519l.50684-.27344c.59852-.32298.96379-.95592.94433-1.63574l-.0166-.5752c-.01842-.64043.46957-1.18277 1.1084-1.23144l.57422-.04395c.6781-.05175 1.26871-.48136 1.52734-1.11035l.21973-.53125c.24365-.59257.90929-.88923 1.51269-.67383l.542.19336c.6405.22869 1.35547.07673 1.84767-.39258z\" stroke=\"url(#vb-d)\" stroke-width=\".6\"/><path d=\"m7.60547 11.3441 3.18193 3.182 6.3639-6.36399\" stroke=\"#fff\" stroke-width=\"3\"/></g></g>' +
      '</svg>' +
      '<span>' + esc(P.tulisanVerified || 'Verified') + '</span>' +
    '</div>';

  var META = {
    '/dl': { desc: 'Download TikTok & IG tanpa watermark — HD, MP3, carousel, story. Coba langsung.', badge: 'Populer', cat: 'tools' },
    '/docs': { desc: 'Dokumentasi API lengkap + Playground interaktif. Coba semua endpoint tanpa coding.', badge: 'Baru', cat: 'tools' },
    '/app': { desc: 'Quote Card Instagram DM — teks ala iPhone, JPG 1350×2400.', cat: 'editors' },
    '/app3': { desc: 'iMessage Music & Lirik — kartu musik Apple + lirik dinamis.', cat: 'editors' },
    '/app4': { desc: 'WhatsApp Reaksi & Menu — bubble + reaksi emoji + menu Indonesia.', cat: 'editors' },
    '/app5': { desc: 'WhatsApp Profil & Nama — avatar, nama warna, reaksi, upload foto.', cat: 'editors' },
    '/ssgc-app': { desc: 'Info Grup WhatsApp — nama, deskripsi full, Baca selengkapnya, profil.', badge: 'Update', cat: 'editors' },
    '/lowquality-app': { desc: 'JPEG Deep Fry — goreng gambar berkali-kali, bandingkan kualitas.', cat: 'tools' },
  };

  function linkCard(it){
    if (!it || (!it.judul && !it.url)) return '';
    var url = safeUrl(it.url), label = esc(it.judul || '');
    var isInternal = /^\//.test(it.url);
    var meta = META[it.url] || {};
    var thumb = it.gambar ? '<span class=\"thumb\"><img src=\"' + esc(img(it.gambar)) + '\" alt=\"\" loading=\"lazy\" decoding=\"async\" referrerpolicy=\"no-referrer\" draggable=\"false\"></span>' : '';
    var badge = meta.badge ? '<span class=\"link-badge\">' + esc(meta.badge) + '</span>' : '';
    var desc = meta.desc ? '<span class=\"link-desc\">' + esc(meta.desc) + '</span>' : '';
    var cls = 'chin' + (it.gambar ? ' has-thumb' : '') + (meta.badge ? ' has-badge' : '');
    var inner = thumb + '<span class=\"link-texts\"><span class=\"link-label\">' + label + badge + '</span>' + desc + '</span>';
    var target = isInternal ? '' : ' target=\"_blank\" rel=\"noopener\"';
    return '<div class=\"link\" data-cat=\"' + esc(meta.cat||'other') + '\"><a class=\"link-hit\" href=\"' + esc(url) + '\"' + target + ' data-track=\"' + esc(it.url) + '\"><div class=\"' + cls + '\">' + inner + '</div></a></div>';
  }

  // Group links by category for engagement
  var groups = { tools: [], editors: [], other: [] };
  L.forEach(function(it){
    var m = META[it.url];
    if(m && m.cat === 'tools') groups.tools.push(it);
    else if(m && m.cat === 'editors') groups.editors.push(it);
    else groups.other.push(it);
  });

  function groupHtml(title, items, id){
    if(!items.length) return '';
    return '<div class=\"link-group\" id=\"group-' + esc(id) + '\"><div class=\"link-group-head\"><span class=\"link-group-title\">' + esc(title) + '</span><span class=\"link-group-count\">' + items.length + '</span></div><div class=\"links\">' + items.map(linkCard).join('') + '</div></div>';
  }

  var panelLinks =
    '<div class=\"panel\" id=\"panel-links\">' +
      groupHtml('Alat & API', groups.tools, 'tools') +
      groupHtml('Generator Gambar', groups.editors, 'editors') +
      groupHtml('Tautan Lain', groups.other, 'other') +
      '<div class=\"explore-cta\"><div class=\"explore-title\">Mau coba tanpa setup?</div><div class=\"explore-desc\">Buka Playground, pilih model IQC / SSGC / Lowquality, edit langsung dan lihat gambar jadi. Semua contoh kode mengikuti isian kamu.</div><a class=\"explore-btn\" href=\"/docs#playground\">Buka Playground Interaktif →</a></div>' +
    '</div>';

  var socials = !SO.length ? '' :
    '<nav class=\"socials\" aria-label=\"Media sosial\">' + SO.map(function(s){
      if (!s || !s.url) return '';
      return '<a class=\"social\" href=\"' + esc(safeUrl(s.url)) + '\"' +
        (/^mailto:/i.test(s.url) ? '' : ' target=\"_blank\" rel=\"noopener\"') +
        ' aria-label=\"' + esc(s.jenis || 'Tautan') + '\">' + (icon(s.jenis) || icon('website')) + '</a>';
    }).join('') + '</nav>';

  document.getElementById('app').innerHTML =
    '<div class=\"frame\"><div class=\"profile' + (pakaiHero ? '' : ' no-hero') + '\">' +
      '<div class=\"topbar\"><button class=\"icon-btn\" id=\"shareBtn\" type=\"button\" aria-label=\"Bagikan halaman ini\">' +
        '<svg viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96H80a8,8,0,0,1,0,16H56v96H200V112H176a8,8,0,0,1,0-16h24A16,16,0,0,1,216,112ZM93.66,69.66,120,43.31V136a8,8,0,0,0,16,0V43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66Z\"/></svg>' +
      '</button></div>' +
      '<div class=\"hero-wrap\">' + (pakaiHero ? '<div class=\"hero\"><img src=\"' + esc(G.fotoAtas) + '\" alt=\"\" fetchpriority=\"high\" decoding=\"async\" referrerpolicy=\"no-referrer\" draggable=\"false\"></div>' : '') + '</div>' +
      '<div class=\"content\" id=\"content\">' +
        '<h1 class=\"sr-only\">' + esc(judul) + '</h1>' + head +
        '<p class=\"bio\">' + esc(P.bio || '') + '</p>' +
        verified + panelLinks + socials +
      '</div>' +
    '</div></div>';

  function toast(msg){
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ el.classList.remove('show'); }, 2200);
  }

  var sbtn = document.getElementById('shareBtn');
  if (sbtn){
    sbtn.addEventListener('click', function(){
      var data = { title: judul, text: P.bio || judul, url: location.href };
      if (navigator.share){
        navigator.share(data).catch(function(){});
        track('home_share', { method: 'webshare' });
      } else if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(location.href).then(function(){
          toast('Tautan disalin');
          track('home_share', { method: 'clipboard' });
        }).catch(function(){
          toast('Gagal menyalin tautan');
        });
      } else {
        toast(location.href);
      }
    });
  }

  // Engagement tracking
  document.querySelectorAll('[data-track]').forEach(function(a){
    a.addEventListener('click', function(){
      var href = a.getAttribute('data-track');
      track('home_link_click', { href: href, cat: a.closest('.link')?.getAttribute('data-cat') || '' });
    });
  });

  track('home_view', { path: location.pathname });

  var root = document.documentElement;
  var A = (typeof ANIMASI !== 'undefined' && ANIMASI) ? ANIMASI : {};
  if (A.aktif !== false){
    root.classList.add('anim-on');
    if (A.masukHalaman !== false) root.classList.add('fx-enter');
    if (A.fotoBernapas !== false) root.classList.add('fx-hero');
    if (A.logoMengambang !== false) root.classList.add('fx-logo');
  }

  var logo = document.querySelector('.logo') || document.querySelector('.name-text');
  if (logo) logo.classList.add('pop-in');

  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:640px)').matches;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (fine && !reduced && document.body){
    document.body.classList.add('custom-cursor-enabled');
  }
})();
