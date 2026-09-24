// useSound.js
// Web Audio API sound effects for Jeopardy

export function useSound() {
  const playTone = (frequency, duration, type = 'sine') => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio not supported', e);
    }
  };

  const playSequence = (notes, noteDuration = 0.15, type = 'sine') => {
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, noteDuration, type), i * noteDuration * 1000);
    });
  };

  return {
    // Correct answer: C5→E5→G5 ascending arpeggio
    playCorrect: () => {
      playSequence([523.25, 659.25, 783.99], 0.2);
    },

    // Wrong answer: G3→D#3 descending
    playWrong: () => {
      playSequence([196.00, 155.56], 0.25);
    },

    // Daily Double: A4→C#5→E5→A5 fanfare
    playDailyDouble: () => {
      playSequence([440.00, 554.37, 659.25, 880.00], 0.18, 'square');
    },

    // Timer tick (at ≤5 seconds)
    playTick: () => {
      playTone(880.00, 0.1);
    },

    // Final Jeopardy theme (simple version)
    playFinalJeopardy: () => {
      playSequence([392.00, 440.00, 493.88, 523.25], 0.25);
    }
  };
}
