# The Campaign — Napoleon's life as the game's ladder

Clue d'État's **Campaign** play style turns the trivia board into fifteen chapters of
Napoleon's life. Every chapter is one game (Quick or Full). Reach the chapter's score
target and the campaign advances; the Empire on your ledger grows exactly as history's
did — up to the 130-département zenith of 1811, then down to Elba, Waterloo, and Saint
Helena.

Content lives in `public/data/campaign/chapters.json`; logic in `src/campaign.js`; the
engine hooks are in `src/engine.js` (themed categories, Légion d'honneur, chapter
outcome); the setup card, chapter intro, results outcome, and Empire ledger are in
`src/main.js`. `node scripts/check-campaign.cjs` validates the content.

## The fifteen chapters

| # | Years | Chapter | Stage of life | Tier |
|---|---|---|---|---|
| 1 | 1769–1785 | The Cadet from Corsica | Second lieutenant of artillery, 16 | 1 |
| 2 | 1793 | The Siege of Toulon | Captain → brigadier general, 24 | 1 |
| 3 | 1795–96 | A Whiff of Grapeshot | General of the Army of the Interior, 26 | 1 |
| 4 | 1796–97 | The Italian Campaign | Commander of the Army of Italy | 2 |
| 5 | 1798–99 | The Egyptian Expedition | Commander of the Army of the Orient | 2 |
| 6 | 1799 | The Coup of 18 Brumaire | First Consul, 30 | 2 |
| 7 | 1800–02 | Marengo and the Consulate | First Consul for Life | 2 |
| 8 | 1804 | An Emperor Is Crowned | Emperor of the French, 35 | 3 |
| 9 | 1805 | The Sun of Austerlitz | Emperor and King of Italy | 3 |
| 10 | 1806–07 | From Jena to Tilsit | Master of Germany | 3 |
| 11 | 1808–11 | The Zenith of Empire | Emperor at the summit, 41 | 4 |
| 12 | 1812 | The Russian Campaign | Commander of the Grande Armée | 4 |
| 13 | 1813–14 | The Battle of the Nations | Sovereign of Elba | 5 |
| 14 | 1815 | The Hundred Days | Emperor for a hundred days | 5 |
| 15 | 1815–21 | Saint Helena and the Legend | Prisoner of Saint Helena; died at 51 | 5 |

Each chapter carries a 2–3 sentence history, a real quotation with attribution
(quotes that are only "attributed" say so), and an **Empire ledger**: every holding at
that moment with a status (France proper, annexed, satellite, ally, occupied, lost,
place of exile), the year it entered, and a one-line why. Annexations are listed at
the same granularity from 1798 to 1812 so the ledger's size only moves when the map
did. Anchors that are stated as numbers: 83 départements in 1790, 130 in 1811, 86
after 1815; about 28 million people in 1785 and 44 million in France proper at the
zenith; 600,000+ men crossed the Niemen in 1812.

## What a chapter game looks like

- **Themed categories.** Every board carries one category with the Emperor's "N" mark.
  A Quick game gets the chapter's own category (Napoleon's story). A Full game opens
  with "the wider world of that year" (science, culture, America, the arts) and saves
  Napoleon's own chapter for Round II, where values double. The Final is the chapter's
  own two-step riddle ("The Decisive Hour").
- **Difficulty ramp.** Tiers 1–5 set the recipe for the other five categories, the
  clue timer (35s → 22s), and the score target. Recipes are relative to the pack the
  table chose: Easy Breezy tables climb from all-easy to an easy/Fresh mix; Fresh
  tables from an easy-tinged board to Round-2 material. See `chapterRecipe` in `src/campaign.js`.
- **Targets.** Full games: $2,500 / $4,000 / $5,500 / $7,000 / $9,000 by tier; Quick
  games: $1,200 / $2,000 / $2,800 / $3,600 / $4,500. The top score at the table must
  reach the target. After two setbacks on a chapter the target eases one tier, so a
  family night never stalls for good.
- **Légion d'honneur.** Three correct answers in the chapter's themed category earn a
  one-time $500 bonus (`LEGION_BONUS` in `src/engine.js`).
- **Progress** persists in `localStorage` (`jeopardy-campaign`): current chapter, wins,
  attempts. Completed chapters can be replayed from the setup card; "Start over"
  resets everything except the Hall of Fame.

## Content rules

The 30 categories and 15 finals follow `QUESTION-QUALITY.md` (declarative clues with a
hook, a real ladder per category, one unambiguous response, no media/dated phrases).
`scripts/check-campaign.cjs` enforces the engine rules, ALL-CAPS names, unique names
(also against the deployed packs), and no repeated answer within a chapter's game.
Responses carry parenthetical alternates where players phrase things differently
("Pius VII (Pius the Seventh)", "Holland (the Netherlands)") so the fuzzy matcher
accepts natural answers.

## Next steps (front-end pass)

- Real borders on the map. Today a holding is a pin at its capital; drawing the borders of
  1800 needs a historical boundary dataset, which the ledger does not have.

Done on Nov 10 2026 (the weak-spots pass):

- The map. "The Empire" dialog draws a faceted Europe with one mark per holding, shaped and
  coloured by status; a row and its pin point at each other (`src/empire.js`; the coast and
  the pin positions are written by `scripts/build-empire-map.mjs` into `src/empire-map.js`).
  A new holding in `chapters.json` needs a line in that script's `PLACES`, or the build stops.
- Napoleon's figure and his line show on phones after every answer.
- He answers specific play: streaks, quick answers, a won or lost Waterloo Wager, a run cut
  short, the top-value square, the last square.

Done on Nov 10 2026 (the live host pass):

- Napoleon's poses from the character sheets stand on the intro, the board, the clue, the
  wager and the results, and change with the game (`src/host.js`, cut by
  `scripts/build-host-poses.py`).
- Each chapter's board opens with a host line of its own (`CHAPTER_LINES` in `src/main.js`).

Done on Nov 10 2026 (the title page):

- Napoleon tips his hat on the title, and again when tapped. The film is
  `public/assets/host/welcome-tip.mp4`, cut from `art-src/napoleon-hat-tip.mp4` by
  `scripts/build-hat-tip.py`. If the welcome pose is ever redrawn, the film has to be made
  again from the new picture, or the two will not line up.
- The start is two steps on one page (`data-step` on `.setup-screen`, so nothing is lost on
  the way back). Step one is the title: Napoleon, the name and one Play button. Step two is
  the table, "Who's playing?": the players sit along the top as name cards, the whole cast
  stands below them full length (the `ready` pose) with names, and the game's four choices
  (play style, length, questions, answering) keep to one card of pill rows. A tap on a player
  hands them the cast, each player's numbered tag sits on their figure, and taking a figure
  someone else holds swaps the two. A rematch comes back to the table, not the title.
- Elon Musk left the cast on Nov 11 (the only living person in it, Kelly's call). His art is
  kept in `art-src/retired-players/`; an old save that picked him falls back to initials.
