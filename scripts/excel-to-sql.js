/**
 * excel-to-sql.js
 * Convert từ vựng Excel → SQL seed files + TypeScript data file
 * 
 * Usage: node scripts/excel-to-sql.js
 * Output:
 *   - sql/seed/N5_vocabulary.sql
 *   - sql/seed/N4_vocabulary.sql
 *   - sql/seed/N3_vocabulary.sql
 *   - sql/seed/N2_vocabulary.sql
 *   - sql/seed/N1_vocabulary.sql
 *   - sql/seed/Special_vocabulary.sql
 *   - frontend/src/constants/jlptData.ts (updated with full data)
 */

const path = require('path');
const XLSX = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'xlsx'));
const fs = require('fs');


const EXCEL_PATH = path.join(__dirname, '..', 'từ vựng n5.xlsx');
const SQL_SEED_DIR = path.join(__dirname, '..', 'sql', 'seed');
const TS_OUTPUT = path.join(__dirname, '..', 'frontend', 'src', 'constants', 'jlptData.ts');

// ── Escape SQL string ─────────────────────────────────────────
function sqlStr(val) {
  if (!val && val !== 0) return 'NULL';
  return "N'" + String(val).replace(/'/g, "''").trim() + "'";
}

// ── Parse sheet theo format ───────────────────────────────────
function parseSheet(sheetName, data, level) {
  const rows = [];
  if (!data || data.length < 2) return rows;

  const header = data[0] || [];
  
  // Detect column positions
  let colKanji = 1, colKana = 2, colHanViet = 3, colViet = 4, colPos = 6;

  // N3 has different column order: STT | 漢字 | Hán Việt | ひらがな | Nghĩa
  if (sheetName === 'N3') {
    colKanji = 1; colHanViet = 2; colKana = 3; colViet = 4; colPos = 6;
  }
  // N2: STT | 漢字 | ひらがな | Nghĩa | Hán Việt
  if (sheetName === 'N2') {
    colKanji = 1; colKana = 2; colViet = 3; colHanViet = 4; colPos = -1;
  }
  // N1: STT | 漢字 | ひらがな | Nghĩa  (3 cột)
  if (sheetName === 'N1') {
    colKanji = 1; colKana = 2; colViet = 3; colHanViet = -1; colPos = -1;
  }
  // TỪ LÁY: không có STT header rõ ràng, bắt đầu từ row 0
  if (sheetName === 'TỪ LÁY') {
    colKanji = 1; colKana = 1; colViet = 3; colHanViet = -1; colPos = -1;
  }
  // LƯỢNG TỪ: STT | 漢字 | ひらがな | Nghĩa
  if (sheetName === 'LƯỢNG TỪ') {
    colKanji = 1; colKana = 2; colViet = 3; colHanViet = -1; colPos = -1;
  }
  // N2 BS: STT | 漢字 | ひらがな | Hán Việt | Nghĩa
  if (sheetName === 'N2 BS') {
    colKanji = 1; colKana = 2; colHanViet = 3; colViet = 4; colPos = -1;
  }

  // Determine start row (skip header if it exists)
  let startRow = 1;
  if (sheetName === 'TỪ LÁY') startRow = 0; // No header

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const kanji = String(row[colKanji] || '').trim();
    if (!kanji) continue;
    
    // Skip if kanji looks like a header
    if (['漢字', 'STT', 'No', 'Kanji'].includes(kanji)) continue;

    const kana = colKana >= 0 ? String(row[colKana] || '').trim() || kanji : kanji;
    const hanViet = colHanViet >= 0 ? String(row[colHanViet] || '').trim() : '';
    const vietnamese = colViet >= 0 ? String(row[colViet] || '').trim() : '';
    const pos = colPos >= 0 ? String(row[colPos] || '').trim() : '';

    if (!vietnamese || vietnamese === kanji || vietnamese === kana) continue;

    rows.push({
      kanji,
      kana: kana || kanji,
      hanViet: hanViet || '',
      vietnamese,
      jlptLevel: level,
      partOfSpeech: pos || '',
      sortOrder: i,
    });
  }

  return rows;
}

