#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

class MovieRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  readMovies() {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Movies file must contain a JSON array.');
    }
    return parsed;
  }

  writeMovies(movies) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(movies, null, 2)}\n`, 'utf8');
  }
}

class MovieValidator {
  static isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  static sanitize(movie) {
    if (!movie || typeof movie !== 'object') return null;

    const title = typeof movie.title === 'string' ? movie.title.trim() : '';
    const director = typeof movie.director === 'string' ? movie.director.trim() : '';
    const desc = typeof movie.desc === 'string' ? movie.desc.trim() : '';
    const poster = typeof movie.poster === 'string' ? movie.poster.trim() : '';

    const year = Number.parseInt(movie.year, 10);
    const duration = Number.parseInt(movie.duration, 10);

    const genres = Array.isArray(movie.genres)
      ? movie.genres
          .filter((genre) => typeof genre === 'string' && genre.trim().length > 0)
          .map((genre) => genre.trim())
      : [];

    const currentYear = new Date().getFullYear();
    const isValid =
      this.isNonEmptyString(title) &&
      this.isNonEmptyString(director) &&
      this.isNonEmptyString(desc) &&
      Number.isInteger(year) &&
      year >= 1950 &&
      year <= currentYear &&
      Number.isInteger(duration) &&
      duration >= 75 &&
      duration <= 240 &&
      genres.length > 0 &&
      genres.length <= 4;

    if (!isValid) return null;

    return {
      title,
      director,
      year,
      duration,
      desc,
      genres,
      poster
    };
  }
}

class OllamaClient {
  constructor(modelName) {
    this.modelName = modelName;
  }

  generate(prompt) {
    return execFileSync('ollama', ['run', this.modelName, prompt], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024
    });
  }
}

class MovieListUpdater {
  constructor({ repository, ollamaClient }) {
    this.repository = repository;
    this.ollamaClient = ollamaClient;
  }

  buildPrompt(existingTitles, count) {
    return [
      `Generate ${count} unique movies NOT present in the existing title list.`,
      'Return JSON only: an array of movie objects with fields:',
      'title, director, year, duration, desc, genres, poster.',
      'Genres should be broad labels like Drama, Comedy, Sci-Fi, Thriller, Action, Romance, Horror.',
      'Poster should be a URL string or empty string if unknown.',
      `Existing titles to avoid: ${JSON.stringify(existingTitles)}`
    ].join('\n');
  }

  extractJsonArray(rawText) {
    const start = rawText.indexOf('[');
    const end = rawText.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Ollama response did not contain a JSON array.');
    }

    const candidate = rawText.slice(start, end + 1);
    const parsed = JSON.parse(candidate);
    if (!Array.isArray(parsed)) {
      throw new Error('Ollama response JSON was not an array.');
    }
    return parsed;
  }

  dedupeByTitle(movies) {
    const seen = new Set();
    return movies.filter((movie) => {
      const key = movie.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  run({ count, dryRun }) {
    const currentMovies = this.repository.readMovies();
    const existingTitles = currentMovies.map((movie) => movie.title);

    const prompt = this.buildPrompt(existingTitles, count);
    const rawResponse = this.ollamaClient.generate(prompt);
    const generated = this.extractJsonArray(rawResponse)
      .map((movie) => MovieValidator.sanitize(movie))
      .filter(Boolean);

    const merged = this.dedupeByTitle([...currentMovies, ...generated]);
    const addedCount = merged.length - currentMovies.length;

    if (!dryRun) {
      this.repository.writeMovies(merged);
    }

    return {
      addedCount,
      generatedCount: generated.length,
      totalCount: merged.length,
      dryRun
    };
  }
}

function parseArgs(argv) {
  const options = {
    count: 5,
    model: process.env.OLLAMA_MODEL || 'cinematch-movie-curator',
    moviesFile: path.resolve(__dirname, '../../src/db/movies.json'),
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--count') options.count = Number.parseInt(argv[index + 1], 10);
    if (arg === '--model') options.model = argv[index + 1];
    if (arg === '--movies-file') options.moviesFile = path.resolve(argv[index + 1]);
    if (arg === '--dry-run') options.dryRun = true;
  }

  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 25) {
    throw new Error('`--count` must be an integer between 1 and 25.');
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  const updater = new MovieListUpdater({
    repository: new MovieRepository(options.moviesFile),
    ollamaClient: new OllamaClient(options.model)
  });

  const result = updater.run({ count: options.count, dryRun: options.dryRun });

  console.log(
    `[movie-updater] generated=${result.generatedCount} added=${result.addedCount} total=${result.totalCount} dryRun=${result.dryRun}`
  );
}

main();
