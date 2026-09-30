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

  function isRealVideoUrl(u){
    if (!u) return false;
    var s = String(u).toLowerCase();
    if (s.includes('.mp3') || s.includes('audio_mpeg') || s.includes('mime_type=audio') || s.includes('/music/')) return false;
    return s.includes('.mp4') || s.includes('.mov') || s.includes('.m3u8') || s.includes('mime_type=video') || s.includes('/video/');
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
      showToast('Masukkan tautan terlebih dahulu');
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
        throw new Error(data.message || 'Gagal memproses tautan. Pastikan akun atau postingan bersifat publik.');
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
    var activeDlBtn = document.getElementById('activeSlideDlBtn');

    if (imgEl) imgEl.src = safeUrl(currentSlideList[idx]);
    if (badgeEl) badgeEl.textContent = (idx + 1) + ' / ' + currentSlideList.length;
    if (activeDlBtn){
      activeDlBtn.href = safeUrl(currentSlideList[idx]);
      activeDlBtn.setAttribute('download', 'slide-' + (idx + 1) + '.jpg');
      var labelSpan = activeDlBtn.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Unduh Foto Slide #' + (idx + 1);
    }

    var thumbs = document.querySelectorAll('.res-thumb-item');
    thumbs.forEach(function(t, i){
      if (i === idx){
        t.classList.add('active');
        t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        t.classList.remove('active');
      }
    });
  }

  function renderResult(data, inputUrl){
    var platform = (data.platform || 'media').toLowerCase();
    var isTikTok = platform === 'tiktok';
    var isInstagram = platform === 'instagram';
    var rawType = String(data.type || '').toLowerCase();

    var dl = data.downloads || {};
    var photos = Array.isArray(dl.photos) ? dl.photos : [];
    var mediaItems = Array.isArray(dl.media) ? dl.media : [];

    var mainVideo = dl.video_hd || dl.video;
    var mainAudio = dl.audio;

    if (mainVideo && !isRealVideoUrl(mainVideo)){
      if (!mainAudio) mainAudio = mainVideo;
      mainVideo = null;
    }

    if (!mainVideo && mediaItems.length > 0){
      var vItem = mediaItems.find(function(m){ return m.type === 'video' && isRealVideoUrl(m.url); });
      if (vItem) mainVideo = vItem.url;
    }

    var hasVideo = !!(mainVideo && isRealVideoUrl(mainVideo));
    var hasPhotos = photos.length > 0;
    var isExplicitPhotoUrl = inputUrl.includes('/photo/') || inputUrl.includes('/photomode/');
    var isLivePhoto = rawType === 'live_photo' || (hasPhotos && hasVideo);

    var isPhoto = false;
    if (isLivePhoto) {
      isPhoto = true;
    } else if (isExplicitPhotoUrl) {
      isPhoto = true;
    } else if (hasPhotos && !hasVideo) {
      isPhoto = true;
    } else if (rawType === 'carousel' || (rawType === 'image' && !hasVideo)) {
      isPhoto = true;
    } else if (hasVideo) {
      isPhoto = false;
    }

    var isStory = rawType === 'story' || inputUrl.includes('/stories/');

    resPlatformTag.className = 'res-platform-tag ' + (isTikTok ? 'tiktok' : (isInstagram ? 'instagram' : 'tiktok'));
    resPlatformTag.textContent = isTikTok ? 'TIKTOK' : (isInstagram ? 'INSTAGRAM' : 'VIDEO HD');

    if (isLivePhoto){
      resTypeTag.textContent = 'FOTO LIVE';
    } else if (isTikTok){
      resTypeTag.textContent = isPhoto ? 'SLIDE FOTO' : 'VIDEO HD';
    } else if (isStory){
      resTypeTag.textContent = 'STORY';
    } else if (isPhoto){
      resTypeTag.textContent = photos.length > 1 ? 'CAROUSEL' : 'FOTO HD';
    } else {
      resTypeTag.textContent = 'VIDEO HD';
    }

    var author = data.author || {};
    var defaultName = isTikTok ? 'TikTok Creator' : (isInstagram ? 'Instagram Creator' : 'Video Creator');
    resName.textContent = author.name || defaultName;

    if (author.username && author.username.trim()){
      var u = author.username.trim();
      resUser.textContent = u.startsWith('@') ? u : '@' + u;
    } else {
      resUser.textContent = isTikTok ? '@tiktok' : (isInstagram ? '@instagram' : '');
    }

    var avatarSrc = author.avatar || data.cover || '';
    if (!avatarSrc) {
      var initial = (author.name || (isTikTok ? 'TT' : (isInstagram ? 'IG' : 'VD'))).trim();
      var bg = isTikTok ? '000000' : (isInstagram ? 'bc1888' : '323c1f');
      avatarSrc = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(initial) + '&background=' + bg + '&color=fff&size=128&bold=true';
    }

    resAvatar.src = safeUrl(avatarSrc);
    resAvatar.style.display = 'block';
    resAvatar.onerror = function(){
      if (resAvatar.src !== safeUrl(data.cover) && data.cover){
        resAvatar.src = safeUrl(data.cover);
      } else {
        var initial = (author.name || (isTikTok ? 'TT' : (isInstagram ? 'IG' : 'VD'))).trim();
        var bg = isTikTok ? '000000' : (isInstagram ? 'bc1888' : '323c1f');
        resAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(initial) + '&background=' + bg + '&color=fff&size=128&bold=true';
      }
    };

    if (data.title && data.title.trim()){
      resTitle.textContent = data.title.trim();
      resTitle.style.display = 'block';
    } else {
      resTitle.style.display = 'none';
    }

    if (isPhoto && photos.length === 0 && mediaItems.length > 0){
      mediaItems.forEach(function(m){
        if (m.url && !photos.includes(m.url)) photos.push(m.url);
      });
    }

    if (isPhoto && photos.length > 0){
      currentSlideIdx = 0;
      currentSlideList = photos;

      var slideHtml =
        '<div class="res-slide-container">' +
          '<div class="res-slide-stage" id="slideStage">' +
            '<span class="res-slide-badge" id="activeSlideBadge">1 / ' + photos.length + '</span>';

      if (photos.length > 1){
        slideHtml +=
          '<button type="button" class="res-slide-nav prev" id="prevSlideBtn" aria-label="Foto Sebelumnya">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
          '</button>' +
          '<button type="button" class="res-slide-nav next" id="nextSlideBtn" aria-label="Foto Selanjutnya">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
          '</button>';
      }

      slideHtml +=
        '<img class="res-slide-img" id="activeSlideImg" src="' + esc(safeUrl(photos[0])) + '" alt="Slide 1">' +
      '</div>';

      if (photos.length > 1){
        slideHtml += '<div class="res-thumbs">';
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

      var stageEl = document.getElementById('slideStage');
      if (stageEl){
        var touchStartX = 0;
        var touchEndX = 0;
        stageEl.addEventListener('touchstart', function(e){
          touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        stageEl.addEventListener('touchend', function(e){
          touchEndX = e.changedTouches[0].screenX;
          if (touchStartX - touchEndX > 45){
            setSlide(currentSlideIdx + 1);
          } else if (touchEndX - touchStartX > 45){
            setSlide(currentSlideIdx - 1);
          }
        }, { passive: true });
      }
    } else if (mainVideo && isRealVideoUrl(mainVideo)){
      var isHls = /\.m3u8($|\?)/i.test(mainVideo);
      var posterAttr = data.cover ? ' poster="' + esc(safeUrl(data.cover)) + '"' : '';
      resMediaWrap.innerHTML =
        '<video id="previewVideoPlayer" class="res-video" controls playsinline preload="metadata"' + posterAttr + '>' +
          (isHls ? '<source src="' + esc(safeUrl(mainVideo)) + '" type="application/x-mpegURL">' : '') +
          '<source src="' + esc(safeUrl(mainVideo)) + '" type="video/mp4">' +
          'Browser Anda tidak mendukung pemutaran video.' +
        '</video>';

      var videoEl = document.getElementById('previewVideoPlayer');
      if (videoEl && isHls) {
        if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          videoEl.src = safeUrl(mainVideo);
        } else if (window.Hls && window.Hls.isSupported()) {
          var hls = new window.Hls();
          hls.loadSource(safeUrl(mainVideo));
          hls.attachMedia(videoEl);
        } else {
          var hlsScript = document.createElement('script');
          hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
          hlsScript.onload = function() {
            if (window.Hls && window.Hls.isSupported() && videoEl) {
              var hls = new window.Hls();
              hls.loadSource(safeUrl(mainVideo));
              hls.attachMedia(videoEl);
            }
          };
          document.head.appendChild(hlsScript);
        }
      }
    } else if (data.cover){
      resMediaWrap.innerHTML =
        '<img src="' + esc(safeUrl(data.cover)) + '" alt="Cover preview" style="width:100%; max-height:360px; object-fit:contain; background:#0b0f17;">';
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
        actionsHtml +=
          '<a href="' + esc(safeUrl(photos[0])) + '" target="_blank" rel="noopener" download="slide-1.jpg" class="res-btn res-btn-primary" id="activeSlideDlBtn">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
            '<span>Unduh Foto Slide #1</span>' +
          '</a>';
      }

      if (mainVideo && isRealVideoUrl(mainVideo)){
        actionsHtml +=
          '<a href="' + esc(safeUrl(mainVideo)) + '" target="_blank" rel="noopener" download="live-video.mp4" class="res-btn res-btn-secondary">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>' +
            '<span>Unduh Video Live (Motion Clip)</span>' +
          '</a>';
      }
    } else if (mainVideo && isRealVideoUrl(mainVideo)){
      var vDl = dl.video_hd || dl.video;
      var proxyDl = mediaItems[0]?.download || vDl;
      actionsHtml +=
        '<a href="' + esc(safeUrl(proxyDl || vDl)) + '" target="_blank" rel="noopener" download="video.mp4" class="res-btn res-btn-primary">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>' +
          '<span>Unduh Video HD</span>' +
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
      '<div class="res-btn-grid">' +
        '<button type="button" class="res-btn res-btn-outline" id="copyDirectBtn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>' +
          '<span>Salin Tautan</span>' +
        '</button>' +
        '<button type="button" class="res-btn res-btn-outline" id="resetDlBtn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>' +
          '<span>Tautan Lain</span>' +
        '</button>' +
      '</div>';

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
