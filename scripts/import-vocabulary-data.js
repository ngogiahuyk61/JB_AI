const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const XLSX = require(path.join(root, 'frontend', 'node_modules', 'xlsx'));

const excelFile1 = path.join(root, 'từ vựng n5.xlsx');
const excelFile2 = path.join(root, 'tu_vung_n5_minna_ngu_phap_1_25.xlsx');
const outPaths = [
  path.join(root, 'data', 'vocabulary', 'all_vocabulary.json'),
  path.join(root, 'frontend', 'src', 'data', 'all_vocabulary.json'),
];

function normalizeSheetName(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^0-9A-Za-z]/g, '')
    .trim()
    .toUpperCase();
}

function isHeaderRow(row) {
  if (!row || !Array.isArray(row)) return false;
  return row.some(cell => {
    const text = String(cell || '').toLowerCase();
    return ['stt', '漢字', 'ひらがな', 'hán việt', 'hánviet', 'nghĩa', 'nghia', 'từ loại', 'ví dụ', 'grammar', 'bài'].some(keyword => text.includes(keyword));
  });
}

function isKana(text) {
  return /[\u3040-\u309f\u30a0-\u30ff]/.test(String(text));
}

function parseText(value) {
  return String(value || '').trim();
}

function parseContentRow(sheetKey, cells) {
  const row = cells.map(parseText);
  if (row.every(cell => cell === '')) return null;

  const hasNumCell = /^[0-9]+$/.test(row[0]);
  if (hasNumCell) row.shift();

  if (row.length === 0) return null;
  const firstCell = row[0];
  if (!firstCell || /^[0-9]+$/.test(firstCell)) return null;

  const item = {
    kanji: '',
    kana: '',
    hanViet: '',
    vietnamese: '',
    jlptLevel: '',
    partOfSpeech: '',
    tags: undefined,
    sortOrder: 0,
    exampleSentence: undefined,
    exampleTranslation: undefined,
    exampleRomaji: undefined,
    grammarPoint: undefined,
  };

  switch (sheetKey) {
    case 'N5':
    case 'N4': {
      item.kanji = row[0];
      item.kana = row[1] || row[0];
      item.hanViet = row[2] || '';
      item.vietnamese = row[3] || '';
      item.partOfSpeech = row[6] || row[5] || '';
      break;
    }
    case 'N3': {
      if (isKana(row[1]) && !row[2]) {
        item.kanji = row[0];
        item.kana = row[1];
        item.vietnamese = row[2] || row[3] || '';
      } else {
        item.kanji = row[0];
        item.hanViet = row[1] || '';
        item.kana = row[2] || row[0];
        item.vietnamese = row[3] || '';
        item.partOfSpeech = row[6] || row[5] || '';
      }
      break;
    }
    case 'N2': {
      item.kanji = row[1] || row[0];
      item.kana = row[2] || row[1] || item.kanji;
      item.vietnamese = row[3] || '';
      item.hanViet = row[4] || '';
      item.partOfSpeech = row[6] || row[5] || '';
      break;
    }
    case 'N1': {
      if (row.length >= 3 && isKana(row[1])) {
        item.kanji = row[0];
        item.kana = row[1];
        item.vietnamese = row[2] || '';
      } else {
        item.kanji = row[1] || row[0];
        item.kana = row[2] || row[1] || item.kanji;
        item.vietnamese = row[3] || '';
      }
      break;
    }
    case 'N2 BS': {
      item.kanji = row[1] || row[0];
      item.kana = row[2] || row[1] || item.kanji;
      item.hanViet = row[3] || '';
      item.vietnamese = row[4] || row[3] || row[2] || '';
      item.tags = 'special,n2_bs';
      break;
    }
    case 'TU LAY':
    case 'TỪ LÁY': {
      item.kanji = row[0] || '';
      // try to detect kana cell and vietnamese cell more flexibly
      item.kana = row[1] || row[0] || '';
      item.vietnamese = row[2] || row[3] || row[4] || '';
      if (!item.vietnamese) {
        // fallback: pick first cell that contains Latin letters (likely vietnamese)
        const latin = row.find(c => /[A-Za-z\u00C0-\u017F]/.test(String(c || '')));
        item.vietnamese = latin || '';
      }
      item.tags = 'special,tu_lay';
      break;
    }
    case 'LUONG TU':
    case 'LƯỢNG TỪ': {
      item.kanji = row[0] || '';
      item.kana = row[1] || row[0] || '';
      item.vietnamese = row[2] || row[3] || '';
      if (!item.vietnamese) {
        const latin = row.find(c => /[A-Za-z\u00C0-\u017F]/.test(String(c || '')));
        item.vietnamese = latin || '';
      }
      item.tags = 'special,luong_tu';
      break;
    }
    default:
      return null;
  }

  if (!item.kana) {
    item.kana = item.kanji;
  }
  if (!item.vietnamese) return null;
  return item;
}

