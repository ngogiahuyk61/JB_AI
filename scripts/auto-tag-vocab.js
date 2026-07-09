const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'vocabulary', 'all_vocabulary.json');
if (!fs.existsSync(dataPath)) {
  console.error('Vocabulary JSON not found:', dataPath);
  process.exit(1);
}

const vocab = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function isOnomatopoeia(kana) {
  if (!kana) return false;
  // simple heuristic: kana repeating groups like "ぴかぴか", "ころころ"
  return /([\u3041-\u3093]{2,4})\1/.test(kana);
}

function isCounter(kanji, vietnamese) {
  if (!kanji && !vietnamese) return false;
  // heuristic: kanji containing 記号 for counters or vietnamese contains từ chỉ
  // look for common counter kanji
  const counters = ['個', '本', '匹', '枚', '杯', '歳', 'つ', '人'];
  if (kanji && counters.some(c => kanji.includes(c))) return true;
  if (vietnamese && /số|chiếc|cái|quả|con|người|tuổi|cái/.test(vietnamese.toLowerCase())) return true;
  return false;
}

let updated = 0;
for (const item of vocab) {
  const tags = new Set((item.tags || '').split(',').map(s => s.trim()).filter(Boolean));
  if (isOnomatopoeia(item.kana)) tags.add('onomatopoeia');
  if (isCounter(item.kanji, item.vietnamese)) tags.add('counter');

  const newTags = Array.from(tags).join(',') || undefined;
  if (newTags !== item.tags) {
    item.tags = newTags;
    updated++;
  }
}

if (updated > 0) {
  fs.writeFileSync(dataPath, JSON.stringify(vocab, null, 2), 'utf8');
  // Also update frontend copy if exists
  const frontPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'all_vocabulary.json');
  if (fs.existsSync(path.dirname(frontPath))) fs.writeFileSync(frontPath, JSON.stringify(vocab, null, 2), 'utf8');
}

console.log('Auto-tagging done. Updated:', updated);
