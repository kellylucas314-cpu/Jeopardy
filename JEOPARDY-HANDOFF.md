# Jeopardy! Interactive Game — Claude Code Handoff

**Generated**: 2026-02-12
**Status**: Prototype complete in React artifact, ready for full build
**Priority**: Fun personal project, not production-critical

---

## 1. VISION

Build a beautiful, interactive Jeopardy! game that runs in the browser. It should feel like the real show — the blue board, the gold dollar values, Daily Doubles, Final Jeopardy, and the tension of a countdown timer.

**What makes this special:** It's powered by a dataset of **529,939 real Jeopardy! clues** from Seasons 1-41 (1984-2025). Every game is different because categories and clues are randomly pulled from the archive. Players can also create **custom AI-generated categories** — type "Types of Cacti" or "90s Hip-Hop" and Claude generates 5 authentic clues on the fly.

### The User

Kelly — building this for fun, game nights with friends. Should work great on laptop/desktop, acceptable on tablet. Mobile is nice-to-have but not required.

---

## 2. KNOWN BUGS TO FIX (from prototype)

### Bug #1: Regular clues should NOT require a wager
**What happened:** Player selected a $600 clue and was asked to wager. Only Daily Doubles and Final Jeopardy should have wagers. Regular clues auto-award/deduct the face value.

**Fix:** In the clue selection flow, check `clue.dailyDouble === true` before showing the wager screen. Regular clues skip straight to the clue display + answer input.

### Bug #2: Categories need more randomization
**What happened:** Only 12 hardcoded categories to choose from. Feels repetitive after 2 games.

**Fix:** Pull categories dynamically from the 529K-clue dataset. There are **945 categories with 50+ clues** and **443 with 100+ clues**. Each game should feel completely different.

---

## 3. DATA SOURCE

### Primary: J-Archive Dataset (529,939 clues)
- **GitHub repo**: https://github.com/jwolle1/jeopardy_clue_dataset
- **File**: `combined_season1-41.tsv` (74MB)
- **Format**: Tab-separated values
- **Seasons**: 1-41 (September 1984 — 2025)
- **Actively maintained** — new seasons get added

### TSV Schema
```
round           | int    | 1 = Single Jeopardy, 2 = Double Jeopardy, 3 = Final Jeopardy
clue_value      | int    | Dollar value (0 for Final Jeopardy)
daily_double_value | int | Wager amount if DD (0 if not DD)
category        | string | Category name (ALL CAPS)
comments        | string | Production notes (usually empty)
answer          | string | The CLUE text (what the host reads aloud) ← CONFUSING NAME
question        | string | The RESPONSE (what the contestant says) ← CONFUSING NAME
air_date        | string | YYYY-MM-DD format
notes           | string | Additional notes (usually empty)
```

**CRITICAL — Column name confusion:**
- `answer` column = the CLUE (what Alex/Ken reads)
- `question` column = the RESPONSE (what the contestant says, e.g., "What is gravity?")
- This is backwards from what you'd expect. Jeopardy's "answer-and-question" format means the show's "answers" are really clues, and "questions" are really responses.

### Value Distribution
| Value | Count | Round |
|-------|-------|-------|
| $100 | 21,618 | Single (old era) |
| $200 | 74,312 | Single |
| $300 | 21,076 | Single (old era) |
| $400 | 104,436 | Single + Double |
| $500 | 20,291 | Single (old era) |
| $600 | 52,284 | Single |
| $800 | 83,041 | Single + Double |
| $1,000 | 51,141 | Single + Double |
| $1,200 | 31,195 | Double |
| $1,600 | 31,042 | Double |
| $2,000 | 30,457 | Double |

**Note:** Dollar values changed over the show's history. Modern era (post-2001): Single = $200/$400/$600/$800/$1000, Double = $400/$800/$1200/$1600/$2000.

