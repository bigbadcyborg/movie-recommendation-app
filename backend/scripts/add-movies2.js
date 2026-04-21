const fs = require('fs');
const path = require('path');

const MOVIES_FILE = path.join(__dirname, '../src/db/movies.json');
const SIMILARITIES_FILE = path.join(__dirname, '../src/db/similarities.json');

const NEW_MOVIES = [
  { "title": "12 Angry Men", "director": "Sidney Lumet", "year": 1957, "duration": 96, "desc": "A jury of twelve men must deliberate.", "genres": ["Drama"], "poster": "" },
  { "title": "300", "director": "Zack Snyder", "year": 2006, "duration": 117, "desc": "King Leonidas of Sparta.", "genres": ["Action"], "poster": "" },
  { "title": "A Fistful of Dollars", "director": "Sergio Leone", "year": 1964, "duration": 99, "desc": "A lone drifter.", "genres": ["Western"], "poster": "" },
  { "title": "Beerfest", "director": "Jay Chandrasekhar", "year": 2006, "duration": 110, "desc": "American drinkers.", "genres": ["Comedy"], "poster": "" },
  { "title": "Blood In Blood Out", "director": "Taylor Hackford", "year": 1993, "duration": 180, "desc": "Three young Chicano men.", "genres": ["Crime", "Drama"], "poster": "" },
  { "title": "Citizen Kane", "director": "Orson Welles", "year": 1941, "duration": 119, "desc": "A powerful media executive.", "genres": ["Drama"], "poster": "" },
  { "title": "City Of God", "director": "Fernando Meirelles", "year": 2002, "duration": 130, "desc": "In a Rio slum.", "genres": ["Crime", "Drama"], "poster": "" },
  { "title": "Cool Hand Luke", "director": "Stuart Rosenberg", "year": 1967, "duration": 126, "desc": "A defiant prisoner.", "genres": ["Drama"], "poster": "" },
  { "title": "Dazed And Confused", "director": "Richard Linklater", "year": 1993, "duration": 102, "desc": "High schoolers.", "genres": ["Comedy"], "poster": "" },
  { "title": "Ex Machina", "director": "Alex Garland", "year": 2015, "duration": 108, "desc": "A programmer is selected.", "genres": ["Sci-Fi"], "poster": "" },
  { "title": "Fear And Loathing In Las Vegas", "director": "Terry Gilliam", "year": 1998, "duration": 118, "desc": "Las Vegas.", "genres": ["Comedy"], "poster": "" },
  { "title": "From Russia With Love", "director": "Terence Young", "year": 1963, "duration": 110, "desc": "James Bond.", "genres": ["Action"], "poster": "" },
  { "title": "Ghost in the Shell", "director": "Mamoru Oshii", "year": 1995, "duration": 83, "desc": "A cyborg secret agent.", "genres": ["Sci-Fi"], "poster": "" },
  { "title": "Goldfinger", "director": "Guy Hamilton", "year": 1964, "duration": 110, "desc": "James Bond.", "genres": ["Action"], "poster": "" },
  { "title": "Heat", "director": "Michael Mann", "year": 1995, "duration": 170, "desc": "A veteran cop.", "genres": ["Action", "Crime"], "poster": "" },
  { "title": "Hillbilly Elegy", "director": "Ron Howard", "year": 2020, "duration": 161, "desc": "A Yale law student.", "genres": ["Drama"], "poster": "" },
  { "title": "Inception", "director": "Christopher Nolan", "year": 2010, "duration": 148, "desc": "A thief.", "genres": ["Action", "Sci-Fi"], "poster": "" },
  { "title": "IP Man", "director": "Wilson Yip", "year": 2008, "duration": 104, "desc": "Ip Man.", "genres": ["Action"], "poster": "" },
  { "title": "Ip Man 2", "director": "Wilson Yip", "year": 2010, "duration": 108, "desc": "Ip Man continues.", "genres": ["Action"], "poster": "" },
  { "title": "Ip Man 3", "director": "Wilson Yip", "year": 2015, "duration": 104, "desc": "Ip Man faces.", "genres": ["Action"], "poster": "" },
  { "title": "Ip Man The Final Fight", "director": "Herman Yau", "year": 2013, "duration": 92, "desc": "Ip Man's final.", "genres": ["Action"], "poster": "" },
  { "title": "O Brother Where Art Thou", "director": "Joel Coen", "year": 2000, "duration": 106, "desc": "Three escaped convicts.", "genres": ["Comedy"], "poster": "" },
  { "title": "Oldboy", "director": "Park Chan-wook", "year": 2003, "duration": 120, "desc": "A man is imprisoned.", "genres": ["Action"], "poster": "" },
  { "title": "Once Upon a Time in America", "director": "Sergio Leone", "year": 1984, "duration": 229, "desc": "An epic tale.", "genres": ["Crime", "Drama"], "poster": "" },
  { "title": "Oppenheimer", "director": "Christopher Nolan", "year": 2023, "duration": 180, "desc": "The life of Oppenheimer.", "genres": ["Drama"], "poster": "" },
  { "title": "Sisu", "director": "Jalmari Helander", "year": 2022, "duration": 92, "desc": "A former commando.", "genres": ["Action"], "poster": "" },
  { "title": "The Boondock Saints", "director": "Troy Duffy", "year": 1999, "duration": 108, "desc": "Two Irish-American brothers.", "genres": ["Action", "Crime"], "poster": "" },
  { "title": "The Color of Money", "director": "Martin Scorsese", "year": 1986, "duration": 119, "desc": "A retired pool player.", "genres": ["Drama"], "poster": "" },
  { "title": "The Departed", "director": "Martin Scorsese", "year": 2006, "duration": 151, "desc": "An undercover cop.", "genres": ["Crime", "Thriller"], "poster": "" },
  { "title": "The Godfather", "director": "Francis Ford Coppola", "year": 1972, "duration": 175, "desc": "The aging patriarch.", "genres": ["Crime", "Drama"], "poster": "" },
  { "title": "The Godfather Part III", "director": "Francis Ford Coppola", "year": 1990, "duration": 170, "desc": "Michael Corleone.", "genres": ["Crime", "Drama"], "poster": "" },
  { "title": "The Long Hot Summer", "director": "Martin Ritt", "year": 1958, "duration": 115, "desc": "A mysterious stranger.", "genres": ["Drama"], "poster": "" },
  { "title": "The Matrix", "director": "Lana Wachowski", "year": 1999, "duration": 136, "desc": "A computer hacker.", "genres": ["Action", "Sci-Fi"], "poster": "" },
  { "title": "The Matrix Reloaded", "director": "Lana Wachowski", "year": 2003, "duration": 138, "desc": "Neo and his allies.", "genres": ["Action", "Sci-Fi"], "poster": "" },
  { "title": "The Outsiders", "director": "Francis Ford Coppola", "year": 1983, "duration": 91, "desc": "A group of boys.", "genres": ["Drama"], "poster": "" },
  { "title": "The Sting", "director": "George Roy Hill", "year": 1973, "duration": 129, "desc": "Two con men.", "genres": ["Crime", "Comedy"], "poster": "" },
  { "title": "The Thomas Crown Affair", "director": "Norman Jewison", "year": 1968, "duration": 102, "desc": "A wealthy businessman.", "genres": ["Crime"], "poster": "" },
  { "title": "The Usual Suspects", "director": "Bryan Singer", "year": 1995, "duration": 106, "desc": "Five criminals.", "genres": ["Crime", "Thriller"], "poster": "" },
  { "title": "Waterworld", "director": "Kevin Reynolds", "year": 1995, "duration": 135, "desc": "In a post-apocalyptic world.", "genres": ["Action", "Adventure"], "poster": "" }
];

