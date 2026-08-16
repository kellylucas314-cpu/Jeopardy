# Question Generation Log

Running tally of the question-factory effort (see `QUESTION-FACTORY.md` for the pipeline,
`QUESTION-QUALITY.md` for the rubric). Counts are **accepted clues** (categories × 5 + finals).

## Baseline (before this run)

| Pack | R1 cats | R2 cats | Finals | Clues |
|---|---|---|---|---|
| Fresh | 232 | 231 | 90 | 2,405 |
| Easy Breezy | 104 | 78 | 40 | 950 |

## 2026-08-16 — Session start: bug fix + factory setup

- **No-repeat bug fixed** in `src/data.js`: premature memory wipes (dry 6-chunk sample
  treated as pack exhaustion), shared memory key across rounds, and 11 category names
  living in both rounds' pools. Now per-round keys, full-pack scan before reset, soft
  resets keeping the last ~3 boards excluded, cross-round guard, legacy-key migration.
  Verified by a 75-game simulation: zero repeats until true pack exhaustion.
- **Archive mined** (93,184 categories → metadata digest: topic mix, difficulty ladders,
  name styles). No clue text extracted — copyright firewall documented in QUESTION-FACTORY.md.
- **Builder upgraded**: cross-round + finals name dedupe (dropped 8 fresh + 3 easy
  cross-round dupes, 6 finals sharing board names).
- **Checker added**: `scripts/check-questions.cjs`.
- **Wave 1 in flight**: 11 writers (120 R1 categories across 10 topic slices + 30 finals)
  — drafted, pending independent grading. Not yet accepted; not yet counted.

Accepted this run so far: **0** (nothing enters a pack before grading).

## 2026-08-16 09:15 UTC — Overnight checkpoint after session-limit interruption

- **Drafted: 37 files · 344 categories · 1,720 board clues · 42 finals**, all validator-
  and cross-file-sweep clean. Snapshot committed to `packs-src/wave3-drafts/`.
- Writers complete: all 10 Fresh R1 slices, all 10 Fresh R2 slices, 30 Fresh finals,
  decades/tech/weird/fashion/mash-up/fan specialty slices, easy `e1-home` + 12 easy finals.
- Writers to relaunch (killed by the session limit): `e1-golden`, `e2-golden`,
  `e2-home`, `e1-century`, `e2-century`.
- **Graded & accepted so far: 24 categories = 120 clues** (`n2-music` 12, `n2-geo` 12 —
  scores 46–49, all accepted; grades in `packs-src/wave3-grades/`). All other graders
  were killed mid-work and will be relaunched.
- Fixed a validator design flaw the interruption exposed: the exclusion list used to
  absorb newly authored names, so re-validating a finished file collided with itself
  (dying graders were "removing self-registrations"). The validator now checks the
  frozen deployed-names baseline plus sibling files, which cannot self-collide.
- Cross-file name collisions all resolved (GADGET INSPECTOR → HANDHELD HISTORY in tech,
  MEASURE FOR MEASURE → GOING TO GREAT LENGTHS in weird, ROMANTIC GESTURES →
  ROMANTIC PERIOD PIECES in music).
- Concurrency policy per Kelly: moderate batches of 5–8 agents from here on.

Accepted running total: **120 clues** of the 2,000 target.

## 2026-08-16 ~11:00 UTC — Grading sweep milestone

- Graders complete on 15 of 37 files: all wave-1 boards except word/mix, the 30 Fresh
  finals, and Round-2 music/geo/screen/lit. **Zero categories rejected**; 12 clue-level
  revisions applied by graders (giveaway leaks, difficulty-ladder breaks, one factual
  precision fix on a Hemingway detail; every revision re-validated).
- Easy Breezy rewrites landed for `e2-golden` and `e2-home` (writers cross-checked
  siblings to avoid subject/answer overlap); only `e1-century` still writing.
- In flight: graders for word/mix, hist/sci (R2), sport/word (R2), mix/food (R2),
  decades+tech, weird+fan.

Accepted running total: **870 clues** (168 categories + 30 finals) of the 2,000 target.

## 2026-08-16 ~13:00 UTC — Full corpus graded, interim compile verified

- **Grading complete for all 42 original wave files: 356 categories + 42 finals =
  1,822 accepted clues. 32 clue-level revisions by graders; zero categories rejected.**
  Notable grader catches: cross-file duplicate facts (Fleming's mold ×3, Percy Spencer,
  Play-Doh, YouTube's first video), answer leaks the checker can't see (Pad Thai→Thailand,
  sombra→sombrero), a two-answer ambiguity (lilac vs lavender), and a factual
  overstatement (Sullivan "introduced" Elvis).
- **Interim compile + full verification suite passed**: builder output Fresh 763 board
  categories + 116 finals, Easy 227 + 50; 100-game no-repeat simulation clean (Fresh now
  cycles after ~62 games, was ~38 pre-wave, ~17 with the old bug); `npm run build` green;
  Playwright smoke test green on both packs (setup → board → 6 unique categories →
  per-round memory keys → clue screen).
- **Top-up batch in flight** to cross the 2,000 target: famous-people (written, grading),
  money & business (written, grading), travel (writing). Easy century pair still grading.

Accepted running total: **1,822 clues** of the 2,000 target.
