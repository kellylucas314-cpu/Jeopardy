/**
 * The Campaign — Napoleon's life as a ladder of fifteen chapters.
 *
 * Each chapter is a full game with its own themed categories (one about the
 * wider world of that year, one about Napoleon's own story), its own Final,
 * a difficulty tier that shapes which packs the other categories are drawn
 * from, a clue timer, and a score target the table must hit to advance.
 *
 * Content lives in public/data/campaign/chapters.json (history, empire ledger,
 * clues). Progress lives in localStorage under `jeopardy-campaign`.
 */

import { loadPrefs } from './state.js';

let campaignData = null;

export async function loadCampaign() {
  if (campaignData) return campaignData;
  const res = await fetch('./data/campaign/chapters.json');
  campaignData = await res.json();
  return campaignData;
}

export function chapterCount() {
  return campaignData ? campaignData.chapters.length : 15;
}

export function getChapter(number) {
  if (!campaignData) return null;
  return campaignData.chapters[Math.max(0, Math.min(campaignData.chapters.length, number) - 1)] || null;
}

// ——— Progress (persisted) ———

const PROGRESS_KEY = 'jeopardy-campaign';

/** { current: 1-based chapter number, completed: [{number, score, leader, at}], attempts: {number: n} } */
export function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    return {
      current: Math.max(1, p.current || 1),
      completed: Array.isArray(p.completed) ? p.completed : [],
      attempts: p.attempts && typeof p.attempts === 'object' ? p.attempts : {},
      finishedAt: p.finishedAt || null,
    };
  } catch {
    return { current: 1, completed: [], attempts: {}, finishedAt: null };
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // localStorage unavailable — progress lasts only this session
  }
}

export function resetProgress() {
  saveProgress({ current: 1, completed: [], attempts: {}, finishedAt: null });
}

/**
 * Record a finished chapter game. Advances the campaign on a win; on a
 * setback, counts the attempt so the setup screen can offer a gentler target.
 * Returns the outcome used by the results screen.
 */
export function recordChapterResult(chapter, players, gameLength) {
  const progress = loadProgress();
  const top = players.reduce((best, p) => (p.score > best.score ? p : best), players[0]);
  const target = chapterTarget(chapter, gameLength, progress);
  const won = top.score >= target;
  const total = chapterCount();
  const number = chapter.number;

  progress.attempts[number] = (progress.attempts[number] || 0) + 1;
  let campaignComplete = false;
  if (won) {
    progress.completed = progress.completed.filter(c => c.number !== number);
    progress.completed.push({ number, score: top.score, leader: top.name, at: Date.now() });
    if (number >= progress.current) {
      if (number >= total) {
        campaignComplete = true;
        progress.finishedAt = progress.finishedAt || Date.now();
        progress.current = total; // stays on the last chapter; replay any chapter freely
      } else {
        progress.current = number + 1;
      }
    }
  }
  saveProgress(progress);

  const gained = won ? empireGains(chapter) : [];
  const next = won && !campaignComplete ? getChapter(number + 1) : null;
  return { won, target, topScore: top.score, leader: top.name, gained, next, campaignComplete, attempts: progress.attempts[number] };
}

// ——— Difficulty ———

/**
 * Score a table must reach to win the chapter. Tiers climb; a quick game is a
 * single round so its bar is lower. After two setbacks on the same chapter the
 * bar eases a step, so a family night never stalls for good.
 */
const TARGETS_FULL = [2500, 4000, 5500, 7000, 9000];
const TARGETS_QUICK = [1200, 2000, 2800, 3600, 4500];

export function chapterTarget(chapter, gameLength = 'full', progress = loadProgress()) {
  const table = gameLength === 'quick' ? TARGETS_QUICK : TARGETS_FULL;
  const attempts = (progress.attempts && progress.attempts[chapter.number]) || 0;
  const tierIndex = Math.max(0, Math.min(4, chapter.tier - 1) - Math.floor(attempts / 2));
  return table[tierIndex];
}

/** Seconds on the clock for a clue in this chapter (35 → 22 as the tiers climb). */
export function chapterTimer(chapter) {
  return [35, 32, 30, 26, 22][Math.max(0, Math.min(4, chapter.tier - 1))];
}

/**
 * Which packs feed the five non-themed categories on each round's board.
 * The ramp is relative to the pack the table chose on the setup screen:
 * Easy Breezy tables climb from all-easy to a Fresh mix, Fresh tables from
 * easy-tinged to Round-2 fare, Deep Archive tables into archive material.
 * Each entry is { pack, dir, count }; counts sum to 5.
 */
