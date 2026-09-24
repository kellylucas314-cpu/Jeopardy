import '../styles/GameBoard.css';

function GameBoard({ boardData, players, currentPlayerIndex, cluesRemaining, onSelectClue, onSkipToFinal }) {
  const { categories, board } = boardData;
  const values = [200, 400, 600, 800, 1000];
  const canSkipToFinal = cluesRemaining <= 10;

  return (
    <div className="game-board-screen">
      {/* Scoreboard */}
      <div className="scoreboard">
        {players.map((player, index) => (
          <div
            key={index}
            className={`player-score ${index === currentPlayerIndex ? 'active' : ''}`}
          >
            <span className="player-name">{player.name}</span>
            <span className={`player-amount ${player.score >= 0 ? 'positive' : 'negative'}`}>
              {player.score < 0 ? '-' : ''}${Math.abs(player.score).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="board">
        {/* Category headers */}
        <div className="board-row board-header-row">
          {categories.map((cat) => {
            const isAi = Boolean(board[cat]?.[200]?.isAiGenerated);
            return (
              <div key={cat} className="board-cell category-header">
                <span>{cat}</span>
                {isAi && <span className="ai-badge" title="AI-written category">AI</span>}
              </div>
            );
          })}
        </div>

        {/* Value rows */}
        {values.map((value) => (
          <div key={value} className="board-row">
            {categories.map((cat) => {
              const cell = board[cat][value];
              const isAnswered = cell.answered;

              return (
                <div
                  key={`${cat}-${value}`}
                  className={`board-cell value-cell ${isAnswered ? 'answered' : ''}`}
                  onClick={() => !isAnswered && onSelectClue(cat, value)}
                >
                  {!isAnswered && (
                    <span className="cell-value">${value}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="board-controls">
        <span className="clues-remaining">
          {cluesRemaining} clue{cluesRemaining !== 1 ? 's' : ''} remaining
        </span>
        {canSkipToFinal && (
          <button className="skip-to-final-btn" onClick={onSkipToFinal}>
            SKIP TO FINAL JEOPARDY
          </button>
        )}
      </div>
    </div>
  );
}

export default GameBoard;
