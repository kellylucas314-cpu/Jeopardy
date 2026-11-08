# Wave 4 writer brief: brand-new clues for Clue d'État

You are writing NEW, 100% original categories for Clue d'État, a Jeopardy-style family game.
They join packs whose 6,812 clues were just polished to real-show standard, so yours must
match that bar on the first pass. An independent fact-checker reads every clue after you.

Read once before writing (all in /home/user/jeopardy):
- `QUESTION-QUALITY.md` (the 50-point rubric and the difficulty ladder)
- `packs-src/STYLE-FRESH.md` or `packs-src/STYLE-EASY.md` (the register for each pack), and
  `packs-src/STYLE-FINALS.md` for finals
- `packs-src/polish-pass/EDITOR-BRIEF.md`, section "What a good clue looks like": its
  length, opening-variety and hook rules are the house standard now and override the older
  style guides where they differ (60–95 chars; Easy Breezy 50–85; finals 70–130)
- your inspiration file(s) in `packs-src/inspiration/` (real-show *metadata only*:
  category names and answers for calibration; never reproduce a clue you remember from TV)
- Skim 2 or 3 chunks of the deployed pack you are writing for (`public/data/original/…`
  for Fresh, `public/data/easy/…` for Easy Breezy) to hear the house voice.

## Your files (write only these, in `packs-src/wave4/drafts/`)
Each board file is a JSON array of exactly 12 categories, 5 clues each, values ascending:
- `n1-<you>.json` Fresh round 1 [200, 400, 600, 800, 1000]
- `n2-<you>.json` Fresh round 2 [400, 800, 1200, 1600, 2000]
- `e1-<you>.json` Easy Breezy round 1, `e2-<you>.json` Easy Breezy round 2
- `nf-<you>.json` Fresh finals and `ef-<you>.json` Easy Breezy finals: arrays of
  `{ "name", "clue", "response" }`
Shape: `{ "name": "ALL CAPS NAME", "clues": [{ "clue": "…", "response": "…", "value": 200 }, …] }`

## The bar (what the polish pass enforced)
- Accuracy first. Watch "first", "only", superlatives, exact years, attributions. If you are
  not certain of a detail, pick a different detail. Zero factual errors is the goal.
- Exactly one correct response; parenthetical alternates for natural phrasings
  ("Holland (the Netherlands)"). Responses 1–4 words, canonical short form.
- Hook first, never a dictionary definition. One clean sentence, no semicolons, no em dashes.
- Vary openings: in each category at least 2 of 5 clues must NOT start with "This…".
- A real ladder: row 1 nearly everyone gets, the last row hard but fair.
- No giveaways (response words not in the clue). Evergreen only. Banned engine phrases are
  listed in the style guides; one hit kills a category.
- Category names: ALL CAPS, our own puns or twists, never a televised category name.
- No response used twice in one file. Spread subjects widely.

## No repeats, no copying (enforced by script)
New clues must not restate a fact our packs already use, and must not echo a televised clue.
Before you finish, run from /home/user/jeopardy and fix every problem until both say OK:

    node scripts/check-questions.cjs packs-src/wave4/drafts/<your file>
    node scripts/check-new-clues.cjs packs-src/wave4/drafts/<your file>

`check-new-clues` takes about 6 seconds per run; run it on all your files at once when you
can. If it says a clue restates an existing one, pick a different fact or a different
response, do not just reword. Picking less-used subjects up front saves rework: a quick
`grep -ril "<answer>" public/data/original public/data/easy | wc -l` shows how often an
answer is already used.

## When done
Write `packs-src/wave4/notes/<you>-writer.md`: one line per file (counts), and any clue you
were less than sure about. Do not touch any other file, and do not run git.
