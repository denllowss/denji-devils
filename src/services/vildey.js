const { downloadVideo } = require('./video');

async function downloadVildey(url) {
  return downloadVideo(url);
}

module.exports = {
  downloadVildey
};
