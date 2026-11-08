# Grades, grader g1 (wave 4 Fresh round 1 + two finals files)

Files: n1-w1-hist, n1-w2-lit, n1-w3-screen, n1-w4-sci, n1-w5-mix, nf-w1-hist, nf-w2-lit.
Scored on the 50-point rubric, judged on each category's weakest clue. Accuracy re-read on every clue;
nothing factually wrong found. Format: `score | NAME | kept` or `score→new | NAME | what changed`.

## n1-w1-hist
48 | UNDER THE BRIDGE | kept
47 | CAPITALS BY DESIGN | kept
48 | OFF THE OLD MAP | kept
48 | PHARAOH ENOUGH | kept
47 | NECESSITY'S CHILDREN | kept
48 | HOIST THE COLORS | kept
47 | ISLE BE THERE | kept
47 | REDCOATS & REBELS | kept
48 | HELLENIC HIGHLIGHTS | kept
47 | BUCKET LIST STOPS | kept ($200 is exactly 100 chars, at the cap; the minaret hook earns it)
47 | EMPIRE BUILDING | kept
47 | LOWER 48 LORE | kept (Florida $600 is a touch easier than Arizona $400, not a clear inversion)

## n1-w2-lit
48 | FOUR-LEGGED FOOTNOTES | kept
47 | TWIN-RHYME TIME | kept
48 | MOTHERS OF MYTH | kept
47 | GAZETTEER GLOSSARY | kept
48 | EXIT, STAGE DEAD | kept
47 | LOAN ARRANGERS | kept
48 | STORYBOOK ZIP CODES | kept
47 | VERSE & VERNACULAR | kept
47 | KEEP YOUR DAY JOB | kept
48 | Q, HOLD THE U | kept
48 | NAMED ON THE COVER | kept (note: "Rebecca" is also the $1000 response in n1-w3-screen HITCH IN THE PLOT, different fact)
47 | LANDLUBBER LINGO | kept

## n1-w3-screen
47 | THE COMPOSER'S CHAIR | kept
47 | PUNCHING THE TV CLOCK | kept
47 | OVERTURES AND BEGINNERS | kept
44→48 | MOTOR CITY MUSIC | $1000 was the easiest clue in the category and a bare "X fronted this group" (Int 2, Diff 3).
  $1000: "Smokey Robinson fronted this Motown group on 'The Tracks of My Tears'" → "Motown got its first million-seller in 1960 with 'Shop Around' by this group" (the Miracles, unchanged)
47 | HITCH IN THE PLOT | kept
47 | BLUE NOTES | kept
47 | PIXAR DUST | kept
47 | TOON IN TOMORROW | kept
47 | PICK, BLOW OR BOW | kept
47→48 | BOOTS AND BALLADS | rows 1 and 2 were inverted: "Man in Black" Johnny Cash is the universal one, Loretta Lynn needs recall. Swapped the two clue+response texts; values stay on their rows. No wording changed.
44→47 | CALL THE SHOTS | $200 and $400 were bare "this director directed X" (Int 2). $200 Spielberg left as is: a plain row 1 is acceptable and the Bruce-the-shark hook is already used twice in deployed packs.
  $400: "This director brought all three 'Godfather' films to the screen" → "He cast his infant daughter Sofia as the baby baptized in 'The Godfather'" (Francis Ford Coppola, unchanged)
48 | BRITISH INVASION FORCE | kept ($200 is plain but row 1; the rest climb cleanly)

## n1-w4-sci
47 | BEASTLY HABITS | kept
47 | AN INSIDE JOB | kept
48 | OVER THE MOONS | kept
47 | DRAWER POWER | kept
48 | PERIODIC TABLE MANNERS | kept
47 | FORECAST YOUR VOTE | kept
47 | PASSPORT PLATES | kept
47 | IDEA FACTORY | kept
44→48 | NUMBER CRUNCH TIME | $1000 was a dictionary definition that recited the sequence (Int 2) and was easier than the $600 and $800 rows (Diff 2).
  $1000: "Each number in this Italian's famous sequence is the sum of the two before it: 1, 1, 2, 3, 5, 8" → "A puzzle about breeding rabbits in his 1202 'Liber Abaci' introduced this Italian's famous sequence" (Fibonacci, unchanged)
47 | SIP CODE | kept
47 | GREEN THUMB DRIVE | kept
47 | AFTERS PARTY | kept

## n1-w5-mix
48 | GAME BOARD OF DIRECTORS | kept
47 | RINGS AND THINGS | kept
47 | PLAYTHINGS PAST | kept
47 | ART-ITUDE | kept
47 | SPORTING DIGITS | kept
48 | WHAT'S IN A BRAND NAME? | kept
47 | DATE NIGHTS | kept
44→47 | COURTING DISASTER | $1000 was the easiest clue on the board: "shuttlecocks" hands over badminton (Diff 2, Int 3). The Beaufort-estate angle is already used in a wave 5 draft, so a different hard angle:
  $1000: "Shuttlecocks first flew for Olympic medals at the 1992 Barcelona Games in this sport" → "British officers in 1870s India played an early version of this racket sport, which they called Poona" (badminton, unchanged)
47 | HOLY DESTINATIONS | kept
47 | WHAT'S THAT THING? | kept
47 | CLOTHES CALL | kept
47 | FOOTY NOTES | kept

## nf-w1-hist (finals)
48 | WRONG WAY ROUND | kept
47 | NAME CHANGE | kept
46 | NAMED FOR DAD | kept (name plus "Quaker founder" makes it gentle, but the owed-money paradox is the work)
47 | A CAPITAL HONOR | kept

## nf-w2-lit (finals)
48 | CHANGE OF NUMBERS | kept
47 | WHAT'S IN A NO-NAME? | kept
45 | THE GIFT THAT NEVER GROWS UP | kept (the name nearly answers it; acceptable for a family final, flagged for the editor)
48 | X MARKS THE START | kept

## Checks
Both `check-questions.cjs` and `check-new-clues.cjs` print OK on wave4 and wave5 drafts after the edits.
Every new fact was grepped against public/data/original, easy, campaign and both drafts folders first:
"Shop Around", the Sofia Coppola baptism, 'Liber Abaci'/rabbits and Poona appear nowhere else in the game.

## Unresolved (for the editor)
The wave 4 draft categories were already appended to public/data, so the five clue changes above live only in
the drafts until the deployed chunks are re-synced from them: MOTOR CITY MUSIC and CALL THE SHOTS are in
public/data/original/jeopardy/chunk-042.json, COURTING DISASTER in chunk-043.json, BOOTS AND BALLADS and
NUMBER CRUNCH TIME in chunk-045.json.
