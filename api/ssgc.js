// SSGC — WhatsApp group-info, based on the supplied 739×1600 JPEG.
const exposedHeaders = require('../src/shared/ssgc-header-reference.json').map(([name])=>name).filter(name=>!name.startsWith('Access-Control-')).join(', ');
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const Busboy = require("busboy");
const { imageSize } = require("image-size");
const iqc = require("./iqc");
const imageInput = require("../src/services/lowquality");
const { errorCode } = require("../src/services/iqc-runtime");
const DEFAULTS = Object.freeze({
  name:'VOXEN FIGHTER', description:'WELCOME TO—VOXEN FIGHTER\n#VOXEN ANTI-DIMMING...',
  limit:44, full:false, members:126, titleFont:'serif'
});
const ALIASES={name:['name','nama','groupName','group'],description:['description','deskripsi','desc'],profile:['profile','avatar','pp'],limit:['limit','batas','descriptionLimit'],full:['full','fullDescription'],members:['members','anggota'],titleFont:['titleFont','font']};
function canonical(source){const out={...source};for(const[key,names]of Object.entries(ALIASES)){const found=names.find(n=>source[n]!=null);if(found)out[key]=source[found];}return out;}
const graphemes = value => [...new Intl.Segmenter('id',{granularity:'grapheme'}).segment(String(value))].map(x=>x.segment);
function descriptionState(p){const all=graphemes(p.description),truncated=!p.full&&p.limit>0&&all.length>p.limit;return {length:all.length,shown:truncated?p.limit:all.length,truncated,visible:(truncated?all.slice(0,p.limit):all).join('')};}
const PROFILE_LIMIT = 2 * 1024 * 1024;
let template, reference;
const cache = new Map(),
  inflight = new Map();
