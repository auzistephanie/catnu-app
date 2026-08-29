import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const Catnu = loadCatnu();
const localTs = (date, hour = 12) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();

test('beginnerJourney: 只喺首 3 個日曆日出現，按有記錄日數計進度', () => {
  const startedAt = localTs('2026-08-01', 9);
  const logs = [
    { catId: 'c1', ts: localTs('2026-08-01'), reactions: ['purr'], actions: [] },
    { catId: 'c1', ts: localTs('2026-08-03'), reactions: ['slowblink'], actions: [] },
    { catId: 'c2', ts: localTs('2026-08-02'), reactions: ['purr'], actions: [] },
  ];
  const journey = Catnu.beginnerJourney(logs, 'c1', startedAt, localTs('2026-08-03', 18));
  assert.equal(journey.day, 3);
  assert.equal(journey.progressDays, 2);
  assert.equal(journey.count, 2);
  assert.equal(journey.loggedToday, true);
  assert.equal(Catnu.beginnerJourney(logs, 'c1', startedAt, localTs('2026-08-04')), null);
});

test('beginnerJourney: 同一正面反應兩次先出誠實早期訊號', () => {
  const startedAt = localTs('2026-08-01', 9);
  const one = [{ catId: 'c1', ts: localTs('2026-08-01'), reactions: ['slowblink'], actions: [] }];
  assert.equal(Catnu.beginnerJourney(one, 'c1', startedAt, localTs('2026-08-02')).earlySignal, null);
  const two = one.concat({ catId: 'c1', ts: localTs('2026-08-02'), reactions: ['slowblink'], actions: [] });
  const signal = Catnu.beginnerJourney(two, 'c1', startedAt, localTs('2026-08-02', 18)).earlySignal;
  assert.equal(signal.reactionId, 'slowblink');
  assert.equal(signal.count, 2);
});

test('checkStreakBreak: 每週第一次漏一日自動用休息券保住 streak', () => {
  const streak = { current: 5, best: 5, lastDoneDate: '2026-08-03' };
  const result = Catnu.checkStreakBreak(streak, '2026-08-05');
  assert.equal(result.current, 5);
  assert.equal(result.lastDoneDate, '2026-08-04');
  assert.equal(result.restUsedDate, '2026-08-04');
  assert.equal(Catnu.restDayStatus(result, '2026-08-05').available, false);
});

test('checkStreakBreak: 同一週第二次漏日會歸零；新一週重新有休息券', () => {
  const used = { current: 5, best: 5, lastDoneDate: '2026-08-05', restWeekKey: '2026-08-03', restUsedDate: '2026-08-04' };
  assert.equal(Catnu.checkStreakBreak(used, '2026-08-07').current, 0);
  assert.equal(Catnu.restDayStatus(used, '2026-08-10').available, true);
});

test('checkStreakBreak: 連續漏兩日唔會由一張休息券全部保住', () => {
  const streak = { current: 8, best: 8, lastDoneDate: '2026-08-03' };
  assert.equal(Catnu.checkStreakBreak(streak, '2026-08-06').current, 0);
});

test('completeQuestsForDay: 完成任務後仍保留今週休息券已用狀態', () => {
  const afterRest = Catnu.checkStreakBreak({ current: 5, best: 5, lastDoneDate: '2026-08-03' }, '2026-08-05');
  const completed = Catnu.completeQuestsForDay(afterRest, '2026-08-05');
  assert.equal(completed.current, 6);
  assert.equal(completed.restUsedDate, '2026-08-04');
  assert.equal(Catnu.restDayStatus(completed, '2026-08-06').available, false);
});
