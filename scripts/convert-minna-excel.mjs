import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('../frontend/node_modules/xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const excelPath = path.join(rootDir, 'tu_vung_n5_minna_ngu_phap_1_25.xlsx');
const outDir = path.join(rootDir, 'frontend', 'src', 'data');
const outputPath = path.join(outDir, 'minnaN5Grammar.json');

console.log('Reading Excel file from:', excelPath);
if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found!');
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Raw rows
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const headers = rows[0];

const vocabEntries = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0) continue;

  const id = row[0] ? Number(row[0]) : i;
  const kanji = row[1] ? String(row[1]).trim() : '';
  const kana = row[2] ? String(row[2]).trim() : '';
  const hanViet = row[3] ? String(row[3]).trim() : '';
  const meaning = row[4] ? String(row[4]).trim() : '';
  // row[5] is "Chưa thuộc"
  const pos = row[6] ? String(row[6]).trim() : '';
  const exampleJa = row[7] ? String(row[7]).trim() : '';
  const exampleVi = row[8] ? String(row[8]).trim() : '';
  const grammarPoint = row[9] ? String(row[9]).trim() : '';

  if (!kanji && !kana) continue; // skip empty rows

  let lessonNumber = 0;
  let patternKey = grammarPoint;

  if (grammarPoint) {
    const match = grammarPoint.match(/Bài\s+(\d+)\s*[:：]\s*(.*)/i);
    if (match) {
      lessonNumber = parseInt(match[1], 10);
      patternKey = match[2].trim();
    } else {
      const numMatch = grammarPoint.match(/Bài\s+(\d+)/i);
      if (numMatch) {
        lessonNumber = parseInt(numMatch[1], 10);
      }
    }
  }

  vocabEntries.push({
    id,
    kanji,
    kana,
    hanViet,
    meaning,
    pos,
    exampleJa,
    exampleVi,
    grammarPoint,
    lessonNumber,
    patternKey
  });
}

console.log(`Parsed ${vocabEntries.length} vocabulary entries.`);

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(vocabEntries, null, 2), 'utf8');
console.log('Saved JSON data to:', outputPath);
