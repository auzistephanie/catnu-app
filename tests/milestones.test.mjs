import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

test('checkNewMilestones: first-log unlocks once, not re-reported next call', () => {
  const Catnu = loadCatnu();
  const state = {
    cats: [{ id: 'c1' }],
    logs: [{ catId: 'c1', ts: 0, reactions: [], actions: [] }],
    milestones: [],
    streak: { current: 0, best: 0, lastDoneDate: '' },
  };
  const first = Catnu.checkNewMilestones(state, 1000);
  assert.ok(first.some(m => m.id === 'first-log' && m.catId === 'c1'));

  state.milestones = first;
  const second = Catnu.checkNewMilestones(state, 2000);
  assert.ok(!second.some(m => m.id === 'first-log'));
});

test('checkNewMilestones: streak-7 is app-scoped (catId null)', () => {
  const Catnu = loadCatnu();
  const state = {
    cats: [{ id: 'c1' }],
    logs: [],
    milestones: [],
    streak: { current: 7, best: 7, lastDoneDate: '2026-07-01' },
  };
  const found = Catnu.checkNewMilestones(state, 1000);
  const m = found.find(x => x.id === 'streak-7');
  assert.ok(m);
  assert.equal(m.catId, null);
});