let sims = JSON.parse(fs.readFileSync(SIMILARITIES_FILE, 'utf8'));

const NEW_SIMILARITIES = [
  ["The Godfather Part III", "The Godfather"],
  ["The Departed", "The Usual Suspects"],
  ["The Departed", "The Boondock Saints"],
  ["The Boondock Saints", "Heat"],
  ["Heat", "Oldboy"],
  ["Inception", "The Matrix"],
  ["The Matrix", "The Matrix Reloaded"],
  ["IP Man", "Ip Man 2"],
  ["Ip Man 2", "Ip Man 3"],
  ["Ip Man 3", "Ip Man The Final Fight"],
  ["300", "Sisu"],
  ["Hillbilly Elegy", "Once Upon a Time in America"],
  ["The Outsiders", "Dazed And Confused"],
  ["City Of God", "Blood In Blood Out"],
  ["Citizen Kane", "12 Angry Men"],
  ["12 Angry Men", "The Sting"],
  ["Once Upon a Time in America", "The Long Hot Summer"],
  ["Ex Machina", "Ghost in the Shell"],
  ["Inception", "Ex Machina"],
  ["Beerfest", "O Brother Where Art Thou"],
  ["Fear And Loathing In Las Vegas", "Dazed And Confused"],
  ["From Russia With Love", "Goldfinger"],
  ["A Fistful of Dollars", "The Thomas Crown Affair"],
  ["The Color of Money", "The Sting"],
  ["Cool Hand Luke", "12 Angry Men"],
  ["Waterworld", "The Matrix"],
  ["The Godfather", "The Departed"],
  ["Oppenheimer", "Ex Machina"]
];

let movies = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));
const existingTitles = new Set(movies.map(m => m.title));

for (const m of NEW_MOVIES) {
  if (!existingTitles.has(m.title)) {
    movies.push(m);
    existingTitles.add(m.title);
  }
}

for (const pair of NEW_SIMILARITIES) {
  sims.push(pair);
}

// ensure every new movie has at least one pair
const titlesWithPairs = new Set(sims.flat());
for (const m of NEW_MOVIES) {
  if (!titlesWithPairs.has(m.title)) {
    sims.push([m.title, "The Godfather"]);
  }
}

fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2));
fs.writeFileSync(SIMILARITIES_FILE, JSON.stringify(sims, null, 2));

console.log("Done");
