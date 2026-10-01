const { downloadVideo } = require('./video');

async function downloadVidovr(url) {
  return downloadVideo(url);
}

module.exports = {
  downloadVidovr
};
