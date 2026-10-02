const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { imageSize }=require('image-size');
const processor=require('../src/services/lowquality');
const base=(process.env.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const sample=fs.readFileSync(path.join(__dirname,'../public/images/lowquality-demo.png'));
let pass=0;const ok=n=>{pass++;console.log('PASS '+n);};
async function call(route,options={}){return fetch(base+route,{...options,signal:AbortSignal.timeout(70000)});}
async function jpeg(res,label){assert.equal(res.status,200,awaitError);assert.equal(res.headers.get('content-type'),'image/jpeg');const b=Buffer.from(await res.arrayBuffer());const size=imageSize(b);assert(size.width>0&&size.height>0);ok(label+' JPEG '+size.width+'×'+size.height+', '+b.length+' bytes');return b;}
const awaitError='Expected HTTP 200';
(async()=>{
 assert.deepEqual(processor.settings({}),{iterations:25,quality:30,resolution:0.125});ok('default sesuai sumber');
 for(const addr of ['127.0.0.1','0.0.0.0','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','224.0.0.1','2001:db8::1']){assert(!processor.publicIp(addr));}ok('IP internal/reserved diblokir');
 assert(processor.publicIp('8.8.8.8'));assert(processor.publicIp('2606:4700:4700::1111'));ok('IP publik diterima');
 for(const url of ['http://127.1','http://2130706433','http://localhost/image.jpg','http://[::1]/','file:///etc/passwd','http://user:pass@example.com/image','https://example.com:8080/image'])await assert.rejects(processor.validateUrl(url));ok('URL berbahaya ditolak');
 await assert.rejects(processor.validateUrl('https://example.com/image',async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]));ok('DNS mixed/private ditolak');
 const pinned=await processor.validateUrl('https://example.com/image',async()=>[{address:'8.8.8.8',family:4}]);assert.equal(pinned.selected.address,'8.8.8.8');ok('DNS jawaban dipin');
 for(const input of [{iterations:101},{iterations:-1},{quality:0},{quality:true},{resolution:0},{resolution:[]},{iterations:2.3}])assert.throws(()=>processor.settings(input));ok('validasi parameter');
 let form=new FormData();form.append('image',new Blob([sample],{type:'image/png'}),'sample.png');form.append('iterations','25');form.append('quality','30');form.append('resolution','0.125');
 const result=await jpeg(await call('/lowquality',{method:'POST',body:form}),'multipart');assert(imageSize(result).width*imageSize(result).height<=125000);
 await jpeg(await call('/api/lowquality?iterations=1&quality=5',{method:'POST',headers:{'Content-Type':'image/png'},body:sample}),'raw upload alias');
 await jpeg(await call('/lowquality',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:'data:image/png;base64,'+sample.toString('base64'),iterations:2,quality:10})}),'base64 JSON');
 const original=await call('/lowquality?iterations=0',{method:'POST',headers:{'Content-Type':'image/png'},body:sample});assert.equal(original.status,200);assert.equal(original.headers.get('content-type'),'image/png');assert(Buffer.from(await original.arrayBuffer()).equals(sample));ok('iterations=0 identik byte/original MIME');
 const url=await call('/lowquality?'+new URLSearchParams({url:'https://jpeg.wavebeem.com/icon.jpg',iterations:25,quality:30,resolution:0.125}));await jpeg(url,'GET URL publik');
 await jpeg(await call('/lowquality',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://jpeg.wavebeem.com/icon.jpg',iterations:1})}),'POST JSON URL');
 for(const [route,status] of [['/lowquality',400],['/lowquality?url=http://127.0.0.1/',400],['/lowquality?url=http://169.254.169.254/latest/meta-data/',400]]){const r=await call(route);assert.equal(r.status,status);assert((await r.json()).error);}ok('missing source/SSRF errors JSON');
 const bad=await call('/lowquality',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:'not an image'});assert.equal(bad.status,415);ok('gambar invalid ditolak');
 const work=await call('/lowquality?iterations=100&resolution=original',{method:'POST',headers:{'Content-Type':'image/png'},body:fs.readFileSync(path.join(__dirname,'fixtures/lowquality-budget.png'))});assert.equal(work.status,422);assert.equal((await work.json()).error,'WORKLOAD_TOO_LARGE');ok('batas CPU megapiksel-putaran');
 const big=await call('/lowquality',{method:'POST',headers:{'Content-Type':'image/png'},body:Buffer.alloc(3*1024*1024+1)});assert.equal(big.status,413);ok('upload >3 MB ditolak');
 const options=await call('/lowquality',{method:'OPTIONS'});assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'*');ok('preflight CORS');
 const health=await call('/api/health');assert.equal(health.status,200);ok('API lama tetap aktif');
 console.log('TOTAL '+pass+' PASS');
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;});
