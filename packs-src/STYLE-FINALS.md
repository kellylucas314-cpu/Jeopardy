# Ring In — Final Jeopardy authoring guide

A Final is the last, highest-stakes moment of the game: one clue, private wagers,
everybody writes an answer. The craft target: a **two-step riddle about something famous**.
Players should recognize the answer instantly when revealed ("ohhh!") — the difficulty is
in the connection, never in obscurity.

## File format

JSON array of `{ "name": "CATEGORY NAME", "clue": "…", "response": "…" }`.
Fresh finals go in `nf-*.json`, Easy Breezy finals in `ef-*.json`.

## Craft rules

- The response must be FAMOUS (a name most players have heard), but the clue's angle
  makes them work: connect two facts, resolve a paradox, or spot the era.
  House exemplar — name: CARBON COPIES, clue: "Like diamond, this soft gray mineral that
  fills pencils is an allotrope of pure carbon" → graphite.
- 70–140 characters. One unambiguous best response, 1–4 words.
- Category name: ALL CAPS, punny/evocative, hints at the territory without giving it away.
  Must not be in `exclusion-names.txt` and must be unique within your file.
- Evergreen, rock-solid facts only — every final gets independently fact-checked.
- Spread across many domains — no two finals in your file on the same subject.
- Easy Breezy finals (`ef-`): same structure, but the "work" is gentle recall for an older
  casual player, e.g. connecting a beloved star to a famous role of the 1950s–70s.

## BANNED phrases (engine filters)

"seen here", "shown here", "heard here", "pictured", "depicted", "this song",
"audio clue", "video clue", "in this picture", "in the picture", "the following clip",
"sung here", "played here", "read the", "this painting shown", "this logo", "currently",
"to date", "as of now", "reigning", "incumbent", "is now called", "now stars",
"now plays", "newest", "most recently".

## Workflow (required)

1. Read your inspiration file and `exclusion-names.txt`.
2. Write to your assigned output file.
3. Run `node validate-authoring.cjs <your-file>` until it prints **OK**.
4. Re-read as a hostile fact-checker; fix anything shaky.
