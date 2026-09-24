import { useState, useEffect } from 'react';
import './styles/App.css';
import { generateBoard, getFinalJeopardyClue } from './utils/dataLoader';
import { fuzzyMatch } from './utils/fuzzyMatch';
import { generateCategory } from './utils/aiCategories';
import { useSound } from './hooks/useSound';
import SetupScreen from './components/SetupScreen';
import LoadingScreen from './components/LoadingScreen';
import GameBoard from './components/GameBoard';
import ClueScreen from './components/ClueScreen';
import DailyDouble from './components/DailyDouble';
import FinalJeopardy from './components/FinalJeopardy';
import GameOver from './components/GameOver';

function App() {
  const sounds = useSound();

  // Game state
  const [screen, setScreen] = useState('setup'); // 'setup' | 'loading' | 'board' | 'clue' | 'dailyDouble' | 'final' | 'gameOver'
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [boardData, setBoardData] = useState(null);
  const [activeClue, setActiveClue] = useState(null);
  const [cluesRemaining, setCluesRemaining] = useState(30);
  const [finalJeopardy, setFinalJeopardy] = useState(null);

  // Custom AI categories being generated: [{ name, status, error, result }]
  // status: 'loading' | 'done' | 'error' | 'random' (player chose an archive category instead)
  const [customItems, setCustomItems] = useState([]);

  // Build the board (custom categories first, archive fills the rest) and show it
  const buildBoard = (customCategories) => {
    const { categories, board } = generateBoard(customCategories);
    setBoardData({ categories, board });
    setCluesRemaining(30);
    setScreen('board');
  };

  // Start a new game
  const startGame = (playerNames, customNames = []) => {
    const initialPlayers = playerNames.map(name => ({ name, score: 0 }));
    setPlayers(initialPlayers);
    setCurrentPlayerIndex(0);

    if (customNames.length === 0) {
      buildBoard([]);
      return;
    }

    // Generate every custom category in parallel; the loading screen tracks each one
    setCustomItems(customNames.map(name => ({ name, status: 'loading', error: null, result: null })));
    setScreen('loading');
    customNames.forEach(name => runGeneration(name, false));
  };

  const updateCustomItem = (name, patch) => {
    setCustomItems(items => items.map(item => (item.name === name ? { ...item, ...patch } : item)));
  };

  const runGeneration = async (name, fresh) => {
    updateCustomItem(name, { status: 'loading', error: null });
    try {
      const result = await generateCategory(name, { fresh });
      updateCustomItem(name, { status: 'done', result });
    } catch (err) {
      updateCustomItem(name, { status: 'error', error: err.message });
    }
  };

  const retryCustom = (name) => runGeneration(name, true);
  const useRandomFor = (name) => updateCustomItem(name, { status: 'random', error: null, result: null });
  const cancelLoading = () => {
    setCustomItems([]);
    setScreen('setup');
  };

  // Once every custom category is ready (or swapped for random), build the board
  useEffect(() => {
    if (screen !== 'loading' || customItems.length === 0) return;
    const settled = customItems.every(item => item.status === 'done' || item.status === 'random');
    if (!settled) return;

    const ready = customItems.filter(item => item.status === 'done').map(item => item.result);
    const timer = setTimeout(() => buildBoard(ready), 600); // let the last checkmark land
    return () => clearTimeout(timer);
  }, [screen, customItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select a clue from the board
  const selectClue = (category, value) => {
    const clue = boardData.board[category][value];
    if (clue.answered) return; // Already answered

    setActiveClue({
      category,
      value,
      clue: clue.clue,
      response: clue.response,
      dailyDouble: clue.dailyDouble,
      isAiGenerated: clue.isAiGenerated,
    });

    if (clue.dailyDouble) {
      setScreen('dailyDouble');
      sounds.playDailyDouble();
    } else {
      setScreen('clue');
    }
  };

  // Submit an answer for a regular clue (not Daily Double)
  const submitAnswer = (guess, timeExpired = false) => {
    const correct = !timeExpired && fuzzyMatch(guess, activeClue.response);
    const value = activeClue.value;

    // Update score
    const newPlayers = [...players];
    if (correct) {
      newPlayers[currentPlayerIndex].score += value;
      sounds.playCorrect();
      // Player keeps control
    } else {
      newPlayers[currentPlayerIndex].score -= value;
      sounds.playWrong();
      // Pass control to next player
      setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
    }
    setPlayers(newPlayers);

    // Mark clue as answered
    const newBoard = { ...boardData };
    newBoard.board[activeClue.category][activeClue.value].answered = true;
    setBoardData(newBoard);
    setCluesRemaining(cluesRemaining - 1);

    // Show result briefly, then return to board
    setTimeout(() => {
      setActiveClue(null);
      checkIfBoardComplete();
    }, 2500);

    return correct;
  };

  // Submit a Daily Double wager and answer
  const submitDailyDouble = (wager, guess, timeExpired = false) => {
    const correct = !timeExpired && fuzzyMatch(guess, activeClue.response);

    // Update score
    const newPlayers = [...players];
    if (correct) {
      newPlayers[currentPlayerIndex].score += wager;
      sounds.playCorrect();
    } else {
      newPlayers[currentPlayerIndex].score -= wager;
      sounds.playWrong();
    }
    setPlayers(newPlayers);

    // Mark clue as answered
    const newBoard = { ...boardData };
    newBoard.board[activeClue.category][activeClue.value].answered = true;
    setBoardData(newBoard);
    setCluesRemaining(cluesRemaining - 1);

    // Show result, then return to board
    setTimeout(() => {
      setActiveClue(null);
      checkIfBoardComplete();
    }, 2500);

    return correct;
  };

  // Check if board is complete (or mostly complete)
  const checkIfBoardComplete = () => {
    if (cluesRemaining <= 1) {
      goToFinalJeopardy();
    } else {
      setScreen('board');
    }
  };

  // Skip to Final Jeopardy (if 20+ clues answered)
  const skipToFinal = () => {
    if (cluesRemaining <= 10) {
      goToFinalJeopardy();
    }
  };

  // Start Final Jeopardy
  const goToFinalJeopardy = () => {
    const finalClue = getFinalJeopardyClue();
    setFinalJeopardy({
      category: finalClue.category,
      clue: finalClue.clue,
      response: finalClue.response,
      wagers: {},
      guesses: {},
    });
    setScreen('final');
    sounds.playFinalJeopardy();
  };

  // Submit Final Jeopardy wagers
  const submitFinalWagers = (wagers) => {
    setFinalJeopardy({ ...finalJeopardy, wagers });
  };

  // Submit Final Jeopardy guesses
  const submitFinalGuesses = (guesses) => {
    setFinalJeopardy({ ...finalJeopardy, guesses });

    // Calculate final scores
    const newPlayers = [...players];
    for (let i = 0; i < players.length; i++) {
      const guess = guesses[i] || '';
      const wager = finalJeopardy.wagers[i] || 0;
      const correct = fuzzyMatch(guess, finalJeopardy.response);

      if (correct) {
        newPlayers[i].score += wager;
      } else {
        newPlayers[i].score -= wager;
      }
    }
    setPlayers(newPlayers);

    // Go to game over screen
    setTimeout(() => {
      setScreen('gameOver');
    }, 3000);
  };

  // Play again
  const playAgain = () => {
    setScreen('setup');
    setPlayers([]);
    setCurrentPlayerIndex(0);
    setBoardData(null);
    setActiveClue(null);
    setCluesRemaining(30);
    setFinalJeopardy(null);
    setCustomItems([]);
  };

  return (
    <div className="app">
      {screen === 'setup' && (
        <SetupScreen onStart={startGame} />
      )}

      {screen === 'loading' && (
        <LoadingScreen
          items={customItems}
          onRetry={retryCustom}
          onUseRandom={useRandomFor}
          onCancel={cancelLoading}
        />
      )}

      {screen === 'board' && (
        <GameBoard
          boardData={boardData}
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          cluesRemaining={cluesRemaining}
          onSelectClue={selectClue}
          onSkipToFinal={skipToFinal}
        />
      )}

      {screen === 'clue' && (
        <ClueScreen
          activeClue={activeClue}
          currentPlayer={players[currentPlayerIndex]}
          onSubmitAnswer={submitAnswer}
        />
      )}

      {screen === 'dailyDouble' && (
        <DailyDouble
          activeClue={activeClue}
          currentPlayer={players[currentPlayerIndex]}
          onSubmit={submitDailyDouble}
        />
      )}

      {screen === 'final' && (
        <FinalJeopardy
          finalJeopardy={finalJeopardy}
          players={players}
          onSubmitWagers={submitFinalWagers}
          onSubmitGuesses={submitFinalGuesses}
        />
      )}

      {screen === 'gameOver' && (
        <GameOver
          players={players}
          onPlayAgain={playAgain}
        />
      )}
    </div>
  );
}

export default App;
