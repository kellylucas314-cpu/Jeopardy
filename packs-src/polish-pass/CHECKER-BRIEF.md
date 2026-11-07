# Fact-check brief — second, independent pass

You are the independent grader for a batch of ORIGINAL trivia clues that another editor has just revised. You did not write them. Your job is accuracy and fairness, per QUESTION-QUALITY.md in the repo (/home/user/jeopardy/QUESTION-QUALITY.md, read it once).

## Files
- `out/<batch>.json` is the editor's output (categories `{id,name,clues:[{clue,response,value}x5]}` or finals `{id,name,clue,response}`). `in/<batch>.json` is the pre-edit original, for reference only.
- You may edit `out/<batch>.json` IN PLACE. Keep ids, names, values, order and count unchanged; only `clue`/`response` text may change.
- After editing, run `python3 validate.py <batch>` from this directory until 0 errors.
- Write `grades/<batch>-check.md`: every change you made (before → after, one line each, with the reason), plus anything you still consider shaky.

## What to check, clue by clue
1. **Accuracy.** Is every stated fact true? Watch "first", "only", superlatives, exact years, attributions, who invented what, quote wording. If a detail is wrong or you are not sure, replace it with a detail you ARE sure of, keeping the same response where possible.
2. **Exactly one correct answer.** Could a reasonable player give a different, also-correct response? If so, add a discriminating detail or add the alternate in parentheses after the main response.
3. **Response ↔ clue agreement.** Singular/plural, person vs. work, "this city" vs. a country response, etc.
4. **Ladder.** $200 (or $400 in Round 2) should be nearly universal; the bottom row hard but fair. If two rows are clearly inverted, swap their clue+response texts.
5. **Category fit.** Every clue honors the name and any gimmick (e.g. a "rhyme time" or "all answers start with B" category).
6. **No giveaways**: response words must not appear in the clue (except a deliberate $200-row letter hint).
7. **Length and style**: keep 60–95 chars (hard cap 110 on the two bottom rows, 100 above; finals 70–130), one sentence, no em dashes, no banned engine phrases (seen here, shown here, heard here, pictured, depicted, this song, audio clue, video clue, in this picture, in the picture, the following clip, sung here, played here, read the, this painting shown, this logo, currently, to date, as of now, reigning, incumbent, is now called, now stars, now plays, newest, most recently). Evergreen only.
8. **Easy Breezy batches (easy-/easyfinal-)**: the register is for older casual players; make sure nothing got harder than "a regular person's proud moment".

Change only what needs changing. Do not restyle clues that are already correct and clean. Report back in 5 lines: clues checked, facts corrected (count + the 3 most important), swaps, anything unresolved.
