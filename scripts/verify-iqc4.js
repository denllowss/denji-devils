const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {imageSize}=require('image-size');
const base=(process.env.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
let total=0;const ok=n=>{total++;console.log('PASS '+n);};
async function get(route,options){return fetch(base+route,{...options,signal:AbortSignal.timeout(70000)});}
async function image(route,label){const r=await get(route);assert.equal(r.status,200,'HTTP '+r.status+' '+r.headers.get('X-IQC-Error-Code'));assert.equal(r.headers.get('content-type'),'image/jpeg');assert.equal(r.headers.get('X-IQC-Variant'),'4');const b=Buffer.from(await r.arrayBuffer()),s=imageSize(b);assert.equal(s.width,555);assert(s.height>=1200);ok(label+' JPEG '+s.width+'×'+s.height+', '+b.length+' bytes');return {b,s,r};}
(async()=>{
 const original=await image('/iqc4','Default');assert(original.b.equals(fs.readFileSync(path.join(__dirname,'../api/iqc4-assets/reference.jpg'))));assert.equal(original.r.headers.get('X-IQC-Source'),'reference-photo');ok('default byte-identik foto');
 for(const route of ['/api/iqc4','/qc4','/api/qc4']){const result=await image(route,'Alias '+route);assert(result.b.equals(original.b));}
 const custom=await image('/iqc4?'+new URLSearchParams({pesan:'note: kamu tidak gagal, kamu sedang belajar.'}),'Pesan khusus');assert.equal(custom.r.headers.get('X-IQC-Source'),'dynamic-render');assert(!custom.b.equals(original.b));
 const time=await image('/iqc4?time=20.14','Jam khusus, teks asli');assert.equal(time.s.height,1200);
 await image('/iqc4?'+new URLSearchParams({message:'Pelan-pelan juga sampai. ✨',mode:'dark',reaction:'👍',time:'21:30',jam:'21.32',battery:15,network:'WIFI',lang:'id',star:0}),'Dark, alias, clock, reaction, battery, network, lang');
 const long=await image('/iqc4?'+new URLSearchParams({text:('Kamu sudah berusaha hari ini, jangan menyerah.\n').repeat(23),reaction:'🙏'}),'Pesan panjang');assert(long.s.height>1200);ok('tinggi otomatis, bubble/menu tidak terpotong');
 const html=await get('/iqc4?'+new URLSearchParams({pesan:'<script>alert("x")</script> *tebal*\n_italic_ ❤',html:1}));assert.equal(html.status,200);assert(html.headers.get('content-type').includes('text/html'));const code=await html.text();assert(code.includes('\\u003cscript>'));assert(!code.includes('<script>alert("x")</script>'));assert(code.includes('window.__iqc4Ready'));ok('template HTML + injeksi teks aman');
 const head=await get('/iqc4',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);ok('HEAD tanpa body');
 const options=await get('/api/iqc4',{method:'OPTIONS'});assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'*');ok('preflight CORS');
 const post=await get('/qc4',{method:'POST'});assert.equal(post.status,405);assert.equal((await post.json()).code,405);ok('metode tidak didukung → JSON 405');
 console.log('TOTAL '+total+' PASS');
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;});
