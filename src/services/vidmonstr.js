const axios = require('axios');
const cheerio = require('cheerio');

async function downloadVidmonstr(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    throw new Error('URL Vidmonstr tidak boleh kosong');
  }

  const idMatch = url.match(/vidmonstr\.com\/(?:e\/|d\/)?([a-zA-Z0-9]+)/i);
  const videoId = idMatch ? idMatch[1] : '';

  if (url.includes('.m3u8') || url.includes('overfetch.video')) {
    return {
      status: 'success',
      code: 200,
      platform: 'video',
      type: 'video',
      id: videoId || 'vid-' + Date.now(),
      title: 'Video Stream',
      cover: null,
      author: {
        name: 'Video Creator',
        username: '',
        avatar: null
      },
      downloads: {
        video: url,
        video_hd: url,
        audio: null,
        media: [
          {
            type: 'video',
            url: url,
            thumbnail: null,
            download: url
          }
        ]
      }
    };
  }

  const pageUrl = videoId ? ('https://vidmonstr.com/e/' + videoId) : url;

  const res1 = await axios.get(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
    },
    timeout: 8000
  });

  const html1 = res1.data;
  const $1 = cheerio.load(html1);
  const rawTitle = $1('title').text().trim() || 'Video';
  const rawCover = $1('img.thumbnail').attr('src') || null;

  const iframeIdMatch = html1.match(/var\s+iframeId\s*=\s*['"]([^'"]+)['"]/);
  const tokenMatch = html1.match(/var\s+embedToken\s*=\s*['"]([^'"]+)['"]/);

  if (!iframeIdMatch || !tokenMatch) {
    throw new Error('Gagal menemukan data video');
  }

  const iframeId = iframeIdMatch[1];
  const embedToken = tokenMatch[1];

  const ipUrl = 'https://vidmonstr.com/ip129jk?id=' + iframeId + '&t=' + embedToken;
  const res2 = await axios.get(ipUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Referer': pageUrl,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 8000
  });

  const html2 = res2.data;
  let streamUrl = null;

  const streamMatch = html2.match(/https:\/\/vidmonstr\.com\/stream\.php\?[^"'\\<>\s]+/);
  if (streamMatch) {
    streamUrl = streamMatch[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
  }

  if (!streamUrl) {
    const rawPlayerMatch = html2.match(/playerPath\s*=\s*['"]([^'"]+)['"]/);
    if (rawPlayerMatch) {
      streamUrl = rawPlayerMatch[1].replace(/\\u0026/g, '&');
    }
  }

  if (!streamUrl) {
    throw new Error('Gagal memproses stream video');
  }

  const res3 = await axios.get(streamUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Referer': ipUrl,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 8000
  });

  const html3 = res3.data;
  const $3 = cheerio.load(html3);
  const m3u8Match = html3.match(/https:\/\/[^"'\s<>]+\.m3u8/);
  const videoSrc = $3('video source').attr('src') || (m3u8Match ? m3u8Match[0] : streamUrl);
  const pagePoster = $3('video').attr('poster') || rawCover;
  const titleMatch = html3.match(/"title":\s*"([^"]+)"/);
  const pageTitle = (titleMatch ? titleMatch[1] : rawTitle);

  return {
    status: 'success',
    code: 200,
    platform: 'video',
    type: 'video',
    id: videoId || iframeId,
    title: pageTitle,
    cover: pagePoster,
    author: {
      name: 'Video Creator',
      username: '',
      avatar: pagePoster || null
    },
    downloads: {
      video: videoSrc,
      video_hd: videoSrc,
      audio: null,
      media: [
        {
          type: 'video',
          url: videoSrc,
          thumbnail: pagePoster,
          download: videoSrc
        }
      ]
    }
  };
}

module.exports = {
  downloadVidmonstr
};
