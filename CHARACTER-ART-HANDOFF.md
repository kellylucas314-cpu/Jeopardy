# Clue d’État · playable character art

Kelly approved the angular faces from the palace-library treatment, then approved the 13 character sheets. The next job is to wire the cast into the actual game. The sheets, portraits and poses are finished.

## Where the art lives

- `public/assets/players/manifest.json` lists the 13 character IDs, names, portraits and pose paths. Resolve the paths relative to the manifest directory, using the app base so they also work on GitHub Pages under `/Jeopardy/`.
- Each character has a small `portrait.webp` plus transparent `ready.png`, `thinking.png` and `victory.png`. The 39 sprites are 960 × 1440 with a common foot baseline. Use the portrait for small UI. Load larger art as needed.
- `artwork/player-character-references/` contains the printable 13-page model book and one preview of each sheet. These are visual references. The separate image assets above are the ones to render in play.
- The packet was prepared against GitHub main at `584f6ef` on November 8, 2026. It includes artwork and this brief. On a different machine, extract the packet, then copy this brief and the two asset directories into a current Jeopardy checkout, preserving their relative paths and any existing work.

## Open Loops

Implement player selection, carry each selection through play, and verify the local experience. The prepared checkout contains the art; gameplay wiring is the open task.

## What The Next Chat Must Know

1. Add a compact character picker to each existing player-name row on setup. Let each of the 1–3 players choose independently from all 13, keep the player's typed name, and keep Napoleon as host. Use actual portraits and accessible text labels. Preserve existing choices when the number of players changes.
2. Add a stable character ID per player and remember it with setup preferences. Trace both free play and Campaign into `startGame()` and player creation. Keep monograms as the fallback for existing preferences or records without a character, and for missing/invalid assets. Use each ID to look up local files in the manifest.
3. Suggested placement: portrait by the player's name/score and at pass-the-device handoffs; ready pose for the setup preview; thinking pose for the player answering when known; victory pose on results for the appropriate winner(s). Respect the game's existing turns, buzz, solo, multiplayer, and tie behavior.
4. Current entry points are `renderSetup()` and `renderPlayerInputs()` in `src/main.js`. Today the start handler derives avatars again from names. Update that path as well as the picker. Check `renderBoard()`, `passCover()` and `renderResults()`; `newPlayer()` and `startGame()` in `src/engine.js`; preference and record helpers in `src/state.js`; and the existing components in `src/styles.css`.
5. Build with `npm run build`. In the local preview, start a game with two named players using different characters, check the correct player on the board and result screen, reload setup to check persistence, and confirm old preferences still work. Spot-check Campaign, narrow mobile layout, and that deployed-subpath image URLs resolve. Give Kelly the local preview and a screenshot for review.

The previously rejected photoreal faces and earlier experiments are outside this kit. Use the supplied art as-is. Keep work local for Kelly’s review; publishing is a separate decision.

## Paste This Into The Next Chat

Read CHARACTER-ART-HANDOFF.md and implement the 13-player-character picker in this game. Use the supplied portraits and poses, keep Napoleon as host, and show me a working local preview. Leave publishing for my review.

