import { useState, useEffect, useRef } from 'react';
import { BrainCircuit, X, Mic, MicOff, Send, Loader2, Volume2, Languages, Maximize2, Minimize2 } from 'lucide-react';
import type {
  ChatMessage,
  GuidedAssessment,
  GuidedKaiwaFeedback,
  InteractionMode,
  KaiwaLevel,
  KaiwaSession,
  KaiwaSessionState,
  TurnIntent,
} from '../../types';
import { createInitialKaiwaSession } from '../../types';
import { geminiService, type ChatHistory } from '../../services/geminiService';
import { ollamaService } from '../../services/ollamaService';
import { kaiwaService } from '../../services/kaiwaService';
import { speechService, SpeechRecognizer, type SpeechRecognitionLang } from '../../services/speechService';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import { KAIWA_LEVELS, buildLevelWelcomeText, getKaiwaLevelConfig } from '../../constants/kaiwaLevels';
import { stripChainOfThought } from '../../utils/responseFilter';
import {
  canSendGuidedMessage,
  getMockGuidedReply,
  resolveNextSessionState,
  sessionForOutgoingMessage,
} from '../../utils/kaiwaSession';

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'ai',
  text: 'こんにちは！Sensei AIです。\nChon cap do N5-N1 de luyen Kaiwa, hoac chon Hoi ngu phap de hoi mau cau.',
  timestamp: new Date(),
};

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SESSION_STATE_LABELS: Record<KaiwaSessionState, string> = {
  idle: 'Chua bat dau',
  greeting: 'Dang chao hoi',
  awaiting_answer: 'Cho ban tra loi',
  awaiting_choice: 'Cho ban chon',
  assessing: 'Dang cham diem',
  correcting: 'Dang sua cau',
};

const INTERACTION_MODES: Array<{ id: InteractionMode; label: string; hint: string }> = [
  { id: 'kaiwa_hybrid', label: 'Kaiwa (Noi + Viet)', hint: 'Noi hoac go deu duoc. AI hien text va doc giong.' },
  { id: 'grammar_text', label: 'Hoi ngu phap (Text)', hint: 'Chi text — hoi mau cau, ngu phap, giai thich.' },
];

const VOICE_INPUT_LANGS: Array<{ value: SpeechRecognitionLang; label: string }> = [
  { value: 'ja-JP', label: 'Mic: Tieng Nhat' },
  { value: 'vi-VN', label: 'Mic: Tieng Viet' },
];

const ASSESSMENT_LABELS: Record<GuidedAssessment, string> = {
  correct: 'Dung',
  almost_correct: 'Gan dung',
  incorrect: 'Can sua',
};

function hasJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

