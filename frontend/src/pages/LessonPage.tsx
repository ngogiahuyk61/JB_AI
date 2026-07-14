import { useState } from 'react';
import { BookOpen, Volume2, Play } from 'lucide-react';
import { speechService } from '../services/speechService';
import '../styles/LessonPage.css';

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
  const [activeTab, setActiveTab] = useState<'verbs' | 'particles' | 'synonyms'>('verbs');
  const [verbGroup, setVerbGroup] = useState<'I' | 'II' | 'III'>('I');
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

  return (
    <div style={{ padding: '24px 30px', background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <BookOpen size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Học Liệu Bài Học</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0 0' }}>Học ngữ pháp, trợ từ và cách chia động từ trực quan tương tác</p>
        </div>
      </div>

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('verbs')}
          style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'verbs' ? 'white' : 'transparent',
            color: activeTab === 'verbs' ? '#4f46e5' : '#475569',
            boxShadow: activeTab === 'verbs' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 150ms ease'
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
            transition: 'all 150ms ease'
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
            transition: 'all 150ms ease'
          }}
        >
          Từ Đồng Nghĩa
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
      )}

      {/* Tab: SYNONYMS */}
      {activeTab === 'synonyms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

    </div>
  );
}
