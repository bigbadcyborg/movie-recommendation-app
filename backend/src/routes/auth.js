const express = require('express');
const bcrypt = require('bcryptjs');
const { getOne, runQuery, getAll } = require('../db/database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and numbers' });
    }

    const existingUser = getOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    runQuery(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const user = getOne('SELECT id, username, email, preferred_genres, is_admin, created_at FROM users WHERE username = ?', [username]);
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: !!user.is_admin,
        preferredGenres: JSON.parse(user.preferred_genres || '[]'),
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const user = getOne(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [login, login]
    );

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: !!user.is_admin,
        preferredGenres: JSON.parse(user.preferred_genres || '[]'),
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = getOne(
      'SELECT id, username, email, preferred_genres, watch_history, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favoriteCount = getOne('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [user.id]);
    const ratingCount = getOne('SELECT COUNT(*) as count FROM ratings WHERE user_id = ?', [user.id]);
    const commentCount = getOne('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', [user.id]);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: !!user.is_admin,
      preferredGenres: JSON.parse(user.preferred_genres || '[]'),
      watchHistory: JSON.parse(user.watch_history || '[]'),
      createdAt: user.created_at,
      stats: {
        favorites: favoriteCount.count,
        ratings: ratingCount.count,
        comments: commentCount.count
      }
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authenticateToken, (req, res) => {
  try {
    const { preferredGenres, username } = req.body;
    const updates = [];
    const params = [];

    if (preferredGenres !== undefined) {
      updates.push('preferred_genres = ?');
      params.push(JSON.stringify(preferredGenres));
    }

    if (username) {
      const existing = getOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
      if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      updates.push('username = ?');
      params.push(username);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.user.id);
    runQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const user = getOne('SELECT id, username, email, preferred_genres, is_admin, created_at FROM users WHERE id = ?', [req.user.id]);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: !!user.is_admin,
      preferredGenres: JSON.parse(user.preferred_genres || '[]'),
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
