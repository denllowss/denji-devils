const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
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

async function scrapeSnapInsta(igUrl) {
  const cleanUrl = normalizeInstagramUrl(igUrl);
  const verifyRes = await axios.post(
    'https://snapinsta.to/api/userverify',
    new URLSearchParams({ url: cleanUrl }).toString(),
    {
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://snapinsta.to/en46',
        'Origin': 'https://snapinsta.to'
      },
      timeout: 10000,
      validateStatus: (s) => s >= 200 && s < 500
    }
  );

  const token = verifyRes.data?.token;
  if (!token) {
    throw new Error('Snapinsta token verification failed');
  }

  const searchRes = await axios.post(
    'https://snapinsta.to/api/ajaxSearch',
    new URLSearchParams({
      q: cleanUrl,
      t: 'media',
      lang: 'en',
      v: 'v2',
      cftoken: token
    }).toString(),
    {
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': 'https://snapinsta.to/en46',
        'Origin': 'https://snapinsta.to',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    }
  );

  const resData = searchRes.data;
  if (!resData || resData.status !== 'ok' || !resData.data) {
    throw new Error(resData?.mess || 'Snapinsta search failed');
  }

  const $ = cheerio.load(resData.data);
  const mediaList = [];
  const videoList = [];
  const imageList = [];
  let cover = null;

  $('.download-box, .media-box, .row > div').each((_, el) => {
    const item = $(el);
    const downloadHref = item.find('a.btn-download, a.abutton, a[href*="download"], .download-bottom a').attr('href');
    const thumb = item.find('img').attr('src') || item.find('img').attr('data-src');

    if (downloadHref) {
      if (!cover && thumb) cover = thumb;
      const isVid = downloadHref.includes('.mp4') || downloadHref.includes('dl.snapinsta') || item.find('.icon-video').length > 0;
      if (isVid) {
        videoList.push(downloadHref);
        mediaList.push({ type: 'video', url: downloadHref, thumbnail: thumb || null });
      } else {
        imageList.push(downloadHref);
        mediaList.push({ type: 'image', url: downloadHref });
      }
    }
  });

  if (mediaList.length === 0) {
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.startsWith('http') || href.startsWith('/'))) {
        const fullHref = href.startsWith('/') ? `https://snapinsta.to${href}` : href;
        if (fullHref.includes('.mp4')) {
          videoList.push(fullHref);
          mediaList.push({ type: 'video', url: fullHref });
        } else if (fullHref.includes('.jpg') || fullHref.includes('.jpeg') || fullHref.includes('.png')) {
          imageList.push(fullHref);
          mediaList.push({ type: 'image', url: fullHref });
        }
      }
    });
  }

  if (mediaList.length === 0) {
    throw new Error('No media extracted from Snapinsta');
  }

  const isCarousel = mediaList.length > 1;
  let type = 'video';
  if (imageList.length > 0 && videoList.length === 0) {
    type = isCarousel ? 'carousel' : 'image';
  } else if (isCarousel) {
    type = 'carousel';
  }

  return {
    source: 'snapinsta.to',
    type: type,
    cover: cover,
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
  const res = await axios.get(`https://api.videodropper.app/${endpoint}`, {
    headers: {
      'url': enc,
      'User-Agent': DEFAULT_HEADERS['User-Agent'],
      'Referer': 'https://videodropper.app/',
      'Origin': 'https://videodropper.app'
    },
    timeout: 15000
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

  const isCarousel = mediaList.length > 1;
  let type = 'video';
  if (imageList.length > 0 && videoList.length === 0) {
    type = isCarousel ? 'carousel' : 'image';
  } else if (isCarousel) {
    type = 'carousel';
  }

  return {
    source: 'videodropper.app',
    type: type,
    cover: cover,
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

  try {
    const vdRes = await scrapeVideoDropper(cleanUrl, 'allinone');
    if (vdRes.downloads.video || (vdRes.downloads.photos && vdRes.downloads.photos.length > 0) || (vdRes.downloads.media && vdRes.downloads.media.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'instagram',
        source: vdRes.source,
        type: vdRes.type,
        cover: vdRes.cover,
        downloads: vdRes.downloads
      };
    }
  } catch (e) {}

  try {
    const snapRes = await scrapeSnapInsta(cleanUrl);
    if (snapRes.downloads.video || (snapRes.downloads.photos && snapRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'instagram',
        source: snapRes.source,
        type: snapRes.type,
        cover: snapRes.cover,
        downloads: snapRes.downloads
      };
    }
  } catch (e) {}

  try {
    const photoRes = await scrapeVideoDropper(cleanUrl, 'photo');
    if (photoRes.downloads.photos && photoRes.downloads.photos.length > 0) {
      return {
        status: 'success',
        code: 200,
        platform: 'instagram',
        source: photoRes.source,
        type: photoRes.type,
        cover: photoRes.cover,
        downloads: photoRes.downloads
      };
    }
  } catch (e) {}

  throw new Error('Tidak dapat mengunduh media dari Instagram. Pastikan postingan bersifat publik.');
}

module.exports = {
  normalizeInstagramUrl,
  scrapeVideoDropper,
  scrapeSnapInsta,
  downloadInstagram
};
