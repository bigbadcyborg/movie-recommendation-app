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

### Database backups and migration

All application data lives in a single SQLite file: `backend/data/movies.db`. User accounts, ratings, comments, favorites, and related rows are stored there.

**One-step seed + migrate (automatic source)** — from `backend/`:

```bash
npm run seed:migrate
```

This runs `npm run seed` (backup snapshot, poster validation, then seed), then runs migration **automatically** using the **newest** `*.db` file in `backend/data/backups/` (by modification time). You do not pass `--from` unless you want a specific file.

- `npm run seed:migrate -- --dry-run` — same flow, but migrate only prints a summary (target file unchanged).
- `npm run seed:migrate -- --from latest` — same as omitting `--from` (explicit “use newest backup”).
- `npm run seed:migrate -- --from /path/to/other.db` — migrate from that file instead of the newest backup.

If there are no files under `data/backups/`, migrate is skipped (exit 0). Stop the backend before running if another process might write `movies.db`.

**Caveat:** If you did **not** replace `movies.db`, the newest backup is often a snapshot of the **same** database you merge back into. That can **duplicate comments** (there is no uniqueness constraint); ratings mostly upsert. Prefer `seed:migrate` when restoring after a **reshuffle of movie IDs** (delete/reseed + merge from an older backup) or when `--from` points at a **meaningfully different** DB. Inspect impact with `--dry-run`.

| Goal | Steps |
|------|--------|
| Snapshot before risky changes | Run `npm run db:backup` from `backend/` (writes `backend/data/backups/movies-<timestamp>.db`). |
| Backup before every seed | `npm run seed` runs `preseed`, which backs up `movies.db`, then runs poster fetch, then seeds. |
| One-command seed + automatic migrate | `npm run seed:migrate` (see above). |
| Reseed without losing user data | `npm run db:backup` → delete or replace `movies.db` only if intentional → `npm run seed` → `npm run db:migrate -- --from path/to/your-backup.db` (stop the backend first), or use `seed:migrate` if the correct source is already the latest backup. |
| Move data to a fresh install | Copy the old `movies.db` (or a backup file) to the machine → seed the new DB so movies/genres exist → `npm run db:migrate -- --from /path/to/old.db`. |

Migration remaps **users by email** and **movies by title** (IDs change after reseed). Manual migrate only:

`npm run db:migrate -- --from path/to/old.db --dry-run`

Do not point `--from` at the same file as the live `movies.db` you are writing into.

### Demo Account

- **Username:** `demo`
- **Password:** `Password123`

- **Username:** `test`
- **Password:** `Test1234`

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

```text
movie-recommendation-app/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── server.js          # Main entry point (port 3001)
│   │   ├── db/
│   │   │   ├── database.js    # SQLite wrapper (sql.js)
│   │   │   ├── schema.js      # Database schema & initialization
│   │   │   └── seed.js        # Database seeding with 40+ movies
│   │   ├── routes/
│   │   │   ├── auth.js        # User registration & login
│   │   │   ├── movies.js      # Movie listing & search
│   │   │   ├── interactions.js # Ratings, favorites, comments
│   │   │   └── recommendations.js # Recommendation algorithm
│   │   └── middleware/
│   │       └── auth.js        # JWT authentication
│   └── package.json
├── frontend/                   # React 18 + Vite UI
│   ├── src/
│   │   ├── pages/            # Home, Movies, MovieDetail, Profile, Login, Register
│   │   ├── components/       # MovieCard, StarRating, Navbar
│   │   ├── context/          # AuthContext for state management
│   │   ├── api/              # API client
│   │   └── main.jsx
│   └── vite.config.js
└── README.md
```
