# AI Jeopardy Game - Full Specification

## Overview

An interactive, AI-powered Jeopardy-style trivia game where users can play with **any topics they choose**. The game dynamically generates questions using AI, scaling from easy to expert difficulty based on point value.

---

## Core Concept

**The Problem:** Traditional trivia games have fixed question banks. You're stuck with whatever topics the game developer chose. Want to play Jeopardy about Formula 1, HelioFlux technology, and 90s hip-hop? Tough luck.

**The Solution:** Let AI generate custom trivia questions on-the-fly for ANY topic the user wants. The game becomes infinitely replayable with personalized content.

---

## Game Flow

### Phase 1: Setup

1. **User enters 5 custom topics** (categories)
   - Free text input for each
   - Examples: "Formula 1 Racing", "Taylor Swift Discography", "Biotech Startups", "The Office Quotes", "World War 2"
   
2. **Optional: Preset topic packs**
   - Quick-start buttons: "Party Mix", "Science", "Pop Culture", "Sports"
   - Users can mix presets with custom topics

3. **Player configuration** (multiplayer mode)
   - Enter player names (2-4 players)
   - Assign colors/avatars
   - Set turn order

### Phase 2: Question Generation

1. **AI generates 25 questions** (5 per category × 5 difficulty levels)
   
2. **Difficulty scaling by point value:**
   | Points | Difficulty | Description |
   |--------|------------|-------------|
   | $200 | Very Easy | Common knowledge anyone would know |
   | $400 | Easy | Familiar to most people who've heard of the topic |
   | $600 | Medium | Requires some specific knowledge |
   | $800 | Hard | Detailed knowledge needed |
   | $1000 | Expert | Only enthusiasts/experts would know |

3. **Question format:** Jeopardy-style (phrased as statements)
   - "This driver holds the record for most F1 World Championships"
   - Answer: "Michael Schumacher" or "Lewis Hamilton"

4. **Loading experience:**
   - Show progress: "Generating questions for: Formula 1..."
   - Estimated time: 10-15 seconds for all 25 questions
   - Fun facts or tips displayed while waiting

### Phase 3: Gameplay

1. **Game Board Display**
   - 5 columns (one per category)
   - 5 rows ($200, $400, $600, $800, $1000)
   - Category names displayed at top
   - Unanswered clues show dollar amount
   - Answered clues are grayed out/removed

2. **Turn Structure (Multiplayer)**
   - Active player selects a clue
   - Question displays full-screen
   - Timer starts (configurable: 15-60 seconds)
   - Player types or speaks answer
   - AI evaluates answer (fuzzy matching for typos/variations)
   - Points awarded or deducted
   - Next player's turn (or same player continues if correct)

3. **Answer Evaluation**
   - Fuzzy string matching (handles typos)
   - Accepts common variations ("The Beatles" = "Beatles")
   - Accepts partial answers if key info present
   - Case insensitive
   - Optional: Voice input with speech-to-text

4. **Scoring**
   - Correct answer: +points
   - Wrong answer: -points (optional, configurable)
   - Pass/skip: no change
   - Running score displayed per player

### Phase 4: Special Features

1. **Daily Doubles**
   - 2 random clues are "Daily Doubles"
   - Player can wager any amount up to their current score
   - Only the selecting player can answer
   - Hidden until selected (surprise element)

2. **Final Jeopardy**
   - After all 25 clues answered
   - AI generates one difficult question from a 6th "mystery" category
   - All players wager secretly
   - 30 seconds to write answer
   - Reveal answers and wagers simultaneously
   - Dramatic winner announcement

3. **Sound Effects & Music**
   - Classic Jeopardy "think music" during Final Jeopardy
   - Correct/incorrect sound effects
   - Daily Double fanfare
   - Winner celebration

### Phase 5: Post-Game

1. **Results Screen**
   - Final scores ranked
   - Winner celebration animation
   - Stats: questions answered, accuracy %, best category

2. **Review Mode**
   - See all questions and correct answers
   - Mark questions to save/share
   - "Learn more" links for interesting facts

3. **Play Again Options**
   - Same topics, new questions
   - New topics
   - Rematch with same players

---

## Technical Architecture

### Frontend
- **Framework:** React, Vue, or vanilla JS
- **Styling:** Modern CSS with animations
- **Responsive:** Works on desktop, tablet, mobile
- **PWA:** Installable as app, works offline (cached questions)

### Backend/AI Integration
- **Question Generation:** OpenAI GPT-4o-mini or Claude API
- **Prompt Engineering:** Structured prompts for consistent Jeopardy-style output
- **Caching:** Store generated questions to reduce API calls
- **Fallback:** Pre-built question banks for common topics if API fails

