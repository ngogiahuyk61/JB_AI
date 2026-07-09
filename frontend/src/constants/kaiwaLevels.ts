import type { KaiwaLevel } from '../types';

export interface KaiwaLevelConfig {
  id: KaiwaLevel;
  label: string;
  shortHint: string;
  greetingQuestion: string;
  greetingQuestionRo: string;
  welcomeVi: string;
  suggestions: string[];
}

export const KAIWA_LEVELS: KaiwaLevelConfig[] = [
  {
    id: 'N5',
    label: 'N5',
    shortHint: 'Tu vung co ban, cau ngan です/ます.',
    greetingQuestion: 'もうご飯を食べましたか。',
    greetingQuestionRo: 'Mou gohan o tabemashita ka.',
    welcomeVi: 'Chao ban! Minh bat dau kaiwa N5 nhe.',
    suggestions: ['まだ食べていません。', 'はい、食べました。'],
  },
  {
    id: 'N4',
    label: 'N4',
    shortHint: 'Hoi thoai hang ngay, thi qua khu don gian.',
    greetingQuestion: 'きのう、何をしましたか。',
    greetingQuestionRo: 'Kinou, nani o shimashita ka.',
    welcomeVi: 'Bat dau kaiwa N4 voi cau hoi qua khu nhe.',
    suggestions: ['きのう、買い物をしました。', '友だちと会いました。'],
  },
  {
    id: 'N3',
    label: 'N3',
    shortHint: 'Hoi thoai tu nhien hon, cau dai hon mot chut.',
    greetingQuestion: '最近、何か新しいことを始めましたか。',
    greetingQuestionRo: 'Saikin, nanika atarashii koto o hajimemashita ka.',
    welcomeVi: 'Kaiwa N3 — noi tu nhien hon nhe.',
    suggestions: ['日本語の勉強を始めました。', 'まだ何も始めていません。'],
  },
  {
    id: 'N2',
    label: 'N2',
    shortHint: 'Chu de xa hoi, van phong va y kien.',
    greetingQuestion: '仕事で最近大変なことはありますか。',
    greetingQuestionRo: 'Shigoto de saikin taihen na koto wa arimasu ka.',
    welcomeVi: 'Kaiwa N2 — luyen noi chu de phuc tap hon.',
    suggestions: ['会議が多くて大変です。', '特に大変なことはありません。'],
  },
  {
    id: 'N1',
    label: 'N1',
    shortHint: 'Hoi thoai tu nhien, van hoc va logic.',
    greetingQuestion: '最近、印象に残った出来事はありますか。',
    greetingQuestionRo: 'Saikin, inshou ni nokotta dekigoto wa arimasu ka.',
    welcomeVi: 'Kaiwa N1 — luyen noi tu nhien nhu nguoi ban.',
    suggestions: ['旅行に行ったことが印象に残っています。', '特に思い浮かびません。'],
  },
  {
    id: 'N2-BS',
    label: 'N2-BS',
    shortHint: 'Bo sung N2 — luyen tap them chu de N2.',
    greetingQuestion: '週末はどこかへ出かける予定がありますか。',
    greetingQuestionRo: 'Shuumatsu wa dokoka e dekakeru yotei ga arimasu ka.',
    welcomeVi: 'N2 bo sung — luyen them chu de N2.',
    suggestions: ['友だちと映画を見に行く予定です。', '特に予定はありません。'],
  },
];

export function getKaiwaLevelConfig(level: KaiwaLevel): KaiwaLevelConfig {
  return KAIWA_LEVELS.find(item => item.id === level) ?? KAIWA_LEVELS[0];
}

export function buildLevelWelcomeText(level: KaiwaLevel): string {
  const config = getKaiwaLevelConfig(level);
  return `こんにちは！${level}会話を始めましょう。${config.greetingQuestion}\nChao ban! ${config.welcomeVi}`;
}
