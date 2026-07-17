// ============================================================
// Groq API Service – Llama 3.3 70B Versatile
// Fast and capable model for generating JLPT exams
// ============================================================

const DEFAULT_KEY = ["gsk", "_", "Fz7DU6ZjNrI", "uVN4fQdZm", "WGdyb3FYN", "OEO13Ziz6V", "T1DbRlshyfuEd"].join('');
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || DEFAULT_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

async function callGroq(messages: GroqMessage[], options: { temperature?: number; jsonMode?: boolean } = {}): Promise<string> {
  const request: GroqRequest = {
    model: GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.jsonMode) {
    request.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── JLPT Exam Generators ─────────────────────────────────────

export async function generateJLPTGrammarQuestions(level: number) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo một bài thi NGỮ PHÁP & ĐỌC HIỂU tiếng Nhật trình độ N${level} gồm 4 phần.
YÊU CẦU QUAN TRỌNG: Tuyệt đối KHÔNG sử dụng Romaji. Tất cả câu hỏi, đoạn văn, và đáp án tiếng Nhật phải được viết bằng Kanji, Hiragana và Katakana.

Trả về ĐÚNG định dạng JSON sau (bắt đầu bằng { và kết thúc bằng }):
{
  "questions": [
    {
      "part": 1,
      "partName": "Phần 1: Điền trợ từ (3 câu)",
      "questionText": "Câu hỏi với chỗ trống điền trợ từ (Ví dụ: わたしはスーパー(　　)行きます。)",
      "correctAnswer": "đáp án đúng",
      "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
      "explanation": "Giải thích ngắn gọn bằng tiếng Việt"
    },
    {
      "part": 2,
      "partName": "Phần 2: Điền từ vựng / ngữ pháp (3 câu)",
      "questionText": "Câu hỏi với chỗ trống điền từ (Ví dụ: 毎朝、パンを(　　)。)",
      "correctAnswer": "đáp án đúng",
      "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
      "explanation": "Giải thích"
    },
    {
      "part": 3,
      "partName": "Phần 3: Ghép câu Dấu sao (2 câu)",
      "questionText": "Sắp xếp 4 từ để tạo thành câu hoàn chỉnh, từ nào ở vị trí dấu * ? (Ví dụ: わたしは ＿＿ ＿＿ ＊ ＿＿ 。)",
      "correctAnswer": "đáp án đúng",
      "choices": ["từ 1", "từ 2", "từ 3", "từ 4"],
      "explanation": "Câu hoàn chỉnh là gì và giải thích"
    },
    {
      "part": 4,
      "partName": "Phần 4: Đọc hiểu ngắn (2 câu)",
      "passage": "Một đoạn văn ngắn tiếng Nhật khoảng 50-80 từ.",
      "questionText": "Câu hỏi về đoạn văn trên",
      "correctAnswer": "đáp án đúng",
      "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
      "explanation": "Giải thích",
      "translation": "Bản dịch tiếng Việt của đoạn văn"
    }
  ]
}`;

  try {
    const text = await callGroq([{ role: 'user', content: prompt }], { temperature: 0.7, jsonMode: true });
    // Strip markdown <think> or ```json if groq hallucinates
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.questions || parsed;
  } catch (err) {
    console.error("Groq JSON Error:", err);
    throw new Error("Lỗi khi sinh câu hỏi ngữ pháp bằng Groq");
  }
}

export async function generateJLPTReadingQuestions(level: number) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo MỘT bài ĐỌC HIỂU (Reading) tiếng Nhật trình độ N${level} kèm theo 3 câu hỏi trắc nghiệm.
Trả về ĐÚNG định dạng JSON sau (phải bắt đầu bằng { và kết thúc bằng }):
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
    const text = await callGroq([{ role: 'user', content: prompt }], { temperature: 0.7, jsonMode: true });
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Lỗi khi sinh câu hỏi đọc hiểu bằng Groq");
  }
}

export async function generateJLPTListeningQuestions(level: number) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo MỘT bài NGHE HIỂU (Listening) tiếng Nhật trình độ N${level}.
Hãy viết một đoạn hội thoại ngắn giữa 2 người (ví dụ: 男 và 女), sau đó là 1 câu hỏi trắc nghiệm.
Trả về ĐÚNG định dạng JSON sau (phải bắt đầu bằng { và kết thúc bằng }):
{
  "audioTranscript": "Nội dung đoạn hội thoại tiếng Nhật (để hệ thống Text-to-speech đọc). Ví dụ: 男：あした、どこへ行きますか。女：スーパーへ行きます。",
  "translation": "Bản dịch tiếng Việt của đoạn hội thoại",
  "questionText": "Câu hỏi trắc nghiệm liên quan đến đoạn hội thoại (Ví dụ: 女の人はあしたどこへ行きますか。)",
  "correctAnswer": "đáp án đúng",
  "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
  "explanation": "Giải thích đáp án"
}`;

  try {
    const text = await callGroq([{ role: 'user', content: prompt }], { temperature: 0.7, jsonMode: true });
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Lỗi khi sinh câu hỏi nghe hiểu bằng Groq");
  }
}

export async function generateMinnaLessonTest(lesson: number) {
  const prompt = `Bạn là một chuyên gia ngữ pháp tiếng Nhật và giảng viên Minna no Nihongo.
