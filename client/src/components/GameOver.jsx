import '../styles/GameOver.css';

function GameOver({ players, onPlayAgain }) {
  // Sort players by score (highest first)
  const ranked = [...players]
    .map((p, i) => ({ ...p, originalIndex: i }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score;

  return (
    <div className="game-over-screen">
      <div className="game-over-header">
        {isTie ? (
          <>
            <h1 className="game-over-title">IT'S A TIE!</h1>
            <p className="game-over-subtitle">
              {ranked.filter(p => p.score === winner.score).map(p => p.name).join(' & ')}
            </p>
          </>
        ) : (
          <>
            <h1 className="game-over-title">CONGRATULATIONS!</h1>
            <p className="game-over-subtitle">{winner.name} wins!</p>
          </>
        )}
      </div>

      <div className="final-scores">
        <h2 className="final-scores-label">Final Scores</h2>
        {ranked.map((player, i) => (
          <div key={player.originalIndex} className={`final-score-row ${i === 0 ? 'winner' : ''}`}>
            <span className="final-score-rank">{i + 1}.</span>
            <span className="final-score-name">{player.name}</span>
            <span className={`final-score-amount ${player.score >= 0 ? 'positive' : 'negative'}`}>
              {player.score < 0 ? '-' : ''}${Math.abs(player.score).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <button className="play-again-btn" onClick={onPlayAgain}>
        PLAY AGAIN
      </button>
    </div>
  );
}

export default GameOver;
