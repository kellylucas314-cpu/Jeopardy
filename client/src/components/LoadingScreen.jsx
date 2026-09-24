import '../styles/LoadingScreen.css';

const STATUS_LABEL = {
  loading: 'Consulting the writers\' room…',
  done: 'Ready',
  random: 'Swapped for an archive category',
  error: 'Something went wrong',
};

function LoadingScreen({ items, onRetry, onUseRandom, onCancel }) {
  const doneCount = items.filter(i => i.status === 'done' || i.status === 'random').length;
  const hasErrors = items.some(i => i.status === 'error');

  return (
    <div className="loading-screen">
      <h1 className="loading-title">BUILDING YOUR BOARD</h1>
      <p className="loading-subtitle">
        {hasErrors
          ? 'A category needs your call'
          : `${doneCount} of ${items.length} custom categories ready`}
      </p>

      <div className="loading-list">
        {items.map((item) => (
          <div key={item.name} className={`loading-row ${item.status}`}>
            <div className="loading-row-main">
              <span className="loading-row-name">{item.name}</span>
              <span className="loading-row-status">
                {item.status === 'error' ? item.error : STATUS_LABEL[item.status]}
              </span>
            </div>

            <div className="loading-row-side">
              {item.status === 'loading' && <span className="loading-spinner" aria-label="Generating" />}
              {item.status === 'done' && <span className="loading-check">✓</span>}
              {item.status === 'random' && <span className="loading-dice">🎲</span>}
              {item.status === 'error' && (
                <div className="loading-actions">
                  <button className="loading-btn" onClick={() => onRetry(item.name)}>RETRY</button>
                  <button className="loading-btn secondary" onClick={() => onUseRandom(item.name)}>USE RANDOM</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="loading-cancel" onClick={onCancel}>BACK TO SETUP</button>
    </div>
  );
}

export default LoadingScreen;
