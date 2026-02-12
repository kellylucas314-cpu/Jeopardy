# 🎯 AI JEOPARDY GAME - Complete Handoff Document

> **For:** Claude Code / Coding Agent  
> **Created by:** Kelly Lucas + Kip 🦉  
> **Date:** February 11, 2026  
> **Goal:** Build the ultimate customizable Jeopardy-style trivia game

---

## 📋 TABLE OF CONTENTS

1. [The Vision](#the-vision)
2. [Core Features](#core-features)
3. [Data Sources](#data-sources)
4. [Technical Spec](#technical-spec)
5. [Game Flow](#game-flow)
6. [UI/UX Requirements](#uiux-requirements)
7. [Advanced Features](#advanced-features)
8. [Existing Code](#existing-code)
9. [Build Instructions](#build-instructions)

---

## 🎯 THE VISION

### The Problem
Traditional trivia games have fixed question banks. You're stuck with whatever topics the game developer chose. Want to play Jeopardy about Formula 1, biotech startups, and Taylor Swift deep cuts? Tough luck — no game exists for that.

### The Solution
**A Jeopardy game that works with ANY topic:**

1. **Use real questions** — 538,000+ actual Jeopardy clues from 1984-2025
2. **AI fallback** — Generate custom questions for topics not in the database
3. **Smart category matching** — User types "space" → finds "ASTRONOMY", "NASA", "THE FINAL FRONTIER", etc.
4. **Difficulty scaling** — $200 (easy) → $1000 (expert), already built into real Jeopardy data

### Why This Is Special
- **538,000 real questions** = infinite replayability
- **No API costs** for covered topics (free dataset)
- **AI generation** only for truly custom/niche topics
- **Authentic Jeopardy experience** with real clues from the show

---

## 🎮 CORE FEATURES

### Must Have (MVP)
- [ ] User picks 5 topics/categories
- [ ] Smart search through 538K real Jeopardy categories
- [ ] Falls back to AI generation if topic not found
- [ ] Classic 5×5 Jeopardy board ($200-$1000)
- [ ] Questions phrased as statements (Jeopardy style)
- [ ] Answer input with fuzzy matching
- [ ] Score tracking
- [ ] Works on mobile and desktop

### Should Have (v2)
- [ ] Multiplayer (2-4 players, local)
- [ ] Daily Doubles (random high-stakes clues)
- [ ] Final Jeopardy round
- [ ] Timer per question
- [ ] Sound effects (think music, correct/wrong sounds)
- [ ] Category preview before game starts

### Nice to Have (v3)
- [ ] Online multiplayer (WebSockets)
- [ ] Voice input for answers
- [ ] AI host that reads questions aloud (TTS)
- [ ] Leaderboards
- [ ] Save/share custom games
- [ ] PWA (installable, offline play with cached questions)

---

## 📊 DATA SOURCES

### Primary: Jeopardy Clue Dataset (538,845 clues)

**Source:** https://github.com/jwolle1/jeopardy_clue_dataset

**Format:** TSV (Tab-Separated Values)

**Coverage:** Season 1 through Season 41 (1984 - July 2025)

**Files:**
- `combined_season1-41.tsv` — Main file, 538K clues
- `seasons/` folder — Individual season files
- `extra_matches.tsv` — 8,906 clues from special matches
- `kids_teen_matches.tsv` — Kids/Teen tournament clues

**Columns:**
| Column | Description |
|--------|-------------|
| `round` | 1 = Single Jeopardy, 2 = Double Jeopardy, 3 = Final Jeopardy |
| `clue_value` | Dollar value on board ($200, $400, $600, $800, $1000, etc.) |
| `daily_double_value` | Wagered amount if Daily Double, else 0 |
| `category` | Category name (e.g., "AMERICAN HISTORY") |
| `comments` | Host's comments about category |
| `answer` | The clue/prompt shown to contestants |
| `question` | The correct response (what contestants say) |
| `air_date` | Original air date (YYYY-MM-DD) |
| `notes` | Tournament info, special notes |

**Example Row:**
```
round: 1
clue_value: 400
category: "SCIENCE"
answer: "This element, atomic number 79, has been prized since ancient times"
question: "What is gold?"
air_date: "2023-01-15"
```

**Important Notes:**
- The `answer` field is the CLUE (what's shown on screen)
- The `question` field is the CORRECT RESPONSE (what players say)
- This matches Jeopardy's backwards "answer and question" format

### Secondary: Hugging Face Dataset (216,930 questions)

**Source:** https://huggingface.co/datasets/jeopardy-datasets/jeopardy

**Format:** JSON

**Structure:**
```json
{
  "category": "EPITAPHS & TRIBUTES",
  "value": 2000,
  "question": "'1939 Oscar winner: \"...you are a credit to your craft, your race and to your family\"'",
  "answer": "Hattie McDaniel (for her role in Gone with the Wind)",
  "round": "Jeopardy!",
  "show_number": 4680,
  "air_date": "2004-12-31"
}
```

**Size:** ~49 MB total

### Fallback: AI Generation (OpenAI)

**When to use:** User requests topic not found in dataset

**API:** OpenAI GPT-4o-mini (cheap, fast)

**Prompt Template:**
```
Generate 5 Jeopardy-style trivia questions about "${topic}".

Requirements:
1. Questions phrased as STATEMENTS (Jeopardy style)
   - Good: "This element has atomic number 79"
   - Bad: "What element has atomic number 79?"

2. Difficulty progression:
   - Q1 ($200): Very easy - common knowledge
   - Q2 ($400): Easy - most people know
   - Q3 ($600): Medium - some familiarity needed
   - Q4 ($800): Hard - detailed knowledge
   - Q5 ($1000): Expert - only enthusiasts know

3. Answers: 1-4 words, specific, unambiguous

Output JSON only:
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]
```

---

## 🔧 TECHNICAL SPEC

### Architecture Options

**Option A: Static Site + Embedded Data (Recommended for MVP)**
- Download Jeopardy dataset, convert to JSON
- Embed in JavaScript or load from CDN
- No backend needed
- Works offline
- Host on GitHub Pages, Vercel, Netlify

**Option B: Backend + Database**
- Node.js/Python backend
- PostgreSQL/SQLite for questions
- REST API for fetching questions
- More flexible, supports online multiplayer
- Requires hosting

**Option C: Hybrid**
- Static site for gameplay
- Serverless functions for AI generation
- Best of both worlds

### Recommended Tech Stack

```
Frontend:
- React or Vue 3 (component-based UI)
- TailwindCSS (styling)
- Howler.js (sound effects)
- Framer Motion (animations)

Backend (if needed):
- Node.js + Express or FastAPI
- SQLite (embedded) or PostgreSQL
- OpenAI API for AI generation

Deployment:
- Vercel (frontend + serverless)
- or GitHub Pages (static only)
```

### Data Model

```typescript
interface Game {
  id: string;
  players: Player[];
  categories: Category[];
  currentPlayerIndex: number;
  dailyDoubles: string[]; // clue IDs
  finalJeopardy: Clue | null;
  status: 'setup' | 'playing' | 'final' | 'complete';
  createdAt: Date;
}

interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  correctAnswers: number;
  wrongAnswers: number;
}

interface Category {
  id: string;
  name: string;
  clues: Clue[];
  source: 'dataset' | 'ai-generated';
}

interface Clue {
  id: string;
  categoryId: string;
  value: number; // 200, 400, 600, 800, 1000
  clue: string; // The statement shown to players
  answer: string; // The correct response
  acceptedAnswers?: string[]; // Alternate spellings/phrasings
  isDailyDouble: boolean;
  answered: boolean;
  answeredBy: string | null; // player ID
  wasCorrect: boolean | null;
  airDate?: string; // For dataset questions
  source: 'dataset' | 'ai-generated';
}
```

### Category Matching Algorithm

User types "science" → Find matching categories in dataset:

```javascript
function findMatchingCategories(query, allCategories) {
  const normalized = query.toLowerCase().trim();
  
  // Exact match
  const exact = allCategories.filter(c => 
    c.toLowerCase() === normalized
  );
  
  // Contains match
  const contains = allCategories.filter(c => 
    c.toLowerCase().includes(normalized) ||
    normalized.includes(c.toLowerCase())
  );
  
  // Fuzzy match (Levenshtein distance)
  const fuzzy = allCategories.filter(c =>
    levenshtein(c.toLowerCase(), normalized) <= 3
  );
  
  // Keyword match (for multi-word categories)
  const keywords = normalized.split(' ');
  const keywordMatch = allCategories.filter(c =>
    keywords.some(kw => c.toLowerCase().includes(kw))
  );
  
  // Combine and dedupe, prioritize exact > contains > fuzzy
  return [...new Set([...exact, ...contains, ...fuzzy, ...keywordMatch])];
}
```

### Answer Validation

```javascript
function isAnswerCorrect(userAnswer, correctAnswer, acceptedAlts = []) {
  const normalize = (s) => s
    .toLowerCase()
    .replace(/^(what|who|where|when) (is|are|was|were) /i, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
  
  const userNorm = normalize(userAnswer);
  const correctNorm = normalize(correctAnswer);
  const altsNorm = acceptedAlts.map(normalize);
  
  // Exact match
  if (userNorm === correctNorm) return true;
  
  // Check alternates
  if (altsNorm.includes(userNorm)) return true;
  
  // Contains check (for partial answers)
  if (correctNorm.includes(userNorm) || userNorm.includes(correctNorm)) {
    if (userNorm.length >= correctNorm.length * 0.6) return true;
  }
  
  // Fuzzy match (allow typos)
  if (levenshtein(userNorm, correctNorm) <= 2) return true;
  
  return false;
}
```

---

## 🎬 GAME FLOW

### Phase 1: Setup Screen

```
┌─────────────────────────────────────────┐
│           🎯 JEOPARDY!                  │
│                                         │
│  Enter 5 categories:                    │
│                                         │
│  1. [Science________________] 🔍        │
│     → Found: SCIENCE, WEIRD SCIENCE,    │
│       SCIENCE & NATURE (23 matches)     │
│                                         │
│  2. [90s Music______________] 🔍        │
│  3. [World History__________] 🔍        │
│  4. [_______________] 🔍                │
│  5. [_______________] 🔍                │
│                                         │
│  [🎲 Random]  [⚡ Quick Start]          │
│                                         │
│         [ START GAME ]                  │
└─────────────────────────────────────────┘
```

**Behavior:**
- As user types, show matching categories from dataset
- User can select a specific category or let system pick best match
- If no matches, show "Will generate with AI"
- Preset buttons for common topic combos

### Phase 2: Game Board

```
┌─────────────────────────────────────────────────────────┐
│  JEOPARDY!                           Score: $2,400     │
├───────────┬───────────┬───────────┬───────────┬────────┤
│  SCIENCE  │  90s MUSIC│  HISTORY  │   MOVIES  │  FOOD  │
├───────────┼───────────┼───────────┼───────────┼────────┤
│   $200    │   $200    │   ████    │   $200    │  $200  │
├───────────┼───────────┼───────────┼───────────┼────────┤
│   $400    │   ████    │   $400    │   $400    │  $400  │
├───────────┼───────────┼───────────┼───────────┼────────┤
│   ████    │   $600    │   $600    │   $600    │  $600  │
├───────────┼───────────┼───────────┼───────────┼────────┤
│   $800    │   $800    │   $800    │   ████    │  $800  │
├───────────┼───────────┼───────────┼───────────┼────────┤
│   $1000   │   $1000   │   $1000   │   $1000   │ $1000  │
└───────────┴───────────┴───────────┴───────────┴────────┘

████ = Already answered
```

### Phase 3: Question Display

```
┌─────────────────────────────────────────┐
│                                         │
│              💰 $600 💰                 │
│                                         │
│           ── SCIENCE ──                 │
│                                         │
│  "This gas, making up about 78% of      │
│   Earth's atmosphere, is essential      │
│   for plant protein synthesis"          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ What is ___________________    │    │
│  └─────────────────────────────────┘    │
│                                         │
│      ⏱️ 0:23                            │
│                                         │
│    [ SUBMIT ]      [ PASS ]             │
│                                         │
└─────────────────────────────────────────┘
```

### Phase 4: Answer Feedback

**Correct:**
```
┌─────────────────────────────────────────┐
│                                         │
│         ✅ CORRECT!                     │
│                                         │
│         +$600                           │
│                                         │
│    "What is nitrogen?"                  │
│                                         │
│         [CONTINUE]                      │
└─────────────────────────────────────────┘
```

**Wrong:**
```
┌─────────────────────────────────────────┐
│                                         │
│         ❌ INCORRECT                    │
│                                         │
│    Your answer: "oxygen"                │
│                                         │
│    Correct answer:                      │
│    "What is nitrogen?"                  │
│                                         │
│         [CONTINUE]                      │
└─────────────────────────────────────────┘
```

### Phase 5: Final Jeopardy

```
┌─────────────────────────────────────────┐
│                                         │
│        🏆 FINAL JEOPARDY 🏆             │
│                                         │
│        Category: WORLD LEADERS          │
│                                         │
│        Your Score: $4,200               │
│                                         │
│        Enter your wager:                │
│        ┌────────────────┐               │
│        │ $__________    │               │
│        └────────────────┘               │
│        (Max: $4,200)                    │
│                                         │
│           [ LOCK IN WAGER ]             │
│                                         │
└─────────────────────────────────────────┘
```

### Phase 6: Game Over

```
┌─────────────────────────────────────────┐
│                                         │
│        🎉 GAME OVER! 🎉                 │
│                                         │
│        FINAL SCORE: $7,800              │
│                                         │
│        📊 Stats:                        │
│        • 18/25 correct (72%)            │
│        • Best category: SCIENCE         │
│        • Hardest: HISTORY               │
│                                         │
│    [ NEW GAME ]    [ REVIEW ANSWERS ]   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎨 UI/UX REQUIREMENTS

### Visual Design

**Color Palette (Classic Jeopardy):**
```css
--jeopardy-blue: #060CE9;
--jeopardy-blue-dark: #0A0A5C;
--jeopardy-gold: #FFCC00;
--correct-green: #4CAF50;
--wrong-red: #F44336;
--background: #0A0A2E;
```

**Typography:**
- Headers: Bold, condensed, ALL CAPS
- Questions: Clear, readable serif or sans-serif
- Answers: Monospace or distinct style
- Use text shadows for that classic TV look

**Animations:**
- Board tiles flip when selected
- Score counter animates up/down
- Correct/wrong feedback with bounce
- Daily Double reveal animation
- Final Jeopardy dramatic reveal

### Sound Design

| Event | Sound |
|-------|-------|
| Game start | Jeopardy theme snippet |
| Select clue | Click/woosh |
| Daily Double | Fanfare |
| Timer ticking | Subtle tick (last 5 sec) |
| Correct answer | Ding/chime |
| Wrong answer | Buzz |
| Final Jeopardy | Think music (30 sec) |
| Game over | Celebration/applause |

### Responsive Design

**Desktop (1200px+):**
- Full 5×5 board visible
- Large clue values
- Keyboard shortcuts (1-5 for columns, Enter to submit)

**Tablet (768-1199px):**
- Slightly compressed board
- Touch-friendly tap targets

**Mobile (< 768px):**
- Scrollable board or card-based view
- Large touch targets
- Simplified animations

---

## 🚀 ADVANCED FEATURES

### Daily Doubles

**Implementation:**
1. Randomly select 2 clues from $600-$1000 range
2. Mark as Daily Double (hidden from players)
3. When selected:
   - Show "DAILY DOUBLE!" animation
   - Player enters wager (up to current score or $1000, whichever is higher)
   - Only selecting player can answer
   - Timer pauses during wager entry

### Multiplayer (Local)

**Turn-based:**
1. Display current player's name/color
2. Player selects clue
3. All players see question
4. Fastest buzzer wins (or take turns answering)
5. Points awarded/deducted from answering player
6. Control passes to winner (or next player if wrong)

**Buzz-in mode:**
- Question appears to all
- First to tap/click "buzzer" gets to answer
- Wrong answer = other players can buzz

### Online Multiplayer (Future)

**Tech:** WebSockets (Socket.io)

**Flow:**
1. Host creates game, gets room code
2. Players join with code
3. Host controls game flow
4. Real-time score updates
5. Voice chat integration (optional)

### Voice Mode

**Input:** Web Speech API (browser built-in)
```javascript
const recognition = new webkitSpeechRecognition();
recognition.onresult = (event) => {
  const answer = event.results[0][0].transcript;
  submitAnswer(answer);
};
```

**Output:** Web Speech Synthesis or ElevenLabs API
```javascript
const utterance = new SpeechSynthesisUtterance(clueText);
speechSynthesis.speak(utterance);
```

---

## 📁 EXISTING CODE

### Current Files in Repository

| File | Description | Status |
|------|-------------|--------|
| `index.html` | Original hardcoded version | ✅ Working |
| `index-custom.html` | Host-mode (humans ask questions) | ✅ Working |
| `index-ai.html` | AI-generated questions (OpenAI) | ✅ Working |
| `style.css` | Original styles | ✅ Working |
| `script.js` | Original game logic | ✅ Working |
| `GAME-SPEC.md` | Feature specification | ✅ Complete |
| `CLAUDE-CODE-HANDOFF.md` | This document | ✅ Complete |

### Live URLs

- **AI Version:** https://kellylucas314-cpu.github.io/Jeopardy/index-ai.html
- **Host Mode:** https://kellylucas314-cpu.github.io/Jeopardy/index-custom.html
- **Original:** https://kellylucas314-cpu.github.io/Jeopardy/index.html

### GitHub Repository

https://github.com/kellylucas314-cpu/Jeopardy

---

## 🛠️ BUILD INSTRUCTIONS

### Step 1: Download the Dataset

```bash
# Clone the Jeopardy dataset
git clone https://github.com/jwolle1/jeopardy_clue_dataset.git

# Or download just the main file
wget https://raw.githubusercontent.com/jwolle1/jeopardy_clue_dataset/main/combined_season1-41.tsv
```

### Step 2: Convert TSV to JSON

```python
import csv
import json

questions = []
categories = {}

with open('combined_season1-41.tsv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter='\t')
    for row in reader:
        question = {
            'round': int(row['round']),
            'value': int(row['clue_value']) if row['clue_value'] else 0,
            'category': row['category'],
            'clue': row['answer'],  # Note: Jeopardy's "answer" is the clue
            'answer': row['question'],  # Jeopardy's "question" is the response
            'air_date': row['air_date'],
            'daily_double': int(row['daily_double_value']) > 0
        }
        questions.append(question)
        
        # Track categories
        cat = row['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(question)

# Save questions
with open('jeopardy_questions.json', 'w') as f:
    json.dump(questions, f)

# Save category index
with open('jeopardy_categories.json', 'w') as f:
    json.dump(list(categories.keys()), f)

print(f"Processed {len(questions)} questions in {len(categories)} categories")
```

### Step 3: Build the Game

```bash
# Create new project
npx create-vite@latest jeopardy-game --template react
cd jeopardy-game

# Install dependencies
npm install tailwindcss framer-motion howler

# Copy JSON data to public folder
cp jeopardy_questions.json public/
cp jeopardy_categories.json public/

# Start development
npm run dev
```

### Step 4: Key Components to Build

1. **CategorySearch.jsx** — Autocomplete search through 538K categories
2. **GameBoard.jsx** — 5×5 grid of clues
3. **ClueModal.jsx** — Question display with timer
4. **AnswerInput.jsx** — Text input with fuzzy matching
5. **ScoreBoard.jsx** — Player scores display
6. **DailyDouble.jsx** — Wager input modal
7. **FinalJeopardy.jsx** — End game sequence
8. **SoundManager.js** — Audio playback utility

### Step 5: Deploy

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm install -D gh-pages
npx gh-pages -d dist

# Or deploy to Vercel
npx vercel
```

---

## 📝 NOTES FOR CLAUDE CODE

### Priority Order
1. Get dataset loading working first
2. Category search/matching
3. Basic game board and question display
4. Answer validation
5. Scoring
6. Polish (animations, sounds)
7. Advanced features (Daily Double, Final Jeopardy)
8. Multiplayer

### Don't Forget
- Mobile responsiveness from the start
- Accessibility (keyboard navigation, screen readers)
- Error handling for AI generation failures
- Loading states while fetching/generating
- Local storage to save game state

### Legal Note
The Jeopardy dataset note says: "Please don't use the data to make a public-facing web site, app, or any other product."

**Options:**
1. Keep game private/personal use only
2. Use AI generation exclusively for public version
3. Create original questions inspired by categories
4. Look into licensing from Jeopardy Productions

---

## 🎯 SUCCESS CRITERIA

The game is "done" when:

- [ ] User can enter any 5 topics and play a full game
- [ ] Real Jeopardy questions used when available
- [ ] AI generates questions for unknown topics
- [ ] Smooth, polished UI that feels like real Jeopardy
- [ ] Works flawlessly on phone and desktop
- [ ] Fun to play at parties

---

*Built with 🦉 by Kip for Kelly — February 2026*

*"The answer is... What is an awesome game?"*
