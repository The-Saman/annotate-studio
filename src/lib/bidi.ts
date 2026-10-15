export type TextDirection = 'rtl' | 'ltr';
export type DirectionMode = 'auto' | TextDirection;

function isRtlCodePoint(cp: number): boolean {
  if (cp >= 0x0590 && cp <= 0x08ff) {
    if (cp >= 0x0660 && cp <= 0x0669) return false;
    if (cp >= 0x06f0 && cp <= 0x06f9) return false;
    if (cp === 0x060c || cp === 0x066b || cp === 0x066c) return false;
    return true;
  }
  if (cp >= 0xfb1d && cp <= 0xfdff) return true;
  if (cp >= 0xfe70 && cp <= 0xfefc) return true;
  if (cp >= 0x10800 && cp <= 0x10fff) return true;
  if (cp >= 0x1e800 && cp <= 0x1efff) return true;
  return false;
}

const LETTER = /\p{L}/u;

function isLtrLetter(char: string, cp: number): boolean {
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return true;
  if (cp < 0xc0) return false;
  if (cp === 0xd7 || cp === 0xf7) return false;
  return LETTER.test(char);
}

const NEUTRAL_SPANS: RegExp[] = [
  /\\(begin|end|label|ref|eqref|autoref|cref|cite|usepackage|documentclass|input|include)\*?(\[[^\]]*\])?\{[^}]*\}/g,
  /`+[^`]*`+/g,
  /\$\$[\s\S]*?\$\$/g,
  /\$[^$\n]+\$/g,
  /\\\([\s\S]*?\\\)/g,
  /\\\[[\s\S]*?\\\]/g,
  /\]\([^)]*\)/g,
  /<[^>\n]+>/g,
  /\bhttps?:\/\/\S+/gi,
  /\\[a-zA-Z@]+\*?/g,
];

export function stripNeutralSpans(text: string): string {
  let out = text;
  for (const pattern of NEUTRAL_SPANS) out = out.replace(pattern, ' ');
  return out;
}

export interface DirectionCounts {
  rtl: number;
  ltr: number;
}

export function countLetters(text: string): DirectionCounts {
  let rtl = 0;
  let ltr = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (isRtlCodePoint(cp)) rtl += 1;
    else if (isLtrLetter(char, cp)) ltr += 1;
  }
  return { rtl, ltr };
}

export function directionFromCounts({ rtl, ltr }: DirectionCounts): TextDirection | null {
  if (rtl === 0 && ltr === 0) return null;
  if (rtl === 0) return 'ltr';
  if (ltr === 0) return 'rtl';
  return rtl * 1.6 >= ltr ? 'rtl' : 'ltr';
}

export function detectDirection(text: string): TextDirection | null {
  return directionFromCounts(countLetters(stripNeutralSpans(text)));
}

export function dominantDirection(text: string, sample = 20_000): TextDirection {
  return detectDirection(text.length > sample ? text.slice(0, sample) : text) ?? 'ltr';
}

const RTL_CHARS = String.raw`\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF`;
const BRACE_GROUP = String.raw`\{(?:[^{}\n${RTL_CHARS}]|\{[^{}\n${RTL_CHARS}]*\})*\}`;
const LTR_SYNTAX = new RegExp(
  [
    String.raw`\$\$[^$\n]+\$\$`,
    String.raw`\$(?:\\.|[^$\\\n])+\$`,
    String.raw`\\\(.*?\\\)`,
    String.raw`\\\[.*?\\\]`,
    String.raw`\\(?:[A-Za-z@]+\*?|[^A-Za-z\s])(?:\[[^\]\n${RTL_CHARS}]*\])?(?:${BRACE_GROUP})*`,
    String.raw`\[![A-Za-z][\w-]*\][+-]?`,
    String.raw`\[\^[^\]\s]+\]`,
  ].join('|'),
  'g',
);

export function ltrSyntaxSpans(text: string): { from: number; to: number }[] {
  const spans: { from: number; to: number }[] = [];
  for (const match of text.matchAll(LTR_SYNTAX)) {
    if (match[0]) spans.push({ from: match.index, to: match.index + match[0].length });
  }
  return spans;
}

export function resolveDirection(text: string, fallback: TextDirection): TextDirection {
  return detectDirection(text) ?? fallback;
}

export function isRtlText(text: string): boolean {
  return detectDirection(text) === 'rtl';
}

const PERSIAN_LETTERS = /[پچژکگی]/;

export function hasPersianLetters(text: string): boolean {
  return PERSIAN_LETTERS.test(text);
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[‌‍‎‏؜]/g, '')
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

export function searchMatches(haystack: string, needle: string): boolean {
  const query = normalizeForSearch(needle.trim());
  if (!query) return true;
  const target = normalizeForSearch(haystack);
  return query.split(/\s+/).every((part) => target.includes(part));
}
