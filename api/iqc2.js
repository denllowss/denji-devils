// Handler v2 tersendiri: tidak bergantung pada injeksi query di rewrite Vercel.
const iqc = require('./iqc');

module.exports = (req, res) => {
  const url = new URL(req.url, 'http://iqc.local');
  url.searchParams.set('v2', '1');
  req.url = url.pathname + '?' + url.searchParams.toString();
  return iqc(req, res);
};
