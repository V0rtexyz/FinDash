#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: node scripts/check-coverage.cjs <threshold-percent>');
  process.exit(2);
}

const arg = process.argv[2];
if (!arg || isNaN(Number(arg))) usage();
const threshold = Number(arg);

const coverageFile = path.resolve(process.cwd(), 'coverage', 'coverage-final.json');
if (!fs.existsSync(coverageFile)) {
  console.error('Coverage file not found:', coverageFile);
  process.exit(3);
}

const raw = fs.readFileSync(coverageFile, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse coverage JSON:', err.message);
  process.exit(4);
}

let totalLines = 0;
let coveredLines = 0;
for (const file of Object.keys(data)) {
  const entry = data[file];
  if (entry && entry.lines && typeof entry.lines.total === 'number') {
    totalLines += entry.lines.total;
    coveredLines += entry.lines.covered || 0;
  }
}

const percent = totalLines === 0 ? 100 : (coveredLines / totalLines) * 100;
const rounded = Math.round(percent * 100) / 100;
console.log(`Coverage: ${rounded}% (${coveredLines}/${totalLines} lines)`);
if (percent + 1e-9 < threshold) {
  console.error(`Coverage below ${threshold}%, failing.`);
  process.exit(1);
}
process.exit(0);
