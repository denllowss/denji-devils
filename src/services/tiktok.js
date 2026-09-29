const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
};

async function resolveTikTokUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^https?:\/\/(vt|vm|t|www\.vt|www\.vm)\.tiktok\.com\//i.test(url) || url.includes('/t/')) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        },
        maxRedirects: 10,
        timeout: 10000,
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
  return str.includes('/photo/') || str.includes('/photomode/');
}

function isVideoUrl(url) {
  const str = String(url || '').toLowerCase();
  return str.includes('/video/');
}

async function scrapeTikWM(tiktokUrl) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`;
  const res = await axios.get(apiUrl, { timeout: 15000, headers: DEFAULT_HEADERS });
  const data = res.data?.data;

  if (!data) {
    throw new Error('Data tidak ditemukan di TikWM');
  }

  const isImages = Array.isArray(data.images) && data.images.length > 0;
  const isExplicitPhoto = isPhotoUrl(tiktokUrl);
  const isExplicitVideo = isVideoUrl(tiktokUrl);

  let type = 'video';
  if (isExplicitPhoto || (isImages && !isExplicitVideo)) {
    type = 'image';
  }

  const mediaList = [];
  if (type === 'image' && data.images) {
    data.images.forEach((img, idx) => {
      mediaList.push({
        type: 'image',
        index: idx + 1,
        url: img,
        thumbnail: img,
        download: img
      });
    });
  } else if (data.play || data.hdplay) {
    mediaList.push({
      type: 'video',
      url: data.hdplay || data.play,
      thumbnail: data.cover || data.origin_cover || null,
      download: data.hdplay || data.play
    });
  }

  return {
    source: 'tikwm',
    type: type,
    id: data.id || null,
    title: data.title || '',
    cover: data.cover || data.origin_cover || (data.images?.[0] || null),
    duration: data.duration || null,
    author: {
      id: data.author?.id || null,
      name: data.author?.nickname || '',
      username: data.author?.unique_id ? `@${data.author.unique_id}` : '',
      avatar: data.author?.avatar || ''
    },
    downloads: {
      video: type === 'video' ? (data.play || null) : null,
      video_hd: type === 'video' ? (data.hdplay || data.play || null) : null,
      video_watermark: type === 'video' ? (data.wmplay || null) : null,
      audio: data.music || data.music_info?.play || null,
      photos: type === 'image' && isImages ? data.images : undefined,
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
  $('.splide__slide img, ul.splide__list img').each((_, el) => {
    const imgSrc = $(el).attr('data-splide-lazy') || $(el).attr('src');
    if (imgSrc && imgSrc.includes('tikcdn.io') && !photos.includes(imgSrc)) {
      photos.push(imgSrc);
    }
  });

  const overlayStyle = $('style').text() || '';
  const bgMatch = overlayStyle.match(/url\(([^)]+)\)/);
  const cover = bgMatch ? bgMatch[1] : (photos[0] || null);

  const isExplicitPhoto = isPhotoUrl(tiktokUrl);
  const isExplicitVideo = isVideoUrl(tiktokUrl);
  const hasVideoLinks = !!(sdLink || hdLink);

  let type = 'video';
  if (isExplicitPhoto || (!hasVideoLinks && photos.length > 0 && !isExplicitVideo)) {
    type = 'image';
  }

  const mediaList = [];
  if (type === 'image' && photos.length > 0) {
    photos.forEach((pUrl, idx) => {
      mediaList.push({
        type: 'image',
        index: idx + 1,
        url: pUrl,
        thumbnail: pUrl,
        download: pUrl
      });
    });
  } else if (hasVideoLinks) {
    mediaList.push({
      type: 'video',
      url: hdLink || sdLink,
      thumbnail: cover,
      download: hdLink || sdLink
    });
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
      video: type === 'video' ? (sdLink || hdLink || null) : null,
      video_hd: type === 'video' ? (hdLink || sdLink || null) : null,
      audio: audioLink || null,
      photos: type === 'image' && photos.length > 0 ? photos : undefined,
      media: mediaList
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
    if (ft === 'mp3' || t.includes('audio') || t.includes('music')) {
      audio = a;
    } else if (t.includes('hd') || t.includes('1080')) {
      videoHd = a;
    } else if (ft === 'mp4' || t.includes('watermark') || t.includes('download')) {
      if (!videoSd) videoSd = a;
    }
  });

  const rawPhotos = Array.isArray(data.images) ? data.images : [];
  const isExplicitPhoto = isPhotoUrl(tiktokUrl);
  const isExplicitVideo = isVideoUrl(tiktokUrl);

  let type = 'video';
  if (isExplicitPhoto || (rawPhotos.length > 0 && !isExplicitVideo)) {
    type = 'image';
  }

  const mediaList = [];
  if (type === 'image' && rawPhotos.length > 0) {
    rawPhotos.forEach((imgUrl, idx) => {
      mediaList.push({
        type: 'image',
        index: idx + 1,
        url: imgUrl,
        thumbnail: imgUrl,
        download: imgUrl
      });
    });
  } else if (videoSd || videoHd) {
    mediaList.push({
      type: 'video',
      url: videoHd || videoSd,
      thumbnail: data.cover || null,
      download: videoHd || videoSd
    });
  }

  return {
    source: 'lovetik.com',
    type: type,
    id: data.vid || null,
    title: data.desc || '',
    cover: data.cover || (rawPhotos[0] || null),
    author: {
      name: data.author || '',
      username: data.author ? `@${data.author}` : '',
      avatar: data.author_avatar || ''
    },
    downloads: {
      video: type === 'video' ? (videoSd || videoHd || null) : null,
      video_hd: type === 'video' ? (videoHd || videoSd || null) : null,
      audio: audio || null,
      photos: type === 'image' && rawPhotos.length > 0 ? rawPhotos : undefined,
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

  const loveRes = await scrapeLoveTik(resolved);
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

module.exports = {
  resolveTikTokUrl,
  isPhotoUrl,
  isVideoUrl,
  scrapeTikWM,
  scrapeSSSTik,
  scrapeLoveTik,
  downloadTikTok
};
