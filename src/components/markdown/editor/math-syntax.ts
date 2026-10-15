import type { BlockContext, InlineContext, Line, MarkdownConfig } from '@lezer/markdown';
import { Tag } from '@lezer/highlight';

export const mathTag = Tag.define();
export const mathMarkTag = Tag.define();
export const highlightTag = Tag.define();

const DOLLAR = 36;
const BACKSLASH = 92;
const OPEN_PAREN = 40;
const OPEN_BRACKET = 91;
const CLOSE_PAREN = 41;
const CLOSE_BRACKET = 93;

const MATH_ENV = /^\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|CD)(\*?)\}/;

function isSpace(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13 || code === -1;
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function parseDollar(cx: InlineContext, pos: number): number {
  const double = cx.char(pos + 1) === DOLLAR;
  const open = double ? 2 : 1;
  if (!double && isSpace(cx.char(pos + 1))) return -1;
  for (let i = pos + open; i < cx.end; i += 1) {
    const code = cx.char(i);
    if (code === BACKSLASH) {
      i += 1;
      continue;
    }
    if (code !== DOLLAR) continue;
    if (double) {
      if (cx.char(i + 1) !== DOLLAR) continue;
      if (i === pos + open) return -1;
      return cx.addElement(cx.elt('InlineMath', pos, i + 2, [cx.elt('InlineMathMark', pos, pos + 2), cx.elt('InlineMathMark', i, i + 2)]));
    }
    if (i === pos + 1 || isSpace(cx.char(i - 1)) || isDigit(cx.char(i + 1))) continue;
    return cx.addElement(cx.elt('InlineMath', pos, i + 1, [cx.elt('InlineMathMark', pos, pos + 1), cx.elt('InlineMathMark', i, i + 1)]));
  }
  return -1;
}

function parseBackslash(cx: InlineContext, pos: number): number {
  const kind = cx.char(pos + 1);
  if (kind !== OPEN_PAREN && kind !== OPEN_BRACKET) return -1;
  const close = kind === OPEN_PAREN ? CLOSE_PAREN : CLOSE_BRACKET;
  for (let i = pos + 2; i < cx.end - 1; i += 1) {
    if (cx.char(i) === BACKSLASH && cx.char(i + 1) === close) {
      if (i === pos + 2) return -1;
      return cx.addElement(cx.elt('InlineMath', pos, i + 2, [cx.elt('InlineMathMark', pos, pos + 2), cx.elt('InlineMathMark', i, i + 2)]));
    }
  }
  return -1;
}

function blockOpening(line: Line): { closer: RegExp; length: number } | null {
  const text = line.text.slice(line.pos);
  if (text.startsWith('$$')) return { closer: /\$\$/, length: 2 };
  if (text.startsWith('\\[')) return { closer: /\\\]/, length: 2 };
  const env = MATH_ENV.exec(text);
  if (env) return { closer: new RegExp(`\\\\end\\{${env[1]}${env[2] ? '\\*' : ''}\\}`), length: env[0].length };
  return null;
}

function parseBlockMath(cx: BlockContext, line: Line): boolean {
  if (line.indent >= 4) return false;
  const opening = blockOpening(line);
  if (!opening) return false;
  const start = cx.lineStart + line.pos;
  const marks = [cx.elt('BlockMathMark', start, start + opening.length)];
  const firstRest = line.text.slice(line.pos + opening.length);
  const sameLine = opening.closer.exec(firstRest);
  if (sameLine) {
    const closeFrom = start + opening.length + sameLine.index;
    const closeTo = closeFrom + sameLine[0].length;
    marks.push(cx.elt('BlockMathMark', closeFrom, closeTo));
    cx.nextLine();
    cx.addElement(cx.elt('BlockMath', start, closeTo, marks));
    return true;
  }
  let end = cx.lineStart + line.text.length;
  while (cx.nextLine()) {
    const match = opening.closer.exec(line.text);
    end = cx.lineStart + line.text.length;
    if (match) {
      const closeFrom = cx.lineStart + match.index;
      const closeTo = closeFrom + match[0].length;
      marks.push(cx.elt('BlockMathMark', closeFrom, closeTo));
      end = closeTo;
      cx.nextLine();
      break;
    }
  }
  cx.addElement(cx.elt('BlockMath', start, end, marks));
  return true;
}

export const MathExtension: MarkdownConfig = {
  defineNodes: [
    { name: 'InlineMath', style: mathTag },
    { name: 'InlineMathMark', style: mathMarkTag },
    { name: 'BlockMath', block: true, style: mathTag },
    { name: 'BlockMathMark', style: mathMarkTag },
  ],
  parseInline: [
    {
      name: 'InlineMath',
      parse(cx, next, pos) {
        if (next === DOLLAR) return parseDollar(cx, pos);
        if (next === BACKSLASH) return parseBackslash(cx, pos);
        return -1;
      },
      before: 'Escape',
    },
  ],
  parseBlock: [
    {
      name: 'BlockMath',
      parse: parseBlockMath,
      endLeaf: (_cx, line) => line.indent < 4 && blockOpening(line) !== null,
      before: 'FencedCode',
    },
  ],
};

export const HighlightExtension: MarkdownConfig = {
  defineNodes: [
    { name: 'Highlight', style: highlightTag },
    { name: 'HighlightMark' },
  ],
  parseInline: [
    {
      name: 'Highlight',
      parse(cx, next, pos) {
        if (next !== 61 || cx.char(pos + 1) !== 61 || cx.char(pos + 2) === 61 || isSpace(cx.char(pos + 2))) return -1;
        for (let i = pos + 2; i < cx.end - 1; i += 1) {
          if (cx.char(i) === 61 && cx.char(i + 1) === 61 && !isSpace(cx.char(i - 1))) {
            return cx.addElement(cx.elt('Highlight', pos, i + 2, [cx.elt('HighlightMark', pos, pos + 2), cx.elt('HighlightMark', i, i + 2)]));
          }
        }
        return -1;
      },
      after: 'Emphasis',
    },
  ],
};

export const MATH_NODES = new Set(['InlineMath', 'BlockMath']);
