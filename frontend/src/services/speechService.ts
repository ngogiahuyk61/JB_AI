// ============================================================
// Speech Service – Web Speech API + ResponsiveVoice (Free)
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

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private _voicesLoaded = false;
  private jaVoice: SpeechSynthesisVoice | null = null;
  private viVoice: SpeechSynthesisVoice | null = null;
  private _utteranceRefs: SpeechSynthesisUtterance[] = []; // GC防止
  private currentAudio: HTMLAudioElement | null = null; // Online fallback
  private _rate = 1.0;

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



  // Đọc online (Primary: C# Backend proxy, Fallback: Google Translate TTS)
  // Backend proxy bypass được Google bot-detection vì là server-to-server request
  private speakOnlineTTS(text: string, lang: string = 'vi'): Promise<void> {
    return new Promise((resolve) => {
      this.cancelOnlineAudio();
      const cleanText = text.slice(0, 200);

      // PRIMARY: Backend proxy (C# API → Google TTS server-side)
      const backendUrl = `${API_BASE}/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
      // FALLBACK: Direct Google URL (đôi khi vẫn hoạt động)
      const googleDirectUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(cleanText)}&tl=${lang}&ttsspeed=0.9`;

      const audio = new Audio();
      audio.defaultPlaybackRate = this._rate;
      audio.playbackRate = this._rate;
      audio.onplay = () => {
        audio.playbackRate = this._rate;
      };
      this.currentAudio = audio;
      const timeout = setTimeout(() => { this.cancelOnlineAudio(); resolve(); }, 10000);

      audio.onended = () => { clearTimeout(timeout); this.cancelOnlineAudio(); resolve(); };

      audio.onerror = () => {
        // Backend proxy thất bại → thử Google URL trực tiếp
        if (audio.src !== googleDirectUrl) {
          audio.src = googleDirectUrl;
          audio.play().catch(() => { clearTimeout(timeout); this.cancelOnlineAudio(); resolve(); });
        } else {
          clearTimeout(timeout); this.cancelOnlineAudio(); resolve();
        }
      };

      audio.src = backendUrl;
      audio.play().catch(() => {
        // Backend không phản hồi → thử Google trực tiếp
        audio.src = googleDirectUrl;
        audio.play().catch(() => { clearTimeout(timeout); this.cancelOnlineAudio(); resolve(); });
      });
    });
  }

  private cancelOnlineAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
  }

  // Đọc 1 đoạn text với ngôn ngữ xác định
  speak(text: string, options: SpeechOptions): Promise<void> {
    if (!text.trim()) return Promise.resolve();

    // Tiếng Việt: Ưu tiên Google TTS online (giọng Việt chuẩn, đã xác nhận hoạt động)
    if (options.lang === 'vi-VN' && navigator.onLine) {
      return this.speakOnlineTTS(text, 'vi');
    }

    // Tiếng Nhật: Nếu không có local ja-JP voice được cài, dùng online TTS để chữa cháy
    if (options.lang === 'ja-JP' && !this.jaVoice && navigator.onLine) {
      return this.speakOnlineTTS(text, 'ja');
    }

    return new Promise((resolve) => {
      if (!this.synth || !text.trim()) {
        resolve();
        return;
      }

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = options.lang;
      utt.rate = this._rate;
      utt.pitch = options.pitch ?? 1.0;
      utt.volume = options.volume ?? 1.0;

      // Gán voice cụ thể nếu tìm thấy, nếu không để browser tự chọn
      if (options.lang === 'ja-JP' && this.jaVoice) utt.voice = this.jaVoice;
      if (options.lang === 'vi-VN' && this.viVoice) utt.voice = this.viVoice;

      // Giữ tham chiếu tránh GC bug Chrome
      this._utteranceRefs = [utt];

      // Đề phòng engine Web Speech bị treo vĩnh viễn trên Android
      const maxWait = Math.max(5000, text.length * 300);
      let timeoutId: any;
      const clearRefs = () => { clearTimeout(timeoutId); };

      utt.onend = () => {
        clearRefs();
        resolve();
      };
      
      utt.onerror = (e) => {
        clearRefs();
        if (e.error === 'interrupted' || e.error === 'canceled') {
          resolve();
        } else if (options.lang === 'vi-VN') {
          this.speakOnlineTTS(text, 'vi').then(resolve).catch(() => resolve());
        } else {
          console.warn('TTS Error:', e.error);
          resolve(); // Resolve to prevent breaking async loops
        }
      };

      timeoutId = setTimeout(() => {
        console.warn('TTS Timeout (engine hang detection), forcefully resolving.', text);
        this.synth?.cancel();
        resolve();
      }, maxWait);

      this.synth.speak(utt);
    });
  }

  // Đọc chuỗi: Kana → nghĩa Việt → Hán Việt
  async speakFlashcard(kana: string, vietnamese: string, hanViet?: string): Promise<void> {
    this.cancel();

    // Unlock audio trên mobile
    this.unlockAudio();

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
    this.unlockAudio();

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
    this.synth?.cancel();
    this._utteranceRefs = [];
    this.cancelOnlineAudio();
  }

  // Unlock audio cho mobile (silent utterance)
  private unlockAudio(): void {
    if (!this.synth) return;
    const silent = new SpeechSynthesisUtterance(' '); // Non-empty string to force engine wake up
    silent.volume = 0;
    this.synth.speak(silent);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get isAvailable(): boolean {
    return !!this.synth;
  }

  get voices() {
    return {
      ja: this.jaVoice?.name || 'Mặc định',
      vi: this.viVoice?.name || 'Mặc định',
    };
  }

  // ── Auto-read sequence (Web Speech API) ────────────────────
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
    // Hủy phiên đọc trước đó (nếu có) để tránh lỗi trùng lặp giọng (ví dụ user click tua nhanh liên tục)
    this.cancelAutoRead();
    
    // Bắt buộc unlock audio ngay khi vừa gọi (rất quan trọng cho Android Mobile để bypass policy)
    this.unlockAudio();

    const ctrl = { cancelled: false, paused: false };
    this.autoReadController = ctrl;

    for (let i = startIndex; i < words.length; i++) {
      if (ctrl.cancelled) return false;

      // Wait if paused
      while (ctrl.paused && !ctrl.cancelled) {
        await this.delay(200);
      }
      if (ctrl.cancelled) return false;

      const word = words[i];
      config.onWordStart?.(i);
      
      // Delay to let React flush the UI update before the speech locks the thread
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

      // Delay between words
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
