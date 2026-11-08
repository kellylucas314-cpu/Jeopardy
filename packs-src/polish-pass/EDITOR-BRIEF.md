# Clue editing brief — Clue d'État

You are an editor polishing an ORIGINAL trivia pack for a Jeopardy-style family game. Your job: make every clue as good as a strong real-show clue, with zero factual errors. Work from your own knowledge; do not copy or approximate any clue you remember from television. Rewrite sentences fresh.

## Files
- Input: `in/<batch>.json` — an array of categories `{id, name, clues:[{clue, response, value} x5]}` or finals `{id, name, clue, response}`.
- Output: write the full revised array to `out/<batch>.json` with the SAME ids, SAME names, SAME values, SAME order, same count. Only `clue` and `response` text may change. Then run `python3 validate.py <batch>` from this directory and fix every ERROR (warnings are judgment calls; clear them when you can). Also write `grades/<batch>.md`: a short list of the factual errors you found and fixed, and anything you were unsure about.

## What a good clue looks like (real-show calibration)
- **Length: 60–95 characters is the target; hard cap 110 for $800/$1000/$1600/$2000 rows, 100 for the others.** Real clues average ~80 chars on every row. Cut filler, cut second facts, keep the one hook. Finals: 70–130.
- **One clean declarative sentence.** No semicolons stacking two facts, no parentheticals, no em dashes. A comma or a colon is fine.
- **Vary the opening.** Our clues say "this X…" 90%+ of the time; the show does it ~65%. Within each category, make at least 2 of the 5 clues NOT start with the "This …" / "In 1805 this …" shape. Alternatives: start with the fact ("Havana bartenders muddle mint…"), "It's the…", "He/She…", a fill-in-the-blank quote ("'Frankly, my dear, I don't give a' this"), a bare list for gimmick categories, a question-free fragment ("Bowler hat, cane, toothbrush mustache: his Little Tramp…").
- **Hook first.** Lead with the surprising angle, not the dictionary definition. If a clue is just "this author wrote X", find the detail that makes someone say "ohhh".
- **No giveaways.** Response words must not appear in the clue. A "this 'r' word" hint is only acceptable at the $200 row.
- **Real ladder.** Rows must climb: $200 nearly everyone gets, $1000/$2000 hard but fair. If two rows are out of order, swap their clue+response texts (values stay on the row). If the top row is too easy, sharpen it; if the bottom row is obscure-for-its-own-sake, replace with a famous subject approached from a hard angle.
- **Accuracy is non-negotiable.** Check every fact against your knowledge. If a detail is shaky, replace it with a detail you are sure of. Common traps: "first", "only", superlatives, exact years, who-invented-what. If you change a response, make sure it is still unique within the category and the clue has exactly one correct answer.
- **Responses**: 1–4 words, canonical short form. Keep parenthetical alternates when they help a fuzzy matcher ("Pius VII (Pius the Seventh)"), but keep the main answer first.
- **Evergreen only**: nothing that can go stale (no "current", "latest", "reigning", "newest", living-person job titles, breakable records).
- **Banned engine phrases** (the game filters these; one hit kills the category): seen here, shown here, heard here, pictured, depicted, this song, audio clue, video clue, in this picture, in the picture, the following clip, sung here, played here, read the, this painting shown, this logo, currently, to date, as of now, reigning, incumbent, is now called, now stars, now plays, newest, most recently. Write "this hit"/"this 1975 single" instead of "this song".
- **Category fit**: every clue honors the name's promise and any gimmick.
- Use straight quotes `'` for titles inside clues (as the current files do). No em dashes.

## Pack registers
- **fresh-**: general game-night players; witty, varied, confident.
- **easy-**: Easy Breezy, for older casual players (grandparents). Shorter (50–85 chars), warm, nostalgic subjects (classic Hollywood, crooners, home & garden, proverbs, mid-century America). Even the top row is "a regular person's proud moment", never a specialist's. Do not make Easy harder; do make it cleaner and more charming.
- **freshfinal-/easyfinal-**: a Final is a two-step riddle about something FAMOUS; the work is in the connection, never in obscurity.

## Process
1. Read the whole input file once.
2. For each category: fact-check, fix the ladder, then rewrite each clue to the length/variety targets. Prefer editing to full rewrites when the existing clue already has a good hook, but do not leave a wordy clue wordy.
3. Write the output, run the validator, fix errors, write the grades note.
4. Report back in 5 lines: counts, number of facts corrected, anything you could not resolve.
