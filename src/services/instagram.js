const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

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
    const res = await axios.get(`https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
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

function decodeBase(d, e, f) {
  const g = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
  const h = g.slice(0, e);
  const i = g.slice(0, f);
  let j = d.split('').reverse().reduce((a, b, c) => {
    if (h.indexOf(b) !== -1) {
      return a + h.indexOf(b) * Math.pow(e, c);
    }
    return a;
  }, 0);
  let k = '';
  while (j > 0) {
    k = i[j % f] + k;
    j = (j - (j % f)) / f;
  }
  return k || '0';
}

function decodeHunter(h, u, n, t, e, r) {
  r = '';
  for (let i = 0, len = h.length; i < len; i++) {
    let s = '';
    while (i < len && h[i] !== n[e]) {
      s += h[i];
      i++;
    }
    for (let j = 0; j < n.length; j++) {
      s = s.split(n[j]).join(j);
    }
    r += String.fromCharCode(parseInt(decodeBase(s, e, 10), 10) - t);
  }
  return decodeURIComponent(r);
}

function unpackHunterCode(str) {
  const match = str.match(/\}\s*\(\s*["\x27]([^"\x27]+)["\x27]\s*,\s*(\d+)\s*,\s*["\x27]([^"\x27]+)["\x27]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!match) return str;
  const [_, h, u, n, t, e, r] = match;
  return decodeHunter(h, parseInt(u, 10), n, parseInt(t, 10), parseInt(e, 10), parseInt(r, 10));
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

function extractHtmlFromUnpacked(unpacked) {
  const match = unpacked.match(/innerHTML\s*=\s*"((?:[^"\\]|\\.)*)";/);
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch (e) {
      return match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
  }
  return unpacked;
}

async function fetchInstagramProfile(username) {
  if (!username) return null;
  const cleanUrl = `https://www.instagram.com/${username}/`;
  let k_token = '95c09b2f49414bafab55c43c874be2cd857a64dfd40b6279ede3869b2b13ea0e';
  let k_exp = '1790213633';
  let k_url_search = 'https://v3.saveclip.app/api/ajaxSearch';

  try {
    const { stdout: pOut } = await execFilePromise('curl', [
      '-s', 'https://saveclip.app/id8/instagram-story-download',
      '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    ]);
    const tokenMatch = pOut.match(/k_token\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
    const expMatch = pOut.match(/k_exp\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
    const urlSearchMatch = pOut.match(/k_url_search\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
    if (tokenMatch) k_token = tokenMatch[1];
    if (expMatch) k_exp = expMatch[1];
    if (urlSearchMatch) k_url_search = urlSearchMatch[1];
  } catch (e) {}

  let cftoken = '';
  try {
    const { stdout: vOut } = await execFilePromise('curl', [
      '-s', '-X', 'POST', 'https://saveclip.app/api/userverify',
      '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
      '-H', 'Referer: https://saveclip.app/id8/instagram-story-download',
      '-H', 'Origin: https://saveclip.app',
      '-H', 'Content-Type: application/x-www-form-urlencoded',
      '--data', `url=${encodeURIComponent(cleanUrl)}`
    ]);
    const vdata = JSON.parse(vOut);
    cftoken = vdata.token || '';
  } catch (e) {}

  try {
    const { stdout: sOut } = await execFilePromise('curl', [
      '-s', '-X', 'POST', k_url_search,
      '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
      '-H', 'Referer: https://saveclip.app/id8/instagram-story-download',
      '-H', 'Origin: https://saveclip.app',
      '-H', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
      '-H', 'X-Requested-With: XMLHttpRequest',
      '--data', `k_exp=${encodeURIComponent(k_exp)}&k_token=${encodeURIComponent(k_token)}&q=${encodeURIComponent(cleanUrl)}&t=media&lang=id&v=v2&cftoken=${encodeURIComponent(cftoken)}`
    ]);

    const resData = JSON.parse(sOut);
    let rawHtml = resData.data || '';
    if (rawHtml.includes('eval(function(')) {
      const unpacked = unpackHunterCode(rawHtml);
      rawHtml = extractHtmlFromUnpacked(unpacked);
    }

    const $ = cheerio.load(rawHtml);
    const firstA = $('a[title*="Avatar"], a:contains("Avatar"), a:contains("Unduh Avatar")').first().attr('href');
    const firstImg = $('img').first().attr('src');
    return extractJwtUrl(firstA) || extractJwtUrl(firstImg) || firstImg || null;
  } catch (e) {
    return null;
  }
}

async function scrapeSaveClip(igUrl) {
  const cleanUrl = normalizeInstagramUrl(igUrl);
  let k_token = '95c09b2f49414bafab55c43c874be2cd857a64dfd40b6279ede3869b2b13ea0e';
  let k_exp = '1790213633';
  let k_url_search = 'https://v3.saveclip.app/api/ajaxSearch';

  try {
    const { stdout: pOut } = await execFilePromise('curl', [
      '-s', 'https://saveclip.app/id8/instagram-story-download',
      '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: id,en-US;q=0.9,en;q=0.8'
    ]);

    const tokenMatch = pOut.match(/k_token\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
    const expMatch = pOut.match(/k_exp\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
    const urlSearchMatch = pOut.match(/k_url_search\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
    if (tokenMatch) k_token = tokenMatch[1];
    if (expMatch) k_exp = expMatch[1];
    if (urlSearchMatch) k_url_search = urlSearchMatch[1];
  } catch (e) {}

  let cftoken = '';
  try {
    const { stdout: vOut } = await execFilePromise('curl', [
      '-s', '-X', 'POST', 'https://saveclip.app/api/userverify',
      '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
      '-H', 'Referer: https://saveclip.app/id8/instagram-story-download',
      '-H', 'Origin: https://saveclip.app',
      '-H', 'Content-Type: application/x-www-form-urlencoded',
      '--data', `url=${encodeURIComponent(cleanUrl)}`
    ]);
    const vdata = JSON.parse(vOut);
    cftoken = vdata.token || '';
  } catch (e) {}

  const { stdout: sOut } = await execFilePromise('curl', [
    '-s', '-X', 'POST', k_url_search,
    '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
    '-H', 'Referer: https://saveclip.app/id8/instagram-story-download',
    '-H', 'Origin: https://saveclip.app',
    '-H', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
    '-H', 'X-Requested-With: XMLHttpRequest',
    '--data', `k_exp=${encodeURIComponent(k_exp)}&k_token=${encodeURIComponent(k_token)}&q=${encodeURIComponent(cleanUrl)}&t=media&lang=id&v=v2&cftoken=${encodeURIComponent(cftoken)}`
  ]);

  const resData = JSON.parse(sOut);
  if (!resData || resData.status !== 'ok' || !resData.data) {
    throw new Error(resData?.mess || 'SaveClip search failed');
  }

  let rawHtml = resData.data;
  if (rawHtml.includes('eval(function(')) {
    const unpacked = unpackHunterCode(rawHtml);
    rawHtml = extractHtmlFromUnpacked(unpacked);
  }

  const $ = cheerio.load(rawHtml);
  const mediaList = [];
  const videoList = [];
  const imageList = [];
  let cover = null;

  $('.download-items, .download-box li, .media-box, .row > div').each((_, el) => {
    const item = $(el);
    const thumbImg = item.find('img').attr('src') || item.find('img').attr('data-src') || '';
    const directThumb = extractJwtUrl(thumbImg) || thumbImg;

    if (!cover && directThumb) cover = directThumb;

    item.find('a').each((__, aEl) => {
      const href = $(aEl).attr('href') || '';
      const text = $(aEl).text().toLowerCase();

      if (!href || href.startsWith('/') || href.includes('google') || href.includes('terms')) return;

      const directCdn = extractJwtUrl(href) || href;
      const isVid = text.includes('video') || directCdn.includes('.mp4') || href.includes('.mp4');
      const isImg = text.includes('foto') || text.includes('photo') || text.includes('gambar') || text.includes('thumbnail') || directCdn.includes('.jpg') || directCdn.includes('.jpeg') || directCdn.includes('.png');

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
      if (!href || href.startsWith('/') || href.includes('google')) return;
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
  let title = '';
  const oembed = await fetchInstagramOembed(cleanUrl);
  if (oembed) {
    if (oembed.authorName && !uname) uname = oembed.authorName;
    if (oembed.title) title = oembed.title;
    if (oembed.thumbnail && !cover) cover = oembed.thumbnail;
  }

  let authorAvatar = null;
  if (uname) {
    authorAvatar = await fetchInstagramProfile(uname);
  }

  return {
    source: 'saveclip.app',
    type: type,
    title: title,
    cover: cover,
    author: {
      name: uname || (oembed?.authorName || 'Instagram Creator'),
      username: uname ? `@${uname}` : (oembed?.authorName ? `@${oembed.authorName}` : ''),
      avatar: authorAvatar || cover || null
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

async function scrapeSnapInsta(igUrl) {
  const cleanUrl = normalizeInstagramUrl(igUrl);
  let token = null;

  try {
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
    token = verifyRes.data?.token || null;
  } catch (e) {}

  if (!token) {
    try {
      const { stdout: vOut } = await execFilePromise('curl', [
        '-s', '-X', 'POST', 'https://snapinsta.to/api/userverify',
        '-H', `User-Agent: ${DEFAULT_HEADERS['User-Agent']}`,
        '-H', 'Referer: https://snapinsta.to/en46',
        '-H', 'Origin: https://snapinsta.to',
        '-H', 'Content-Type: application/x-www-form-urlencoded',
        '--data', `url=${encodeURIComponent(cleanUrl)}`
      ]);
      const vdata = JSON.parse(vOut);
      token = vdata.token || null;
    } catch (e) {}
  }

  if (!token) {
    throw new Error('Snapinsta verify failed');
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
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://snapinsta.to/en46',
        'Origin': 'https://snapinsta.to'
      },
      timeout: 15000
    }
  );

  const resData = searchRes.data;
  if (!resData || resData.status !== 'ok' || !resData.data) {
    throw new Error(resData?.mess || 'Snapinsta search failed');
  }

  let rawHtml = resData.data;
  if (rawHtml.includes('eval(function(')) {
    const unpacked = unpackHunterCode(rawHtml);
    rawHtml = extractHtmlFromUnpacked(unpacked);
  }

  const $ = cheerio.load(rawHtml);
  const mediaList = [];
  const videoList = [];
  const imageList = [];
  let cover = null;

  $('.download-items, .download-box li, .media-box').each((_, el) => {
    const item = $(el);
    const thumbImg = item.find('img').attr('src') || item.find('img').attr('data-src') || '';
    const directThumb = extractJwtUrl(thumbImg) || thumbImg;

    if (!cover && directThumb) cover = directThumb;

    item.find('a').each((__, aEl) => {
      const href = $(aEl).attr('href') || '';
      const text = $(aEl).text().toLowerCase();

      if (!href || href.startsWith('/') || href.includes('google')) return;

      const directCdn = extractJwtUrl(href) || href;
      const isVid = text.includes('video') || directCdn.includes('.mp4');
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

  const isStory = cleanUrl.includes('/stories/') || cleanUrl.includes('/story/');
  const isCarousel = mediaList.length > 1;
  let type = isStory ? 'story' : 'video';
  if (imageList.length > 0 && videoList.length === 0) {
    type = isStory ? 'story' : (isCarousel ? 'carousel' : 'image');
  }

  let uname = extractUsername(cleanUrl);
  let title = '';
  const oembed = await fetchInstagramOembed(cleanUrl);
  if (oembed) {
    if (oembed.authorName && !uname) uname = oembed.authorName;
    if (oembed.title) title = oembed.title;
    if (oembed.thumbnail && !cover) cover = oembed.thumbnail;
  }

  let authorAvatar = null;
  if (uname) {
    authorAvatar = await fetchInstagramProfile(uname);
  }

  return {
    source: 'snapinsta.to',
    type: type,
    title: title,
    cover: cover,
    author: {
      name: uname || (oembed?.authorName || 'Instagram Creator'),
      username: uname ? `@${uname}` : (oembed?.authorName ? `@${oembed.authorName}` : ''),
      avatar: authorAvatar || cover || null
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

  const isStory = cleanUrl.includes('/stories/') || cleanUrl.includes('/story/');
  const isCarousel = mediaList.length > 1;
  let type = isStory ? 'story' : 'video';
  if (imageList.length > 0 && videoList.length === 0) {
    type = isStory ? 'story' : (isCarousel ? 'carousel' : 'image');
  } else if (isCarousel) {
    type = 'carousel';
  }

  let uname = extractUsername(cleanUrl);
  let title = '';
  const oembed = await fetchInstagramOembed(cleanUrl);
  if (oembed) {
    if (oembed.authorName && !uname) uname = oembed.authorName;
    if (oembed.title) title = oembed.title;
    if (oembed.thumbnail && !cover) cover = oembed.thumbnail;
  }

  let authorAvatar = null;
  if (uname) {
    authorAvatar = await fetchInstagramProfile(uname);
  }

  return {
    source: 'videodropper.app',
    type: type,
    title: title,
    cover: cover,
    author: {
      name: uname || (oembed?.authorName || 'Instagram Creator'),
      username: uname ? `@${uname}` : (oembed?.authorName ? `@${oembed.authorName}` : ''),
      avatar: authorAvatar || cover || null
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
  const isStory = cleanUrl.includes('/stories/') || cleanUrl.includes('/story/');

  if (isStory) {
    try {
      const clipRes = await scrapeSaveClip(cleanUrl);
      if (clipRes.downloads.video || (Array.isArray(clipRes.downloads.photos) && clipRes.downloads.photos.length > 0)) {
        return {
          status: 'success',
          code: 200,
          platform: 'instagram',
          source: clipRes.source,
          type: clipRes.type,
          title: clipRes.title,
          cover: clipRes.cover,
          author: clipRes.author,
          downloads: clipRes.downloads
        };
      }
    } catch (e) {}

    try {
      const snapRes = await scrapeSnapInsta(cleanUrl);
      if (snapRes.downloads.video || (Array.isArray(snapRes.downloads.photos) && snapRes.downloads.photos.length > 0)) {
        return {
          status: 'success',
          code: 200,
          platform: 'instagram',
          source: snapRes.source,
          type: snapRes.type,
          title: snapRes.title,
          cover: snapRes.cover,
          author: snapRes.author,
          downloads: snapRes.downloads
        };
      }
    } catch (e) {}

    try {
      const dropRes = await scrapeVideoDropper(cleanUrl, 'story');
      if (dropRes.downloads.video || (Array.isArray(dropRes.downloads.photos) && dropRes.downloads.photos.length > 0)) {
        return {
          status: 'success',
          code: 200,
          platform: 'instagram',
          source: dropRes.source,
          type: dropRes.type,
          title: dropRes.title,
          cover: dropRes.cover,
          author: dropRes.author,
          downloads: dropRes.downloads
        };
      }
    } catch (e) {}

    throw new Error('Tidak dapat mengunduh story Instagram. Pastikan akun tidak privat dan story masih aktif.');
  }

  try {
    const clipRes = await scrapeSaveClip(cleanUrl);
    if (clipRes.downloads.video || (Array.isArray(clipRes.downloads.photos) && clipRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'instagram',
        source: clipRes.source,
        type: clipRes.type,
        title: clipRes.title,
        cover: clipRes.cover,
        author: clipRes.author,
        downloads: clipRes.downloads
      };
    }
  } catch (e) {}

  try {
    const dropRes = await scrapeVideoDropper(cleanUrl, 'allinone');
    if (dropRes.downloads.video || (Array.isArray(dropRes.downloads.photos) && dropRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'instagram',
        source: dropRes.source,
        type: dropRes.type,
        title: dropRes.title,
        cover: dropRes.cover,
        author: dropRes.author,
        downloads: dropRes.downloads
      };
    }
  } catch (e) {}

  try {
    const snapRes = await scrapeSnapInsta(cleanUrl);
    if (snapRes.downloads.video || (Array.isArray(snapRes.downloads.photos) && snapRes.downloads.photos.length > 0)) {
      return {
        status: 'success',
        code: 200,
        platform: 'instagram',
        source: snapRes.source,
        type: snapRes.type,
        title: snapRes.title,
        cover: snapRes.cover,
        author: snapRes.author,
        downloads: snapRes.downloads
      };
    }
  } catch (e) {}

  throw new Error('Tidak dapat mengunduh media dari Instagram. Pastikan postingan atau reel bersifat publik.');
}

module.exports = {
  normalizeInstagramUrl,
  extractUsername,
  fetchInstagramOembed,
  fetchInstagramProfile,
  scrapeSaveClip,
  scrapeVideoDropper,
  scrapeSnapInsta,
  downloadInstagram
};
