// IQC4 — WhatsApp iOS reaction + context menu, based on the supplied photo.
const fs = require('node:fs');
const path = require('node:path');
const { imageSize } = require('image-size');
const { errorCode } = require('../src/services/iqc-runtime');
const iqc = require('./iqc');

const DEFAULTS = Object.freeze({
  message: 'note: ga ada yang namanya manusia gagal', mode: 'light',
  time: '20.15', statusTime: '07.54', reaction: '❤️',
  star: true, menu: true, reactions: true, battery: 90, network: '4G', language: 'en'
});
const REACTIONS = {'❤':'❤️','❤️':'❤️','heart':'❤️','like':'👍','👍':'👍','haha':'😂','😂':'😂','wow':'😮','😮':'😮','😯':'😮','sad':'😢','😢':'😢','😭':'😢','pray':'🙏','🙏':'🙏','none':'none','0':'none'};
let template, reference;
const cache = new Map(), inflight = new Map();
function asset(filename) {
  for (const candidate of [path.join(__dirname,filename),path.join(process.cwd(),'api',filename)]) {
    try { return fs.readFileSync(candidate); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  const e = new Error('Template/asset IQC4 tidak masuk bundle.'); e.code='TEMPLATE_NOT_FOUND'; throw e;
}
function text(value,fallback,limit) {
  const v=String(value??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,limit);
  return v||fallback;
}
function clock(value,fallback) {
  const v=String(value||'').replace(':','.');
  return /^(?:[01]?\d|2[0-3])\.[0-5]\d$/.test(v)?v.padStart(5,'0'):fallback;
}
function boolean(value,fallback) {
  if(value===null)return fallback;
  return ['0','false','no','off'].includes(value.toLowerCase())?false:['1','true','yes','on'].includes(value.toLowerCase())?true:fallback;
}
function parameters(req) {
  const q=new URL(req.url,'http://iqc.local').searchParams;
  const batt=Number(q.get('battery')??q.get('baterai')??DEFAULTS.battery);
  let network=String(q.get('network')||DEFAULTS.network).toUpperCase();
  if(network==='WI-FI')network='WIFI';
  const p={
    message:text(q.get('pesan')??q.get('message')??q.get('text'),DEFAULTS.message,1000),
    mode:q.get('mode')==='dark'?'dark':'light',
    time:clock(q.get('time')??q.get('waktu'),DEFAULTS.time),
    statusTime:clock(q.get('statusTime')??q.get('status_time')??q.get('jam'),DEFAULTS.statusTime),
    reaction:REACTIONS[q.get('reaction')??q.get('emoji')??q.get('reaksi')]||DEFAULTS.reaction,
    star:boolean(q.get('star'),DEFAULTS.star),menu:boolean(q.get('menu'),DEFAULTS.menu),
    reactions:boolean(q.get('reactions'),DEFAULTS.reactions),
    battery:Number.isFinite(batt)?Math.max(0,Math.min(100,Math.round(batt))):DEFAULTS.battery,
    network:['4G','5G','LTE','3G','WIFI'].includes(network)?network:DEFAULTS.network,
    language:(q.get('lang')||q.get('language'))==='id'?'id':'en'
  };
  p.reference=Object.entries(DEFAULTS).every(([k,v])=>p[k]===v);
  return {p,html:q.get('html')==='1'};
}
function buildHtml(p) {
  template ||= asset('_template4.html').toString('utf8');
  const json=JSON.stringify(p).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return template.replace('__IQC4_DATA__',()=>json);
}
async function image(p) {
  if(p.reference)return reference ||= asset('iqc4-assets/reference.jpg');
  const key=JSON.stringify(p);if(cache.has(key))return cache.get(key);if(inflight.has(key))return inflight.get(key);
  const pending=iqc.renderImage(buildHtml(p),{width:555,height:1200,scale:1,fullPage:true,variant:4,quality:96})
    .then(result=>{const buffer=Buffer.from(result);cache.set(key,buffer);if(cache.size>12)cache.delete(cache.keys().next().value);return buffer;})
    .finally(()=>inflight.delete(key));
  inflight.set(key,pending);return pending;
}
module.exports=async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers','X-IQC-Renderer, X-IQC-Variant, X-IQC-Source, X-IQC-Width, X-IQC-Height, X-IQC-Error-Code');
  res.setHeader('X-IQC-Variant','4');res.setHeader('X-IQC-Renderer','chromium-153-node24');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
  if(req.method&&!['GET','HEAD'].includes(req.method)){
    res.statusCode=405;res.setHeader('Allow','GET, HEAD, OPTIONS');res.setHeader('X-IQC-Error-Code','METHOD_NOT_ALLOWED');
    res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({status:'error',code:405,message:'IQC4 menggunakan GET'}));return;
  }
  try {
    const {p,html}=parameters(req);
    if(html){const result=buildHtml(p);res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.method==='HEAD'?undefined:result);return;}
    let result;try{result=await image(p);}catch(_){result=await image(p);}
    const size=imageSize(result);res.setHeader('X-IQC-Width',String(size.width));res.setHeader('X-IQC-Height',String(size.height));
    res.setHeader('X-IQC-Source',p.reference?'reference-photo':'dynamic-render');
    res.setHeader('Content-Type','image/jpeg');res.setHeader('Content-Length',String(result.length));
    res.setHeader('Content-Disposition','inline; filename="iqc4.jpg"');
    res.statusCode=200;res.end(req.method==='HEAD'?undefined:result);
  } catch(e) {
    console.error('[iqc4]',errorCode(e),e.stack);res.statusCode=500;
    res.setHeader('X-IQC-Error-Code',errorCode(e));res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(JSON.stringify({status:'error',code:500,message:'Gagal membuat IQC4',error:errorCode(e)}));
  }
};
