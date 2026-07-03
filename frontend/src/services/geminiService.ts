// ============================================================
// Gemini API Service – Google Gemini 1.5 Flash (FREE tier)
// Free: 15 RPM, 1M tokens/day, 1500 RPD
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiContent {
  parts: { text: string }[];
  role?: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
  };
  systemInstruction?: { parts: { text: string }[] };
}

interface GeminiResponse {
  candidates: {
    content: { parts: { text: string }[]; role: string };
    finishReason: string;
  }[];
}

// ── Core request function ─────────────────────────────────────
async function callGemini(request: GeminiRequest): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('NO_API_KEY');
  }

  const url = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data: GeminiResponse = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── SYSTEM PROMPT: Giáo viên Nhật ─────────────────────────────
const SENSEI_SYSTEM_PROMPT = `Bạn là Sensei AI – giáo viên tiếng Nhật thông minh, thân thiện.
Nhiệm vụ:
- Giảng dạy tiếng Nhật với phương pháp từ dễ đến khó.
- Luôn trả lời song ngữ: Nhật ngữ + tiếng Việt.
- Sửa lỗi phát âm/ngữ pháp nhẹ nhàng, có giải thích.
- Khi người dùng nói tiếng Nhật, đánh giá và khen ngợi cụ thể.
- Tự nhiên, vui vẻ như người bạn học.
- KHÔNG dùng markdown phức tạp, chỉ dùng text thuần + emoji.
- Mỗi câu trả lời ngắn gọn (dưới 200 chữ).`;

// ── AI Chat ────────────────────────────────────────────────────
export interface ChatHistory {
  role: 'user' | 'model';
  text: string;
}

export async function sendChatMessage(
  userMessage: string,
  history: ChatHistory[] = []
): Promise<string> {
  const contents: GeminiContent[] = [
    // History trước
    ...history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }],
    })),
    // Tin nhắn hiện tại
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  return callGemini({
    contents,
    systemInstruction: { parts: [{ text: SENSEI_SYSTEM_PROMPT }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
  });
}

// ── Sinh câu ví dụ cho từ vựng ────────────────────────────────
export async function generateExample(
  kanji: string,
  kana: string,
  vietnamese: string
): Promise<{ ja: string; vi: string }> {
  const prompt = `Tạo 1 câu ví dụ ngắn (5-10 từ) dùng từ "${kanji}" (${kana} - ${vietnamese}).
Format trả về CHÍNH XÁC như sau (không thêm gì khác):
JA: [câu tiếng Nhật]
VI: [nghĩa tiếng Việt]`;

  const text = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 100 },
  });

  const jaMatch = text.match(/JA:\s*(.+)/);
  const viMatch = text.match(/VI:\s*(.+)/);

  return {
    ja: jaMatch?.[1]?.trim() || `${kanji}を使った例文です。`,
    vi: viMatch?.[1]?.trim() || `Ví dụ với từ ${vietnamese}.`,
  };
}

// ── Sinh câu hỏi quiz từ từ vựng ──────────────────────────────
export async function generateQuizFromVocab(
  vocabList: { kanji: string; kana: string; vietnamese: string }[],
  count: number = 10
): Promise<{ question: string; options: string[]; correctAnswer: number; explanation: string }[]> {
  const vocabStr = vocabList
    .slice(0, 20)
    .map(v => `${v.kanji}（${v.kana}）= ${v.vietnamese}`)
    .join('\n');

  const prompt = `Dựa trên danh sách từ vựng tiếng Nhật sau:
${vocabStr}

Tạo ${count} câu hỏi trắc nghiệm JLPT theo định dạng JSON:
[
  {
    "question": "（　）は電車で行きます。",
    "options": ["がっこう", "でんわ", "にほん", "たべもの"],
    "correctAnswer": 0,
    "explanation": "学校（がっこう）= trường học"
  }
]
Chỉ trả về JSON array, không thêm gì khác.`;

  try {
    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback mock data
    return getMockQuizQuestions();
  }
}

// ── Phân tích câu tiếng Nhật của học viên ─────────────────────
export async function analyzeSpeech(
  userSpeech: string
): Promise<{ correction: string; pronunciation: string; feedback: string }> {
  const prompt = `Học viên tiếng Nhật vừa nói: "${userSpeech}"
Phân tích và trả về JSON:
{
  "correction": "Câu đúng (nếu có lỗi) hoặc 'Chính xác!'",
  "pronunciation": "Hướng dẫn phát âm ngắn gọn",
  "feedback": "Nhận xét tích cực, khích lệ (1-2 câu)"
}
Chỉ trả về JSON.`;

  try {
    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      correction: userSpeech,
      pronunciation: 'Phát âm tốt!',
      feedback: 'Bạn đang tiến bộ rất tốt! Tiếp tục luyện tập nhé! 🎉',
    };
  }
}

// ── Mock data khi không có API key ────────────────────────────
export function getMockQuizQuestions() {
  return [
    {
      question: 'ここは（　　）です。',
      options: ['がっこう', 'がっこ', 'がこう', 'かこう'],
      correctAnswer: 0,
      explanation: '学校（がっこう）= trường học',
    },
    {
      question: 'きのう、デパートへ（　　）。',
      options: ['いきます', 'いきました', 'いって', 'いかない'],
      correctAnswer: 1,
      explanation: 'Dùng thì quá khứ いきました vì có きのう (hôm qua)',
    },
    {
      question: 'これは（　　）ですか。',
      options: ['なん', 'なに', 'どれ', 'どこ'],
      correctAnswer: 0,
      explanation: 'なん (何) dùng khi hỏi "cái gì" với です',
    },
    {
      question: 'あした（　　）がありますか。',
      options: ['しけん', 'じけん', 'しごと', 'じゅぎょう'],
      correctAnswer: 0,
      explanation: '試験（しけん）= kỳ thi',
    },
    {
      question: 'てを（　　）から、たべてください。',
      options: ['あらって', 'あらう', 'あらった', 'あらい'],
      correctAnswer: 0,
      explanation: 'Dùng Te-form あらって để nối hai hành động',
    },
  ];
}

export const geminiService = {
  sendChatMessage,
  generateExample,
  generateQuizFromVocab,
  analyzeSpeech,
  getMockQuizQuestions,
  isAvailable: () => !!GEMINI_API_KEY,
};
