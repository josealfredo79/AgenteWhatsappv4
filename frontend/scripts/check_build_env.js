#!/usr/bin/env node
const { execSync } = require('child_process');
const semverCompare = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

try {
  const nodeV = process.version.replace(/^v/, '');
  const npmV = execSync('npm -v', { encoding: 'utf8' }).trim();
  console.log('=== Build environment check ===');
  console.log('Node version:', nodeV);
  console.log('npm version :', npmV);

  // Require Node >=20.9.0 for Next.js
  const required = '20.9.0';
  if (semverCompare(nodeV, required) < 0) {
    console.error(`\nERROR: Node ${required} or higher is required by Next.js. Detected ${nodeV}.`);
    console.error('If you are deploying on Railway, ensure Nixpacks uses nodejs_20 or set the builder to NIXPACKS.');
    process.exit(1);
  }

  console.log('Node version is OK (>= ' + required + ')');

  // Check presence of critical dependencies after npm ci
  try {
    console.log('\nListing installed production dependencies (top-level):');
    const installed = execSync('npm ls @anthropic-ai/sdk googleapis twilio --depth=0', { encoding: 'utf8', stdio: 'pipe' });
    console.log(installed);
  } catch (err) {
    console.warn('\nWarning: some production dependencies may be missing.\nOutput:');
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    // Fail the build so logs show the root cause clearly
    console.error('\nERROR: Missing required runtime dependency. Ensure these packages are in `dependencies` and `npm ci` succeeds.');
    process.exit(1);
  }

  console.log('All critical checks passed. Proceeding with build.');
  process.exit(0);
} catch (err) {
  console.error('Unexpected error while checking build environment:', err && err.message ? err.message : err);
  process.exit(1);
}
