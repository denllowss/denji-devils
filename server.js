const express = require('express');
const path = require('path');
const { downloadTikTok } = require('./src/services/tiktok');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

async function handleDownload(req, res) {
  const url = req.query.url || req.body?.url;

  if (!url) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: 'Parameter URL TikTok wajib diisi',
      usage: {
        get: '/dl?url=https://www.tiktok.com/@username/video/1234567890',
        post: {
          endpoint: '/dl',
          headers: { 'Content-Type': 'application/json' },
          body: { url: 'https://www.tiktok.com/@username/video/1234567890' }
        }
      }
    });
  }

  try {
    const result = await downloadTikTok(url);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: err.message || 'Gagal memproses unduhan TikTok'
    });
  }
}

app.get('/dl', handleDownload);
app.post('/dl', handleDownload);
app.get('/api/dl', handleDownload);
app.post('/api/dl', handleDownload);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/profile', (req, res) => {
  res.json({
    title: 'Denji Web',
    name: 'denji',
    bio: 'harvey, nobody know what i see',
    verified: true,
    links: [
      {
        title: 'Channel Wa (koleksi sticker)',
        url: 'https://whatsapp.com/channel/0029VbBDyGpEFeXu4KTwvo08'
      },
      {
        title: 'Nomor wa',
        url: 'https://wa.me/18674678687'
      }
    ],
    socials: [
      { platform: 'instagram', url: 'https://instagram.com' },
      { platform: 'tiktok', url: 'https://www.tiktok.com/@inidenjiww?_r=1&_t=ZS-98NmL8bGBee' },
      { platform: 'pinterest', url: 'https://www.pinterest.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
      { platform: 'email', url: 'mailto:nothing@mail.lol' }
    ]
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
