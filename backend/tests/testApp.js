// Builds an Express app identical to server.js but WITHOUT calling listen
// or touching the real database. Import this in test files.
// NOTE: The database module must be mocked BEFORE requiring this file.

const express = require('express');
const cors = require('cors');

const authRoutes = require('../src/routes/auth');
const movieRoutes = require('../src/routes/movies');
const interactionRoutes = require('../src/routes/interactions');
const recommendationRoutes = require('../src/routes/recommendations');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
