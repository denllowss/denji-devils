// IQC5 UI contract: all-model image Playground plus its dedicated editor.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
for (const file of ["verify-iqc-playground.js", "verify-iqc5-editor.js"]) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status) process.exit(result.status);
}
