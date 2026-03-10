const { initializeSchema } = require('./schema');
const { runQuery, getOne, getAll, saveDb } = require('./database');
const bcrypt = require('bcryptjs');

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const MOVIES = [
  { title: 'The Shawshank Redemption', director: 'Frank Darabont', year: 1994, duration: 142, desc: 'A banker convicted of uxoricide forms a life-changing friendship with a fellow inmate as they find solace and eventual redemption through acts of common decency.', genres: ['Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Godfather', director: 'Francis Ford Coppola', year: 1972, duration: 175, desc: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.', genres: ['Crime', 'Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BYTJkNGQyZDgtZDQ0NC00MDM0LWEzZWQtYzUzZDEwMDljZWNjXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Dark Knight', director: 'Christopher Nolan', year: 2008, duration: 152, desc: 'When a menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', genres: ['Action', 'Crime', 'Drama', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg' },
  { title: 'Pulp Fiction', director: 'Quentin Tarantino', year: 1994, duration: 154, desc: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', genres: ['Crime', 'Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Forrest Gump', director: 'Robert Zemeckis', year: 1994, duration: 142, desc: 'The history of the United States from the 1950s to the 70s unfolds from the perspective of an Alabama man with an IQ of 75, who yearns to be reunited with his childhood sweetheart.', genres: ['Drama', 'Romance'], poster: 'https://m.media-amazon.com/images/M/MV5BNDYwNzVjMTItZmU5YS00YjQ5LTljYjgtMjY2NDVhYWU2ZjFmXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Inception', director: 'Christopher Nolan', year: 2010, duration: 148, desc: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', genres: ['Action', 'Adventure', 'Sci-Fi', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg' },
  { title: 'The Matrix', director: 'Lana Wachowski', year: 1999, duration: 136, desc: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth: the life he knows is the elaborate deception of an evil cyber-intelligence.', genres: ['Action', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZTY0ODQyNDL0XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Interstellar', director: 'Christopher Nolan', year: 2014, duration: 169, desc: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked with piloting a spacecraft along with a team of researchers to find a new planet for humans.', genres: ['Adventure', 'Drama', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Gladiator', director: 'Ridley Scott', year: 2000, duration: 155, desc: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.', genres: ['Action', 'Adventure', 'Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BYWQ4YmNjYjEtOWE1Zi00Y2U4LWI4NTAtMTU0MjkxNWQ1ZmJiXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Lord of the Rings: The Fellowship of the Ring', director: 'Peter Jackson', year: 2001, duration: 178, desc: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.', genres: ['Action', 'Adventure', 'Drama', 'Fantasy'], poster: 'https://m.media-amazon.com/images/M/MV5BNzIxMDQ2YTctNDY4MC00ZTRhLTk4ODQtMTVlOGY3NTVmMDVhXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Fight Club', director: 'David Fincher', year: 1999, duration: 139, desc: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.', genres: ['Drama', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Goodfellas', director: 'Martin Scorsese', year: 1990, duration: 146, desc: 'The story of Henry Hill and his life in the mafia, covering his relationship with his wife Karen and his mob partners.', genres: ['Crime', 'Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BY2NkZjEzMDgtN2RjYy00YzM1LWI4ZmQtMjIwYjFjNmI3ZGEwXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Silence of the Lambs', director: 'Jonathan Demme', year: 1991, duration: 118, desc: 'A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.', genres: ['Crime', 'Drama', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BNDdhOGJhYzctNzZkOS00OWZmLTk0ODgtNGI1NDY4OWI4N2Q4XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Saving Private Ryan', director: 'Steven Spielberg', year: 1998, duration: 169, desc: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.', genres: ['Drama', 'War'], poster: 'https://m.media-amazon.com/images/M/MV5BZjhkMDM4MWQtZTVjOC00ZDRhLThmYTAtM2I5NzBmNmNlMzI1XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Jurassic Park', director: 'Steven Spielberg', year: 1993, duration: 127, desc: 'A pragmatic paleontologist touring an almost complete theme park on an island is tasked with protecting a couple of kids after a power failure causes the parks cloned dinosaurs to run loose.', genres: ['Action', 'Adventure', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BMjM2MDgxMDg0Nl5BMl5BanBnXkFtZTgwNTM2OTM5NDE@._V1_SX300.jpg' },
  { title: 'The Departed', director: 'Martin Scorsese', year: 2006, duration: 151, desc: 'An undercover cop and a mole in the police attempt to identify each other while infiltrating an Irish gang in South Boston.', genres: ['Crime', 'Drama', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BMTI1MTY2OTIxNV5BMl5BanBnXkFtZTYwNjQ4NjY3._V1_SX300.jpg' },
  { title: 'Whiplash', director: 'Damien Chazelle', year: 2014, duration: 106, desc: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a students potential.', genres: ['Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BOTA5NDZlZGUtMjAxOS00YTRhLWJlYmMtYzNhMjgyOWQxMjI0XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Spirited Away', director: 'Hayao Miyazaki', year: 2001, duration: 125, desc: 'During her familys move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches and spirits, and where humans are changed into beasts.', genres: ['Animation', 'Adventure', 'Fantasy'], poster: 'https://m.media-amazon.com/images/M/MV5BMjlmZmI5MDctNDE2YS00YWE0LWE5ZWItZDBhYWQ0NTcxNWRhXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Parasite', director: 'Bong Joon Ho', year: 2019, duration: 132, desc: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', genres: ['Comedy', 'Drama', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Grand Budapest Hotel', director: 'Wes Anderson', year: 2014, duration: 99, desc: 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotels glorious years under an exceptional concierge.', genres: ['Adventure', 'Comedy', 'Crime'], poster: 'https://m.media-amazon.com/images/M/MV5BMzM5NjUxOTEyMl5BMl5BanBnXkFtZTgwNjEyMDM0MDE@._V1_SX300.jpg' },
  { title: 'Mad Max: Fury Road', director: 'George Miller', year: 2015, duration: 120, desc: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners, a psychotic worshiper and a drifter named Max.', genres: ['Action', 'Adventure', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BZDRkODJhOGYtYzc4MC00ZTcwLThjZGYtNGU1MzgyMjg5YjI2XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Get Out', director: 'Jordan Peele', year: 2017, duration: 104, desc: 'A young African-American visits his white girlfriends parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.', genres: ['Horror', 'Mystery', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BMjUxMDQwNjcyNl5BMl5BanBnXkFtZTgwNzcwMzc0MTI@._V1_SX300.jpg' },
  { title: 'La La Land', director: 'Damien Chazelle', year: 2016, duration: 128, desc: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.', genres: ['Comedy', 'Drama', 'Romance'], poster: 'https://m.media-amazon.com/images/M/MV5BMzUzNDM2NzM2MV5BMl5BanBnXkFtZTgwNTM3NTg4OTE@._V1_SX300.jpg' },
  { title: 'Alien', director: 'Ridley Scott', year: 1979, duration: 117, desc: 'The crew of a commercial spacecraft encounters a deadly lifeform after investigating an unknown transmission.', genres: ['Horror', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BOGQwMDhkZGEtMjRiYS00NDY2LWE2NjItNWQxNzRjOTg3NDUzXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Prestige', director: 'Christopher Nolan', year: 2006, duration: 130, desc: 'After a tragic accident, two stage magicians in 1890s London engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.', genres: ['Drama', 'Mystery', 'Sci-Fi', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BMjA4NDI0MTIxNF5BMl5BanBnXkFtZTYwNTM0MzY2._V1_SX300.jpg' },
  { title: 'Django Unchained', director: 'Quentin Tarantino', year: 2012, duration: 165, desc: 'With the help of a German bounty-hunter, a freed slave sets out to rescue his wife from a brutal plantation owner in the Deep South.', genres: ['Drama', 'Western'], poster: 'https://m.media-amazon.com/images/M/MV5BMjIyNTQ5NjQ1OV5BMl5BanBnXkFtZTcwODg1MDU4OA@@._V1_SX300.jpg' },
  { title: 'WALL-E', director: 'Andrew Stanton', year: 2008, duration: 98, desc: 'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will ultimately decide the fate of mankind.', genres: ['Animation', 'Adventure', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BMjExMTg5OTU0NF5BMl5BanBnXkFtZTcwMjMxMzMzMQ@@._V1_SX300.jpg' },
  { title: 'The Truman Show', director: 'Peter Weir', year: 1998, duration: 103, desc: 'An insurance salesman discovers his whole life is actually a reality TV show.', genres: ['Comedy', 'Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BMDIzODcyY2EtMmY2MC00ZWVlLTgwMzAtMjQwOWUyNmJlMDU5XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'No Country for Old Men', director: 'Joel Coen', year: 2007, duration: 122, desc: 'Violence and mayhem ensue after a hunter stumbles upon a drug deal gone wrong and more than two million dollars in cash near the Rio Grande.', genres: ['Crime', 'Drama', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BMjA5Njk3MjM4OV5BMl5BanBnXkFtZTcwMTc5MTE1MQ@@._V1_SX300.jpg' },
  { title: 'Blade Runner 2049', director: 'Denis Villeneuve', year: 2017, duration: 164, desc: 'Young Blade Runner Ks discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, whos been missing for thirty years.', genres: ['Action', 'Drama', 'Mystery', 'Sci-Fi', 'Thriller'], poster: 'https://m.media-amazon.com/images/M/MV5BNzA1Njg4NzYxOV5BMl5BanBnXkFtZTgwODk5NjU3MzI@._V1_SX300.jpg' },
  { title: 'Eternal Sunshine of the Spotless Mind', director: 'Michel Gondry', year: 2004, duration: 108, desc: 'When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories forever.', genres: ['Drama', 'Romance', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BMTY4NzcwODg3Nl5BMl5BanBnXkFtZTcwNTEwOTMyMw@@._V1_SX300.jpg' },
  { title: 'The Social Network', director: 'David Fincher', year: 2010, duration: 120, desc: 'As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, he is sued by the twins who claimed he stole their idea.', genres: ['Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BOGUyZDUxZjEtMmIzMi00YzU0LWEzMTctNDBhYjgxNmI2MThlXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Toy Story', director: 'John Lasseter', year: 1995, duration: 81, desc: 'A cowboy doll is profoundly threatened and jealous when a new spaceman action figure supplants him as top toy in a boys bedroom.', genres: ['Animation', 'Adventure', 'Comedy'], poster: 'https://m.media-amazon.com/images/M/MV5BMDU2ZWJlMjktMTRhMy00ZTA5LWEzNDgtMDQzODNlNGE3ZmFlXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Shining', director: 'Stanley Kubrick', year: 1980, duration: 146, desc: 'A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence, while his psychic son sees horrific forebodings.', genres: ['Drama', 'Horror'], poster: 'https://m.media-amazon.com/images/M/MV5BZWFlYmY2MGEtZjVkYS00YzU4LTg0YjQtYzY1ZGE3NTA5NGQxXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Schindlers List', director: 'Steven Spielberg', year: 1993, duration: 195, desc: 'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.', genres: ['Drama', 'War'], poster: 'https://m.media-amazon.com/images/M/MV5BNjM1ZDQxYWUtMzQyZS00MTE1LWJmZGYtNGUyNTdlYjM5MGQ2XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Coco', director: 'Lee Unkrich', year: 2017, duration: 105, desc: 'Aspiring musician Miguel, confronted with his familys ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather, a legendary singer.', genres: ['Animation', 'Adventure', 'Comedy', 'Drama', 'Fantasy'], poster: 'https://m.media-amazon.com/images/M/MV5BYjQ5NjM0Y2YtNjZkNC00ZDhkLWJjMWItN2QyNzFkMDE3ZjAxXkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'The Wolf of Wall Street', director: 'Martin Scorsese', year: 2013, duration: 180, desc: 'Based on the true story of Jordan Belfort, from his rise to a wealthy stock-broker living the high life to his fall involving crime, corruption and the federal government.', genres: ['Comedy', 'Crime', 'Drama'], poster: 'https://m.media-amazon.com/images/M/MV5BMjIxMjgxNTk0MF5BMl5BanBnXkFtZTgwNjIyOTg2MDE@._V1_SX300.jpg' },
  { title: 'A Quiet Place', director: 'John Krasinski', year: 2018, duration: 90, desc: 'In a post-apocalyptic world, a family is forced to live in silence while hiding from monsters with ultra-sensitive hearing.', genres: ['Drama', 'Horror', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BMjI0MDMzNTQ0M15BMl5BanBnXkFtZTgwMTM5NzM3NDM@._V1_SX300.jpg' },
  { title: 'The Princess Bride', director: 'Rob Reiner', year: 1987, duration: 98, desc: 'While home sick in bed, a young boy\'s grandfather reads him the story of a farmboy-turned-pirate who encounters numerous obstacles, enemies and allies in his quest to be reunited with his true love.', genres: ['Adventure', 'Comedy', 'Fantasy', 'Romance'], poster: 'https://m.media-amazon.com/images/M/MV5BYmJkMTYxMjYtNGIxYy00MDQ5LTljMTEtNTI4NWIxMjE0YWY1XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Dunkirk', director: 'Christopher Nolan', year: 2017, duration: 106, desc: 'Allied soldiers from Belgium, the British Commonwealth and Empire, and France are surrounded by the German Army and evacuated during a fierce battle in World War II.', genres: ['Action', 'Drama', 'War'], poster: 'https://m.media-amazon.com/images/M/MV5BZWU0ZTRhODAtOGQyMy00ZmZhLThlNDctNmY3ZTBjMzYxZWI0XkEyXkFqcGc@._V1_SX300.jpg' },
  { title: 'Arrival', director: 'Denis Villeneuve', year: 2016, duration: 116, desc: 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.', genres: ['Drama', 'Mystery', 'Sci-Fi'], poster: 'https://m.media-amazon.com/images/M/MV5BMTExMzU0ODcxNDheQTJeQWpwZ15BbWU4MDE1OTI4MzAy._V1_SX300.jpg' },
];

async function seed() {
  await initializeSchema();

  const existingMovie = getOne('SELECT id FROM movies LIMIT 1');
  if (existingMovie) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  console.log('Seeding database...');

  for (const name of GENRES) {
    runQuery('INSERT INTO genres (name) VALUES (?)', [name]);
  }

  for (const m of MOVIES) {
    runQuery(
      'INSERT INTO movies (title, director, release_year, duration, description, poster_url) VALUES (?, ?, ?, ?, ?, ?)',
      [m.title, m.director, m.year, m.duration, m.desc, m.poster]
    );
    const movie = getOne('SELECT id FROM movies WHERE title = ?', [m.title]);
    for (const genreName of m.genres) {
      const genre = getOne('SELECT id FROM genres WHERE name = ?', [genreName]);
      if (genre && movie) {
        runQuery('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movie.id, genre.id]);
      }
    }
  }

  // Hardcoded similar-movie pairs (bidirectional).
  // Each pair [A, B] means A is similar to B and B is similar to A.
  const SIMILAR_PAIRS = [
    // Drama masterpieces
    ['The Shawshank Redemption', 'The Godfather'],
    ['The Shawshank Redemption', "Schindler's List"],
    ['The Shawshank Redemption', 'Forrest Gump'],
    ['The Shawshank Redemption', 'The Green Mile'],
    // Crime / Mob
    ['The Godfather', 'Goodfellas'],
    ['The Godfather', 'Pulp Fiction'],
    ['The Godfather', 'The Departed'],
    ['The Godfather', 'No Country for Old Men'],
    ['Goodfellas', 'Pulp Fiction'],
    ['Goodfellas', 'The Departed'],
    ['Goodfellas', 'The Wolf of Wall Street'],
    ['Goodfellas', 'Django Unchained'],
    ['Pulp Fiction', 'Django Unchained'],
    ['Pulp Fiction', 'Fight Club'],
    ['Pulp Fiction', 'The Departed'],
    ['The Departed', 'No Country for Old Men'],
    ['The Departed', 'The Silence of the Lambs'],
    ['No Country for Old Men', 'The Silence of the Lambs'],
    ['No Country for Old Men', 'Parasite'],
    // Nolan / mind-benders
    ['The Dark Knight', 'Inception'],
    ['The Dark Knight', 'The Prestige'],
    ['The Dark Knight', 'Interstellar'],
    ['Inception', 'The Prestige'],
    ['Inception', 'Interstellar'],
    ['Inception', 'The Matrix'],
    ['Inception', 'Blade Runner 2049'],
    ['The Matrix', 'Blade Runner 2049'],
    ['The Matrix', 'Interstellar'],
    ['The Matrix', 'Mad Max: Fury Road'],
    ['The Matrix', 'Alien'],
    // Sci-Fi
    ['Interstellar', 'Arrival'],
    ['Interstellar', 'Blade Runner 2049'],
    ['Interstellar', 'WALL-E'],
    ['Blade Runner 2049', 'Arrival'],
    ['Blade Runner 2049', 'Alien'],
    ['Arrival', 'Eternal Sunshine of the Spotless Mind'],
    ['Arrival', 'A Quiet Place'],
    ['Alien', 'A Quiet Place'],
    ['Alien', 'Jurassic Park'],
    ['Jurassic Park', 'Mad Max: Fury Road'],
    // Adventure / Epic
    ['Gladiator', 'The Lord of the Rings: The Fellowship of the Ring'],
    ['Gladiator', 'Saving Private Ryan'],
    ['Gladiator', 'Dunkirk'],
    ['Gladiator', 'Mad Max: Fury Road'],
    ['The Lord of the Rings: The Fellowship of the Ring', 'The Princess Bride'],
    ['The Lord of the Rings: The Fellowship of the Ring', 'Spirited Away'],
    ['Saving Private Ryan', "Schindler's List"],
    ['Saving Private Ryan', 'Dunkirk'],
    ["Schindler's List", 'Dunkirk'],
    // Thriller / Horror
    ['Fight Club', 'The Prestige'],
    ['Fight Club', 'No Country for Old Men'],
    ['The Silence of the Lambs', 'Get Out'],
    ['The Silence of the Lambs', 'Parasite'],
    ['Get Out', 'Parasite'],
    ['Get Out', 'A Quiet Place'],
    ['Get Out', 'The Shining'],
    ['A Quiet Place', 'The Shining'],
    ['The Shining', 'Alien'],
    // Drama / Character
    ['Forrest Gump', 'The Truman Show'],
    ['Forrest Gump', 'La La Land'],
    ['Whiplash', 'La La Land'],
    ['Whiplash', 'The Social Network'],
    ['La La Land', 'The Grand Budapest Hotel'],
    ['La La Land', 'Eternal Sunshine of the Spotless Mind'],
    ['The Truman Show', 'Eternal Sunshine of the Spotless Mind'],
    ['The Truman Show', 'The Grand Budapest Hotel'],
    ['The Social Network', 'The Wolf of Wall Street'],
    // Animation / Family
    ['Spirited Away', 'Princess Bride'],
    ['Spirited Away', 'Coco'],
    ['Spirited Away', 'WALL-E'],
    ['Toy Story', 'WALL-E'],
    ['Toy Story', 'Coco'],
    ['WALL-E', 'Coco'],
    ['The Princess Bride', 'The Grand Budapest Hotel'],
  ];

  let similarityCount = 0;
  for (const [titleA, titleB] of SIMILAR_PAIRS) {
    const movieA = getOne('SELECT id FROM movies WHERE title = ?', [titleA]);
    const movieB = getOne('SELECT id FROM movies WHERE title = ?', [titleB]);
    if (movieA && movieB) {
      runQuery('INSERT OR IGNORE INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieA.id, movieB.id]);
      runQuery('INSERT OR IGNORE INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieB.id, movieA.id]);
      similarityCount++;
    }
  }

  const demoHash = bcrypt.hashSync('Password123', 10);
  runQuery(
    'INSERT INTO users (username, email, password_hash, preferred_genres) VALUES (?, ?, ?, ?)',
    ['demo', 'demo@example.com', demoHash, JSON.stringify(['Action', 'Sci-Fi', 'Drama'])]
  );
  const demoUser = getOne('SELECT id FROM users WHERE username = ?', ['demo']);

  const adminHash = bcrypt.hashSync('Admin1234', 10);
  runQuery(
    'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
    ['admin', 'admin@example.com', adminHash, 1]
  );

  const sampleRatings = [
    { movieId: 1, rating: 5 }, { movieId: 3, rating: 5 }, { movieId: 6, rating: 4 },
    { movieId: 7, rating: 5 }, { movieId: 8, rating: 4 }, { movieId: 11, rating: 3 },
    { movieId: 15, rating: 4 }, { movieId: 25, rating: 4 },
  ];
  for (const r of sampleRatings) {
    runQuery('INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)', [demoUser.id, r.movieId, r.rating]);
  }

  runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [demoUser.id, 6]);
  runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [demoUser.id, 7]);
  runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [demoUser.id, 8]);

  runQuery('INSERT INTO comments (user_id, movie_id, comment_text) VALUES (?, ?, ?)',
    [demoUser.id, 1, 'One of the greatest films ever made. The story of hope and perseverance is timeless.']);
  runQuery('INSERT INTO comments (user_id, movie_id, comment_text) VALUES (?, ?, ?)',
    [demoUser.id, 6, 'Mind-bending plot with incredible visuals. Nolan at his best!']);

  saveDb();
  console.log('Database seeded successfully!');
  console.log(`  - ${GENRES.length} genres`);
  console.log(`  - ${MOVIES.length} movies`);
  console.log(`  - ${similarityCount} similar-movie pairs`);
  console.log(`  - 1 demo user (demo / Password123)`);
  console.log(`  - 1 admin user (admin / Admin1234)`);
}

seed().catch(console.error);
