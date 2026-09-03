import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatnu } from './helpers/load-app.mjs';

const Catnu = loadCatnu();
const DAY = 86400000;
const NOW = new Date('2026-08-30T12:00:00+08:00').getTime();

test('weeklyStory: 正面率升溫時揀最近正面互動做今週一刻', () => {
  const logs = [
    { id: 'old-pos', catId: 'c1', ts: NOW - 8 * DAY, reactions: ['purr'], actions: ['groom'] },
    { id: 'old-neg', catId: 'c1', ts: NOW - 9 * DAY, reactions: ['walkaway'], actions: ['hold'] },
    { id: 'p1', catId: 'c1', ts: NOW - 3 * DAY, reactions: ['approach'], actions: ['wand'] },
    { id: 'p2', catId: 'c1', ts: NOW - 2 * DAY, reactions: ['purr'], actions: ['wand'] },
    { id: 'p3', catId: 'c1', ts: NOW - 1000, reactions: ['slowblink'], actions: [] },
  ];
  const story = Catnu.weeklyStory(logs, 'c1', NOW);
  assert.equal(story.insufficient, false);
  assert.equal(story.tone, 'warming');
  assert.equal(story.count, 3);
  assert.equal(story.topAction, 'wand');
  assert.equal(story.highlight.id, 'p3');
});

test('weeklyStory: 負面多數會變成界線故事；冇記錄則 insufficient', () => {
  const logs = [
    { id: 'n1', catId: 'c1', ts: NOW - DAY, reactions: ['walkaway'], actions: ['hold'] },
    { id: 'n2', catId: 'c1', ts: NOW - 2 * DAY, reactions: ['flatears'], actions: ['hold'] },
    { id: 'p1', catId: 'c1', ts: NOW - 3 * DAY, reactions: ['purr'], actions: ['groom'] },
  ];
  assert.equal(Catnu.weeklyStory(logs, 'c1', NOW).tone, 'boundary');
  const empty = Catnu.weeklyStory(logs, 'c2', NOW);
  assert.equal(empty.insufficient, true);
  assert.equal(empty.count, 0);
  assert.equal(empty.tone, 'empty');
  assert.equal(empty.highlight, null);
});

test('timelineEntries: 新至舊排序並可按貓篩選', () => {
  const logs = [
    { id: 'a', catId: 'c1', ts: 100 },
    { id: 'b', catId: 'c2', ts: 300 },
    { id: 'c', catId: 'c1', ts: 200 },
  ];
  assert.deepEqual(Catnu.timelineEntries(logs, 'all').map(x => x.id), ['b', 'c', 'a']);
  assert.deepEqual(Catnu.timelineEntries(logs, 'c1').map(x => x.id), ['c', 'a']);
  assert.deepEqual(logs.map(x => x.id), ['a', 'b', 'c']);
});

test('questGoalStatus: 預設 2 個，完成目標後其餘任務係 bonus', () => {
  const quests = [{ done: true }, { done: true }, { done: false }];
  const status = Catnu.questGoalStatus(quests);
  assert.equal(status.goal, 2);
  assert.equal(status.doneCount, 2);
  assert.equal(status.remaining, 0);
  assert.equal(status.reached, true);
  assert.equal(Catnu.questGoalStatus(quests, 1).goal, 1);
  assert.equal(Catnu.questGoalStatus(quests, 9).goal, 3);
  assert.equal(Catnu.questGoalStatus([{ done: true }], 2).remaining, 1);
});

test('backupStatus/backupSummary: 30 日先提醒並正確預覽內容', () => {
  const createdAt = NOW - 40 * DAY;
  const never = Catnu.backupStatus({ createdAt, lastBackupAt: null }, NOW);
  assert.equal(never.never, true);
  assert.equal(never.due, true);
  const fresh = Catnu.backupStatus({ createdAt, lastBackupAt: NOW - 5 * DAY }, NOW);
  assert.equal(fresh.due, false);
  assert.equal(fresh.daysAgo, 5);
  const summary = Catnu.backupSummary({ cats: [{}, {}], logs: [{}, {}, {}], milestones: [{}], settings: { lastBackupAt: NOW - DAY } }, NOW);
  assert.equal(summary.cats, 2);
  assert.equal(summary.logs, 3);
  assert.equal(summary.milestones, 1);
  assert.equal(summary.backupAt, NOW - DAY);
});

test('migrateState: 舊資料自動補每日目標 2 同備份狀態', () => {
  const state = Catnu.migrateState({
    schemaVersion: 2,
    cats: [], logs: [], milestones: [], quests: {}, customActions: [],
    streak: { current: 0, best: 0, lastDoneDate: '' },
    settings: { createdAt: NOW },
  });
  assert.equal(state.settings.dailyGoal, 2);
  assert.equal(state.settings.lastBackupAt, null);
});

test('timeline 導航：撳頂部 tab 會離開 history 子頁', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const switchTab = html.match(/function switchTab\(name\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(switchTab, /recordHistoryOpen = false/);
  assert.match(switchTab, /recordHistoryDetailId = null/);
});

test('新 selectable controls 暴露 aria-pressed 狀態', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-daily-goal="2" aria-pressed=/);
  assert.match(html, /data-history-cat="all" aria-pressed=/);
  assert.match(html, /data-qid="\$\{q\.id\}" aria-pressed=/);
});
