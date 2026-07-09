# JAPANESE AI CONVERSATION SYSTEM - DATA ARCHITECTURE

This document analyzes the current data structure and schema handling the AI conversation system.

## 1. DATA

### Database Schema Related to AI Conversation
Currently, the system operates primarily as a client-side application. The "database" for the AI conversation is a structured JSON file extracted from an Excel database (`minnaN5Grammar.json`), and the user session is stored in memory.

**MinnaVocabEntry (Vocabulary & Grammar Source)**
Stores the predefined lessons and scenarios for the AI.
- `id` (number): Unique identifier.
- `kanji` (string): Japanese Kanji.
- `kana` (string): Hiragana/Katakana reading.
- `hanViet` (string): Sino-Vietnamese reading.
- `meaning` (string): Vietnamese meaning.
- `pos` (string): Part of speech.
- `exampleJa` (string): The predefined conversational question/sentence in Japanese.
- `exampleVi` (string): The Vietnamese meaning of the predefined sentence.
- `grammarPoint` (string): The specific grammar rule being practiced.
- `lessonNumber` (number): The JLPT/Minna lesson number (e.g., Bài 5).

**KaiwaSession (User State & History)**
Stores the active conversational context (In-memory React State).
- `learningMode`: 'guided_kaiwa' | 'free_chat'.
- `selectedLevel`: JLPT level (e.g., 'N5').
- `currentQuestion`: The current target question from the database.
- `sessionState`: 'idle' | 'greeting' | 'awaiting_answer' | 'assessing' | 'correcting' | 'awaiting_choice'.
- `turnIntent`: The goal of the current turn (e.g., 'lesson_answer').
- `correctionCount`: Number of consecutive wrong answers.

### Relationships Between Tables
Since there is no relational database currently implemented for the chat, the relationship is managed by the Frontend Orchestrator (`FloatingChat.tsx`):
- `KaiwaSession` has a 1-to-1 relationship with the current `MinnaVocabEntry` (The target question is injected into the session state).
- `ChatHistory` maintains an array of `{ role, text }` which relies on the `MinnaVocabEntry` to guide the LLM's responses.

### How Conversation Data is Loaded
1. **Source**: The data originates from `tu_vung_n5_minna_ngu_phap_1_25.xlsx`.
2. **JSON Conversion**: It is converted into `minnaN5Grammar.json`.
3. **Data Service**: Loaded client-side via `minnaDataService.ts`.
4. **Execution**: When the user starts a session, `FloatingChat.tsx` calls `minnaDataService.getRandomEntryWithExample()` to fetch a lesson.
5. **Injection**: This entry is passed to `buildSenseiSystemPrompt` to force the LLM to use the exact data from the "database" rather than hallucinating its own questions.