function cleanSpeechLine(line: string) {
  return line
    .replace(/^(ja|japanese|romaji|romanji|vi|viet|giai thich|translation|meaning)\s*[:：-]\s*/i, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
}

function extractSpeechText(text: string) {
  const lines = text.split('\n').map(cleanSpeechLine).filter(Boolean);
  const japaneseLine = lines.find(hasJapanese);
  if (japaneseLine) return japaneseLine;
  return lines[0] || text.trim();
}

function extractPrimaryJapaneseLine(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  return lines.find(hasJapanese) || lines[0] || '';
}

function extractTaggedValue(text: string, tag: string) {
  const regex = new RegExp(`^${tag}:\\s*(.*)$`, 'im');
  return text.match(regex)?.[1]?.trim() || '';
}

function extractQuestionFromJa(ja: string) {
  const segments = ja.split(/(?<=[。！？?])/).map(s => s.trim()).filter(Boolean);
  const question = [...segments].reverse().find(s => /[?？]$/.test(s) || /(ます|です|でしょう)か[。?？]?$/.test(s));
  return question || segments[segments.length - 1] || ja;
}

function looksLikeJapaneseQuestion(text: string) {
  const trimmed = text.trim();
  return /[?？]$/.test(trimmed) || /か[。?？]$/.test(trimmed);
}

function normalizeAssessment(value: string): GuidedAssessment {
  switch (value.trim().toLowerCase()) {
    case 'correct': return 'correct';
    case 'almost_correct':
    case 'almost-correct':
    case 'acceptable': return 'almost_correct';
    default: return 'incorrect';
  }
}

function formatGuidedDisplayText(guidedData: GuidedKaiwaFeedback) {
  return [guidedData.mainJa, guidedData.romaji, guidedData.coachingVi].filter(Boolean).join('\n');
}

function parseGuidedKaiwaResponse(
  rawText: string,
  fallbackQuestion: string,
  turnIntent?: TurnIntent,
): { text: string; guidedData: GuidedKaiwaFeedback; nextQuestion: string; nextSuggestions: string[] } {
  const cleaned = stripChainOfThought(rawText);
  const status = turnIntent === 'greeting'
    ? 'correct'
    : normalizeAssessment(extractTaggedValue(cleaned, 'STATUS'));
  const mainJa = extractTaggedValue(cleaned, 'JA') || extractPrimaryJapaneseLine(cleaned);
  const romaji = extractTaggedValue(cleaned, 'RO') || cleaned.split('\n').map(line => line.trim()).filter(Boolean)[1] || '';
  const coachingVi = extractTaggedValue(cleaned, 'VI') || cleaned.split('\n').map(line => line.trim()).filter(Boolean)[2] || '';
  const shadowingJa = extractTaggedValue(cleaned, 'SHADOW') || extractQuestionFromJa(mainJa) || mainJa;
  const shadowingRomaji = extractTaggedValue(cleaned, 'SHADOW_RO') || romaji;
  const extractedQuestion = extractQuestionFromJa(mainJa);

  const guidedData: GuidedKaiwaFeedback = {
    assessment: status,
    mainJa,
    romaji,
    coachingVi,
    shadowingJa,
    shadowingRomaji,
    isGreetingTurn: turnIntent === 'greeting',
    currentQuestion: status === 'incorrect'
      ? fallbackQuestion
      : looksLikeJapaneseQuestion(extractedQuestion)
        ? extractedQuestion
        : fallbackQuestion,
  };

  const nextQuestion = guidedData.currentQuestion || fallbackQuestion;
  const nextSuggestions = status === 'incorrect' && shadowingJa ? [shadowingJa] : [];

  return { text: formatGuidedDisplayText(guidedData), guidedData, nextQuestion, nextSuggestions };
}

function buildSenseiSystemPrompt(session: KaiwaSession, interactionMode: InteractionMode) {
  if (interactionMode === 'grammar_text' || session.learningMode === 'free_chat') {
    return `You are Sensei AI, a Japanese grammar tutor.
Rules:
- Answer in exactly 3 short lines: Japanese, Romaji, Vietnamese explanation.
- Help with grammar patterns, example sentences, and corrections when asked.
- NEVER output thinking, analysis meta-text, or phrases like "let's break this down".
- NEVER analyze a simple greeting unless user asks for grammar help.
- Keep answers under 200 characters total.
- No markdown.`;
  }

  const level = session.selectedLevel;
  const turnIntent = session.turnIntent ?? 'lesson_answer';

  if (turnIntent === 'greeting') {
    return `You are Sensei AI, a natural Japanese conversation partner for ${level} kaiwa.
The user is ONLY greeting you (not answering a lesson question).
Rules:
- Greet back naturally. Match time of day (morning/afternoon/evening) if relevant.
- Ask exactly ONE short ${level} question (e.g. lunch: もうご飯を食べましたか).
- Do NOT assess grammar. Do NOT analyze the user's sentence. Do NOT explain.
- NEVER output thinking or "let's break this down".
Output EXACTLY 5 lines:
STATUS: correct
JA: [greeting + one question in Japanese]
RO: romaji
VI: one short Vietnamese encouragement
SHADOW: the question part only`;
  }

  return `You are Sensei AI, a fast Japanese speaking coach for guided ${level} kaiwa.
Current question: ${session.currentQuestion || 'Continue with one short question.'}
Last assessment: ${session.lastAssessment || 'none'}
The user is ANSWERING the lesson question. Assess their grammar/vocabulary.
Output EXACTLY 5 lines:
STATUS: correct | almost_correct | incorrect
JA: next question OR corrected sentence
RO: romaji
VI: one short Vietnamese coaching line
SHADOW: short line to repeat
Rules:
- NEVER output thinking or analysis meta-text.
- If correct: praise briefly in VI, JA = next short ${level} question.
- If incorrect: JA = corrected sentence, keep same topic question after user repeats.
- One question at a time. Stay at ${level} level.`;
}

function sanitizeAiReply(raw: string, session: KaiwaSession): string {
  const cleaned = stripChainOfThought(raw);
  if (cleaned) return cleaned;
  if (session.learningMode === 'guided_kaiwa') {
    return getMockGuidedReply('', session);
  }
  return 'すみません。もう一度お願いします。\nSumimasen. Mou ichido onegaishimasu.\nXin loi, hay thu lai nhe.';
}

export default function FloatingChat({ isOpen, onClose }: FloatingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [engine, setEngine] = useState<'Qwen3 (Local)' | 'Gemini' | 'Demo'>('Demo');
  const [kaiwaSession, setKaiwaSession] = useState<KaiwaSession>(createInitialKaiwaSession);
  const [guidedSuggestions, setGuidedSuggestions] = useState<string[]>([]);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('kaiwa_hybrid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speechLang, setSpeechLang] = useState<SpeechRecognitionLang>('ja-JP');
  const [voiceError, setVoiceError] = useState('');
  const deviceLayout = useDeviceLayout();
  const endRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isKaiwaHybrid = interactionMode === 'kaiwa_hybrid';
  const isGuided = kaiwaSession.learningMode === 'guided_kaiwa';
  const currentQuestion = kaiwaSession.currentQuestion;
  const currentInteraction = INTERACTION_MODES.find(m => m.id === interactionMode) ?? INTERACTION_MODES[0];
  const levelConfig = getKaiwaLevelConfig(kaiwaSession.selectedLevel);

  useEffect(() => {
    recognizerRef.current = new SpeechRecognizer(speechLang);
  }, [speechLang]);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 300);
      const detectEngine = async () => {
        const isOllamaOnline = await ollamaService.checkHealth();
        if (isOllamaOnline) setEngine('Qwen3 (Local)');
        else if (geminiService.isAvailable()) setEngine('Gemini');
        else setEngine('Demo');
      };
      detectEngine();
    }
  }, [isOpen]);

  useEffect(() => {
    const updateViewportHeight = () => {
      const nextHeight = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-viewport-height', `${nextHeight}px`);
    };

    updateViewportHeight();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const overlayClass = [
    'chat-overlay',
    deviceLayout === 'mobile' ? 'chat-overlay--mobile' : 'chat-overlay--desktop',
    isFullscreen ? 'chat-overlay--fullscreen' : '',
  ].filter(Boolean).join(' ');

  const speakAssistantReply = (message: ChatMessage | string, force = false) => {
    if (!force && !isKaiwaHybrid) return;
    const speechSource = typeof message === 'string'
      ? message
      : message.guidedData?.shadowingJa || message.guidedData?.mainJa || message.text;
    const speechText = extractSpeechText(speechSource).slice(0, 200);
    if (!speechText) return;
    if (hasJapanese(speechText)) speechService.speakJapanese(speechText);
    else speechService.speakVietnamese(speechText);
  };

  const addMessage = (role: 'user' | 'ai', text: string, guidedData?: GuidedKaiwaFeedback) => {
    const msg: ChatMessage = { id: Date.now().toString(), role, text, guidedData, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const replaceConversationWithAi = (
    text: string,
    nextQuestion = '',
    nextSuggestions: string[] = [],
    guidedData?: GuidedKaiwaFeedback,
    sessionPatch?: Partial<KaiwaSession>,
  ) => {
    const aiMessage: ChatMessage = { id: Date.now().toString(), role: 'ai', text, guidedData, timestamp: new Date() };
    setMessages([aiMessage]);
    setHistory([{ role: 'model', text }]);
    setKaiwaSession(prev => ({ ...prev, currentQuestion: nextQuestion, ...sessionPatch }));
    setGuidedSuggestions(nextSuggestions);
    setInput('');
    setVoiceError('');
  };

  const startGuidedLesson = (level: KaiwaLevel) => {
    const config = getKaiwaLevelConfig(level);
    const starterGuidedData: GuidedKaiwaFeedback = {
      assessment: 'correct',
      mainJa: config.greetingQuestion,
      romaji: config.greetingQuestionRo,
      coachingVi: config.welcomeVi,
      shadowingJa: config.greetingQuestion,
      shadowingRomaji: config.greetingQuestionRo,
      currentQuestion: config.greetingQuestion,
      isGreetingTurn: true,
    };
    setInteractionMode('kaiwa_hybrid');
    replaceConversationWithAi(
      buildLevelWelcomeText(level),
      config.greetingQuestion,
      [...config.suggestions],
      starterGuidedData,
      {
        learningMode: 'guided_kaiwa',
        selectedLevel: level,
        currentQuestion: config.greetingQuestion,
        lastAssessment: undefined,
        sessionState: 'awaiting_answer',
        turnIntent: undefined,
      },
    );
  };

  const startGrammarChat = () => {
    setInteractionMode('grammar_text');
    setKaiwaSession({
      ...createInitialKaiwaSession(),
      learningMode: 'free_chat',
      sessionState: 'idle',
    });
    setGuidedSuggestions([]);
    setMessages([{
      ...WELCOME_MSG,
      text: 'Hoi ngu phap, mau cau, hoac nho sua cau.\nVi du: "て形 là gì?" hoac "Sửa câu: 私は食べるりんご"',
    }]);
    setHistory([]);
    setInput('');
    setVoiceError('');
  };

  const applyGuidedReply = (rawText: string, turnIntent?: TurnIntent, targetMessageId?: string) => {
    const parsed = parseGuidedKaiwaResponse(rawText, currentQuestion, turnIntent);
    const nextState = turnIntent === 'greeting'
      ? 'awaiting_answer'
      : resolveNextSessionState(parsed.guidedData.assessment);

    if (targetMessageId) {
      setMessages(prev =>
        prev.map(msg => msg.id === targetMessageId ? { ...msg, text: parsed.text, guidedData: parsed.guidedData } : msg)
      );
    }

    setKaiwaSession(prev => ({
      ...prev,
      currentQuestion: parsed.nextQuestion,
      lastAssessment: turnIntent === 'greeting' ? undefined : parsed.guidedData.assessment,
      sessionState: nextState,
      turnIntent: undefined,
    }));
    setGuidedSuggestions(parsed.nextSuggestions);
    return parsed;
  };

  const buildChatOptions = (session: KaiwaSession) => {
    const guided = session.learningMode === 'guided_kaiwa';
    return {
      systemPrompt: buildSenseiSystemPrompt(session, interactionMode),
      mode: guided ? 'guided_kaiwa' as const : 'free_chat' as const,
      level: guided ? session.selectedLevel : undefined,
      currentQuestion: guided ? session.currentQuestion : undefined,
      lastAssessment: guided ? session.lastAssessment : undefined,
      sessionState: guided ? session.sessionState : undefined,
      turnIntent: guided ? session.turnIntent : undefined,
      maxHistoryTurns: guided ? 4 : 6,
    };
  };

  const processAiReply = async (text: string, activeSession: KaiwaSession, newHistory: ChatHistory[]) => {
    const chatOptions = buildChatOptions(activeSession);
    const isGuided = activeSession.learningMode === 'guided_kaiwa';
    const turnIntent = activeSession.turnIntent;

    const isOllamaOnline = await ollamaService.checkHealth();

    if (isOllamaOnline) {
      setEngine('Qwen3 (Local)');
      if (isGuided) {
        const rawReply = sanitizeAiReply(await ollamaService.sendMessage(text, history, chatOptions), activeSession);
        const parsed = applyGuidedReply(rawReply, turnIntent);
        const aiMessage = addMessage('ai', parsed.text, parsed.guidedData);
        setHistory([...newHistory, { role: 'model', text: parsed.text }]);
        speakAssistantReply(aiMessage);
        return;
      }
      const aiMsgId = Date.now().toString();
      setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '', timestamp: new Date() }]);
      let responseText = '';
      await ollamaService.streamMessage(
        text, history,
        (chunk) => {
          responseText += chunk;
          const display = stripChainOfThought(responseText) || responseText;
          setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: display } : msg));
        },
        (fullText) => {
          const display = stripChainOfThought(fullText) || fullText;
          setHistory([...newHistory, { role: 'model', text: display }]);
        },
        chatOptions,
      );
      return;
    }

    if (geminiService.isAvailable()) {
      setEngine('Gemini');
      const reply = sanitizeAiReply(await geminiService.sendChatMessage(text, history, chatOptions), activeSession);
      if (isGuided) {
        const parsed = applyGuidedReply(reply, turnIntent);
        const aiMessage = addMessage('ai', parsed.text, parsed.guidedData);
        setHistory([...newHistory, { role: 'model', text: parsed.text }]);
        speakAssistantReply(aiMessage);
        return;
      }
      addMessage('ai', reply);
      setHistory([...newHistory, { role: 'model', text: reply }]);
      return;
    }

    setEngine('Demo');
    await new Promise(r => setTimeout(r, 600));
    const reply = isGuided
      ? getMockGuidedReply(text, activeSession)
      : getMockGrammarReply(text);
    if (isGuided) {
      const parsed = applyGuidedReply(reply, turnIntent);
      const aiMessage = addMessage('ai', parsed.text, parsed.guidedData);
      setHistory([...newHistory, { role: 'model', text: parsed.text }]);
      speakAssistantReply(aiMessage);
      return;
    }
    addMessage('ai', reply);
    setHistory([...newHistory, { role: 'model', text: reply }]);
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isThinking) return;

    if (isGuided) {
      if (kaiwaSession.sessionState === 'assessing') return;
      if (!canSendGuidedMessage(kaiwaSession)) {
        addMessage('ai', 'Hay chon cap do N5-N1 de bat dau bai Kaiwa.');
        setInput('');
        return;
      }
    }

    setInput('');
    addMessage('user', text);
    setIsThinking(true);
    setGuidedSuggestions([]);

    const activeSession: KaiwaSession = isGuided
      ? sessionForOutgoingMessage(kaiwaSession, text)
      : { ...kaiwaSession, turnIntent: 'grammar_question' as TurnIntent };

    if (isGuided) setKaiwaSession(activeSession);

    const newHistory: ChatHistory[] = [...history, { role: 'user', text }];

    try {
      await processAiReply(text, activeSession, newHistory);
    } catch (e: unknown) {
      console.error(e);
      if (isGuided) {
        setKaiwaSession(prev => ({
          ...prev,
          sessionState: prev.currentQuestion ? 'awaiting_answer' : 'idle',
        }));
      }
      const msg = e instanceof Error ? e.message : String(e);
      addMessage('ai', `Loi ket noi AI: ${msg}`);
    } finally {
      setIsThinking(false);
    }
  };

  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'];
    return preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startMediaRecording = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Mic chỉ hoạt động khi trang mở bằng HTTPS hoặc localhost. Hãy mở bằng URL bảo mật trên điện thoại.');
      setIsListening(false);
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setVoiceError('Thiết bị này không hỗ trợ thu âm trực tiếp. Hãy thử Chrome/Edge mới hơn.');
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setVoiceError('Ghi âm bị lỗi. Hãy thử lại sau.');
        setIsListening(false);
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.onstop = async () => {
        const blobType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        setIsListening(false);
        setVoiceError('');

        try {
          const transcript = await kaiwaService.transcribeAudio(audioBlob);
          if (!transcript?.trim()) {
            setVoiceError('Không nghe rõ giọng nói. Hãy thử lại.');
            return;
          }
          await handleSend(transcript);
        } catch (error) {
          console.error('Audio transcription failed', error);
          setVoiceError('Không thể nhận diện giọng nói. Hãy thử lại.');
        }
      };

      recorder.start();
      setIsListening(true);
    } catch (error) {
      console.error('Microphone access failed', error);
      setIsListening(false);
      setVoiceError('Không thể truy cập Microphone. Hãy cấp quyền mic trong trình duyệt.');
    }
  };

  const toggleMic = async () => {
    if (!isKaiwaHybrid) return;

    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        return;
      }
      if (recognizerRef.current?.listening) {
        recognizerRef.current.stop();
        setIsListening(false);
        return;
      }
      setIsListening(false);
      return;
    }

    setVoiceError('');
    setIsListening(true);

    if (recognizerRef.current?.available) {
      try {
        const transcript = await recognizerRef.current.listen();
        setIsListening(false);
        await handleSend(transcript);
        return;
      } catch (error) {
        console.warn('Speech recognition unavailable, falling back to recording', error);
      }
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setIsListening(false);
      setVoiceError('Thiết bị này chưa hỗ trợ thu âm. Hãy dùng Chrome hoặc Edge trên Android.');
      return;
    }

    await startMediaRecording();
  };

  if (!isOpen) return null;

  return (
    <div className={overlayClass}>
      <div className="chat-header">
        <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrainCircuit size={18} style={{ color: '#c7d2fe' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 14 }}>Sensei AI</p>
          <p style={{ fontSize: 11, opacity: .7, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
            {engine} · {deviceLayout === 'mobile' ? 'Mobile' : 'Desktop'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen(v => !v)}
          aria-label={isFullscreen ? 'Thu nho' : 'Phong to'}
          style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>

      <div className="chat-mode-bar">
        <div className="chat-mode-title">
          <Languages size={13} />
          <span>Cap do Kaiwa</span>
        </div>
        <div className="chat-level-row">
          {KAIWA_LEVELS.map(level => (
            <button
              key={level.id}
              type="button"
              className={`chat-mode-chip ${isGuided && kaiwaSession.selectedLevel === level.id ? 'active' : ''}`}
              onClick={() => startGuidedLesson(level.id)}
            >
              {level.label}
            </button>
          ))}
        </div>
        <p className="chat-mode-hint">{isGuided ? levelConfig.shortHint : 'Chon cap do de bat dau Kaiwa.'}</p>

        {isGuided && (
          <p className="chat-mode-hint" style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>
            {SESSION_STATE_LABELS[kaiwaSession.sessionState]}
            {currentQuestion ? ` · ${currentQuestion}` : ''}
            {kaiwaSession.lastAssessment ? ` · ${ASSESSMENT_LABELS[kaiwaSession.lastAssessment]}` : ''}
          </p>
        )}

        <div style={{ height: 1, background: 'rgba(148, 163, 184, 0.25)', margin: '10px 0' }} />

        <div className="chat-mode-title">
          <Languages size={13} />
          <span>Che do</span>
        </div>
        <div className="chat-mode-chip-row">
          {INTERACTION_MODES.map(mode => (
            <button
              key={mode.id}
              type="button"
              className={`chat-mode-chip ${interactionMode === mode.id ? 'active' : ''}`}
              onClick={() => {
                if (mode.id === 'kaiwa_hybrid') {
                  startGuidedLesson(kaiwaSession.selectedLevel);
                } else {
                  startGrammarChat();
                }
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {isKaiwaHybrid && (
          <div style={{ marginTop: 8 }}>
            <select
              value={speechLang}
              onChange={e => setSpeechLang(e.target.value as SpeechRecognitionLang)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color, #cbd5e1)', background: 'white', fontSize: 12, fontWeight: 600 }}
            >
              {VOICE_INPUT_LANGS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        )}
        <p className="chat-mode-hint">{currentInteraction.hint}</p>
        {voiceError && <p className="chat-mode-hint" style={{ color: 'var(--danger, #dc2626)' }}>{voiceError}</p>}
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg ${msg.role}`}>
            {msg.role === 'ai' && (
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', borderRadius: '50%', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={12} style={{ color: 'white' }} />
              </div>
            )}
            <div className="msg-bubble" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msg.guidedData && !msg.guidedData.isGreetingTurn && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: msg.guidedData.assessment === 'incorrect' ? '#fee2e2' : msg.guidedData.assessment === 'almost_correct' ? '#fef3c7' : '#dcfce7',
                    color: msg.guidedData.assessment === 'incorrect' ? '#b91c1c' : msg.guidedData.assessment === 'almost_correct' ? '#b45309' : '#166534',
                  }}>
                    {ASSESSMENT_LABELS[msg.guidedData.assessment]}
                  </span>
                </div>
              )}
              {msg.text && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
              {msg.guidedData?.shadowingJa && msg.guidedData.assessment !== 'correct' && !msg.guidedData.isGreetingTurn && (
                <div style={{ marginTop: 2, padding: '8px 10px', borderRadius: 10, background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.14)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Mau lap lai</div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>{msg.guidedData.shadowingJa}</div>
                  {msg.guidedData.shadowingRomaji && (
                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>{msg.guidedData.shadowingRomaji}</div>
                  )}
                </div>
              )}
            </div>
            {msg.role === 'ai' && msg.id !== 'welcome' && isKaiwaHybrid && (
              <button type="button" onClick={() => speakAssistantReply(msg, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 4px' }}>
                <Volume2 size={12} /> Nghe lai
              </button>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="msg ai">
            <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sensei dang soan...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {guidedSuggestions.length > 0 && isGuided && (
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {guidedSuggestions.map(s => (
            <button key={s} type="button" onClick={() => handleSend(s)} style={{ fontSize: 12, padding: '5px 10px', background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 99, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!isKaiwaHybrid}
          className={deviceLayout === 'mobile' ? 'chat-mic-btn--mobile' : ''}
          style={{
            width: deviceLayout === 'mobile' ? 48 : 40,
            height: deviceLayout === 'mobile' ? 48 : 40,
            borderRadius: 10, border: 'none', cursor: isKaiwaHybrid ? 'pointer' : 'default',
            background: !isKaiwaHybrid ? '#e2e8f0' : isListening ? '#fee2e2' : 'var(--primary-50)',
            color: !isKaiwaHybrid ? 'var(--text-muted)' : isListening ? 'var(--danger)' : 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isListening ? 'pulse 1s ease infinite' : 'none',
            flexShrink: 0, opacity: isKaiwaHybrid ? 1 : 0.5,
          }}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={
            isListening
              ? `Dang nghe ${speechLang === 'ja-JP' ? 'tieng Nhat' : 'tieng Viet'}...`
              : isKaiwaHybrid
                ? currentQuestion
                  ? 'Noi hoac go cau tra loi...'
                  : 'Chon cap do N5-N1 de bat dau Kaiwa...'
                : 'Hoi ngu phap, mau cau, hoac nho sua cau...'
          }
          disabled={isListening || isThinking}
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || isThinking}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: !input.trim() || isThinking ? 0.5 : 1, flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function getMockGrammarReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('て form') || lower.includes('te form') || lower.includes('て形')) {
    return 'て形は動詞をつなぐ形です。食べる→食べて、買う→買って。\nTe-kei wa doushi o tsunagu katachi desu.\nTe-form dung de noi dong tu. Vi du: 食べる→食べて.';
  }
  if (lower.includes('sửa') || lower.includes('sua')) {
    return '正しい文：私はりんごを食べます。\nTadashii bun: Watashi wa ringo o tabemasu.\nCau dung: Toi an qua tao.';
  }
  return `「${text}」について説明します。\n"${text}" ni tsuite setsumei shimasu.\nMinh giai thich ngan ve cau hoi nay.`;
}
