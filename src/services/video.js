const https = require('https');
const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  rejectUnauthorized: false,
  timeout: 8000
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  timeout: 8000
});

const client = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 8000,
  maxRedirects: 5
});

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
};

async function downloadVideo(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    throw new Error('Parameter URL video diperlukan');
  }

  if (/\.(mp4|m3u8|webm|mov|m4v|ts|mpd|mkv)($|\?)/i.test(url)) {
    const filenameMatch = url.match(/\/([^\/?#]+)\.(mp4|m3u8|webm|mov|m4v|ts|mpd|mkv)/i);
    let title = 'Video HD';
    if (filenameMatch && filenameMatch[1]) {
      try {
        title = decodeURIComponent(filenameMatch[1]);
      } catch (e) {
        title = filenameMatch[1];
      }
    }
    return {
      status: 'success',
      code: 200,
      platform: 'video',
      type: 'video',
      id: 'vid-' + Math.random().toString(36).substring(2, 8),
      title: title,
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

  if (url.includes('vidmonstr.com') || url.includes('vidoy.com') || url.includes('overfetch.video')) {
    if (url.includes('stream.php')) {
      try {
        const res = await client.get(url, {
          headers: DEFAULT_HEADERS
        });
        const html = typeof res.data === 'string' ? res.data : '';
        const $ = cheerio.load(html);
        const m3u8Match = html.match(/https:\/\/[^"'\s<>]+\.m3u8/);
        const videoSrc = $('video source').attr('src') || (m3u8Match ? m3u8Match[0] : url);
        const poster = $('video').attr('poster') || null;
        const titleMatch = html.match(/"title":\s*"([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : ($('title').text().trim() || 'Video HD');

        return {
          status: 'success',
          code: 200,
          platform: 'video',
          type: 'video',
          id: 'vidmonstr',
          title: title,
          cover: poster,
          author: {
            name: 'Video Creator',
            username: '',
            avatar: poster
          },
          downloads: {
            video: videoSrc,
            video_hd: videoSrc,
            audio: null,
            media: [
              {
                type: 'video',
                url: videoSrc,
                thumbnail: poster,
                download: videoSrc
              }
            ]
          }
        };
      } catch (e) {}
    }

    const idMatch = url.match(/vidmonstr\.com\/(?:e\/|d\/)?([a-zA-Z0-9]+)/i);
    const videoId = idMatch ? idMatch[1] : '';
    const pageUrl = videoId ? ('https://vidmonstr.com/e/' + videoId) : url;

    try {
      const res1 = await client.get(pageUrl, {
        headers: DEFAULT_HEADERS
      });

      const html1 = typeof res1.data === 'string' ? res1.data : '';
      const $1 = cheerio.load(html1);
      const rawTitle = $1('title').text().trim() || 'Video HD';
      const rawCover = $1('img.thumbnail').attr('src') || null;

      const iframeIdMatch = html1.match(/var\s+iframeId\s*=\s*['"]([^'"]+)['"]/);
      const tokenMatch = html1.match(/var\s+embedToken\s*=\s*['"]([^'"]+)['"]/);

      if (iframeIdMatch && tokenMatch) {
        const ipUrl = 'https://vidmonstr.com/ip129jk?id=' + iframeIdMatch[1] + '&t=' + tokenMatch[1];
        const res2 = await client.get(ipUrl, {
          headers: {
            ...DEFAULT_HEADERS,
            'Referer': pageUrl
          }
        });

        const html2 = typeof res2.data === 'string' ? res2.data : '';
        let streamUrl = null;
        const streamMatch = html2.match(/https:\/\/vidmonstr\.com\/stream\.php\?[^"'\\<>\s]+/);
        if (streamMatch) {
          streamUrl = streamMatch[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
        }
        if (!streamUrl) {
          const rawPlayerMatch = html2.match(/playerPath\s*=\s*['"]([^'"]+)['"]/);
          if (rawPlayerMatch) streamUrl = rawPlayerMatch[1].replace(/\\u0026/g, '&');
        }

        if (streamUrl) {
          const res3 = await client.get(streamUrl, {
            headers: {
              ...DEFAULT_HEADERS,
              'Referer': ipUrl
            }
          });

          const html3 = typeof res3.data === 'string' ? res3.data : '';
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
            id: videoId || iframeIdMatch[1],
            title: pageTitle,
            cover: pagePoster,
            author: {
              name: 'Video Creator',
              username: '',
              avatar: pagePoster
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
      }
    } catch (e) {}
  }

  if (url.includes('vildey.com')) {
    const slugMatch = url.match(/vildey\.com\/(?:videos\/)?([a-zA-Z0-9_\-]+)(?:\.mp4)?/i);
    const videoId = slugMatch ? slugMatch[1] : 'video';
    const direct = `https://vildey.com/videos/${videoId}.mp4`;
    return {
      status: 'success',
      code: 200,
      platform: 'video',
      source: 'vildey.com',
      type: 'video',
      id: videoId,
      title: 'Video HD',
      cover: null,
      author: {
        name: 'Video Creator',
        username: '',
        avatar: null
      },
      downloads: {
        video: direct,
        video_hd: direct,
        audio: null,
        media: [
          {
            type: 'video',
            url: direct,
            download: direct
          }
        ]
      }
    };
  }

  try {
    const pageRes = await client.get(url, {
      headers: DEFAULT_HEADERS
    });
    const html = typeof pageRes.data === 'string' ? pageRes.data : '';
    if (html) {
      const $ = cheerio.load(html);
      const ogVideo = $('meta[property="og:video"]').attr('content') ||
                      $('meta[property="og:video:secure_url"]').attr('content') ||
                      $('meta[name="twitter:player:stream"]').attr('content');
      const tagVideo = $('video source').attr('src') || $('video').attr('src') || $('source').attr('src');
      const m3u8Match = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^\s"'<>]*/);
      const mp4Match = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^\s"'<>]*/);
      const foundVideo = ogVideo || tagVideo || (mp4Match ? mp4Match[0] : (m3u8Match ? m3u8Match[0] : null));

      if (foundVideo) {
        let absVideo = foundVideo;
        if (!absVideo.startsWith('http')) {
          const base = new URL(url);
          absVideo = new URL(absVideo, base.origin).toString();
        }
        const ogImage = $('meta[property="og:image"]').attr('content') || $('video').attr('poster') || null;
        const pageTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Video HD';

        return {
          status: 'success',
          code: 200,
          platform: 'video',
          type: 'video',
          id: 'vid-' + Math.random().toString(36).substring(2, 8),
          title: pageTitle,
          cover: ogImage,
          author: {
            name: 'Video Creator',
            username: '',
            avatar: ogImage
          },
          downloads: {
            video: absVideo,
            video_hd: absVideo,
            audio: null,
            media: [
              {
                type: 'video',
                url: absVideo,
                thumbnail: ogImage,
                download: absVideo
              }
            ]
          }
        };
      }
    }
  } catch (e) {}

  throw new Error('Gagal mengekstrak video. Pastikan tautan video dapat diakses secara publik.');
}

module.exports = {
  downloadVideo
};
