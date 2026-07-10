// ============================================================
// Speech Service – Web Speech API + AudioContext TTS (Android-safe)
// ============================================================

import { API_BASE } from '../config/api';

// ResponsiveVoice global type declaration
declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice: string, params?: { rate?: number; pitch?: number; volume?: number; onend?: () => void; onerror?: () => void }) => void;
      cancel: () => void;
      isPlaying: () => boolean;
      voiceSupport: () => boolean;
    };
  }
}

export interface SpeechOptions {
  lang: 'ja-JP' | 'vi-VN';
  rate?: number;
  pitch?: number;
  volume?: number;
}

// ── AudioContext Singleton (bypass Android autoplay policy) ──────────────
// AudioContext chạy trong context "resumable" – sau 1 user gesture thì
// context.state = 'running' và toàn bộ audio đều hoạt động.
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Resume AudioContext – MUST be called inside a user gesture event handler.
 * Nếu context đang 'suspended' (Android Chrome default), resume nó.
 */
async function resumeAudioContext(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch {
    // ignore
  }
}

/**
 * Play audio bytes qua AudioContext – KHÔNG bị Android autoplay policy chặn
 * miễn là AudioContext đã được resume() trong user gesture trước đó.
 */
function playAudioBuffer(arrayBuffer: ArrayBuffer, rate: number): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = Math.max(0.25, Math.min(2.0, rate));
      source.connect(ctx.destination);
      source.onended = () => resolve();
      source.start(0);
    } catch (e) {
      console.warn('[AudioCtx] playAudioBuffer error:', e);
      resolve();
    }
  });
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private _voicesLoaded = false;
  private jaVoice: SpeechSynthesisVoice | null = null;
  private viVoice: SpeechSynthesisVoice | null = null;
  private _utteranceRefs: SpeechSynthesisUtterance[] = []; // GC防止
  private currentAudio: HTMLAudioElement | null = null; // legacy fallback
  private currentAbortCtrl: AbortController | null = null;
  private _rate = 1.0;
  // Track if user has triggered a gesture (for Android unlock)
  private _audioUnlocked = false;

  public get voicesLoaded() { return this._voicesLoaded; }
  public get utteranceRefs() { return this._utteranceRefs; }
  public get rate() { return this._rate; }

  public setRate(rate: number) {
    this._rate = Math.max(0.25, Math.min(2.0, rate));
  }

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    const voices = this.synth?.getVoices() || [];
    if (voices.length === 0) return;

    // Ưu tiên Google Voices (chất lượng tốt nhất)
    this.jaVoice =
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('ja')) ||
      voices.find(v => v.lang === 'ja-JP') ||
      voices.find(v => v.lang.startsWith('ja')) ||
      null;

    this.viVoice =
      voices.find(v => v.name.includes('Google Tiếng Việt')) ||
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('vi')) ||
      voices.find(v => v.lang === 'vi-VN') ||
      voices.find(v => v.lang.startsWith('vi')) ||
      null;

    this._voicesLoaded = true;
  }

  // ── PRIMARY: Fetch audio bytes từ backend → phát qua AudioContext ──────
  // AudioContext không bị Android autoplay policy chặn sau khi được resume()
  private async speakViaAudioContext(text: string, lang: string): Promise<boolean> {
    const cleanText = text.slice(0, 200);
    const backendUrl = `${API_BASE}/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;

    // Abort controller để cancel nếu user dừng
    this.currentAbortCtrl?.abort();
    const ctrl = new AbortController();
    this.currentAbortCtrl = ctrl;

    try {
      const res = await fetch(backendUrl, {
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength < 500) throw new Error('Audio too small');

      // Resume context trong trường hợp browser tự suspend
      await resumeAudioContext();
      await playAudioBuffer(arrayBuffer, this._rate);
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return false;
      console.warn('[AudioCtx] Backend TTS failed, trying Google direct:', e?.message);
      return false;
    }
  }

  // ── FALLBACK: Thử trực tiếp Google Translate TTS (server-side) ─────────
  private async speakViaGoogleDirect(text: string, lang: string): Promise<boolean> {
    const cleanText = text.slice(0, 200);
    const googleUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&q=${encodeURIComponent(cleanText)}&tl=${lang}&ttsspeed=0.9`;

    this.currentAbortCtrl?.abort();
    const ctrl = new AbortController();
    this.currentAbortCtrl = ctrl;

    try {
      const res = await fetch(googleUrl, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength < 500) throw new Error('Audio too small');

      await resumeAudioContext();
      await playAudioBuffer(arrayBuffer, this._rate);
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return false;
      console.warn('[AudioCtx] Google direct TTS also failed:', e?.message);
      return false;
    }
  }

  // ── Online TTS: Backend proxy → Google direct → Web Speech fallback ──
  private async speakOnlineTTS(text: string, lang: string = 'vi'): Promise<void> {
    // Thử backend proxy (AudioContext)
    const backendOk = await this.speakViaAudioContext(text, lang);
    if (backendOk) return;

    // Thử Google direct (AudioContext)  
    const googleOk = await this.speakViaGoogleDirect(text, lang);
    if (googleOk) return;

    // Last resort: Web Speech API (có thể không có giọng Việt trên Android)
    if (lang === 'ja' && this.jaVoice) {
      await this.speakWebSpeech(text, 'ja-JP');
    }
  }

  // ── Đọc qua Web Speech API (local TTS engine) ────────────────────────
  private speakWebSpeech(text: string, lang: 'ja-JP' | 'vi-VN'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || !text.trim()) { resolve(); return; }

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = this._rate;
      utt.pitch = 1.0;
      utt.volume = 1.0;

      if (lang === 'ja-JP' && this.jaVoice) utt.voice = this.jaVoice;
      if (lang === 'vi-VN' && this.viVoice) utt.voice = this.viVoice;

      this._utteranceRefs = [utt];

      const maxWait = Math.max(5000, text.length * 300);
      let timeoutId: ReturnType<typeof setTimeout>;

      const done = () => { clearTimeout(timeoutId); resolve(); };

      utt.onend = done;
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
          done();
        } else {
          console.warn('[WebSpeech] Error:', e.error);
          done();
        }
      };

      timeoutId = setTimeout(() => {
        console.warn('[WebSpeech] Timeout, forcefully resolving.');
        this.synth?.cancel();
        resolve();
      }, maxWait);

      this.synth.speak(utt);
    });
  }

  // ── Public API ────────────────────────────────────────────────────────

  // Đọc 1 đoạn text với ngôn ngữ xác định
  speak(text: string, options: SpeechOptions): Promise<void> {
    if (!text.trim()) return Promise.resolve();

    // Tiếng Việt: LUÔN dùng online TTS (AudioContext) vì Android hiếm khi có giọng Việt
    if (options.lang === 'vi-VN' && navigator.onLine) {
      return this.speakOnlineTTS(text, 'vi');
    }

    // Tiếng Nhật: Dùng local voice nếu có, nếu không dùng online TTS
    if (options.lang === 'ja-JP') {
      if (this.jaVoice) {
        return this.speakWebSpeech(text, 'ja-JP');
      } else if (navigator.onLine) {
        return this.speakOnlineTTS(text, 'ja');
      }
    }

    // Offline + no local voice
    return Promise.resolve();
  }

  // Đọc chuỗi: Kana → nghĩa Việt → Hán Việt
  async speakFlashcard(kana: string, vietnamese: string, hanViet?: string): Promise<void> {
    this.cancel();
    await resumeAudioContext(); // Unlock AudioContext

    // 1. Đọc Kana bằng giọng Nhật
    if (kana) {
      await this.speak(kana, { lang: 'ja-JP', rate: 0.85 });
      await this.delay(300);
    }

    // 2. Đọc nghĩa tiếng Việt
    if (vietnamese) {
      await this.speak(vietnamese, { lang: 'vi-VN', rate: 0.9 });
      await this.delay(200);
    }

    // 3. Đọc Hán Việt (nếu có)
    const cleanHV = hanViet?.trim();
    if (cleanHV && cleanHV !== 'TỰ' && cleanHV !== 'NULL' && cleanHV !== '') {
      await this.speak(cleanHV, { lang: 'vi-VN', rate: 0.85, pitch: 0.9 });
    }
  }

  // Đọc câu ví dụ tiếng Nhật
  speakJapanese(text: string): void {
    this.cancel();
    this.speak(text, { lang: 'ja-JP', rate: 0.85 }).catch(() => {});
  }

  // Đọc text tiếng Việt
  speakVietnamese(text: string): void {
    this.cancel();
    this.speak(text, { lang: 'vi-VN', rate: 0.9 }).catch(() => {});
  }

  // Đọc nghĩa Tiếng Việt → Hán Việt (dùng cho nút "Tiếng Việt" ở trang Từ vựng)
  async speakVietnameseAndHanViet(vietnamese: string, hanViet?: string): Promise<void> {
    this.cancel();
    await resumeAudioContext();

    if (vietnamese) {
      await this.speak(vietnamese, { lang: 'vi-VN', rate: 0.9 });
      await this.delay(400);
    }

    const cleanHV = hanViet?.trim();
    if (cleanHV && cleanHV !== '' && cleanHV !== 'TỰ' && cleanHV !== 'NULL') {
      await this.speak(cleanHV, { lang: 'vi-VN', rate: 0.85 });
    }
  }

  // Dừng đọc
  cancel(): void {
    this.currentAbortCtrl?.abort();
    this.currentAbortCtrl = null;
    this.synth?.cancel();
    this._utteranceRefs = [];
    this.cancelLegacyAudio();
  }

  // Legacy audio element cleanup
  private cancelLegacyAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
  }

  /**
   * QUAN TRỌNG: Gọi trong user gesture handler (onClick/onTouchStart)
   * để unlock AudioContext trên Android Chrome.
   * Chỉ cần gọi 1 lần duy nhất.
   */
  async unlockAudio(): Promise<void> {
    if (this._audioUnlocked) return;
    await resumeAudioContext();
    this._audioUnlocked = true;

    // Cũng unlock Web Speech API với 1 silent utterance
    if (this.synth) {
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      this.synth.speak(silent);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get isAvailable(): boolean {
    return !!this.synth || !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  get voices() {
    return {
      ja: this.jaVoice?.name || 'Mặc định',
      vi: this.viVoice?.name || 'Mặc định',
    };
  }

  // ── Auto-read sequence ────────────────────────────────────────────────
  private autoReadController: { cancelled: boolean; paused: boolean } | null = null;

  cancelAutoRead() {
    if (this.autoReadController) this.autoReadController.cancelled = true;
    this.cancel();
  }

  pauseAutoRead() {
    if (this.autoReadController) this.autoReadController.paused = true;
    this.cancel();
  }

  resumeAutoRead() {
    if (this.autoReadController) this.autoReadController.paused = false;
  }

  async autoReadWords(
    words: Array<{ kanji: string; kana: string; vietnamese: string; hanViet: string }>,
    config: {
      readKana: boolean;
      readVietnamese: boolean;
      readHanViet: boolean;
      delayBetweenWords: number;
      onWordStart?: (index: number) => void;
      onWordEnd?: (index: number) => void;
    },
    startIndex = 0
  ): Promise<boolean> {
    this.cancelAutoRead();

    // Unlock AudioContext ngay khi bắt đầu auto-read (đã trong user gesture)
    await this.unlockAudio();

    const ctrl = { cancelled: false, paused: false };
    this.autoReadController = ctrl;

    for (let i = startIndex; i < words.length; i++) {
      if (ctrl.cancelled) return false;

      while (ctrl.paused && !ctrl.cancelled) {
        await this.delay(200);
      }
      if (ctrl.cancelled) return false;

      const word = words[i];
      config.onWordStart?.(i);

      await this.delay(50);

      // 1. Read kana (Japanese)
      if (config.readKana && word.kana) {
        await this.speak(word.kana, { lang: 'ja-JP', rate: 0.85 });
        await this.delay(250);
      }

      if (ctrl.cancelled || ctrl.paused) { if (ctrl.paused) { i--; continue; } return false; }

      // 2. Read Han Viet
      if (config.readHanViet && word.hanViet && word.hanViet !== 'NULL' && word.hanViet !== '') {
        await this.speak(word.hanViet, { lang: 'vi-VN', rate: 0.85 });
        await this.delay(200);
      }

      if (ctrl.cancelled) return false;

      // 3. Read Vietnamese meaning
      if (config.readVietnamese && word.vietnamese) {
        await this.speak(word.vietnamese, { lang: 'vi-VN', rate: 0.9 });
      }

      config.onWordEnd?.(i);

      if (i < words.length - 1) {
        await this.delay(config.delayBetweenWords);
      }
    }

    this.autoReadController = null;
    return true;
  }
}

// Singleton
export const speechService = new SpeechService();

// Export bindings for backward compatibility with VocabularyPage
export const speakJapanese = (text: string) => speechService.speakJapanese(text);
export const speakVietnamese = (text: string) => speechService.speakVietnamese(text);
export const speakFlashcard = (kana: string, vietnamese: string, hanViet?: string) => 
  speechService.speakFlashcard(kana, vietnamese, hanViet);
export const autoReadWords = (words: any[], config: any, startIndex = 0) => 
  speechService.autoReadWords(words, config, startIndex);
export const setRate = (rate: number) => speechService.setRate(rate);
export const cancelAutoRead = () => speechService.cancelAutoRead();
export const pauseAutoRead = () => speechService.pauseAutoRead();
export const resumeAutoRead = () => speechService.resumeAutoRead();


// ============================================================
// Speech Recognition – Browser STT (Japanese / Vietnamese)
// ============================================================
export type SpeechRecognitionLang = 'ja-JP' | 'vi-VN';

function formatSpeechRecognitionError(errorCode?: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mic đang bị chặn quyền truy cập. Hãy cho phép microphone trong trình duyệt.';
    case 'audio-capture':
      return 'Không tìm thấy microphone hoạt động trên thiết bị này.';
    case 'network':
      return 'Speech Recognition bị lỗi mạng. Hãy kiểm tra kết nối và thử lại.';
    case 'no-speech':
      return 'Không nghe thấy giọng nói. Hãy nói gần mic hơn và thử lại.';
    case 'aborted':
      return 'Đã dừng ghi âm.';
    default:
      return errorCode ? `Speech Recognition lỗi: ${errorCode}` : 'Speech Recognition gặp lỗi không xác định.';
  }
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening = false;

  constructor(lang: SpeechRecognitionLang = 'ja-JP') {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition!.lang = lang;
      this.recognition!.interimResults = false;
      this.recognition!.maxAlternatives = 1;
    }
  }

  listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech Recognition không được hỗ trợ'));
        return;
      }

      if (this.isListening) {
        this.recognition.stop();
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        this.isListening = false;
        if (!transcript) {
          reject(new Error('Không nhận được nội dung từ microphone.'));
          return;
        }
        resolve(transcript);
      };

      this.recognition.onerror = (e: any) => {
        this.isListening = false;
        reject(new Error(formatSpeechRecognitionError(e?.error)));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (e) {
        this.isListening = false;
        reject(e);
      }
    });
  }

  stop(): void {
    this.recognition?.stop();
    this.isListening = false;
  }

  get available(): boolean {
    return !!this.recognition;
  }

  get listening(): boolean {
    return this.isListening;
  }
}
