// ============================================================
// Gemini API Service – Google Gemini 1.5 Flash (FREE tier)
// Free: 15 RPM, 1M tokens/day, 1500 RPD
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  parts: GeminiPart[];
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
  systemInstruction?: { parts: GeminiPart[] };
}

interface GeminiResponse {
  candidates: {
    content: { parts: GeminiPart[]; role: string };
    finishReason: string;
  }[];
}

// ── Core request function ─────────────────────────────────────
async function callGemini(request: GeminiRequest): Promise<string> {
  const currentKey = GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  if (!currentKey) {
    throw new Error('NO_API_KEY');
  }

  const url = `${GEMINI_BASE_URL}?key=${currentKey}`;
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
  image?: { mimeType: string; data: string };
}

export interface ChatRequestOptions {
  systemPrompt?: string;
  maxHistoryTurns?: number;
  mode?: 'guided_kaiwa' | 'free_chat';
  level?: string;
  currentQuestion?: string;
  lastAssessment?: string;
  sessionState?: string;
  turnIntent?: string;
}

function buildSessionContextPrompt(options: ChatRequestOptions): string {
  const lines: string[] = [];
  if (options.mode) lines.push(`Session mode: ${options.mode}`);
  if (options.level) lines.push(`JLPT level: ${options.level}`);
  if (options.currentQuestion) lines.push(`Current lesson question: ${options.currentQuestion}`);
  if (options.lastAssessment) lines.push(`Last assessment: ${options.lastAssessment}`);
  if (options.sessionState) lines.push(`Session state: ${options.sessionState}`);
  if (options.turnIntent) lines.push(`Turn intent: ${options.turnIntent}`);
  return lines.length ? `\n${lines.join('\n')}` : '';
}

export async function sendChatMessage(
  userMessage: string,
  history: ChatHistory[] = [],
  options: ChatRequestOptions = {},
  image?: { mimeType: string; data: string }
): Promise<string> {
  const currentParts: GeminiPart[] = [];
  if (image) currentParts.push({ inlineData: image });
  if (userMessage) currentParts.push({ text: userMessage });

  const contents: GeminiContent[] = [
    // History trước
    ...history.slice(-(options.maxHistoryTurns ?? 6)).map(h => {
      const parts: GeminiPart[] = [];
      if (h.image) parts.push({ inlineData: h.image });
      if (h.text) parts.push({ text: h.text });
      return { role: h.role, parts };
    }),
    // Tin nhắn hiện tại
    { role: 'user', parts: currentParts },
  ];

  const basePrompt = options.systemPrompt || SENSEI_SYSTEM_PROMPT;
  const sessionContext = buildSessionContextPrompt(options);

  return callGemini({
    contents,
    systemInstruction: { parts: [{ text: `${basePrompt}${sessionContext}` }] },
    generationConfig: { temperature: 0.35, maxOutputTokens: 180, topP: 0.85 },
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

export async function generateJLPTGrammarQuestions(level: number, count: number = 10) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo ${count} câu hỏi trắc nghiệm NGỮ PHÁP (Grammar) tiếng Nhật trình độ N${level}.
Trả về đúng định dạng JSON array sau, không thêm gì khác:
[
  {
    "questionText": "Câu hỏi với chỗ trống (　　)",
    "correctAnswer": "đáp án đúng",
    "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
    "explanation": "Giải thích ngắn gọn bằng tiếng Việt vì sao chọn đáp án này"
  }
]`;

  try {
    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Lỗi khi sinh câu hỏi ngữ pháp");
  }
}

export async function generateJLPTReadingQuestions(level: number) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo MỘT bài ĐỌC HIỂU (Reading) tiếng Nhật trình độ N${level} kèm theo 3 câu hỏi trắc nghiệm.
Trả về đúng định dạng JSON object sau, không thêm gì khác:
{
  "passage": "Đoạn văn tiếng Nhật (khoảng 50-150 từ tùy trình độ N${level})",
  "translation": "Bản dịch tiếng Việt của đoạn văn (để hiển thị khi user xem đáp án)",
  "questions": [
    {
      "questionText": "Câu hỏi trắc nghiệm về đoạn văn",
      "correctAnswer": "đáp án đúng",
      "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
      "explanation": "Giải thích vì sao chọn đáp án này (dựa vào câu nào trong bài)"
    }
  ]
}`;

  try {
    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Lỗi khi sinh câu hỏi đọc hiểu");
  }
}

export async function generateJLPTListeningQuestions(level: number) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo MỘT bài NGHE HIỂU (Listening) tiếng Nhật trình độ N${level}.
Hãy viết một đoạn hội thoại ngắn giữa 2 người (ví dụ: Nam và Nữ), sau đó là 1 câu hỏi trắc nghiệm.
Trả về đúng định dạng JSON object sau, không thêm gì khác:
{
  "audioTranscript": "Nội dung đoạn hội thoại tiếng Nhật (để hệ thống Text-to-speech đọc). Ví dụ: 男：あした、どこへ行きますか。女：スーパーへ行きます。",
  "translation": "Bản dịch tiếng Việt của đoạn hội thoại",
  "questionText": "Câu hỏi trắc nghiệm liên quan đến đoạn hội thoại (Ví dụ: 女の人はあしたどこへ行きますか。)",
  "correctAnswer": "đáp án đúng",
  "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
  "explanation": "Giải thích đáp án"
}`;

  try {
    const text = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Lỗi khi sinh câu hỏi nghe hiểu");
  }
}

export const geminiService = {
  sendChatMessage,
  generateExample,
  generateQuizFromVocab,
  analyzeSpeech,
  getMockQuizQuestions,
  generateJLPTGrammarQuestions,
  generateJLPTReadingQuestions,
  generateJLPTListeningQuestions,
  isAvailable: () => !!GEMINI_API_KEY,
};
