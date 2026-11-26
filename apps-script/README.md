# AtTartil Quiz Results: shared results script

`attartil_results_router.gs` is a backup copy of the Google Apps Script that receives
results from every quiz made since November 2026. The live copy is the
"AtTartil Quiz Results" project in the repo owner's Google Drive. It is deployed as a
web app, and the quizzes send their results to its `/exec` address.

## What it does

- Each quiz sends its results with its own `quizId`, Drive folder path, Sheet title and
  columns (see `RESULTS_SHEET` in any recent quiz, e.g.
  `english/surah/quiz_al-jumuah_ayah3-4.html`).
- On a quiz's first submission, the script creates that quiz's own results Sheet inside
  the Drive folder "ATTARTIL CLAUDE QUIZZES", making any missing subfolders. Later
  submissions go to the same Sheet. Results from different quizzes are never mixed.
- It only creates a Sheet for a quiz that exists in this repository, so strangers
  can't fill the Drive with Sheets.
- It runs as the account that deployed it, so teachers need no script of their own:
  only access to the "ATTARTIL CLAUDE QUIZZES" folder to read results.

Quizzes made before November 2026 still use their own per-quiz scripts.

## Redeploying (only if the live script is lost or must move to another account)

1. Go to script.google.com and click **New project**. Name it "AtTartil Quiz Results".
2. Paste in `attartil_results_router.gs` and click Save. If the results folder has moved,
   change `ROOT_FOLDER_ID` at the top to the new folder's ID.
3. Click **Deploy** > **New deployment** > Web app. Set Execute as: **Me** and Who has
   access: **Anyone**, then click Deploy.
4. On Google's permission screen, tick all three: Google Drive, Google Sheets and
   "Connect to an external service". Without the last one, no new Sheet can be created.
5. Copy the new `/exec` address. Put it into the `SHEET_WEBAPP_URL` of the quizzes that
   use the shared script, and into the AtTartil quiz skill.

The script remembers which Sheet belongs to which quiz. A new deployment starts with
an empty memory, but on each quiz's next submission it finds the existing Sheet by its
title in that quiz's folder, so no results are split.

Keep the live script in the deploying account's own Drive, not in the shared folder.
Anyone who can edit the script can change code that runs with that account's Drive
permissions.
