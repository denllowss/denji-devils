const { Readable } = require('node:stream');
const Busboy = require('busboy');
const processor = require('../src/services/lowquality');
const { errorCode } = require('../src/services/iqc-runtime');
const MAX_BODY=4400000;
function jsonError(res, error) {
  const status=error.status||500;
  const code=error.code||errorCode(error)||'PROCESSING_FAILED';
  if(status>=500)console.error('[lowquality]',code,error.stack);
  res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Lowquality-Error-Code',code);
  res.end(JSON.stringify({status:'error',code:status,error:code,message:error.status?error.message:'Gagal memproses gambar.'}));
}
async function raw(req) {
  if(Buffer.isBuffer(req.body))return req.body;
  if(typeof req.body==='string')return Buffer.from(req.body);
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>MAX_BODY)throw processor.fail('IMAGE_TOO_LARGE','Request maksimum 4.4 MB; upload gambar maksimum 3 MB.',413);chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function multipart(req) {
  return new Promise((resolve,reject)=>{
    let parser;
    try {parser=Busboy({headers:req.headers,limits:{fileSize:processor.UPLOAD_LIMIT,files:1,fields:12,fieldSize:4096,parts:14}});}
    catch(_){reject(processor.fail('INVALID_BODY','Multipart upload tidak valid.'));return;}
    let problem,image;const fields={};
    parser.on('field',(name,value,info)=>{if(info.valueTruncated)problem=processor.fail('INVALID_BODY','Field multipart terlalu panjang.');fields[name]=value;});
    parser.on('file',(name,file)=>{
      if(!['image','file'].includes(name)){problem=processor.fail('INVALID_BODY','Nama field file harus image.');file.resume();return;}
      const chunks=[];
      file.on('data',c=>chunks.push(c));
      file.on('limit',()=>{problem=processor.fail('IMAGE_TOO_LARGE','Upload maksimum 3 MB.',413);});
      file.on('end',()=>{image=Buffer.concat(chunks);});
      file.on('error',reject);
    });
    ['filesLimit','fieldsLimit','partsLimit'].forEach(event=>parser.on(event,()=>{problem=processor.fail('INVALID_BODY','Maksimum satu file dan 12 field multipart.');}));
    parser.on('error',()=>reject(processor.fail('INVALID_BODY','Multipart upload tidak lengkap/valid.')));
    parser.on('close',()=>problem?reject(problem):resolve({fields,image}));
    if(Buffer.isBuffer(req.body)||typeof req.body==='string')Readable.from(Buffer.isBuffer(req.body)?req.body:Buffer.from(req.body)).pipe(parser);
    else req.pipe(parser);
  });
}
async function input(req) {
  let fields={},image;
  const type=(req.headers['content-type']||'').toLowerCase();
  if(req.method==='POST'){
    if(type.startsWith('multipart/form-data'))({fields,image}=await multipart(req));
    else if(type.startsWith('application/json')){
      if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))fields=req.body;
      else {try{fields=JSON.parse((await raw(req)).toString('utf8'));}catch(e){if(e.status)throw e;throw processor.fail('INVALID_BODY','JSON body tidak valid.');}}
      if(!fields||Array.isArray(fields)||typeof fields!=='object')throw processor.fail('INVALID_BODY','JSON harus berupa object.');
      if(fields.image!==undefined||fields.base64!==undefined)image=processor.decodeBase64(fields.image??fields.base64);
    }else if(type.startsWith('image/'))image=await raw(req);
    else throw processor.fail('UNSUPPORTED_BODY','POST mendukung multipart/form-data, application/json, atau image/*.',415);
  }
  if(image&&image.length>processor.UPLOAD_LIMIT)throw processor.fail('IMAGE_TOO_LARGE','Upload maksimum 3 MB.',413);
  const q=Object.fromEntries(new URL(req.url,'http://lowquality.local').searchParams);
  const values={...fields,...q};
  if(image&&values.url)throw processor.fail('AMBIGUOUS_INPUT','Pilih satu input: url atau upload/base64 gambar.');
  if(!image&&!values.url)throw processor.fail('IMAGE_REQUIRED','Masukkan url gambar atau upload image.');
  const options=processor.settings(values);
  if(!image)image=await processor.downloadImage(values.url);
  return {image,options,source:values.url?'url':'upload'};
}
module.exports=async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Expose-Headers','X-Lowquality-Iterations, X-Lowquality-Quality, X-Lowquality-Resolution, X-Lowquality-Width, X-Lowquality-Height, X-Lowquality-Source, X-Lowquality-Input-Bytes, X-Lowquality-Output-Bytes, X-Lowquality-Error-Code');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
  if(!['GET','POST','HEAD'].includes(req.method)){res.setHeader('Allow','GET, POST, HEAD, OPTIONS');jsonError(res,processor.fail('METHOD_NOT_ALLOWED','Gunakan GET atau POST.',405));return;}
  try{
    const {image,options,source}=await input(req);
    const result=await processor.fry(image,options);
    res.setHeader('Content-Type',result.mime);res.setHeader('Content-Length',String(result.buffer.length));
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/bmp':'bmp'}[result.mime]||'jpg';
    res.setHeader('Content-Disposition',`inline; filename="lowquality.${extension}"`);
    for(const [name,value] of Object.entries({Iterations:options.iterations,Quality:options.quality,Resolution:options.resolution,Width:result.width,Height:result.height,Source:source,'Input-Bytes':image.length,'Output-Bytes':result.buffer.length}))res.setHeader('X-Lowquality-'+name,String(value));
    res.statusCode=200;res.end(req.method==='HEAD'?undefined:result.buffer);
  }catch(error){jsonError(res,error);}
};
