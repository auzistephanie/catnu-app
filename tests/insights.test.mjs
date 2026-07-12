import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const MIN = 60000;
const DAY = 86400000;

test('generateInsights: positive findings sort before negative warnings', () => {
  const Catnu = loadCatnu();
  const logs = [];
  for (let i = 0; i < 5; i++) {
    const base = i * 100 * MIN;
    logs.push({ catId: 'c1', ts: base, actions: ['wand'], reactions: [] });
    logs.push({ catId: 'c1', ts: base + 10 * MIN, actions: [], reactions: ['approach', 'purr'] });
  }
  for (let i = 0; i < 5; i++) {
    const reactions = i < 3 ? ['flatears'] : [];
    logs.push({ catId: 'c1', ts: 50000 * MIN + i * 100 * MIN, actions: ['hold'], reactions });
  }
  for (let i = 0; i < 4; i++) logs.push({ catId: 'c1', ts: 100000 * MIN + i * MIN, actions: [], reactions: ['approach'] });
  for (let i = 0; i < 6; i++) logs.push({ catId: 'c1', ts: 200000 * MIN + i * MIN, actions: [], reactions: ['walkaway'] });

  const insights = Catnu.generateInsights(logs, { id: 'c1', breedId: 'mixed' }, 500 * MIN);
  assert.ok(insights.length <= 5);
  const firstNegativeIdx = insights.findIndex(x => x.type === 'negative');
  const firstPositiveIdx = insights.findIndex(x => x.type === 'positive');
  assert.ok(firstPositiveIdx !== -1 && firstNegativeIdx !== -1);
  assert.ok(firstPositiveIdx < firstNegativeIdx, 'positive findings must sort before negative warnings');
});

test('generateInsights: breed noRecentAction rule fires as a tip', () => {
  const Catnu = loadCatnu();
  const now = 20 * DAY;
  const logs = [{ catId: 'c1', ts: now - 10 * DAY, actions: ['groom'], reactions: [] }];
  const insights = Catnu.generateInsights(logs, { id: 'c1', breedId: 'british-longhair' }, now);
  const groomRule = Catnu.BREEDS.find(b => b.id === 'british-longhair').breedRules.find(r => r.action === 'groom');
  assert.ok(insights.some(x => x.text === groomRule.text));
});
