# Ring In — Project Handoff & Context

_Compiled 2026-07-31 at the end of a long build/audit session. Read this first in a new chat._

## What this project is

**Ring In** (formerly "Jeopardy") is a browser-based, Jeopardy-style trivia game for game
nights and solo play, built for Kelly Lucas & friends/family.

- **Live site:** https://kellylucas314-cpu.github.io/Jeopardy/
- **Repo:** `kellylucas314-cpu/Jeopardy` (this repo). Default branch `main`.
- **Deploys:** every push to `main` runs `.github/workflows/deploy.yml` (npm ci → vite build →
  GitHub Pages). Deploy takes ~40 seconds.
- **Working branch used by Claude sessions:** `claude/amazing-ramanujan-udcfur`. Because PRs are
  squash-merged, each new PR cycle needs `git merge origin/main -X ours` on the branch first
  (established pattern; see git log for "Merge main (squashed #N)" commits).

## Architecture

Vite + vanilla JS, no framework. Entry `index.html` → `src/main.js`.

| File | Role |
|---|---|
| `src/main.js` (~1,600 lines) | All screen rendering (setup → board → clue → daily double → final → results), buzz-mode key handling (Q/P/B), modals, share, confetti |
| `src/engine.js` | Game logic: scoring, streak bonuses (3+ in a row pays streak×$100), turn order, daily doubles, final wagers, judge overrides, board reroll |
| `src/state.js` | Central state + localStorage: prefs (`jeopardy-prefs`), hall of fame (`jeopardy-records`) |
| `src/data.js` | Pack-aware data loading + **cross-game no-repeat memory** (`jeopardy-played`) |
| `src/fuzzy.js` | Forgiving answer matching (typos, surnames, alternatives, articles) |
| `src/sounds.js` | WebAudio warm chime sound design |
| `src/styles.css` | "Late-Night Supper Club" design system: warm ink surfaces, brass money, jade accent, Fraunces serif + Hanken Grotesk |

## Question data — THE important part

Three packs, selectable on the setup screen, pref key `pack` = `fresh` (default) | `easy` | `archive`:

1. **✨ Fresh Pack** — `public/data/original/` — **463 categories + 90 finals (~2,400 clues), 100% original**, written by Claude agents for this game (copyright-safe, default).
2. **🌷 Easy Breezy** — `public/data/easy/` — **182 gentle categories + 40 easy finals (~950 clues)**, made for older casual players: classic Hollywood, crooners/Motown, classic TV, home & garden, proverbs, 20th-century memories. Added because the archive was too hard for older family members.
3. **📼 Deep Archive** — `public/data/{jeopardy,double,final}/` — ~460k real televised clues (scraped archive, copyrighted content → kept opt-in for personal play only; NOT for redistribution). Loader strips baked-in `\"` escape artifacts (~20% of rows) and filters media-dependent ("seen here") and stale ("currently…") clues at load time.

Data format: chunk files `chunk-NNN.json`; round dirs `jeopardy` (R1, $200–1000), `double` (R2, $400–2000), `final` (no values). `public/data/manifest.json` holds chunk counts: `{jeopardy, double, final, original:{…}, easy:{…}}`.

### No-repeat system (fixed after user reported repeat categories)
- `src/data.js` persists every dealt category name per pack in localStorage (`jeopardy-played`, cap 3000). Boards skip played categories until a pack is exhausted, then that pack's memory resets. Finals have the same guard (`<pack>-final` key).
- Boards sample from ≥3 random chunks so one chunk's neighborhood can't dominate.

