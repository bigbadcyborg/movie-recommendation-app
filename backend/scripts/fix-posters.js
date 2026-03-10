#!/usr/bin/env node

/**
 * fix-posters.js
 *
 * One-time utility to repair missing or broken poster URLs in movies.json.
 * For each movie without a working poster, queries the DuckDuckGo Instant Answer
 * API (no API key required) and extracts the image field.
 *
 * Usage:
 *   node scripts/fix-posters.js           # Fix and save
 *   node scripts/fix-posters.js --dry-run # Preview only, no writes
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const MOVIES_PATH = path.resolve(__dirname, '../src/db/movies.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Patterns that indicate a placeholder or AI-invented URL
const BROKEN_URL_PATTERNS = [
  /\/00000f0d/,
  /\/w3o\//,
  /example\.com/i,
  /placeholder/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, // UUID
];

function isBrokenUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  return BROKEN_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'CineMatch/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function fetchPoster(title, year) {
  // Try Wikipedia REST API — free, no key, returns reliable thumbnails
  // Attempt common article naming patterns for films
  const candidates = [
    `${title}_(${year}_film)`,
    `${title}_(film)`,
    title,
  ];

  for (const candidate of candidates) {
    const slug = encodeURIComponent(candidate.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
    try {
      const { statusCode, body } = await httpsGet(url);
      if (statusCode !== 200) continue;
      const data = JSON.parse(body);
      if (data.thumbnail && data.thumbnail.source) return data.thumbnail.source;
    } catch { /* try next candidate */ }
  }
  return '';
}

async function main() {
  const movies = JSON.parse(fs.readFileSync(MOVIES_PATH, 'utf8'));

  const seenTitles = new Set();
  const deduped = [];
  let fixed = 0;
  let notFound = 0;
  let alreadyValid = 0;
  let duplicatesRemoved = 0;

  for (const movie of movies) {
    const key = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Remove duplicate titles (e.g. Schindler"s List added alongside Schindlers List)
    if (seenTitles.has(key)) {
      console.log(`  🗑  Duplicate removed: "${movie.title}"`);
      duplicatesRemoved++;
      continue;
    }
    seenTitles.add(key);
    deduped.push(movie);

    process.stdout.write(`  🔍 Fetching poster: "${movie.title}" (${movie.year})... `);
    const poster = await fetchPoster(movie.title, movie.year);

    if (poster) {
      console.log('found');
      if (!DRY_RUN) movie.poster = poster;
      fixed++;
    } else {
      console.log('not found (keeping existing)');
      notFound++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`  ✅ Fixed:              ${fixed}`);
  console.log(`  ✗  No poster found:    ${notFound}`);
  console.log(`  🗑  Duplicates removed: ${duplicatesRemoved}`);

  if (DRY_RUN) {
    console.log('\n[dry-run] No changes written.');
    return;
  }

  fs.writeFileSync(MOVIES_PATH, `${JSON.stringify(deduped, null, 2)}\n`, 'utf8');
  console.log(`\n✅ Wrote ${deduped.length} movies to movies.json`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
