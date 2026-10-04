/* THE SYNTHESIS — Frutiger Aero interactions
   - inject bg layers, deco icons (direct from poster 100% similar), handles, draggable stickers, trailing cursor, parallax
   - Icons diambil langsung dari poster asli, dibersihkan background, bukan SVG bikinan
*/
(function(){
  'use strict';

  function injectBg(){
    if(document.querySelector('.aero-vignette')) return;
    const vignette = document.createElement('div');
    vignette.className = 'aero-vignette';
    document.body.prepend(vignette);

    const cloudsWrap = document.createElement('div');
    cloudsWrap.className = 'aero-clouds';
    cloudsWrap.innerHTML = `
      <div class="aero-cloud c1"></div>
      <div class="aero-cloud c2"></div>
      <div class="aero-cloud c3"></div>
      <div class="aero-cloud c4"></div>
    `;
    document.body.prepend(cloudsWrap);
  }

  function injectDeco(){
    if(document.querySelector('.aero-deco-layer')) return;
    const layer = document.createElement('div');
    layer.className = 'aero-deco-layer';
    layer.setAttribute('aria-hidden','true');
    // Icons 100% mirip poster - diambil langsung dari Recruitment Pubmat.jpg (crop asli), bukan bikinan
    // pin_direct, info_direct, cursor_direct, x_direct, bulb_direct, warn_direct - 100% direct
    layer.innerHTML = `
      <div class="deco-icon pin" style="--r:-18deg" title="pin">
        <img src="/images/icons/pin_direct.png" alt="" width="48" height="48" loading="eager" decoding="async" draggable="false">
      </div>
      <div class="deco-icon info" style="--r:-4deg">
        <img src="/images/icons/info_direct.png" alt="" width="44" height="44" loading="eager" decoding="async" draggable="false">
      </div>
      <div class="deco-icon cursor" style="--r:-8deg">
        <img src="/images/icons/cursor_direct.png" alt="" width="52" height="52" loading="eager" decoding="async" draggable="false">
      </div>
      <div class="deco-icon x" style="--r:6deg">
        <img src="/images/icons/x_direct.png" alt="" width="40" height="40" loading="eager" decoding="async" draggable="false">
      </div>
      <div class="deco-icon bulb" style="--r:2deg">
        <img src="/images/icons/bulb_direct.png" alt="" width="46" height="46" loading="eager" decoding="async" draggable="false">
      </div>
      <div class="deco-icon warn" style="--r:10deg">
        <img src="/images/icons/warn_direct.png" alt="" width="50" height="50" loading="eager" decoding="async" draggable="false">
      </div>
    `;
    document.body.appendChild(layer);
  }

  function injectTrailingCursor(){
    if(window.matchMedia('(hover:none)').matches) return;
    if(document.querySelector('.aero-cursor')) return;
    const cur = document.createElement('div');
    cur.className = 'aero-cursor';
    cur.innerHTML = `<img src="/images/icons/cursor_direct.png" alt="" width="34" height="34" draggable="false">`;
    document.body.appendChild(cur);
    let mx = window.innerWidth/2, my = window.innerHeight/2;
    let cx = mx, cy = my;
    let visible = false;

    function loop(){
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(loop);
    }
    loop();

    window.addEventListener('mousemove', (e)=>{
      mx = e.clientX; my = e.clientY;
      if(!visible){ cur.style.opacity='1'; visible=true; document.body.classList.add('aero-custom-cursor'); }
    }, {passive:true});
    window.addEventListener('mouseleave', ()=>{
      cur.style.opacity='0'; visible=false; document.body.classList.remove('aero-custom-cursor');
    });
    window.addEventListener('mouseenter', (e)=>{
      mx = e.clientX; my = e.clientY;
    });
  }

  function addHandles(){
    const chins = document.querySelectorAll('.chin');
    chins.forEach(chin=>{
      if(chin.querySelector('.handle')) return;
      const positions = ['tl','tr','bl','br','tc','bc','lc','rc'];
      positions.forEach(p=>{
        const h = document.createElement('span');
        h.className = 'handle '+p;
        h.setAttribute('aria-hidden','true');
        chin.appendChild(h);
      });
    });
  }

  function makeDraggable(){
    const isTouch = window.matchMedia('(hover:none)').matches;
    if(isTouch) return;
    const links = document.querySelectorAll('.link');
    links.forEach(link=>{
      const chin = link.querySelector('.chin');
      if(!chin) return;
      let startX=0, startY=0, origX=0, origY=0, dragging=false;

      chin.style.cursor = 'grab';
      chin.addEventListener('mousedown', onStart);

      function onStart(e){
        if(e.button!==0) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
      }
      function startDrag(cx,cy){
        const style = window.getComputedStyle(link);
        const matrix = new DOMMatrix(style.transform === 'none' ? '' : style.transform);
        origX = matrix.m41 || 0;
        origY = matrix.m42 || 0;
        startX = cx; startY = cy;
        dragging = false;
        link.classList.add('dragging');
        chin.style.cursor='grabbing';
        link.style.zIndex = '100';
      }
      function onMove(e){
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if(!dragging && Math.hypot(dx,dy) > 4) dragging=true;
        if(dragging){
          link.style.transform = `translate3d(${origX+dx}px, ${origY+dy}px, 0) rotate(var(--rot))`;
        }
      }
      function onEnd(e){
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        link.classList.remove('dragging');
        chin.style.cursor='grab';
        if(dragging){
          setTimeout(()=>{
            link.style.transition='transform .6s cubic-bezier(.175,.885,.32,1.275)';
            link.style.transform='';
            setTimeout(()=>{ link.style.transition=''; link.style.zIndex=''; }, 600);
          }, 900);
          e.preventDefault();
          e.stopPropagation();
        }else{
          link.style.zIndex='';
        }
        dragging=false;
      }
      chin.addEventListener('click', (e)=>{
        if(dragging){ e.preventDefault(); e.stopPropagation(); }
      }, true);
    });
  }

  function parallax(){
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    let mx=0, my=0;
    window.addEventListener('mousemove', (e)=>{
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      const clouds = document.querySelectorAll('.aero-cloud');
      clouds.forEach((c,i)=>{
        const depth = (i+1)*0.6;
        c.style.transform = `translate3d(${mx*10*depth}px, ${my*5*depth}px, 0)`;
      });
      const deco = document.querySelectorAll('.deco-icon');
      deco.forEach((d,i)=>{
        const depth = (i%3+1)*0.4;
        // keep original rotation --r, add parallax translate
        const r = d.style.getPropertyValue('--r') || '0deg';
        d.style.transform = `translate3d(${mx*6*depth}px, ${my*4*depth}px, 0) rotate(${r})`;
      });
    }, {passive:true});
  }

  function enhance(){
    injectBg();
    injectDeco();
    addHandles();
    makeDraggable();
    parallax();
    injectTrailingCursor();

    const els = document.querySelectorAll('.link, .logo-wrap, .name-text, .bio, .verified');
    els.forEach((el,i)=>{
      el.style.opacity='0';
      el.style.transform+=' scale(0.9)';
      setTimeout(()=>{
        el.style.transition='opacity .5s var(--ease-smooth, cubic-bezier(.16,1,.3,1)), transform .6s var(--ease-pop, cubic-bezier(.175,.885,.32,1.275))';
        el.style.opacity='1';
        el.style.transform = el.style.transform.replace(' scale(0.9)','');
        setTimeout(()=>{ el.style.transition=''; }, 600);
      }, i*60 + 80);
    });
  }

  function waitForApp(){
    const app = document.getElementById('app');
    if(!app) return;
    const observer = new MutationObserver(()=>{
      if(app.innerHTML.trim().length>0){
        clearTimeout(waitForApp._t);
        waitForApp._t = setTimeout(()=>{ enhance(); }, 80);
      }
    });
    observer.observe(app, {childList:true, subtree:true});
    if(app.innerHTML.trim().length>0) enhance();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', waitForApp);
  }else{
    waitForApp();
  }

  window.SYNTHESIS_ENHANCE = enhance;
})();
