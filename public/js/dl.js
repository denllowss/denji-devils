(function(){
  'use strict';

  var form = document.getElementById('dlForm');
  var input = document.getElementById('dlInput');
  var clearBtn = document.getElementById('clearBtn');
  var pasteBtn = document.getElementById('pasteBtn');
  var submitBtn = document.getElementById('submitBtn');
  var loader = document.getElementById('loader');
  var errorBox = document.getElementById('errorBox');
  var resultCard = document.getElementById('resultCard');
  var resAvatar = document.getElementById('resAvatar');
  var resName = document.getElementById('resName');
  var resUser = document.getElementById('resUser');
  var resPlatformTag = document.getElementById('resPlatformTag');
  var resTypeTag = document.getElementById('resTypeTag');
  var resTitle = document.getElementById('resTitle');
  var resMediaWrap = document.getElementById('resMediaWrap');
  var resAudioWrap = document.getElementById('resAudioWrap');
  var resActions = document.getElementById('resActions');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  var currentSlideIdx = 0;
  var currentSlideList = [];

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

  if (input){
    input.addEventListener('input', function(){
      if (clearBtn){
        if (input.value && input.value.trim()){
          clearBtn.classList.add('active');
        } else {
          clearBtn.classList.remove('active');
        }
      }
    });
  }

  if (clearBtn){
    clearBtn.addEventListener('click', function(){
      input.value = '';
      clearBtn.classList.remove('active');
      input.focus();
    });
  }

  if (pasteBtn && navigator.clipboard){
    pasteBtn.addEventListener('click', async function(){
      try {
        var text = await navigator.clipboard.readText();
        if (text && text.trim()){
          input.value = text.trim();
          if (clearBtn) clearBtn.classList.add('active');
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
    resMediaWrap.innerHTML = '';
    resAudioWrap.innerHTML = '';
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

  function setSlide(idx){
    if (!currentSlideList || !currentSlideList.length) return;
    if (idx < 0) idx = currentSlideList.length - 1;
    if (idx >= currentSlideList.length) idx = 0;
    currentSlideIdx = idx;

    var imgEl = document.getElementById('activeSlideImg');
    var badgeEl = document.getElementById('activeSlideBadge');
    if (imgEl) imgEl.src = safeUrl(currentSlideList[idx]);
    if (badgeEl) badgeEl.textContent = (idx + 1) + ' / ' + currentSlideList.length;

    var thumbs = document.querySelectorAll('.res-thumb-item');
    thumbs.forEach(function(t, i){
      if (i === idx) t.classList.add('active');
      else t.classList.remove('active');
    });
  }

  function renderResult(data, inputUrl){
    var platform = (data.platform || 'media').toLowerCase();
    var isTikTok = platform === 'tiktok';
    var rawType = String(data.type || '').toLowerCase();

    var dl = data.downloads || {};
    var photos = Array.isArray(dl.photos) ? dl.photos : [];
    var mediaItems = Array.isArray(dl.media) ? dl.media : [];

    var isPhoto = rawType === 'image' || rawType === 'carousel' || photos.length > 0 || (isTikTok && inputUrl.includes('/photo/'));
    var isStory = rawType === 'story' || inputUrl.includes('/stories/');

    resPlatformTag.className = 'res-platform-tag ' + (isTikTok ? 'tiktok' : 'instagram');
    resPlatformTag.textContent = isTikTok ? 'TIKTOK' : 'INSTAGRAM';

    if (isTikTok){
      resTypeTag.textContent = isPhoto ? 'FOTO SLIDE' : 'VIDEO HD';
    } else if (isStory){
      resTypeTag.textContent = 'STORY';
    } else if (isPhoto){
      resTypeTag.textContent = photos.length > 1 ? 'CAROUSEL' : 'FOTO HD';
    } else {
      resTypeTag.textContent = 'REELS / VIDEO';
    }

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

    var mainVideo = (!isPhoto && (dl.video_hd || dl.video || mediaItems.find(function(m){ return m.type === 'video'; })?.url)) || null;
    var mainAudio = dl.audio || mediaItems.find(function(m){ return m.type === 'audio'; })?.url || null;

    resMediaWrap.innerHTML = '';
    resAudioWrap.innerHTML = '';
    currentSlideList = [];

    if (isPhoto && photos.length > 0){
      currentSlideList = photos;
      currentSlideIdx = 0;

      var slideHtml =
        '<div class="res-slide-container">' +
          '<div class="res-slide-stage">' +
            '<span class="res-slide-badge" id="activeSlideBadge">1 / ' + photos.length + '</span>' +
            '<img class="res-slide-img" id="activeSlideImg" src="' + esc(safeUrl(photos[0])) + '" alt="Slide 1">' +
            (photos.length > 1 ?
              '<button type="button" class="res-slide-nav res-slide-prev" id="prevSlideBtn" aria-label="Slide sebelumnya">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
              '</button>' +
              '<button type="button" class="res-slide-nav res-slide-next" id="nextSlideBtn" aria-label="Slide berikutnya">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
              '</button>' : '') +
          '</div>';

      if (photos.length > 1){
        slideHtml += '<div class="res-thumbnails-strip">';
        photos.forEach(function(imgUrl, idx){
          slideHtml +=
            '<div class="res-thumb-item' + (idx === 0 ? ' active' : '') + '" data-idx="' + idx + '">' +
              '<img class="res-thumb-img" src="' + esc(safeUrl(imgUrl)) + '" alt="Thumb ' + (idx + 1) + '" loading="lazy">' +
            '</div>';
        });
        slideHtml += '</div>';
      }

      slideHtml += '</div>';
      resMediaWrap.innerHTML = slideHtml;

      var prevBtn = document.getElementById('prevSlideBtn');
      var nextBtn = document.getElementById('nextSlideBtn');
      if (prevBtn) prevBtn.addEventListener('click', function(){ setSlide(currentSlideIdx - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function(){ setSlide(currentSlideIdx + 1); });

      var thumbEls = document.querySelectorAll('.res-thumb-item');
      thumbEls.forEach(function(el){
        el.addEventListener('click', function(){
          var idx = parseInt(el.getAttribute('data-idx'), 10) || 0;
          setSlide(idx);
        });
      });
    } else if (mainVideo){
      var posterAttr = data.cover ? ' poster="' + esc(safeUrl(data.cover)) + '"' : '';
      resMediaWrap.innerHTML =
        '<video class="res-video" controls playsinline preload="metadata"' + posterAttr + '>' +
          '<source src="' + esc(safeUrl(mainVideo)) + '" type="video/mp4">' +
          'Browser Anda tidak mendukung pemutaran video.' +
        '</video>';
    } else if (data.cover){
      resMediaWrap.innerHTML =
        '<img src="' + esc(safeUrl(data.cover)) + '" alt="Cover preview" style="width:100%; max-height:360px; object-fit:contain; background:#111;">';
    }

    if (mainAudio){
      resAudioWrap.innerHTML =
        '<div class="res-audio-bar">' +
          '<svg class="res-audio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>' +
          '</svg>' +
          '<audio class="res-audio-player" controls preload="none">' +
            '<source src="' + esc(safeUrl(mainAudio)) + '" type="audio/mpeg">' +
          '</audio>' +
        '</div>';
    }

    var actionsHtml = '';

    if (isPhoto && photos.length > 0){
      if (photos.length === 1){
        actionsHtml +=
          '<a href="' + esc(safeUrl(photos[0])) + '" target="_blank" rel="noopener" download="photo.jpg" class="res-btn res-btn-primary">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
            '<span>Unduh Foto HD</span>' +
          '</a>';
      } else {
        photos.forEach(function(pUrl, idx){
          actionsHtml +=
            '<a href="' + esc(safeUrl(pUrl)) + '" target="_blank" rel="noopener" download="slide-' + (idx + 1) + '.jpg" class="res-btn res-btn-secondary">' +
              '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
              '<span>Unduh Slide Foto #' + (idx + 1) + '</span>' +
            '</a>';
        });
      }
    } else if (mainVideo){
      var vDl = dl.video_hd || dl.video;
      var proxyDl = mediaItems[0]?.download || vDl;
      actionsHtml +=
        '<a href="' + esc(safeUrl(proxyDl || vDl)) + '" target="_blank" rel="noopener" download="video.mp4" class="res-btn res-btn-primary">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>' +
          '<span>Unduh Video HD (Tanpa Watermark)</span>' +
        '</a>';
    }

    if (mainAudio){
      actionsHtml +=
        '<a href="' + esc(safeUrl(mainAudio)) + '" target="_blank" rel="noopener" download="audio.mp3" class="res-btn res-btn-secondary">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>' +
          '<span>Unduh Audio Musik (MP3)</span>' +
        '</a>';
    }

    actionsHtml +=
      '<button type="button" class="res-btn res-btn-outline" id="copyDirectBtn">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>' +
        '<span>Salin Tautan Media</span>' +
      '</button>';

    actionsHtml +=
      '<button type="button" class="res-btn res-btn-outline" id="resetDlBtn">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>' +
        '<span>Unduh Tautan Lain</span>' +
      '</button>';

    resActions.innerHTML = actionsHtml;

    var copyBtn = document.getElementById('copyDirectBtn');
    if (copyBtn){
      copyBtn.addEventListener('click', function(){
        var copyTarget = (isPhoto && photos.length > 0) ? photos[currentSlideIdx] : (mainVideo || inputUrl);
        if (navigator.clipboard){
          navigator.clipboard.writeText(copyTarget).then(function(){
            showToast('Tautan berhasil disalin');
          }).catch(function(){
            showToast('Gagal menyalin');
          });
        }
      });
    }

    var resetBtn = document.getElementById('resetDlBtn');
    if (resetBtn){
      resetBtn.addEventListener('click', function(){
        input.value = '';
        if (clearBtn) clearBtn.classList.remove('active');
        resultCard.classList.remove('active');
        input.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    resultCard.classList.add('active');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('Media siap diunduh');
  }

  var searchParam = new URLSearchParams(window.location.search).get('url');
  if (searchParam){
    input.value = searchParam;
    if (clearBtn) clearBtn.classList.add('active');
    processDownload();
  }
})();
