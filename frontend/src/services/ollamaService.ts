// ============================================================
// Ollama Service – Connects to Local Qwen3 Model via C# API Proxy
// ============================================================

import { API_BASE } from '../config/api';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistory {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequestOptions {
  systemPrompt?: string;
  mode?: 'guided_kaiwa' | 'free_chat';
  level?: string;
  currentQuestion?: string;
  lastAssessment?: string;
  sessionState?: string;
  turnIntent?: string;
  maxHistoryTurns?: number;
}

const HEALTH_CACHE_TTL_MS = 15000;
let healthCache: { value: boolean; expiresAt: number } | null = null;

function mapHistoryToOllama(history: ChatHistory[], maxHistoryTurns = 6): ChatTurn[] {
  return history.slice(-maxHistoryTurns).map(h => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.text
  }));
}

export async function checkOllamaHealth(): Promise<boolean> {
  const now = Date.now();
  if (healthCache && healthCache.expiresAt > now) {
    return healthCache.value;
  }

  try {
    const res = await fetch(`${API_BASE}/chat/health`);
    if (!res.ok) {
      healthCache = { value: false, expiresAt: now + HEALTH_CACHE_TTL_MS };
      return false;
    }
    const data = await res.json();
    const isOnline = data.status === 'online';
    healthCache = { value: isOnline, expiresAt: now + HEALTH_CACHE_TTL_MS };
    return isOnline;
  } catch {
    healthCache = { value: false, expiresAt: now + HEALTH_CACHE_TTL_MS };
    return false;
  }
}

export async function sendOllamaMessage(
  userMessage: string,
  history: ChatHistory[] = [],
  options: ChatRequestOptions = {}
): Promise<string> {
  const ollamaHistory = mapHistoryToOllama(history, options.maxHistoryTurns ?? 6);
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: ollamaHistory,
      systemPrompt: options.systemPrompt,
      mode: options.mode,
      level: options.level,
      currentQuestion: options.currentQuestion,
      lastAssessment: options.lastAssessment,
      sessionState: options.sessionState,
      turnIntent: options.turnIntent,
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.reply || '';
}

/**
 * Gửi chat stream qua Server-Sent Events (SSE).
 * @param userMessage Tin nhắn người dùng
 * @param history Lịch sử trò chuyện
 * @param onChunk Callback nhận từng đoạn text stream
 * @param onComplete Callback khi stream hoàn tất
 */
export async function streamOllamaMessage(
  userMessage: string,
  history: ChatHistory[] = [],
  onChunk: (chunk: string, isThinking: boolean) => void,
  onComplete: (fullText: string, fullThinking: string) => void,
  options: ChatRequestOptions = {}
): Promise<void> {
  const ollamaHistory = mapHistoryToOllama(history, options.maxHistoryTurns ?? 6);
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: ollamaHistory,
      systemPrompt: options.systemPrompt,
      mode: options.mode,
      level: options.level,
      currentQuestion: options.currentQuestion,
      lastAssessment: options.lastAssessment,
      sessionState: options.sessionState,
      turnIntent: options.turnIntent,
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize stream (HTTP ${response.status})`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  let fullThinking = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Giữ lại dòng cuối cùng chưa hoàn chỉnh vào buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.slice(5).trim();
          if (rawData.startsWith('[ERROR]:')) {
            const errMsg = decodeURIComponent(rawData.slice(8).trim());
            throw new Error(errMsg);
          }
          
          try {
            const decodedChunk = decodeURIComponent(rawData);
            if (decodedChunk.startsWith('[THINK]')) {
              continue;
            } else {
              fullText += decodedChunk;
              onChunk(decodedChunk, false);
            }
          } catch (e) {
            console.error('Failed to decode chunk:', rawData, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
    onComplete(fullText, fullThinking);
  }
}

export const ollamaService = {
  checkHealth: checkOllamaHealth,
  sendMessage: sendOllamaMessage,
  streamMessage: streamOllamaMessage,
};
