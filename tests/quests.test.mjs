import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const cats = [
  { id: 'c1', breedId: 'british-longhair', name: '貓A' },
  { id: 'c2', breedId: 'mixed', name: '貓B' },
];

test('generateDailyQuests: deterministic for the same date', () => {
  const Catnu = loadCatnu();
  const a = Catnu.generateDailyQuests('2026-07-12', cats, [], 0);
  const b = Catnu.generateDailyQuests('2026-07-12', cats, [], 0);
  assert.deepEqual(a, b);
});

test('generateDailyQuests: exactly 3 quests, each assigned to a real cat', () => {
  const Catnu = loadCatnu();
  const quests = Catnu.generateDailyQuests('2026-07-12', cats, [], 0);
  assert.equal(quests.length, 3);
  for (const q of quests) assert.ok(cats.some(c => c.id === q.catId));
});

test('generateDailyQuests: different dates usually produce different quest sets', () => {
  const Catnu = loadCatnu();
  const a = Catnu.generateDailyQuests('2026-07-12', cats, [], 0);
  const b = Catnu.generateDailyQuests('2026-08-30', cats, [], 0);
  assert.notDeepEqual(a.map(q => q.text), b.map(q => q.text));
});
