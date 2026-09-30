const https = require('https');
const http = require('http');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const vm = require('vm');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  timeout: 6000
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  timeout: 6000
});

const client = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 6000
});

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
};

function encryptVideoDropperUrl(url) {
  const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from('qwertyuioplkjhgf', 'utf8'), null);
  let encrypted = cipher.update(url, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function normalizeInstagramUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch (e) {
    return url.split('?')[0].split('#')[0];
  }
}

function extractUsername(url) {
  const str = String(url || '').trim();
  const storyMatch = str.match(/instagram\.com\/stories\/([a-zA-Z0-9_\.]+)/i);
  if (storyMatch && storyMatch[1] && storyMatch[1].toLowerCase() !== 'highlights') {
    return storyMatch[1];
  }
  const directUserMatch = str.match(/instagram\.com\/([a-zA-Z0-9_\.]+)\/(?:p|reel|tv)\//i);
  if (directUserMatch && directUserMatch[1]) {
    return directUserMatch[1];
  }
  const rootUserMatch = str.match(/instagram\.com\/([a-zA-Z0-9_\.]+)\/?(?:[?#]|$)/i);
  if (rootUserMatch && rootUserMatch[1] && !['p', 'reel', 'reels', 'stories', 'tv', 'explore', 'direct', 'accounts'].includes(rootUserMatch[1].toLowerCase())) {
    return rootUserMatch[1];
  }
  return null;
}

async function fetchInstagramOembed(url) {
  try {
    const res = await client.get(`https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`, {
      headers: DEFAULT_HEADERS,
      timeout: 1500
    });
    if (res.status === 200 && res.data) {
      return {
        title: res.data.title || '',
        authorName: res.data.author_name || '',
        thumbnail: res.data.thumbnail_url || null
      };
    }
  } catch (e) {}
  return null;
}

function extractJwtUrl(urlStr) {
  if (!urlStr) return null;
  const tokenMatch = urlStr.match(/token=([a-zA-Z0-9_\-\.]+)/);
  if (tokenMatch) {
    try {
      const payloadStr = Buffer.from(tokenMatch[1].split('.')[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      return payload.url || null;
    } catch (e) {}
  }
  return null;
}

function unpackSnapSave(raw) {
  let result = '';
  const context = {
    eval: (code) => { result = code; },
    window: {},
    document: {}
  };
  vm.createContext(context);
  try {
    vm.runInContext(raw, context);
  } catch (e) {}
  return result;
}

async function scrapeSnapSave(igUrl) {
  const cleanUrl = normalizeInstagramUrl(igUrl);
  const res = await client.post('https://snapsave.app/action.php?lang=id', new URLSearchParams({
    url: cleanUrl
  }).toString(), {
    headers: {
      'User-Agent': DEFAULT_HEADERS['User-Agent'],
      'Referer': 'https://snapsave.app/id',
      'Origin': 'https://snapsave.app',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 4500
  });

  const unpacked = unpackSnapSave(res.data);
  const htmlMatch = unpacked.match(/innerHTML\s*=\s*"((?:[^"\\]|\\.)*)";/);
  if (!htmlMatch) {
    throw new Error('SnapSave unpack failed');
  }

  const html = JSON.parse(`"${htmlMatch[1]}"`);
  const $ = cheerio.load(html);
  const mediaList = [];
  const videoList = [];
  const imageList = [];
  let cover = null;

  $('.download-items, .download-box, .row > div').each((_, el) => {
    const item = $(el);
    const thumbImg = item.find('img').attr('src') || item.find('img').attr('data-src') || '';
    const directThumb = extractJwtUrl(thumbImg) || thumbImg;

    if (!cover && directThumb) cover = directThumb;

    item.find('a').each((__, aEl) => {
      const href = $(aEl).attr('href') || '';
      const text = $(aEl).text().toLowerCase();

      if (!href || href === '/' || href.includes('google') || href.includes('terms') || href.includes('privacy')) return;

      const directCdn = extractJwtUrl(href) || href;
      const isVid = text.includes('video') || directCdn.includes('.mp4') || href.includes('.mp4');
      const isImg = text.includes('foto') || text.includes('photo') || text.includes('gambar') || directCdn.includes('.jpg') || directCdn.includes('.jpeg') || directCdn.includes('.png');

      if (isVid) {
        if (!videoList.includes(directCdn)) {
          videoList.push(directCdn);
          mediaList.push({
            type: 'video',
            url: directCdn,
            thumbnail: directThumb || null,
            download: href
          });
        }
      } else if (isImg && !text.includes('thumbnail')) {
        if (!imageList.includes(directCdn)) {
          imageList.push(directCdn);
          mediaList.push({
            type: 'image',
            url: directCdn,
            download: href
          });
        }
      }
    });
  });

  if (mediaList.length === 0) {
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!href || href === '/' || href.includes('google')) return;
      const direct = extractJwtUrl(href) || href;
      if (direct.includes('.mp4')) {
        videoList.push(direct);
        mediaList.push({ type: 'video', url: direct, download: href });
      } else if (direct.includes('.jpg') || direct.includes('.png') || direct.includes('.jpeg')) {
        imageList.push(direct);
        mediaList.push({ type: 'image', url: direct, download: href });
      }
    });
  }

  const isStory = cleanUrl.includes('/stories/') || cleanUrl.includes('/story/');
  const isCarousel = mediaList.length > 1;
  let type = isStory ? 'story' : 'video';
  if (imageList.length > 0 && videoList.length === 0) {
    type = isStory ? 'story' : (isCarousel ? 'carousel' : 'image');
  }

  let uname = extractUsername(cleanUrl);

  return {
    source: 'snapsave.app',
    type: type,
    title: '',
    cover: cover,
    author: {
      name: uname || 'Instagram Creator',
      username: uname ? `@${uname}` : '@instagram',
      avatar: cover || null
    },
    downloads: {
      video: videoList[0] || null,
      video_hd: videoList[0] || null,
      audio: null,
      photos: imageList.length > 0 ? imageList : undefined,
      media: mediaList
    }
  };
}

async function scrapeVideoDropper(igUrl, endpoint = 'allinone') {
  const cleanUrl = normalizeInstagramUrl(igUrl);
  const enc = encryptVideoDropperUrl(cleanUrl);
  const res = await client.get(`https://api.videodropper.app/${endpoint}`, {
    headers: {
      'url': enc,
      'User-Agent': DEFAULT_HEADERS['User-Agent'],
      'Referer': 'https://videodropper.app/',
      'Origin': 'https://videodropper.app'
    },
    timeout: 5000
  });

  const data = res.data;
  if (!data || data === 'link' || (typeof data === 'string' && data.includes('Invalid'))) {
    throw new Error('VideoDropper could not process media');
  }

  const mediaList = [];
  const videoList = [];
  const imageList = [];
  let cover = null;

  if (Array.isArray(data.video)) {
    data.video.forEach((item) => {
      const vUrl = item.video || item.url;
      const thumb = item.thumbnail || item.poster || null;
      if (vUrl) {
        if (!cover && thumb) cover = thumb;
        videoList.push(vUrl);
        mediaList.push({
          type: 'video',
          url: vUrl,
          thumbnail: thumb,
          download: `https://dl.videodropper.app/?url=${encodeURIComponent(vUrl)}`
        });
      }
    });
  }

  if (Array.isArray(data.image)) {
    data.image.forEach((img) => {
      const imgUrl = typeof img === 'string' ? img : (img.url || img.image);
      if (imgUrl) {
        if (!cover) cover = imgUrl;
        imageList.push(imgUrl);
        mediaList.push({
          type: 'image',
          url: imgUrl,
          download: `https://dl.videodropper.app/?url=${encodeURIComponent(imgUrl)}`
        });
      }
    });
  }

  if (Array.isArray(data.media)) {
    data.media.forEach((m) => {
      const mUrl = m.url || m.video || m.audio || m.image;
      if (mUrl) {
        const isVid = m.type === 'video' || mUrl.includes('.mp4');
        const isAud = m.type === 'audio' || mUrl.includes('.mp3') || m.reels;
        const type = isVid ? 'video' : (isAud ? 'audio' : 'image');
        if (type === 'video') videoList.push(mUrl);
        if (type === 'image') imageList.push(mUrl);
        mediaList.push({
          type: type,
          title: m.title || undefined,
          url: mUrl,
          thumbnail: m.thumbnail || m.poster || null,
          download: `https://dl.videodropper.app/?url=${encodeURIComponent(mUrl)}`
        });
      }
    });
  }

  let audioUrl = null;
  if (videoList.length > 0) {
    audioUrl = `https://mp3.videodropper.app/api?url=${encodeURIComponent(cleanUrl)}`;
  }

  const isStory = cleanUrl.includes('/stories/') || cleanUrl.includes('/story/');
  const isCarousel = mediaList.length > 1;
  let type = isStory ? 'story' : 'video';
  if (imageList.length > 0 && videoList.length === 0) {
    type = isStory ? 'story' : (isCarousel ? 'carousel' : 'image');
  } else if (isCarousel) {
    type = 'carousel';
  }

  let uname = extractUsername(cleanUrl);

  return {
    source: 'videodropper.app',
    type: type,
    title: '',
    cover: cover,
    author: {
      name: uname || 'Instagram Creator',
      username: uname ? `@${uname}` : '@instagram',
      avatar: cover || null
    },
    downloads: {
      video: videoList[0] || null,
      video_hd: videoList[0] || null,
      audio: audioUrl,
      photos: imageList.length > 0 ? imageList : undefined,
      media: mediaList
    }
  };
}

async function downloadInstagram(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Parameter URL Instagram diperlukan');
  }

  const cleanUrl = normalizeInstagramUrl(rawUrl);

  const oembedPromise = fetchInstagramOembed(cleanUrl).catch(() => null);

  let result = null;

  try {
    const snapRes = await scrapeSnapSave(cleanUrl);
    if (snapRes.downloads.video || (Array.isArray(snapRes.downloads.photos) && snapRes.downloads.photos.length > 0) || (Array.isArray(snapRes.downloads.media) && snapRes.downloads.media.length > 0)) {
      result = snapRes;
    }
  } catch (e) {}

  if (!result) {
    try {
      const dropRes = await scrapeVideoDropper(cleanUrl, 'allinone');
      if (dropRes.downloads.video || (Array.isArray(dropRes.downloads.photos) && dropRes.downloads.photos.length > 0) || (Array.isArray(dropRes.downloads.media) && dropRes.downloads.media.length > 0)) {
        result = dropRes;
      }
    } catch (e) {}
  }

  if (!result) {
    throw new Error('Tidak dapat mengunduh media dari Instagram. Pastikan postingan atau reel bersifat publik.');
  }

  try {
    const oembed = await oembedPromise;
    if (oembed) {
      if (oembed.authorName) {
        result.author.name = oembed.authorName;
        result.author.username = `@${oembed.authorName}`;
      }
      if (oembed.title) {
        result.title = oembed.title;
      }
      if (oembed.thumbnail && !result.cover) {
        result.cover = oembed.thumbnail;
        if (!result.author.avatar) result.author.avatar = oembed.thumbnail;
      }
    }
  } catch (e) {}

  return {
    status: 'success',
    code: 200,
    platform: 'instagram',
    source: result.source,
    type: result.type,
    title: result.title || '',
    cover: result.cover || null,
    author: result.author,
    downloads: result.downloads
  };
}

module.exports = {
  normalizeInstagramUrl,
  extractUsername,
  fetchInstagramOembed,
  scrapeSnapSave,
  scrapeVideoDropper,
  downloadInstagram
};
