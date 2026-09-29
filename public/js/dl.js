(function(){
  'use strict';

  var form = document.getElementById('dlForm');
  var input = document.getElementById('dlInput');
  var pasteBtn = document.getElementById('pasteBtn');
  var submitBtn = document.getElementById('submitBtn');
  var loader = document.getElementById('loader');
  var errorBox = document.getElementById('errorBox');
  var resultCard = document.getElementById('resultCard');
  var resAvatar = document.getElementById('resAvatar');
  var resName = document.getElementById('resName');
  var resUser = document.getElementById('resUser');
  var resPlatformTag = document.getElementById('resPlatformTag');
  var resTitle = document.getElementById('resTitle');
  var resMediaBox = document.getElementById('resMediaBox');
  var resActions = document.getElementById('resActions');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function showToast(msg, ms){
    if (!toastEl) return;
    toastEl.textContent = msg || '';
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){
      toastEl.classList.remove('show');
    }, ms || 2400);
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(u){
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (/^(https?:|data:|\/)/i.test(s)) return s;
    return 'https://' + s;
  }

  if (pasteBtn && navigator.clipboard){
    pasteBtn.addEventListener('click', async function(){
      try {
        var text = await navigator.clipboard.readText();
        if (text && text.trim()){
          input.value = text.trim();
          showToast('Tautan berhasil ditempel');
          processDownload();
        } else {
          showToast('Clipboard kosong');
        }
      } catch(e){
        input.focus();
        showToast('Tempel manual ke kolom input');
      }
    });
  }

  if (form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      processDownload();
    });
  }

  async function processDownload(){
    var url = (input.value || '').trim();
    if (!url){
      showToast('Masukkan link terlebih dahulu');
      input.focus();
      return;
    }

    errorBox.classList.remove('active');
    errorBox.textContent = '';
    resultCard.classList.remove('active');
    resMediaBox.innerHTML = '';
    resActions.innerHTML = '';
    loader.classList.add('active');
    submitBtn.disabled = true;

    try {
      var res = await fetch('/api/dl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: url })
      });

      var data = await res.json();

      if (!res.ok || data.status === 'error' || data.code >= 400){
        throw new Error(data.message || 'Gagal memproses tautan. Pastikan akun/postingan bersifat publik.');
      }

      renderResult(data, url);
    } catch(err){
      errorBox.textContent = err.message || 'Terjadi kesalahan saat memproses media.';
      errorBox.classList.add('active');
      showToast('Gagal memproses media');
    } finally {
      loader.classList.remove('active');
      submitBtn.disabled = false;
    }
  }

  function renderResult(data, inputUrl){
    var platform = (data.platform || 'media').toLowerCase();
    var isTikTok = platform === 'tiktok';
    var isIG = platform === 'instagram';

    resPlatformTag.className = 'res-platform-tag ' + (isTikTok ? 'tiktok' : 'instagram');
    resPlatformTag.textContent = data.type ? (platform.toUpperCase() + ' ' + String(data.type).toUpperCase()) : platform.toUpperCase();

    var author = data.author || {};
    resName.textContent = author.name || (isTikTok ? 'TikTok Creator' : 'Instagram Creator');
    resUser.textContent = author.username || '';

    if (author.avatar){
      resAvatar.src = safeUrl(author.avatar);
      resAvatar.style.display = 'block';
    } else if (data.cover){
      resAvatar.src = safeUrl(data.cover);
      resAvatar.style.display = 'block';
    } else {
      resAvatar.src = isTikTok ? 'https://iili.io/Ce4xFaa.webp' : 'https://i.imgur.com/THE7Eb7.jpeg';
    }

    if (data.title){
      resTitle.textContent = data.title;
      resTitle.style.display = 'block';
    } else {
      resTitle.textContent = '';
      resTitle.style.display = 'none';
    }

    var dl = data.downloads || {};
    var mediaItems = Array.isArray(dl.media) ? dl.media : [];
    var photos = Array.isArray(dl.photos) ? dl.photos : [];

    var mainVideo = dl.video_hd || dl.video || (mediaItems.find(function(m){ return m.type === 'video'; })?.url) || null;
    var mainAudio = dl.audio || (mediaItems.find(function(m){ return m.type === 'audio'; })?.url) || null;

    resMediaBox.innerHTML = '';

    if (mainVideo){
      var posterAttr = data.cover ? ' poster="' + esc(safeUrl(data.cover)) + '"' : '';
      resMediaBox.innerHTML =
        '<video class="res-video" controls playsinline preload="metadata"' + posterAttr + '>' +
          '<source src="' + esc(safeUrl(mainVideo)) + '" type="video/mp4">' +
          'Browser Anda tidak mendukung tag video.' +
        '</video>';
    } else if (photos.length > 0 || mediaItems.length > 0){
      var imgs = photos.length > 0 ? photos : mediaItems.filter(function(m){ return m.type === 'image'; }).map(function(m){ return m.url; });
      if (imgs.length === 1){
        resMediaBox.innerHTML =
          '<img src="' + esc(safeUrl(imgs[0])) + '" alt="Photo preview" style="width:100%; max-height:420px; object-fit:contain; background:#111;">';
      } else {
        var galleryHtml = '<div class="res-gallery">';
        imgs.forEach(function(imgUrl, idx){
          galleryHtml +=
            '<div class="res-gallery-item">' +
              '<img class="res-gallery-img" src="' + esc(safeUrl(imgUrl)) + '" alt="Slide ' + (idx + 1) + '" loading="lazy">' +
            '</div>';
        });
        galleryHtml += '</div>';
        resMediaBox.innerHTML = galleryHtml;
      }
    } else if (data.cover){
      resMediaBox.innerHTML =
        '<img src="' + esc(safeUrl(data.cover)) + '" alt="Cover preview" style="width:100%; max-height:360px; object-fit:contain; background:#111;">';
    }

    var actionsHtml = '';

    if (mainVideo){
      var vDl = dl.video_hd || dl.video;
      var proxyDl = mediaItems[0]?.download || vDl;
      actionsHtml +=
        '<a href="' + esc(safeUrl(proxyDl || vDl)) + '" target="_blank" rel="noopener" download="media.mp4" class="res-btn res-btn-primary">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>' +
          '<span>Unduh Video HD (MP4)</span>' +
        '</a>';
    }

    if (photos.length > 0){
      photos.forEach(function(pUrl, idx){
        actionsHtml +=
          '<a href="' + esc(safeUrl(pUrl)) + '" target="_blank" rel="noopener" download="photo-' + (idx + 1) + '.jpg" class="res-btn res-btn-secondary">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
            '<span>Unduh Foto ' + (photos.length > 1 ? '#' + (idx + 1) : 'HD') + '</span>' +
          '</a>';
      });
    }

    if (mainAudio){
      actionsHtml +=
        '<a href="' + esc(safeUrl(mainAudio)) + '" target="_blank" rel="noopener" download="audio.mp3" class="res-btn res-btn-secondary">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>' +
          '<span>Unduh Audio Musik (MP3)</span>' +
        '</a>';
    }

    actionsHtml +=
      '<button type="button" class="res-btn res-btn-outline" id="copyDirectBtn">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>' +
        '<span>Salin Tautan Media Langsung</span>' +
      '</button>';

    resActions.innerHTML = actionsHtml;

    var copyBtn = document.getElementById('copyDirectBtn');
    if (copyBtn){
      copyBtn.addEventListener('click', function(){
        var copyTarget = mainVideo || photos[0] || inputUrl;
        if (navigator.clipboard){
          navigator.clipboard.writeText(copyTarget).then(function(){
            showToast('Tautan media disalin');
          }).catch(function(){
            showToast('Gagal menyalin');
          });
        }
      });
    }

    resultCard.classList.add('active');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('Media siap diunduh');
  }

  var searchParam = new URLSearchParams(window.location.search).get('url');
  if (searchParam){
    input.value = searchParam;
    processDownload();
  }
})();
