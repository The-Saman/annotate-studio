import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from './markdown.ts';
import { analyzeDocument, collectMacros, extractMacros, planMath, resolveMathRefs } from './latex.ts';

function counter() {
  let n = 0;
  const labels: Record<string, string> = {};
  return {
    labels,
    context: { next: () => String((n += 1)), label: (key: string, text: string) => (labels[key] = text) },
  };
}

test('collects macro definitions in several forms', () => {
  const macros = collectMacros(
    '\\newcommand{\\vect}[1]{\\mathbf{#1}} \\renewcommand\\R{\\mathbb{R}} \\def\\sq#1{#1^2} \\let\\eps=\\varepsilon \\DeclareMathOperator*{\\argmax}{arg\\,max}',
    '\\newcommand{\\N}{\\mathbb{N}}',
  );
  assert.equal(macros['\\vect'], '\\mathbf{#1}');
  assert.equal(macros['\\R'], '\\mathbb{R}');
  assert.equal(macros['\\sq'], '#1^2');
  assert.equal(macros['\\eps'], '\\varepsilon');
  assert.equal(macros['\\argmax'], '\\operatorname*{arg\\,max}');
  assert.equal(macros['\\N'], '\\mathbb{N}');
});

test('removes definitions from formulas', () => {
  const macros = {};
  assert.equal(extractMacros('\\newcommand{\\x}{y} x+1', macros).trim(), 'x+1');
});

test('numbers aligned rows and respects nonumber, tags and labels', () => {
  const { labels, context } = counter();
  const plan = planMath('\\begin{align}a &= b \\label{eq:a} \\\\ c &= d \\nonumber \\\\ e &= f \\tag{*}\\end{align}', 'align', context);
  assert.ok(plan.latex.startsWith('\\begin{align*}'));
  assert.deepEqual(plan.numbers, ['1', '*']);
  assert.equal(labels['eq:a'], '1');
  assert.ok(!plan.latex.includes('\\nonumber'));
  assert.ok(!plan.latex.includes('\\label'));
});

test('numbers equations, multline and labelled display math only', () => {
  const { labels, context } = counter();
  assert.deepEqual(planMath('\\begin{equation}x\\end{equation}', 'equation', context).numbers, ['1']);
  assert.deepEqual(planMath('\\begin{equation*}x\\end{equation*}', 'equation*', context).numbers, []);
  assert.deepEqual(planMath('y \\label{eq:y}', null, context).numbers, ['2']);
  assert.deepEqual(planMath('z', null, context).numbers, []);
  const multline = planMath('\\begin{multline}a \\\\ b\\end{multline}', 'multline', context);
  assert.ok(multline.latex.startsWith('\\begin{gather*}'));
  assert.deepEqual(multline.numbers, ['3']);
  assert.equal(labels['eq:y'], '2');
});

test('keeps the alignat column argument', () => {
  const { context } = counter();
  const plan = planMath('\\begin{alignat}{2}a &= b & c &= d\\end{alignat}', 'alignat', context);
  assert.ok(plan.latex.startsWith('\\begin{alignat*}{2}'));
});

test('analyzes a document with equations, theorems and footnotes', () => {
  const blocks = parseMarkdown(
    '\\newcommand{\\R}{\\mathbb{R}}\n\n\\begin{theorem}\\label{thm:a}\nA\n\\end{theorem}\n\n\\begin{lemma}\nB\n\\end{lemma}\n\n\\begin{theorem}\nC\n\\end{theorem}\n\n\\begin{equation}\\label{eq:main}x\\end{equation}\n\nRef[^b] and[^a].\n\n[^a]: First.\n[^b]: Second.\n[^c]: Unused.',
  );
  const model = analyzeDocument(blocks, { prefix: 't' });
  assert.equal(model.macros['\\R'], '\\mathbb{R}');
  assert.equal(model.labels.get('thm:a')?.text, '1');
  const numbers = Array.from(model.envs.values()).map((env) => env.number);
  assert.deepEqual(numbers, ['1', '1', '2']);
  assert.equal(model.labels.get('eq:main')?.text, '1');
  assert.deepEqual(model.footnotes.order, ['b', 'a', 'c']);
  assert.equal(resolveMathRefs('\\eqref{eq:main} + \\ref{missing}', model.labels), '\\text{(1)} + \\text{??}');
});
