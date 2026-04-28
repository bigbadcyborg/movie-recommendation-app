const fs = require('fs');
const path = require('path');
const moviesFile = path.join('src', 'db', 'movies.json');
const simFile = path.join('src', 'db', 'similarities.json');

const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
const simPairs = JSON.parse(fs.readFileSync(simFile, 'utf8'));

const newMovies = [
  // 10 Westerns
  { title: "The Good, the Bad and the Ugly", director: "Sergio Leone", year: 1966, duration: 178, desc: "A bounty hunting scam joins two men in an uneasy alliance.", genres: ["Western"], poster: "" },
  { title: "Once Upon a Time in the West", director: "Sergio Leone", year: 1968, duration: 165, desc: "A mysterious stranger with a harmonica joins forces with a notorious desperado.", genres: ["Western"], poster: "" },
  { title: "Unforgiven", director: "Clint Eastwood", year: 1992, duration: 130, desc: "Retired Old West gunslinger William Munny reluctantly takes on one last job.", genres: ["Western", "Drama"], poster: "" },
  { title: "Tombstone", director: "George P. Cosmatos, Kevin Jarre", year: 1993, duration: 130, desc: "A successful lawman plans to retire anonymously in Tombstone.", genres: ["Western", "Action"], poster: "" },
  { title: "True Grit", director: "Clint Eastwood", year: 2010, duration: 110, desc: "A tough U.S. Marshal helps a stubborn teenager track down her father's murderer.", genres: ["Western", "Drama"], poster: "" },
  { title: "The Searchers", director: "John Ford", year: 1956, duration: 119, desc: "An American Civil War veteran embarks on a journey to rescue his niece.", genres: ["Western", "Adventure"], poster: "" },
  { title: "High Noon", director: "Fred Zinnemann", year: 1952, duration: 85, desc: "A town Marshal must face a gang of deadly killers alone.", genres: ["Western", "Thriller"], poster: "" },
  { title: "The Wild Bunch", director: "Sam Peckinpah", year: 1969, duration: 145, desc: "An aging group of outlaws look for one last big score.", genres: ["Western", "Action"], poster: "" },
  { title: "Butch Cassidy and the Sundance Kid", director: "George Roy Hill", year: 1969, duration: 110, desc: "Two Western bank/train robbers flee to Bolivia.", genres: ["Western", "Crime"], poster: "" },
  { title: "Shane", director: "George Stevens", year: 1953, duration: 118, desc: "A weary gunfighter attempts to settle down with a homestead family.", genres: ["Western", "Drama"], poster: "" },
  
  // 10 Horror
  { title: "The Exorcist", director: "William Friedkin", year: 1973, duration: 122, desc: "A teenage girl is possessed by a mysterious entity.", genres: ["Horror"], poster: "" },
  { title: "Halloween", director: "John Carpenter", year: 1978, duration: 91, desc: "Fifteen years after murdering his sister, Michael Myers returns to Haddonfield.", genres: ["Horror", "Thriller"], poster: "" },
  { title: "The Texas Chain Saw Massacre", director: "Tobe Hooper", year: 1974, duration: 83, desc: "Two siblings and three friends fall victim to a family of cannibalistic psychopaths.", genres: ["Horror"], poster: "" },
  { title: "A Nightmare on Elm Street", director: "Wes Craven", year: 1984, duration: 91, desc: "The monstrous spirit of a slain child murderer seeks revenge.", genres: ["Horror"], poster: "" },
  { title: "Night of the Living Dead", director: "George A. Romero", year: 1968, duration: 96, desc: "A ragtag group of Pennsylvanians barricade themselves from flesh-eating monsters.", genres: ["Horror", "Thriller"], poster: "" },
  { title: "Scream", director: "Wes Craven", year: 1996, duration: 111, desc: "A year after the murder of her mother, a teenage girl is terrorized by a new killer.", genres: ["Horror", "Mystery"], poster: "" },
  { title: "The Conjuring", director: "James Wan", year: 2013, duration: 112, desc: "Paranormal investigators work to help a family terrorized by a dark presence.", genres: ["Horror", "Mystery"], poster: "" },
  { title: "Hereditary", director: "Ari Aster", year: 2018, duration: 127, desc: "A grieving family is haunted by tragic and disturbing occurrences.", genres: ["Horror", "Drama"], poster: "" },
  { title: "It Follows", director: "David Robert Mitchell", year: 2014, duration: 100, desc: "A young woman is followed by an unknown supernatural force.", genres: ["Horror", "Mystery"], poster: "" },
  { title: "The Babadook", director: "Jennifer Kent", year: 2014, duration: 93, desc: "A single mother and her child fall into a deep well of paranoia.", genres: ["Horror", "Drama"], poster: "" },

  // 10 Fantasy
  { title: "Harry Potter and the Sorcerer's Stone", director: "Chris Columbus", year: 2001, duration: 152, desc: "An orphaned boy discovers his magical powers.", genres: ["Fantasy", "Adventure"], poster: "" },
  { title: "The Lord of the Rings: The Return of the King", director: "Peter Jackson", year: 2003, duration: 201, desc: "Gandalf and Aragorn lead the World of Men against Sauron's army.", genres: ["Fantasy", "Action"], poster: "" },
  { title: "Alice in Wonderland", director: "Tim Burton", year: 2010, duration: 108, desc: "Nineteen-year-old Alice returns to the magical world from her childhood adventure.", genres: ["Fantasy", "Adventure"], poster: "" },
  { title: "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe", director: "Andrew Adamson", year: 2005, duration: 143, desc: "Four kids travel through a wardrobe to the land of Narnia.", genres: ["Fantasy", "Adventure"], poster: "" },
  { title: "Howl's Moving Castle", director: "Hayao Miyazaki", year: 2004, duration: 119, desc: "A young girl transforms into an old woman by a witch's curse.", genres: ["Animation", "Fantasy"], poster: "" },
  { title: "Princess Mononoke", director: "Hayao Miyazaki", year: 1997, duration: 134, desc: "A prince becomes involved in the struggle between a forest princess and a mining town.", genres: ["Animation", "Fantasy"], poster: "" },
  { title: "Labyrinth", director: "Jim Henson", year: 1986, duration: 101, desc: "Sixteen-year-old Sarah is given thirteen hours to solve a labyrinth.", genres: ["Fantasy", "Adventure"], poster: "" },
  { title: "The Dark Crystal", director: "Jim Henson, Frank Oz", year: 1982, duration: 93, desc: "On another planet, a Gelfling embarks on a quest to find the missing shard of a magical crystal.", genres: ["Fantasy", "Adventure"], poster: "" },
  { title: "Willow", director: "Ron Howard", year: 1988, duration: 126, desc: "A reluctant dwarf must play a critical role in protecting a special baby.", genres: ["Fantasy", "Action"], poster: "" },
  { title: "Stardust", director: "Ron Howard", year: 2007, duration: 127, desc: "A countryside boy embarks on a magical quest to catch a fallen star.", genres: ["Fantasy", "Adventure"], poster: "" },

  // 10 Romance
  { title: "The Notebook", director: "Nick Cassavetes", year: 2004, duration: 123, desc: "A poor yet passionate young man falls in love with a rich young woman.", genres: ["Romance", "Drama"], poster: "" },
  { title: "Pride & Prejudice", director: "Joe Wright", year: 2005, duration: 129, desc: "Sparks fly when spirited Elizabeth Bennet meets single, rich, and proud Mr. Darcy.", genres: ["Romance", "Drama"], poster: "" },
  { title: "Before Sunrise", director: "Richard Linklater", year: 1995, duration: 101, desc: "A young man and woman meet on a train in Europe.", genres: ["Romance", "Drama"], poster: "" },
  { title: "Before Sunset", director: "Richard Linklater", year: 2004, duration: 80, desc: "Nine years after originally meeting, Jesse and Celine cross paths in Paris.", genres: ["Romance", "Drama"], poster: "" },
  { title: "A Walk to Remember", director: "Nick Cassavetes", year: 2002, duration: 101, desc: "The story of two North Carolina teens who are thrown together.", genres: ["Romance", "Drama"], poster: "" },
  { title: "Notting Hill", director: "Roger Michell", year: 1999, duration: 124, desc: "The life of a simple bookshop owner changes when he meets the most famous film star in the world.", genres: ["Romance", "Comedy"], poster: "" },
  { title: "Love Actually", director: "Richard Curtis", year: 2003, duration: 135, desc: "Follows the lives of eight very different couples in dealing with their love lives.", genres: ["Romance", "Comedy"], poster: "" },
  { title: "Jerry Maguire", director: "Cameron Crowe", year: 1996, duration: 139, desc: "When a sports agent gets fired, he tries to put his new philosophy to the test.", genres: ["Romance", "Comedy"], poster: "" },
  { title: "Dirty Dancing", director: "Emile Ardolino", year: 1987, duration: 100, desc: "Spending the summer at a Catskills resort with her family, Frances falls in love with the camp's dance instructor.", genres: ["Romance", "Drama"], poster: "" },
  { title: "Ghost", director: "Jerry Zucker", year: 1990, duration: 127, desc: "After a young man is murdered, his spirit stays behind to warn his lover.", genres: ["Romance", "Fantasy"], poster: "" },

  // 10 Animation
  { title: "Finding Nemo", director: "Andrew Stanton", year: 2003, duration: 100, desc: "A timid clownfish sets out on a journey to bring him home.", genres: ["Animation", "Comedy"], poster: "" },
  { title: "Up", director: "Pete Docter, Bob Peterson", year: 2009, duration: 96, desc: "78-year-old Carl Fredricksen travels to Paradise Falls in his house equipped with balloons.", genres: ["Animation", "Adventure"], poster: "" },
  { title: "Shrek", director: "Andrew Adamson, Vicky Jenson", year: 2001, duration: 90, desc: "A mean lord exiles fairytale creatures to the swamp of a grumpy ogre.", genres: ["Animation", "Comedy"], poster: "" },
  { title: "Ratatouille", director: "Brad Bird, Jan Pinkava", year: 2007, duration: 111, desc: "A rat who can cook makes an unusual alliance with a young kitchen worker.", genres: ["Animation", "Comedy"], poster: "" },
  { title: "Spider-Man: Into the Spider-Verse", director: "Bob Persichetti, Peter Ramsey, Rodney Rothman", year: 2018, duration: 117, desc: "Teen Miles Morales becomes the Spider-Man of his universe.", genres: ["Animation", "Action"], poster: "" },
  { title: "Zootopia", director: "Byron Howard, Rich Moore", year: 2016, duration: 108, desc: "In a city of anthropomorphic animals, a rookie bunny cop and a cynical con artist fox must work together.", genres: ["Animation", "Mystery"], poster: "" },
  { title: "The Incredibles", director: "Brad Bird", year: 2004, duration: 115, desc: "A family of undercover superheroes are forced into action to save the world.", genres: ["Animation", "Action"], poster: "" },
  { title: "My Neighbor Totoro", director: "Hayao Miyazaki", year: 1988, duration: 86, desc: "Two girls move to the country to be near their ailing mother and have adventures with the wondrous forest spirits.", genres: ["Animation", "Fantasy"], poster: "" },
  { title: "Your Name.", director: "Makoto Shinkai", year: 2016, duration: 106, desc: "Two strangers find themselves linked in a bizarre way.", genres: ["Animation", "Drama"], poster: "" },
  { title: "Akira", director: "Katsuhiro Otomo", year: 1988, duration: 124, desc: "A secret military project endangers Neo-Tokyo when it turns a biker gang member into a rampaging psychic psychopath.", genres: ["Animation", "Sci-Fi"], poster: "" }
];

movies.push(...newMovies);
fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2) + '\n');

for (let i = 0; i < newMovies.length - 1; i += 2) {
  simPairs.push([newMovies[i].title, newMovies[i+1].title]);
}
fs.writeFileSync(simFile, JSON.stringify(simPairs, null, 2) + '\n');

console.log('Added ' + newMovies.length + ' movies. Total is now ' + movies.length);
