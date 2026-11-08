# Grading pass: score every new category on the 50-point rubric

You are an independent grader for Clue d'État, a Jeopardy-style family game. The new
categories in `packs-src/wave4/drafts/` and `packs-src/wave5/drafts/` have been written,
fact-checked, and audited for repeats. Nobody has yet scored them on the quality rubric the
original packs were graded on. That is your job: make them as FUN and as fair as the best
real-show categories, not just correct.

Read first: `QUESTION-QUALITY.md` (the 10 criteria, 1–5 each, judged on the weakest clue)
and the "What a good clue looks like" section of `packs-src/polish-pass/EDITOR-BRIEF.md`.
Register: `packs-src/STYLE-FRESH.md` for n- files, `packs-src/STYLE-EASY.md` for e- files,
`packs-src/STYLE-FINALS.md` for nf-/ef- files.

## For each category (and each final)
Score all 10 criteria. Earlier passes already covered accuracy and repeats, so weigh hardest:
- **Interestingness (5):** does each clue have a hook, a surprise, an "ohhh"? A clue that is
  only a definition or a bare "this author wrote X" scores 2. Replace the fact angle, keeping
  the response if possible.
- **Difficulty fit (4):** read rows 1→5 as a table of family players. Does it climb like stairs?
  Row 1 should be nearly universal; the top row hard but gettable from famous subject matter.
  Swap clue+response text between rows if two are inverted; sharpen or replace if not.
- **Clarity (2) and Playable speed (9):** one clean sentence, answerable aloud in 5–10 seconds,
  the "this X" names the kind of answer. Trim clues over ~95 chars (Easy over 85) unless the
  extra words earn their place; hard cap 110 (Easy 100), finals 70–130.
- **Specificity (3) and Fairness (7):** only one common answer fits; hard rows are hard through
  knowledge, not obscurity. Easy Breezy must stay a regular person's proud moment.
- **Category fit (8):** the name's promise and any gimmick hold for all 5; the name itself is
  punchy and in the house voice (puns welcome). You may rename a category if the name is flat
  or misleading; a new name must be ALL CAPS and not already used (grep public/data and both
  drafts folders).
- Also confirm: No giveaways (6), Repeat safety (10), and sanity-check Accuracy (1) on anything
  that looks shaky; you are the last reader.

## Gates
- 45–50: accept as is.
- 38–44: fix the weak clues directly, then re-score; it must reach 45.
- < 38: rewrite the category (same name unless the name is the problem).
Any fix must be a fact you are certain of. Before adding a new fact or response, grep
`public/data/original`, `public/data/easy`, `public/data/campaign`, `packs-src/wave4/drafts`
and `packs-src/wave5/drafts` for the response so you don't restate a fact the game already
uses. Keep values, order and counts unchanged. Change nothing in a category that already
scores 45+: a grader who restyles clean clues is adding risk, not quality.

## Output
1. Edit your assigned files in place. Touch no other draft file.
2. Write `packs-src/wave5/notes/grades-<you>.md`: one line per category, `score | NAME | kept`
   or `score→newscore | NAME | what changed (before → after, one line per clue)`.
3. Run from /home/user/jeopardy until both print OK:
       node scripts/check-questions.cjs packs-src/wave4/drafts ; node scripts/check-questions.cjs packs-src/wave5/drafts
       node scripts/check-new-clues.cjs packs-src/wave4/drafts ; node scripts/check-new-clues.cjs packs-src/wave5/drafts
   (Problems naming files that are not yours belong to another grader; ignore those.)
4. Do not run git. Report back in 5 lines: categories graded, score distribution, categories
   fixed, categories rewritten, anything unresolved.
