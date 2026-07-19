export interface GrammarExample {
  japanese: string;
  vietnamese: string;
}

export interface GrammarStructure {
  id: string;
  structure: string;
  meaning: string;
  examples: GrammarExample[];
}

export interface GrammarLesson {
  lessonNum: number;
  grammar: GrammarStructure[];
}

export interface QuizQuestion {
  id: string;
  questionVi: string;
  correctJa: string;
  options: string[];
}

export const parseGrammarLessons = (text: string): Record<number, GrammarLesson> => {
  const lessons: Record<number, GrammarLesson> = {};
  const splitLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  let currentLesson = 0;
  let inRenshuuA = false;
  let currentPart = '';
  let currentExamples: GrammarExample[] = [];

  for (let i = 0; i < splitLines.length; i++) {
    const line = splitLines[i];
    
    // Check for Lesson header
    const match = line.match(/^第(\d+)課/);
    if (match) {
      currentLesson = parseInt(match[1]);
      lessons[currentLesson] = { lessonNum: currentLesson, grammar: [] };
      inRenshuuA = false;
      continue;
    }

    if (line.includes('練習 A') || line.includes('Luyện tập A')) {
      inRenshuuA = true;
      currentPart = '';
      currentExamples = [];
      continue;
    }

    if (inRenshuuA && (line.includes('練習 B') || line.includes('練習 C') || line.includes('問題') || line.includes('会話'))) {
      inRenshuuA = false;
      continue;
    }

    if (inRenshuuA) {
      if (line.startsWith('Phần')) {
        currentPart = line.replace(':', '').trim();
        currentExamples = [];
      } else if (line.startsWith('Cấu trúc ngữ pháp:')) {
        // e.g. "Cấu trúc ngữ pháp: Vて + も いいですか Ý nghĩa: Dùng để xin phép..."
        const structMatch = line.match(/Cấu trúc ngữ pháp:(.*?)Ý nghĩa:(.*)/);
        if (structMatch && currentLesson > 0) {
          lessons[currentLesson].grammar.push({
            id: currentPart || `Part-${lessons[currentLesson].grammar.length + 1}`,
            structure: structMatch[1].trim(),
            meaning: structMatch[2].trim(),
            examples: [...currentExamples]
          });
        }
        currentExamples = []; // reset for next part if any
      } else {
        // It's an example line
        // e.g. "鉛筆で かいても いいですか。 (Tôi viết bằng bút chì có được không?)"
        const viMatch = line.match(/\s*\(([^)]+)\)\s*$/);
        if (viMatch) {
          const vietnamese = viMatch[1].trim();
          let japanese = line.replace(/\s*\(([^)]+)\)\s*$/, '').replace(/^\*\s*/, '').trim();
          
          // Remove Kanji annotations like (帰 - QUY) if any exist in the japanese string
          japanese = japanese.replace(/\s*\([\u4e00-\u9faf]+\s*-\s*[^\)]+\)/g, '').trim();

          // Ignore things that look like HanViet annotations instead of translations
          if (!vietnamese.includes('-') || vietnamese.split(' ').length > 2) {
             currentExamples.push({ japanese, vietnamese });
          }
        }
      }
    }
  }

  return lessons;
};

// Helper to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const generateQuizQuestions = (lessons: Record<number, GrammarLesson>, targetLesson?: number): QuizQuestion[] => {
  const allExamples: GrammarExample[] = [];
  const targetExamples: GrammarExample[] = [];

  // Gather all examples
  Object.values(lessons).forEach(lesson => {
    lesson.grammar.forEach(g => {
      g.examples.forEach(ex => {
        allExamples.push(ex);
        if (targetLesson === undefined || lesson.lessonNum === targetLesson) {
          targetExamples.push(ex);
        }
      });
    });
  });

  if (targetExamples.length === 0) return [];

  // Generate questions
  const questions: QuizQuestion[] = [];
  
  targetExamples.forEach((ex, idx) => {
    // Need 3 distractors from allExamples
    const distractors = allExamples
      .filter(a => a.japanese !== ex.japanese)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(a => a.japanese);

    // If we don't have enough distractors, it's fine, just use what we have
    const options = shuffle([ex.japanese, ...distractors]);
    
    questions.push({
      id: `q-${idx}`,
      questionVi: ex.vietnamese,
      correctJa: ex.japanese,
      options
    });
  });

  // Return a subset if there are too many (e.g., max 10 for lesson, max 20 for all)
  const shuffledQuestions = shuffle(questions);
  return targetLesson ? shuffledQuestions.slice(0, 10) : shuffledQuestions.slice(0, 20);
};