// ── Generate SQL INSERT statements ────────────────────────────
function generateSql(rows, sheetLabel, tags = '') {
  if (!rows.length) return '';

  let sql = `-- ============================================================\n`;
  sql += `-- JLPT Vocabulary Seed: ${sheetLabel}\n`;
  sql += `-- Records: ${rows.length}\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- ============================================================\n\n`;
  sql += `USE JapaneseAI;\nGO\n\n`;
  sql += `SET NOCOUNT ON;\n\n`;

  // Batch inserts in groups of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    sql += `INSERT INTO Vocabulary (Kanji, Kana, HanViet, Vietnamese, JlptLevel, PartOfSpeech, Tags, SortOrder, CreatedAt)\nVALUES\n`;
    const lines = batch.map(r =>
      `  (${sqlStr(r.kanji)}, ${sqlStr(r.kana)}, ${sqlStr(r.hanViet || null)}, ${sqlStr(r.vietnamese)}, ${sqlStr(r.jlptLevel)}, ${sqlStr(r.partOfSpeech || null)}, ${sqlStr(tags || null)}, ${r.sortOrder}, GETDATE())`
    );
    sql += lines.join(',\n') + ';\n\n';
  }

  sql += `PRINT 'Seeded ${rows.length} ${sheetLabel} records.';\nGO\n`;
  return sql;
}

