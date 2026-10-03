// SSGC API regression: original bytes, limits/full, Unicode, profile POST and safe input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { imageSize } = require('image-size');
const base = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const get = (route, options) => fetch(base + route, {...options, signal:AbortSignal.timeout(70000)});
const query = p => '/ssgc?' + new URLSearchParams(p);
const segment = s => [...new Intl.Segmenter('id',{granularity:'grapheme'}).segment(s)];
let total = 0;
function ok(label, condition = true) { assert(condition, label); total++; console.log('PASS ' + label); }
async function image(route, label, options) {
  const r = await get(route, options);
  assert.equal(r.status, 200, label + ' HTTP ' + r.status + ' ' + r.headers.get('X-SSGC-Error-Code'));
  assert.equal(r.headers.get('X-SSGC-Variant'), 'group-info');
  const b = Buffer.from(await r.arrayBuffer()), s = imageSize(b);
  assert.equal(s.width,739); assert(s.height>=1600 && s.height<=20000);
  assert.equal(r.headers.get('content-type'),s.type==='png'?'image/png':'image/jpeg');
  assert.equal(Number(r.headers.get('X-SSGC-Width')),s.width); assert.equal(Number(r.headers.get('X-SSGC-Height')),s.height);
  assert.equal(Number(r.headers.get('content-length')),b.length);
  ok(label + ' → ' + s.type + ' ' + s.width + '×' + s.height);
  return {r,b,s};
}
async function error(route,status,label,options){
  const r=await get(route,options);assert.equal(r.status,status,label+' '+r.status);
  const j=await r.json();assert.equal(j.code,status);assert.equal(j.error,r.headers.get('X-SSGC-Error-Code'));
  ok(label+' → JSON '+status);return {r,j};
}
async function html(p,options){const r=await get(query({...p,html:1}),options);assert.equal(r.status,200);assert(r.headers.get('content-type').startsWith('text/html'));return {r,h:await r.text()};}
(async()=>{
  const req={method:'POST',url:'/ssgc',headers:{'content-type':'application/json'}};
  Object.defineProperty(req,'body',{get(){throw new SyntaxError('Malformed JSON');}});
  const headers={};let body;const res={statusCode:200,setHeader(n,v){headers[n]=v;},end(v){body=JSON.parse(v);}};
  await require('../api/ssgc')(req,res);assert.equal(res.statusCode,400);assert.equal(body.error,'INVALID_BODY');ok('Vercel lazy JSON getter: 400 aman');
  const original=await image('/ssgc','Default');
  ok('JPG asli byte-identik 739×1600',original.b.equals(fs.readFileSync(path.join(__dirname,'../api/ssgc-assets/reference.jpg'))));
  assert.equal(original.r.headers.get('X-SSGC-Source'),'reference-photo');
  assert.equal(original.r.headers.get('X-SSGC-Description-Length'),'47');assert.equal(original.r.headers.get('X-SSGC-Description-Shown'),'44');assert.equal(original.r.headers.get('X-SSGC-Truncated'),'1');ok('Metadata batas default 44 dari 47 karakter yang diketahui');
  for(const route of ['/api/ssgc','/ssgc/','/api/ssgc/'])ok('Alias identik '+route,(await image(route,route)).b.equals(original.b));
  const defaults={name:'VOXEN FIGHTER',description:'WELCOME TO—VOXEN FIGHTER\n#VOXEN ANTI-DIMMING...',limit:'44',full:'0',members:'126',titleFont:'serif',profile:'default',format:'jpg'};
  ok('Default eksplisit tetap original',(await image(query(defaults),'Default eksplisit')).b.equals(original.b));
  const png=await image(query({format:'png'}),'PNG konversi default');assert.equal(png.s.type,'png');assert.equal(png.r.headers.get('X-SSGC-Source'),'reference-converted');ok('PNG dilabeli konversi, bukan original JPEG');
  const custom=await image(query({name:'Komunitas Denji ❤',description:'Halo semuanya. Tempat berbagi cerita dan belajar bersama.',limit:20,members:888,titleFont:'sans'}),'Nama/deskripsi/anggota/font');
  assert.equal(custom.r.headers.get('X-SSGC-Source'),'dynamic-render');assert.equal(custom.r.headers.get('X-SSGC-Description-Shown'),'20');assert.equal(custom.r.headers.get('X-SSGC-Truncated'),'1');ok('Baca selengkapnya hanya ketika benar-benar terpotong');
  for(const [description,limit,full,shown,cut] of [['ABCDE',5,0,5,0],['ABCDE',6,0,5,0],['ABCDE',4,0,4,1],['ABCDE',1,1,5,0],['ABCDE',0,0,5,0],['',44,0,0,0]]){
    const {r,h}=await html({description,limit,full});
    assert.equal(r.headers.get('X-SSGC-Description-Shown'),String(shown));assert.equal(r.headers.get('X-SSGC-Truncated'),String(cut));
    assert.equal(r.headers.get('X-SSGC-Description-Limit'),String(full||!limit?0:limit));assert(h.includes('window.__ssgcReady'));
    ok('Batas '+limit+', full='+full+', panjang '+description.length+' → shown='+shown+', cut='+cut);
  }
  const unicode='A👨‍👩‍👧‍👦🇮🇩e\u0301❤Z';
  const {r:ur,h:uh}=await html({description:unicode,limit:3});assert.equal(Number(ur.headers.get('X-SSGC-Description-Length')),segment(unicode).length);assert.equal(ur.headers.get('X-SSGC-Description-Shown'),'3');assert(uh.includes(unicode));ok('Unicode ZWJ/flag/combining mark dihitung grapheme utuh');
  const empty=await image(query({description:'',profile:'none'}),'Deskripsi kosong + tanpa foto');assert.equal(empty.r.headers.get('X-SSGC-Truncated'),'0');
  const longText=('Halo semuanya ❤. Tempat berbagi cerita dan belajar bersama.\n').repeat(20);
  const long=await image(query({name:('GRUP KITA BERSAMA ').repeat(4),description:longText,full:1}),'Nama/deskripsi panjang penuh');ok('Autoheight tidak memotong menu',long.s.height>1600);assert.equal(long.r.headers.get('X-SSGC-Description-Limit'),'0');
  await image(query({description:unicode,limit:3,format:'png'}),'Render emoji tidak terpotong');
  const photo=fs.readFileSync(path.join(__dirname,'../public/images/iqc5-avatar-demo.png'));
  let form=new FormData();form.append('name','Grup Upload');form.append('description','Foto profil sendiri ❤');form.append('full','1');form.append('profile',new Blob([photo],{type:'image/png'}),'foto.png');
  await image('/ssgc','POST multipart profil + field konfigurasi',{method:'POST',body:form});
  await image('/api/ssgc','POST JSON profileData',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Grup JSON',description:'Halo JSON ❤',profileData:'data:image/png;base64,'+photo.toString('base64')})});
  await image(query({name:'Grup Raw',description:'Halo raw',full:1}),'POST raw raster',{method:'POST',headers:{'content-type':'image/png'},body:photo});
  const alias=await html({nama:'Query alias',deskripsi:'Deskripsi query',batas:3,fullDescription:1,anggota:234,font:'sans'}, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Body',description:'Teks body',limit:99,members:2,titleFont:'serif',profileData:photo.toString('base64')})});
  assert(alias.h.includes('"name":"Query alias"')&&alias.h.includes('"description":"Deskripsi query"')&&alias.h.includes('"limit":3')&&alias.h.includes('"members":234')&&alias.h.includes('"titleFont":"sans"')&&alias.h.includes('"profileKind":"image"'));ok('Alias query mengoverride field canonical body');
  const safe=await html({name:'<script>bad</script>',description:'</script><img src=x onerror=alert(1)> ❤'});assert(safe.h.includes('\\u003cscript>'));assert(!safe.h.includes('<script>bad</script>'));assert(!safe.h.includes('</script><img src=x'));ok('Nama/deskripsi XSS di-escape; seluruh template offline');
  const clipped=await html({name:'N'.repeat(80),description:'Z'.repeat(2100),full:1});assert(clipped.h.includes('"name":"'+'N'.repeat(64)+'"'));assert.equal(clipped.r.headers.get('X-SSGC-Description-Length'),'2000');ok('Nama 64 dan deskripsi 2000 karakter maksimum');
  await image(query({profile:'https://jpeg.wavebeem.com/icon.jpg',name:'Grup URL',description:'Foto publik'}),'Profil URL publik dengan DNS pinning');
  for(const url of ['http://127.0.0.1/a.png','http://localhost/a.png','http://169.254.169.254/latest/meta-data/','http://192.168.1.1/a.png','http://[::1]/a.png','file:///etc/passwd','https://user:pass@example.com/a.png','https://example.com:9000/a.png'])await error(query({profile:url}),400,'URL privat/berbahaya ditolak '+url);
  for(const p of [{limit:-1},{batas:2001},{limit:2.5},{members:-1},{anggota:1000000}])await error(query(p),400,'Bilangan tidak valid '+JSON.stringify(p));
  await error('/ssgc',405,'PUT ditolak',{method:'PUT'});
  await error('/ssgc',400,'JSON rusak',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'});
  await error('/ssgc',400,'JSON bukan object',{method:'POST',headers:{'content-type':'application/json'},body:'[]'});
  await error('/ssgc',415,'Body text/plain ditolak',{method:'POST',headers:{'content-type':'text/plain'},body:'hello'});
  await error('/ssgc',415,'SVG ditolak',{method:'POST',headers:{'content-type':'image/svg+xml'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"/>'});
  await error('/ssgc',415,'Raster tidak valid',{method:'POST',headers:{'content-type':'image/png'},body:'not png'});
  const large=Buffer.from(photo);large.writeUInt32BE(3000,16);large.writeUInt32BE(1500,20);await error('/ssgc',413,'Profil lebih dari 4 MP',{method:'POST',headers:{'content-type':'image/png'},body:large});
  await error('/ssgc',413,'Profil lebih dari 2 MB',{method:'POST',headers:{'content-type':'image/png'},body:Buffer.alloc(2*1024*1024+1)});
  await error('/ssgc',413,'Request lebih dari 3 MB',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({description:'a'.repeat(3000001)})});
  await error('/ssgc',415,'Raster header valid tetapi decode gagal',{method:'POST',headers:{'content-type':'image/png'},body:photo.subarray(0,33)});
  await error(query({profile:'https://jpeg.wavebeem.com/icon.jpg'}),400,'URL dan upload ambigu',{method:'POST',headers:{'content-type':'image/png'},body:photo});
  form=new FormData();form.append('profile',new Blob([photo],{type:'image/png'}),'a.png');form.append('avatar',new Blob([photo],{type:'image/png'}),'b.png');await error('/ssgc',400,'Lebih dari satu file ditolak',{method:'POST',body:form});
  await error('/ssgc',413,'Output terlalu tinggi ditolak aman',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({description:('A\n').repeat(990),full:1})});
  const head=await get('/ssgc',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(Number(head.headers.get('content-length')),original.b.length);ok('HEAD sama header JPG tanpa body');
  const opt=await get('/ssgc',{method:'OPTIONS'});assert.equal(opt.status,204);assert.equal(opt.headers.get('access-control-allow-origin'),'*');assert(opt.headers.get('access-control-allow-methods').includes('POST'));assert(opt.headers.get('access-control-allow-headers').includes('Content-Type'));ok('OPTIONS / CORS untuk POST JSON dan multipart');
  const exposed=original.r.headers.get('access-control-expose-headers');for(const h of ['Content-Disposition','X-SSGC-Source','X-SSGC-Width','X-SSGC-Height','X-SSGC-Description-Length','X-SSGC-Description-Shown','X-SSGC-Description-Limit','X-SSGC-Truncated','X-SSGC-Error-Code'])assert(exposed.includes(h));ok('Semua metadata gambar/pemotongan terekspos lintas origin');
  console.log('TOTAL '+total+' PASS');
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;});
