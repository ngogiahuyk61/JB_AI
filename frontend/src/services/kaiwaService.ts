import { API_ORIGIN } from '../config/api';

const API_BASE = `${API_ORIGIN}/api/kaiwa`;

export type KaiwaMode = 'random' | 'intro' | 'lesson' | 'summary';

export interface KaiwaLesson {
  id: number;
  title: string;
  titleVi: string;
  questionCount: number;
  orderIndex: number;
}

export interface KaiwaQuestion {
  id: number;
  lessonId: number;
  lessonTitle: string;
  japaneseText: string;
  orderIndex: number;
  totalInLesson: number;
}

export interface EvaluationResult {
  questionId: number;
  questionText: string;
  userAnswer: string;
  expectedAnswer: string;
  grammarScore: number;
  vocabularyScore: number;
  naturalnessScore: number;
  overallScore: number;
  feedback: string;
  grammarExplanation: string;
  correctSentence: string;
  passThreshold: boolean;
}

interface GetNextParams {
  mode: KaiwaMode;
  lessonId?: number;
  afterId?: number;
  excludeIds?: number[];
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const kaiwaService = {
  async getLessons(): Promise<KaiwaLesson[]> {
    return fetchJson<KaiwaLesson[]>(`${API_BASE}/lessons`);
  },

  async getNextQuestion(params: GetNextParams): Promise<KaiwaQuestion | null> {
    const { mode, lessonId, afterId, excludeIds } = params;
    const qs = new URLSearchParams({ mode });
    if (lessonId) qs.set('lessonId', String(lessonId));
    if (afterId) qs.set('afterId', String(afterId));
    if (excludeIds?.length) qs.set('excludeIds', excludeIds.join(','));

    try {
      return await fetchJson<KaiwaQuestion>(`${API_BASE}/question/next?${qs}`);
    } catch (e: unknown) {
      // 404 means no more questions
      if (e instanceof Error && e.message.startsWith('HTTP 404')) return null;
      throw e;
    }
  },

  async getReferenceAnswer(questionId: number): Promise<{ expectedAnswer: string }> {
    return fetchJson<{ expectedAnswer: string }>(`${API_BASE}/question/${questionId}/answer`);
  },

  async evaluate(questionId: number, userAnswer: string): Promise<EvaluationResult> {
    return fetchJson<EvaluationResult>(`${API_BASE}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ questionId, userAnswer }),
    });
  },

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    
    const data = await res.json();
    return data.transcript;
  },

  async translate(text: string): Promise<string> {
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    return data.translation;
  },
};