### Filtering Requirements
Filter OUT clues that reference visual/audio elements that won't work in text form:
- Keywords to filter: `seen here`, `shown here`, `this picture`, `this photo`, `Clue Crew`, `this map`, `this image`, `video clue`, `audio clue`, `heard here`
- This removes ~6,320 clues → **523,619 clean clues remain**
- Also filter clues with empty/null answer or question fields

### Category Statistics
- **56,328 unique categories** total
- **945 categories** with 50+ clues (good for reliable random selection)
- **443 categories** with 100+ clues (great reliability)
- **230 categories** with 200+ clues (premium tier)

### Top Categories by Clue Count
```
SCIENCE: 1,601          POTENT POTABLES: 630
HISTORY: 1,500          RHYME TIME: 639
AMERICAN HISTORY: 1,427 BEFORE & AFTER: 799
LITERATURE: 1,419       SHAKESPEARE: 717
POTPOURRI: 1,333        ANIMALS: 1,028
SPORTS: 1,293           WORLD CAPITALS: 809
WORLD GEOGRAPHY: 1,207  OPERA: 815
WORD ORIGINS: 1,160     BIOLOGY: 757
WORLD HISTORY: 1,152    TREES: 235
RELIGION: 1,140         INSECTS: 298
```

### How to Acquire the Dataset
```bash
# Option A: Direct download (recommended)
wget https://raw.githubusercontent.com/jwolle1/jeopardy_clue_dataset/main/combined_season1-41.tsv

# Option B: Clone the repo
git clone https://github.com/jwolle1/jeopardy_clue_dataset.git
```

The file is 74MB. For a web app, you'll need to either:
1. **Pre-process into JSON** — Convert TSV → JSON, possibly split by category
2. **Backend API** — Load dataset server-side, serve random categories via API
3. **SQLite/IndexedDB** — Load into a local database for fast queries
4. **Pre-baked bundles** — Generate multiple game boards at build time as JSON

Recommendation: **Option 2 (backend API)** is cleanest. A simple Express/Fastify server that loads the TSV once on startup and serves `/api/random-board` and `/api/category/:name` endpoints.

---

## 4. GAME SPECIFICATION

### 4.1 Game Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SETUP       │────▶│  GAME BOARD  │────▶│  FINAL       │
│  SCREEN      │     │  (30 clues)  │     │  JEOPARDY!   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     ▼             ▼
              ┌──────────┐  ┌──────────────┐
              │  CLUE    │  │  DAILY       │
              │  SCREEN  │  │  DOUBLE      │
              │  (auto   │  │  (wager →    │
              │  value)  │  │  clue)       │
              └──────────┘  └──────────────┘
