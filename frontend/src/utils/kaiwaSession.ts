import type { GuidedAssessment, KaiwaLevel, KaiwaSession, KaiwaSessionState, TurnIntent } from '../types';
import { createInitialKaiwaSession } from '../types';
import { getKaiwaLevelConfig } from '../constants/kaiwaLevels';

export { buildLevelWelcomeText, getKaiwaLevelConfig, KAIWA_LEVELS } from '../constants/kaiwaLevels';

export function isGreetingText(text: string) {
  const lower = text.toLowerCase();
  return /こんにちは|こんばんは|おはよう|お昼|午前|午後|chao buoi|chào buổi|xin chào|xin chao|hello|hi\b|good morning|good afternoon|good evening/.test(lower);
}

export function isLunchGreeting(text: string) {
  const lower = text.toLowerCase();
  return /お昼|昼|chao buoi trua|chào buổi trưa|good afternoon|lunch|trua/.test(lower);
}

export function detectTurnIntent(text: string, session: KaiwaSession): TurnIntent {
  if (session.learningMode !== 'guided_kaiwa') {
    return 'grammar_question';
  }
  if (isGreetingText(text)) {
    return 'greeting';
  }
  if (session.sessionState === 'awaiting_answer' || session.sessionState === 'correcting') {
    return 'lesson_answer';
  }
  return 'lesson_answer';
}

export function canSendGuidedMessage(session: KaiwaSession) {
  return session.sessionState === 'awaiting_answer'
    || session.sessionState === 'correcting'
    || (session.sessionState === 'idle' && !session.currentQuestion);
}

export function resolveNextSessionState(assessment: GuidedAssessment): KaiwaSessionState {
  return assessment === 'incorrect' ? 'correcting' : 'awaiting_answer';
}

export function sessionForOutgoingMessage(session: KaiwaSession, text: string): KaiwaSession {
  const turnIntent = detectTurnIntent(text, session);
  return {
    ...session,
    turnIntent,
    sessionState: turnIntent === 'greeting' ? 'greeting' : 'assessing',
  };
}

export function sessionAfterGuidedLesson(level: KaiwaLevel): KaiwaSession {
  const config = getKaiwaLevelConfig(level);
  return {
    ...createInitialKaiwaSession(),
    learningMode: 'guided_kaiwa',
    selectedLevel: level,
    currentQuestion: config.greetingQuestion,
    sessionState: 'awaiting_answer',
    turnIntent: undefined,
  };
}

export function sessionAfterAssessment(
  session: KaiwaSession,
  assessment: GuidedAssessment,
  nextQuestion: string,
): KaiwaSession {
  return {
    ...session,
    currentQuestion: nextQuestion,
    lastAssessment: assessment,
    sessionState: resolveNextSessionState(assessment),
    turnIntent: undefined,
  };
}

function greetingMockReply(text: string, level: KaiwaLevel): string {
  const config = getKaiwaLevelConfig(level);
  if (isLunchGreeting(text)) {
    return `STATUS: correct
JA: こんにちは！お昼ですね。${config.greetingQuestion}
RO: Konnichiwa! Ohiru desu ne. ${config.greetingQuestionRo}
VI: Chao buoi trua! Hay tra loi ngan nhe.
SHADOW: ${config.greetingQuestion}`;
  }
  return `STATUS: correct
JA: こんにちは！${config.greetingQuestion}
RO: Konnichiwa! ${config.greetingQuestionRo}
VI: Chao ban! Hay tra loi bang mot cau ngan.
SHADOW: ${config.greetingQuestion}`;
}

export function getMockGuidedReply(text: string, session: KaiwaSession): string {
  if (session.learningMode !== 'guided_kaiwa') {
    return '';
  }

  const level = session.selectedLevel;
  const config = getKaiwaLevelConfig(level);
  const currentQuestion = session.currentQuestion;
  const turnIntent = session.turnIntent ?? detectTurnIntent(text, session);

  if (turnIntent === 'greeting' || !currentQuestion || session.sessionState === 'idle' || session.sessionState === 'greeting') {
    return greetingMockReply(text, level);
  }

  if (currentQuestion === config.greetingQuestion) {
    if (!/です|でした|ません|まし|た$|います|ある|ない/i.test(text)) {
      return `STATUS: incorrect
JA: はい、食べました。
RO: Hai, tabemashita.
VI: Hay tra loi bang mau nay truoc nhe.
SHADOW: はい、食べました。`;
    }

    return `STATUS: correct
JA: そうですか。今日は何をしますか。
RO: Sou desu ka. Kyou wa nani o shimasu ka.
VI: Tot roi! Minh hoi tiep nhe.
SHADOW: そうですか。今日は何をしますか。`;
  }

  if (!/です|でした|ます|まし|た$|います/i.test(text)) {
    return `STATUS: almost_correct
JA: わたしは${level}の勉強をしています。
RO: Watashi wa ${level} no benkyou o shite imasu.
VI: Gan dung. Dung mau nay se tu nhien hon.
SHADOW: わたしは${level}の勉強をしています。`;
  }

  return `STATUS: correct
JA: いいですね。もう一つ質問があります。${config.greetingQuestion}
RO: Ii desu ne. Mou hitotsu shitsumon ga arimasu.
VI: Dung huong roi. Tiep tuc nhe.
SHADOW: ${config.greetingQuestion}`;
}
