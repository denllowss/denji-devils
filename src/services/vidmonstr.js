const { downloadVideo } = require('./video');

async function downloadVidmonstr(url) {
  return downloadVideo(url);
}

module.exports = {
  downloadVidmonstr
};
