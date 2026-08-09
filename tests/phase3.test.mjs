import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const Catnu = loadCatnu();
const DAY = 86400000;
// 固定「而家」：2026-07-28 12:00 本地時間
const NOW = new Date(2026, 6, 28, 12, 0, 0).getTime();

/* ── twoCatPK ── */

test('twoCatPK: 本週正面次數多嘅贏，離開 7 日窗嘅唔計', () => {
  const logs = [
    // c1 本週：3 正 1 負
    { catId: 'c1', ts: NOW - 1 * DAY, reactions: ['purr'], actions: [] },
    { catId: 'c1', ts: NOW - 2 * DAY, reactions: ['approach'], actions: [] },
    { catId: 'c1', ts: NOW - 3 * DAY, reactions: ['knead'], actions: [] },
    { catId: 'c1', ts: NOW - 4 * DAY, reactions: ['walkaway'], actions: [] },
    // c1 舊 log（8 日前），唔計入本週
    { catId: 'c1', ts: NOW - 8 * DAY, reactions: ['purr'], actions: [] },
    // c2 本週：1 正 2 負
    { catId: 'c2', ts: NOW - 1 * DAY, reactions: ['purr'], actions: [] },
    { catId: 'c2', ts: NOW - 2 * DAY, reactions: ['hiss'], actions: [] },
    { catId: 'c2', ts: NOW - 3 * DAY, reactions: ['bite'], actions: [] },
  ];
  const r = Catnu.twoCatPK(logs, 'c1', 'c2', NOW);
  assert.equal(r.a.pos, 3);
  assert.equal(r.a.total, 4);
  assert.equal(r.b.pos, 1);
  assert.equal(r.b.total, 3);
  assert.equal(r.winner, 'c1');
});

test('twoCatPK: 正面次數打平 → winner null', () => {
  const logs = [
    { catId: 'c1', ts: NOW - 1 * DAY, reactions: ['purr'], actions: [] },
    { catId: 'c2', ts: NOW - 1 * DAY, reactions: ['approach'], actions: [] },
  ];
  const r = Catnu.twoCatPK(logs, 'c1', 'c2', NOW);
  assert.equal(r.winner, null);
});

test('twoCatPK: 窗口邊界 — 啱啱 7 日前（含）唔計，nowTs 當刻計', () => {
  const logs = [
    { catId: 'c1', ts: NOW - 7 * DAY, reactions: ['purr'], actions: [] }, // 排除
    { catId: 'c1', ts: NOW, reactions: ['purr'], actions: [] },           // 包含
  ];
  const r = Catnu.twoCatPK(logs, 'c1', 'c2', NOW);
  assert.equal(r.a.total, 1);
  assert.equal(r.a.pos, 1);
});

/* ── personalityCard ── */

test('personalityCard: 全期非中性 < 20 → insufficient', () => {
  const logs = Array.from({ length: 5 }, (_, i) => ({
    catId: 'c1', ts: NOW - i * DAY, reactions: ['purr'], actions: [],
  }));
  const r = Catnu.personalityCard(logs, 'c1', NOW);
  assert.equal(r.insufficient, true);
  assert.equal(r.count, 5);
});

test('personalityCard: 黏人指數 ≥70% → 黐身小棉襖', () => {
  const logs = [];
  const clingyIds = ['lap', 'approach', 'knead', 'purr'];
  for (let i = 0; i < 18; i++) {
    logs.push({ catId: 'c1', ts: NOW - (10 + i) * DAY, reactions: [clingyIds[i % 4]], actions: i < 5 ? ['groom'] : [] });
  }
  for (let i = 0; i < 2; i++) {
    logs.push({ catId: 'c1', ts: NOW - (30 + i) * DAY, reactions: ['walkaway'], actions: [] });
  }
  const r = Catnu.personalityCard(logs, 'c1', NOW);
  assert.equal(r.insufficient, false);
  assert.equal(r.archetype, 'clingy');
  assert.equal(r.label, '黐身小棉襖');
  assert.equal(r.clinginess, 90);
  assert.equal(r.topAction, 'groom');
  assert.equal(r.topActionCount, 5);
});

