// ============================================================
// Speech Service – AudioContext TTS (Android-safe, production-ready)
// ============================================================

import { API_BASE as CONFIG_API_BASE } from '../config/api';

// ── Production URL auto-detection ─────────────────────────────────────────
// Nếu Cloudflare Pages chưa set VITE_API_BASE_URL (build ra localhost),
// tự động dùng Render backend khi chạy trên production domain.
function resolveApiBase(): string {
  if (typeof window === 'undefined') return CONFIG_API_BASE;
  const host = window.location.hostname;
  // Nếu đang chạy trên production nhưng API_BASE vẫn là localhost → fallback
  if (
    CONFIG_API_BASE.includes('localhost') &&
    !host.includes('localhost') &&
    !host.includes('127.0.0.1')
  ) {
    return 'https://japaneseai-api.onrender.com/api';
  }
  return CONFIG_API_BASE;
}

const API_BASE = resolveApiBase();

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
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

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

function playAudioBuffer(arrayBuffer: ArrayBuffer, rate: number): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
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

// ── Google TTS qua Audio Element (tránh CORS với fetch) ──────────────────
// Audio Element không cần CORS preflight nên bypass được restriction
function playGoogleTTSViaAudioElement(text: string, lang: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const cleanText = text.slice(0, 200);
    const urls = [
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&q=${encodeURIComponent(cleanText)}&tl=${lang}&ttsspeed=0.9`,
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(cleanText)}&tl=${lang}&ttsspeed=0.9`,
    ];

    let urlIndex = 0;

    const tryNext = () => {
      if (urlIndex >= urls.length) { resolve(false); return; }
      const audio = new Audio();
      audio.crossOrigin = 'anonymous'; // thử với CORS header
      audio.defaultPlaybackRate = rate;

      const timeout = setTimeout(() => { audio.src = ''; resolve(false); }, 8000);

      audio.onended = () => { clearTimeout(timeout); resolve(true); };
      audio.onerror = () => {
        clearTimeout(timeout);
        // Thử không có crossOrigin (chấp nhận opaque, chỉ phát không cần decode)
        if (audio.crossOrigin === 'anonymous') {
          const audio2 = new Audio(urls[urlIndex]);
          audio2.defaultPlaybackRate = rate;
          const t2 = setTimeout(() => { audio2.src = ''; urlIndex++; tryNext(); }, 8000);
          audio2.onended = () => { clearTimeout(t2); resolve(true); };
          audio2.onerror = () => { clearTimeout(t2); urlIndex++; tryNext(); };
          audio2.play().catch(() => { clearTimeout(t2); urlIndex++; tryNext(); });
        } else {
          urlIndex++;
          tryNext();
        }
      };

      audio.src = urls[urlIndex];
      audio.play().catch(() => {
        clearTimeout(timeout);
        urlIndex++;
        tryNext();
      });
    };

    tryNext();
  });
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private _voicesLoaded = false;
  private jaVoice: SpeechSynthesisVoice | null = null;
  private viVoice: SpeechSynthesisVoice | null = null;
  private _utteranceRefs: SpeechSynthesisUtterance[] = [];
  private currentAbortCtrl: AbortController | null = null;
  private _rate = 1.0;
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
    console.log('[TTS] Voices loaded. ja:', this.jaVoice?.name, 'vi:', this.viVoice?.name);
  }

  /**
   * Android Chrome: getVoices() trả empty lần đầu, phải đợi voiceschanged.
   * Hàm này chờ tối đa 1s.
   */
  private async ensureVoicesLoaded(): Promise<void> {
    if (this._voicesLoaded || !this.synth) return;
    const voices = this.synth.getVoices();
    if (voices.length > 0) { this.loadVoices(); return; }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => { resolve(); }, 1000);
      const handler = () => {
        clearTimeout(timeout);
        this.loadVoices();
        resolve();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
    });
  }

  // ── Backend proxy (C# → Google TTS server-side, qua AudioContext) ────────
  private async speakViaBackendProxy(text: string, lang: string): Promise<boolean> {
    const cleanText = text.slice(0, 200);
    const backendUrl = `${API_BASE}/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;

    this.currentAbortCtrl?.abort();
    const ctrl = new AbortController();
    this.currentAbortCtrl = ctrl;

    try {
      console.log('[TTS] Trying backend proxy:', backendUrl.substring(0, 60));
      const res = await fetch(backendUrl, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength < 500) throw new Error('Audio too small');

      await resumeAudioContext();
      await playAudioBuffer(arrayBuffer, this._rate);
      console.log('[TTS] Backend proxy OK');
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return false;
      console.warn('[TTS] Backend proxy failed:', e?.message);
      return false;
    }
  }

  // ── Web Speech API (local TTS engine) ────────────────────────────────────
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
          console.warn('[WebSpeech] Error:', e.error, '| lang:', lang, '| voice:', utt.voice?.name);
          done();
        }
      };

      timeoutId = setTimeout(() => {
        console.warn('[WebSpeech] Timeout, resolving.');
        this.synth?.cancel();
        resolve();
      }, maxWait);

      this.synth.speak(utt);
    });
  }

  // ── Public: speak() ───────────────────────────────────────────────────────
  async speak(text: string, options: SpeechOptions): Promise<void> {
    if (!text.trim()) return;

    // Đảm bảo voices đã load (fix Android race condition)
    await this.ensureVoicesLoaded();

    if (options.lang === 'ja-JP') {
      // Tiếng Nhật: Ưu tiên Web Speech (Android Chrome có sẵn ja-JP voice)
      if (this.jaVoice) {
        console.log('[TTS] Japanese via WebSpeech:', this.jaVoice.name);
        return this.speakWebSpeech(text, 'ja-JP');
      }
      // Không có local voice → dùng backend proxy
      if (navigator.onLine) {
        const ok = await this.speakViaBackendProxy(text, 'ja');
        if (ok) return;
        // Fallback: Google direct qua Audio Element (không cần CORS)
        await playGoogleTTSViaAudioElement(text, 'ja', this._rate);
      }
      return;
    }

    if (options.lang === 'vi-VN') {
      // Tiếng Việt: ưu tiên backend proxy (Google TTS), vì Android không có giọng Việt
      if (navigator.onLine) {
        const ok = await this.speakViaBackendProxy(text, 'vi');
        if (ok) return;
        // Fallback: Google direct qua Audio Element
        const googleOk = await playGoogleTTSViaAudioElement(text, 'vi', this._rate);
        if (googleOk) return;
        // Last resort: nếu có giọng Việt local
        if (this.viVoice) {
          return this.speakWebSpeech(text, 'vi-VN');
        }
        console.warn('[TTS] Vietnamese TTS: tất cả phương án thất bại. Backend URL:', API_BASE);
      } else if (this.viVoice) {
        return this.speakWebSpeech(text, 'vi-VN');
      }
    }
  }

  // ── Speak flashcard: Kana → Việt → HánViệt ───────────────────────────────
  async speakFlashcard(kana: string, vietnamese: string, hanViet?: string): Promise<void> {
    this.cancel();
    await this.unlockAudio();

    if (kana) {
      await this.speak(kana, { lang: 'ja-JP', rate: 0.85 });
      await this.delay(300);
    }

    if (vietnamese) {
      await this.speak(vietnamese, { lang: 'vi-VN', rate: 0.9 });
      await this.delay(200);
    }

    const cleanHV = hanViet?.trim();
    if (cleanHV && cleanHV !== 'TỰ' && cleanHV !== 'NULL' && cleanHV !== '') {
      await this.speak(cleanHV, { lang: 'vi-VN', rate: 0.85, pitch: 0.9 });
    }
  }

  speakJapanese(text: string): void {
    this.cancel();
    this.unlockAudioSync();
    this.speak(text, { lang: 'ja-JP', rate: 0.85 }).catch(() => {});
  }

  speakVietnamese(text: string): void {
    this.cancel();
    this.unlockAudioSync();
    this.speak(text, { lang: 'vi-VN', rate: 0.9 }).catch(() => {});
  }

  async speakVietnameseAndHanViet(vietnamese: string, hanViet?: string): Promise<void> {
    this.cancel();
    await this.unlockAudio();

    if (vietnamese) {
      await this.speak(vietnamese, { lang: 'vi-VN', rate: 0.9 });
      await this.delay(400);
    }

    const cleanHV = hanViet?.trim();
    if (cleanHV && cleanHV !== '' && cleanHV !== 'TỰ' && cleanHV !== 'NULL') {
      await this.speak(cleanHV, { lang: 'vi-VN', rate: 0.85 });
    }
  }

  cancel(): void {
    this.currentAbortCtrl?.abort();
    this.currentAbortCtrl = null;
    this.synth?.cancel();
    this._utteranceRefs = [];
  }

  /**
   * PHẢI gọi trong user gesture (onClick) để unlock AudioContext trên Android/iOS.
   */
  async unlockAudio(): Promise<void> {
    this.unlockAudioSync();
    await resumeAudioContext();
  }

  /**
   * Chạy đồng bộ hoàn toàn để không mất "user gesture" context trên iOS Safari
   */
  unlockAudioSync(): void {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}

    if (this.synth) {
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      this.synth.speak(silent);
    }
    console.log('[TTS] Audio unlocked synchronously');
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

  // ── Auto-read ──────────────────────────────────────────────────────────────
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

      if (config.readKana && word.kana) {
        await this.speak(word.kana, { lang: 'ja-JP', rate: 0.85 });
        await this.delay(250);
      }

      if (ctrl.cancelled || ctrl.paused) { if (ctrl.paused) { i--; continue; } return false; }

      if (config.readHanViet && word.hanViet && word.hanViet !== 'NULL' && word.hanViet !== '') {
        await this.speak(word.hanViet, { lang: 'vi-VN', rate: 0.85 });
        await this.delay(200);
      }

      if (ctrl.cancelled) return false;

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

// Export bindings for backward compatibility
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
// Speech Recognition – Browser STT
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
