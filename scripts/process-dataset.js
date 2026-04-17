/**
 * Process the 77MB Jeopardy TSV into optimized JSON chunks for the game.
 *
 * Strategy:
 * - Parse TSV, group clues by (category, air_date, round) — each group is one
 *   category as it appeared in a real episode.
 * - Keep only groups with exactly 5 clues (a complete category).
 * - Normalize dollar values to modern Jeopardy values:
 *   Round 1: $200, $400, $600, $800, $1000
 *   Round 2: $400, $800, $1200, $1600, $2000
 * - Split into chunk files (~100 categories per chunk) separated by round.
 * - Write a small manifest.json with chunk counts.
 *
 * Output:
 *   public/data/manifest.json
 *   public/data/jeopardy/chunk-000.json ... chunk-NNN.json
 *   public/data/double/chunk-000.json   ... chunk-NNN.json
 *   public/data/final/chunk-000.json    ... chunk-NNN.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TSV_PATH = join(ROOT, 'jeopardy_dataset.tsv');
const DATA_DIR = join(ROOT, 'public', 'data');

const CATEGORIES_PER_CHUNK = 100;

const JEOPARDY_VALUES = [200, 400, 600, 800, 1000];
const DOUBLE_VALUES = [400, 800, 1200, 1600, 2000];

function parseTSV(path) {
  const raw = readFileSync(path, 'utf-8');
  const lines = raw.split('\n');
  const header = lines[0].split('\t');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('\t');
    if (cols.length < 7) continue;

    const round = parseInt(cols[0], 10);
    if (isNaN(round) || round < 1 || round > 3) continue;

    rows.push({
      round,
      clueValue: parseInt(cols[1], 10) || 0,
      dailyDoubleValue: parseInt(cols[2], 10) || 0,
      category: cols[3].trim(),
      answer: cols[5].trim(),   // "answer" in TSV = the clue text
      question: cols[6].trim(), // "question" in TSV = correct response
      airDate: cols[7] ? cols[7].trim() : '',
    });
  }

  return rows;
}

function groupClues(rows) {
  // Group by (category, airDate, round) — each is one category instance from an episode
  const groups = new Map();

  for (const row of rows) {
    const key = `${row.category}|||${row.airDate}|||${row.round}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name: row.category,
        airDate: row.airDate,
        round: row.round,
        clues: [],
      });
    }
    groups.get(key).clues.push(row);
  }

  return groups;
}

function normalizeValues(clues, round) {
  // Sort by original clue value to get difficulty order
  clues.sort((a, b) => a.clueValue - b.clueValue);

  const targetValues = round === 1 ? JEOPARDY_VALUES : DOUBLE_VALUES;

  return clues.map((clue, i) => ({
    clue: clue.answer,       // The clue text (what's shown to the player)
    response: clue.question,  // The correct response ("What is...")
    value: targetValues[i],
    isDailyDouble: clue.dailyDoubleValue > 0,
  }));
}

function buildChunks(categoryList, dir, label) {
  mkdirSync(dir, { recursive: true });

  // Shuffle for variety
  for (let i = categoryList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categoryList[i], categoryList[j]] = [categoryList[j], categoryList[i]];
  }

  const chunkCount = Math.ceil(categoryList.length / CATEGORIES_PER_CHUNK);
  for (let c = 0; c < chunkCount; c++) {
    const start = c * CATEGORIES_PER_CHUNK;
    const end = Math.min(start + CATEGORIES_PER_CHUNK, categoryList.length);
    const chunk = categoryList.slice(start, end);
    const filename = `chunk-${String(c).padStart(3, '0')}.json`;
    writeFileSync(join(dir, filename), JSON.stringify(chunk));
  }

  console.log(`  ${label}: ${categoryList.length} categories -> ${chunkCount} chunks`);
  return chunkCount;
}

function main() {
  console.log('Parsing TSV...');
  const rows = parseTSV(TSV_PATH);
  console.log(`  ${rows.length} clues parsed`);

  console.log('Grouping by category instance...');
  const groups = groupClues(rows);
  console.log(`  ${groups.size} category instances found`);

  // Separate by round and filter to complete categories
  const jeopardyCategories = [];
  const doubleCategories = [];
  const finalCategories = [];

  for (const group of groups.values()) {
    if (group.round === 1 && group.clues.length === 5) {
      jeopardyCategories.push({
        name: group.name,
        clues: normalizeValues(group.clues, 1),
      });
    } else if (group.round === 2 && group.clues.length === 5) {
      doubleCategories.push({
        name: group.name,
        clues: normalizeValues(group.clues, 2),
      });
    } else if (group.round === 3 && group.clues.length === 1) {
      const clue = group.clues[0];
      finalCategories.push({
        name: group.name,
        clue: clue.answer,
        response: clue.question,
      });
    }
  }

  console.log(`Valid categories: J=${jeopardyCategories.length}, DJ=${doubleCategories.length}, FJ=${finalCategories.length}`);

  console.log('Building chunks...');
  const jChunks = buildChunks(jeopardyCategories, join(DATA_DIR, 'jeopardy'), 'Jeopardy');
  const dChunks = buildChunks(doubleCategories, join(DATA_DIR, 'double'), 'Double Jeopardy');
  const fChunks = buildChunks(finalCategories, join(DATA_DIR, 'final'), 'Final Jeopardy');

  const manifest = {
    jeopardy: jChunks,
    double: dChunks,
    final: fChunks,
  };
  writeFileSync(join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest));
  console.log('Manifest written.');
  console.log('Done!');
}

main();
