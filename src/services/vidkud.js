const { downloadVideo } = require('./video');

async function downloadVidkud(url) {
  return downloadVideo(url);
}

module.exports = {
  downloadVidkud
};
