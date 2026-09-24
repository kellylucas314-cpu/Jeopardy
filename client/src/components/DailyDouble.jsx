import { useState, useEffect, useRef } from 'react';
import { useSound } from '../hooks/useSound';
import '../styles/DailyDouble.css';

function DailyDouble({ activeClue, currentPlayer, onSubmit }) {
  const [phase, setPhase] = useState('reveal'); // 'reveal' | 'wager' | 'clue' | 'result'
  const [wager, setWager] = useState('');
  const [wagerAmount, setWagerAmount] = useState(0);
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const guessRef = useRef('');
  const wagerRef = useRef(0);
  const sounds = useSound();

  const maxWager = Math.max(currentPlayer.score, 1000);

  // Keep refs in sync
  guessRef.current = guess;
  wagerRef.current = wagerAmount;

  // Auto-advance from reveal to wager
  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => setPhase('wager'), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Focus input when entering wager or clue phase
  useEffect(() => {
    if ((phase === 'wager' || phase === 'clue') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  // Timer countdown for clue phase — stable effect
  useEffect(() => {
    if (phase !== 'clue') return;

    submittedRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            onSubmit(wagerRef.current, '', true);
            setResult('incorrect');
            setPhase('result');
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

  const handleSubmitClue = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    clearInterval(timerRef.current);
    const isCorrect = onSubmit(wagerAmount, guessRef.current, false);
    setResult(isCorrect ? 'correct' : 'incorrect');
    setPhase('result');
  };

  const handleWagerSubmit = () => {
    const amount = parseInt(wager) || 0;
    const clamped = Math.max(0, Math.min(amount, maxWager));
    setWagerAmount(clamped);
    wagerRef.current = clamped;
    setPhase('clue');
  };

  const handleQuickWager = (amount) => {
    const clamped = Math.min(amount, maxWager);
    setWagerAmount(clamped);
    wagerRef.current = clamped;
    setPhase('clue');
  };

  const handleAllIn = () => {
    setWagerAmount(maxWager);
    wagerRef.current = maxWager;
    setPhase('clue');
  };

  const timerPercent = (timeLeft / 30) * 100;
  const timerUrgent = timeLeft <= 5;

  return (
    <div className="daily-double-screen">
      {phase === 'reveal' && (
        <div className="dd-reveal">
          <div className="dd-reveal-text">DAILY DOUBLE!</div>
        </div>
      )}

      {phase === 'wager' && (
        <div className="dd-wager">
          <h2 className="dd-title">DAILY DOUBLE!</h2>
          <div className="dd-category">{activeClue.category}</div>

          <div className="dd-player-info">
            <span className="dd-player-name">{currentPlayer.name}</span>
            <span className={`dd-player-score ${currentPlayer.score >= 0 ? 'positive' : 'negative'}`}>
              {currentPlayer.score < 0 ? '-' : ''}${Math.abs(currentPlayer.score).toLocaleString()}
            </span>
          </div>

          <div className="dd-wager-section">
            <label className="dd-wager-label">Your Wager (max ${maxWager.toLocaleString()}):</label>
            <input
              ref={inputRef}
              type="number"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleWagerSubmit()}
              placeholder="Enter wager..."
              className="dd-wager-input"
              min={0}
              max={maxWager}
            />
            <div className="dd-quick-wagers">
              <button onClick={() => handleQuickWager(100)} className="quick-wager-btn">$100</button>
              <button onClick={() => handleQuickWager(500)} className="quick-wager-btn">$500</button>
              <button onClick={() => handleQuickWager(1000)} className="quick-wager-btn">$1,000</button>
              <button onClick={handleAllIn} className="quick-wager-btn all-in">ALL IN</button>
            </div>
            <button
              onClick={handleWagerSubmit}
              disabled={!wager || parseInt(wager) < 0}
              className="dd-wager-submit"
            >
              LOCK IN WAGER
            </button>
          </div>
        </div>
      )}

      {phase === 'clue' && (
        <div className="dd-clue">
          <div className="clue-header">
            <span className="clue-category">{activeClue.category}</span>
            <span className="clue-value">Wager: ${wagerAmount.toLocaleString()}</span>
          </div>

          <div className="clue-text">{activeClue.clue}</div>

          <div className="timer-container">
            <div
              className={`timer-bar ${timerUrgent ? 'urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
            <span className="timer-text">{timeLeft}s</span>
          </div>

          <div className="answer-input-container">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guess.trim() && handleSubmitClue()}
              placeholder="What is..."
              className="answer-input"
              autoComplete="off"
            />
            <button
              onClick={handleSubmitClue}
              disabled={!guess.trim()}
              className="submit-btn"
            >
              SUBMIT
            </button>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className={`result-display ${result}`}>
          <div className="result-text">
            {result === 'correct' ? 'CORRECT!' : 'INCORRECT'}
          </div>
          <div className="correct-answer">
            Correct response: <strong>{activeClue.response}</strong>
          </div>
          <div className="result-value">
            {result === 'correct' ? '+' : '-'}${wagerAmount.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyDouble;
