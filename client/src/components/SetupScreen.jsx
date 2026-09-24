import { useState, useEffect } from 'react';
import { checkAiStatus, normalizeCategoryName } from '../utils/aiCategories';
import '../styles/SetupScreen.css';

const SLOT_COUNT = 6;
const PLACEHOLDERS = [
  'e.g. Formula 1',
  'e.g. 90s Hip-Hop',
  'e.g. Types of Cacti',
  'e.g. Dog Breeds',
  'e.g. Marvel Villains',
  'e.g. Things in My Garage',
];

function SetupScreen({ onStart }) {
  const [playerNames, setPlayerNames] = useState(['']);
  const [categorySlots, setCategorySlots] = useState(Array(SLOT_COUNT).fill(''));
  const [aiStatus, setAiStatus] = useState(null); // null = unknown, else { reachable, credentialsDetected }

  useEffect(() => {
    let cancelled = false;
    checkAiStatus().then(status => { if (!cancelled) setAiStatus(status); });
    return () => { cancelled = true; };
  }, []);

  const addPlayer = () => {
    if (playerNames.length < 4) {
      setPlayerNames([...playerNames, '']);
    }
  };

  const removePlayer = (index) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const updateSlot = (index, value) => {
    const next = [...categorySlots];
    next[index] = value;
    setCategorySlots(next);
  };

  const clearSlots = () => setCategorySlots(Array(SLOT_COUNT).fill(''));

  // Trimmed, non-empty, de-duplicated (case-insensitive) custom category names
  const customCategories = (() => {
    const seen = new Set();
    const out = [];
    for (const raw of categorySlots) {
      const name = normalizeCategoryName(raw);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out;
  })();

  const handleStart = () => {
    const validNames = playerNames.filter(name => name.trim() !== '');
    if (validNames.length > 0) {
      onStart(validNames, customCategories);
    }
  };

  const canStart = playerNames.some(name => name.trim() !== '');
  const randomCount = SLOT_COUNT - customCategories.length;

  const aiHint = (() => {
    if (customCategories.length === 0 || aiStatus === null) return null;
    if (!aiStatus.reachable) {
      return 'Game server not running — start it with "npm run dev" or your custom categories will fall back to random.';
    }
    if (!aiStatus.credentialsDetected) {
      return 'No API key found — add ANTHROPIC_API_KEY to server/.env to enable AI categories.';
    }
    return null;
  })();

  return (
    <div className="setup-screen">
      <h1 className="game-title">JEOPARDY!</h1>
      <p className="subtitle">Game Night Edition</p>

      <div className="setup-container">
        <h2>Players</h2>
        <div className="player-inputs">
          {playerNames.map((name, index) => (
            <div key={index} className="player-input-row">
              <input
                type="text"
                value={name}
                onChange={(e) => updatePlayerName(index, e.target.value)}
                placeholder={`Player ${index + 1} name`}
                className="player-input"
                maxLength={20}
              />
              {playerNames.length > 1 && (
                <button
                  onClick={() => removePlayer(index)}
                  className="remove-player-btn"
                  aria-label="Remove player"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {playerNames.length < 4 && (
          <button onClick={addPlayer} className="add-player-btn">
            + Add Player
          </button>
        )}

        <div className="categories-header">
          <h2>Categories</h2>
          {customCategories.length > 0 && (
            <button className="clear-slots-btn" onClick={clearSlots}>Clear</button>
          )}
        </div>
        <p className="categories-help">
          Type any topic for an AI-written category. Leave a slot empty for a random one from the archive.
        </p>

        <div className="category-slots">
          {categorySlots.map((value, index) => {
            const filled = normalizeCategoryName(value) !== '';
            return (
              <div key={index} className="category-slot-row">
                <span className="slot-number">{index + 1}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateSlot(index, e.target.value)}
                  placeholder={PLACEHOLDERS[index]}
                  className="category-input"
                  maxLength={60}
                />
                <span className={`slot-badge ${filled ? 'ai' : 'random'}`}>
                  {filled ? '🤖 AI' : '🎲 Random'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="category-note">
          <p className="note-text">
            {customCategories.length === 0
              ? '📝 All 6 categories random from 529,939 real Jeopardy! clues'
              : `🤖 ${customCategories.length} AI-written · 🎲 ${randomCount} from the archive`}
          </p>
          {aiHint && <p className="note-warning">{aiHint}</p>}
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="start-game-btn"
        >
          START GAME
        </button>
      </div>
    </div>
  );
}

export default SetupScreen;
