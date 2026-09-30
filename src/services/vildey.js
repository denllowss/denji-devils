const https = require('https');
const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');

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
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

async function downloadVildey(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    throw new Error('Parameter URL diperlukan');
  }

  let directVideoUrl = null;
  let title = '';

  if (url.includes('/videos/') && url.endsWith('.mp4')) {
    directVideoUrl = url;
  } else {
    try {
      const res = await client.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 5000
      });
      const html = res.data;
      if (typeof html === 'string') {
        const $ = cheerio.load(html);
        const sourceSrc = $('source').attr('src') || $('video').attr('src');
        const pageTitle = $('title').text().trim();
        if (pageTitle && pageTitle !== 'Video Player') {
          title = pageTitle;
        }

        if (sourceSrc) {
          if (sourceSrc.startsWith('http')) {
            directVideoUrl = sourceSrc;
          } else {
            const baseUrl = new URL(url);
            directVideoUrl = new URL(sourceSrc, baseUrl.origin).toString();
          }
        }
      }
    } catch (e) {}
  }

  if (!directVideoUrl) {
    const slugMatch = url.match(/vildey\.com\/(?:videos\/)?([a-zA-Z0-9_\-]+)(?:\.mp4)?/i);
    if (slugMatch && slugMatch[1]) {
      directVideoUrl = `https://vildey.com/videos/${slugMatch[1]}.mp4`;
    }
  }

  if (!directVideoUrl) {
    throw new Error('Gagal mengekstrak video');
  }

  const idMatch = (directVideoUrl || '').match(/\/([^\/?#]+)\.mp4/i);
  const videoId = idMatch ? idMatch[1] : 'video';

  return {
    status: 'success',
    code: 200,
    platform: 'video',
    source: 'vildey.com',
    type: 'video',
    id: videoId,
    title: title,
    cover: null,
    author: {
      name: 'Video Creator',
      username: '',
      avatar: null
    },
    downloads: {
      video: directVideoUrl,
      video_hd: directVideoUrl,
      audio: null,
      media: [
        {
          type: 'video',
          url: directVideoUrl,
          download: directVideoUrl
        }
      ]
    }
  };
}

module.exports = {
  downloadVildey
};
