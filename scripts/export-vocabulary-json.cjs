/**
 * Export sql/seed/*.sql → data/vocabulary/all_vocabulary.json
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const seedDir = path.join(root, 'sql', 'seed');
const outFile = path.join(root, 'data', 'vocabulary', 'all_vocabulary.json');

const files = [
  'N5_vocabulary.sql', 'N4_vocabulary.sql', 'N3_vocabulary.sql',
  'N2_vocabulary.sql', 'N1_vocabulary.sql', 'Special_vocabulary.sql',
];

function parseRow(line) {
  const m = line.match(/\(\s*N'((?:[^']|'')*)'\s*,\s*N'((?:[^']|'')*)'\s*,\s*(?:N'((?:[^']|'')*)'|NULL)\s*,\s*N'((?:[^']|'')*)'\s*,\s*N'(N[1-5])'\s*,\s*(?:N'((?:[^']|'')*)'|NULL)\s*,\s*(?:N'((?:[^']|'')*)'|NULL)\s*,\s*(\d+)/);
  if (!m) return null;
  const unescape = (s) => s ? s.replace(/''/g, "'") : '';
  return {
    kanji: unescape(m[1]),
    kana: unescape(m[2]),
    hanViet: m[3] ? unescape(m[3]) : null,
    vietnamese: unescape(m[4]),
    jlptLevel: m[5],
    partOfSpeech: m[6] ? unescape(m[6]) : null,
    sortOrder: parseInt(m[8], 10),
  };
}

const all = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
  for (const line of content.split('\n')) {
    const row = parseRow(line.trim());
    if (row) all.push(row);
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(all));
console.log(`Exported ${all.length} vocabulary entries → ${outFile}`);
