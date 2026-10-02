// npm run test:iqc3 (server sudah berjalan), atau BASE_URL=https://... npm run test:iqc3.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = (process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
function dimensions(b) {
  for (let p=2;p<b.length-9;) {
    if (b[p]!==255) {p++;continue;}
    const m=b[p+1];
    if(m===192||m===194) return [b.readUInt16BE(p+7),b.readUInt16BE(p+5)];
    if(m===217||m===218) break;
    if(m===216||m===1||(m>=208&&m<=215)){p+=2;continue;}
    p+=2+b.readUInt16BE(p+2);
  }
  return [];
}
async function image(label, params={}) {
  const r=await fetch(base+'/iqc3?'+new URLSearchParams(params), {signal:AbortSignal.timeout(70000)});
  const data=Buffer.from(await r.arrayBuffer());
  assert.equal(r.status,200,r.headers.get('x-iqc-error-code')||data.toString().slice(0,180));
  assert.equal(r.headers.get('content-type'),'image/jpeg');
  assert.equal(r.headers.get('x-iqc-variant'),'3');
  assert.equal(r.headers.get('access-control-allow-origin'),'*');
  const d=dimensions(data);assert.equal(d[0],736);assert(d[1]>=1308);
  console.log(`PASS ${label} — JPEG ${d.join('×')}, ${data.length} bytes`);
  return {data,dimensions:d,source:r.headers.get('x-iqc-source')};
}
(async()=>{
 const original=await image('Referensi default');
 assert(original.data.equals(fs.readFileSync(path.join(__dirname,'../api/iqc3-assets/reference.jpg'))));
 assert.equal(original.source,'reference-photo');
 console.log('PASS foto default identik byte dengan referensi');
 const gradient=await image('Gradient / musik / artis', {lirik:'Langit sore dan lagu favorit kita.',music:'Blue Hour',artist:'Denji',bg:'gradient',color1:'#2e617b',color2:'#312553'});
 assert.equal(gradient.source,'dynamic-render');
 const solid=await image('Solid', {lirik:'Pesanmu di sini',music:'Our song',artist:'Denji',bg:'solid',color:'1f4260'});
 assert(!solid.data.equals(gradient.data));
 const long=await image('Lirik panjang', {lirik:'Ini adalah lirik panjang yang menyesuaikan tinggi kartu secara otomatis. '.repeat(10),music:'A long song',artist:'Denji'});
 assert(long.dimensions[1]>original.dimensions[1]);
 const alias=await fetch(base+'/api/iqc3');assert.equal(alias.status,200);
 assert(Buffer.from(await alias.arrayBuffer()).equals(original.data));
 const html=await fetch(base+'/iqc3?html=1&'+new URLSearchParams({lirik:'</script><img onerror="window.pwned=1"> $&'}));
 const body=await html.text();assert.equal(html.status,200);assert(body.includes('\\u003c/script>'));
 assert(!body.includes('__IQC3_DATA__'));
 console.log('PASS alias API & escaping template HTML');
 console.log('Semua uji IQC3 lulus.');
})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
