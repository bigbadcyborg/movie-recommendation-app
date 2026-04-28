const fs = require('fs');
const moviesFile = 'src/db/movies.json';
const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));

const C = movies.filter(m => m.title === 'Casablanca' || m.title === 'Once Upon a Time in the West');
C.forEach(m => m.poster = 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX300.jpg');

fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2) + '\n');