```

### 4.2 Setup Screen

**Elements:**
- Game title "JEOPARDY!" in gold
- Player name inputs (1-4 players, add/remove)
- **Category Mode selector** (this is the key new feature):
  - **"Classic" mode**: All 6 categories randomly pulled from the archive
  - **"Custom Mix" mode**: Player picks 1-3 custom categories (free text input), remaining slots filled randomly from archive
  - **"All Custom" mode**: Player types all 6 category names, AI generates all clues
- Start Game button

**Custom Category Input:**
- Text field with placeholder like "e.g., Types of Cacti, 90s Hip-Hop, Dog Breeds..."
- When player types a custom category, show a small indicator: "🤖 AI will generate these clues"
- Allow 1-6 custom categories; the rest are random from the archive

### 4.3 Game Board

**Layout:** 6 columns × 5 rows
- Header row: category names
- 5 value rows: $200, $400, $600, $800, $1000
- Values disappear when clue is answered (cell goes dark/empty)

**Scoreboard:** Displayed above or below the board
- Each player: name + score (green if positive, red if negative)
- Active player highlighted (gold border/glow)

**Controls:**
- Active player clicks a dollar value to select a clue
- After answering (right or wrong), control passes appropriately
- Clues remaining counter

### 4.4 Clue Screen (Regular — NO wager)

**Flow:**
1. Category name + dollar value displayed at top
2. Clue text displayed prominently (large, serif font, centered)
3. 30-second countdown timer starts
4. Text input field with "What is..." placeholder
5. Player types answer and hits Enter/Submit
6. **Fuzzy match** checks answer
7. Result screen: CORRECT (+$value, green) or INCORRECT (-$value, red)
8. Show correct response if wrong
9. Auto-return to board after 2.5 seconds

**Answer Matching (fuzzy):**
- Strip "What is", "Who is", "What are" etc. from front
- Strip articles (the, a, an)
- Strip punctuation
- Case-insensitive
- Allow Levenshtein distance ≤ 25% of answer length (min 2 chars)
- Check if guess contains answer OR answer contains guess (substring match)
- Examples that should match:
  - "gravity" matches "gravity" ✓
  - "what is gravity" matches "gravity" ✓
  - "the mitochondria" matches "mitochondria" ✓
  - "shakespear" matches "Shakespeare" ✓ (Levenshtein = 2)
  - "mount everest" matches "Mt. Everest" ✓

### 4.5 Daily Double Screen

**How it differs from regular clues:**
1. "DAILY DOUBLE!" dramatic reveal (animation + sound)
2. Player is shown their current score
3. **Wager input** — min $0, max = greater of (player's score, highest value on board i.e. $1000)
   - Quick-select buttons: $100, $500, $1000, ALL IN
4. After wager is locked, clue appears + timer starts
5. Correct = +wager, Wrong = -wager

**Placement:** 2 Daily Doubles per game, randomly placed on the board (not in the same category, and not both on $200 values — that would be too easy).

### 4.6 Final Jeopardy!

Triggers when all 30 board clues are answered (or player can click "Go to Final Jeopardy" button after 20+ clues answered, for faster games).

**Flow:**
1. "FINAL JEOPARDY!" announcement screen
2. Category revealed
3. Each player enters wager secretly (max = their current score, or $0 if score is negative/zero)
4. Clue revealed
5. 30-second timer for all players
6. Each player types their response
7. Results revealed one by one (dramatic pause between each)
8. Final scores shown
9. Winner announced with celebration
10. "Play Again" button

### 4.7 Score Rules
- Correct regular clue: +face value
- Wrong regular clue: -face value
- Correct Daily Double: +wager
- Wrong Daily Double: -wager
- Correct Final Jeopardy: +wager
- Wrong Final Jeopardy: -wager
- Timer expires: treated as wrong answer (-value or -wager)
- Scores CAN go negative (this is real Jeopardy rules)
- Player with wrong answer: control passes to next player
- Player with correct answer: keeps control (picks next clue)

---

## 5. THE AI-GENERATED CUSTOM CATEGORY FEATURE

This is the headline feature that makes this project special. When a player types a custom category name (anything — "Types of Pasta," "Marvel Villains," "Things in My Garage"), the Anthropic API generates 5 authentic Jeopardy-style clues.

### 5.1 API Call Structure

Use the Anthropic Messages API (`claude-sonnet-4-20250514`):

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `Generate exactly 5 Jeopardy! clues for the category "${categoryName}".

Rules:
- Clues are STATEMENTS that the host reads (not questions)
- Responses are what the contestant says (in "What is..." format)
- Scale difficulty: $200 (very easy), $400 (easy), $600 (medium), $800 (hard), $1000 (very hard)
- Keep clues concise (1-2 sentences max)
- Clues should be factually accurate
- Match the witty, informative style of the real show

Return ONLY valid JSON, no other text:
{
  "clues": [
    { "value": 200, "clue": "...", "response": "..." },
    { "value": 400, "clue": "...", "response": "..." },
    { "value": 600, "clue": "...", "response": "..." },
    { "value": 800, "clue": "...", "response": "..." },
    { "value": 1000, "clue": "...", "response": "..." }
  ]
}`
    }],
  })
});
```

### 5.2 Implementation Notes

- **Loading state:** Show a generating animation while the API call completes (1-3 seconds)
  - Suggestion: "Consulting the writers' room..." or a pulsing category card