export function chapterRecipe(chapter, round, basePack = 'fresh') {
  const t = Math.max(1, Math.min(5, chapter.tier));
  const r2 = round === 2;
  const easy = (dir, count) => ({ pack: 'easy', dir, count });
  const fresh = (dir, count) => ({ pack: 'fresh', dir, count });
  const arch = (dir, count) => ({ pack: 'archive', dir, count });

  if (basePack === 'easy') {
    const ladder = {
      1: r2 ? [easy('double', 5)] : [easy('jeopardy', 5)],
      2: r2 ? [easy('double', 5)] : [easy('jeopardy', 5)],
      3: r2 ? [easy('double', 4), fresh('jeopardy', 1)] : [easy('jeopardy', 4), fresh('jeopardy', 1)],
      4: r2 ? [easy('double', 3), fresh('jeopardy', 2)] : [easy('jeopardy', 3), fresh('jeopardy', 2)],
      5: r2 ? [easy('double', 2), fresh('jeopardy', 3)] : [easy('jeopardy', 3), fresh('jeopardy', 2)],
    };
    return ladder[t];
  }
  if (basePack === 'archive') {
    const ladder = {
      1: r2 ? [fresh('double', 5)] : [fresh('jeopardy', 5)],
      2: r2 ? [fresh('double', 4), arch('double', 1)] : [fresh('jeopardy', 4), arch('jeopardy', 1)],
      3: r2 ? [fresh('double', 3), arch('double', 2)] : [fresh('jeopardy', 3), arch('jeopardy', 2)],
      4: r2 ? [fresh('double', 2), arch('double', 3)] : [fresh('jeopardy', 2), arch('jeopardy', 3)],
      5: r2 ? [arch('double', 5)] : [arch('jeopardy', 5)],
    };
    return ladder[t];
  }
  // Fresh (default)
  const ladder = {
    1: r2 ? [easy('double', 2), fresh('jeopardy', 3)] : [easy('jeopardy', 3), fresh('jeopardy', 2)],
    2: r2 ? [fresh('jeopardy', 3), fresh('double', 2)] : [easy('jeopardy', 1), fresh('jeopardy', 4)],
    3: r2 ? [fresh('double', 5)] : [fresh('jeopardy', 5)],
    4: r2 ? [fresh('double', 5)] : [fresh('jeopardy', 3), fresh('double', 2)],
    5: r2 ? [fresh('double', 5)] : [fresh('jeopardy', 1), fresh('double', 4)],
  };
  return ladder[t];
}

/** Human label for the difficulty tier — shown on the chapter card. */
export function tierLabel(tier) {
  return ['Skirmish', 'Engagement', 'Battle', 'Grand Battle', 'Decisive'][Math.max(0, Math.min(4, tier - 1))];
}

// ——— Themed content ———

const R1 = [200, 400, 600, 800, 1000];
const R2 = [400, 800, 1200, 1600, 2000];

/** The chapter's themed category for a round, with values scaled to the round's ladder. */
export function themedCategory(chapter, round, gameLength = 'full') {
  // A quick game has one board, so it gets Napoleon's own chapter; a full game
  // opens with the wider world of the year and saves the chapter for Round 2.
  const src = gameLength === 'quick' || round === 2 ? chapter.chapter : chapter.era;
  const values = round === 2 ? R2 : R1;
  return {
    name: src.name,
    themed: true,
    clues: src.clues.map((c, i) => ({
      clue: c.clue,
      response: c.response,
      value: values[i],
      answered: false,
      isDailyDouble: false,
    })),
  };
}

export function themedFinal(chapter) {
  return { name: chapter.final.name, clue: chapter.final.clue, response: chapter.final.response };
}

// ——— Empire ledger helpers ———

/** Holdings that count toward "the size of the empire" (everything not lost). */
export function empireHoldings(chapter) {
  return (chapter.empire.holdings || []).filter(h => h.status !== 'lost' && h.status !== 'exile');
}

/** What winning this chapter adds to the ledger compared with the one before. */
export function empireGains(chapter) {
  const prev = getChapter(chapter.number - 1);
  const before = new Set(prev ? empireHoldings(prev).map(h => h.name) : []);
  return empireHoldings(chapter).filter(h => !before.has(h.name)).map(h => h.name);
}

/** What this chapter's history takes away. */
export function empireLosses(chapter) {
  return (chapter.empire.holdings || []).filter(h => h.status === 'lost').map(h => h.name);
}

/** The largest ledger across all chapters — the zenith, for progress bars. */
export function empireMax() {
  if (!campaignData) return 1;
  return Math.max(1, ...campaignData.chapters.map(c => empireHoldings(c).length));
}

export function statusLabel(status) {
  return (campaignData && campaignData.statusLabels && campaignData.statusLabels[status]) || status;
}

/** Is the campaign the table's chosen play style? */
export function campaignEnabled() {
  return loadPrefs().playStyle === 'campaign';
}
