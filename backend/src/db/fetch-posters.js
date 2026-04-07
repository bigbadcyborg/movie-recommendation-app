require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const MOVIES_PATH = path.join(__dirname, 'movies.json');
const FALLBACK_POSTER = 'https://dummyimage.com/300x450/cccccc/000000.jpg&text=No+Poster';

// Check if image URL is valid and returns an actual image
const checkUrl = (url) => new Promise((resolve) => {
    if (!url || url.includes('dummyimage.com') || url.includes('No-Image-Placeholder')) {
        return resolve({ isValid: false, status: null });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (e) {
        return resolve({ isValid: false, error: e.message });
    }

    if (parsedUrl.protocol !== 'https:') {
        return resolve({ isValid: false, error: 'Unsupported URL protocol' });
    }

    try {
        https.get(parsedUrl, (res) => {
            let bytes = 0;
            res.on('data', d => bytes += d.length);
            res.on('end', () => {
                const isValid = res.statusCode === 200 && bytes > 1000;
                resolve({ isValid, status: res.statusCode, bytes });
            });
        }).on('error', (e) => {
            resolve({ isValid: false, error: e.message });
        });
    } catch (e) {
        resolve({ isValid: false, error: e.message });
    }
});

const fetchPosterFromOMDb = (title, year) => new Promise((resolve) => {
    if (!OMDB_API_KEY) {
        console.warn('OMDB_API_KEY is not set. Skipping API calls.');
        return resolve(null);
    }
    const query = encodeURIComponent(title);
    const url = `https://www.omdbapi.com/?t=${query}&y=${year}&apikey=${OMDB_API_KEY}`;
    
    https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
                    resolve(data.Poster);
                } else {
                    resolve(null);
                }
            } catch (e) {
                resolve(null);
            }
        });
    }).on('error', () => resolve(null));
});

(async () => {
    console.log('Validating movie posters...');
    let movies = [];
    try {
        movies = JSON.parse(fs.readFileSync(MOVIES_PATH, 'utf8'));
    } catch (e) {
        console.error('Could not read movies.json', e.message);
        process.exit(1);
    }

    let updatedCount = 0;
    let hasChanges = false;

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        
        let needNewPoster = false;
        
        if (!movie.poster) {
            needNewPoster = true;
        } else {
            // Validate existing poster
            const result = await checkUrl(movie.poster);
            if (!result.isValid) {
                console.log(`[Missing/Broken Poster] ${movie.title} (Status Check Failed)`);
                needNewPoster = true;
            }
        }

        if (needNewPoster) {
            console.log(`Fetching new poster for: ${movie.title} (${movie.year})`);
            const newPoster = await fetchPosterFromOMDb(movie.title, movie.year);
            if (newPoster) {
                movie.poster = newPoster;
                updatedCount++;
                hasChanges = true;
                console.log(`  -> Success: ${newPoster}`);
            } else {
                console.log(`  -> Failed to find poster for ${movie.title}`);
                movie.poster = FALLBACK_POSTER;
                hasChanges = true;
            }
        }
    }

    if (hasChanges) {
        fs.writeFileSync(MOVIES_PATH, JSON.stringify(movies, null, 2) + '\n');
        console.log(`\nUpdated ${updatedCount} posters in movies.json`);
    } else {
        console.log('\nAll movie posters are valid. No updates needed.');
    }
})();