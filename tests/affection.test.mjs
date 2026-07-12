import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const DAY = 86400000;

test('entryPolarity: more positive reactions than negative -> positive', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.entryPolarity({ reactions: ['approach', 'purr'] }), 'positive');
});

test('entryPolarity: equal counts -> neutral', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.entryPolarity({ reactions: ['approach', 'walkaway'] }), 'neutral');
});

test('entryPolarity: no reactions -> neutral', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.entryPolarity({ reactions: [] }), 'neutral');
});

test('entryPolarity: more negative -> negative', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.entryPolarity({ reactions: ['walkaway', 'hiss'] }), 'negative');
});

test('affectionScore: <5 non-neutral entries in trailing 7 days -> insufficient', () => {
  const Catnu = loadCatnu();
  const now = 10 * DAY;
  const logs = [
    { catId: 'c1', ts: now - 0 * DAY, reactions: ['approach'] },
    { catId: 'c1', ts: now - 1 * DAY, reactions: ['approach'] },
  ];
  const result = Catnu.affectionScore(logs, 'c1', now);
  assert.equal(result.insufficient, true);
  assert.equal(result.score, null);
});

test('affectionScore: weighted decay formula matches hand-computed value', () => {
  const Catnu = loadCatnu();
  const now = 10 * DAY;
  const logs = [
    { catId: 'c1', ts: now - 0 * DAY, reactions: ['approach'] },       // positive
    { catId: 'c1', ts: now - 1 * DAY, reactions: ['approach'] },       // positive
    { catId: 'c1', ts: now - 2 * DAY, reactions: ['walkaway'] },       // negative
    { catId: 'c1', ts: now - 3 * DAY, reactions: ['approach'] },       // positive
    { catId: 'c1', ts: now - 4 * DAY, reactions: ['approach'] },       // positive
    { catId: 'c1', ts: now - 9 * DAY, reactions: ['walkaway'] },       // outside 7-day window, ignored
    { catId: 'other', ts: now, reactions: ['approach'] },              // different cat, ignored
  ];
  const result = Catnu.affectionScore(logs, 'c1', now);
  assert.equal(result.insufficient, false);
  assert.equal(result.score, 81);
});
