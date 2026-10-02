// Regression: genuine transparent assets for every reaction, on both themes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {prepareChromium}=require('../src/services/iqc-runtime');
const base=(process.env.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const mapping=[['👍','58'],['❤️','115'],['😂','171'],['😮','227'],['😢','284'],['🙏','340']];
let total=0;const ok=n=>{total++;console.log('PASS '+n);};
(async()=>{
 const r=await prepareChromium();const browser=await r.puppeteer.launch({args:r.chromium.args,env:r.env,executablePath:r.executablePath,headless:'shell',defaultViewport:{width:555,height:1200}});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>/^(data:|about:|blob:)/.test(r.url())?r.continue():r.abort());
  for(const mode of ['light','dark'])for(const [reaction,file] of mapping){
   const query=new URLSearchParams({html:'1',mode,reaction,time:'20.14',pesan:'Halo ❤ ✨ 😮'});
   const res=await fetch(base+'/iqc4?'+query,{signal:AbortSignal.timeout(70000)});assert.equal(res.status,200);const html=await res.text();
   const map=JSON.parse(html.match(/toolbar=(\{.*?\}),keys=/s)[1]);
   for(const [key,suffix] of mapping){const png=Buffer.from(map[key].split(',')[1],'base64');assert(png.equals(fs.readFileSync(path.join(__dirname,'../api/iqc4-assets/reaction-'+suffix+'.png'))));}
   await page.setContent(html,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__iqc4Ready===true,{timeout:10000});
   const state=await page.evaluate(async(reaction)=>{
    const images=[...document.querySelectorAll('#tray .reaction img')];const stats=[];
    for(const img of images){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let partial=0,border=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=p[(y*c.width+x)*4+3];if(a>0&&a<255)partial++;if(x<7||y<8||x>=c.width-7||y>=c.height-8)border+=a;}stats.push({width:c.width,height:c.height,partial,border});}
    const selected=document.querySelector('#tray .reaction.selected img');const badge=document.getElementById('badgeEmoji');
    return {stats,selected:selected?.alt,badge:badge.alt,same:badge.src===selected?.src,message:[...document.querySelectorAll('#msg img')].every(i=>i.complete&&i.naturalWidth>0)};
   },reaction);
   assert.equal(state.stats.length,6);for(const sprite of state.stats){assert.equal(sprite.width,96);assert.equal(sprite.height,98);assert(sprite.partial>50,'Smooth alpha edges required; JPEG threshold cutouts forbidden');assert.equal(sprite.border,0,'Transparent margins required, no white rectangular fringe');}
   assert.equal(state.selected,reaction);assert.equal(state.badge,reaction);assert(state.same,'Badge must use the same repaired RGBA source');assert(state.message,'Inline message emoji must load');
   ok(mode+' '+reaction+' — six clean RGBA icons, selected state + badge + message');
  }
  const q=new URLSearchParams({mode:'dark',reaction:'none',reactions:'0',html:'1'});const res=await fetch(base+'/iqc4?'+q);await page.setContent(await res.text());await page.waitForFunction(()=>window.__iqc4Ready);assert(await page.evaluate(()=>document.getElementById('tray').hidden&&document.getElementById('badge').hidden));ok('none + reactions=0 remains hidden');
  const response=await fetch(base+'/iqc4?mode=dark');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/jpeg');ok('Native dark JPEG HTTP 200');
  assert.equal(errors.length,0,errors.join('\n'));ok('No JavaScript errors');
  console.log('TOTAL '+total+' PASS');
 } finally {await browser.close();}
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;});
