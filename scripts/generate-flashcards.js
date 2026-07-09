const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, '..', 'data', 'vocabulary', 'flashcards');
fs.mkdirSync(outDir, { recursive: true });

const dataPath = path.join(__dirname, '..', 'data', 'vocabulary', 'all_vocabulary.json');
if (!fs.existsSync(dataPath)) {
  console.error('Vocabulary JSON not found:', dataPath);
  process.exit(1);
}

const vocab = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Generate CSV deck with fields: id,kanji,kana,vietnamese,hanViet,level,pos,tags,exampleSentence,exampleTranslation
const csvPath = path.join(outDir, 'flashcards.csv');
const header = ['id','kanji','kana','vietnamese','hanViet','level','pos','tags','exampleSentence','exampleTranslation'];
const rows = [header.join(',')];

for (let i=0;i<vocab.length;i++){
  const v = vocab[i];
  const id = v.id || `${(v.jlptLevel||'N5').toLowerCase()}_${String(v.sortOrder || i+1).padStart(4,'0')}`;
  const quote = s => '"' + (String(s||'').replace(/"/g,'""')) + '"';
  rows.push([id, v.kanji, v.kana, v.vietnamese, v.hanViet||'', v.jlptLevel||'', v.partOfSpeech||'', v.tags||'', v.exampleSentence||'', v.exampleTranslation||''].map(quote).join(','));
}
fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');

// Generate compact JSON for flashcards
const jsonPath = path.join(outDir, 'flashcards.json');
const compact = vocab.map((v,i)=>({
  id: v.id || `${(v.jlptLevel||'N5').toLowerCase()}_${String(v.sortOrder || i+1).padStart(4,'0')}`,
  kanji: v.kanji,
  kana: v.kana,
  vn: v.vietnamese,
  hv: v.hanViet || '',
  level: v.jlptLevel || '',
  pos: v.partOfSpeech || '',
  tags: v.tags || '',
  ex: v.exampleSentence || '',
  ex_vn: v.exampleTranslation || ''
}));
fs.writeFileSync(jsonPath, JSON.stringify(compact, null, 2), 'utf8');

console.log('Flashcard exports generated:', csvPath, jsonPath);
