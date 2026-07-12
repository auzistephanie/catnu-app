import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const MIN = 60000;

test('actionCorrelation: n=0 -> no data, no flags', () => {
  const Catnu = loadCatnu();
  const r = Catnu.actionCorrelation([], 'c1', 'wand', 0);
  assert.equal(r.n, 0);
  assert.equal(r.insufficientData, false);
  assert.equal(r.positiveFinding, false);
  assert.equal(r.negativeWarning, false);
});

test('actionCorrelation: 1<=n<5 -> insufficientData', () => {
  const Catnu = loadCatnu();
  const logs = [
    { catId: 'c3', ts: 0, actions: ['groom'], reactions: [] },
    { catId: 'c3', ts: 1 * MIN, actions: ['groom'], reactions: [] },
    { catId: 'c3', ts: 2 * MIN, actions: ['groom'], reactions: [] },
  ];
  const r = Catnu.actionCorrelation(logs, 'c3', 'groom', 3 * MIN);
  assert.equal(r.n, 3);
  assert.equal(r.insufficientData, true);
});

test('actionCorrelation: 30-min-after positive rate 15pp above baseline -> positiveFinding', () => {
  const Catnu = loadCatnu();
  const logs = [];
  // 5 wand-action entries, neutral by themselves, each followed 10min later by a positive-reaction entry
  for (let i = 0; i < 5; i++) {
    const base = i * 100 * MIN;
    logs.push({ catId: 'c1', ts: base, actions: ['wand'], reactions: [] });
    logs.push({ catId: 'c1', ts: base + 10 * MIN, actions: [], reactions: ['approach', 'purr'] });
  }
  // baseline noise, far outside any 30-min window: 4 positive, 6 negative -> P_base = 9/15 = 0.6
  // (the 5 followups above count toward P_base too: 5 + 4 = 9 positive total)
  for (let i = 0; i < 4; i++) {
    logs.push({ catId: 'c1', ts: 100000 * MIN + i * MIN, actions: [], reactions: ['approach'] });
  }
  for (let i = 0; i < 6; i++) {
    logs.push({ catId: 'c1', ts: 200000 * MIN + i * MIN, actions: [], reactions: ['walkaway'] });
  }
  const r = Catnu.actionCorrelation(logs, 'c1', 'wand', 500 * MIN);
  assert.equal(r.n, 5);
  assert.equal(r.P_a, 1);
  assert.equal(r.P_base, 0.6);
  assert.equal(r.positiveFinding, true);
});

test('actionCorrelation: negative reaction co-occurs >=60% -> negativeWarning', () => {
  const Catnu = loadCatnu();
  const logs = [];
  for (let i = 0; i < 5; i++) {
    const reactions = i < 3 ? ['flatears'] : [];
    logs.push({ catId: 'c2', ts: i * 100 * MIN, actions: ['hold'], reactions });
  }
  const r = Catnu.actionCorrelation(logs, 'c2', 'hold', 500 * MIN);
  assert.equal(r.n, 5);
  assert.equal(r.negativeCount, 3);
  assert.equal(r.negativeRate, 0.6);
  assert.equal(r.negativeWarning, true);
});
