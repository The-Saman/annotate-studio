import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, fitMessages, historyMessages, planHistory, text, type HistoryEntry } from './agent/context.ts';

function entry(id: string, role: 'user' | 'assistant', size: number): HistoryEntry {
  return { id, role, content: 'x'.repeat(size) };
}

test('estimates Persian text as denser than English', () => {
  assert.ok(estimateTokens('سلام دنیا'.repeat(10)) > estimateTokens('hello wor'.repeat(10)));
});

test('keeps short histories unchanged', () => {
  const entries = [entry('1', 'user', 100), entry('2', 'assistant', 100)];
  const plan = planHistory(entries, undefined, 10_000);
  assert.equal(plan.fold.length, 0);
  assert.equal(plan.recent.length, 2);
});

test('folds old turns when the history is too long and starts recent turns with the learner', () => {
  const entries = Array.from({ length: 10 }, (_, i) => entry(String(i), i % 2 === 0 ? 'user' : 'assistant', 4000));
  const plan = planHistory(entries, undefined, 4000);
  assert.ok(plan.fold.length > 0);
  assert.equal(plan.recent[0].role, 'user');
  assert.equal(plan.fold.length + plan.recent.length, 10);
});

test('uses an existing memory and only folds newer turns', () => {
  const entries = Array.from({ length: 6 }, (_, i) => entry(String(i), i % 2 === 0 ? 'user' : 'assistant', 100));
  const plan = planHistory(entries, { summary: 'Earlier: learned Coulomb law.', lastId: '1' }, 10_000);
  assert.equal(plan.summary, 'Earlier: learned Coulomb law.');
  assert.deepEqual(plan.recent.map((e) => e.id), ['2', '3', '4', '5']);
  const messages = historyMessages(plan);
  assert.equal(messages[0].role, 'user');
  assert.ok((messages[0].content[0] as { text: string }).text.includes('Coulomb'));
});

test('ignores a memory whose last message was deleted', () => {
  const plan = planHistory([entry('a', 'user', 10)], { summary: 's', lastId: 'gone' }, 1000);
  assert.equal(plan.summary, null);
  assert.equal(plan.recent.length, 1);
});

test('shortens old tool results before dropping turns', () => {
  const messages = [
    text('system', 'S'),
    text('user', 'Q'),
    ...Array.from({ length: 6 }, (_, i) => [
      { role: 'assistant' as const, content: [], toolCalls: [{ id: `c${i}`, name: 'read_file', arguments: {} }] },
      { role: 'tool' as const, toolCallId: `c${i}`, content: [{ type: 'text' as const, text: 'y'.repeat(20_000) }] },
    ]).flat(),
  ];
  const { messages: fitted, trimmed } = fitMessages(messages, 20_000);
  assert.ok(trimmed);
  assert.equal(fitted.length, messages.length);
  const first = fitted.find((m) => m.role === 'tool')!;
  assert.ok((first.content[0] as { text: string }).text.length < 2000);
});
