# Jeopardy! — Game Night Edition 🎯

A browser Jeopardy! game for Kelly and friends. Every board pulls six random categories from
**529,939 real clues** (Seasons 1–41), and any slot can instead be an **AI-written custom
category** — type "Formula 1" or "Types of Cacti" and Claude writes five clues on the fly.

## Play

```bash
npm install
npm run process-dataset   # once — builds client/src/data/clues.json from the TSV in data/
npm run dev               # game at http://localhost:3000 (server on :3001)
```

1–4 players, 6×5 board, 30-second timer, two Daily Doubles, Final Jeopardy, fuzzy answer matching.

### AI custom categories

1. Copy `server/.env.example` to `server/.env` and paste your Anthropic API key.
2. Restart `npm run dev`.
3. On the setup screen, type a topic into any category slot. Empty slots stay random.

If the key is missing, the setup screen says so, and any custom slot can fall back to a
random archive category with one click.

### Game-night mode (one command)

```bash
npm run build && npm start   # everything on http://localhost:3001
```

## Keep it private

The clue dataset comes from [jwolle1/jeopardy_clue_dataset](https://github.com/jwolle1/jeopardy_clue_dataset),
whose author asks that it not be used in a public-facing site. `.gitignore` keeps the raw TSV,
the processed `clues.json`, the reference books, and `.env` out of git. If you ever publish a
version, use only the AI-generated categories.

Missing the dataset? Download `combined_season1-41.tsv` from that repo into `data/`.

## Layout

| Path | What |
|------|------|
| `client/` | Vite + React game (setup → loading → board → clue / Daily Double → Final → game over) |
| `server/` | Express server: `POST /api/generate-category` (Anthropic API), `GET /api/health`, serves `client/dist` |
| `scripts/processDataset.js` | TSV → `clues.json` (categories with 50+ clues, visual/audio clues removed) |
| `index.html`, `index-custom.html`, `index-ai.html` | Original single-file versions (still on GitHub Pages) |
| `JEOPARDY-HANDOFF.md`, `GAME-SPEC.md` | Original spec and design system |

Built with ❤️ by Kip 🦉 and Claude Code for Kelly Lucas — February 2026
