# Design QA

## Scope

- Selected reference: `generated_images/exec-59b29d8d-09ff-4180-bf3f-3b25f0a98932.png`
- Live implementation: `https://kellylucas314-cpu.github.io/Jeopardy/`
- Browser viewport: 1363 × 936 at DPR 1
- Compared state: two-player Campaign I board, 30 clues remaining, keyboard cursor active
- Typography: Manrope Variable with IBM Plex Mono for compact campaign metadata

## Visual comparison

The reference and live board were inspected together at the same 1363 × 936 viewport. The implementation preserves the approved composition and hierarchy:

- bone clue cards on a peach faceted field
- deeper mineral-green ground and active states
- flat orange category headers
- centered sans-serif title and campaign metadata
- board on the left with full-height Napoleon on the right
- host prompt, reroll control, clue count, and historical guest strip along the lower edge

### Findings and resolutions

| Priority | Finding | Resolution |
| --- | --- | --- |
| P1 | Napoleon and the historical guest strip initially rendered materially smaller than the selected composition. | Increased host scale to 1.55 from the bottom anchor and increased the guest-strip height from 64px to 78px. Rebuilt, redeployed, and compared again. |
| P2 | The selected board state needed stronger contrast without returning to the earlier heavy palette. | Kept the active tile in deep mineral green with white type while preserving bone surfaces and the peach field. |
| P2 | The previous icon-font package emitted unused multi-megabyte font formats. | Self-hosted the single WOFF2 font and retained only the four Phosphor glyph mappings used by the game. |

## Title-page motion QA

- Video loaded from `public/assets/napoleon-title.mp4` with a static poster fallback.
- Confirmed autoplay, muted playback, looping, and inline playback in the live browser.
- Reported duration: 6.041667 seconds.
- Reported ready state: 4.
- Playback was active during inspection.

## Interaction QA

- Player-count selection rendered correctly.
- “How to play” opened and closed correctly.
- “Begin the Campaign” entered the loading state and produced a six-category, 30-clue board.
- “Redraw the map” replaced all six categories.
- A clue opened correctly, accepted the answer `sombrero`, awarded $200, updated the scoreboard, and returned to the board.
- Title, background, Napoleon, guest portraits, font files, poster, and video loaded successfully on the deployed site.
- No application-origin console errors or warnings were observed. Browser-extension metadata errors were excluded as unrelated to the application.

## Build verification

- `vite build`: passed
- `git diff --check`: passed
- GitHub Pages deployment: passed

final result: passed
