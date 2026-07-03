// ============================================================
// Kanji Database (N5) – Offline lookup
// ============================================================

export interface KanjiEntry {
  hanViet: string;
  on: string;
  kun: string;
  meaning: string;
  radical: string;
  strokes: number;
}

export const KANJI_DB: Record<string, KanjiEntry> = {
  '日': { hanViet: 'NHẬT', on: 'ニチ・ジツ', kun: 'ひ・か', meaning: 'mặt trời, ngày', radical: '日', strokes: 4 },
  '月': { hanViet: 'NGUYỆT', on: 'ゲツ・ガツ', kun: 'つき', meaning: 'mặt trăng, tháng', radical: '月', strokes: 4 },
  '火': { hanViet: 'HỎA', on: 'カ', kun: 'ひ', meaning: 'lửa', radical: '火', strokes: 4 },
  '水': { hanViet: 'THỦY', on: 'スイ', kun: 'みず', meaning: 'nước', radical: '水', strokes: 4 },
  '木': { hanViet: 'MỘC', on: 'モク・ボク', kun: 'き・こ', meaning: 'cây, gỗ', radical: '木', strokes: 4 },
  '金': { hanViet: 'KIM', on: 'キン・コン', kun: 'かね・かな', meaning: 'vàng, tiền', radical: '金', strokes: 8 },
  '土': { hanViet: 'THỔ', on: 'ド・ト', kun: 'つち', meaning: 'đất', radical: '土', strokes: 3 },
  '山': { hanViet: 'SƠN', on: 'サン', kun: 'やま', meaning: 'núi', radical: '山', strokes: 3 },
  '川': { hanViet: 'XUYÊN', on: 'セン', kun: 'かわ', meaning: 'sông', radical: '川', strokes: 3 },
  '田': { hanViet: 'ĐIỀN', on: 'デン', kun: 'た', meaning: 'ruộng lúa', radical: '田', strokes: 5 },
  '人': { hanViet: 'NHÂN', on: 'ジン・ニン', kun: 'ひと', meaning: 'người', radical: '人', strokes: 2 },
  '大': { hanViet: 'ĐẠI', on: 'ダイ・タイ', kun: 'おお', meaning: 'lớn', radical: '大', strokes: 3 },
  '小': { hanViet: 'TIỂU', on: 'ショウ', kun: 'ちい・こ・お', meaning: 'nhỏ', radical: '小', strokes: 3 },
  '中': { hanViet: 'TRUNG', on: 'チュウ', kun: 'なか', meaning: 'giữa, trong', radical: '中', strokes: 4 },
  '上': { hanViet: 'THƯỢNG', on: 'ジョウ・ショウ', kun: 'うえ・うわ・かみ', meaning: 'trên', radical: '一', strokes: 3 },
  '下': { hanViet: 'HẠ', on: 'カ・ゲ', kun: 'した・しも・さ', meaning: 'dưới', radical: '一', strokes: 3 },
  '左': { hanViet: 'TẢ', on: 'サ', kun: 'ひだり', meaning: 'trái', radical: '工', strokes: 5 },
  '右': { hanViet: 'HỮU', on: 'ウ・ユウ', kun: 'みぎ', meaning: 'phải', radical: '口', strokes: 5 },
  '本': { hanViet: 'BẢN', on: 'ホン', kun: 'もと', meaning: 'gốc, sách', radical: '木', strokes: 5 },
  '語': { hanViet: 'NGỮ', on: 'ゴ', kun: 'かた', meaning: 'ngôn ngữ', radical: '言', strokes: 14 },
  '学': { hanViet: 'HỌC', on: 'ガク', kun: 'まな', meaning: 'học', radical: '子', strokes: 8 },
  '生': { hanViet: 'SINH', on: 'セイ・ショウ', kun: 'い・う・お・なま', meaning: 'sống, sinh', radical: '生', strokes: 5 },
  '先': { hanViet: 'TIÊN', on: 'セン', kun: 'さき', meaning: 'trước, trên', radical: '儿', strokes: 6 },
  '電': { hanViet: 'ĐIỆN', on: 'デン', kun: '', meaning: 'điện', radical: '雨', strokes: 13 },
  '車': { hanViet: 'XA', on: 'シャ', kun: 'くるま', meaning: 'xe', radical: '車', strokes: 7 },
  '行': { hanViet: 'HÀNH', on: 'コウ・ギョウ', kun: 'い・ゆ・おこな', meaning: 'đi, hành động', radical: '行', strokes: 6 },
  '食': { hanViet: 'THỰC', on: 'ショク・ジキ', kun: 'た・く', meaning: 'ăn, thức ăn', radical: '食', strokes: 9 },
  '見': { hanViet: 'KIẾN', on: 'ケン', kun: 'み', meaning: 'nhìn thấy', radical: '見', strokes: 7 },
  '聞': { hanViet: 'VĂN', on: 'ブン・モン', kun: 'き・きこ', meaning: 'nghe', radical: '耳', strokes: 14 },
  '書': { hanViet: 'THƯ', on: 'ショ', kun: 'か', meaning: 'viết, sách', radical: '曰', strokes: 10 },
  '読': { hanViet: 'ĐỌC', on: 'ドク・トク', kun: 'よ', meaning: 'đọc', radical: '言', strokes: 14 },
  '話': { hanViet: 'THOẠI', on: 'ワ', kun: 'はな・はなし', meaning: 'nói chuyện', radical: '言', strokes: 13 },
  '来': { hanViet: 'LAI', on: 'ライ', kun: 'く・き', meaning: 'đến', radical: '木', strokes: 7 },
  '帰': { hanViet: 'QUY', on: 'キ', kun: 'かえ', meaning: 'về, trở về', radical: '帚', strokes: 10 },
  '出': { hanViet: 'XUẤT', on: 'シュツ・スイ', kun: 'で・だ', meaning: 'ra, xuất', radical: '凵', strokes: 5 },
  '入': { hanViet: 'NHẬP', on: 'ニュウ', kun: 'い・はい', meaning: 'vào', radical: '入', strokes: 2 },
  '買': { hanViet: 'MÃI', on: 'バイ', kun: 'か', meaning: 'mua', radical: '貝', strokes: 12 },
  '飲': { hanViet: 'ẨM', on: 'イン', kun: 'の', meaning: 'uống', radical: '食', strokes: 12 },
  '起': { hanViet: 'KHỞI', on: 'キ', kun: 'お', meaning: 'dậy, khởi', radical: '走', strokes: 10 },
  '寝': { hanViet: 'TẨM', on: 'シン', kun: 'ね', meaning: 'ngủ', radical: '宀', strokes: 13 },
  '新': { hanViet: 'TÂN', on: 'シン', kun: 'あたら・あら・にい', meaning: 'mới', radical: '斤', strokes: 13 },
  '古': { hanViet: 'CỔ', on: 'コ', kun: 'ふる・ふ', meaning: 'cũ', radical: '口', strokes: 5 },
  '長': { hanViet: 'TRƯỜNG', on: 'チョウ', kun: 'なが', meaning: 'dài, trưởng', radical: '长', strokes: 8 },
  '高': { hanViet: 'CAO', on: 'コウ', kun: 'たか', meaning: 'cao, đắt', radical: '高', strokes: 10 },
  '安': { hanViet: 'AN', on: 'アン', kun: 'やす', meaning: 'rẻ, bình an', radical: '宀', strokes: 6 },
  '白': { hanViet: 'BẠCH', on: 'ハク・ビャク', kun: 'しろ・しら', meaning: 'trắng', radical: '白', strokes: 5 },
  '黒': { hanViet: 'HẮC', on: 'コク', kun: 'くろ', meaning: 'đen', radical: '黒', strokes: 11 },
  '赤': { hanViet: 'XÍCH', on: 'セキ・シャク', kun: 'あか', meaning: 'đỏ', radical: '赤', strokes: 7 },
  '青': { hanViet: 'THANH', on: 'セイ・ショウ', kun: 'あお', meaning: 'xanh', radical: '青', strokes: 8 },
  '花': { hanViet: 'HOA', on: 'カ', kun: 'はな', meaning: 'hoa', radical: '艸', strokes: 7 },
  '魚': { hanViet: 'NGƯ', on: 'ギョ', kun: 'さかな・うお', meaning: 'cá', radical: '魚', strokes: 11 },
  '肉': { hanViet: 'NHỤC', on: 'ニク', kun: '', meaning: 'thịt', radical: '肉', strokes: 6 },
  '茶': { hanViet: 'TRÀ', on: 'チャ・サ', kun: '', meaning: 'trà', radical: '艸', strokes: 9 },
  '酒': { hanViet: 'TỬU', on: 'シュ', kun: 'さけ・さか', meaning: 'rượu', radical: '酉', strokes: 10 },
  '雨': { hanViet: 'VŨ', on: 'ウ', kun: 'あめ・あま', meaning: 'mưa', radical: '雨', strokes: 8 },
  '雪': { hanViet: 'TUYẾT', on: 'セツ', kun: 'ゆき', meaning: 'tuyết', radical: '雨', strokes: 11 },
  '空': { hanViet: 'KHÔNG', on: 'クウ', kun: 'そら・あ・から', meaning: 'bầu trời, trống', radical: '穴', strokes: 8 },
  '海': { hanViet: 'HẢI', on: 'カイ', kun: 'うみ', meaning: 'biển', radical: '水', strokes: 9 },
  '道': { hanViet: 'ĐẠO', on: 'ドウ・トウ', kun: 'みち', meaning: 'đường, đạo', radical: '辵', strokes: 12 },
  '駅': { hanViet: 'TRẠM', on: 'エキ', kun: '', meaning: 'nhà ga', radical: '馬', strokes: 14 },
  '店': { hanViet: 'ĐIẾM', on: 'テン', kun: 'みせ', meaning: 'cửa hàng', radical: '广', strokes: 8 },
  '学校': { hanViet: 'HỌC HIỆU', on: '', kun: '', meaning: 'trường học', radical: '', strokes: 0 },
  '年': { hanViet: 'NIÊN', on: 'ネン', kun: 'とし', meaning: 'năm', radical: '干', strokes: 6 },
  '毎': { hanViet: 'MAI', on: 'マイ', kun: 'ごと', meaning: 'mỗi', radical: '毋', strokes: 6 },
  '何': { hanViet: 'HÀ', on: 'カ', kun: 'なに・なん', meaning: 'cái gì, bao nhiêu', radical: '人', strokes: 7 },
  '国': { hanViet: 'QUỐC', on: 'コク', kun: 'くに', meaning: 'nước, quốc gia', radical: '囗', strokes: 8 },
  '私': { hanViet: 'TƯ', on: 'シ', kun: 'わたし・わたくし', meaning: 'tôi, riêng tư', radical: '禾', strokes: 7 },
  '友': { hanViet: 'HỮU', on: 'ユウ', kun: 'とも', meaning: 'bạn bè', radical: '又', strokes: 4 },
  '父': { hanViet: 'PHỤ', on: 'フ', kun: 'ちち', meaning: 'cha', radical: '父', strokes: 4 },
  '母': { hanViet: 'MẪU', on: 'ボ', kun: 'はは', meaning: 'mẹ', radical: '母', strokes: 5 },
  '子': { hanViet: 'TỬ', on: 'シ・ス', kun: 'こ', meaning: 'con, trẻ em', radical: '子', strokes: 3 },
  '女': { hanViet: 'NỮ', on: 'ジョ・ニョ', kun: 'おんな・め', meaning: 'phụ nữ', radical: '女', strokes: 3 },
  '男': { hanViet: 'NAM', on: 'ダン・ナン', kun: 'おとこ', meaning: 'đàn ông', radical: '田', strokes: 7 },
  '時': { hanViet: 'THỜI', on: 'ジ', kun: 'とき', meaning: 'giờ, thời gian', radical: '日', strokes: 10 },
  '分': { hanViet: 'PHÂN', on: 'フン・ブン', kun: 'わ', meaning: 'phút, phần', radical: '刀', strokes: 4 },
  '半': { hanViet: 'BÁN', on: 'ハン', kun: 'なか', meaning: 'nửa', radical: '十', strokes: 5 },
  '前': { hanViet: 'TIỀN', on: 'ゼン', kun: 'まえ', meaning: 'trước', radical: '刀', strokes: 9 },
  '後': { hanViet: 'HẬU', on: 'ゴ・コウ', kun: 'のち・うし・あと', meaning: 'sau', radical: '彳', strokes: 9 },
  '今': { hanViet: 'KIM', on: 'コン・キン', kun: 'いま', meaning: 'bây giờ, hôm nay', radical: '人', strokes: 4 },
  '明': { hanViet: 'MINH', on: 'メイ・ミョウ', kun: 'あか・あき', meaning: 'sáng', radical: '日', strokes: 8 },
  '疲': { hanViet: 'BÌ', on: 'ヒ', kun: 'つか', meaning: 'mệt', radical: '疒', strokes: 10 },
};

export const getKanjiInfo = (char: string): KanjiEntry | null => {
  return KANJI_DB[char] || null;
};

export const analyzeWord = (word: string) => {
  const kanjiChars = word.split('').filter(c => /[\u4e00-\u9faf]/i.test(c));
  if (kanjiChars.length === 0) return null;
  
  const components = kanjiChars
    .map(k => ({ char: k, info: getKanjiInfo(k) }))
    .filter(x => x.info !== null);
  
  const fullHanViet = components
    .map(c => c.info!.hanViet)
    .join(' ');
    
  return { components, fullHanViet };
};
