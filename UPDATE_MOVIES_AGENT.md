# UPDATE_MOVIES_AGENT.md - Movie List Update Playbook

This repository stores the canonical movie catalog in JSON, then seeds SQLite from that data.

## Primary goal when asked to "update the movie list"

1. Edit `backend/src/db/movies.json`.
2. **Reload SQLite from JSON (required):** Changing JSON alone does not update `movies.db`. Before finishing the task, run the full pipeline—**preseed**, **seed**, and **migrate** when user data should be kept—so new titles (e.g. *Casablanca*) actually appear in the app. See **Agent workflow: apply catalog changes to SQLite** for the exact commands. Skipping this step leaves the UI on an old catalog.
3. Keep each movie entry consistent with the existing schema:
   - `title` (string)
   - `director` (string)
   - `year` (number)
   - `duration` (number, minutes)
   - `desc` (string)
   - `genres` (array of strings)
   - `poster` (string URL; can be left blank only if you will run poster fetch—see **Posters and `fetch-posters.js`** below)
4. Preserve valid JSON formatting (double quotes, comma placement, array/object brackets).
5. **Run backend unit tests (required):** After the catalog is applied to SQLite, from `backend/` run **`npm test`**, which executes Jest (`npx jest --runInBand`) and saves a report under `backend/tests/history/`. Fix any failures before considering the task done. See **Validation steps after editing** for placement in the full sequence.

## Required consistency checks

- Ensure every genre used by a movie is in the genre whitelist in `backend/src/db/seed.js` (`GENRES` constant).
- If you add brand-new genres, update the `GENRES` list in `backend/src/db/seed.js` too.
- If you add/remove/rename movies, review `backend/src/db/similarities.json` so similarity pairs still reference existing movie titles.
- Ensure movie titles are unique (case-insensitive).
- Ensure similarity pairs are unique regardless of order (`[A, B]` is the same pair as `[B, A]`).
- Ensure newly added movies have at least one related entry in `backend/src/db/similarities.json`.
- Posters: see **Posters and `fetch-posters.js`**—do not finish a catalog update with placeholder or broken poster URLs when a real one can be set.

### Posters and `fetch-posters.js`

[`backend/src/db/fetch-posters.js`](backend/src/db/fetch-posters.js) reads `movies.json`, checks each `poster` URL (empty, broken, or dummy placeholder), and tries to fill or replace it via the OMDb API (`OMDB_API_KEY` in `backend/.env`). It writes updates back to `movies.json`.

**Agents must run this step** so new or repaired titles get real posters before or as part of seeding:

1. From `backend/`, ensure `OMDB_API_KEY` is set in `.env`.
2. Run **`npm run fetch-posters`** (same script `preseed` runs after the backup step).  
   - Alternatively, **`npm run seed`** / **`npm run seed:migrate`** already run **`fetch-posters.js`** inside **`preseed`** before `seed.js`—but only when you use those commands after editing JSON.
3. Read the console output. For any **`Failed to find poster for …`**, OMDb did not return art: **set a stable HTTPS poster URL manually** in `movies.json` (e.g. match the style of other entries), then run **`npm run fetch-posters`** again to validate the URL, or proceed to seed if the URL is known good.
4. Do not treat the dummy “No+Poster” image as done—replace it with a real poster URL when OMDb fails.

If you change only posters in JSON and the DB already has movies, run **`npm run fetch-posters`** to refresh JSON, then **`npm run seed`** so `preseed` runs again; note **`seed.js` skips catalog inserts** when movies already exist, so **poster columns in SQLite will not update** until you use a **full catalog reload** (backup → delete `movies.db` → `seed` / `seed:migrate`) or another project-specific update path.

## Agent workflow: apply catalog changes to SQLite (after editing JSON)

After you change `movies.json` and/or `similarities.json`, the running database does **not** update by itself. **Agents must execute the steps below** (not only edit JSON); otherwise the app will still show the previous catalog.

### What “preseed, seed, and migrate” means

[`backend/package.json`](backend/package.json) wires this as follows:

