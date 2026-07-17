import { useState, useMemo } from 'react';
import { BookOpen, Volume2, Play, Award, Video } from 'lucide-react';
import { speechService } from '../services/speechService';
import '../styles/LessonPage.css';
import tailieuData from '../data/tailieu.json';
import UniversalQuizPage, { type QuizItem } from './UniversalQuizPage';
import JLPTExamView from './JLPTExamView';
import MinnaLessonDashboard from '../components/minna/MinnaLessonDashboard';

interface VerbConjugation {
  kanji: string;
  kana: string;
  meaning: string;
  masu: string;
  te: string;
  ta: string;
  nai: string;
}

interface ParticleItem {
  name: string;
  meaning: string;
  usage: string;
  exampleJp: string;
  exampleVi: string;
}

interface SynonymItem {
  word1: string;
  kana1: string;
  word2: string;
  kana2: string;
  meaning: string;
  difference: string;
}

interface LessonPageProps {
  onNavigate?: (tab: string) => void;
}

export default function LessonPage({ onNavigate }: LessonPageProps = {}) {
  const [activeTab, setActiveTab] = useState<'verbs' | 'particles' | 'synonyms' | 'numbers' | 'time' | 'adverbs' | 'na_adj' | 'shii_adj' | 'i_adj' | 'antonyms' | 'jlpt_exams' | 'minna_tests'>('verbs');
  const [verbGroup, setVerbGroup] = useState<'I' | 'II' | 'III'>('I');
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; items: QuizItem[] } | null>(null);
  const [activeExamLevel, setActiveExamLevel] = useState<number | null>(null);
  const [activeMinnaLesson, setActiveMinnaLesson] = useState<number | null>(null);

  const quizItemsMap = useMemo<Record<string, QuizItem[]>>(() => {
    return {
      adverbs: tailieuData.adverbs
        .filter(i => i.jp && i.vi && i.vi !== i.jp && i.jp.length < 20)
        .map(i => ({ question: i.jp, answer: i.vi })),
      na_adj: tailieuData.naAdjectives
        .filter(i => i.vi)
        .map(i => ({ question: i.kanji || i.kana, answer: i.vi, hint: i.kanji ? i.kana : undefined })),
      shii_adj: tailieuData.shiiAdjectives
        .filter(i => i.vi)
        .map(i => ({ question: i.kanji, answer: i.vi, hint: i.kana || undefined })),
      i_adj: tailieuData.iAdjectives
        .filter(i => i.vi)
        .map(i => ({ question: i.kanji, answer: i.vi, hint: i.kana || undefined })),
      antonyms: tailieuData.antonyms
        .filter(i => i.w1 && i.w2)
        .map(i => ({ question: i.w1, answer: i.w2,
          explanation: i.w1 + ' va ' + i.w2 + ' la cap tu trai nghia' })),
      synonyms: [
        { question: '探す (sa-ga-su)', answer: 'Tim kiem (muon tim)', hint: 'vs 捜す', explanation: '探す: tim vat muon tim (tim viec, tim nha). 捜す: tim nguoi/vat that lac.' },
        { question: '捜す (sa-ga-su)', answer: 'Tim kiem (vat that lac)', hint: 'vs 探す', explanation: '捜す: tim nguoi hoac vat bi that lac. 探す: tim vat muon co.' },
        { question: '始める (ha-ji-me-ru)', answer: 'Bat dau (hang ngay)', hint: 'vs 開始する', explanation: '始める: dung hang ngay. 開始する: trang trong, van viet.' },
        { question: '開始する (kai-shi-su-ru)', answer: 'Bat dau (trang trong)', hint: 'vs 始める', explanation: '開始する: su kien chinh thuc. 始める: doi thuong.' },
        { question: 'もらう (mo-ra-u)', answer: 'Nhan (qua tang)', hint: 'vs 受け取る', explanation: 'もらう: nhan qua biet on. 受け取る: nhan vat ly (buu pham, bien lai).' },
        { question: '受け取る (u-ke-to-ru)', answer: 'Nhan (vat ly)', hint: 'vs もらう', explanation: '受け取る: nhan buu pham, bien lai. もらう: nhan qua biet on.' },
        { question: '言う (i-u)', answer: 'Noi (phat ngon)', hint: 'vs 話す', explanation: '言う: phat ra loi noi. 話す: trao doi qua lai 2 nguoi tro len.' },
        { question: '話す (ha-na-su)', answer: 'Noi (trao doi)', hint: 'vs 言う', explanation: '話す: thao luan, trao doi. 言う: phat ngon.' },
      ],
      numbers: [
        { question: '一 / いち', answer: '1', explanation: 'Mot (ichi)' },
        { question: '二 / に', answer: '2', explanation: 'Hai (ni)' },
        { question: '三 / さん', answer: '3', explanation: 'Ba (san)' },
        { question: '四 / よん・し', answer: '4', explanation: 'Bon (yon/shi)' },
        { question: '五 / ご', answer: '5', explanation: 'Nam (go)' },
        { question: '六 / ろく', answer: '6', explanation: 'Sau (roku)' },
        { question: '七 / なな・しち', answer: '7', explanation: 'Bay (nana/shichi)' },
        { question: '八 / はち', answer: '8', explanation: 'Tam (hachi)' },
        { question: '九 / きゅう・く', answer: '9', explanation: 'Chin (kyu/ku)' },
        { question: '十 / じゅう', answer: '10', explanation: 'Muoi (juu)' },
        { question: '百 / ひゃく', answer: '100', explanation: 'Mot tram (hyaku)' },
        { question: '千 / せん', answer: '1000', explanation: 'Mot nghin (sen)' },
        { question: '枚 (まい)', answer: 'Dem vat mong (ao, giay, dia)', explanation: '枚 (mai): dem vat mong phang' },
        { question: '台 (だい)', answer: 'Dem may moc, xe co', explanation: '台 (dai): dem may moc, xe' },
        { question: '本 (ほん)', answer: 'Dem vat thon dai (but, chai, o)', explanation: '本 (hon/pon/bon): dem vat thon dai' },
        { question: '冊 (さつ)', answer: 'Dem sach, vo, tap chi', explanation: '冊 (satsu): dem sach vo' },
        { question: '匹 (ひき)', answer: 'Dem con vat nho (cho, meo, ca)', explanation: '匹 (hiki/piki/biki): dem dong vat nho' },
        { question: '杯 (はい)', answer: 'Dem chen, ly, bat', explanation: '杯 (hai/pai/bai): dem chen ly bat' },
        { question: 'ひとつ (一つ)', answer: '1 cai (dem chung)', explanation: 'Dem do vat chung' },
        { question: 'ふたつ (二つ)', answer: '2 cai (dem chung)', explanation: 'Dem do vat chung' },
        { question: 'みっつ (三つ)', answer: '3 cai (dem chung)', explanation: 'Dem do vat chung' },
        { question: 'よっつ (四つ)', answer: '4 cai (dem chung)', explanation: 'Dem do vat chung' },
        { question: 'いつつ (五つ)', answer: '5 cai (dem chung)', explanation: 'Dem do vat chung' },
      ],
      time: [
        { question: '月曜日 (げつようび)', answer: 'Thu 2', explanation: 'Getsu-yo-bi = Thu Hai' },
        { question: '火曜日 (かようび)', answer: 'Thu 3', explanation: 'Ka-yo-bi = Thu Ba' },
        { question: '水曜日 (すいようび)', answer: 'Thu 4', explanation: 'Sui-yo-bi = Thu Tu' },
        { question: '木曜日 (もくようび)', answer: 'Thu 5', explanation: 'Moku-yo-bi = Thu Nam' },
        { question: '金曜日 (きんようび)', answer: 'Thu 6', explanation: 'Kin-yo-bi = Thu Sau' },
        { question: '土曜日 (どようび)', answer: 'Thu 7', explanation: 'Do-yo-bi = Thu Bay' },
        { question: '日曜日 (にちようび)', answer: 'Chu nhat', explanation: 'Nichi-yo-bi = Chu Nhat' },
        { question: 'ついたち (一日)', answer: 'Ngay 1 trong thang', explanation: 'Tsuitachi - bat quy tac' },
        { question: 'ふつか (二日)', answer: 'Ngay 2 trong thang', explanation: 'Futsuka - bat quy tac' },
        { question: 'みっか (三日)', answer: 'Ngay 3 trong thang', explanation: 'Mikka - bat quy tac' },
        { question: 'よっか (四日)', answer: 'Ngay 4 trong thang', explanation: 'Yokka - bat quy tac' },
        { question: 'いつか (五日)', answer: 'Ngay 5 trong thang', explanation: 'Itsuka - bat quy tac' },
        { question: 'はつか (二十日)', answer: 'Ngay 20 trong thang', explanation: 'Hatsuka - bat quy tac' },
        { question: '〜時間 (じかん)', answer: 'Tieng dong ho (khoang thoi gian)', explanation: 'jikan: khoang thoi gian tinh bang gio' },
        { question: '〜週間 (しゅうかん)', answer: 'Tuan le (khoang thoi gian)', explanation: 'shu-kan: khoang thoi gian tinh bang tuan' },
        { question: '〜か月 (かげつ)', answer: 'Thang (khoang thoi gian)', explanation: 'ka-getsu: khoang thoi gian tinh bang thang' },
        { question: '何時 (なんじ)', answer: 'May gio?', explanation: 'Nan-ji: hoi ve gio' },
        { question: '何分 (なんぷん)', answer: 'May phut?', explanation: 'Nan-pun: hoi ve phut' },
        { question: '何曜日 (なんようび)', answer: 'Thu may?', explanation: 'Nan-yo-bi: hoi ve thu trong tuan' },
      ],
    };
  }, []);

  const speak = async (text: string) => {
    try {
      await speechService.speakJapanese(text);
    } finally {
      // Done
    }
  };

  // ── DỮ LIỆU ĐỘNG TỪ (TỪ PDF) ──
  const groupIVerbs: VerbConjugation[] = [
    { kanji: '待つ', kana: 'まつ', meaning: 'Chờ, đợi', masu: 'まちます', te: 'まって', ta: 'まった', nai: 'またない' },
    { kanji: '有る', kana: 'ある', meaning: 'Có (vật)', masu: 'あります', te: 'あって', ta: 'あった', nai: 'ない' },
    { kanji: '持つ', kana: 'もつ', meaning: 'Cầm, mang', masu: 'もちます', te: 'もって', ta: 'もった', nai: 'もたない' },
    { kanji: '立つ', kana: 'たつ', meaning: 'Đứng', masu: 'たちます', te: 'たって', ta: 'たった', nai: 'たたない' },
    { kanji: '勝つ', kana: 'かつ', meaning: 'Thắng', masu: 'かちます', te: 'かって', ta: 'かった', nai: 'かたない' },
    { kanji: '取る・撮る', kana: 'とる', meaning: 'Lấy, chụp ảnh', masu: 'とります', te: 'とって', ta: 'とった', nai: 'とらない' },
    { kanji: '降る', kana: 'ふる', meaning: 'Rơi (mưa, tuyết)', masu: 'ふります', te: 'ふante/ふって', ta: 'ふった', nai: 'ふらない' },
    { kanji: '住む', kana: 'すむ', meaning: 'Sống, trú ngụ', masu: 'すみます', te: 'すんで', ta: 'すんだ', nai: 'すまない' },
    { kanji: 'なる', kana: 'なる', meaning: 'Trở nên, trở thành', masu: 'なります', te: 'なって', ta: 'なった', nai: 'ならない' },
    { kanji: '入る', kana: 'はいる', meaning: 'Đi vào', masu: 'はいります', te: 'はいって', ta: 'はいった', nai: 'はいらない' },
    { kanji: '飲む', kana: 'のむ', meaning: 'Uống', masu: 'のみます', te: 'のんで', ta: 'のんだ', nai: 'のまない' },
    { kanji: '出す', kana: 'だす', meaning: 'Nộp, lấy ra', masu: 'だします', te: 'だして', ta: 'だした', nai: 'ださない' },
    { kanji: '会う', kana: 'あう', meaning: 'Gặp gỡ (ai đó)', masu: 'あいます', te: 'あって', ta: 'あった', nai: 'あわない' },
    { kanji: '売る', kana: 'うる', meaning: 'Bán', masu: 'うります', te: 'うって', ta: 'うった', nai: 'うらない' },
    { kanji: '脱ぐ', kana: 'ぬぐ', meaning: 'Cởi (đồ, giày)', masu: 'ぬぎます', te: 'ぬいで', ta: 'ぬいだ', nai: 'ぬがない' },
    { kanji: '帰る', kana: 'かえる', meaning: 'Trở về', masu: 'かえります', te: 'かえって', ta: 'かえった', nai: 'kạeranai/かえらない' },
    { kanji: '返す', kana: 'かえす', meaning: 'Trả lại', masu: 'かえします', te: 'かえして', ta: 'かえした', nai: 'かえさない' },
    { kanji: '切る', kana: 'きる', meaning: 'Cắt', masu: 'きります', te: 'きって', ta: 'きった', nai: 'きらない' },
    { kanji: '履く', kana: 'はく', meaning: 'Mang, xỏ (giày, quần)', masu: 'はきます', te: 'はいて', ta: 'はいた', nai: 'はかない' },
    { kanji: '要る', kana: 'いる', meaning: 'Cần', masu: 'いります', te: 'いって', ta: 'いった', nai: 'いらない' },
    { kanji: '行く', kana: 'いく', meaning: 'Đi', masu: 'いきます', te: 'いって', ta: 'いった', nai: 'いかない' },
    { kanji: 'かかる', kana: 'かかる', meaning: 'Tốn (thời gian, tiền)', masu: 'かかります', te: 'かかって', ta: 'かかった', nai: 'かからない' },
    { kanji: '遊ぶ', kana: 'あそぶ', meaning: 'Chơi, nô đùa', masu: 'あそびます', te: 'あそんで', ta: 'あそんだ', nai: 'あそばない' },
    { kanji: '泳ぐ', kana: 'およぐ', meaning: 'Bơi lội', masu: 'およぎます', te: 'およいde/およいde', ta: 'およいだ', nai: 'およがない' },
    { kanji: '動く', kana: 'うごく', meaning: 'Chuyển động, chạy (máy)', masu: 'うごきます', te: 'うごいて', ta: 'うごいた', nai: 'うごかない' },
    { kanji: '消す', kana: 'けす', meaning: 'Tắt, xóa', masu: 'けします', te: 'けして', ta: 'けした', nai: 'けさない' },
    { kanji: '呼ぶ', kana: 'よぶ', meaning: 'Gọi, vời', masu: 'よびます', te: 'よんで', ta: 'よんだ', nai: 'よばない' },
    { kanji: '曲がる', kana: 'まがる', meaning: 'Rẽ, quẹo', masu: 'まがります', te: 'まagって/まがって', ta: 'まagった/まがった', nai: 'まがらない' },
    { kanji: '急ぐ', kana: 'いそぐ', meaning: 'Vội vã, gấp rút', masu: 'いそぎます', te: 'いそいで', ta: 'いそいだ', nai: 'いそがない' },
    { kanji: '話す', kana: 'はなす', meaning: 'Nói chuyện', masu: 'はなします', te: 'はなして', ta: 'はなした', nai: 'はなさない' },
    { kanji: '手伝う', kana: 'てつだう', meaning: 'Giúp đỡ', masu: 'てつだいます', te: 'てつだって', ta: 'てつだった', nai: 'てつだわない' },
    { kanji: '置く', kana: 'おく', meaning: 'Đặt, để', masu: 'おきます', te: 'おいて', ta: 'おいた', nai: 'おかない' },
    { kanji: '知る', kana: 'しる', meaning: 'Biết', masu: 'しります', te: 'しって', ta: 'しった', nai: 'しらない' },
    { kanji: '使う', kana: 'つかう', meaning: 'Sử dụng, dùng', masu: 'つかいます', te: 'つかって', ta: 'つかった', nai: 'つかわない' },
    { kanji: '座る', kana: 'すわる', meaning: 'Ngồi', masu: 'すわります', te: 'すわって', ta: 'すわった', nai: 'すわらない' },
    { kanji: '作る', kana: 'つくる', meaning: 'Làm, tạo ra', masu: 'つくります', te: 'つくって', ta: 'つくった', nai: 'つくらない' },
    { kanji: '押す', kana: 'おす', meaning: 'Nhấn, ấn, đẩy', masu: 'おします', te: 'おして', ta: 'おした', nai: 'おさない' },
    { kanji: '乗る', kana: 'のる', meaning: 'Lên (xe, tàu)', masu: '乗ります/のります', te: 'のって', ta: 'のった', nai: 'のらない' },
    { kanji: '無くす', kana: 'なくす', meaning: 'Đánh mất, làm mất', masu: 'なくします', te: 'なくして', ta: 'なくした', nai: 'なくさない' },
    { kanji: '引く', kana: 'ひく', meaning: 'Kéo, chăng', masu: 'ひきます', te: 'ひいて', ta: 'ひいた', nai: 'ひかない' },
    { kanji: '止まる', kana: 'とまる', meaning: 'Dừng lại, trú lại', masu: 'とまります', te: 'とまって', ta: 'とまった', nai: 'とまらない' },
    { kanji: '登る', kana: 'のぼる', meaning: 'Leo (núi, cầu thang)', masu: 'のぼります', te: 'のぼって', ta: 'のぼった', nai: 'のぼらない' },
    { kanji: '貸す', kana: 'かす', meaning: 'Cho mượn', masu: 'かします', te: 'かして', ta: 'かした', nai: 'かさない' },
    { kanji: '言う', kana: 'いう', meaning: 'Nói', masu: 'いいます', te: 'いって', ta: 'いった', nai: 'いわない' }
  ];

  const groupIIVerbs: VerbConjugation[] = [
    { kanji: '食べる', kana: 'たべる', meaning: 'Ăn', masu: 'たべます', te: 'たべて', ta: 'たべた', nai: 'たべない' },
    { kanji: '止める', kana: 'to-meru/とめる', meaning: 'Dừng, cản', masu: 'とめます', te: 'とめて', ta: 'とめた', nai: 'とめない' },
    { kanji: '閉める', kana: 'しめる', meaning: 'Đóng (cửa)', masu: 'しめます', te: 'しめて', ta: 'しめた', nai: 'しめない' },
    { kanji: '見せる', kana: 'みせる', meaning: 'Cho xem, trình bày', masu: 'みせます', te: 'みせて', ta: 'みせた', nai: 'みせない' },
    { kanji: '着る', kana: 'きる', meaning: 'Mặc (áo)', masu: 'きます', te: 'きて', ta: 'きた', nai: 'きない' },
    { kanji: '入れる', kana: 'いれる', meaning: 'Bỏ vào, đưa vào', masu: 'いれます', te: 'いれて', ta: 'いれた', nai: 'いれない' },
    { kanji: '降りる', kana: 'おりる', meaning: 'Xuống (xe, tàu)', masu: 'おります', te: 'おりて', ta: 'おりた', nai: 'おりない' },
    { kanji: '見る', kana: 'みる', meaning: 'Nhìn, xem, ngắm', masu: 'みます', te: 'みて', ta: 'みた', nai: 'みない' },
    { kanji: '借りる', kana: 'かりる', meaning: 'Mượn, vay', masu: 'かります', te: 'かりて', ta: 'かりた', nai: 'かりない' },
    { kanji: '遅れる', kana: 'おくれる', meaning: 'Trễ, muộn', masu: 'おくれます', te: 'おnetwork/おくれて', ta: 'おくれた', nai: 'おくれない' }
  ];

  const groupIIIVerbs: VerbConjugation[] = [
    { kanji: '来る', kana: 'くる', meaning: 'Đến, lại', masu: 'きます', te: 'きて', ta: 'きた', nai: 'こない' },
    { kanji: '持って来る', kana: 'もってくる', meaning: 'Mang đến', masu: 'もってきます', te: 'もってきて', ta: 'もってきた', nai: 'もってこない' },
    { kanji: 'する', kana: 'する', meaning: 'Làm, thực hiện', masu: 'します', te: 'して', ta: 'した', nai: 'しない' },
    { kanji: '連絡する', kana: 'れんらくする', meaning: 'Liên lạc', masu: 'れんらくします', te: 'れんらくして', ta: 'れんらくした', nai: 'れんらくしない' },
    { kanji: '早退する', kana: 'そうたいする', meaning: 'Về sớm', masu: 'そうたいします', te: 'そうたいして', ta: 'そうたいした', nai: 'そうたいしない' }
  ];

  // ── DỮ LIỆU TRỢ TỪ (PARTICLES) ──
  const particles: ParticleItem[] = [
    { name: 'は (wa)', meaning: 'Thì, là', usage: 'Chỉ chủ ngữ chính, tiêu đề câu nói.', exampleJp: '私は学生です。', exampleVi: 'Tôi là học sinh.' },
    { name: 'が (ga)', meaning: 'Chủ ngữ mới, nhấn mạnh chủ ngữ', usage: 'Nhấn mạnh chủ ngữ đứng trước, hoặc đi với tính từ, tự động từ.', exampleJp: '猫が好きです。', exampleVi: 'Tôi thích mèo.' },
    { name: 'を (o)', meaning: 'Tác động trực tiếp', usage: 'Đứng sau tân ngữ chỉ đối tượng bị tác động bởi ngoại động từ.', exampleJp: '水を飲みます。', exampleVi: 'Uống nước.' },
    { name: 'ni (に)', meaning: 'Tại, vào lúc, hướng tới', usage: 'Chỉ thời điểm cụ thể, địa điểm tồn tại, đích đến của hành động.', exampleJp: '七時に起きます。/日本に行きます。', exampleVi: 'Thức dậy lúc 7 giờ. / Đi Nhật Bản.' },
    { name: 'he (へ)', meaning: 'Hướng tới', usage: 'Chỉ phương hướng di chuyển (nhấn mạnh hành trình đi lại hơn trợ từ に).', exampleJp: '京都へ行きます。', exampleVi: 'Đi hướng về Kyoto.' },
    { name: 'de (で)', meaning: 'Tại, bằng', usage: 'Chỉ nơi diễn ra hành động hoặc công cụ, phương tiện thực hiện.', exampleJp: '図書館で勉強します。/電車で行きます。', exampleVi: 'Học ở thư viện. / Đi bằng tàu điện.' },
    { name: 'to (と)', meaning: 'Với, và', usage: 'Nối các danh từ, hoặc chỉ đối tượng cùng thực hiện hành động.', exampleJp: '友達と話します。', exampleVi: 'Nói chuyện với bạn bè.' },
    { name: 'から (kara)', meaning: 'Từ, vì', usage: 'Chỉ điểm xuất phát thời gian/không gian, hoặc chỉ nguyên nhân.', exampleJp: 'ベトナムから来ました。', exampleVi: 'Tôi đến từ Việt Nam.' },
    { name: 'まで (made)', meaning: 'Đến, cho đến', usage: 'Chỉ giới hạn cuối cùng của thời gian hoặc không gian.', exampleJp: '九時から五時まで働きます。', exampleVi: 'Làm việc từ 9 giờ đến 5 giờ.' },
    { name: 'も (mo)', meaning: 'Cũng', usage: 'Thay thế cho は, が, を để chỉ sự đồng nhất.', exampleJp: '私も学生です。', exampleVi: 'Tôi cũng là học sinh.' },
    { name: 'の (no)', meaning: 'Của', usage: 'Nối hai danh từ chỉ mối quan hệ sở hữu, nguồn gốc, tính chất.', exampleJp: '日本語の本。', exampleVi: 'Sách tiếng Nhật.' }
  ];

  // ── DỮ LIỆU TỪ ĐỒNG NGHĨA (SYNONYMS) ──
  const synonyms: SynonymItem[] = [
    { word1: '探す', kana1: 'さがす', word2: '捜す', kana2: 'さがす', meaning: 'Tìm kiếm', difference: '「探す」 tìm vật dụng mong muốn (tìm việc, tìm nhà). 「捜す」 tìm người hoặc vật bị thất lạc (tìm người mất tích, ví tiền bị rơi).' },
    { word1: '始める', kana1: 'はじめる', word2: '開始する', kana2: 'かいしする', meaning: 'Bắt đầu', difference: '「始める」 dùng cho đời sống hàng ngày, thân mật. 「開始する」 dùng trang trọng, văn viết hoặc các sự kiện chính thức.' },
    { word1: 'もらう', kana1: 'もらう', word2: '受け取る', kana2: 'うke-to-ru/うけとる', meaning: 'Nhận', difference: '「もらう」 chỉ việc được nhận quà tặng, mang tính biết ơn. 「受け取る」 mang tính vật lý (nhận bưu phẩm, nhận biên lai).' },
    { word1: '言う', kana1: 'いう', word2: '話す', kana2: 'はなす', meaning: 'Nói', difference: '「言う」 là phát ra lời nói, phát ngôn. 「話す」 là thảo luận, trao đổi qua lại giữa 2 người trở lên.' },
    { word1: '教える', kana1: 'おしえる', word2: '指導する', kana2: 'しどうする', meaning: 'Dạy học, hướng dẫn', difference: '「教える」 chỉ việc truyền đạt kiến thức thông thường. 「指導する」 chỉ việc dẫn dắt chuyên môn, mang tính định hướng cao cấp.' }
  ];

  const currentVerbs = verbGroup === 'I' ? groupIVerbs : verbGroup === 'II' ? groupIIVerbs : groupIIIVerbs;

  if (activeExamLevel !== null) {
    return (
      <JLPTExamView
        level={activeExamLevel}
        onBack={() => setActiveExamLevel(null)}
      />
    );
  }

  if (activeMinnaLesson !== null) {
    return (
      <MinnaLessonDashboard
        lesson={activeMinnaLesson}
        onBack={() => setActiveMinnaLesson(null)}
      />
    );
  }

  if (activeQuiz) {
    return (
      <UniversalQuizPage
        title={activeQuiz.title}
        items={activeQuiz.items}
        onBack={() => setActiveQuiz(null)}
      />
    );
  }

  return (
    <div style={{ padding: '24px 30px', background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Học Liệu Bài Học</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0 0' }}>Học ngữ pháp, trợ từ và cách chia động từ trực quan tương tác</p>
          </div>
        </div>
        
        <button
          onClick={() => window.open('https://drive.google.com/drive/folders/1b-xqLdbkbVOEFcM-Y4KLBNYIxN4oRUBX', '_blank')}
          style={{
            marginLeft: 'auto',
            padding: '10px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            background: 'linear-gradient(to right, #ef4444, #f97316)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            transition: 'all 200ms ease',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <Video size={18} />
          Học Video
        </button>
      </div>

      {/* Tabs Control */}
      <div style={{ 
        display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 12, width: '100%', marginBottom: 24,
        overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        <button
          onClick={() => setActiveTab('verbs')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'verbs' ? 'white' : 'transparent',
            color: activeTab === 'verbs' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'verbs' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Động từ & Chia thể
        </button>
        <button
          onClick={() => setActiveTab('particles')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'particles' ? 'white' : 'transparent',
            color: activeTab === 'particles' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'particles' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Học Trợ Từ
        </button>
        <button
          onClick={() => setActiveTab('synonyms')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'synonyms' ? 'white' : 'transparent',
            color: activeTab === 'synonyms' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'synonyms' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Từ Đồng Nghĩa
        </button>
        <button
          onClick={() => setActiveTab('numbers')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'numbers' ? 'white' : 'transparent',
            color: activeTab === 'numbers' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'numbers' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Số Đếm & Từ Đếm
        </button>
        <button
          onClick={() => setActiveTab('time')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'time' ? 'white' : 'transparent',
            color: activeTab === 'time' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'time' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Thời Gian
        </button>
        <button
          onClick={() => setActiveTab('adverbs')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'adverbs' ? 'white' : 'transparent',
            color: activeTab === 'adverbs' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'adverbs' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Phó Từ
        </button>
        <button
          onClick={() => setActiveTab('na_adj')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'na_adj' ? 'white' : 'transparent',
            color: activeTab === 'na_adj' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'na_adj' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Tính Từ な
        </button>
        <button
          onClick={() => setActiveTab('shii_adj')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'shii_adj' ? 'white' : 'transparent',
            color: activeTab === 'shii_adj' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'shii_adj' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Tính Từ ~しい
        </button>
        <button
          onClick={() => setActiveTab('i_adj')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'i_adj' ? 'white' : 'transparent',
            color: activeTab === 'i_adj' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'i_adj' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Tính Từ ~い
        </button>
        <button
          onClick={() => setActiveTab('antonyms')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'antonyms' ? 'white' : 'transparent',
            color: activeTab === 'antonyms' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'antonyms' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          Từ Trái Nghĩa
        </button>
        <button
          onClick={() => setActiveTab('jlpt_exams')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'jlpt_exams' ? 'white' : 'transparent',
            color: activeTab === 'jlpt_exams' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'jlpt_exams' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          🎓 Đề Thi JLPT
        </button>
        <button
          onClick={() => setActiveTab('minna_tests')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'minna_tests' ? 'white' : 'transparent',
            color: activeTab === 'minna_tests' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'minna_tests' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease', whiteSpace: 'nowrap'
          }}
        >
          🎓 Đề Thi Minna Bài Học
        </button>
        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('verbquiz');
            }
          }}
          className="verb-quiz-nav-btn"
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
            transition: 'all 150ms ease',
            marginLeft: 'auto'
          }}
        >
          Học Chia Động Từ (Test)
        </button>
      </div>

      {/* Tab: VERB CONJUGATION */}
      {activeTab === 'verbs' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Bảng chia nhóm Động từ (I, II, III)</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>Bấm vào chữ tiếng Nhật để nghe phát âm thể tương ứng</p>
            </div>
            {/* Group Switcher */}
            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
              {(['I', 'II', 'III'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setVerbGroup(g)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: verbGroup === g ? '#4f46e5' : 'transparent',
                    color: verbGroup === g ? 'white' : '#475569',
                    transition: 'all 100ms ease'
                  }}
                >
                  Nhóm {g}
                </button>
              ))}
            </div>
          </div>

          {/* Verb Card Container */}
          <div className="verb-accordion-list">
            {currentVerbs.map((v, idx) => {
              return (
                <div key={idx} className="verb-accordion-item expanded">
                  {/* Header */}
                  <div className="verb-accordion-header" style={{ cursor: 'default' }}>
                    <div className="verb-accordion-header-left">
                      <div className="verb-accordion-kanji">
                        <span className="text-ja">{v.kanji}</span>
                      </div>
                      <div className="verb-accordion-meaning">{v.meaning}</div>
                    </div>
                  </div>

                  {/* Content (Always Visible) */}
                  <div className="verb-accordion-content" style={{ paddingTop: 10 }}>
                      <div className="verb-form-box">
                        <div className="verb-form-info">
                          <span className="verb-form-label" style={{ color: '#64748b' }}>Từ điển</span>
                          <span className="verb-form-value text-ja form-jisho">{v.kanji}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speak(v.kanji); }} className="verb-play-btn btn-jisho">
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>

                      <div className="verb-form-box">
                        <div className="verb-form-info">
                          <span className="verb-form-label" style={{ color: '#64748b' }}>Thể ます</span>
                          <span className="verb-form-value text-ja form-masu">{v.masu}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speak(v.masu); }} className="verb-play-btn btn-masu">
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>

                      <div className="verb-form-box">
                        <div className="verb-form-info">
                          <span className="verb-form-label" style={{ color: '#64748b' }}>Thể て</span>
                          <span className="verb-form-value text-ja form-te">{v.te}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speak(v.te); }} className="verb-play-btn btn-te">
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>

                      <div className="verb-form-box">
                        <div className="verb-form-info">
                          <span className="verb-form-label" style={{ color: '#64748b' }}>Thể た</span>
                          <span className="verb-form-value text-ja form-ta">{v.ta}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speak(v.ta); }} className="verb-play-btn btn-ta">
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>

                      <div className="verb-form-box">
                        <div className="verb-form-info">
                          <span className="verb-form-label" style={{ color: '#64748b' }}>Thể ない</span>
                          <span className="verb-form-value text-ja form-nai">{v.nai}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speak(v.nai); }} className="verb-play-btn btn-nai">
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: PARTICLES */}
      {activeTab === 'particles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (onNavigate) onNavigate('particlequiz');
              }}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #10b981, #059669)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 200ms ease',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Test Trợ Từ (JLPT N5)
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {particles.map((p, idx) => (
            <div key={idx} style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 18, transition: 'transform 200ms ease', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }} className="hover-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="text-ja" style={{ fontSize: 20, fontWeight: 900, color: '#4f46e5', padding: '4px 12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #dcfce7' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{p.meaning}</span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 14, lineHeight: 1.4 }}>
                <strong>Cách dùng:</strong> {p.usage}
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className="text-ja" style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.exampleJp}</span>
                  <button onClick={() => speak(p.exampleJp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#6366f1' }}>
                    <Volume2 size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{p.exampleVi}</div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Tab: SYNONYMS */}
      {activeTab === 'synonyms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Từ Đồng Nghĩa', items: quizItemsMap.synonyms })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #f59e0b, #ef4444)',
                color: 'white', boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          {synonyms.map((s, idx) => (
            <div key={idx} style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => speak(s.word1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="text-ja" style={{ fontSize: 16, fontWeight: 900, color: '#ef4444' }}>{s.word1}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>({s.kana1})</span>
                    <Volume2 size={12} style={{ color: '#ef4444', opacity: 0.5 }} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>vs</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => speak(s.word2)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="text-ja" style={{ fontSize: 16, fontWeight: 900, color: '#3b82f6' }}>{s.word2}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>({s.kana2})</span>
                    <Volume2 size={12} style={{ color: '#3b82f6', opacity: 0.5 }} />
                  </button>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', marginLeft: 'auto' }}>
                  Nghĩa chung: {s.meaning}
                </span>
              </div>
              <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#9d174d', lineHeight: 1.5 }}>
                <strong>Phân biệt cách dùng:</strong> {s.difference}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS Hovers */}
      <style>{`
        .hover-row:hover {
          background-color: #f8fafc !important;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.04) !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>

      {/* Tab: NUMBERS & COUNTERS */}
      {activeTab === 'numbers' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Số Đếm & Từ Đếm (Counters)</h2>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Số Đếm & Từ Đếm', items: quizItemsMap.numbers })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                color: 'white', boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Nhấn vào chữ tiếng Nhật để nghe phát âm</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Cột 1: Số đếm cơ bản */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Số đếm cơ bản (1-10)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {[
                    { num: 1, ja: 'いち', kanji: '一' }, { num: 2, ja: 'に', kanji: '二' },
                    { num: 3, ja: 'さん', kanji: '三' }, { num: 4, ja: 'よん/し', kanji: '四' },
                    { num: 5, ja: 'ご', kanji: '五' }, { num: 6, ja: 'ろく', kanji: '六' },
                    { num: 7, ja: 'なな/しち', kanji: '七' }, { num: 8, ja: 'はち', kanji: '八' },
                    { num: 9, ja: 'きゅう/く', kanji: '九' }, { num: 10, ja: 'じゅう', kanji: '十' }
                  ].map(n => (
                    <tr key={n.num} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: '#64748b' }}>{n.num}</td>
                      <td style={{ padding: '8px 4px', color: '#0f172a' }}>{n.kanji}</td>
                      <td style={{ padding: '8px 4px' }}>
                        <span style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 600 }} onClick={() => speak(n.ja)}>{n.ja}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cột 2: Đếm đồ vật chung */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Đếm đồ vật chung (ひとつ)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {[
                    { num: 1, ja: 'ひとつ', kanji: '一つ' }, { num: 2, ja: 'ふたつ', kanji: '二つ' },
                    { num: 3, ja: 'みっつ', kanji: '三つ' }, { num: 4, ja: 'よっつ', kanji: '四つ' },
                    { num: 5, ja: 'いつつ', kanji: '五つ' }, { num: 6, ja: 'むっつ', kanji: '六つ' },
                    { num: 7, ja: 'ななつ', kanji: '七つ' }, { num: 8, ja: 'やっつ', kanji: '八つ' },
                    { num: 9, ja: 'ここのつ', kanji: '九つ' }, { num: 10, ja: 'とお', kanji: '十' },
                    { num: '?', ja: 'いくつ', kanji: 'Mấy cái?' }
                  ].map(n => (
                    <tr key={n.num} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: '#64748b' }}>{n.num}</td>
                      <td style={{ padding: '8px 4px', color: '#0f172a' }}>{n.kanji}</td>
                      <td style={{ padding: '8px 4px' }}>
                        <span style={{ cursor: 'pointer', color: '#10b981', fontWeight: 600 }} onClick={() => speak(n.ja)}>{n.ja}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cột 3: Trợ từ đếm */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Trợ từ đếm phổ biến</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { counter: '枚 (まい)', use: 'Vật mỏng (áo, giấy, đĩa)', ex: 'シャツ２枚 (2 cái áo)' },
                  { counter: '台 (だい)', use: 'Máy móc, xe cộ', ex: '車１台 (1 chiếc xe)' },
                  { counter: '本 (ほん/ぽん/ぼん)', use: 'Vật thon dài (bút, chai, ô)', ex: 'ペン３本 (3 cái bút)' },
                  { counter: '匹 (ひき/ぴき/びき)', use: 'Con vật nhỏ (chó, mèo, cá)', ex: '犬１匹 (1 con chó)' },
                  { counter: '冊 (さつ)', use: 'Sách, vở, tạp chí', ex: '本４冊 (4 cuốn sách)' },
                  { counter: '杯 (はい/ぱい/ばい)', use: 'Chén, ly, bát', ex: '水１杯 (1 ly nước)' },
                  { counter: '人 (にん)', use: 'Người (1 người: ひとり, 2 người: ふたり)', ex: '学生３人 (3 học sinh)' }
                ].map((c, i) => (
                  <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid #8b5cf6' }}>
                    <div style={{ fontWeight: 700, color: '#8b5cf6', marginBottom: 4 }}>{c.counter}</div>
                    <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>{c.use}</div>
                    <div style={{ fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>VD:</span>
                      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => speak(c.ex.split(' ')[0])}>{c.ex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: TIME & DATES */}
      {activeTab === 'time' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Thời Gian (Giờ, Thứ, Ngày, Tháng)</h2>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Thời Gian & Ngày Tháng', items: quizItemsMap.time })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #f97316, #eab308)',
                color: 'white', boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Lưu ý các trường hợp bất quy tắc có màu đỏ</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            
            {/* Cột: Giờ và Phút */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Giờ (〜時) & Phút (〜分)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>Đếm Giờ (時 - じ)</div>
                  <div>1時 (いちじ), 2時 (にじ), <span style={{color: '#ef4444', fontWeight: 'bold'}}>4時 (よじ)</span>, 5時 (ごじ), 6時 (ろくじ), <span style={{color: '#ef4444', fontWeight: 'bold'}}>7時 (しちじ)</span>, 8時 (はちじ), <span style={{color: '#ef4444', fontWeight: 'bold'}}>9時 (くじ)</span>...</div>
                  <div style={{ marginTop: 4, fontStyle: 'italic', color: '#64748b' }}>Hỏi: 何時 (なんじ) - Mấy giờ?</div>
                </div>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Đếm Phút (分 - ふん/ぷん)</div>
                  <div>1分 (いっぷん), 2分 (にふん), 3分 (さんぷん), 4分 (よんぷん), 5分 (ごふん), 6分 (ろっぷん), 7分 (ななふん), 8分 (はっぷん), 9分 (きゅうふん), 10分 (じゅっぷん)</div>
                  <div style={{ marginTop: 4, fontStyle: 'italic', color: '#64748b' }}>Hỏi: 何分 (なんぷん) - Mấy phút?</div>
                </div>
              </div>
            </div>

            {/* Cột: Thứ trong tuần */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Thứ (曜日)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {[
                    { vi: 'Thứ 2', ja: '月曜日', kana: 'げつようび' },
                    { vi: 'Thứ 3', ja: '火曜日', kana: 'かようび' },
                    { vi: 'Thứ 4', ja: '水曜日', kana: 'すいようび' },
                    { vi: 'Thứ 5', ja: '木曜日', kana: 'もくようび' },
                    { vi: 'Thứ 6', ja: '金曜日', kana: 'きんようび' },
                    { vi: 'Thứ 7', ja: '土曜日', kana: 'どようび' },
                    { vi: 'Chủ nhật', ja: '日曜日', kana: 'にちようび' },
                    { vi: 'Thứ mấy?', ja: '何曜日', kana: 'なんようび' }
                  ].map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 4px', color: '#64748b' }}>{d.vi}</td>
                      <td style={{ padding: '6px 4px', fontWeight: 600 }}>{d.ja}</td>
                      <td style={{ padding: '6px 4px' }}><span style={{ cursor: 'pointer', color: '#f59e0b' }} onClick={() => speak(d.kana)}>{d.kana}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cột: Ngày trong tháng */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Ngày trong tháng (〜日)</h3>
              <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px 0' }}>Từ ngày 1 đến 10 là bất quy tắc:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('ついたち')}>1: ついたち</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('ふつか')}>2: ふつか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('みっか')}>3: みっか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('よっか')}>4: よっか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('いつか')}>5: いつか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('むいか')}>6: むいか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('なのか')}>7: なのか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('ようか')}>8: ようか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('ここのか')}>9: ここのか</div>
                  <div style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('とおか')}>10: とおか</div>
                </div>
                <p style={{ margin: '0 0 4px 0' }}>Các ngày bất quy tắc khác:</p>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('じゅうよっか')}>14: じゅうよっか</li>
                  <li style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('はつか')}>20: はつか</li>
                  <li style={{ color: '#ef4444', fontWeight: 600 }} onClick={() => speak('にじゅうよっか')}>24: にじゅうよっか</li>
                </ul>
              </div>
            </div>

            {/* Cột: Khoảng thời gian */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Khoảng thời gian (〜間)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>〜時間 (Tiếng)</span>
                  <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => speak('いちじかん')}>1時間</span>
                </div>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>〜日間 (Ngày)</span>
                  <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => speak('ふつかかん')}>2日間</span>
                </div>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>〜週間 (Tuần)</span>
                  <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => speak('さんしゅうかん')}>3週間</span>
                </div>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>〜か月 (Tháng)</span>
                  <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => speak('よんかげつ')}>4か月</span>
                </div>
                <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>〜年間 (Năm)</span>
                  <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => speak('ごねんかん')}>5年間</span>
                </div>
                <div style={{ marginTop: 4, fontStyle: 'italic', color: '#64748b' }}>Hỏi: どのくらい - Khoảng bao lâu?</div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: ADVERBS */}
      {activeTab === 'adverbs' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Phó Từ (副詞)</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Bấm vào từ tiếng Nhật để nghe phát âm</p>
            </div>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Phó Từ', items: quizItemsMap.adverbs })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
                color: 'white', boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {tailieuData.adverbs.map((item, idx) => (
              <div key={idx} style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#4f46e5', marginBottom: 8, cursor: 'pointer' }} onClick={() => speak(item.jp)}>
                  {item.jp}
                </div>
                <div style={{ fontSize: 13, color: '#334155' }}>{item.vi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: NA ADJECTIVES */}
      {activeTab === 'na_adj' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Tính Từ Đuôi な</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Bấm vào từ tiếng Nhật để nghe phát âm</p>
            </div>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Tính Từ な', items: quizItemsMap.na_adj })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #10b981, #0d9488)',
                color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {tailieuData.naAdjectives.map((item, idx) => (
              <div key={idx} style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', cursor: 'pointer', marginBottom: 4 }} onClick={() => speak(item.kana || item.kanji)}>
                  {item.kanji || item.kana}
                </div>
                {item.kanji && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{item.kana}</div>}
                <div style={{ fontSize: 14, color: '#10b981', fontWeight: 600 }}>{item.vi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: SHII ADJECTIVES */}
      {activeTab === 'shii_adj' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Tính Từ Đuôi ~しい</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Bấm vào từ tiếng Nhật để nghe phát âm</p>
            </div>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Tính Từ ~しい', items: quizItemsMap.shii_adj })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #e11d48, #9f1239)',
                color: 'white', boxShadow: '0 4px 12px rgba(225,29,72,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {tailieuData.shiiAdjectives.map((item, idx) => (
              <div key={idx} style={{ padding: 16, background: '#fff1f2', borderRadius: 12, border: '1px solid #ffe4e6', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#e11d48', cursor: 'pointer', marginBottom: 4 }} onClick={() => speak(item.kana || item.kanji)}>
                  {item.kanji}
                </div>
                {item.kana && <div style={{ fontSize: 12, color: '#fb7185', marginBottom: 8 }}>{item.kana}</div>}
                <div style={{ fontSize: 14, color: '#4c0519', fontWeight: 600 }}>{item.vi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: I ADJECTIVES */}
      {activeTab === 'i_adj' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Tính Từ Ngắn Đuôi ~い</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Bấm vào từ tiếng Nhật để nghe phát âm</p>
            </div>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Tính Từ ~い', items: quizItemsMap.i_adj })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #0d9488, #0891b2)',
                color: 'white', boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {tailieuData.iAdjectives.map((item, idx) => (
              <div key={idx} style={{ padding: 16, background: '#f0fdfa', borderRadius: 12, border: '1px solid #ccfbf1', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0d9488', cursor: 'pointer', marginBottom: 4 }} onClick={() => speak(item.kana || item.kanji)}>
                  {item.kanji}
                </div>
                {item.kana && <div style={{ fontSize: 12, color: '#5eead4', marginBottom: 8 }}>{item.kana}</div>}
                <div style={{ fontSize: 14, color: '#134e4a', fontWeight: 600 }}>{item.vi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: ANTONYMS */}
      {activeTab === 'antonyms' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Các Cặp Từ Trái Nghĩa</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Bấm vào từ tiếng Nhật để nghe phát âm</p>
            </div>
            <button
              onClick={() => setActiveQuiz({ title: 'Test Từ Trái Nghĩa', items: quizItemsMap.antonyms })}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(to right, #be185d, #7c3aed)',
                color: 'white', boxShadow: '0 4px 12px rgba(190,24,93,0.3)',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Award size={18} />
              Bắt Đầu Test
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tailieuData.antonyms.map((item, idx) => {
              if (item.raw) {
                return (
                  <div key={idx} style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 8, fontWeight: 700, color: '#334155' }}>
                    {item.raw}
                  </div>
                );
              }
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ flex: 1, padding: 16, background: '#eff6ff', borderRight: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => speak(item.w1.split(/[ :\(]/)[0])}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>{item.w1}</span>
                  </div>
                  <div style={{ padding: '0 16px', color: '#94a3b8', fontWeight: 800 }}>↔</div>
                  <div style={{ flex: 1, padding: 16, background: '#fdf2f8', cursor: 'pointer' }} onClick={() => speak(item.w2.split(/[ :\(]/)[0])}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#be185d' }}>{item.w2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: JLPT EXAMS */}
      {activeTab === 'jlpt_exams' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Đề Thi Thử Từ Vựng JLPT N5 - N1</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Đề thi được thiết kế khoa học dạng trắc nghiệm Hán tự & Cách đọc chuẩn format JLPT</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { level: 5, label: 'Đề Thi Thử JLPT N5', desc: 'Cấp độ Sơ cấp 1 (Khoảng 600 từ vựng cơ bản)', color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
              { level: 4, label: 'Đề Thi Thử JLPT N4', desc: 'Cấp độ Sơ cấp 2 (Khoảng 1500 từ vựng đời sống)', color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
              { level: 3, label: 'Đề Thi Thử JLPT N3', desc: 'Cấp độ Trung cấp (Khoảng 3700 từ vựng nâng cao)', color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
              { level: 2, label: 'Đề Thi Thử JLPT N2', desc: 'Cấp độ Thượng trung cấp (Khoảng 6000 từ vựng học thuật)', color: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' },
              { level: 1, label: 'Đề Thi Thử JLPT N1', desc: 'Cấp độ Cao cấp (Khoảng 10000 từ vựng chuyên sâu)', color: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
            ].map(exam => (
              <div 
                key={exam.level}
                onClick={() => setActiveExamLevel(exam.level)}
                style={{ 
                  borderRadius: 16, 
                  background: exam.color, 
                  color: 'white', 
                  padding: 24, 
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  transition: 'all 200ms ease',
                }}
                className="hover-card"
              >
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>N{exam.level}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{exam.label}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{exam.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: MINNA TESTS */}
      {activeTab === 'minna_tests' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Test Tổng Hợp Ngữ Pháp Minna no Nihongo (Bài 1 - 25)</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Đề thi 4 phần cấu trúc nâng cao bám sát ngữ pháp trọng tâm từng bài. Sinh ngẫu nhiên bằng AI.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
            {Array.from({ length: 25 }, (_, i) => i + 1).map(lesson => (
              <button 
                key={lesson}
                onClick={() => setActiveMinnaLesson(lesson)}
                style={{ 
                  borderRadius: 12, 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', 
                  color: 'white', 
                  padding: "16px 8px", 
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  transition: 'all 200ms ease',
                  fontSize: 16,
                  fontWeight: 800
                }}
                className="hover-card"
              >
                Bài {lesson}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
