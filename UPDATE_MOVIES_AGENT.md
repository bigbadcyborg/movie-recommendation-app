# AGENT.md - Movie List Update Playbook

This repository stores the canonical movie catalog in JSON, then seeds SQLite from that data.

## Primary goal when asked to "update the movie list"

1. Edit `backend/src/db/movies.json`.
2. Keep each movie entry consistent with the existing schema:
   - `title` (string)
   - `director` (string)
   - `year` (number)
   - `duration` (number, minutes)
   - `desc` (string)
   - `genres` (array of strings)
   - `poster` (string URL)
3. Preserve valid JSON formatting (double quotes, comma placement, array/object brackets).

## Required consistency checks

- Ensure every genre used by a movie is in the genre whitelist in `backend/src/db/seed.js` (`GENRES` constant).
- If you add brand-new genres, update the `GENRES` list in `backend/src/db/seed.js` too.
- If you add/remove/rename movies, review `backend/src/db/similarities.json` so similarity pairs still reference existing movie titles.

## Validation steps after editing

From `backend/`:

1. Run `npm run seed` to verify seeding succeeds.
2. Confirm logs include expected movie count.

## Data quality guidelines

- Keep movie descriptions concise and user-friendly.
- Avoid duplicate movie titles.
- Prefer stable poster URLs.
- Maintain balanced genre coverage so recommendations stay diverse.

## Engineering principles

- Always follow SOLID principles for code changes related to this update process.
- Keep changes minimal and focused strictly on the requested movie-list update.