function asset(file) {
  for (const p of [
    path.join(__dirname, file),
    path.join(process.cwd(), "api", file),
  ]) {
    try {
      return fs.readFileSync(p);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  const e = new Error("Asset SSGC tidak masuk bundle.");
  e.code = "TEMPLATE_NOT_FOUND";
  throw e;
}
function text(value,fallback,limit){const clean=String(value??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();return graphemes(clean).slice(0,limit).join('')||fallback;}
function bool(value, def) {
  return value == null
    ? def
    : ["0", "false", "off", "no"].includes(String(value).toLowerCase())
      ? false
      : ["1", "true", "on", "yes"].includes(String(value).toLowerCase())
        ? true
        : def;
}
async function raw(req) {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > 3000000)
      throw imageInput.fail(
        "PROFILE_TOO_LARGE",
        "Request profil maksimum 3 MB.",
        413,
      );
    return req.body;
  }
  if (typeof req.body === "string") return raw({ body: Buffer.from(req.body) });
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 3000000)
      throw imageInput.fail(
        "PROFILE_TOO_LARGE",
        "Request profil maksimum 3 MB.",
        413,
      );
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
async function multipart(req) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({
        headers: req.headers,
        limits: {
          files: 1,
          fileSize: PROFILE_LIMIT,
          fields: 20,
          fieldSize: 8192,
          parts: 22,
        },
      });
    } catch (_) {
      reject(imageInput.fail("INVALID_BODY", "Multipart profil tidak valid."));
      return;
    }
    let problem, upload;
    const fields = {};
    parser.on("field", (name, v, info) => {
      if (info.valueTruncated)
        problem = imageInput.fail(
          "INVALID_BODY",
          "Field multipart terlalu panjang.",
        );
      fields[name] = v;
    });
    parser.on("file", (name, file) => {
      if (!["profile", "avatar", "image"].includes(name)) {
        problem = imageInput.fail(
          "INVALID_BODY",
          "File memakai field profile.",
        );
        file.resume();
        return;
      }
      const chunks = [];
      file.on("data", (c) => chunks.push(c));
      file.on("limit", () => {
        problem = imageInput.fail(
          "PROFILE_TOO_LARGE",
          "Foto profil maksimum 2 MB.",
          413,
        );
      });
      file.on("end", () => {
        upload = Buffer.concat(chunks);
      });
      file.on("error", reject);
    });
    ["filesLimit", "fieldsLimit", "partsLimit"].forEach((event) =>
      parser.on(event, () => {
        problem = imageInput.fail(
          "INVALID_BODY",
          "Maksimum satu file dan 20 field.",
        );
      }),
    );
    parser.on("error", () =>
      reject(imageInput.fail("INVALID_BODY", "Multipart tidak lengkap.")),
    );
    parser.on("close", () =>
      problem ? reject(problem) : resolve({ fields, upload }),
    );
    if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
      const b = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      if (b.length > 3000000) {
        reject(
          imageInput.fail(
            "PROFILE_TOO_LARGE",
            "Request profil maksimum 3 MB.",
            413,
          ),
        );
        parser.destroy();
        return;
      }
      Readable.from(b).pipe(parser);
    } else req.pipe(parser);
  });
}
async function input(req) {
  let fields = {},
    upload;
  if (req.method === "POST") {
    if(Number(req.headers["content-length"])>3000000)throw imageInput.fail("PROFILE_TOO_LARGE","Request maksimum 3 MB.",413);
    const type = String(req.headers["content-type"] || "").toLowerCase();
    if (type.startsWith("multipart/form-data"))
      ({ fields, upload } = await multipart(req));
    else if (type.startsWith("application/json")) {
      // Vercel parses JSON lazily: reading req.body can itself throw.
      let body;
      try { body = req.body; }
      catch (_) { throw imageInput.fail("INVALID_BODY", "JSON tidak valid."); }
      if (body && typeof body === "object" && !Buffer.isBuffer(body))
        {if(Buffer.byteLength(JSON.stringify(body))>3000000)throw imageInput.fail("PROFILE_TOO_LARGE","Request maksimum 3 MB.",413);fields = body;}
      else {
        try {
          fields = JSON.parse((await raw(req)).toString());
        } catch (e) {
          if (e.status) throw e;
          throw imageInput.fail("INVALID_BODY", "JSON tidak valid.");
        }
      }
      if (!fields || Array.isArray(fields) || typeof fields !== "object")
        throw imageInput.fail("INVALID_BODY", "JSON harus object.");
      if (fields.profileData !== undefined)
        upload = imageInput.decodeBase64(fields.profileData);
    } else if (type.startsWith("image/")) upload = await raw(req);
    else
      throw imageInput.fail(
        "UNSUPPORTED_BODY",
        "POST mendukung multipart, JSON, atau image/*.",
        415,
      );
  }
  const q = Object.fromEntries(
    new URL(req.url, "http://iqc.local").searchParams,
  );
  return { values: { ...canonical(fields), ...canonical(q) }, upload };
}
async function parameters(req){
 const {values:q,upload}=await input(req);
 const integer=(value,def,min,max,label)=>{if(value===undefined||value==='')return def;const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw imageInput.fail('INVALID_PARAMETERS',label+' harus bilangan bulat '+min+'–'+max+'.');return n;};
 const p={name:text(q.name,DEFAULTS.name,64),description:q.description===undefined?DEFAULTS.description:text(q.description,'',2000),limit:integer(q.limit,DEFAULTS.limit,0,2000,'limit'),full:bool(q.full,DEFAULTS.full),members:integer(q.members,DEFAULTS.members,0,999999,'members'),titleFont:q.titleFont==='sans'?'sans':'serif',profileKind:'default',profileData:''};
 if(p.limit===0)p.full=true;
 const profile=String(q.profile??'default').trim();
 if(upload&&!['','default'].includes(profile))throw imageInput.fail('AMBIGUOUS_PROFILE','Pilih URL atau upload profil, bukan keduanya.');
 let buffer=upload;if(['none','0','off'].includes(profile))p.profileKind='none';else if(!buffer&&!['','default'].includes(profile))buffer=await imageInput.downloadImage(profile);
 if(buffer){if(!buffer.length)throw imageInput.fail('INVALID_PROFILE','Foto profil kosong.');if(buffer.length>PROFILE_LIMIT)throw imageInput.fail('PROFILE_TOO_LARGE','Foto profil maksimum 2 MB.',413);const info=imageInput.dimensions(buffer);if(info.width*info.height>4000000)throw imageInput.fail('PROFILE_TOO_LARGE','Foto profil maksimum 4 megapiksel.',413);p.profileKind='image';p.profileData='data:'+info.mime+';base64,'+buffer.toString('base64');}
 p.reference=Object.entries(DEFAULTS).every(([k,v])=>p[k]===v)&&p.profileKind==='default';
 return {p,html:String(q.html)==='1',format:q.format==='png'?'png':'jpg'};
}
function buildHtml(p) {
  template ||= asset("_template-ssgc.html").toString("utf8");
  return template.replace("__SSGC_DATA__", () =>
    JSON.stringify(p)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029"),
  );
}
async function render(p, format) {
  if (p.reference && format === "jpg")
    return (reference ||= asset("ssgc-assets/reference.jpg"));
  const key = crypto
    .createHash("sha256")
    .update(JSON.stringify(p))
    .update(format)
    .digest("hex");
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);
  const task = iqc
    .renderImage(buildHtml(p), {
      width: 739,
      height: 1600,
      scale: 1,
      fullPage: true,
      variant: "ssgc",
      format: format === "png" ? "png" : "jpeg",
      quality: 96,
    })
    .then((result) => {
      const b = Buffer.from(result);
      if (b.length > 4 * 1024 * 1024)
        throw imageInput.fail(
          "OUTPUT_TOO_LARGE",
          "Hasil maksimum 4 MB. Kurangi panjang deskripsi.",
          413,
        );
      cache.set(key, b);
      if (cache.size > 10) cache.delete(cache.keys().next().value);
      return b;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}
module.exports = async (req, res) => {
  try { require('../src/flags/server-helpers').reportFlags(req); } catch {}
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
  res.setHeader("X-SSGC-Variant", "group-info");
  res.setHeader("X-SSGC-Renderer", "chromium-153-node24");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    if (req.method && !["GET", "POST", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, HEAD, OPTIONS");
      throw imageInput.fail(
        "METHOD_NOT_ALLOWED",
        "Gunakan GET atau POST.",
        405,
      );
    }
    const { p, html, format } = await parameters(req);
    const state=descriptionState(p);
    res.setHeader('X-SSGC-Description-Length',String(state.length));
    res.setHeader('X-SSGC-Description-Shown',String(state.shown));
    res.setHeader('X-SSGC-Description-Limit',String(p.full?0:p.limit));
    res.setHeader('X-SSGC-Truncated',state.truncated?'1':'0');
    if (html) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.statusCode = 200;
      res.end(req.method === "HEAD" ? undefined : buildHtml(p));
      return;
    }
    let b;
    try {
      b = await render(p, format);
    } catch (e) {
      if (e.status) throw e;
      b = await render(p, format);
    }
    const info = imageSize(b);
    res.setHeader("X-SSGC-Width", String(info.width));
    res.setHeader("X-SSGC-Height", String(info.height));
    res.setHeader(
      "X-SSGC-Source",
      p.reference
        ? format === "jpg"
          ? "reference-photo"
          : "reference-converted"
        : "dynamic-render",
    );
    res.setHeader(
      "Content-Type",
      format === "png" ? "image/png" : "image/jpeg",
    );
    res.setHeader("Content-Length", String(b.length));
    res.setHeader(
      "Content-Disposition",
      'inline; filename="ssgc.' + format + '"',
    );
    res.statusCode = 200;
    res.end(req.method === "HEAD" ? undefined : b);
  } catch (e) {
    const code = e.status ? e.code : errorCode(e);
    if (!e.status) console.error("[ssgc]", code, e.stack);
    res.statusCode = e.status || 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-SSGC-Error-Code", code);
    res.end(
      JSON.stringify({
        status: "error",
        code: res.statusCode,
        error: code,
        message: e.status ? e.message : "Gagal membuat SSGC",
      }),
    );
  }
};