- **Error handling:** If API call fails, offer to retry or swap in a random archive category
- **Caching:** Cache generated categories in memory so if the same custom category is requested twice in a session, don't re-generate
- **Rate limiting:** Each custom category = 1 API call. Max 6 per game. This is very low volume.
- **Response parsing:** The model should return pure JSON. Strip any markdown fences (```json ... ```) before parsing. Wrap in try/catch.
- **Validation:** Verify the returned JSON has exactly 5 clues with values 200/400/600/800/1000 and non-empty clue/response strings. If malformed, retry once.

### 5.3 UX for Custom Categories

On the setup screen:
```
┌─────────────────────────────────────────────────────┐
│  CATEGORIES                                          │
│                                                      │
│  Slot 1: [Types of Cacti          ] 🤖 Custom       │
│  Slot 2: [________________________] 🎲 Random        │
│  Slot 3: [90s Hip-Hop             ] 🤖 Custom       │
│  Slot 4: [________________________] 🎲 Random        │
│  Slot 5: [________________________] 🎲 Random        │
│  Slot 6: [Dog Breeds              ] 🤖 Custom       │
│                                                      │
│  Empty slots = random from the archive               │
│                                                      │
│  [ START GAME ]                                      │
└─────────────────────────────────────────────────────┘
```

Each slot has:
- A text input field
- When empty: shows "🎲 Random from archive"
- When filled: shows "🤖 AI-generated"
- Optional: a toggle to switch between custom and random

When START GAME is clicked:
1. Fire off API calls for all custom categories in parallel
2. Simultaneously query the archive for random categories
3. Show a loading screen: "Building your board..." with progress
4. Once all categories are ready, transition to the game board

---

## 6. ARCHITECTURE RECOMMENDATION

### Option A: Single-Page React App (Simplest)
```
jeopardy/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx              # Main game state machine
│   ├── components/
│   │   ├── SetupScreen.jsx  # Player names + category selection
│   │   ├── GameBoard.jsx    # The 6×5 grid
│   │   ├── ClueScreen.jsx   # Clue display + answer input + timer
│   │   ├── DailyDouble.jsx  # Wager screen
│   │   ├── FinalJeopardy.jsx # Multi-step Final Jeopardy
│   │   ├── Scoreboard.jsx   # Player scores
│   │   └── Timer.jsx        # Countdown timer component
│   ├── hooks/
│   │   ├── useSound.js      # Web Audio API sound effects
│   │   └── useGame.js       # Game state management
│   ├── utils/
│   │   ├── fuzzyMatch.js    # Answer matching logic
│   │   ├── dataLoader.js    # Dataset loading + filtering + random selection
│   │   └── aiCategories.js  # Anthropic API integration for custom categories
│   ├── data/
│   │   └── clues.json       # Pre-processed dataset (or loaded at runtime)
│   └── styles/
│       └── jeopardy.css     # Theme styles
├── scripts/
│   └── processDataset.js    # TSV → JSON converter (build step)
├── package.json
└── README.md
```

### Option B: With Backend (Better for dataset)
```
jeopardy/
├── client/                  # React frontend (same as above)
├── server/
│   ├── index.js             # Express server
│   ├── routes/
│   │   ├── board.js         # GET /api/random-board → 6 categories, 30 clues
│   │   ├── category.js      # GET /api/category/:name → 5 clues from archive
│   │   └── generate.js      # POST /api/generate-category → AI-generated clues
│   ├── services/
│   │   ├── dataset.js       # Load and index the TSV dataset
│   │   └── anthropic.js     # Anthropic API client
│   └── data/
│       └── combined_season1-41.tsv
└── package.json
```

### Recommendation

**Go with Option A (single-page React app)** with these modifications:
- Pre-process the 74MB TSV into a smaller JSON file at build time
  - Only keep categories with 50+ clues (945 categories)
  - Only keep columns: category, clue_value, answer (clue text), question (response)
  - Filter out visual/audio clues
  - This should compress to ~15-25MB JSON, or much less with gzip
- OR: Pre-generate a large pool of ready-to-play game boards as static JSON
  - e.g., 100 pre-built boards = all you'd ever need
  - Each board is ~5KB = total ~500KB for 100 boards
  - Eliminates runtime dataset processing entirely
