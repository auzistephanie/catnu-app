import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const Catnu = loadCatnu();
const DAY = 86400000;
// 固定「而家」：2026-07-28 12:00 本地時間
const NOW = new Date(2026, 6, 28, 12, 0, 0).getTime();

/* ── relationshipLevel ── */

test('relationshipLevel: 邊界值對應正確等級', () => {
  assert.equal(Catnu.relationshipLevel(0).lv, 1);
  assert.equal(Catnu.relationshipLevel(39).lv, 1);
  assert.equal(Catnu.relationshipLevel(40).lv, 2);
  assert.equal(Catnu.relationshipLevel(54).lv, 2);
  assert.equal(Catnu.relationshipLevel(55).lv, 3);
  assert.equal(Catnu.relationshipLevel(70).lv, 4);
  assert.equal(Catnu.relationshipLevel(70).title, '黐身小棉襖');
  assert.equal(Catnu.relationshipLevel(84).lv, 4);
  assert.equal(Catnu.relationshipLevel(85).lv, 5);
  assert.equal(Catnu.relationshipLevel(100).lv, 5);
});

test('relationshipLevel: next 指向下一級＋差幾多分；頂級冇 next；null 入 null 出', () => {
  const l4 = Catnu.relationshipLevel(77);
  assert.equal(l4.next.lv, 5);
  assert.equal(l4.next.pointsNeeded, 8); // 85 - 77
  assert.equal(Catnu.relationshipLevel(92).next, null);
  assert.equal(Catnu.relationshipLevel(null), null);
  assert.equal(Catnu.relationshipLevel(undefined), null);
});

/* ── daysTogether ── */

test('daysTogether: 第一日計 1；無日期/未來日期 → null', () => {
  const today = new Date(NOW); // 2026-07-28
  assert.equal(Catnu.daysTogether('2026-07-28', NOW), 1);
  assert.equal(Catnu.daysTogether('2026-07-27', NOW), 2);
  assert.equal(Catnu.daysTogether('2023-08-01', NOW), Math.floor((NOW - new Date(2023, 7, 1).getTime()) / DAY) + 1);
  assert.equal(Catnu.daysTogether('', NOW), null);
  assert.equal(Catnu.daysTogether('2027-01-01', NOW), null);
});

/* ── upcomingAnniversaries ── */

test('upcomingAnniversaries: 生日＋嚟屋企＋自訂，按倒數日排序', () => {
  const cat = {
    birthDate: '2023-08-05',   // 下次 2026-08-05，差 8 日
    homeDate: '2023-11-01',    // 下次 2026-11-01
    anniversaries: [{ id: 'a1', label: '絕育紀念', emoji: '🏥', date: '2024-07-30' }], // 差 2 日
  };
  const list = Catnu.upcomingAnniversaries(cat, NOW);
  assert.equal(list.length, 3);
  assert.equal(list[0].key, 'custom-a1');
  assert.equal(list[0].daysUntil, 2);
  assert.equal(list[1].key, 'birthday');
  assert.equal(list[1].daysUntil, 8);
  assert.equal(list[1].years, 3); // 2026 - 2023
  assert.equal(list[2].key, 'gotcha');
});

test('upcomingAnniversaries: 正日 daysUntil=0；今年已過自動跳下年', () => {
  const cat = { birthDate: '2023-07-28', homeDate: '2023-07-01', anniversaries: [] };
  const list = Catnu.upcomingAnniversaries(cat, NOW);
  const bday = list.find(x => x.key === 'birthday');
  assert.equal(bday.daysUntil, 0);
  const gotcha = list.find(x => x.key === 'gotcha');
  assert.equal(gotcha.date, '2027-07-01'); // 今年 7-01 已過
  assert.equal(gotcha.years, 4);
});

test('upcomingAnniversaries: 冇完整日期唔出（birthYM 唔夠精度）', () => {
  const cat = { birthDate: '', homeDate: '', birthYM: '2023-05', anniversaries: [] };
  assert.equal(Catnu.upcomingAnniversaries(cat, NOW).length, 0);
});

/* ── weeklyReport ── */

