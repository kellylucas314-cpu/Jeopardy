import { useState, useEffect, useRef } from 'react';
import { useSound } from '../hooks/useSound';
import '../styles/FinalJeopardy.css';

function FinalJeopardy({ finalJeopardy, players, onSubmitWagers, onSubmitGuesses }) {
  // Phases: 'announce' → 'category' → 'wagers' → 'clue' → 'results'
  const [phase, setPhase] = useState('announce');
  const [wagers, setWagers] = useState({});
  const [guesses, setGuesses] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [revealIndex, setRevealIndex] = useState(-1);
  const timerRef = useRef(null);
  const guessesRef = useRef({});
  const submittedRef = useRef(false);
  const sounds = useSound();

  // Keep guessesRef in sync
  guessesRef.current = guesses;

  // Auto-advance from announce to category
  useEffect(() => {
    if (phase === 'announce') {
      const timer = setTimeout(() => setPhase('category'), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Timer for clue phase — stable effect using ref for guesses
  useEffect(() => {
    if (phase !== 'clue') return;

    submittedRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            onSubmitGuesses(guessesRef.current);
            setPhase('results');
          }
          return 0;
        }
        if (prev <= 6) {
          sounds.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-reveal results one by one
  useEffect(() => {
    if (phase !== 'results') return;

    if (revealIndex < players.length - 1) {
      const timer = setTimeout(() => {
        setRevealIndex(prev => prev + 1);
      }, revealIndex === -1 ? 500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, revealIndex, players.length]);

  const handleWagerChange = (playerIndex, value) => {
    setWagers({ ...wagers, [playerIndex]: parseInt(value) || 0 });
  };

  const handleSubmitWagers = () => {
    const clampedWagers = {};
    for (let i = 0; i < players.length; i++) {
      const maxWager = Math.max(0, players[i].score);
      clampedWagers[i] = Math.max(0, Math.min(wagers[i] || 0, maxWager));
    }
    setWagers(clampedWagers);
    onSubmitWagers(clampedWagers);
    setPhase('clue');
  };

  const handleGuessChange = (playerIndex, value) => {
    const newGuesses = { ...guesses, [playerIndex]: value };
    setGuesses(newGuesses);
    guessesRef.current = newGuesses;
  };

  const handleSubmitGuesses = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    onSubmitGuesses(guesses);
    setPhase('results');
  };

  const timerPercent = (timeLeft / 30) * 100;

  return (
    <div className="final-jeopardy-screen">
      {phase === 'announce' && (
        <div className="fj-announce">
          <div className="fj-announce-text">FINAL JEOPARDY!</div>
        </div>
      )}

      {phase === 'category' && (
        <div className="fj-category-reveal">
          <h2 className="fj-label">The category is...</h2>
          <div className="fj-category-name">{finalJeopardy.category}</div>
          <button className="fj-continue-btn" onClick={() => setPhase('wagers')}>
            PLACE YOUR WAGERS
          </button>
        </div>
      )}

      {phase === 'wagers' && (
        <div className="fj-wagers">
          <h2 className="fj-label">Place Your Wagers</h2>
          <div className="fj-category-small">{finalJeopardy.category}</div>

          <div className="fj-wager-list">
            {players.map((player, i) => {
              const maxWager = Math.max(0, player.score);
              return (
                <div key={i} className="fj-wager-row">
                  <div className="fj-wager-player">
                    <span className="fj-wager-name">{player.name}</span>
                    <span className={`fj-wager-score ${player.score >= 0 ? 'positive' : 'negative'}`}>
                      {player.score < 0 ? '-' : ''}${Math.abs(player.score).toLocaleString()}
                    </span>
                  </div>
                  {maxWager > 0 ? (
                    <input
                      type="number"
                      value={wagers[i] || ''}
                      onChange={(e) => handleWagerChange(i, e.target.value)}
                      placeholder={`Max: $${maxWager.toLocaleString()}`}
                      className="fj-wager-input"
                      min={0}
                      max={maxWager}
                    />
                  ) : (
                    <span className="fj-no-wager">$0 (no wager available)</span>
                  )}
                </div>
              );
            })}
          </div>

          <button className="fj-submit-wagers-btn" onClick={handleSubmitWagers}>
            REVEAL THE CLUE
          </button>
        </div>
      )}

      {phase === 'clue' && (
        <div className="fj-clue">
          <div className="fj-clue-category">{finalJeopardy.category}</div>
          <div className="fj-clue-text">{finalJeopardy.clue}</div>

          <div className="timer-container">
            <div
              className={`timer-bar ${timeLeft <= 5 ? 'urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
            <span className="timer-text">{timeLeft}s</span>
          </div>

          <div className="fj-answer-list">
            {players.map((player, i) => (
              <div key={i} className="fj-answer-row">
                <label className="fj-answer-label">{player.name}:</label>
                <input
                  type="text"
                  value={guesses[i] || ''}
                  onChange={(e) => handleGuessChange(i, e.target.value)}
                  placeholder="What is..."
                  className="fj-answer-input"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>

          <button className="fj-submit-answers-btn" onClick={handleSubmitGuesses}>
            LOCK IN ANSWERS
          </button>
        </div>
      )}

      {phase === 'results' && (
        <div className="fj-results">
          <h2 className="fj-label">Final Results</h2>

          <div className="fj-results-list">
            {players.map((player, i) => {
              if (i > revealIndex) return null;

              const playerGuess = guessesRef.current[i] || '';
              const wagerAmt = finalJeopardy.wagers[i] || 0;

              return (
                <div key={i} className="fj-result-card">
                  <div className="fj-result-name">{player.name}</div>
                  <div className="fj-result-guess">
                    Responded: "{playerGuess || '(no answer)'}"
                  </div>
                  <div className="fj-result-wager">
                    Wagered: ${wagerAmt.toLocaleString()}
                  </div>
                  <div className={`fj-result-score ${player.score >= 0 ? 'positive' : 'negative'}`}>
                    Final: {player.score < 0 ? '-' : ''}${Math.abs(player.score).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          {revealIndex >= players.length - 1 && (
            <div className="fj-correct-response">
              Correct response: <strong>{finalJeopardy.response}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FinalJeopardy;