- The Anthropic API calls for custom categories happen client-side (the artifact environment supports this)

---

## 7. DESIGN SYSTEM

### Color Palette
```css
:root {
  /* Jeopardy signature colors */
  --jeopardy-blue-deep: #050514;     /* Background */
  --jeopardy-blue-dark: #0a0a2e;     /* Board background */
  --jeopardy-blue: #1a1a6e;          /* Cell background */
  --jeopardy-blue-light: #12124a;    /* Cell gradient end */
  --jeopardy-blue-hover: #2a2a8e;    /* Cell hover */
  --jeopardy-gold: #d4a843;          /* Dollar values, accents */
  --jeopardy-gold-light: #f0d78c;    /* Gold highlight */
  --jeopardy-gold-dark: #b8862d;     /* Gold shadow */

  /* Feedback colors */
  --correct: #4ade80;                /* Green */
  --wrong: #ef4444;                  /* Red */

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #8888aa;
  --text-muted: #555555;
}
```

### Typography
```css
/* Display / Headers / Values */
font-family: 'Oswald', sans-serif;
/* Available weights: 400, 500, 600, 700 */

/* Clue text (the statements the host reads) */
font-family: 'Cormorant Garamond', serif;
/* Available weights: 400, 600 + italic */

/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
```

### Sizing (from prototype)
| Element | Font Size | Weight |
|---------|-----------|--------|
| Game title | 56px | 700 |
| Category headers | 11-12px | 600, letter-spacing: 0.5px |
| Dollar values (board) | 22px | 700 |
| Clue text | 22px | 400 (Cormorant Garamond) |
| Score values | 22px | 700 |
| Player names | 12px | 500, letter-spacing: 1px |
| Timer | 14px | 700 |
| Buttons | 16-20px | 700, letter-spacing: 1-3px |

### Sound Effects (Web Audio API)
Implemented with `OscillatorNode` — no external audio files needed:
- **Correct answer:** C5→E5→G5 ascending arpeggio (0.5s)
- **Wrong answer:** G3→D#3 descending (0.5s)
- **Daily Double:** Square wave, A4→C#5→E5→A5 (0.7s)
- **Timer tick:** A5 blip at ≤5 seconds remaining (0.15s each)

### Animations
- **Daily Double reveal:** `pulse` keyframes (scale 0.97↔1.03, opacity 0.7↔1.0)
- **Board cell hover:** `scale(1.04)` transform
- **Timer bar:** Width percentage with `transition: width 1s linear`
- **Result flash:** Fade-in with colored border (green/red)
- **Board cell answered:** Fade to dark, value text becomes transparent

---

## 8. GAME STATE SCHEMA

```typescript
interface GameState {
  // Screen management
  screen: 'setup' | 'board' | 'clue' | 'dailyDouble' | 'finalSetup' | 'finalClue' | 'gameOver';

  // Board
  categories: string[];           // 6 category names
  board: {
    [category: string]: {
      [value: number]: {           // 200, 400, 600, 800, 1000
        clue: string;              // What the host reads
        response: string;          // Correct response
        answered: boolean;
        dailyDouble: boolean;
        isAiGenerated?: boolean;   // true if from custom category
        airDate?: string;          // original air date (archive clues only)
        originalCategory?: string; // original category name (if different)
      }
    }
  };

  // Players
  players: {
    name: string;
    score: number;
  }[];
  currentPlayer: number;           // index into players array
  cluesRemaining: number;          // counts down from 30

  // Active clue (when viewing a clue)
  activeClue: {
    category: string;
    value: number;
    clue: string;
    response: string;
    dailyDouble: boolean;
    wagerAmount?: number;          // only set for Daily Doubles
  } | null;

  // Final Jeopardy
  finalJeopardy: {
    category: string;
    clue: string;
    response: string;
    wagers: { [playerIndex: number]: number };
    guesses: { [playerIndex: number]: string };
  } | null;
}
```

---

