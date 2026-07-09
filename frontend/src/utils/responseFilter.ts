const COT_PATTERNS = [
  /^okay,?\s+let'?s/i,
  /^first,?\s+i need/i,
  /let'?s break this down/i,
  /the user said/i,
  /conversation flow/i,
  /i need to check/i,
  /hmm,?\s+the user/i,
  /previous message from/i,
];

const TAG_LINE = /^(STATUS|JA|RO|VI|SHADOW(?:_RO)?)\s*:/i;

export function looksLikeChainOfThought(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const firstLine = trimmed.split('\n')[0]?.trim() ?? '';
  return COT_PATTERNS.some(pattern => pattern.test(firstLine) || pattern.test(trimmed.slice(0, 200)));
}

export function stripChainOfThought(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const taggedLines = trimmed
    .split('\n')
    .map(line => line.trim())
    .filter(line => TAG_LINE.test(line));

  if (taggedLines.length >= 2) {
    return taggedLines.join('\n');
  }

  if (looksLikeChainOfThought(trimmed)) {
    const jaMatch = trimmed.match(/(?:^|\n)([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF][^\n]{0,120}[?？。]?)/);
    if (jaMatch?.[1]) {
      return `STATUS: correct\nJA: ${jaMatch[1].trim()}\nRO:\nVI: Tiep tuc hoi thoai nhe.\nSHADOW: ${jaMatch[1].trim()}`;
    }
    return '';
  }

  return trimmed;
}
