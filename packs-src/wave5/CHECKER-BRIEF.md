# Wave 5 checker brief: independent fact-check of new clues

You are the independent grader for brand-new ORIGINAL clues that another writer just wrote.
You did not write them. Follow `packs-src/polish-pass/CHECKER-BRIEF.md` ("What to check,
clue by clue") and `QUESTION-QUALITY.md`; this note only changes the file layout.

- Your files are listed in your task, in `packs-src/wave5/drafts/`. Edit them IN PLACE.
  Keep names, values, order and counts unchanged; change only `clue` / `response` text.
  (If a category is beyond repair, rewrite its clues; keep its name if it still fits.)
- Accuracy is the job: every fact true, exactly one correct response, response agrees with
  the clue, the ladder climbs, category fit, no giveaways, 60–95 chars (Easy 50–85, finals
  70–130), one sentence, no em dashes, evergreen, no banned phrases. Easy Breezy must stay
  gentle.
- Change only what needs changing; do not restyle clean, correct clues.
- When finished, run from /home/user/jeopardy until both print OK:
      node scripts/check-questions.cjs <each file>
      node scripts/check-new-clues.cjs <all your files at once>
- Write `packs-src/wave5/notes/<writer>-check.md`: every change (before → after, one line,
  with the reason), plus anything still shaky. Do not touch other files; do not run git.
- Report back in 5 lines: clues checked, facts corrected (count + the 3 most important),
  swaps, anything unresolved.
