import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const DAY = 86400000;

test('behaviorFact: returns fact text for a known id', () => {
  const Catnu = loadCatnu();
  assert.equal(typeof Catnu.behaviorFact('slowblink'), 'string');
  assert.ok(Catnu.behaviorFact('slowblink').length > 0);
});

test('behaviorFact: returns null for unknown id', () => {
  const Catnu = loadCatnu();
  assert.equal(Catnu.behaviorFact('not-a-real-id'), null);
});

test('behaviorFact: covers every REACTIONS and ACTIONS id', () => {
  const Catnu = loadCatnu();
  for (const r of Catnu.REACTIONS) assert.ok(Catnu.behaviorFact(r.id), `missing fact for reaction ${r.id}`);
  for (const a of Catnu.ACTIONS) assert.ok(Catnu.behaviorFact(a.id), `missing fact for action ${a.id}`);
});

function logAt(catId, daysAgo, reactions, now) {
  return { catId, ts: now - daysAgo * DAY, reactions, actions: [] };
}

test('recentSignal: insufficient data returns null', () => {
  const Catnu = loadCatnu();
  const now = Date.now();
  const logs = [logAt('c1', 1, ['purr'], now), logAt('c1', 2, ['purr'], now)];
  assert.equal(Catnu.recentSignal(logs, 'c1', now), null);
});

test('recentSignal: detects an upward trend', () => {
  const Catnu = loadCatnu();
  const now = Date.now();
  const logs = [];
  // previous window (days 15-28 ago): 1x slowblink
  logs.push(logAt('c1', 20, ['slowblink'], now));
  // recent window (days 0-14 ago): 4x slowblink, plus filler entries to clear the min-data gate
  for (let i = 0; i < 4; i++) logs.push(logAt('c1', i + 1, ['slowblink'], now));
  logs.push(logAt('c1', 6, ['purr'], now));
  logs.push(logAt('c1', 7, ['purr'], now));
  const result = Catnu.recentSignal(logs, 'c1', now);
  assert.ok(result);
  assert.equal(result.trend, 'up');
  assert.equal(result.actionId, 'slowblink');
  assert.equal(typeof result.message, 'string');
});

test('recentSignal: detects a downward trend', () => {
  const Catnu = loadCatnu();
  const now = Date.now();
  const logs = [];
  // previous window: 4x purr
  for (let i = 0; i < 4; i++) logs.push(logAt('c1', i + 16, ['purr'], now));
  // recent window: 0x purr, plus filler to clear the min-data gate
  logs.push(logAt('c1', 1, ['knead'], now));
  logs.push(logAt('c1', 2, ['knead'], now));
  const result = Catnu.recentSignal(logs, 'c1', now);
  assert.ok(result);
  assert.equal(result.trend, 'down');
  assert.equal(result.actionId, 'purr');
});

test('recentSignal: no clear change returns null', () => {
  const Catnu = loadCatnu();
  const now = Date.now();
  const logs = [];
  // evenly distributed: 2x purr recent, 2x purr previous — no meaningful swing
  logs.push(logAt('c1', 2, ['purr'], now));
  logs.push(logAt('c1', 5, ['purr'], now));
  logs.push(logAt('c1', 16, ['purr'], now));
  logs.push(logAt('c1', 20, ['purr'], now));
  assert.equal(Catnu.recentSignal(logs, 'c1', now), null);
});

test('timelineEvents: sorted newest-to-oldest and includes milestones + anniversaries', () => {
  const Catnu = loadCatnu();
  const now = Date.now();
  const state = {
    cats: [{ id: 'c1', name: 'Mochi', homeDate: '2020-01-01', birthDate: '', anniversaries: [] }],
    milestones: [
      { id: 'first-log', catId: 'c1', unlockedAt: now - 10 * DAY },
      { id: 'first-purr', catId: 'c1', unlockedAt: now - 2 * DAY },
    ],
    logs: [],
  };
  const events = Catnu.timelineEvents(state, 'c1');
  assert.ok(events.length >= 2);
  const dates = [...events].map(e => e.date);
  const sorted = [...dates].sort().reverse();
  assert.deepEqual(dates, sorted);
  assert.ok(events.some(e => e.type === 'milestone' && e.label));
});

test('timelineEvents: filters to the requested cat only', () => {
  const Catnu = loadCatnu();
  const now = Date.now();
  const state = {
    cats: [{ id: 'c1', name: 'A', homeDate: '', birthDate: '', anniversaries: [] }, { id: 'c2', name: 'B', homeDate: '', birthDate: '', anniversaries: [] }],
    milestones: [
      { id: 'first-log', catId: 'c1', unlockedAt: now - DAY },
      { id: 'first-log', catId: 'c2', unlockedAt: now - DAY },
    ],
    logs: [],
  };
  const events = Catnu.timelineEvents(state, 'c1');
  assert.equal(events.filter(e => e.type === 'milestone').length, 1);
});

test('timelineEvents: unknown cat returns empty array', () => {
  const Catnu = loadCatnu();
  const state = { cats: [], milestones: [], logs: [] };
  assert.equal(Catnu.timelineEvents(state, 'nope').length, 0);
});

test('monthlyRecap: full data computes correctly', () => {
  const Catnu = loadCatnu();
  const monthStart = new Date(2026, 5, 1).getTime(); // June 2026
  const state = {
    cats: [{ id: 'c1', homeDate: '2026-01-01' }],
    logs: [
      { catId: 'c1', ts: monthStart + 1 * DAY, reactions: ['purr'], actions: ['groom'] },
      { catId: 'c1', ts: monthStart + 2 * DAY, reactions: ['purr'], actions: ['groom'] },
      { catId: 'c1', ts: monthStart + 3 * DAY, reactions: ['hiss'], actions: ['hold'] },
    ],
    milestones: [{ id: 'first-purr', catId: 'c1', unlockedAt: monthStart + 1 * DAY }],
  };
  const recap = Catnu.monthlyRecap(state, 'c1', '2026-06');
  assert.equal(recap.totalLogs, 3);
  assert.equal(recap.positiveRate, 67);
  assert.equal(recap.topAction, 'groom');
  assert.deepEqual([...recap.milestonesUnlocked], ['first-purr']);
  assert.equal(recap.daysTogetherDelta, 30);
});

test('monthlyRecap: partial data (no homeDate) still returns logs stats', () => {
  const Catnu = loadCatnu();
  const monthStart = new Date(2026, 5, 1).getTime();
  const state = {
    cats: [{ id: 'c1', homeDate: '' }],
    logs: [{ catId: 'c1', ts: monthStart + 1 * DAY, reactions: [], actions: [] }],
    milestones: [],
  };
  const recap = Catnu.monthlyRecap(state, 'c1', '2026-06');
  assert.equal(recap.totalLogs, 1);
  assert.equal(recap.positiveRate, null);
  assert.equal(recap.topAction, null);
  assert.equal(recap.milestonesUnlocked.length, 0);
  assert.equal(recap.daysTogetherDelta, null);
});

test('monthlyRecap: no logs that month returns null', () => {
  const Catnu = loadCatnu();
  const state = {
    cats: [{ id: 'c1', homeDate: '2026-01-01' }],
    logs: [{ catId: 'c1', ts: new Date(2026, 6, 5).getTime(), reactions: [], actions: [] }],
    milestones: [],
  };
  assert.equal(Catnu.monthlyRecap(state, 'c1', '2026-06'), null);
});
