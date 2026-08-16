# Question Quality Rubric — 50 points

Every authored category is scored by an **independent grader** (never its author) before
it can enter a pack. Score each criterion 1–5; category score = the sum, judged on its
weakest clue — one bad clue sinks the category until it's revised.

| # | Criterion | 5 looks like |
|---|---|---|
| 1 | **Accuracy** | Every fact checks out; exactly one correct answer; grader verified anything non-obvious |
| 2 | **Clarity** | Clean declarative sentence; "this X…" pattern names the kind of answer; zero awkwardness |
| 3 | **Specificity** | Only one common answer fits; no "could be three things" clues |
| 4 | **Difficulty fit** | The 5 rows genuinely climb; row difficulty matches its dollar value (see ladder below) |
| 5 | **Interestingness** | A hook, a surprise, or an "ohhh" — never a dictionary definition |
| 6 | **No giveaways** | Answer words don't appear in the clue (unless a deliberate hint style) |
| 7 | **Fairness** | Hard rows are hard via knowledge/reasoning, not random obscurity |
| 8 | **Category fit** | Every clue belongs; the name's promise (and any gimmick) is honored by all 5 |
| 9 | **Playable speed** | Answerable in 5–10 seconds aloud; clue ≤160 chars; answer 1–4 words |
| 10 | **Repeat safety** | Name not in the exclusion baseline; meaningfully different from existing categories; responses varied |

## Gates (applied by graders)

- **45–50: accept** into the pack.
- **38–44: revise** — grader fixes the weak clues directly, then re-scores. Accept only if the revision reaches 45.
- **< 38: reject** the category outright. Regenerate rather than pad.
- Any single **factual error = automatic revise-or-reject** regardless of total score.
- Any banned engine phrase (`scripts/check-questions.cjs` list) = fix before scoring.

## Difficulty ladder (this app's values; a generic "100–500" maps onto Round 1)

| Row | Round 1 | Round 2 | Feel |
|---|---|---|---|
| 1 | $200 | $400 | Broad, fast confidence — nearly everyone gets it |
| 2 | $400 | $800 | Common knowledge with light recall |
| 3 | $600 | $1200 | Medium challenge |
| 4 | $800 | $1600 | Specific but fair |
| 5 | $1000 | $2000 | Hard but gettable — never obscure nonsense |

Easy Breezy shifts the whole ladder down: its row 5 ≈ Fresh row 2–3, and subject matter
stays in the nostalgia comfort zone (see STYLE-EASY.md).

## Craft references (what the graders internalize)

- Real-show calibration: correct-rate falls roughly linearly down the board (~72% top row
  to ~43% bottom row) — the ladder should feel like stairs, not a cliff.
- Give players something to work with: even an unknown fact should let a player narrow
  the field and take a satisfying swing.
- ~100 characters is the clue sweet spot; entertainment first, education second.
- The living-room test: would this clue be fun read aloud at game night, with an answer
  that makes someone shout it?
