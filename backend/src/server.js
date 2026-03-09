const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeSchema } = require('./db/schema');
const { getOne } = require('./db/database');

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const interactionRoutes = require('./routes/interactions');
const recommendationRoutes = require('./routes/recommendations');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initializeSchema();

  const hasMovies = getOne('SELECT id FROM movies LIMIT 1');
  if (!hasMovies) {
    console.log('No movies found. Running seed...');
    require('./db/seed');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
