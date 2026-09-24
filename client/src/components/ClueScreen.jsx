import { useState, useEffect, useRef } from 'react';
import { useSound } from '../hooks/useSound';
import '../styles/ClueScreen.css';

function ClueScreen({ activeClue, currentPlayer, onSubmitAnswer }) {
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState(null); // null | 'correct' | 'incorrect'
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const guessRef = useRef('');
  const sounds = useSound();

  // Keep guessRef in sync
  guessRef.current = guess;

  const handleSubmit = (timeExpired = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    clearInterval(timerRef.current);
    const currentGuess = guessRef.current;
    const isCorrect = onSubmitAnswer(timeExpired ? '' : currentGuess, timeExpired);
    setResult(isCorrect ? 'correct' : 'incorrect');
  };

  // Timer countdown — stable effect, no dependency on guess/handleSubmit
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            onSubmitAnswer('', true);
            setResult('incorrect');
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && guess.trim()) {
      handleSubmit(false);
    }
  };

  const timerPercent = (timeLeft / 30) * 100;
  const timerUrgent = timeLeft <= 5;

  return (
    <div className="clue-screen">
      <div className="clue-header">
        <span className="clue-category">{activeClue.category}</span>
        <span className="clue-value">${activeClue.value}</span>
      </div>

      <div className="clue-text">{activeClue.clue}</div>

      {result === null ? (
        <>
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
              onKeyDown={handleKeyDown}
              placeholder="What is..."
              className="answer-input"
              autoComplete="off"
            />
            <button
              onClick={() => handleSubmit(false)}
              disabled={!guess.trim()}
              className="submit-btn"
            >
              SUBMIT
            </button>
          </div>

          <div className="current-player-label">
            {currentPlayer.name}'s turn
          </div>
        </>
      ) : (
        <div className={`result-display ${result}`}>
          <div className="result-text">
            {result === 'correct' ? 'CORRECT!' : 'INCORRECT'}
          </div>
          <div className="correct-answer">
            Correct response: <strong>{activeClue.response}</strong>
          </div>
          <div className="result-value">
            {result === 'correct' ? '+' : '-'}${activeClue.value}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClueScreen;
