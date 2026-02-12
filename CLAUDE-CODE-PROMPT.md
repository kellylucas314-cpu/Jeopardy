# Prompt for Claude Code — Jeopardy! Game Build

Read JEOPARDY-HANDOFF.md in this repo for the full spec, design system, data schema, and game state types. That doc is your source of truth. Here's the summary of what to build and in what order.

## What This Is

An interactive browser-based Jeopardy! game powered by 529,939 real clues from the show's 41-season archive. Players can also create custom AI-generated categories — type "Types of Cacti" and Claude generates 5 authentic clues on the fly via the Anthropic API.

## Build Order (do these in sequence)

### Step 1: Project Setup
- Vite + React project
- Download the dataset: `wget -O data/combined_season1-41.tsv https://raw.githubusercontent.com/jwolle1/jeopardy_clue_dataset/main/combined_season1-41.tsv`
- Write the TSV → JSON processing script (see Section 9 in handoff doc) to create a clean clues.json
- Only keep categories with 50+ clues, filter out visual/audio clues, strip empty entries

### Step 2: Core Game (no AI features yet)
Build a working game with these screens:
1. **Setup Screen** — player names (1-4), Start Game button
2. **Game Board** — 6×5 grid, categories randomly selected from the processed dataset, dollar values $200-$1000
3. **Clue Screen** — shows clue text + 30-second timer + answer input. IMPORTANT: regular clues do NOT have a wager step. Correct = +value, wrong = -value. Fuzzy answer matching (strip articles, case-insensitive, Levenshtein distance).
4. **Daily Double** — 2 per board, randomly placed (not on $200, not same category). Shows wager screen BEFORE the clue. Max wager = greater of player's score or $1000.
5. **Final Jeopardy** — triggers when board is cleared. Category reveal → all players wager → clue + timer → all players answer → results revealed → winner.

Use the design system from the handoff doc: Jeopardy blue (#1a1a6e) and gold (#d4a843), Oswald + Cormorant Garamond fonts, Web Audio API sound effects.

### Step 3: Custom AI Categories
- On setup screen, add 6 category input slots. Empty = random from archive, filled = AI-generated.
- When player types a category name and starts the game, call the Anthropic API (claude-sonnet-4-20250514) to generate 5 clues at difficulty levels $200-$1000.
- API call details and the exact prompt are in Section 5 of the handoff doc.
- Show loading state while generating. Handle errors with retry or fallback to archive category.
- Game should work with any mix: 0-6 custom categories.

### Step 4: Polish
- Smooth transitions between screens
- "Skip to Final Jeopardy" button (appears after 20+ clues answered)
- Score colors: green positive, red negative
- Active player highlighting
- Answered cells fade out on the board

## Key Things to Get Right

1. **Regular clues = no wager.** Only Daily Doubles and Final Jeopardy have wagers.
2. **Dataset column names are swapped:** the `answer` column contains the CLUE text (what the host reads), the `question` column contains the RESPONSE (what the contestant says). This is Jeopardy's format — don't mix them up.
3. **Value normalization:** The dataset has values from $100-$2000 across different eras. Map them to difficulty tiers: Tier 1 ($100-$200) → $200, Tier 2 ($300-$400) → $400, Tier 3 ($500-$600) → $600, Tier 4 ($800-$1200) → $800, Tier 5 ($1000-$2000) → $1000.
4. **Fuzzy answer matching** should be generous — strip "What is/Who is", articles, punctuation, then do case-insensitive substring + Levenshtein check.
5. **Each game should feel different** — random categories, random clue selection within categories, random Daily Double placement.