function buildVocabulary() {
  const workbook = XLSX.readFile(excelFile1, { cellDates: true });
  const grammarBook = XLSX.readFile(excelFile2, { cellDates: true });

  const grammarSheetName = grammarBook.SheetNames[0];
  const grammarRows = XLSX.utils.sheet_to_json(grammarBook.Sheets[grammarSheetName], { header: 1, defval: '' });
  const grammarHeaderIndex = grammarRows.findIndex(isHeaderRow);
  const grammarData = {};

  if (grammarHeaderIndex >= 0) {
    const headerRow = grammarRows[grammarHeaderIndex].map(parseText);
    for (let i = grammarHeaderIndex + 1; i < grammarRows.length; i += 1) {
      const row = grammarRows[i].map(parseText);
      if (row.every(cell => cell === '')) continue;
      const kanji = row[1] || row[0];
      const kana = row[2] || '';
      const exampleSentence = row[7] || '';
      const exampleTranslation = row[8] || '';
      const grammarPoint = row[9] || '';
      if (!kanji || !exampleSentence) continue;
      const key = `${kanji}|${kana}`;
      grammarData[key] = {
        exampleSentence,
        exampleTranslation,
        grammarPoint,
      };
    }
  }

  const vocabulary = [];
  const seenKeys = new Set();

  for (const sheetName of workbook.SheetNames) {
    const normalized = normalizeSheetName(sheetName);
    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headerIndex = sheetRows.findIndex(isHeaderRow);
    const dataRows = headerIndex >= 0 ? sheetRows.slice(headerIndex + 1) : sheetRows;
    const sheetKey = ['N5', 'N4', 'N3', 'N2', 'N1', 'N2 BS', 'TỪ LÁY', 'LƯỢNG TỪ'].find(name => normalizeSheetName(name) === normalized);
    if (!sheetKey) continue;

    let rowIndex = 0;
    for (const rawRow of dataRows) {
      const item = parseContentRow(sheetKey, rawRow);
      if (!item) continue;
      item.jlptLevel = sheetKey === 'N2 BS' ? 'N2' : (sheetKey === 'TỪ LÁY' || sheetKey === 'TU LAY' || sheetKey === 'LƯỢNG TỪ' || sheetKey === 'LUONG TU' ? 'N3' : sheetKey);
      if (sheetKey === 'N2 BS' || sheetKey === 'TỪ LÁY' || sheetKey === 'TU LAY' || sheetKey === 'LƯỢNG TỪ' || sheetKey === 'LUONG TU') {
        if (!item.tags) item.tags = 'special';
      }
      rowIndex += 1;
      item.sortOrder = rowIndex;

      const key = `${item.kanji}|${item.kana}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const grammar = grammarData[key];
      if (grammar) {
        item.exampleSentence = grammar.exampleSentence;
        item.exampleTranslation = grammar.exampleTranslation;
        item.grammarPoint = grammar.grammarPoint;
      }
      vocabulary.push(item);
    }
  }

  return vocabulary;
}

function saveOutput(vocabulary) {
  for (const outPath of outPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(vocabulary, null, 2), 'utf8');
    console.log(`Wrote ${vocabulary.length} entries to ${outPath}`);
  }
}

const vocabulary = buildVocabulary();
saveOutput(vocabulary);
