const https = require('https');
const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  rejectUnauthorized: false,
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

function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const s = url.toLowerCase();
  if (s.includes('.mp3') || s.includes('audio_mpeg') || s.includes('mime_type=audio') || s.includes('/music/')) return false;
  return s.includes('.mp4') || s.includes('.mov') || s.includes('.m3u8') || s.includes('mime_type=video') || s.includes('/video/');
}

async function resolveTikTokUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^https?:\/\/(vt|vm|t|www\.vt|www\.vm)\.tiktok\.com\//i.test(url) || url.includes('/t/')) {
    try {
      const res = await client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        },
        maxRedirects: 10,
        timeout: 4500,
        validateStatus: (s) => s >= 200 && s < 400
      });
      return res.request?.res?.responseUrl || res.headers?.location || url;
    } catch (e) {
      return url;
    }
  }
  return url;
}

function isPhotoUrl(url) {
  const str = String(url || '').toLowerCase();
  return str.includes('/photo/') || str.includes('/photomode/') || str.includes('/live_photo');
}

function isVideoUrl(url) {
  const str = String(url || '').toLowerCase();
  return str.includes('/video/');
}

async function scrapeTikWM(tiktokUrl) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`;
  const res = await client.get(apiUrl, { timeout: 4500, headers: DEFAULT_HEADERS });
  const data = res.data?.data;

  if (!data) {
    throw new Error('Data tidak ditemukan di TikWM');
  }

  const hasImages = Array.isArray(data.images) && data.images.length > 0;
  const rawVideo = data.hdplay || data.play;
  const hasRealVideo = isValidVideoUrl(rawVideo);
  const explicitPhoto = isPhotoUrl(tiktokUrl);

  let type = 'video';
  if (hasImages && hasRealVideo) {
    type = 'live_photo';
  } else if (explicitPhoto || (hasImages && !hasRealVideo)) {
    type = 'image';
  } else if (hasRealVideo) {
    type = 'video';
  }

  const mediaList = [];
  if (hasImages) {
    data.images.forEach((img, idx) => {
      mediaList.push({
        type: 'image',
        index: idx + 1,
        url: img,
        thumbnail: img,
        download: img
      });
    });
  }
  if (hasRealVideo) {
    mediaList.push({
      type: 'video',
      url: rawVideo,
      thumbnail: data.cover || data.origin_cover || null,
      download: rawVideo
    });
  }

  const realAudio = data.music || data.music_info?.play || null;

  return {
    source: 'tikwm',
    type: type,
    id: data.id || null,
    title: data.title || '',
    cover: data.cover || data.origin_cover || (data.images?.[0] || null),
    duration: data.duration || null,
    author: {
      id: data.author?.id || null,
      name: data.author?.nickname || 'TikTok Creator',
      username: data.author?.unique_id ? `@${data.author.unique_id}` : '@tiktok',
      avatar: data.author?.avatar || ''
    },
    downloads: {
      video: hasRealVideo ? rawVideo : null,
      video_hd: hasRealVideo ? rawVideo : null,
      video_watermark: isValidVideoUrl(data.wmplay) ? data.wmplay : null,
      audio: realAudio,
      photos: hasImages ? data.images : undefined,
      media: mediaList
    },
    stats: {
      likes: data.digg_count || 0,
      comments: data.comment_count || 0,
      shares: data.share_count || 0,
      views: data.play_count || 0,
      downloads: data.download_count || 0
    }
  };
}

async function scrapeLoveTik(tiktokUrl) {
  const res = await client.post(
    'https://lovetik.com/api/ajax/search',
    new URLSearchParams({ query: tiktokUrl }).toString(),
    {
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://lovetik.com/',
        'Origin': 'https://lovetik.com'
      },
      timeout: 4500
    }
  );

  const data = res.data;
  if (!data || data.status !== 'ok') {
    throw new Error(data?.mess || 'Gagal memproses LoveTik');
  }

  let videoSd = null;
  let videoHd = null;
  let audio = null;

  (data.links || []).forEach((link) => {
    if (link.t === 'mp4' && !videoSd && isValidVideoUrl(link.a)) {
      videoSd = link.a;
    }
    if (link.t === 'hd' && !videoHd && isValidVideoUrl(link.a)) {
      videoHd = link.a;
    }
    if (link.t === 'mp3' && !audio) {
      audio = link.a;
    }
  });

  const rawPhotos = Array.isArray(data.images) ? data.images : [];
  const explicitPhoto = isPhotoUrl(tiktokUrl);
  const hasRealVideo = !!(videoSd || videoHd);

  let type = 'video';
  if (rawPhotos.length > 0 && hasRealVideo) {
    type = 'live_photo';
  } else if (explicitPhoto || (rawPhotos.length > 0 && !hasRealVideo)) {
    type = 'image';
  } else if (hasRealVideo) {
    type = 'video';
  }

  const mediaList = [];
  if (rawPhotos.length > 0) {
    rawPhotos.forEach((imgUrl, idx) => {
      mediaList.push({
        type: 'image',
        index: idx + 1,
        url: imgUrl,
        thumbnail: imgUrl,
        download: imgUrl
      });
    });
  }
  if (hasRealVideo) {
    const vUrl = videoHd || videoSd;
    mediaList.push({
      type: 'video',
      url: vUrl,
      thumbnail: data.cover || null,
      download: vUrl
    });
  }

  return {
    source: 'lovetik.com',
    type: type,
    id: data.vid || null,
    title: data.desc || '',
    cover: data.cover || (rawPhotos[0] || null),
    author: {
      name: data.author || 'TikTok Creator',
      username: data.author ? `@${data.author}` : '@tiktok',
      avatar: data.author_avatar || ''
    },
    downloads: {
      video: hasRealVideo ? (videoHd || videoSd) : null,
      video_hd: hasRealVideo ? (videoHd || videoSd) : null,
      audio: audio || null,
      photos: rawPhotos.length > 0 ? rawPhotos : undefined,
      media: mediaList
    }
  };
}

async function scrapeSSSTik(tiktokUrl) {
  const pageRes = await client.get('https://ssstik.io/id', {
    headers: DEFAULT_HEADERS,
    timeout: 4500
  });

  const html = pageRes.data;
  const ttMatch = html.match(/s_tt\s*=\s*['"]([^'"]+)['"]/);
  const furlMatch = html.match(/s_furl\s*=\s*['"]([^'"]+)['"]/);

  if (!ttMatch) {
    throw new Error('Gagal mendapatkan token ssstik.io');
  }

  const tt = ttMatch[1];
  const furl = furlMatch ? furlMatch[1] : 'abc';

  const postHeaders = {
    ...DEFAULT_HEADERS,
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'HX-Current-URL': 'https://ssstik.io/id',
    'HX-Request': 'true',
    'HX-Target': 'target',
    'HX-Trigger': '_gcaptcha_pt',
    'Origin': 'https://ssstik.io',
    'Referer': 'https://ssstik.io/id',
    'Cookie': pageRes.headers['set-cookie'] ? pageRes.headers['set-cookie'].join('; ') : ''
  };

  const payload = new URLSearchParams({
    id: tiktokUrl,
    locale: 'id',
    tt: tt
  }).toString();

  const postRes = await client.post(`https://ssstik.io/${furl}?url=dl`, payload, {
    headers: postHeaders,
    timeout: 5000
  });

  const $ = cheerio.load(postRes.data);

  const authorName = $('h2').text().trim() || $('.result_author').attr('alt') || 'TikTok Creator';
  const authorAvatar = $('.result_author').attr('src') || '';
  const title = $('.maintext').text().trim() || $('p').first().text().trim() || '';

  const rawSdLink = $('a.without_watermark').attr('href') || '';
  const sdLink = isValidVideoUrl(rawSdLink) ? rawSdLink : '';
  const audioLink = $('a.music').attr('href') || '';

  let hdLink = '';
  const hdBtn = $('#hd_download, a.without_watermark_hd');
  const ttInput = $('input[name="tt"]');

  if (hdBtn.length && hdBtn.attr('data-directurl')) {
    const directUrl = hdBtn.attr('data-directurl');
    const tokenVal = ttInput.val() || tt;
    try {
      const hdRes = await client.post(`https://ssstik.io${directUrl}`, new URLSearchParams({ tt: tokenVal }).toString(), {
        headers: {
          ...postHeaders,
          'HX-Trigger': 'hd_download',
          'HX-Target': 'hd_download'
        },
        timeout: 4000,
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400
      });

      if (hdRes.headers['hx-redirect']) {
        const h = hdRes.headers['hx-redirect'];
        if (isValidVideoUrl(h)) hdLink = h;
      } else if (hdRes.headers['location']) {
        const l = hdRes.headers['location'];
        if (isValidVideoUrl(l)) hdLink = l;
      } else if (hdRes.data && typeof hdRes.data === 'string') {
        const $$ = cheerio.load(hdRes.data);
        const parsed = $$('a').attr('href') || '';
        if (isValidVideoUrl(parsed)) hdLink = parsed;
      }
    } catch (e) {}
  }

  const photos = [];
  $('.splide__slide img, ul.splide__list img').each((_, el) => {
    const imgSrc = $(el).attr('data-splide-lazy') || $(el).attr('src');
    if (imgSrc && imgSrc.includes('tikcdn.io') && !photos.includes(imgSrc)) {
      photos.push(imgSrc);
    }
  });

  const overlayStyle = $('style').text() || '';
  const bgMatch = overlayStyle.match(/url\(([^)]+)\)/);
  const cover = bgMatch ? bgMatch[1] : (photos[0] || null);

  const explicitPhoto = isPhotoUrl(tiktokUrl);
  const hasRealVideo = !!(sdLink || hdLink);

  let type = 'video';
  if (photos.length > 0 && hasRealVideo) {
    type = 'live_photo';
  } else if (explicitPhoto || (photos.length > 0 && !hasRealVideo)) {
    type = 'image';
  } else if (hasRealVideo) {
    type = 'video';
  }

  const mediaList = [];
  if (photos.length > 0) {
    photos.forEach((pUrl, idx) => {
      mediaList.push({
        type: 'image',
        index: idx + 1,
        url: pUrl,
        thumbnail: pUrl,
        download: pUrl
      });
    });
  }
  if (hasRealVideo) {
    const vUrl = hdLink || sdLink;
    mediaList.push({
      type: 'video',
      url: vUrl,
      thumbnail: cover,
      download: vUrl
    });
  }

  return {
    source: 'ssstik.io',
    type: type,
    title: title,
    cover: cover || null,
    author: {
      name: authorName,
      username: '@tiktok',
      avatar: authorAvatar
    },
    downloads: {
      video: hasRealVideo ? (hdLink || sdLink) : null,
      video_hd: hasRealVideo ? (hdLink || sdLink) : null,
      audio: audioLink || null,
      photos: photos.length > 0 ? photos : undefined,
      media: mediaList
    }
  };
}

