/* Desktop ergonomics only. API/model controllers remain the source of request state. */
const docsDesktop = (() => {
  const $ = id => document.getElementById(id);
  const desktop = matchMedia('(min-width:1024px)');
  let learningAnchor, learning, responseBody, codeBody, toolbar, imageToolbar, requestAnchor, requestRow;
  let selectedPreset = "";
  let currentTab = 'response', fit = 'width', activeImage = null, syncQueued = false;
  const shell = v => "'" + String(v).replace(/'/g,"'\\''") + "'";
  function create(tag, className, html) {
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(html) node.innerHTML = html; // Only trusted, static interface markup.
    return node;
  }
  function requestCode() {
    const method = $('pgMethod').value, endpoint = $('pgEndpoint').value.trim();
    let url;
    try { url = new URL(endpoint, ORIGIN).href; } catch (_) { return '# Masukkan endpoint yang valid.'; }
    const parts = ['curl --fail --show-error '+shell(url)];
    if(method==='POST') {
      parts.push('  -X POST','  -H '+shell('Content-Type: application/json'));
      const raw = $('pgBody').value.trim();
      parts.push('  --data-raw '+shell(raw || '{}'));
    }
    return parts.join(String.fromCharCode(32,92,10));
  }
  function sync() {
    syncQueued = false;
    if(!toolbar) return;
    const info = pgIqc.info($('pgEndpoint').value.trim());
    const path = (() => { try{return new URL($('pgEndpoint').value,ORIGIN).pathname;}catch(_){return '';} })();
    let selected = info?.type || ({'/api/health':'health','/api/profile':'profile','/lowquality':'lowquality','/api/lowquality':'lowquality','/api/stream':'stream','/api/proxy':'stream'})[path] || '';
    if(path==='/api/dl'){let target='';try{target=JSON.parse($('pgBody').value).url||'';}catch(_){}const instagram=/instagram\.com/.test(target);selected=instagram?(selectedPreset.startsWith('instagram')?selectedPreset:/\/stories\//.test(target)?'instagram_story':'instagram_reel'):(selectedPreset.startsWith('tiktok')?selectedPreset:'tiktok');}
    $('docsEndpointSelect').value = selected;
    $('docsGeneralCode').hidden = !!info;
    $('docsGeneralCodeText').textContent = requestCode();
    $('docsCodeTab').textContent = info ? 'Kode & parameter' : 'Contoh request';
    const label = $('docsActiveEndpoint');
    label.textContent = info ? info.type.toUpperCase() : path || 'API';
    fitImage();
  }
  function queueSync() {
    if(syncQueued) return;
    syncQueued = true;
    queueMicrotask(sync);
  }
  function tab(value, focus = false) {
    currentTab = value === 'code' ? 'code' : 'response';
    for(const name of ['response','code']) {
      const button = $(name==='response'?'docsResponseTab':'docsCodeTab');
      button.setAttribute('aria-selected',String(name===currentTab));
      button.tabIndex = name===currentTab ? 0 : -1;
    }
    if(desktop.matches) {
      responseBody.hidden = currentTab!=='response';
      codeBody.hidden = currentTab!=='code';
    } else {
      responseBody.hidden = false;
      codeBody.hidden = true;
    }
    if(focus) $(currentTab==='response'?'docsResponseTab':'docsCodeTab').focus();
    fitImage();
  }
  function relocate() {
    if(!learning) return;
    if(desktop.matches) {
      codeBody.append(learning);
      $("playgroundForm").append(requestRow);
      const details = learning.querySelector('.iqc-code-details');
      if(details) details.open = true;
    } else {
      learningAnchor.after(learning);
      requestAnchor.after(requestRow);
    }
    document.body.toggleAttribute('data-docs-desktop',desktop.matches);
    tab(currentTab);
    fitImage();
  }
  function fitImage() {
    const image = $('pgResponseCode').querySelector('img.res-img');
    if(!image) {
      if(imageToolbar) imageToolbar.hidden = true;
      activeImage = null;
      return;
    }
    if(image!==activeImage) {
      activeImage = image;
      let canvas = image.parentElement;
      if(!canvas.classList.contains('docs-image-canvas')) {
        canvas = create('div','docs-image-canvas scroller');canvas.tabIndex=0;canvas.setAttribute('role','region');canvas.setAttribute('aria-label','Gambar hasil API. Gulir untuk melihat seluruh gambar.');
        image.before(canvas);
        canvas.append(image);
      }
      image.addEventListener('load',fitImage,{once:true});
    }
    imageToolbar.hidden = false;
    const canvas = image.closest('.docs-image-canvas');
    canvas.dataset.fit = fit;
    $('docsImageSize').textContent = image.naturalWidth ? image.naturalWidth+' × '+image.naturalHeight+' px' : 'Memuat gambar…';
    $('docsImageFit').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fit===fit)));
    if(!desktop.matches) {
      image.style.removeProperty('width');
      image.style.removeProperty('height');
      return;
    }
    if(!image.naturalWidth || !canvas.clientWidth || !canvas.clientHeight) return;
    const padding=30, w=Math.max(80,canvas.clientWidth-padding), h=Math.max(80,canvas.clientHeight-padding);
    const scale=fit==='actual'?1:fit==='screen'?Math.min(1,w/image.naturalWidth,h/image.naturalHeight):Math.min(1,w/image.naturalWidth);
    image.style.width=Math.round(image.naturalWidth*scale)+'px';
    image.style.height='auto';
  }
  function imageFit(value) {
    fit=['width','screen','actual'].includes(value)?value:'width';
    try{localStorage.setItem('denjiDocsImageFit',fit);}catch(_){}
    fitImage();
  }
  function selectEndpoint(value) {
    selectedPreset=value;
    if(['iqc','iqc2','iqc3','iqc4','iqc5','ssgc','health','profile','lowquality','tiktok','tiktok_slide','instagram_reel','instagram_story'].includes(value))applyPreset(value);
    else if(value==='stream')setupPlayground('GET','/api/stream?url=URL_MEDIA_ANDA');
    tab('response');
    $('playgroundForm').closest('.pg-panel-request').scrollTop=0;
    sync();
  }
  function init() {
    const grid=$('playground').querySelector('.pg-grid'), response=$('pgImageResult');
    if(!grid || !response || $('docsEndpointSelect'))return;
    toolbar=create('div','docs-workspace-toolbar docs-desktop-only',`<div class="docs-endpoint-picker"><label for="docsEndpointSelect">ENDPOINT</label><select id="docsEndpointSelect" aria-label="Pilih endpoint atau model"><option value="">Endpoint khusus</option><optgroup label="Generator gambar"><option value="iqc">IQC1 · Instagram</option><option value="iqc2">IQC2 · WhatsApp</option><option value="iqc3">IQC3 · Musik & lirik</option><option value="iqc4">IQC4 · Reaksi</option><option value="iqc5">IQC5 · Nama & profil</option><option value="ssgc">SSGC · Info grup</option><option value="lowquality">Lowquality · JPEG</option></optgroup><optgroup label="Media downloader"><option value="tiktok">TikTok · Video</option><option value="tiktok_slide">TikTok · Slide</option><option value="instagram_reel">Instagram · Reel / Post</option><option value="instagram_story">Instagram · Story</option><option value="stream">Stream · Media</option></optgroup><optgroup label="Utilitas"><option value="health">Health check</option><option value="profile">Profile meta</option></optgroup></select><button type="button" id="docsPresetsToggle" class="docs-expand-presets" aria-expanded="false">Preset cepat</button><button type="button" id="docsGuideToggle" class="docs-expand-presets" aria-expanded="false">Petunjuk</button></div><div class="docs-toolbar-help"><kbd>Ctrl ↵</kbd><span>kirim</span><span>·</span><kbd>Ctrl K</kbd><span>cari endpoint</span></div>`);
    grid.before(toolbar);
    const requestPanel=$('playgroundForm').closest('.pg-panel');requestPanel.classList.add('pg-panel-request');
    const presets=requestPanel.querySelector('.presets-bar');
    presets.classList.add('docs-presets-wrap');presets.dataset.expanded='false';
    const guide=requestPanel.querySelector('.iqc-guide');guide.dataset.expanded='false';
    const tabs=create('div','docs-result-tabs docs-desktop-only',`<button type="button" id="docsResponseTab" role="tab" aria-selected="true" aria-controls="docsResponsePane">Hasil & gambar</button><button type="button" id="docsCodeTab" role="tab" aria-selected="false" aria-controls="docsCodePane" tabindex="-1">Kode & parameter</button><span id="docsActiveEndpoint" class="docs-workspace-note" style="margin-left:auto">API</span>`);
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Panel Playground');
    responseBody=create('div','docs-workspace-pane docs-response-pane scroller');
    responseBody.id='docsResponsePane';responseBody.setAttribute('role','tabpanel');responseBody.setAttribute('aria-labelledby','docsResponseTab');
    for(const node of [...response.children])if(!node.classList.contains('panel-head'))responseBody.append(node);
    response.append(tabs,responseBody);
    codeBody=create('div','docs-workspace-pane docs-code-pane scroller');
    codeBody.id='docsCodePane';codeBody.hidden=true;codeBody.setAttribute('role','tabpanel');codeBody.setAttribute('aria-labelledby','docsCodeTab');
    const general=create('div','docs-general-code',`<h3>Request sesuai isian</h3><p>Endpoint dan body mengikuti form di kiri. Tekan Kirim untuk menjalankan request. Respons dapat berupa JSON, gambar, atau stream sesuai endpoint.</p><button type="button" class="btn-res-action" id="docsCopyGeneral">Salin cURL</button><pre id="docsGeneralCodeText"></pre>`);general.id='docsGeneralCode';codeBody.append(general);response.append(codeBody);
    learning=$('pgIqcLearning');learningAnchor=document.createComment('IQC learning original/mobile position');learning.before(learningAnchor);
    imageToolbar=create('div','docs-image-toolbar docs-desktop-only',`<span id="docsImageSize" class="docs-image-size">Gambar respons</span><div id="docsImageFit" class="docs-fit-buttons" aria-label="Ukuran pratinjau"><button type="button" data-fit="width" aria-pressed="true">Lebar</button><button type="button" data-fit="screen" aria-pressed="false">Fit layar</button><button type="button" data-fit="actual" aria-pressed="false">100%</button></div>`);imageToolbar.hidden=true;
    responseBody.querySelector('.response-code-container').before(imageToolbar);
    requestRow=$('playgroundForm').querySelector('.request-config');requestAnchor=document.createComment('Request controls original/mobile position');requestRow.before(requestAnchor);
    $('docsEndpointSelect').addEventListener('change',e=>selectEndpoint(e.target.value));
    $('docsPresetsToggle').onclick=()=>{const expanded=presets.dataset.expanded!=='true';presets.dataset.expanded=String(expanded);$('docsPresetsToggle').setAttribute('aria-expanded',String(expanded));};
    $('docsGuideToggle').onclick=()=>{const expanded=guide.dataset.expanded!=='true';guide.dataset.expanded=String(expanded);$('docsGuideToggle').setAttribute('aria-expanded',String(expanded));};
    $('docsResponseTab').onclick=()=>tab('response');$('docsCodeTab').onclick=()=>{tab('code');sync();};
    tabs.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();tab(e.key==='Home'?'response':e.key==='End'?'code':currentTab==='response'?'code':'response',true);}});
    $('docsImageFit').addEventListener('click',e=>{const b=e.target.closest('[data-fit]');if(b)imageFit(b.dataset.fit);});
    $('docsCopyGeneral').onclick=()=>copyText(requestCode(),'cURL sesuai isian disalin');
    document.addEventListener('input',queueSync);document.addEventListener('change',queueSync);
    document.addEventListener('click',queueSync);
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&desktop.matches&&document.activeElement?.closest('#playground')){e.preventDefault();if(!$('pgSubmitBtn').disabled)$('playgroundForm').requestSubmit();}});
    new MutationObserver(queueSync).observe(learning,{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(fitImage).observe($('pgResponseCode'),{childList:true,subtree:true});
    new ResizeObserver(fitImage).observe(responseBody);
    desktop.addEventListener('change',relocate);window.addEventListener('resize',fitImage);
    try{const saved=localStorage.getItem('denjiDocsImageFit');if(['width','screen','actual'].includes(saved))fit=saved;}catch(_){}
    relocate();sync();
    // DOM relocation changes page geometry. Honor deep links after it settles.
    requestAnimationFrame(()=>{
      const hash=location.hash.slice(1),target=hash&&document.getElementById(hash);
      if(desktop.matches&&target)target.scrollIntoView({behavior:'instant',block:'start'});
      fitImage();
    });
  }
  document.addEventListener('DOMContentLoaded',init);
  return {tab,imageFit,selectEndpoint,sync,desktop:()=>desktop.matches};
})();
