const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
};

async function resolveTikTokUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^https?:\/\/(vt|vm|t)\.tiktok\.com\//i.test(url)) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        },
        maxRedirects: 10,
        timeout: 10000,
        validateStatus: (s) => s >= 200 && s < 400
      });
      return res.request?.res?.responseUrl || url;
    } catch (e) {
      return url;
    }
  }
  return url;
}

async function scrapeSSSTik(tiktokUrl) {
  const pageRes = await axios.get('https://ssstik.io/id', {
    headers: DEFAULT_HEADERS,
    timeout: 15000
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

  const postRes = await axios.post(`https://ssstik.io/${furl}?url=dl`, payload, {
    headers: postHeaders,
    timeout: 20000
  });

  const $ = cheerio.load(postRes.data);

  const authorName = $('h2').text().trim() || $('.result_author').attr('alt') || '';
  const authorAvatar = $('.result_author').attr('src') || '';
  const title = $('.maintext').text().trim() || $('p').first().text().trim() || '';

  const sdLink = $('a.without_watermark').attr('href') || '';
  const audioLink = $('a.music').attr('href') || '';

  let hdLink = '';
  const hdBtn = $('#hd_download, a.without_watermark_hd');
  const ttInput = $('input[name="tt"]');

  if (hdBtn.length && hdBtn.attr('data-directurl')) {
    const directUrl = hdBtn.attr('data-directurl');
    const tokenVal = ttInput.val() || tt;
    try {
      const hdRes = await axios.post(`https://ssstik.io${directUrl}`, new URLSearchParams({ tt: tokenVal }).toString(), {
        headers: {
          ...postHeaders,
          'HX-Trigger': 'hd_download',
          'HX-Target': 'hd_download'
        },
        timeout: 15000,
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400
      });

      if (hdRes.headers['hx-redirect']) {
        hdLink = hdRes.headers['hx-redirect'];
      } else if (hdRes.headers['location']) {
        hdLink = hdRes.headers['location'];
      } else if (hdRes.data && typeof hdRes.data === 'string') {
        const $$ = cheerio.load(hdRes.data);
        hdLink = $$('a').attr('href') || '';
      }
    } catch (e) {}
  }

  const photos = [];
  $('ul.splide__list li, .splide__slide, .result_overlay_buttons a.download_link').each((_, el) => {
    const href = $(el).attr('href') || $(el).find('a').attr('href');
    const imgSrc = $(el).find('img').attr('data-splide-lazy') || $(el).find('img').attr('src');
    const candidate = href || imgSrc;
    if (candidate && candidate.includes('tikcdn.io') && !candidate.includes('without_watermark') && !photos.includes(candidate)) {
      photos.push(candidate);
    }
  });

  const overlayStyle = $('style').text() || '';
  const bgMatch = overlayStyle.match(/url\(([^)]+)\)/);
  const cover = bgMatch ? bgMatch[1] : '';

  let type = 'video';
  if (photos.length > 0) {
    type = 'image';
  }

  return {
    source: 'ssstik.io',
    type: type,
    title: title,
    cover: cover || null,
    author: {
      name: authorName,
      avatar: authorAvatar
    },
    downloads: {
      video: sdLink || null,
      video_hd: hdLink || null,
      audio: audioLink || null,
      photos: photos.length > 0 ? photos : undefined
    }
  };
}

async function scrapeLoveTik(tiktokUrl) {
  const res = await axios.post(
    'https://lovetik.com/api/ajax/search',
    new URLSearchParams({ query: tiktokUrl }).toString(),
    {
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://lovetik.com/',
        'Origin': 'https://lovetik.com'
      },
      timeout: 15000
    }
  );

  const data = res.data;
  if (!data || data.status !== 'ok' || !data.links) {
    throw new Error(data?.mess || 'Gagal memproses via Lovetik');
  }

  const links = data.links || [];
  let videoSd = null;
  let videoHd = null;
  let audio = null;

  links.forEach((l) => {
    const t = (l.t || '').toLowerCase();
    const ft = (l.ft || '').toLowerCase();
    const a = l.a || '';
    if (ft === 'mp3' || t.includes('audio')) {
      audio = a;
    } else if (t.includes('hd')) {
      videoHd = a;
    } else if (ft === 'mp4' || t.includes('watermark') || t.includes('download')) {
      if (!videoSd) videoSd = a;
    }
  });

  const photos = Array.isArray(data.images) ? data.images : undefined;
  const isImage = photos && photos.length > 0;

  return {
    source: 'lovetik.com',
    type: isImage ? 'image' : 'video',
    id: data.vid || null,
    title: data.desc || '',
    cover: data.cover || null,
    author: {
      name: data.author || '',
      username: data.author ? `@${data.author}` : '',
      avatar: data.author_avatar || ''
    },
    downloads: {
      video: videoSd || videoHd || null,
      video_hd: videoHd || videoSd || null,
      audio: audio || null,
      photos: photos
    }
  };
}

async function fallbackTikWM(tiktokUrl) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`;
  const res = await axios.get(apiUrl, { timeout: 15000, headers: DEFAULT_HEADERS });
  const data = res.data?.data;

  if (!data) {
    throw new Error('Data tidak ditemukan');
  }

  const isImages = Array.isArray(data.images) && data.images.length > 0;
  const type = isImages ? 'image' : (data.is_live_photo ? 'live_photo' : 'video');

  const livePhotos = [];
  if (isImages && data.images) {
    data.images.forEach((img, idx) => {
      livePhotos.push({
        index: idx + 1,
        image: img,
        video: data.play || null
      });
    });
  }

  return {
    source: 'tikwm',
    type: type,
    id: data.id || null,
    title: data.title || '',
    cover: data.cover || data.origin_cover || null,
    duration: data.duration || null,
    author: {
      id: data.author?.id || null,
      name: data.author?.nickname || '',
      username: data.author?.unique_id ? `@${data.author.unique_id}` : '',
      avatar: data.author?.avatar || ''
    },
    downloads: {
      video: data.play || null,
      video_hd: data.hdplay || data.play || null,
      video_watermark: data.wmplay || null,
      audio: data.music || data.music_info?.play || null,
      photos: isImages ? data.images : undefined,
      live_photos: isImages ? livePhotos : undefined
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

async function downloadTikTok(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Parameter URL TikTok diperlukan');
  }

  const resolved = await resolveTikTokUrl(rawUrl);

  try {
    const sssRes = await scrapeSSSTik(resolved);
    if (sssRes.downloads.video || (sssRes.downloads.photos && sssRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'tiktok',
        source: 'ssstik.io',
        type: sssRes.type,
        title: sssRes.title,
        cover: sssRes.cover,
        author: sssRes.author,
        downloads: sssRes.downloads
      };
    }
  } catch (e) {}

  try {
    const loveRes = await scrapeLoveTik(resolved);
    if (loveRes.downloads.video || (loveRes.downloads.photos && loveRes.downloads.photos.length > 0)) {
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

  const fbRes = await fallbackTikWM(resolved);
  return {
    status: 'success',
    code: 200,
    platform: 'tiktok',
    source: fbRes.source,
    type: fbRes.type,
    id: fbRes.id,
    title: fbRes.title,
    cover: fbRes.cover,
    duration: fbRes.duration,
    author: fbRes.author,
    downloads: fbRes.downloads,
    stats: fbRes.stats
  };
}

module.exports = {
  resolveTikTokUrl,
  scrapeSSSTik,
  scrapeLoveTik,
  fallbackTikWM,
  downloadTikTok
};
