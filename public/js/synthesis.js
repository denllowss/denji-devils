/* THE SYNTHESIS — Frutiger Aero interactions
   - inject bg layers, deco icons, handles, draggable stickers, trailing cursor, parallax
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
    layer.innerHTML = `
      <div class="deco-icon pin" style="--r:-18deg" title="pin">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C16 2 10 2 10 7C10 11 13 13 13 13L11 28L16 24L21 28L19 13C19 13 22 11 22 7C22 2 16 2 16 2Z" fill="#E8E8E8" stroke="#111" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="16" cy="7" r="4" fill="#FF5A5A" stroke="#111" stroke-width="1.5"/>
          <circle cx="16" cy="7" r="1.8" fill="white"/>
        </svg>
      </div>
      <div class="deco-icon info" style="--r:-4deg">
        <svg viewBox="0 0 36 36" fill="none">
          <path d="M18 3C12 3 7 6.5 7 12C7 17 11 20 14 20.5V25L21 20.5C27 19.5 29 16 29 12C29 6.5 24 3 18 3Z" fill="white" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
          <text x="18" y="18" text-anchor="middle" dominant-baseline="middle" font-family="Inter,sans-serif" font-weight="900" font-size="14" fill="#111">i</text>
        </svg>
      </div>
      <div class="deco-icon cursor" style="--r:-8deg">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M6 4L6 26L11 19L15 28L19 26L15 17L24 17L6 4Z" fill="white" stroke="#111" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="deco-icon x" style="--r:6deg">
        <svg viewBox="0 0 28 28" fill="none">
          <rect x="2" y="2" width="24" height="24" rx="4" fill="white" stroke="#111" stroke-width="2"/>
          <path d="M9 9L19 19M19 9L9 19" stroke="#111" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="deco-icon bulb" style="--r:2deg">
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="13" r="9" fill="#FFDE59" stroke="#111" stroke-width="1.8"/>
          <path d="M12 21H20L19 25H13L12 21Z" fill="#999" stroke="#111" stroke-width="1.5"/>
          <path d="M14 9C14 9 16 8 18 10" stroke="#FFF7A0" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="deco-icon warn" style="--r:10deg">
        <svg viewBox="0 0 36 32" fill="none">
          <path d="M18 2L34 30H2L18 2Z" fill="#FFCC00" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
          <rect x="16.5" y="10" width="3" height="10" rx="1" fill="#111"/>
          <circle cx="18" cy="24" r="2" fill="#111"/>
        </svg>
      </div>
    `;
    document.body.appendChild(layer);
  }

  function injectTrailingCursor(){
    if(window.matchMedia('(hover:none)').matches) return;
    if(document.querySelector('.aero-cursor')) return;
    const cur = document.createElement('div');
    cur.className = 'aero-cursor';
    cur.innerHTML = `
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M6 4L6 26L11 19L15 28L19 26L15 17L24 17L6 4Z" fill="white" stroke="#111" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    `;
    document.body.appendChild(cur);
    let mx = window.innerWidth/2, my = window.innerHeight/2;
    let cx = mx, cy = my;
    let raf = null;
    let visible = false;

    function loop(){
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      raf = requestAnimationFrame(loop);
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
    if(isTouch) return; // disable drag on touch to avoid scroll jank
    const links = document.querySelectorAll('.link');
    links.forEach(link=>{
      const chin = link.querySelector('.chin');
      if(!chin) return;
      let startX=0, startY=0, origX=0, origY=0, dragging=false;
      let offsetX=0, offsetY=0;

      chin.style.cursor = 'grab';
      chin.addEventListener('mousedown', onStart);
      // touch fallback
      chin.addEventListener('touchstart', onTouchStart, {passive:false});

      function onStart(e){
        if(e.button!==0) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
      }
      function onTouchStart(e){
        if(e.touches.length!==1) return;
        // only start drag after long press? For simplicity allow quick drag
        // prevent scroll if horizontal move
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
        window.addEventListener('touchmove', onTouchMove, {passive:false});
        window.addEventListener('touchend', onTouchEnd);
      }
      function startDrag(cx,cy){
        const rect = link.getBoundingClientRect();
        const parentRect = link.parentElement.getBoundingClientRect();
        // compute current translate
        const style = window.getComputedStyle(link);
        const matrix = new DOMMatrix(style.transform === 'none' ? '' : style.transform);
        origX = matrix.m41 || 0;
        origY = matrix.m42 || 0;
        startX = cx; startY = cy;
        dragging = false;
        link.classList.add('dragging');
        chin.style.cursor='grabbing';
        // bring to front
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
      function onTouchMove(e){
        if(e.touches.length!==1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if(!dragging && Math.hypot(dx,dy) > 8){
          dragging=true;
        }
        if(dragging){
          e.preventDefault();
          link.style.transform = `translate3d(${origX+dx}px, ${origY+dy}px, 0) rotate(var(--rot))`;
        }
      }
      function onEnd(e){
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        link.classList.remove('dragging');
        chin.style.cursor='grab';
        if(dragging){
          // snap back with spring after 1.2s if not clicked link
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
      function onTouchEnd(){
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        link.classList.remove('dragging');
        if(dragging){
          setTimeout(()=>{
            link.style.transition='transform .5s var(--ease-pop)';
            link.style.transform='';
            setTimeout(()=>{ link.style.transition=''; link.style.zIndex=''; }, 500);
          }, 600);
        }
        dragging=false;
      }

      // click should still navigate unless dragging
      chin.addEventListener('click', (e)=>{
        if(dragging){
          e.preventDefault(); e.stopPropagation();
        }
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
        d.style.transform = `translate3d(${mx*6*depth}px, ${my*4*depth}px, 0) rotate(${d.style.getPropertyValue('--r')||'0deg'})`;
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

    // add subtle pop on load
    const els = document.querySelectorAll('.link, .logo-wrap, .name-text, .bio, .verified');
    els.forEach((el,i)=>{
      el.style.opacity='0';
      el.style.transform+=' scale(0.9)';
      setTimeout(()=>{
        el.style.transition='opacity .5s var(--ease-smooth), transform .6s var(--ease-pop)';
        el.style.opacity='1';
        el.style.transform = el.style.transform.replace(' scale(0.9)','');
        setTimeout(()=>{ el.style.transition=''; }, 600);
      }, i*60 + 120);
    });
  }

  // run after app.js renders #app
  function waitForApp(){
    const app = document.getElementById('app');
    if(!app) return;
    const observer = new MutationObserver((mutations)=>{
      if(app.innerHTML.trim().length>0){
        // debounce
        clearTimeout(waitForApp._t);
        waitForApp._t = setTimeout(()=>{
          enhance();
        }, 80);
      }
    });
    observer.observe(app, {childList:true, subtree:true});
    // also try immediate
    if(app.innerHTML.trim().length>0) enhance();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', waitForApp);
  }else{
    waitForApp();
  }

  // expose
  window.SYNTHESIS_ENHANCE = enhance;
})();
