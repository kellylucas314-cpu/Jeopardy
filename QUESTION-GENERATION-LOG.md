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
