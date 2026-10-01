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

async function resolveVidmonstrVideo(pageUrl, origin) {
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
    const directIpMatch = html1.match(/\/ip129jk\?[^'"]+/i) || html1.match(/ip129jk\?id=([a-zA-Z0-9]+)&(?:amp;)?t=([a-zA-Z0-9_\-\.]+)/i);

    let ipUrl = '';
    if (iframeIdMatch && tokenMatch) {
      ipUrl = `${origin}/ip129jk?id=${iframeIdMatch[1]}&t=${tokenMatch[1]}`;
    } else if (directIpMatch) {
      ipUrl = directIpMatch[0].startsWith('http') ? directIpMatch[0] : `${origin}${directIpMatch[0].startsWith('/') ? '' : '/'}${directIpMatch[0]}`;
    }

    if (!ipUrl) return null;

    const res2 = await client.get(ipUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': pageUrl
      }
    });

    const html2 = typeof res2.data === 'string' ? res2.data : '';
    const streamMatch = html2.match(/href=['"]([^'"]*stream\.php[^'"]*)['"]/i) ||
      html2.match(/(https?:\/\/[^\/]+\/stream\.php[^'"\\<>\s]+)/i) ||
      html2.match(/https:\/\/[^"'\s<>]+\/stream\.php\?[^"'\\<>\s]+/);

    let streamUrl = '';
    if (streamMatch) {
      const rawStream = streamMatch[1] || streamMatch[0];
      streamUrl = (rawStream.startsWith('http') ? rawStream : `${origin}${rawStream.startsWith('/') ? '' : '/'}${rawStream}`).replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
    }

    if (!streamUrl) return null;

    const res3 = await client.get(streamUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': ipUrl
      }
    });

    const html3 = typeof res3.data === 'string' ? res3.data : '';
    const $3 = cheerio.load(html3);
    const m3u8Match = html3.match(/https:\/\/[^"'\s<>]+\.m3u8/);
    const srcMatch = html3.match(/<source[^>]+src=['"]([^'"]+)['"]/i) || html3.match(/src:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i);
    const videoSrc = $3('video source').attr('src') || (srcMatch ? srcMatch[1] : (m3u8Match ? m3u8Match[0] : streamUrl));
    const pagePoster = $3('video').attr('poster') || rawCover;
    const titleMatch = html3.match(/"title":\s*"([^"]+)"/);
    const pageTitle = titleMatch ? titleMatch[1] : rawTitle;

    return {
      title: pageTitle,
      cover: pagePoster,
      url: videoSrc
    };
  } catch (e) {
    return null;
  }
}

async function scrapeVidmonstrFolder(folderUrl, origin) {
  const res = await client.get(folderUrl, {
    headers: DEFAULT_HEADERS
  });

  const html = typeof res.data === 'string' ? res.data : '';
  const $ = cheerio.load(html);

  const folderTitle = ($('h1.drive-title').text().trim() || $('title').text().trim() || 'Folder Video').replace(/^[📂📁\s]+/, '').trim();

  const rawItems = [];
  $('article.drive-file-card').each((_, el) => {
    const card = $(el);
    const linkEl = card.find('a.thumb-link, a.file-name').first();
    const href = linkEl.attr('href') || '';
    const thumbImg = card.find('img').attr('src') || null;
    const itemTitle = card.find('.file-name').text().trim() || card.find('a').attr('title') || 'Video';
    if (href) {
      rawItems.push({
        href: href.startsWith('http') ? href : `${origin}${href.startsWith('/') ? '' : '/'}${href}`,
        thumbnail: thumbImg && !thumbImg.includes('blank.jpg') ? thumbImg : null,
        title: itemTitle
      });
    }
  });

  if (rawItems.length === 0) {
    const fileRegex = /<a[^>]+href=['"](\/[de]\/[a-zA-Z0-9]+)['"][^>]*class=['"]thumb-link['"][^>]*>[\s\S]*?<img[^>]+src=['"]([^'"]+)['"][\s\S]*?<\/a>[\s\S]*?<a[^>]+class=['"]file-name['"][^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = fileRegex.exec(html)) !== null) {
      rawItems.push({
        href: `${origin}${m[1]}`,
        thumbnail: m[2] && !m[2].includes('blank.jpg') ? m[2] : null,
        title: m[3].trim()
      });
    }
  }

  if (rawItems.length === 0) {
    throw new Error('Tidak ada video yang ditemukan di dalam folder.');
  }

  const resolvedList = await Promise.all(rawItems.map(async (item, i) => {
    const v = await resolveVidmonstrVideo(item.href, origin);
    const vUrl = v?.url || item.href;
    const vCover = v?.cover || item.thumbnail;
    const vTitle = v?.title || item.title;
    return {
      type: 'video',
      index: i + 1,
      title: vTitle,
      thumbnail: vCover,
      url: vUrl,
      download: vUrl
    };
  }));

  const firstCover = resolvedList[0]?.thumbnail || null;
  const firstVideo = resolvedList[0]?.url || null;

  return {
    status: 'success',
    code: 200,
    platform: 'video',
    type: 'folder',
    id: 'folder',
    title: folderTitle,
    cover: firstCover,
    author: {
      name: 'Video Folder',
      username: '',
      avatar: firstCover
    },
    downloads: {
      video: firstVideo,
      video_hd: firstVideo,
      audio: null,
      media: resolvedList
    }
  };
}

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

  let parsedOrigin = '';
  try {
    const p = new URL(url);
    parsedOrigin = p.origin;
  } catch (e) {}

  const isFolderUrl = /\/f\/[a-zA-Z0-9_\-]+/i.test(url) || url.includes('/folder/');

  if (isFolderUrl && parsedOrigin) {
    try {
      const folderResult = await scrapeVidmonstrFolder(url, parsedOrigin);
      if (folderResult) return folderResult;
    } catch (e) {}
  }

  const isVidmonstrFamily = url.includes('vidkud.com') ||
    url.includes('vidovr.com') ||
    url.includes('vidmonstr.com') ||
    url.includes('vidoy.com') ||
    url.includes('overfetch.video') ||
    url.includes('/ip129jk') ||
    url.includes('stream.php') ||
    /\/([de])\/[a-zA-Z0-9_\-]+/i.test(url);

  if (isVidmonstrFamily && parsedOrigin) {
    if (url.includes('stream.php')) {
      try {
        const res = await client.get(url, {
          headers: DEFAULT_HEADERS
        });
        const html = typeof res.data === 'string' ? res.data : '';
        const $ = cheerio.load(html);
        const m3u8Match = html.match(/https:\/\/[^"'\s<>]+\.m3u8/);
        const srcMatch = html.match(/<source[^>]+src=['"]([^'"]+)['"]/i) || html.match(/src:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i);
        const videoSrc = $('video source').attr('src') || (srcMatch ? srcMatch[1] : (m3u8Match ? m3u8Match[0] : url));
        const poster = $('video').attr('poster') || null;
        const titleMatch = html.match(/"title":\s*"([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : ($('title').text().trim() || 'Video HD');

        return {
          status: 'success',
          code: 200,
          platform: 'video',
          type: 'video',
          id: 'video',
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

    const resolved = await resolveVidmonstrVideo(url, parsedOrigin);
    if (resolved) {
      return {
        status: 'success',
        code: 200,
        platform: 'video',
        type: 'video',
        id: 'video',
        title: resolved.title,
        cover: resolved.cover,
        author: {
          name: 'Video Creator',
          username: '',
          avatar: resolved.cover
        },
        downloads: {
          video: resolved.url,
          video_hd: resolved.url,
          audio: null,
          media: [
            {
              type: 'video',
              url: resolved.url,
              thumbnail: resolved.cover,
              download: resolved.url
            }
          ]
        }
      };
    }
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
    const res = await client.get(url, {
      headers: DEFAULT_HEADERS
    });
    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    let foundVideo = null;
    let foundPoster = $('video').attr('poster') || $('meta[property="og:image"]').attr('content') || null;
    let foundTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Video HD';

    $('video source').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !foundVideo && (src.includes('.mp4') || src.includes('.m3u8') || src.includes('.webm'))) {
        foundVideo = src;
      }
    });

    if (!foundVideo) {
      const vidAttr = $('video').attr('src');
      if (vidAttr && (vidAttr.includes('.mp4') || vidAttr.includes('.m3u8') || vidAttr.includes('.webm'))) {
        foundVideo = vidAttr;
      }
    }

    if (!foundVideo) {
      const m3u8Match = html.match(/https:\/\/[^"'\s<>]+\.m3u8/);
      const mp4Match = html.match(/https:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/);
      if (m3u8Match) foundVideo = m3u8Match[0];
      else if (mp4Match) foundVideo = mp4Match[0];
    }

    if (foundVideo) {
      return {
        status: 'success',
        code: 200,
        platform: 'video',
        type: 'video',
        id: 'video',
        title: foundTitle,
        cover: foundPoster,
        author: {
          name: 'Video Creator',
          username: '',
          avatar: foundPoster
        },
        downloads: {
          video: foundVideo,
          video_hd: foundVideo,
          audio: null,
          media: [
            {
              type: 'video',
              url: foundVideo,
              thumbnail: foundPoster,
              download: foundVideo
            }
          ]
        }
      };
    }
  } catch (e) {}

  throw new Error('Tidak dapat menemukan aliran video dari tautan yang diberikan.');
}

module.exports = {
  downloadVideo
};