## 9. DATASET PROCESSING SCRIPT

Here's a reference script for converting the TSV to a usable format:

```javascript
// scripts/processDataset.js
// Run: node scripts/processDataset.js

const fs = require('fs');
const path = require('path');

const TSV_PATH = path.join(__dirname, '../data/combined_season1-41.tsv');
const OUTPUT_PATH = path.join(__dirname, '../src/data/clues.json');

// Read TSV
const raw = fs.readFileSync(TSV_PATH, 'utf-8');
const lines = raw.split('\n');
const headers = lines[0].split('\t');

// Parse
const clues = [];
const VISUAL_KEYWORDS = /seen here|shown here|this picture|this photo|clue crew|this map|this image|video clue|audio clue|heard here/i;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  if (cols.length < 8) continue;

  const round = parseInt(cols[0]);
  const clueValue = parseInt(cols[1]) || 0;
  const category = cols[3]?.trim();
  const clueText = cols[5]?.trim();    // "answer" column = clue
  const response = cols[6]?.trim();    // "question" column = response
  const airDate = cols[7]?.trim();

  // Skip Final Jeopardy (round 3), empty clues, visual clues
  if (round === 3) continue;
  if (!clueText || !response) continue;
  if (VISUAL_KEYWORDS.test(clueText)) continue;
  if (clueValue === 0) continue;

  clues.push({ cat: category, val: clueValue, clue: clueText, resp: response, date: airDate });
}

// Group by category
const byCategory = {};
for (const c of clues) {
  if (!byCategory[c.cat]) byCategory[c.cat] = [];
  byCategory[c.cat].push(c);
}

// Keep only categories with 50+ clues
const filtered = {};
let totalKept = 0;
for (const [cat, items] of Object.entries(byCategory)) {
  if (items.length >= 50) {
    filtered[cat] = items;
    totalKept += items.length;
  }
}

console.log(`Categories kept: ${Object.keys(filtered).length}`);
console.log(`Clues kept: ${totalKept}`);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(filtered));
console.log(`Written to ${OUTPUT_PATH}`);
```

### Value Normalization

The dataset spans 41 years and dollar values have changed. To normalize to a consistent $200/$400/$600/$800/$1000 scale:

```javascript
function normalizeValue(originalValue) {
  // Map any value to the nearest modern Single Jeopardy value
  const targets = [200, 400, 600, 800, 1000];
  return targets.reduce((closest, target) =>
    Math.abs(target - originalValue) < Math.abs(closest - originalValue) ? target : closest
  );
}

// Examples:
// $100 (old era) → $200
// $200 → $200
// $300 (old era) → $200 or $400
// $400 → $400
// $500 (old era) → $400 or $600
// $1200 (Double Jeopardy) → $1000
// $1600 (Double Jeopardy) → $1000 (cap at $1000)
// $2000 (Double Jeopardy) → $1000 (cap at $1000)
```

Better approach: Assign clues to difficulty tiers:
```javascript
function assignTier(originalValue, round) {
  // Tier 1 (easiest): $100, $200
  // Tier 2: $300, $400
  // Tier 3: $500, $600
  // Tier 4: $700, $800, $1200
  // Tier 5 (hardest): $1000, $1600, $2000
  const tierMap = {
    100: 1, 200: 1,
    300: 2, 400: 2,
    500: 3, 600: 3,
    800: 4, 1200: 4,
    1000: 5, 1600: 5, 2000: 5
  };
  return tierMap[originalValue] || 3; // default to middle
}

// Then when building a board, pick one clue per tier per category
// Tier 1 → $200, Tier 2 → $400, etc.
```

---

## 10. RANDOM BOARD GENERATION ALGORITHM