test('personalityCard: 負面率 0.2-0.4 且近期 Lv≥3 → 傲嬌型', () => {
  const logs = [];
  // 近 7 日窗（daysAgo 0-4）：5 條非中性、全正面 → 近期 score 高，Lv 一定 ≥3
  for (let i = 0; i < 5; i++) {
    logs.push({ catId: 'c1', ts: NOW - i * DAY, reactions: [i < 2 ? 'purr' : 'slowblink'], actions: [] });
  }
  // 全期再加 10 正（非黏人）+ 9 負，令 negRate 落喺 [0.2,0.4)，clinginess 保持低
  for (let i = 0; i < 10; i++) {
    logs.push({ catId: 'c1', ts: NOW - (10 + i) * DAY, reactions: ['belly'], actions: [] });
  }
  for (let i = 0; i < 9; i++) {
    logs.push({ catId: 'c1', ts: NOW - (25 + i) * DAY, reactions: ['hiss'], actions: [] });
  }
  const r = Catnu.personalityCard(logs, 'c1', NOW);
  assert.equal(r.insufficient, false);
  assert.equal(r.clinginess < 70, true);
  assert.ok(r.negRate >= 20 && r.negRate < 40, `negRate ${r.negRate} 應該喺 20-40 之間`);
  assert.equal(r.archetype, 'tsundere');
  assert.equal(r.label, '傲嬌型');
});

test('personalityCard: 近期 Lv≤2 且全期 ≥20 條 → 慢熱型', () => {
  const logs = [];
  // 近 7 日窗：1 正 4 負，score 好低 → Lv1
  logs.push({ catId: 'c1', ts: NOW, reactions: ['slowblink'], actions: [] });
  for (let i = 1; i <= 4; i++) {
    logs.push({ catId: 'c1', ts: NOW - i * DAY, reactions: ['walkaway'], actions: [] });
  }
  // 全期再加 15 正（非黏人），湊夠 20 條非中性，唔影響近期窗
  for (let i = 0; i < 15; i++) {
    logs.push({ catId: 'c1', ts: NOW - (20 + i) * DAY, reactions: ['belly'], actions: [] });
  }
  const r = Catnu.personalityCard(logs, 'c1', NOW);
  assert.equal(r.insufficient, false);
  assert.equal(r.archetype, 'slow');
  assert.equal(r.label, '慢熱型');
});

test('personalityCard: 近期數據唔夠（level null）但夜晚 log 佔多數 → 夜貓子', () => {
  const logs = [];
  for (let i = 0; i < 12; i++) {
    logs.push({ catId: 'c1', ts: new Date(2026, 6, 18, 23, 0, 0).getTime() - i * DAY, reactions: ['slowblink'], actions: [] });
  }
  for (let i = 0; i < 9; i++) {
    logs.push({ catId: 'c1', ts: new Date(2026, 6, 18, 22, 0, 0).getTime() - (12 + i) * DAY, reactions: ['hiss'], actions: [] });
  }
  const r = Catnu.personalityCard(logs, 'c1', NOW);
  assert.equal(r.insufficient, false);
  assert.equal(r.archetype, 'night');
  assert.equal(r.label, '夜貓子');
});

test('personalityCard: 乜規則都唔中 → 神秘型 fallback', () => {
  const logs = [];
  for (let i = 0; i < 12; i++) {
    logs.push({ catId: 'c1', ts: new Date(2026, 6, 10, 12, 0, 0).getTime() - i * DAY, reactions: ['slowblink'], actions: [] });
  }
  for (let i = 0; i < 8; i++) {
    logs.push({ catId: 'c1', ts: new Date(2026, 6, 10, 13, 0, 0).getTime() - (12 + i) * DAY, reactions: ['hiss'], actions: [] });
  }
  const r = Catnu.personalityCard(logs, 'c1', NOW);
  assert.equal(r.insufficient, false);
  assert.equal(r.archetype, 'mystery');
  assert.equal(r.label, '神秘型');
});
