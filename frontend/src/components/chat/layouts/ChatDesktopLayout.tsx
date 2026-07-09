import type { KeyboardEvent } from 'react';
import { BrainCircuit, X, Mic, MicOff, Send, Loader2, Volume2, Languages, Maximize2, Minimize2, Smartphone, BookOpen, ArrowRight } from 'lucide-react';
import type { ChatLayoutProps } from './ChatMobileLayout';
import { KAIWA_LEVELS, getKaiwaLevelConfig } from '../../../constants/kaiwaLevels';

const SESSION_STATE_LABELS: Record<string, string> = {
  idle: 'Chưa bắt đầu',
  greeting: 'Đang chào hỏi',
  awaiting_answer: 'Chờ bạn trả lời',
  assessing: 'Đang chấm điểm',
  correcting: 'Đang sửa câu',
  awaiting_choice: 'Chọn hành động tiếp theo',
};

const ASSESSMENT_LABELS = {
  correct: 'Đúng',
  almost_correct: 'Gần đúng',
  incorrect: 'Cần sửa',
};

export default function ChatDesktopLayout({
  messages,
  input,
  setInput,
  isThinking,
  isListening,
  engine,
  kaiwaSession,
  guidedSuggestions,
  interactionMode,
  isFullscreen,
  toggleFullscreen,
  speechLang,
  setSpeechLang,
  voiceError,
  toggleLayoutOverride,
  onClose,
  handleSend,
  toggleMic,
  startGuidedLesson,
  startGrammarChat,
  speakAssistantReply,
  handleGrammarExamples,
  handleNextKaiwaQuestion,
  inputRef,
  endRef,
}: ChatLayoutProps) {
  const isGuided = kaiwaSession.learningMode === 'guided_kaiwa';
  const isKaiwaHybrid = interactionMode === 'kaiwa_hybrid';
  const levelConfig = getKaiwaLevelConfig(kaiwaSession.selectedLevel);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', height: '100%' }}>
      {/* Header */}
      <div className="chat-header">
        <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrainCircuit size={18} style={{ color: '#c7d2fe' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 14 }}>Sensei AI (PC Mode)</p>
          <p style={{ fontSize: 11, opacity: .7, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
            {engine} · Desktop Layout
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={toggleLayoutOverride}
            title="Chuyển sang Giao diện Điện thoại"
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Smartphone size={16} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Mode bar */}
      <div className="chat-mode-bar">
        <div className="chat-mode-title">
          <Languages size={13} />
          <span>Cấp độ JLPT</span>
        </div>
        <div className="chat-level-row" style={{ flexWrap: 'wrap', overflowX: 'visible', gap: '8px' }}>
          {KAIWA_LEVELS.map(level => (
            <button
              key={level.id}
              type="button"
              className={`chat-mode-chip ${isGuided && kaiwaSession.selectedLevel === level.id ? 'active' : ''}`}
              onClick={() => startGuidedLesson(level.id)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {level.label}
            </button>
          ))}
        </div>
        <p className="chat-mode-hint">{isGuided ? levelConfig.shortHint : 'Chọn cấp độ để bắt đầu Kaiwa.'}</p>

        {isGuided && (
          <p className="chat-mode-hint" style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700, marginTop: 6 }}>
            {SESSION_STATE_LABELS[kaiwaSession.sessionState]}
            {kaiwaSession.currentQuestion ? ` · ${kaiwaSession.currentQuestion}` : ''}
            {kaiwaSession.lastAssessment ? ` · ${ASSESSMENT_LABELS[kaiwaSession.lastAssessment]}` : ''}
          </p>
        )}

        <div style={{ height: 1, background: 'rgba(148, 163, 184, 0.25)', margin: '8px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`chat-mode-chip ${interactionMode === 'kaiwa_hybrid' ? 'active' : ''}`}
              onClick={() => startGuidedLesson(kaiwaSession.selectedLevel)}
            >
              Kaiwa (Nói + Viết)
            </button>
            <button
              type="button"
              className={`chat-mode-chip ${interactionMode === 'grammar_text' ? 'active' : ''}`}
              onClick={startGrammarChat}
            >
              Hỏi ngữ pháp (Text)
            </button>
          </div>

          {isKaiwaHybrid && (
            <div style={{ minWidth: 120 }}>
              <select
                value={speechLang}
                onChange={e => setSpeechLang(e.target.value as any)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border-color, #cbd5e1)', background: 'white', fontSize: 11, fontWeight: 600 }}
              >
                <option value="ja-JP">Mic: Tiếng Nhật</option>
                <option value="vi-VN">Mic: Tiếng Việt</option>
              </select>
            </div>
          )}
        </div>
        {voiceError && <p className="chat-mode-hint" style={{ color: 'var(--danger, #dc2626)', marginTop: 4 }}>{voiceError}</p>}
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ fontSize: '15px' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`msg ${msg.role}`}>
            {msg.role === 'ai' && (
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', borderRadius: '50%', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={12} style={{ color: 'white' }} />
              </div>
            )}
            <div className="msg-bubble" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msg.text && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
              {msg.guidedData && !msg.guidedData.isGreetingTurn && msg.role === 'ai' && msg.id !== 'welcome' && (
                <div style={{ marginTop: 6, padding: '10px 12px', borderRadius: 12, background: 'rgba(79, 70, 229, 0.04)', border: '1px solid rgba(79, 70, 229, 0.15)' }}>
                  {msg.metadata && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      {msg.metadata.lessonNumber && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#e0e7ff', color: '#4338ca' }}>
                          Bài {msg.metadata.lessonNumber}
                        </span>
                      )}
                      {msg.metadata.grammarPoint && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8' }}>
                          {msg.metadata.grammarPoint}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.guidedData.mainJa}</div>
                  {msg.guidedData.romaji && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{msg.guidedData.romaji}</div>}
                  {msg.guidedData.coachingVi && <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 6, fontWeight: 500 }}>{msg.guidedData.coachingVi}</div>}
                </div>
              )}
            </div>
            {msg.role === 'ai' && msg.id !== 'welcome' && isKaiwaHybrid && (
              <button type="button" onClick={() => speakAssistantReply(msg, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 4px' }}>
                <Volume2 size={12} /> Nghe lại
              </button>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="msg ai">
            <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sensei đang soạn...</span>
            </div>
          </div>
        )}
        <div ref={endRef as any} />
      </div>

      {/* Choice Buttons for Correction flow */}
      {kaiwaSession.sessionState === 'awaiting_choice' && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: 8, justifyContent: 'center', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={handleGrammarExamples}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px',
              color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <BookOpen size={14} style={{ color: 'var(--primary)' }} />
            Thêm ví dụ ngữ pháp
          </button>
          <button
            type="button"
            onClick={handleNextKaiwaQuestion}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'linear-gradient(135deg, var(--primary), #6366f1)', border: 'none', borderRadius: '10px',
              color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              boxShadow: '0 2px 6px rgba(79,70,229,.2)'
            }}
          >
            Tiếp tục Kaiwa mẫu khác
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Guided Suggestions */}
      {guidedSuggestions.length > 0 && isGuided && kaiwaSession.sessionState !== 'awaiting_choice' && (
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {guidedSuggestions.map(s => (
            <button key={s} type="button" onClick={() => handleSend(s)} style={{ fontSize: 12, padding: '5px 10px', background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 99, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-row">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!isKaiwaHybrid}
          style={{
            width: 40, height: 40,
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

        <textarea
          ref={inputRef as any}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? `Đang nghe ${speechLang === 'ja-JP' ? 'tiếng Nhật' : 'tiếng Việt'}...`
              : kaiwaSession.sessionState === 'awaiting_choice'
                ? 'Hãy chọn một hành động ở trên...'
                : isKaiwaHybrid
                  ? kaiwaSession.currentQuestion
                    ? 'Nói hoặc gõ câu trả lời...'
                    : 'Chọn cấp độ JLPT để bắt đầu Kaiwa...'
                  : 'Hỏi ngữ pháp, mẫu câu, hoặc nhờ sửa câu...'
          }
          disabled={isListening || isThinking || kaiwaSession.sessionState === 'awaiting_choice'}
          style={{
            minHeight: '44px',
            height: '44px',
            padding: '10px 14px',
            resize: 'none',
            lineHeight: '1.4',
            fontFamily: 'inherit',
          }}
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || isThinking || kaiwaSession.sessionState === 'awaiting_choice'}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: !input.trim() || isThinking || kaiwaSession.sessionState === 'awaiting_choice' ? 0.5 : 1, flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
