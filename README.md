# Ring In — Trivia Night 🔔

A browser-based Jeopardy game built for game night — **play it here:**

### 👉 https://kellylucas314-cpu.github.io/Jeopardy/

Share that link with friends and play on any device.

## Features

- **~530,000 real Jeopardy clues** from the actual show — every game is a fresh board
- **Two game modes:**
  - 🔔 **Buzz In!** — race to the buzzer like the real show (`Q` / `P` / `B` keys, or tap), with early-buzz lockouts, steals after wrong answers, and haptic buzz feedback on phones
  - 🔁 **Take Turns** — pass the keyboard, answer one at a time
- **Quick (~20 min) or Full (~45 min) games** — quick games play one round + Final
- **Hot-streak bonuses 🔥** — three or more correct in a row pays escalating cash bonuses
- **Catch-up drama** — the trailing player gets first pick in Round 2 (just like the show), and lead changes are announced with 👑 banners
- **A host with personality** — the game reacts to plays with varied callouts instead of canned text
- **Daily Doubles** with wagering (1 in round one, 2 in round two)
- **Category intro sequence** revealing each round's categories
- **Smart answer judging** — fuzzy matching forgives typos and phrasing, plus a "We'll accept it ✓" override so the table is always the final judge
- **Player avatars & colors**, podium finale with per-player stats, accuracy, and confetti
- 1–3 players, remembers your names & settings, sound effects, mobile friendly

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

Pushes to `main` auto-deploy to GitHub Pages via Actions.

---

Built with ❤️ for Kelly Lucas & Friends
