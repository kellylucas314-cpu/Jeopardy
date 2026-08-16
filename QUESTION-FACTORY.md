# Question Factory — goal & operating doc

Goal: grow the original question bank to ~**2,000 accepted clues** (≈400 categories of 5,
plus Finals), original wording throughout, quality over raw count. Do not merge to main,
deploy, or publish during the run — work lives on the session branch and its **draft PR**.

## Operating decisions (adjusted from the original /goal draft)

1. **Branch & safety.** Work continues on the session branch (`claude/jeopardy-game-*`)
   with milestone commits **pushed to the draft PR**. Pushing a draft PR publishes
   nothing — GitHub Pages deploys only on merge to `main`. Local-only commits are
   unsafe in an ephemeral cloud container; pushed milestones are the checkpoint system.
2. **Schema.** Authored sources live in `packs-src/` and may carry rich metadata
   (topic, grades, notes). `scripts/build-original-pack.cjs` compiles them into the
   app's chunk schema (`{name, clues:[{clue, response, value}]}`), stripping extras —
   the app is untouched. (A post-reveal "fun fact" feature can use the rich fields later.)
3. **Units & values.** The app deals in categories of 5 clues at $200–1000 (R1) /
   $400–2000 (R2); a generic 100–500 spec maps onto that ladder. "Accepted questions"
   are counted as accepted clues: categories × 5 + finals.
4. **Independent review, not self-grading.** Writers never grade their own work. Separate
   grader/fact-checker agents score every category against `QUESTION-QUALITY.md`
   (45/50 gate) and verify facts before anything enters a pack.
5. **Copyright firewall.** The televised archive is used as *metadata only* — category
   names, answers, difficulty stats mined into inspiration digests. Writers never see
   archive clue text; every clue is written fresh. User-facing wording says
   "trivia board", never the show's name.

## Pipeline (one batch)

1. **Slice** topics and difficulty targets; refresh the exclusion baseline.
2. **Write** — parallel authors, one topic slice each, style guide + digest + baseline.
3. **Check** — `node scripts/check-questions.cjs` (schema, values, banned engine phrases,
   dupes, leakage warnings) must print OK.
4. **Grade** — independent reviewers fact-check and score per the rubric; fix 38–44s,
   drop <38s and anything unfixably wrong.
5. **Compile** — `node scripts/build-original-pack.cjs <src-dir> [fresh|easy]`, which
   dedupes within and across rounds and updates the manifest.
6. **Verify** — no-repeat simulation + `npm run build` + Playwright smoke.
7. **Log & checkpoint** — update `QUESTION-GENERATION-LOG.md`; commit and push at every
   major milestone (~each wave / ~250 accepted clues).

## Topic mix

Broad game-night slices first: movies & TV, music, sports & games, food + drink,
history, science, geography & travel, pop culture, wordplay & language, literature,
mythology & art, animals, money + business, famous people, weird facts, internet + tech,
2000s/2010s, fashion + style, Before & After-style gimmicks — plus small fan slices
(Formula 1, UNC / North Carolina) and the Easy Breezy nostalgia lanes.

## Stopping & reporting

Run until ~2,000 accepted clues, the user stops it, usage runs out, or a real blocker.
Final report: accepted/revised/rejected counts, category + difficulty distribution,
files changed, commits, how to run the game and the checker, what to test first, and
what the next batch should focus on.
