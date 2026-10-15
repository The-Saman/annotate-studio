import { StreamLanguage, type StringStream } from '@codemirror/language';

interface LatexState {
  math: '' | '$' | '$$' | '\\(' | '\\[' | 'env';
  envDepth: number;
  pendingEnv: boolean;
}

const MATH_ENV = /^(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|math)\*?$/;
const SECTION = /^\\(part|chapter|section|subsection|subsubsection|paragraph|title)\*?$/;

function token(stream: StringStream, state: LatexState): string | null {
  if (state.pendingEnv) {
    if (stream.match(/^[A-Za-z]+\*?/)) {
      state.pendingEnv = false;
      return 'tag';
    }
    state.pendingEnv = false;
  }
  if (stream.match('%')) {
    stream.skipToEnd();
    return 'comment';
  }
  if (stream.match(/^\\begin(?=\{)/) || stream.match(/^\\end(?=\{)/)) {
    const word = stream.current();
    stream.match('{');
    const env = stream.match(/^[A-Za-z]+\*?/, false) as RegExpMatchArray | null;
    if (env && MATH_ENV.test(env[0])) {
      if (word === '\\begin') {
        if (!state.math) state.math = 'env';
        state.envDepth += 1;
      } else if (state.math === 'env') {
        state.envDepth = Math.max(0, state.envDepth - 1);
        if (state.envDepth === 0) state.math = '';
      }
    }
    state.pendingEnv = true;
    return 'keyword';
  }
  if (stream.match('$$')) {
    state.math = state.math === '$$' ? '' : state.math ? state.math : '$$';
    return 'meta';
  }
  if (stream.match('$')) {
    state.math = state.math === '$' ? '' : state.math ? state.math : '$';
    return 'meta';
  }
  if (stream.match('\\(') || stream.match('\\[')) {
    if (!state.math) state.math = stream.current() as '\\(' | '\\[';
    return 'meta';
  }
  if (stream.match('\\)') || stream.match('\\]')) {
    if (state.math === '\\(' || state.math === '\\[') state.math = '';
    return 'meta';
  }
  if (stream.match(/^\\[A-Za-z@]+\*?/)) {
    if (SECTION.test(stream.current())) return 'heading';
    return state.math ? 'atom' : 'keyword';
  }
  if (stream.match(/^\\./)) return state.math ? 'atom' : 'escape';
  if (stream.match(/^[{}[\]]/)) return 'bracket';
  if (stream.match(/^[&^_]/)) return state.math ? 'operator' : null;
  if (stream.match(/^[^\\%${}[\]&^_]+/)) return state.math ? 'string' : null;
  stream.next();
  return state.math ? 'string' : null;
}

export const latexLanguage = StreamLanguage.define<LatexState>({
  name: 'latex',
  startState: () => ({ math: '', envDepth: 0, pendingEnv: false }),
  copyState: (state) => ({ ...state }),
  token,
  languageData: {
    commentTokens: { line: '%' },
    closeBrackets: { brackets: ['(', '[', '{', '$'] },
  },
});