```javascript
function generateBoard(dataset, customCategories = []) {
  const board = {};
  const allArchiveCategories = Object.keys(dataset);

  // 1. Handle custom AI categories (already generated, passed in)
  for (const custom of customCategories) {
    board[custom.name] = {};
    for (const clue of custom.clues) {
      board[custom.name][clue.value] = {
        clue: clue.clue,
        response: clue.response,
        answered: false,
        dailyDouble: false,
        isAiGenerated: true,
      };
    }
  }

  // 2. Fill remaining slots with random archive categories
  const slotsNeeded = 6 - customCategories.length;
  const shuffled = shuffle(allArchiveCategories);
  let filled = 0;

  for (const cat of shuffled) {
    if (filled >= slotsNeeded) break;

    const clues = dataset[cat];
    // Group by tier
    const byTier = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const c of clues) {
      const tier = assignTier(c.val);
      if (byTier[tier]) byTier[tier].push(c);
    }

    // Need at least 1 clue per tier to make a complete category
    const hasCoverage = Object.values(byTier).every(arr => arr.length > 0);
    if (!hasCoverage) continue; // skip this category, try next

    board[cat] = {};
    const tierToValue = { 1: 200, 2: 400, 3: 600, 4: 800, 5: 1000 };
    for (const [tier, value] of Object.entries(tierToValue)) {
      const pool = byTier[tier];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      board[cat][value] = {
        clue: pick.clue,
        response: pick.resp,
        answered: false,
        dailyDouble: false,
        isAiGenerated: false,
        airDate: pick.date,
        originalCategory: cat,
      };
    }
    filled++;
  }

  // 3. Place 2 Daily Doubles
  const allCells = [];
  for (const cat of Object.keys(board)) {
    for (const val of [200, 400, 600, 800, 1000]) {
      // Don't put DD on $200 (too easy) — weight toward higher values
      if (val >= 400) allCells.push({ cat, val });
    }
  }
  const ddCells = shuffle(allCells).slice(0, 2);
  // Ensure they're in different categories
  if (ddCells[0]?.cat === ddCells[1]?.cat) {
    // Swap second DD to a different category
    const otherCells = allCells.filter(c => c.cat !== ddCells[0].cat);
    if (otherCells.length > 0) {
      ddCells[1] = otherCells[Math.floor(Math.random() * otherCells.length)];
    }
  }
  for (const { cat, val } of ddCells) {
    board[cat][val].dailyDouble = true;
  }

  return board;
}
```

---

## 11. FINAL JEOPARDY CLUES

Pull from round 3 in the dataset (9,046 Final Jeopardy clues available):

```javascript
function getRandomFinalJeopardy(dataset) {
  // Round 3 clues in the dataset
  const finalClues = allClues.filter(c => c.round === 3 && c.clue && c.response);
  const pick = finalClues[Math.floor(Math.random() * finalClues.length)];
  return {
    category: pick.category,
    clue: pick.clue,
    response: pick.response,
  };
}
```

For AI-generated Final Jeopardy (if all categories are custom):
```javascript
// Same API pattern as custom categories, but generate 1 hard clue
const prompt = `Generate 1 Final Jeopardy! clue. Pick an interesting category name.
The clue should be genuinely difficult — something most people would need to think about.
Return ONLY valid JSON:
{ "category": "...", "clue": "...", "response": "..." }`;
```

---

## 12. TESTING CHECKLIST

### Core Game Flow
- [ ] Can add 1-4 players with custom names
- [ ] Board displays 6 categories × 5 values
- [ ] Clicking a value opens the clue screen (NOT wager screen for regular clues)
- [ ] Timer counts down from 30
- [ ] Correct answer awards points, wrong answer deducts
- [ ] Answered cells disappear from the board
- [ ] Control passes to next player on wrong answer
- [ ] Control stays with current player on correct answer

### Daily Doubles
- [ ] 2 per board, in different categories, not on $200
- [ ] Shows "DAILY DOUBLE!" animation before wager
- [ ] Wager screen appears with correct max wager
- [ ] After wager, clue appears with timer
- [ ] Correct = +wager, Wrong = -wager

### Final Jeopardy
- [ ] Triggers when board is cleared (or "Skip to Final" button)
- [ ] Category revealed first
- [ ] Each player enters wager secretly
- [ ] Clue revealed with 30s timer
- [ ] Each player enters response
- [ ] Results revealed, final scores calculated
- [ ] Winner announced

