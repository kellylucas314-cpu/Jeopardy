# Ring In — Fresh Pack authoring guide (wave 3)

You are writing **100% original** trivia categories for Ring In, a Jeopardy-style game.
Everything you write must come from your own knowledge. You have been given real-show
*metadata* (category names, answers, difficulty stats) as inspiration — you have NOT been
given any real clue text, and you must never reproduce or approximate a clue you may
remember from television. Write every sentence fresh.

## File format

A JSON array of exactly **12 categories**. Round 1 files (`n1-*.json`) use values
[200, 400, 600, 800, 1000]; Round 2 files (`n2-*.json`) use [400, 800, 1200, 1600, 2000]:

```json
[
  { "name": "CATEGORY NAME", "clues": [
    { "clue": "…", "response": "…", "value": 200 },
    …exactly 5, values ascending…
  ] }
]
```

## Category names

- ALL CAPS, punchy, and in our house voice: puns and wordplay welcome
  (CROWNED HEADS for royalty, PAGE TURNERS for books, SHUTTER TO THINK for photography).
- Must NOT appear in `exclusion-names.txt` (the validator enforces this).
- Generic archetypes (WORD ORIGINS, POTPOURRI) are taken — invent your own twist.
- A gimmick category must announce its gimmick in the name or be instantly clear from
  the first clue (e.g. "each response contains a color").

## Clue craft

- **Declarative sentence with a hook** — an interesting fact angle, not a dictionary
  definition. "This Russian novelist put an axe in Raskolnikov's hands" beats
  "This author wrote Crime and Punishment."
- The pronoun pattern: "this actor…", "this country…" — the clue names the *kind* of
  answer so players know what to give.
- 60–110 characters is the sweet spot (max 160). Higher values may run a bit longer.
- **One unambiguous best response.** If two answers could be right, rewrite.
- Responses short: 1–4 words, the canonical name ("Dostoevsky", not "Fyodor Mikhailovich
  Dostoevsky"). Surname alone is fine when unambiguous.
- **Evergreen only.** Nothing that can go stale: no "current" anything, no records that
  may be broken, no living-person job titles that change. Facts that were true in 1990
  and will be true in 2040.
- **Rock-solid facts only.** If you are not certain of a detail, choose a different fact.
  Every clue will be independently fact-checked; aim for zero corrections.
- No two clues in your file may share a response. Vary the people/places you feature.

## BANNED phrases (the game engine filters these at runtime — one hit kills the whole category)

Never use, in any casing: "seen here", "shown here", "heard here", "pictured",
"depicted", "this song", "audio clue", "video clue", "in this picture", "in the picture",
"the following clip", "sung here", "played here", "read the", "this painting shown",
"this logo", "currently", "to date", "as of now", "reigning", "incumbent",
"is now called", "now stars", "now plays", "newest", "most recently".
(For music, write "this hit", "this ballad", "this 1975 single" instead of "this song".)

## Difficulty ramp (calibrate against your inspiration file's answer lists)

| Row | Feel |
|---|---|
| R1 $200 | Nearly everyone gets it. Household knowledge. |
| R1 $400–600 | Comfortable general knowledge. |
| R1 $800 | Solid trivia — a player is pleased to know it. |
| R1 $1000 | Tough but fair; a well-read player can reach it. |
| R2 $400 | ≈ R1 $600. Round 2 starts harder. |
| R2 $800–1600 | Genuinely challenging, still famous subject matter. |
| R2 $2000 | The table goes quiet; the reveal earns respect. Never obscure-for-obscurity's-sake. |

The ramp must be REAL: reading rows 1→5 should feel like climbing stairs.

## House exemplars (match this energy)

- $200: "A lightning-bolt scar marks the forehead of this boy wizard of Hogwarts" → Harry Potter
- $600: "This small-town lawyer defends Tom Robinson in 'To Kill a Mockingbird'" → Atticus Finch
- $1000: "Ralph Ellison's landmark 1952 novel about an unnamed Black narrator living underground in New York" → Invisible Man
- R2 $2000: "Droogs viddy this Russian-laced teen slang real horrorshow in Anthony Burgess' 'A Clockwork Orange'" → Nadsat

## Workflow (required)

1. Read your inspiration file and `exclusion-names.txt` for your niche.
2. Write your 12 categories to the assigned output file.
3. Run `node validate-authoring.cjs <your-file>` from the authoring directory and fix
   every reported problem until it prints **OK**.
4. Re-read your clues once as a hostile fact-checker; fix anything shaky.