### Content pipeline (how the original packs were made — repeatable)
- Style guide + authoring conventions: written to a scratchpad (ephemeral), but the essence: declarative clues with a hook, strict difficulty ramp per value, evergreen facts only, no media references, unambiguous short responses, ALL-CAPS punny category names, 5 clues per category.
- Parallel Claude agents authored ~13 categories each by topic slice, against an **exclusion list of all existing category names** (regenerate it from `public/data/{original,easy}` if needed).
- Independent fact-check agents reviewed every clue (2 files per agent) and produced replacement fixes; ~51 corrections applied across both waves (e.g. a clue confusing Challenger/Columbia).
- `scripts/build-original-pack.cjs <source-dir> [fresh|easy]` validates (5 clues, correct values, dedupe by name, media/short-clue rejection), shuffles domains across chunks of 12, writes chunks, updates the manifest. Source-file prefixes: fresh = `r1-/n1-`, `r2-/n2-`, `final-/nf-`; easy = `e1-`, `e2-`, `ef-`.
- Authoring source JSONs lived in session scratchpad (gone when container recycles) — the chunked files in `public/data/` are the canonical store now.

## Gameplay features (all verified working)

- **Modes:** Take Turns, or Buzz In! (Q/P/B keys or tap, early-buzz lockout, steals after wrong answers, reader can open buzzers early with Space).
- **Lengths:** Quick (~20 min, 1 round + Final) or Full (~45 min, 2 rounds + Final).
- **1–3 players**, emoji avatars, per-player colors.
- **Solo mode:** end-of-game report card **Rank D → S (Grand Champion)** from accuracy + correct count (tier table `SOLO_TIERS` in main.js), next-rank requirement hint, "New personal best!" callout, solo scorecard instead of podium, solo share text.
- Streak bonuses with callouts, catch-up (trailing player picks first in R2), lead-change banners, host personality lines, Daily Doubles with wagering, category intro reveal, board reroll ("New categories" before first pick), keyboard board navigation, Escape/menu quit with confirm, "We'll accept it ✓" judge override (regular + Final), Final = pass-the-device private wagers/answers, podium + confetti + Share Result (clipboard), Hall of Fame on setup, error screen with retry, warm sound toggle, mobile responsive + haptics, a11y (aria-live, reduced motion, focus management).
- **Boot Camp**: a separate one-button side-scroller mini-game built by a parallel session; it now lives at https://kellylucas.dev/army.html (this repo's `army.html` is just a redirect, and the setup screen's "🐷 The Army" link points there). Don't touch unless asked.

## Quality bar / history

The session ran an audit-and-iterate loop with self-grades to ≥98/100 across: functionality, UI, ease of use, market fit, solo fun, group fun, question quality, question quantity, copyright safety, performance, accessibility, mobile, audio, replayability. All verified by Playwright end-to-end runs (setup, both/all packs, turns + buzz + steal, full solo game to Rank screen, full 2-player game to podium, mobile viewport, no-repeat across games).

PR history: #1 buzz mode+redesign, #2 fuzzy matching+Supper Club design, #3 five polish rounds (96/100), #4 Fresh Pack v1 + solo ranks + archive cleanup (98/100 audit), #8 no-repeat memory + expanded Fresh Pack + Easy Breezy. All squash-merged to `main`, all deployed green.

## Environment notes for future Claude sessions

- Remote container. `npm install && npm run build`; preview via `npx vite preview --port 4173`.
- Playwright available at `/opt/pw-browsers` (import chromium from `/opt/node22/lib/node_modules/playwright/index.mjs`).
- Direct curl/WebFetch to `api.github.com` and `github.io` is blocked by proxy → use the GitHub MCP tools (`create_pull_request`, `merge_pull_request`, `actions_get`, `get_file_contents`) for PRs/CI/live checks.
- PRs must be un-drafted (`update_pull_request draft:false`) before merging.
- User prefs (Kelly): loves iterative "grade yourself and improve" loops, wants no repeat questions, plays with older family (keep Easy Breezy gentle), cares about copyright safety for anything shareable.

## Ideas discussed but not built

- Phones-as-buzzers remote multiplayer; topic picker for boards; daily challenge seed; more Easy Breezy content; difficulty selector within packs.