test('weeklyReport: 正面率、對上週對比、最常做 action', () => {
  const logs = [
    // 今個 7 日：3 正 1 負 1 中性；groom ×2、wand ×1
    { catId: 'c1', ts: NOW - 1 * DAY, reactions: ['purr'], actions: ['groom'] },
    { catId: 'c1', ts: NOW - 2 * DAY, reactions: ['approach'], actions: ['groom'] },
    { catId: 'c1', ts: NOW - 3 * DAY, reactions: ['slowblink'], actions: ['wand'] },
    { catId: 'c1', ts: NOW - 4 * DAY, reactions: ['walkaway'], actions: [] },
    { catId: 'c1', ts: NOW - 5 * DAY, reactions: [], actions: [] },
    // 上一個 7 日：1 正 1 負
    { catId: 'c1', ts: NOW - 9 * DAY, reactions: ['purr'], actions: [] },
    { catId: 'c1', ts: NOW - 10 * DAY, reactions: ['hiss'], actions: [] },
    // 第二隻貓，唔應計入
    { catId: 'c2', ts: NOW - 1 * DAY, reactions: ['bite'], actions: ['hold'] },
  ];
  const r = Catnu.weeklyReport(logs, 'c1', NOW);
  assert.equal(r.count, 5);
  assert.equal(r.posRate, 75);      // 3/4 非中性
  assert.equal(r.prevPosRate, 50);  // 1/2
  assert.equal(r.posRateChange, 25);
  assert.equal(r.topAction, 'groom');
  assert.equal(r.topActionCount, 2);
});

test('weeklyReport: 冇非中性 entries → posRate null，change null', () => {
  const logs = [{ catId: 'c1', ts: NOW - 1 * DAY, reactions: [], actions: ['feed'] }];
  const r = Catnu.weeklyReport(logs, 'c1', NOW);
  assert.equal(r.posRate, null);
  assert.equal(r.posRateChange, null);
});

/* ── migrateState / Store v2 ── */

test('migrateState: v1 → v2 加 birthDate + anniversaries，原數據保留', () => {
  const v1 = { schemaVersion: 1, cats: [{ id: 'c1', name: '波子', birthYM: '2023-05' }], logs: [] };
  const m = Catnu.migrateState(v1);
  assert.equal(m.schemaVersion, 2);
  assert.equal(m.cats[0].name, '波子');
  assert.equal(m.cats[0].birthDate, '');
  assert.deepEqual([...m.cats[0].anniversaries], []);
});

test('migrateState: v2 idempotent；未識版本/垃圾 → null', () => {
  const v2 = { schemaVersion: 2, cats: [{ id: 'c1', birthDate: '2023-05-10', anniversaries: [{ id: 'a', label: 'x', date: '2024-01-01' }] }], logs: [] };
  const m = Catnu.migrateState(v2);
  assert.equal(m.cats[0].birthDate, '2023-05-10');
  assert.equal(m.cats[0].anniversaries.length, 1);
  assert.equal(Catnu.migrateState({ schemaVersion: 99, cats: [] }), null);
  assert.equal(Catnu.migrateState(null), null);
  assert.equal(Catnu.migrateState({ schemaVersion: 1 }), null); // 冇 cats array
});

test('Store.load: 舊 v1 localStorage 自動升 v2 唔會 reset', () => {
  const v1 = { schemaVersion: 1, cats: [{ id: 'c1', name: '糯米' }], logs: [], quests: {}, streak: { current: 2, best: 5, lastDoneDate: '' }, milestones: [], customActions: [], settings: { createdAt: 1 } };
  const C = loadCatnu({ 'catnu.v1': JSON.stringify(v1) });
  const s = C.Store.load();
  assert.equal(s.schemaVersion, 2);
  assert.equal(s.cats[0].name, '糯米');
  assert.equal(s.streak.best, 5);
});

/* ── days-* 里程碑 ── */

test('checkNewMilestones: 相處 100/365 日解鎖（按 homeDate）', () => {
  const state = {
    cats: [{ id: 'c1', homeDate: '2023-08-01' }], // 相處 3 年幾 → 100/365/500/1000 都夠… 用近啲日期
    logs: [], milestones: [], streak: { current: 0, best: 0, lastDoneDate: '' },
  };
  state.cats[0].homeDate = new Date(NOW - 120 * DAY).toISOString().slice(0, 10); // 相處 121 日
  const found = Catnu.checkNewMilestones(state, NOW);
  const ids = found.map(m => m.id);
  assert.ok(ids.includes('days-100'));
  assert.ok(!ids.includes('days-365'));
  // 已解鎖唔重複
  state.milestones = found;
  assert.equal(Catnu.checkNewMilestones(state, NOW).filter(m => m.id.startsWith('days-')).length, 0);
});
