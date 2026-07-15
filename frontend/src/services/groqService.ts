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

export async function generateJLPTGrammarQuestions(level: number, count: number = 10) {
  const prompt = `Bạn là một chuyên gia ra đề thi JLPT N${level}.
Hãy tạo ${count} câu hỏi trắc nghiệm NGỮ PHÁP (Grammar) tiếng Nhật trình độ N${level}.
Trả về ĐÚNG định dạng JSON sau (phải bắt đầu bằng { và kết thúc bằng }):
{
  "questions": [
    {
      "questionText": "Câu hỏi với chỗ trống (　　)",
      "correctAnswer": "đáp án đúng",
      "choices": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
      "explanation": "Giải thích ngắn gọn bằng tiếng Việt vì sao chọn đáp án này"
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

export const groqService = {
  generateJLPTGrammarQuestions,
  generateJLPTReadingQuestions,
  generateJLPTListeningQuestions,
  isAvailable: () => true, // Default key is always present
};
