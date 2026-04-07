#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getFormattedDateTime() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  // Colon is not valid in Windows filenames; use dot as separator (e.g. 2.33PM)
  return `${dd}-${mm}-${yy}-${hours}.${minutes}${ampm}`;
}

const backendDir = path.resolve(__dirname, '..');
const historyDir = path.resolve(backendDir, 'tests', 'history');
const timestamp = getFormattedDateTime();
const reportFile = path.join(historyDir, `unit-test-${timestamp}.txt`);

let output = '';
let exitCode = 0;

try {
  output = execSync('npx jest --runInBand --verbose', {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  output = (err.stdout || '') + (err.stderr || '');
  exitCode = err.status || 1;
}

process.stdout.write(output);
fs.writeFileSync(reportFile, output, 'utf8');
console.error(`\nTest report saved to: ${reportFile}`);

process.exit(exitCode);
