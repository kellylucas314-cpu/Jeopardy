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

## 2026-08-16 ~14:30 UTC — RUN COMPLETE: 2,122 accepted clues ✅

**Final tally: 416 categories + 42 finals = 2,122 accepted clues** (target was 2,000).
38 clue-level revisions by independent graders; **zero categories rejected**; every
category scored 45+/50, most 47–49, range 46–50.

New content by slice (categories, R1+R2): geography 24, history 24, science 24,
literature 24, movies/TV 24, music 24, sports/games 24, food/brands 24, wordplay 24,
art/myth/politics/animals 24, 2000s/2010s 12, internet/tech 12, weird facts 12,
fashion/design 12, Before & After mash-ups 12, Formula 1 + UNC 8, famous people 12,
money/business 12, travel 12 — plus 30 Fresh finals; Easy Breezy: golden-age 24,
home & hearth 24, 20th-century memories 24, plus 12 easy finals.
Difficulty distribution is uniform by construction: every category is a 5-row ladder,
so each dollar tier holds exactly 416 new clues.

**Compiled packs (deployed schema):** Fresh 404 R1 + 395 R2 + 116 finals;
Easy Breezy 140 R1 + 111 R2 + 50 finals. Fresh now supports ~65 full games
before any category can repeat (was ~38 pre-wave, ~17 with the old bug).

**Verification:** checker sweep OK (44 files, zero problems); 100-game no-repeat
simulation clean on both packs; `npm run build` green; Playwright smoke green
(both packs: setup → board → 6 unique categories → per-round memory → clue screen).

**How to run:** `npm install && npm run build`, `npx vite preview --port 4173`, open
http://localhost:4173/. Checker: `node scripts/check-questions.cjs` (defaults to
packs-src/). Sources of record: `packs-src/wave3-drafts/` (rich sources),
`packs-src/wave3-grades/` (scores), compiled chunks in `public/data/`.

**Suggested next batch focus:** more Easy Breezy (its Round 2 still cycles soonest,
~18 games); a mythology/legends dedicated slice; more Before & After; daily-challenge
seed boards. Test first: play a Fresh full game and an Easy quick game on the PR
preview; spot-read the F1/UNC categories for family fit.

## 2026-08-16 ~18:00 UTC — Wave 4 underway (Fable limit → Opus 5)

- **Milestone: 2,362 accepted clues** (464 categories + 42 finals), 52 revisions,
  still **zero rejections**. Wave-4 grading has cleared mythology ×2 and animals ×2
  (48/48 accepted, 46–48), catching 14 cross-file duplicate clues that the automated
  checker cannot see (a Ravana leak between myth files, twin clownfish/goose clues,
  a third owl answer).
- Fable 5 session limit hit mid-wave; six agents died and were relaunched on Opus 5
  with identical briefs. No authored work was lost — every dead agent's file was
  either already on disk or rewritten fresh.
- Wave-4 slices drafted so far: mythology ×2, animals ×2, games & toys ×2,
  geography II, wordplay II, science II, history II, music II, plus 24 new finals.
- Still to come: screen II, literature II, food II, six Easy Breezy II lanes,
  12 easy finals, then grading, compile, and verification toward the 3,300 stop.

## 2026-08-16 ~20:00 UTC — Wave 4 checkpoint: 2,746 accepted

- **2,746 accepted clues** (536 categories + 66 finals), 67 revisions, zero rejections.
- Graded this round: mythology ×2, animals ×2, screen II, history II, literature II,
  music II, wordplay II, science II, and 24 new Fresh finals — 144 categories + 24 finals,
  all cleared at 45+.
- Grader catches worth noting: a factual error on the code talkers (they used an encoded
  vocabulary built on Navajo, not plain Navajo), a wrong date range on the Rebecca Riots
  (1839–43), a Meteor Crater measurement, a Torricelli/Galileo relationship overstatement,
  and several clues that had independently duplicated each other across files
  (Cruella de Vil, Waterloo, Socrates' hemlock, the stratosphere, clownfish, Canada geese).
- All 62 authored files sit in `packs-src/wave3-drafts/`; grades in `packs-src/wave3-grades/`.
- Remaining: grading for food II and the six Easy Breezy II lanes + 12 easy finals,
  then compile, verification suite, and the final milestone push.

## 2026-08-16 ~22:00 UTC — WAVE 4 COMPLETE: 3,353 accepted clues

**Final tally: 655 categories + 78 finals = 3,353 accepted clues.**
101 clue-level revisions by independent graders; **1 category rejected**
(ANTIQUES BOARD SHOW — four of its five answers duplicated a sibling file and no
replacement could hold the category's promise). Every accepted category scored 45+/50.

**Wave 4 added** (on top of wave 3's 2,122): mythology x2, animals x2, games & toys x2,
geography II, wordplay II, science II, history II, music II, literature II, screen II,
food II, 24 Fresh finals; Easy Breezy gained world x2, storybook x2, pastimes x2 and
12 finals — the Easy pack's Round 2 was the lane that cycled soonest, so it got the
most attention.

**Compiled packs:** Fresh 487 R1 + 479 R2 + 140 finals; Easy Breezy 176 R1 + 147 R2 +
62 finals. Fresh now runs ~79 full games before any category can repeat (was ~17 with
the original bug, ~38 pre-wave-3, ~62 after wave 3).

**A real regression caught by the suite, not by a human:** with Fresh R1 crossing 41
chunks, the loader's 40-chunk scan cap meant a late-cycle board could never see the
final chunk, so it declared the pack exhausted early and reset the memory while fresh
categories remained. `src/data.js` now scans every chunk of an original pack and keeps
the cap only for the archive (which holds hundreds of chunks and can never truly run
dry, since its 3,000-name memory cap is smaller than 40 chunks' worth of categories).

**Two clues rescued from the runtime filter:** the engine's media filter was blocking
"in this picture book" (a rule meant for "in this picture") and a written reference
using "this song". Both clues were reworded to house style rather than weakening a
filter that legitimately protects against media-dependent archive content.

**Verification:** checker sweep OK (66 files, 655 categories, 3,275 board clues,
78 finals, zero problems); 115-game no-repeat simulation clean on both packs;
`npm run build` green; Playwright smoke green on both packs.
