# CineMatch - Movie Recommendation System

A full-stack movie recommendation web application with personalized suggestions based on user ratings, favorites, and viewing preferences.

## Tech Stack

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node.js + Express
- **Database:** SQLite (via sql.js)
- **Auth:** JWT + bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Seed the database
npm run seed

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

Start both servers (in separate terminals):

```bash
# Terminal 1: Backend (runs on port 3001)
cd backend
npm run dev

# Terminal 2: Frontend (runs on port 5173)
cd frontend
npm run dev
```

Visit **http://localhost:5173** in your browser.

### Demo Account

- **Username:** `demo`
- **Password:** `Password123`

## Features

- **User Registration & Authentication** - Secure sign up/sign in with password validation
- **Movie Browsing** - Browse 40+ movies with poster images and details
- **Search & Filter** - Search by title/director, filter by genre, sort by year/rating
- **Movie Details** - View full movie info, average ratings, and user comments
- **Rate Movies** - 1-5 star rating system with live average updates
- **Favorites** - Add/remove movies from your favorites list
- **Comments** - Post and manage comments on movies
- **Personalized Recommendations** - Hybrid engine using:
  - Content-based filtering (genre preferences from ratings/favorites)
  - Collaborative filtering (cosine similarity between users)
- **User Profile** - View stats, manage preferred genres, see favorites and ratings

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update profile |
| GET | `/api/movies` | List movies (search, filter, paginate) |
| GET | `/api/movies/genres` | List all genres |
| GET | `/api/movies/popular` | Get popular movies |
| GET | `/api/movies/:id` | Get movie details |
| POST | `/api/interactions/rate` | Rate a movie |
| POST | `/api/interactions/favorite` | Toggle favorite |
| POST | `/api/interactions/comment` | Add comment |
| DELETE | `/api/interactions/comment/:id` | Delete comment |
| GET | `/api/interactions/favorites` | Get user favorites |
| GET | `/api/interactions/ratings` | Get user ratings |
| GET | `/api/recommendations` | Get personalized recommendations |
