import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('checkStreakBreak: one full day skipped -> current resets to 0', () => {
  const Catnu = loadCatnu();
  const streak = { current: 5, best: 5, lastDoneDate: '2026-07-01' };
  const result = Catnu.checkStreakBreak(streak, '2026-07-03');
  assert.equal(result.current, 0);
  assert.equal(result.best, 5);
});

test('checkStreakBreak: done yesterday -> not broken yet', () => {
  const Catnu = loadCatnu();
  const streak = { current: 5, best: 5, lastDoneDate: '2026-07-01' };
  const result = Catnu.checkStreakBreak(streak, '2026-07-02');
  assert.equal(result.current, 5);
});

test('completeQuestsForDay: first completion increments current and best', () => {
  const Catnu = loadCatnu();
  const streak = { current: 0, best: 0, lastDoneDate: '' };
  const result = Catnu.completeQuestsForDay(streak, '2026-07-01');
  assert.equal(result.current, 1);
  assert.equal(result.best, 1);
  assert.equal(result.lastDoneDate, '2026-07-01');
});

test('completeQuestsForDay: calling twice same day does not double-increment', () => {
  const Catnu = loadCatnu();
  const streak = { current: 1, best: 1, lastDoneDate: '2026-07-01' };
  const result = Catnu.completeQuestsForDay(streak, '2026-07-01');
  assert.equal(result.current, streak.current);
  assert.equal(result.best, streak.best);
  assert.equal(result.lastDoneDate, streak.lastDoneDate);
});
