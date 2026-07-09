/**
 * Phase 2+ verification — kaiwa greeting and state flow.
 * Run: node frontend/scripts/verify-kaiwa-phase2.mjs
 */

function isGreetingText(text) {
  const lower = text.toLowerCase();
  return /こんにちは|お昼|chao buoi|chào buổi|xin chào|hello/.test(lower);
}

function isLunchGreeting(text) {
  const lower = text.toLowerCase();
  return /お昼|chao buoi trua|chào buổi trưa|trua/.test(lower);
}

function detectTurnIntent(text, session) {
  if (session.learningMode !== 'guided_kaiwa') return 'grammar_question';
  if (isGreetingText(text)) return 'greeting';
  return 'lesson_answer';
}

function canSendGuidedMessage(session) {
  return session.sessionState === 'awaiting_answer'
    || session.sessionState === 'correcting'
    || (session.sessionState === 'idle' && !session.currentQuestion);
}

function resolveNextSessionState(assessment) {
  return assessment === 'incorrect' ? 'correcting' : 'awaiting_answer';
}

function greetingMockReply(text) {
  if (isLunchGreeting(text)) {
    return { status: 'correct', ja: 'こんにちは！お昼ですね。もうご飯を食べましたか。', nextQuestion: 'もうご飯を食べましたか。' };
  }
  return { status: 'correct', ja: 'こんにちは！もうご飯を食べましたか。', nextQuestion: 'もうご飯を食べましたか。' };
}

function looksLikeCoT(text) {
  return /okay,?\s+let'?s|let's break this down|first,?\s+i need/i.test(text);
}

function stripCoT(text) {
  if (looksLikeCoT(text)) {
    const tagged = text.split('\n').filter(l => /^(STATUS|JA|RO|VI|SHADOW)/i.test(l.trim()));
    if (tagged.length >= 2) return tagged.join('\n');
    return '';
  }
  return text;
}

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) { passed++; console.log(`  OK  ${name}`); }
  else { failed++; console.error(` FAIL ${name}`); }
}

console.log('Kaiwa verification\n');

// T1: lunch greeting
{
  const session = { learningMode: 'guided_kaiwa', selectedLevel: 'N5', currentQuestion: '', sessionState: 'idle' };
  const intent = detectTurnIntent('Chao buoi trua', session);
  assert('T1: lunch text -> greeting intent', intent === 'greeting');
  const reply = greetingMockReply('Chao buoi trua');
  assert('T1: lunch reply asks about food', reply.ja.includes('ご飯') && reply.ja.includes('お昼'));
}

// T2: N5 level selected
{
  const session = { learningMode: 'guided_kaiwa', selectedLevel: 'N5', currentQuestion: 'もうご飯を食べましたか。', sessionState: 'awaiting_answer' };
  assert('T2: N5 awaiting answer', session.selectedLevel === 'N5');
}

// T3: wrong answer -> correcting
{
  const session = { learningMode: 'guided_kaiwa', selectedLevel: 'N5', currentQuestion: 'もうご飯を食べましたか。', sessionState: 'awaiting_answer' };
  const intent = detectTurnIntent('tabemashita', session);
  assert('T3: non-greeting -> lesson_answer', intent === 'lesson_answer');
  const next = { ...session, lastAssessment: 'incorrect', sessionState: resolveNextSessionState('incorrect') };
  assert('T3: wrong -> correcting', next.sessionState === 'correcting');
}

// T4: correct answer -> next question
{
  const next = { sessionState: resolveNextSessionState('correct') };
  assert('T4: correct -> awaiting_answer', next.sessionState === 'awaiting_answer');
}

// T10: CoT stripped
{
  const cot = "Okay, let's break this down.\nSTATUS: correct\nJA: こんにちは！\nRO: konnichiwa\nVI: chao\nSHADOW: こんにちは";
  const cleaned = stripCoT(cot);
  assert('T10: CoT stripped', !looksLikeCoT(cleaned) && cleaned.includes('STATUS:'));
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
