# UPDATE_MOVIES_AGENT.md - Movie List Update Playbook

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
   - `poster` (string URL; can be left blank because the preseed hook automatically fulfills it)
3. Preserve valid JSON formatting (double quotes, comma placement, array/object brackets).

## Required consistency checks

- Ensure every genre used by a movie is in the genre whitelist in `backend/src/db/seed.js` (`GENRES` constant).
- If you add brand-new genres, update the `GENRES` list in `backend/src/db/seed.js` too.
- If you add/remove/rename movies, review `backend/src/db/similarities.json` so similarity pairs still reference existing movie titles.
- Ensure movie titles are unique (case-insensitive).
- Ensure similarity pairs are unique regardless of order (`[A, B]` is the same pair as `[B, A]`).
- Ensure newly added movies have at least one related entry in `backend/src/db/similarities.json`.
- Posters are validated automatically. If adding a new movie, you can leave the `poster` empty, or provide a URL. During `npm run seed`, the `preseed` script will automatically fetch and repair missing or broken URLs via the OMDb API.

## Validation steps after editing

From `backend/`:

1. Validate JSON and detect duplicate movie titles:

   ```powershell
   node -e "const fs=require('fs');const path=require('path');const movies=JSON.parse(fs.readFileSync(path.join('src','db','movies.json'),'utf8'));const seen=new Map();const dups=[];for(const m of movies){const key=m.title.toLowerCase();if(seen.has(key)) dups.push([seen.get(key),m.title]); else seen.set(key,m.title);}console.log('movies',movies.length);console.log('duplicateTitles',dups.length?JSON.stringify(dups):'none');"
   ```

2. Validate similarity integrity (missing titles + duplicate unordered pairs):

   ```powershell
   node -e "const fs=require('fs');const path=require('path');const movies=JSON.parse(fs.readFileSync(path.join('src','db','movies.json'),'utf8'));const sims=JSON.parse(fs.readFileSync(path.join('src','db','similarities.json'),'utf8'));const titles=new Set(movies.map(m=>m.title));const missing=[...new Set(sims.flat().filter(t=>!titles.has(t)))];const norm=p=>[p[0],p[1]].sort().join('||');const seen=new Set();let dup=0;for(const p of sims){const k=norm(p);if(seen.has(k)) dup++;else seen.add(k);}console.log('pairs',sims.length);console.log('missingTitles',missing.length?missing.join(' | '):'none');console.log('duplicatePairs',dup);"
   ```

3. Ensure `.env` is populated with `OMDB_API_KEY` for fetching posters.

4. Force a fresh seed so counts are deterministic (seed does nothing if DB already exists), which will trigger automatic image validation and OMDB fetching:

   ```powershell
   Remove-Item .\data\movies.db -Force
   npm run seed
   ```

5. Confirm logs include expected movie count and similar-pair count.

## Data quality guidelines

- Keep movie descriptions concise and user-friendly.
- Avoid duplicate movie titles.
- Prefer stable poster URLs.
- Maintain balanced genre coverage so recommendations stay diverse.

## Change checklist

- Updated `backend/src/db/movies.json` with valid schema fields.
- Verified all movie genres are included in `GENRES` in `backend/src/db/seed.js`.
- Updated `backend/src/db/similarities.json` for add/remove/rename title changes.
- Passed duplicate-title, missing-title, and duplicate-pair checks.
- Set up an `OMDB_API_KEY` for fetching posters if needed.
- Ran forced reseed and verified posters were injected properly along with the resulting counts in logs.

## Engineering focus

- Keep changes minimal and focused strictly on the requested movie-list update.
- Prioritize data integrity and reproducible validation over broad refactors.