### Data Model
```javascript
Game {
  id: string
  topics: string[5]
  players: Player[]
  questions: Question[25]
  currentRound: number
  dailyDoubles: [clueId, clueId]
  finalJeopardy: Question
  status: 'setup' | 'playing' | 'final' | 'complete'
}

Player {
  id: string
  name: string
  score: number
  color: string
  answeredCorrect: number
  answeredWrong: number
}

Question {
  id: string
  category: string
  value: number (200-1000)
  difficulty: 'very_easy' | 'easy' | 'medium' | 'hard' | 'expert'
  question: string
  answer: string
  acceptedAnswers: string[] // variations
  answered: boolean
  answeredBy: playerId | null
  wasCorrect: boolean | null
}
```

---

## Advanced Features (Future Versions)

### Multiplayer Online
- Real-time multiplayer via WebSockets
- Share game link with friends
- Spectator mode
- Global leaderboards

### Voice Integration
- "Alexa, start Jeopardy"
- Voice input for answers
- AI host reads questions aloud
- Full hands-free gameplay

### Custom Question Banks
- Save favorite question sets
- Share question packs with others
- Import/export JSON question files
- Community-created topic packs

### Learning Mode
- After wrong answer, show explanation
- Link to Wikipedia/sources
- Track topics user struggles with
- Suggest study materials

### Accessibility
- Screen reader support
- High contrast mode
- Keyboard-only navigation
- Adjustable timer for different abilities

### Monetization (if commercializing)
- Free: 3 games/day with ads
- Premium: Unlimited games, no ads
- Topic packs: $0.99 for curated expert packs
- Party mode: One-time purchase for 8+ players

---

## AI Prompt for Question Generation

```
Generate 5 Jeopardy-style trivia questions about "${topic}".

Requirements:
1. Questions must be phrased as STATEMENTS (Jeopardy style), not questions
   - Good: "This element has atomic number 79"
   - Bad: "What element has atomic number 79?"

2. Difficulty progression:
   - Q1 ($200): Very easy - anyone would know this
   - Q2 ($400): Easy - common knowledge
   - Q3 ($600): Medium - requires some familiarity
   - Q4 ($800): Hard - detailed knowledge
   - Q5 ($1000): Expert - only enthusiasts know

3. Answers should be:
   - 1-4 words
   - Specific and unambiguous
   - The "What is..." response a player would give

4. Avoid:
   - Trick questions
   - Questions requiring math calculation
   - Questions with multiple valid answers
   - Extremely obscure facts for easy questions

Output format (JSON only, no other text):
[
  {"question": "statement here", "answer": "answer here"},
  {"question": "statement here", "answer": "answer here"},
  {"question": "statement here", "answer": "answer here"},
  {"question": "statement here", "answer": "answer here"},
  {"question": "statement here", "answer": "answer here"}
]
```

---

## User Stories

1. **As a party host**, I want to create a custom Jeopardy game with topics my friends care about, so game night is more engaging.

2. **As a teacher**, I want to generate quiz questions about my lesson topics, so students can review in a fun format.

3. **As a trivia enthusiast**, I want expert-level questions on niche topics, so I'm actually challenged.

4. **As a casual player**, I want preset topic packs, so I can start playing immediately without setup.

5. **As a competitive player**, I want multiplayer with scoring and leaderboards, so I can compete with friends.

---

## MVP vs Full Version

### MVP (What we built today)
- ✅ Custom topic input (5 categories)
- ✅ AI question generation via OpenAI
- ✅ Difficulty scaling by point value
- ✅ Single-player with score tracking
- ✅ Basic answer validation
- ✅ Clean, responsive UI

### Version 2.0
- [ ] Multiplayer (local, same device)
- [ ] Daily Doubles
- [ ] Final Jeopardy
- [ ] Sound effects
- [ ] Better answer matching
- [ ] Timer per question

### Version 3.0
- [ ] Online multiplayer
- [ ] Voice input/output
- [ ] Save/share games
- [ ] Leaderboards
- [ ] Mobile apps (iOS/Android)

---

## Files Created

| File | Description |
|------|-------------|
| `index.html` | Original hardcoded version |
| `index-custom.html` | Host-mode (humans ask questions) |
| `index-ai.html` | AI-generated questions (requires OpenAI key) |
| `GAME-SPEC.md` | This document |

---

## Live URLs

- **AI Version:** https://kellylucas314-cpu.github.io/Jeopardy/index-ai.html
- **Host Mode:** https://kellylucas314-cpu.github.io/Jeopardy/index-custom.html
- **Original:** https://kellylucas314-cpu.github.io/Jeopardy/index.html

---

*Created by Kip 🦉 for Kelly | February 11, 2026*