async function downloadTikTok(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Parameter URL TikTok diperlukan');
  }

  const resolved = await resolveTikTokUrl(rawUrl);

  try {
    const tikRes = await scrapeTikWM(resolved);
    if (tikRes.downloads.video || (Array.isArray(tikRes.downloads.photos) && tikRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'tiktok',
        source: tikRes.source,
        type: tikRes.type,
        id: tikRes.id,
        title: tikRes.title,
        cover: tikRes.cover,
        duration: tikRes.duration,
        author: tikRes.author,
        downloads: tikRes.downloads,
        stats: tikRes.stats
      };
    }
  } catch (e) {}

  try {
    const loveRes = await scrapeLoveTik(resolved);
    if (loveRes.downloads?.video || loveRes.downloads?.video_hd || (Array.isArray(loveRes.downloads?.photos) && loveRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'tiktok',
        source: loveRes.source,
        type: loveRes.type,
        id: loveRes.id,
        title: loveRes.title,
        cover: loveRes.cover,
        author: loveRes.author,
        downloads: loveRes.downloads
      };
    }
  } catch (e) {}

  try {
    const sssRes = await scrapeSSSTik(resolved);
    if (sssRes.downloads.video || (Array.isArray(sssRes.downloads.photos) && sssRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'tiktok',
        source: sssRes.source,
        type: sssRes.type,
        title: sssRes.title,
        cover: sssRes.cover,
        author: sssRes.author,
        downloads: sssRes.downloads
      };
    }
  } catch (e) {}

  throw new Error('Tidak dapat mengunduh media dari TikTok. Pastikan video atau postingan bersifat publik.');
}

module.exports = {
  isValidVideoUrl,
  resolveTikTokUrl,
  isPhotoUrl,
  isVideoUrl,
  scrapeTikWM,
  scrapeSSSTik,
  scrapeLoveTik,
  downloadTikTok
};