| Phase | What runs | How you invoke it |
|--------|-----------|-------------------|
| **Preseed** | `backup-db.js` (snapshot `movies.db` if present) then **`fetch-posters.js`** (OMDb poster repair for `movies.json`) | Runs **automatically before** `seed` when you execute `npm run seed` (npm `preseed` lifecycle hook). Same script: **`npm run fetch-posters`** (no backup; use when you only need to refresh posters in JSON). |
| **Seed** | `seed.js` — inserts genres, movies, similarities, demo users **only if** the DB has no movies yet | `npm run seed` (after preseed completes). |
| **Migrate** | `migrate-from-db.js` — copies user-scoped rows from a backup into the current `movies.db` | `npm run db:migrate -- --from <backup.db>` **or**, after seed, use `npm run seed:migrate` (runs `npm run seed` then migrate from the newest backup). |

**One-shot command (recommended when keeping user data):** After backup + deleting `movies.db`, run **`npm run seed:migrate`**. That performs **preseed → seed → migrate** in order: `seed:migrate` calls `npm run seed`, which runs **`preseed`** then **`seed.js`**, then **`seed:migrate`** runs **`db:migrate`** from the chosen backup.

**Prerequisites**

- Run all commands from `backend/`.
- Stop the backend if it is running so nothing else writes `movies.db` while you replace it (see `README.md` → **Database backups and migration**).
- Ensure `.env` includes `OMDB_API_KEY` if `preseed` should fetch or repair poster URLs.

**Validation**

Run the duplicate-title and similarity checks in **Validation steps after editing** (steps 1–2) before touching SQLite.

**Important:** `seed.js` only inserts the catalog when the database has **no movies yet**. Running `npm run seed` on an already-seeded `movies.db` does **not** add or update movies from JSON. To load edited JSON into SQLite, remove `movies.db` (after a backup) and run **seed** again (which always runs **preseed** first).

**When local user data must be preserved (typical dev)**

1. `npm run db:backup` so a snapshot exists (in addition to `preseed` copying an existing `movies.db` to `data/backups/` the next time `npm run seed` runs).
2. Delete the live database:

   ```powershell
   Remove-Item .\data\movies.db -Force
   ```

3. **`npm run seed:migrate`** — **preseed** (backup hook + posters) → **seed** (load JSON into empty DB) → **migrate** (restore users/ratings/comments from the **newest** `data/backups/*.db` by modification time). If no backup files exist, migrate is skipped (avoid that: run step 1 first).

**Explicit three-step form (same outcome as `seed:migrate` when migrate source is newest backup):**

```powershell
npm run seed
npm run db:migrate -- --from .\data\backups\<your-backup-file>.db
```

The first line runs **preseed** then **seed**. The second line is **migrate**.

If many backups exist and the newest file by mtime might not be the correct source, use `npm run seed:migrate -- --from path\to\exact-backup.db` or run `npm run db:migrate -- --from path\to\exact-backup.db` after `npm run seed`. Preview without writing: `npm run db:migrate -- --from path\to\backup.db --dry-run`.

**When user data is disposable**

Delete `movies.db` if present, then run **`npm run seed`** (runs **preseed** + **seed**). **Migrate** is not needed. Do not claim the catalog is updated until this has been run and logs show the new movie count.

**Verify**

Confirm seed output lists the expected movie count and similar-movie pair count; spot-check the app (e.g. search for a newly added title). Restart the backend if it was stopped.

From `backend/`, run **`npm test`** so the Jest suite (`backend/tests/**/*.test.js`) passes; `npm test` wraps `npx jest --runInBand` and writes a log under `backend/tests/history/`. Run this **after** JSON validation and **after** seed/migrate (or disposable seed) so the DB state matches what integration-style tests may expect.

## SQLite, user data, and migration

For the step-by-step sequence after editing JSON (backup, delete `movies.db`, `seed:migrate`, etc.), use **Agent workflow: apply catalog changes to SQLite (after editing JSON)** above. This section explains how the pieces fit together.

The **catalog** lives in JSON (`movies.json`, `similarities.json`), but the **running app** persists everything in one SQLite file: `backend/data/movies.db` (see `backend/src/db/dbPaths.js` and `backend/src/db/database.js`). That file holds **movies/genres** and **all user data** (accounts, ratings, comments, favorites, interaction logs, etc.). **Deleting `movies.db` wipes user data** unless you restore it from a backup using migration.

**How migration works:** `backend/scripts/migrate-from-db.js` copies user-scoped rows **from** a source `.db` file **into** the current `movies.db`. It remaps **users by `email`** and **movies by `title`** (numeric `movie_id` values change after a reseed). If you rename a movie title in JSON without aligning migration strategy, old ratings/comments may not attach.