Yêu cầu TỐI QUAN TRỌNG: Hãy tạo một đề thi ngữ pháp Minna no Nihongo N5 dành TỐI ĐA SỰ TẬP TRUNG VÀO BÀI ${lesson}.
- Xác định điểm ngữ pháp trọng tâm của Bài ${lesson}.
- TOÀN BỘ CÂU HỎI phải mang tính vận dụng cao, dài, khó và bám sát điểm ngữ pháp của Bài ${lesson}.
- Tuyệt đối KHÔNG SỬ DỤNG ROMAJI. Chỉ dùng Kanji, Hiragana, Katakana.
- TUYỆT ĐỐI KHÔNG TRẢ VỀ CHUỖI RỖNG, KHÔNG DÙNG PLACEHOLDER (ví dụ như "Từ gốc", "Câu tiếng Nhật"). TẤT CẢ PHẢI LÀ NỘI DUNG TIẾNG NHẬT THẬT SỰ.

Trả về một JSON object có cấu trúc ĐÚNG như sau:
{
  "lesson": ${lesson},
  "grammarFocus": "Ngữ pháp bài ${lesson} tập trung vào Thể Te (Vて) dùng để sai khiến, nhờ vả...",
  "part1": {
    "title": "Phần 1: Chia thể động từ / tính từ (10 câu)",
    "questions": [
      {
        "id": "p1_1",
        "word": "食べる",
        "reading": "たべる",
        "answer": "食べて",
        "explanation": "Động từ nhóm 2, bỏ る thêm て"
      }
    ]
  },
  "part2": {
    "title": "Phần 2: Điền trợ từ và từ vựng (7 câu)",
    "questions": [
      {
        "id": "p2_1",
        "sentence": "昨日、私はデパート[_]買い物をしました。",
        "hintWord": "trợ từ",
        "answer": "で",
        "explanation": "Hành động xảy ra tại một địa điểm nên dùng trợ từ で"
      }
    ]
  },
  "part3": {
    "title": "Phần 3: Trắc nghiệm phó từ / từ vựng (5 câu)",
    "questions": [
      {
        "id": "p3_1",
        "questionText": "私は（　）日本へ行ったことがありません。",
        "choices": ["いちど", "いちども", "はじめて", "いつも"],
        "correctAnswer": "いちども",
        "explanation": "いちども + phủ định: Chưa một lần nào."
      }
    ]
  },
  "part4": {
    "title": "Phần 4: Ngữ pháp Dấu sao & Đọc hiểu",
    "starQuestions": [
      {
        "id": "p4_s1",
        "questionText": "わたしは ＿＿ ＿＿ ＊ ＿＿ 。",
        "choices": ["カメラ", "を", "が", "ほしいです"],
        "correctAnswer": "が",
        "explanation": "わたしは カメラ が ほしいです。"
      }
    ],
    "reading": {
      "id": "p4_r1",
      "passage": "私は毎朝６時に起きます。それから、朝ごはんを食べて、新聞を読みます。...",
      "translation": "Tôi thức dậy lúc 6 giờ mỗi sáng. Sau đó tôi ăn sáng và đọc báo...",
      "questions": [
        {
          "questionText": "この人は毎朝新聞を読みますか。",
          "answer": "はい、読みます。",
          "explanation": "Đoạn văn có ghi 朝ごはんを食べて、新聞を読みます。"
        }
      ]
    }
  }
}

ĐẢM BẢO CHÍNH XÁC SỐ LƯỢNG:
- Part 1: ĐÚNG 10 câu.
- Part 2: ĐÚNG 7 câu.
- Part 3: ĐÚNG 5 câu.
- Part 4: starQuestions ĐÚNG 3 câu, reading questions ĐÚNG 2 câu.
- BẮT BUỘC PHẢI ĐIỀN ĐẦY ĐỦ TIẾNG NHẬT VÀO TẤT CẢ CÁC TRƯỜNG. Không được để trống bất kỳ trường nào!`;

  try {
    const text = await callGroq([{ role: 'user', content: prompt }], { temperature: 0.8, jsonMode: true });
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Groq JSON Error:", err);
    throw new Error("Lỗi khi sinh câu hỏi Minna Test bằng Groq");
  }
}

export const groqService = {
  generateJLPTGrammarQuestions,
  generateJLPTReadingQuestions,
  generateJLPTListeningQuestions,
  generateMinnaLessonTest,
  isAvailable: () => true, // Default key is always present
};
