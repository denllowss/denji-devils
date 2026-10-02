// Canvas JPEG pipeline adapted from wavebeem/the-jpeg-zone (MIT).
// Copyright (c) 2016 Sage Fennel. See licenses/the-jpeg-zone-MIT.md.
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const ipaddr = require('ipaddr.js');
const { imageSize } = require('image-size');

const UPLOAD_LIMIT = 3 * 1024 * 1024;
const REMOTE_LIMIT = 8 * 1024 * 1024;
const OUTPUT_LIMIT = 4 * 1024 * 1024;
const PIXEL_LIMIT = 16000000;
const WORK_LIMIT = 100000000;
const MIMES = {jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',bmp:'image/bmp'};
function fail(code, message, status=400) { const e=new Error(message);e.code=code;e.status=status;return e; }
function settings(input={}) {
  const integer=(value,def,min,max,label)=>{
    if(value!==undefined&&value!==null&&!['string','number'].includes(typeof value))throw fail('INVALID_PARAMETERS',`${label} harus berupa angka.`);
    const n=value===undefined||value===null||value===''?def:Number(value);
    if(!Number.isInteger(n)||n<min||n>max)throw fail('INVALID_PARAMETERS',`${label} harus bilangan bulat ${min}–${max}.`);
    return n;
  };
  const iterations=integer(input.iterations??input.count??input.times,25,0,100,'iterations');
  const quality=integer(input.quality,30,1,100,'quality');
  const value=input.resolution??input.size??'0.125';
  if(!['number','string'].includes(typeof value))throw fail('INVALID_PARAMETERS','resolution harus angka atau original.');
  const raw=String(value).toLowerCase();
  let resolution;
  if(['original','infinity'].includes(raw))resolution='original';
  else {resolution=Number(raw);if(!Number.isFinite(resolution)||resolution<0.0625||resolution>4)throw fail('INVALID_PARAMETERS','resolution harus 0.0625–4 megapiksel atau original.');}
  return {iterations,quality,resolution};
}
function dimensions(buffer) {
  let info;
  try {info=imageSize(buffer);} catch (_) {throw fail('INVALID_IMAGE','File bukan gambar raster yang valid.',415);}
  if(!MIMES[info.type])throw fail('UNSUPPORTED_IMAGE','Format didukung: JPEG, PNG, WebP, GIF, AVIF, BMP. SVG tidak didukung.',415);
  if(!info.width||!info.height||info.width>32767||info.height>32767||info.width*info.height>PIXEL_LIMIT)throw fail('IMAGE_TOO_LARGE','Gambar maksimum 16 megapiksel dan 32767 px per sisi.',413);
  return {...info,mime:MIMES[info.type]};
}
function publicIp(address) {
  try {return ipaddr.process(address).range()==='unicast';} catch (_) {return false;}
}
async function validateUrl(value, lookup=dns.lookup.bind(dns)) {
  let url;
  try {url=new URL(value);} catch (_) {throw fail('INVALID_URL','url harus URL gambar HTTP/HTTPS yang valid.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port))throw fail('URL_NOT_ALLOWED','Gunakan URL HTTP/HTTPS publik tanpa kredensial, dengan port standar.');
  const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(!host||host==='localhost'||/\.(localhost|local|internal)$/.test(host)||!host.includes('.')&&!net.isIP(host))throw fail('URL_NOT_ALLOWED','Alamat lokal/internal tidak diizinkan.');
  let addresses;
  if(net.isIP(host))addresses=[{address:host,family:net.isIP(host)}];
  else {
    let timer;
    try {addresses=await Promise.race([lookup(host,{all:true,verbatim:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(fail('IMAGE_FETCH_TIMEOUT','DNS gambar melewati batas waktu.',504)),5000);})]);}catch(e){throw e.status?e:fail('IMAGE_FETCH_FAILED','Host gambar tidak dapat ditemukan.',502);}finally{clearTimeout(timer);}
  }
  if(!addresses.length||addresses.some(item=>!publicIp(item.address)))throw fail('URL_NOT_ALLOWED','Alamat lokal, private, reserved, atau metadata server tidak diizinkan.');
  // Pin the approved DNS answer for the actual connection (anti-rebinding).
  const selected=addresses.find(a=>a.family===4)||addresses[0];
  url.hash='';return {url,selected};
}
async function downloadImage(value) {
  const deadline=Date.now()+20000;
  let target=value;
  for(let redirects=0;redirects<=4;redirects++){
    const {url,selected}=await validateUrl(target);
    if(Date.now()>=deadline)throw fail('IMAGE_FETCH_TIMEOUT','Pengambilan gambar melewati batas waktu.',504);
    const result=await new Promise((resolve,reject)=>{
      const client=url.protocol==='https:'?https:http;
      const request=client.request(url,{
        method:'GET',autoSelectFamily:false,
        lookup:(_host,opts,cb)=>opts?.all?cb(null,[selected]):cb(null,selected.address,selected.family),
        headers:{'User-Agent':'Denji-Lowquality/1.0','Accept':'image/*','Accept-Encoding':'identity'}
      },response=>{
        if([301,302,303,307,308].includes(response.statusCode)){
          const location=response.headers.location;response.destroy();
          if(!location){reject(fail('IMAGE_FETCH_FAILED','Redirect gambar tidak valid.',502));return;}
          try {resolve({redirect:new URL(location,url).href});} catch (_) {reject(fail('IMAGE_FETCH_FAILED','Redirect gambar tidak valid.',502));} return;
        }
        if(response.statusCode!==200){response.destroy();reject(fail('IMAGE_FETCH_FAILED','Server gambar tidak membalas HTTP 200.',502));return;}
        if(Number(response.headers['content-length'])>REMOTE_LIMIT){response.destroy();reject(fail('IMAGE_TOO_LARGE','Gambar URL maksimum 8 MB.',413));return;}
        let size=0;const chunks=[];
        response.on('data',chunk=>{size+=chunk.length;if(size>REMOTE_LIMIT){response.destroy(fail('IMAGE_TOO_LARGE','Gambar URL maksimum 8 MB.',413));return;}chunks.push(chunk);});
        response.on('end',()=>resolve({buffer:Buffer.concat(chunks)}));
        response.on('error',reject);
      });
      const timer=setTimeout(()=>request.destroy(fail('IMAGE_FETCH_TIMEOUT','Pengambilan gambar melewati batas waktu.',504)),Math.max(1,deadline-Date.now()));
      request.on('close',()=>clearTimeout(timer));
      request.on('error',e=>reject(e.status?e:fail('IMAGE_FETCH_FAILED','Gagal mengunduh gambar publik.',502)));
      request.end();
    });
    if(result.buffer)return result.buffer;
    target=result.redirect;
  }
  throw fail('IMAGE_FETCH_FAILED','Terlalu banyak redirect gambar.',502);
}
function decodeBase64(value) {
  let data=String(value||'');const match=data.match(/^data:image\/[-+.\w]+;base64,(.*)$/s);if(match)data=match[1];
  if(data.length>Math.ceil(UPLOAD_LIMIT*4/3)+4)throw fail('IMAGE_TOO_LARGE','Upload/base64 maksimum 3 MB.',413);
  if(!data||!/^[A-Za-z0-9+/]*={0,2}$/.test(data)||data.length%4===1)throw fail('INVALID_IMAGE','image harus base64 gambar atau data URI yang valid.');
  const b=Buffer.from(data,'base64');if(b.length>UPLOAD_LIMIT)throw fail('IMAGE_TOO_LARGE','Upload/base64 maksimum 3 MB.',413);return b;
}
async function fry(buffer, options) {
  const source=dimensions(buffer);
  if(options.iterations===0){if(buffer.length>OUTPUT_LIMIT)throw fail('OUTPUT_TOO_LARGE','Hasil asli terlalu besar. Gunakan iterations > 0 dan resolusi lebih kecil.',413);return {buffer,mime:source.mime,width:source.width,height:source.height,source};}
  const cap=options.resolution==='original'?source.width*source.height:options.resolution*1000000;
  const area=Math.min(source.width*source.height,cap);
  if(area*options.iterations>WORK_LIMIT)throw fail('WORKLOAD_TOO_LARGE','Kurangi iterations atau resolution: batas 100 megapiksel-putaran per request.',422);
  const iqc=require('../../api/iqc');
  const browser=await iqc.withBrowser();
  let page;
  try {
    page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request',request=>/^(data:|about:|blob:)/.test(request.url())?request.continue():request.abort());
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',{waitUntil:'domcontentloaded'});
    const task=page.evaluate(async ({data,iterations,quality,resolution})=>{
      const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('INVALID_IMAGE_DECODE'));img.src=src;});
      let image=await load(data);
      const max=resolution==='original'?Infinity:resolution*1000000;
      const ratio=Math.sqrt(Math.max(1,image.naturalWidth*image.naturalHeight/max));
      const width=Math.max(1,Math.floor(image.naturalWidth/ratio)),height=Math.max(1,Math.floor(image.naturalHeight/ratio));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
      let output;
      for(let i=0;i<iterations;i++){
        ctx.drawImage(image,0,0,width,height);
        // Upstream alternates +0..9 percent to create generational damage.
        output=canvas.toDataURL('image/jpeg',(quality+((i*7)%10))/100);
        image=await load(output);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      return {data:output.slice(output.indexOf(',')+1),width,height};
    },{data:'data:'+source.mime+';base64,'+buffer.toString('base64'),...options});
    let timer;
    const result=await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(fail('PROCESSING_TIMEOUT','Pemrosesan melewati 35 detik. Kurangi iterations/resolution.',504)),35000);})]).finally(()=>clearTimeout(timer));
    const output=Buffer.from(result.data,'base64');
    if(output.length>OUTPUT_LIMIT)throw fail('OUTPUT_TOO_LARGE','Hasil maksimum 4 MB. Kurangi quality atau resolution.',413);
    return {buffer:output,mime:'image/jpeg',width:result.width,height:result.height,source};
  }catch(e){if(e.status)throw e;throw fail('IMAGE_PROCESSING_FAILED','Gambar tidak dapat diproses oleh renderer.',422);}
  finally{if(page)await page.close().catch(()=>{});}
}
module.exports={settings,dimensions,publicIp,validateUrl,downloadImage,decodeBase64,fry,fail,UPLOAD_LIMIT};