### Custom AI Categories
- [ ] Can type custom category names on setup screen
- [ ] Empty slots default to random archive categories
- [ ] AI-generated clues load with a nice loading state
- [ ] Generated clues have correct structure (5 values, 200-1000)
- [ ] Error handling if API call fails (retry or fallback)
- [ ] Game plays normally with mix of AI and archive categories

### Edge Cases
- [ ] Player score goes negative
- [ ] Wager of $0 on Daily Double
- [ ] Player with $0 or negative score on Final Jeopardy (wager = $0)
- [ ] Single player mode works
- [ ] All players get same Final Jeopardy clue
- [ ] Timer expiration handled correctly
- [ ] Empty answer submission handled

---

## 13. POTENTIAL ENHANCEMENTS (Future)

These are NOT required for v1 but would be cool later:

1. **Multiplayer buzzer mode**: Players race to buzz in (spacebar/key assignment), closest to clue reveal wins the buzz
2. **Score persistence**: Save high scores to localStorage
3. **Theme selection**: Classic Jeopardy blue, Tournament of Champions gold, dark mode
4. **Sound toggle**: Mute/unmute sound effects
5. **Difficulty filter**: Only use clues from certain eras (classic 80s/90s, modern 2010+)
6. **Category preview**: Before game starts, show the 6 categories so players can see what they're getting
7. **"Pass" button**: Current player can pass to let another player attempt
8. **Keyboard shortcuts**: Numbers 1-6 to select categories, up/down for values
9. **Win streak tracking**: Track games played and won per player name
10. **Export game**: Save a game board as shareable JSON for friends to play the same board

---

## 14. WHAT EXISTS ALREADY

### Working Prototype (React Artifact)
The file `jeopardy-game.jsx` is a complete working prototype with:
- ✅ Setup screen with player names
- ✅ 6×5 game board with gold values on blue cells
- ✅ Clue screen with 30s timer
- ✅ Fuzzy answer matching
- ✅ Sound effects (Web Audio API)
- ✅ Daily Doubles with wager
- ✅ Final Jeopardy (multi-step: wager → clue → reveal)
- ✅ Score tracking with positive/negative
- ✅ Correct/incorrect feedback
- ❌ BUG: Regular clues incorrectly trigger wager screen
- ❌ Only 12 hardcoded categories (120 clues)
- ❌ No dataset integration
- ❌ No custom AI category feature
- ❌ No "Skip to Final Jeopardy" option

### Dataset
- 529,939 real clues available at https://github.com/jwolle1/jeopardy_clue_dataset
- TSV format, 74MB
- Analysis done: 945 categories with 50+ clues, filtering rules documented
- Sample processing scripts available in this doc

### Previous Files (from earlier session)
- `jeopardy.py` — Python script that generates Excel game boards (AI-written clues)
- `jeopardy_real.py` — Python script using real dataset clues → Excel output
- `Jeopardy_Game_Board.xlsx` — Sample output with AI clues
- `Jeopardy_REAL_Questions.xlsx` — Sample output with real archive clues
- GitHub repo: https://github.com/kellylucas314-cpu/Jeopardy

---

## 15. QUICK START FOR CLAUDE CODE

```bash
# 1. Set up project
mkdir jeopardy-game && cd jeopardy-game
npm init -y
npm install react react-dom vite @vitejs/plugin-react

# 2. Download dataset
mkdir data
wget -O data/combined_season1-41.tsv \
  https://raw.githubusercontent.com/jwolle1/jeopardy_clue_dataset/main/combined_season1-41.tsv

# 3. Process dataset (run the script from Section 9)
node scripts/processDataset.js

# 4. Build the app using the components, state schema, and design system in this doc

# 5. Test with: npx vite
```

**The single most important thing:** Fix the wager bug (Section 2), get the dataset integrated (Section 9-10), and add the custom AI category feature (Section 5). Everything else is polish.

---

*End of handoff. Let's play!* 🎯
