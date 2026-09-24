// scripts/processDataset.js
// Converts the 529K-clue TSV dataset to a clean JSON format
// Run: node scripts/processDataset.js

const fs = require('fs');
const path = require('path');

const TSV_PATH = path.join(__dirname, '../data/combined_season1-41.tsv');
const OUTPUT_PATH = path.join(__dirname, '../client/src/data/clues.json');

console.log('📊 Processing Jeopardy dataset...\n');

/**
 * Clean text - remove backslash escapes that shouldn't be in display text
 */
function cleanText(str) {
  if (!str) return str;
  return str
    .replace(/\\"/g, '"')     // Backslash-quote to just quote
    .replace(/\\'/g, "'")     // Backslash-single-quote to just single quote
    .replace(/\\\\/g, '\\')   // Double backslash to single
    .trim();
}

// Read TSV
const raw = fs.readFileSync(TSV_PATH, 'utf-8');
const lines = raw.split('\n');
const headers = lines[0].split('\t');

console.log(`Total lines in dataset: ${lines.length.toLocaleString()}`);

// Parse
const clues = [];
const VISUAL_KEYWORDS = /seen here|shown here|this picture|this photo|clue crew|this map|this image|video clue|audio clue|heard here/i;

let visualFiltered = 0;
let emptyFiltered = 0;
let finalJeopardyFiltered = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  if (cols.length < 8) continue;

  const round = parseInt(cols[0]);
  const clueValue = parseInt(cols[1]) || 0;
  const category = cols[3]?.trim();
  const clueText = cols[5]?.trim();    // "answer" column = clue (what host reads)
  const response = cols[6]?.trim();    // "question" column = response (what contestant says)
  const airDate = cols[7]?.trim();

  // Skip Final Jeopardy (round 3)
  if (round === 3) {
    finalJeopardyFiltered++;
    continue;
  }

  // Skip empty clues
  if (!clueText || !response || !category) {
    emptyFiltered++;
    continue;
  }

  // Skip visual/audio clues
  if (VISUAL_KEYWORDS.test(clueText)) {
    visualFiltered++;
    continue;
  }

  // Skip clues with $0 value
  if (clueValue === 0) continue;

  clues.push({
    cat: category,
    val: clueValue,
    clue: cleanText(clueText),
    resp: cleanText(response),
    date: airDate
  });
}

console.log(`\nFiltering results:`);
console.log(`  - Final Jeopardy clues removed: ${finalJeopardyFiltered.toLocaleString()}`);
console.log(`  - Visual/audio clues removed: ${visualFiltered.toLocaleString()}`);
console.log(`  - Empty clues removed: ${emptyFiltered.toLocaleString()}`);
console.log(`  - Valid clues remaining: ${clues.length.toLocaleString()}\n`);

// Group by category
const byCategory = {};
for (const c of clues) {
  if (!byCategory[c.cat]) byCategory[c.cat] = [];
  byCategory[c.cat].push(c);
}

console.log(`Total unique categories: ${Object.keys(byCategory).length.toLocaleString()}`);

// Keep only categories with 50+ clues (for reliable random selection)
const filtered = {};
let totalKept = 0;

for (const [cat, items] of Object.entries(byCategory)) {
  if (items.length >= 50) {
    filtered[cat] = items;
    totalKept += items.length;
  }
}

console.log(`Categories with 50+ clues: ${Object.keys(filtered).length}`);
console.log(`Total clues kept: ${totalKept.toLocaleString()}\n`);

// Create output directory if it doesn't exist
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write to JSON
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(filtered));

const stats = fs.statSync(OUTPUT_PATH);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`✅ Success!`);
console.log(`Written to: ${OUTPUT_PATH}`);
console.log(`File size: ${sizeMB} MB\n`);

// Show top 10 categories by clue count
console.log('Top 10 categories by clue count:');
const sorted = Object.entries(filtered)
  .map(([cat, items]) => ({ cat, count: items.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);

sorted.forEach(({ cat, count }, i) => {
  console.log(`  ${(i + 1).toString().padStart(2)}. ${cat.padEnd(30)} ${count.toLocaleString()} clues`);
});
