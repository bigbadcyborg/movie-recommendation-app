# Update DB workflow — agent prompts

Captured from Cursor agent transcript `91614a0a-ba0b-4500-9e13-999716b9e608` (session covering browse UI, comment POST fix, backup/migrate tooling, seed/seed:migrate, and related git ops). Date: **2026-04-27**.

---

## Browse / catalog

1. how can we modify the /movies page to show every single movie on the database

2. implement option A

---

## Comments (MovieDetail / POST comment)

3. why am i getting this error when attempting to comment on a movie? *(full message included React Router v7 future-flag warnings, favicon 404, tracking-prevention noise, login 401s, and the real crash: `MovieDetail.jsx:200 Uncaught TypeError: Cannot read properties of null (reading 'username')`.)*

4. create a plan to fix this

5. Fix movie comment POST crash (`null.username`) — Implement the plan as specified… *(implementation request with plan attachment; do not edit plan file; use existing todos.)*

6. Implement the plan as specified… *(repeat implementation request — plan attachment for comment fix)*

---

## Data persistence / migration / backups

7. are new users accounts, user ratings, and user comments carried over when the movies.db is deleted and reseeded? where are these attributes stored?

8. this is not good. we must have all of this data migrated over.

9. create a plan for this. one-time migration from an old DB and backup hook + migration workflow are both crucial.

10. Database backup hook and one-time user-data migration — Implement the plan as specified… *(implementation request)*

11. Implement the plan as specified… *(repeat — DB backup/migrate plan)*

---

## Seed / migrate workflow

12. describe the process when npm run seed is ran

13. is the migrate ran after seeding the fresh db?

14. how can we automate this process?

15. for simplicity, lets assume the dev does not delete the movies.db before seeding. create a plan to automate this process

16. i do not want the migrate to be manual. i want it to be automatic

17. Automate seed + migrate (automatic migrate source) — Implement the plan as specified…

18. Implement the plan as specified… *(repeat — seed:migrate automation)*

19. now, describe the prcoess flow when `npm run seed` is ran, given there is no movies.db as well as the case that there is a movies.db

20. now explain seed:migrate when movies.db is present and when it is not present

21. so then, shouldnt we always run seed:migrate? for simplicity on the dev

22. the point is to not lose the users movie ratings and comment data

---

## Git / meta (same session)

23. create a brief commit message

24. undo the previous push

25. go back to 771d74a

26. i want to rebase feat/russell-042726 onto feat/test-history

27. add all of my promtps to the agent from today to promps/russell-prompts/update-db-workflow *(this file)*

---

*Repeated boilerplate lines (“Implement the plan as specified, Do NOT edit the plan file…”) appear multiple times in the transcript when invoking implementation mode; listed once per distinct task above.*
