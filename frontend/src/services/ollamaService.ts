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

function mapHistoryToOllama(history: ChatHistory[]): ChatTurn[] {
  return history.map(h => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.text
  }));
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/chat/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'online';
  } catch {
    return false;
  }
}

export async function sendOllamaMessage(
  userMessage: string,
  history: ChatHistory[] = []
): Promise<string> {
  const ollamaHistory = mapHistoryToOllama(history);
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: ollamaHistory
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
  onChunk: (chunk: string) => void,
  onComplete: (fullText: string) => void
): Promise<void> {
  const ollamaHistory = mapHistoryToOllama(history);
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: ollamaHistory
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
            fullText += decodedChunk;
            onChunk(decodedChunk);
          } catch (e) {
            console.error('Failed to decode chunk:', rawData, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
    onComplete(fullText);
  }
}

export const ollamaService = {
  checkHealth: checkOllamaHealth,
  sendMessage: sendOllamaMessage,
  streamMessage: streamOllamaMessage,
};