// ── Generate TypeScript data ──────────────────────────────────
function generateTypeScript(allRows) {
  const n5 = allRows.filter(r => r.jlptLevel === 'N5');
  const n4 = allRows.filter(r => r.jlptLevel === 'N4');
  const n3 = allRows.filter(r => r.jlptLevel === 'N3');

  const toTsEntry = (r, idx) => {
    const id = `${r.jlptLevel.toLowerCase()}_${String(idx + 1).padStart(4, '0')}`;
    const pos = r.partOfSpeech || '';
    // Map short pos codes to Japanese grammar names
    const posMap = {
      'N': '名詞', 'V': '動詞', 'A': 'い形容詞', 'Na': 'な形容詞',
      'Adv': '副詞', 'Pron': '代名詞', 'Conj': '接続詞', 'Int': '感動詞',
      'Prep': '助詞', 'Num': '数詞', 'Suf': '接尾語', 'Aux': '助動詞',
      'V2': '動詞', 'V3': '動詞',
    };
    const posJa = posMap[pos] || (pos ? pos : '名詞');

    return `  { id: '${id}', kanji: ${JSON.stringify(r.kanji)}, kana: ${JSON.stringify(r.kana)}, hanViet: ${JSON.stringify(r.hanViet)}, vietnamese: ${JSON.stringify(r.vietnamese)}, level: '${r.jlptLevel}', pos: '${posJa}' }`;
  };

  let ts = `// ============================================================\n`;
  ts += `// JLPT Vocabulary Database – Generated from Excel\n`;
  ts += `// N5: ${n5.length} words | N4: ${n4.length} words | N3: ${n3.length} words\n`;
  ts += `// Generated: ${new Date().toISOString()}\n`;
  ts += `// ============================================================\n\n`;

  ts += `export interface VocabEntry {\n`;
  ts += `  id: string;\n`;
  ts += `  kanji: string;\n`;
  ts += `  kana: string;\n`;
  ts += `  hanViet: string;\n`;
  ts += `  vietnamese: string;\n`;
  ts += `  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';\n`;
  ts += `  pos: string;\n`;
  ts += `  lesson?: number;\n`;
  ts += `}\n\n`;

  ts += `// ── JLPT N5 (${n5.length} từ) ──────────────────────────────\n`;
  ts += `export const JLPT_N5: VocabEntry[] = [\n${n5.map((r, i) => toTsEntry(r, i)).join(',\n')}\n];\n\n`;

  ts += `// ── JLPT N4 (${n4.length} từ) ──────────────────────────────\n`;
  ts += `export const JLPT_N4: VocabEntry[] = [\n${n4.map((r, i) => toTsEntry(r, i)).join(',\n')}\n];\n\n`;

  ts += `// ── JLPT N3 (${n3.length} từ) ──────────────────────────────\n`;
  ts += `export const JLPT_N3: VocabEntry[] = [\n${n3.map((r, i) => toTsEntry(r, i)).join(',\n')}\n];\n\n`;

  ts += `// ── All vocab combined ───────────────────────────────────────\n`;
  ts += `export const ALL_VOCAB: VocabEntry[] = [...JLPT_N5, ...JLPT_N4, ...JLPT_N3];\n\n`;

  ts += `// ── Utility functions ─────────────────────────────────────────\n`;
  ts += `export function getVocabByLevel(level: 'N5' | 'N4' | 'N3' | 'all'): VocabEntry[] {\n`;
  ts += `  if (level === 'all') return ALL_VOCAB;\n`;
  ts += `  return ALL_VOCAB.filter(v => v.level === level);\n`;
  ts += `}\n\n`;

  ts += `export function searchVocab(query: string): VocabEntry[] {\n`;
  ts += `  const q = query.toLowerCase().trim();\n`;
  ts += `  if (!q) return [];\n`;
  ts += `  return ALL_VOCAB.filter(v =>\n`;
  ts += `    v.kanji.includes(q) ||\n`;
  ts += `    v.kana.includes(q) ||\n`;
  ts += `    v.vietnamese.toLowerCase().includes(q) ||\n`;
  ts += `    v.hanViet.toLowerCase().includes(q)\n`;
  ts += `  );\n`;
  ts += `}\n\n`;

  ts += `export const POS_LABELS: Record<string, string> = {\n`;
  ts += `  '名詞': 'Danh từ',\n`;
  ts += `  '動詞': 'Động từ',\n`;
  ts += `  'い形容詞': 'Tính từ い',\n`;
  ts += `  'な形容詞': 'Tính từ な',\n`;
  ts += `  '副詞': 'Phó từ',\n`;
  ts += `  '感動詞': 'Thán từ',\n`;
  ts += `  '数詞': 'Số từ',\n`;
  ts += `  '代名詞': 'Đại từ',\n`;
  ts += `  '接続詞': 'Liên từ',\n`;
  ts += `};\n`;

  return ts;
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('📖 Reading Excel file:', EXCEL_PATH);
  
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('❌ File not found:', EXCEL_PATH);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  console.log('✅ Sheets found:', wb.SheetNames.join(', '));

  const allRows = [];

  // ── Process N5 ──
  const n5raw = XLSX.utils.sheet_to_json(wb.Sheets['N5'], { header: 1 });
  const n5rows = parseSheet('N5', n5raw, 'N5');
  console.log(`N5: ${n5rows.length} rows parsed`);
  allRows.push(...n5rows);
  fs.writeFileSync(path.join(SQL_SEED_DIR, 'N5_vocabulary.sql'), generateSql(n5rows, 'JLPT N5'));

  // ── Process N4 ──
  const n4raw = XLSX.utils.sheet_to_json(wb.Sheets['N4'], { header: 1 });
  const n4rows = parseSheet('N4', n4raw, 'N4');
  console.log(`N4: ${n4rows.length} rows parsed`);
  allRows.push(...n4rows);
  fs.writeFileSync(path.join(SQL_SEED_DIR, 'N4_vocabulary.sql'), generateSql(n4rows, 'JLPT N4'));

  // ── Process N3 ──
  const n3raw = XLSX.utils.sheet_to_json(wb.Sheets['N3'], { header: 1 });
  const n3rows = parseSheet('N3', n3raw, 'N3');
  console.log(`N3: ${n3rows.length} rows parsed`);
  allRows.push(...n3rows);
  fs.writeFileSync(path.join(SQL_SEED_DIR, 'N3_vocabulary.sql'), generateSql(n3rows, 'JLPT N3'));

  // ── Process N2 ──
  const n2raw = XLSX.utils.sheet_to_json(wb.Sheets['N2'], { header: 1 });
  const n2rows = parseSheet('N2', n2raw, 'N2');
  console.log(`N2: ${n2rows.length} rows parsed`);
  fs.writeFileSync(path.join(SQL_SEED_DIR, 'N2_vocabulary.sql'), generateSql(n2rows, 'JLPT N2'));

  // ── Process N1 ──
  const n1raw = XLSX.utils.sheet_to_json(wb.Sheets['N1'], { header: 1 });
  const n1rows = parseSheet('N1', n1raw, 'N1');
  console.log(`N1: ${n1rows.length} rows parsed`);
  fs.writeFileSync(path.join(SQL_SEED_DIR, 'N1_vocabulary.sql'), generateSql(n1rows, 'JLPT N1'));

  // ── Process special sheets ──
  const specialRows = [];

  const n2bsRaw = XLSX.utils.sheet_to_json(wb.Sheets['N2 BS'], { header: 1 });
  const n2bsRows = parseSheet('N2 BS', n2bsRaw, 'N2');
  n2bsRows.forEach(r => r.tags = 'N2 BS');
  console.log(`N2 BS: ${n2bsRows.length} rows parsed`);
  specialRows.push(...n2bsRows);

  const tlRaw = XLSX.utils.sheet_to_json(wb.Sheets['TỪ LÁY'], { header: 1 });
  const tlRows = parseSheet('TỪ LÁY', tlRaw, 'N3');
  tlRows.forEach(r => { r.tags = 'Từ láy'; r.jlptLevel = 'N3'; });
  console.log(`TỪ LÁY: ${tlRows.length} rows parsed`);
  specialRows.push(...tlRows);

  const ltRaw = XLSX.utils.sheet_to_json(wb.Sheets['LƯỢNG TỪ'], { header: 1 });
  const ltRows = parseSheet('LƯỢNG TỪ', ltRaw, 'N3');
  ltRows.forEach(r => { r.tags = 'Lượng từ'; r.jlptLevel = 'N3'; });
  console.log(`LƯỢNG TỪ: ${ltRows.length} rows parsed`);
  specialRows.push(...ltRows);

  if (specialRows.length > 0) {
    const specialSql = generateSql(specialRows, 'Special (N2 BS + Từ Láy + Lượng Từ)', 'special');
    fs.writeFileSync(path.join(SQL_SEED_DIR, 'Special_vocabulary.sql'), specialSql);
  }

  // ── Generate TypeScript (N5+N4+N3 only for FE) ──
  console.log('\n📝 Generating TypeScript data file...');
  const tsContent = generateTypeScript(allRows.filter(r => ['N5','N4','N3'].includes(r.jlptLevel)));
  fs.writeFileSync(TS_OUTPUT, tsContent, 'utf8');
  console.log('✅ TypeScript file written to:', TS_OUTPUT);

  // ── Summary ──
  console.log('\n✅ Done! SQL files generated:');
  fs.readdirSync(SQL_SEED_DIR).forEach(f => {
    const size = fs.statSync(path.join(SQL_SEED_DIR, f)).size;
    console.log(`   ${f} (${(size/1024).toFixed(1)} KB)`);
  });
  
  console.log('\n📊 Total vocabulary imported:');
  console.log(`   N5: ${n5rows.length}`);
  console.log(`   N4: ${n4rows.length}`);
  console.log(`   N3: ${n3rows.length}`);
  console.log(`   N2: ${n2rows.length}`);
  console.log(`   N1: ${n1rows.length}`);
  console.log(`   Special: ${specialRows.length}`);
  console.log(`   TOTAL: ${n5rows.length + n4rows.length + n3rows.length + n2rows.length + n1rows.length + specialRows.length}`);
}

main().catch(console.error);
