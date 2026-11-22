# Wave 6: the recent shelf

Categories about the 2020s, written in the shorthand in `src/*.txt`.

**The bar (Kelly, Nov 12 2026):** every clue must stay relevant for good. Write about
big things people will still know in ten years (a Best Picture winner, a World Cup
final, a new pope, a record that stood for decades), never a meme, a slang word, a
food craze or a week of gossip. Anchor each clue with a year or the past tense so it
reads as history, not news. If in doubt, ask "would this still be a fair clue in 2036?"

How it reaches the game: `public/data/recent/` is a shelf, not a pack anyone picks.
Every Fresh board takes one category from it per round, and about one Fresh game in
seven ends on a recent final (`recentInfo` in `src/data.js`). Easy Breezy and the
Campaign do not draw from it.

To add more:

1. Write `src/n1-*.txt`, `n2-*.txt`, `nf-*.txt` (format in `build-drafts.cjs`).
2. `node packs-src/wave6/build-drafts.cjs`
3. `node scripts/check-questions.cjs packs-src/wave6/drafts`
4. `node scripts/check-new-clues.cjs packs-src/wave6/drafts` and read
   `node scripts/repeat-candidates.cjs packs-src/wave6/drafts` for same-fact repeats.
5. Merge `notes/category-notes.json` into `packs-src/category-notes.json`, then
   `node scripts/append-pack.cjs <dir with only the NEW drafts> recent` and
   `node scripts/apply-category-notes.cjs`. (The append refuses names that already exist.)
6. `node scripts/check-giveaways.cjs --check`

Facts from late 2025 and 2026 are in `notes/facts-2025-2026.md`, read from Wikipedia on
Nov 12 2026. Anything newer than that needs its own check.
