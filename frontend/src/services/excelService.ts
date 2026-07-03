// ============================================================
// Excel Parser Service – XLSX (client-side, no backend needed)
// ============================================================
import * as XLSX from 'xlsx';
import type { FlashCard, ExcelSheetData } from '../types';
import { analyzeWord } from '../constants/kanjiDB';

// Nhận diện header row
const HEADER_KEYWORDS = [
  'stt', 'no', 'kanji', 'hán', 'kana', 'hiragana', 'katakana',
  'từ vựng', 'vocabulary', 'nghĩa', 'meaning', 'hán việt',
];

function isHeaderRow(row: unknown[]): boolean {
  return row.some(cell => {
    const s = String(cell || '').toLowerCase().trim();
    return HEADER_KEYWORDS.some(kw => s.includes(kw));
  });
}

function isNumberCell(cell: unknown): boolean {
  return !isNaN(Number(cell)) && String(cell).trim() !== '';
}

// Trích xuất Hán Việt từ từ
function extractHanViet(word: string, providedHv?: string): string {
  if (providedHv && providedHv.trim() && providedHv.trim() !== '-') {
    return providedHv.trim();
  }
  const analysis = analyzeWord(word);
  return analysis?.fullHanViet || '';
}

// Parse 1 worksheet thành danh sách FlashCard
function parseWorksheet(sheetName: string, worksheet: XLSX.WorkSheet): FlashCard[] {
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
  const cards: FlashCard[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || !Array.isArray(row) || row.length < 2) continue;
    if (isHeaderRow(row)) continue;

    // Bỏ qua cột STT đầu tiên nếu là số
    let startIdx = isNumberCell(row[0]) ? 1 : 0;

    const ja = String(row[startIdx] || '').trim();
    if (!ja || ja.length === 0) continue;
    if (isNumberCell(ja)) continue;

    const col1 = row.length > startIdx + 1 ? String(row[startIdx + 1] || '').trim() : '';
    const col2 = row.length > startIdx + 2 ? String(row[startIdx + 2] || '').trim() : '';
    const col3 = row.length > startIdx + 3 ? String(row[startIdx + 3] || '').trim() : '';

    let kana = '', hanViet = '', vietnamese = '';

    // Phát hiện format dựa vào số cột
    if (col3) {
      // 4 cột: Kanji | Kana | HanViet | Nghĩa
      kana = col1;
      hanViet = col2;
      vietnamese = col3;
    } else if (col2) {
      // 3 cột: Kanji | Kana | Nghĩa
      kana = col1;
      vietnamese = col2;
      hanViet = extractHanViet(ja);
    } else if (col1) {
      // 2 cột: Kanji | Nghĩa
      kana = ja;
      vietnamese = col1;
      hanViet = extractHanViet(ja);
    }

    // Validate có kana và nghĩa mới thêm
    if (!vietnamese || vietnamese === ja) continue;

    cards.push({
      id: `${sheetName}_${i}`,
      kanji: ja,
      kana: kana || ja,
      hanViet: extractHanViet(ja, hanViet),
      vietnamese,
    });
  }

  return cards;
}

// Parse toàn bộ file Excel
export async function parseExcelFile(file: File): Promise<ExcelSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const result: ExcelSheetData = {};

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const cards = parseWorksheet(sheetName, worksheet);
          if (cards.length > 0) {
            result[sheetName] = cards;
          }
        });

        if (Object.keys(result).length === 0) {
          reject(new Error('Không tìm thấy dữ liệu hợp lệ trong file Excel'));
          return;
        }

        resolve(result);
      } catch (err) {
        reject(new Error('File không hợp lệ hoặc bị lỗi định dạng'));
      }
    };

    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsBinaryString(file);
  });
}

// LocalStorage helpers
const STORAGE_KEY = 'sensei_excel_data_v2';

export function saveToStorage(data: ExcelSheetData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('LocalStorage full, skipping save');
  }
}

export function loadFromStorage(): ExcelSheetData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const excelService = {
  parseExcelFile,
  saveToStorage,
  loadFromStorage,
  clearStorage,
};
