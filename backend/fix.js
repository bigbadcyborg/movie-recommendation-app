const fs = require('fs');
const moviesFile = 'src/db/movies.json';
const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));

const casa = movies.find(m => m.title === 'Casablanca');
if (casa) casa.poster = 'https://m.media-amazon.com/images/M/MV5BY2IzZGY2YmEtYzljNS00NTM5LTgwMzUtMzE1NmQ4YTk5NDEwXkEyXkFqcGc@._V1_SX300.jpg';

const good = movies.find(m => m.title === 'The Good, the Bad and the Ugly');
if (good) good.poster = 'https://m.media-amazon.com/images/M/MV5BOTQ5NDI3MTI4MF5BMl5BanBnXkFtZTgwNDQ4ODE5MDE@._V1_SX300.jpg';

const once = movies.find(m => m.title === 'Once Upon a Time in the West');
if (once) once.poster = 'https://m.media-amazon.com/images/M/MV5BODQ3NDExMzI0MV5BMl5BanBnXkFtZTcwNDAxMzI3MQ@@._V1_SX300.jpg';

fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2) + '\n');
console.log('Fixed posters');
