#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

class JsonFileRepository {
  constructor(filePath, expectedName) {
    this.filePath = filePath;
    this.expectedName = expectedName;
  }

  readArray() {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(`${this.expectedName} file must contain a JSON array.`);
    }

    return parsed;
  }

  writeArray(items) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
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

    return { title, director, year, duration, desc, genres, poster };
  }
}

class SimilarityValidator {
  static sanitize(pair) {
    if (!Array.isArray(pair) || pair.length !== 2) return null;

    const first = typeof pair[0] === 'string' ? pair[0].trim() : '';
    const second = typeof pair[1] === 'string' ? pair[1].trim() : '';

    if (!first || !second || first.toLowerCase() === second.toLowerCase()) {
      return null;
    }

    return [first, second];
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

class PromptBuilder {
  buildMoviePrompt(existingTitles, existingSimilarities, count) {
    return [
      `Generate ${count} unique movies NOT present in the existing title list.`,
      'Return JSON only: an array of movie objects with fields:',
      'title, director, year, duration, desc, genres, poster.',
      'Genres should be broad labels like Drama, Comedy, Sci-Fi, Thriller, Action, Romance, Horror.',
      'Poster should be a URL string or empty string if unknown.',
      `Existing titles to avoid: ${JSON.stringify(existingTitles)}`,
      `Existing similarity pairs for style/context (do not duplicate): ${JSON.stringify(existingSimilarities.slice(0, 100))}`
    ].join('\n');
  }

  buildSimilarityPrompt(newMovies, catalogTitles, existingSimilarities) {
    return [
      'Create similarity links for newly generated movies.',
      'Return JSON only: an array of [titleA, titleB] pairs.',
      'Rules:',
      '- Use only titles from the provided catalog and new movies.',
      '- At least one title in each pair must be a NEW movie.',
      '- Do not repeat existing similarity pairs.',
      '- No self-pairs.',
      `New movies: ${JSON.stringify(newMovies.map((movie) => ({ title: movie.title, genres: movie.genres, year: movie.year })))}`,
      `All catalog titles: ${JSON.stringify(catalogTitles)}`,
      `Existing similarity pairs to avoid: ${JSON.stringify(existingSimilarities.slice(0, 200))}`
    ].join('\n');
  }
}

class CatalogMerger {
  dedupeMoviesByTitle(movies) {
    const seen = new Set();
    return movies.filter((movie) => {
      const key = movie.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  mergeSimilarities(existingPairs, generatedPairs, knownTitles) {
    const knownTitleKeys = new Set(knownTitles.map((title) => title.toLowerCase()));
    const pairKeySet = new Set();
    const merged = [];

    const pushPair = (pair) => {
      const sanitized = SimilarityValidator.sanitize(pair);
      if (!sanitized) return;

      const [a, b] = sanitized;
      const keyA = a.toLowerCase();
      const keyB = b.toLowerCase();

      if (!knownTitleKeys.has(keyA) || !knownTitleKeys.has(keyB)) return;

      const [left, right] = keyA < keyB ? [a, b] : [b, a];
      const pairKey = `${left.toLowerCase()}::${right.toLowerCase()}`;

      if (pairKeySet.has(pairKey)) return;

      pairKeySet.add(pairKey);
      merged.push([left, right]);
    };

    existingPairs.forEach(pushPair);
    generatedPairs.forEach(pushPair);

    return merged;
  }
}

class MovieCatalogUpdater {
  constructor({
    moviesRepository,
    similaritiesRepository,
    ollamaClient,
    promptBuilder,
    catalogMerger
  }) {
    this.moviesRepository = moviesRepository;
    this.similaritiesRepository = similaritiesRepository;
    this.ollamaClient = ollamaClient;
    this.promptBuilder = promptBuilder;
    this.catalogMerger = catalogMerger;
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

  run({ count, dryRun }) {
    const currentMovies = this.moviesRepository.readArray();
    const currentSimilarities = this.similaritiesRepository.readArray();
    const existingTitles = currentMovies.map((movie) => movie.title);

    const moviePrompt = this.promptBuilder.buildMoviePrompt(existingTitles, currentSimilarities, count);
    const rawMovieResponse = this.ollamaClient.generate(moviePrompt);
    const generatedMovies = this.extractJsonArray(rawMovieResponse)
      .map((movie) => MovieValidator.sanitize(movie))
      .filter(Boolean);

    const mergedMovies = this.catalogMerger.dedupeMoviesByTitle([...currentMovies, ...generatedMovies]);
    const newMovies = mergedMovies.slice(currentMovies.length);

    const similarityPrompt = this.promptBuilder.buildSimilarityPrompt(
      newMovies,
      mergedMovies.map((movie) => movie.title),
      currentSimilarities
    );

    const rawSimilarityResponse = this.ollamaClient.generate(similarityPrompt);
    const generatedSimilarities = this.extractJsonArray(rawSimilarityResponse);

    const mergedSimilarities = this.catalogMerger.mergeSimilarities(
      currentSimilarities,
      generatedSimilarities,
      mergedMovies.map((movie) => movie.title)
    );

    if (!dryRun) {
      this.moviesRepository.writeArray(mergedMovies);
      this.similaritiesRepository.writeArray(mergedSimilarities);
    }

    return {
      generatedMovieCount: generatedMovies.length,
      addedMovieCount: mergedMovies.length - currentMovies.length,
      totalMovieCount: mergedMovies.length,
      generatedSimilarityCount: generatedSimilarities.length,
      addedSimilarityCount: mergedSimilarities.length - currentSimilarities.length,
      totalSimilarityCount: mergedSimilarities.length,
      dryRun
    };
  }
}

function parseArgs(argv) {
  const options = {
    count: 5,
    model: process.env.OLLAMA_MODEL || 'cinematch-movie-curator',
    moviesFile: path.resolve(__dirname, '../../src/db/movies.json'),
    similaritiesFile: path.resolve(__dirname, '../../src/db/similarities.json'),
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--count') options.count = Number.parseInt(argv[index + 1], 10);
    if (arg === '--model') options.model = argv[index + 1];
    if (arg === '--movies-file') options.moviesFile = path.resolve(argv[index + 1]);
    if (arg === '--similarities-file') options.similaritiesFile = path.resolve(argv[index + 1]);
    if (arg === '--dry-run') options.dryRun = true;
  }

  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 25) {
    throw new Error('`--count` must be an integer between 1 and 25.');
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  const updater = new MovieCatalogUpdater({
    moviesRepository: new JsonFileRepository(options.moviesFile, 'Movies'),
    similaritiesRepository: new JsonFileRepository(options.similaritiesFile, 'Similarities'),
    ollamaClient: new OllamaClient(options.model),
    promptBuilder: new PromptBuilder(),
    catalogMerger: new CatalogMerger()
  });

  const result = updater.run({ count: options.count, dryRun: options.dryRun });

  console.log(
    `[movie-updater] movies_generated=${result.generatedMovieCount} movies_added=${result.addedMovieCount} movies_total=${result.totalMovieCount} similarities_generated=${result.generatedSimilarityCount} similarities_added=${result.addedSimilarityCount} similarities_total=${result.totalSimilarityCount} dryRun=${result.dryRun}`
  );
}

main();