**What `npm run seed` does:** `package.json` defines `preseed`, which runs **before** `seed`: `backup-db.js` (copy `movies.db` → `data/backups/` if the file exists), then `fetch-posters.js`, then `seed.js` applies schema and inserts catalog/demo data **only when** the database has **no** movies yet. Details: `README.md` → **Database backups and migration**.

**Recovering user data after delete/reseed:** Ensure a backup exists (`npm run db:backup` before deleting `movies.db`, or the automatic `preseed` copy from the last `npm run seed` that still saw a live `movies.db`). To merge user rows after you already ran a fresh `npm run seed`, use `npm run db:migrate -- --from path\to\backup.db` (stop the backend first). The one-shot `npm run seed:migrate` runs `npm run seed` and then migrate from the newest `data/backups\*.db` (skipped if none). Use `--dry-run` to preview. Details match the **Agent workflow** section.

**Caveats:** Do not set migrate `--from` to the **same path** as the live `movies.db` you are writing into. Merging from a backup that is essentially a duplicate of the current DB can **duplicate comments** (ratings mostly upsert). See README for full caveats.

| Command | Role |
|---------|------|
| `npm run db:backup` | Copy `movies.db` → `data/backups/movies-<timestamp>.db` |
| `npm run db:migrate -- --from <file>` | Merge user-side data from the source SQLite file into the current DB |
| `npm run seed:migrate` | Run `npm run seed`, then migrate from the newest `data/backups/*.db` (or skip migrate if none) |
| `npm run fetch-posters` | Run [`backend/src/db/fetch-posters.js`](backend/src/db/fetch-posters.js) only (validate/fetch posters in `movies.json`; requires `OMDB_API_KEY`) |
| `npm test` | Run Jest unit tests via [`backend/scripts/save-test-report.js`](backend/scripts/save-test-report.js); report saved under `backend/tests/history/` |

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

4. **Posters:** Run **`npm run fetch-posters`** from `backend/` (or rely on **`preseed`** inside the next `npm run seed`). Fix any **failed** fetches with a manual poster URL in `movies.json`; do not leave the dummy “No+Poster” placeholder as the final state.

5. **Apply JSON to SQLite:** Follow **Agent workflow: apply catalog changes to SQLite (after editing JSON)**—agents must run **preseed + seed**, and **migrate** when preserving user data (`seed:migrate` or `seed` then `db:migrate`). If you only need poster URL fixes and the **catalog** is unchanged, `npm run seed` may be enough: **preseed** still runs, while `seed.js` skips catalog inserts when movies already exist.

6. Confirm logs include expected movie count and similar-pair count.

7. **Unit tests:** From `backend/`, run **`npm test`**. All Jest tests must pass. If a failure is unrelated to the catalog change, note it and fix or escalate; do not treat the movie-list update as complete while the suite is red.

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
- Ran **`npm run fetch-posters`** (or confirmed **`preseed`** ran via `npm run seed` / `seed:migrate`) and resolved any **Failed to find poster** lines (manual URL in `movies.json` if needed).
- Ran **preseed + seed** (via `npm run seed` or via `seed:migrate`’s first phase) and verified posters and catalog counts in logs.
- When preserving user ratings and comments: ran **backup → delete `movies.db` → `npm run seed:migrate`** (preseed + seed + migrate), or the explicit **`npm run seed`** then **`npm run db:migrate -- --from <file>`** pair; confirmed a backup exists under `data/backups\` before deleting the live DB. For disposable local data, confirmed **`npm run seed`** (preseed + seed, no migrate) was sufficient.
- Ran **`npm test`** from `backend/` and the Jest suite passed (or failures were resolved).

## Engineering focus

- Keep changes minimal and focused strictly on the requested movie-list update.
- Prioritize data integrity and reproducible validation over broad refactors.
- When changing the catalog, **do not blindly delete `movies.db`** without a backup if local user data matters; prefer **backup + migrate** over wiping without recovery.
- **Do not stop after editing JSON:** run **preseed, seed, and migrate** (as appropriate) so the live DB matches `movies.json`.
- **Do not skip `npm test`:** the backend Jest suite should be green after the workflow.
