import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDirection, dominantDirection, hasPersianLetters, ltrSyntaxSpans, normalizeForSearch, searchMatches, toPersianDigits } from './bidi.ts';

test('detects Persian lines even when they start with English terms', () => {
  assert.equal(detectDirection('Rust و Zig هر دو بدون garbage collector اجرا می‌شوند'), 'rtl');
  assert.equal(detectDirection('API یک رابط برنامه‌نویسی است'), 'rtl');
  assert.equal(detectDirection('* **هستهٔ اتم:** شامل پروتون‌ها ($+e$)'), 'rtl');
  assert.equal(detectDirection('The word سلام means hello in Persian'), 'ltr');
  assert.equal(detectDirection('$$E = mc^2$$'), null);
  assert.equal(detectDirection('$\\frac{a}{b}$ = ۱۲'), null);
});

test('ignores markup, math, code and links when detecting direction', () => {
  assert.equal(detectDirection('`console.log` در جاوااسکریپت'), 'rtl');
  assert.equal(detectDirection('[متن](https://example.com/very/long/english/path)'), 'rtl');
  assert.equal(detectDirection('$\\alpha + \\beta$ زاویه‌ها'), 'rtl');
});

test('finds the dominant direction of a document', () => {
  assert.equal(dominantDirection('# جزوه\n\nمتن فارسی\n\n$$x$$'), 'rtl');
  assert.equal(dominantDirection('# Notes\n\nplain English'), 'ltr');
  assert.equal(dominantDirection(''), 'ltr');
});

test('normalizes Persian and Arabic forms for search', () => {
  assert.equal(normalizeForSearch('كتاب‌هاي علمي'), normalizeForSearch('کتابهای علمی'));
  assert.equal(normalizeForSearch('فصل ۳'), 'فصل 3');
  assert.ok(searchMatches('جزوه فیزیک ۲.md', 'فيزيك 2'));
  assert.ok(searchMatches('Rust and Zig.pdf', 'zig rust'));
  assert.ok(!searchMatches('Biology.pdf', 'physics'));
});

test('formats Persian digits and detects Persian letters', () => {
  assert.equal(toPersianDigits('3.14'), '۳.۱۴');
  assert.ok(hasPersianLetters('گزاره'));
  assert.ok(!hasPersianLetters('مرحبا'));
});

test('finds LaTeX and Markdown syntax that must stay left-to-right in Persian lines', () => {
  const spans = (text: string) => ltrSyntaxSpans(text).map((span) => text.slice(span.from, span.to));
  assert.deepEqual(spans('\\begin{theorem}[قانون کولن]\\label{thm:coulomb}'), ['\\begin{theorem}', '\\label{thm:coulomb}']);
  assert.deepEqual(spans('> [!tip]- نکته'), ['[!tip]-']);
  assert.deepEqual(spans('طبق رابطهٔ \\eqref{eq:q} و \\ref{thm:coulomb}، بار $0.5e$ نیست.[^1]'), ['\\eqref{eq:q}', '\\ref{thm:coulomb}', '$0.5e$', '[^1]']);
  assert.deepEqual(spans('\\textbf{متن} و \\(x^2\\) و \\\\'), ['\\textbf', '\\(x^2\\)', '\\\\']);
  assert.deepEqual(spans('\\newcommand{\\R}{\\mathbb{R}} \\documentclass[12pt]{article}'), ['\\newcommand{\\R}{\\mathbb{R}}', '\\documentclass[12pt]{article}']);
  assert.deepEqual(spans('متن ساده بدون نحو'), []);
});
