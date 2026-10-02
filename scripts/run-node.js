// Pakai Node yang menjalankan npm. Peer dependency "node" milik downloader
// memasang node_modules/.bin/node dan dapat membayangi runtime project.
const { spawnSync } = require('node:child_process');
const executable = process.env.npm_node_execpath || process.execPath;
const result = spawnSync(executable, process.argv.slice(2), { stdio: 'inherit' });
if (result.error) {
  console.error('Tidak dapat menjalankan Node project:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
