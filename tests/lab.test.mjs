import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatnu } from './helpers/load-app.mjs';

const DAY = 86400000;
const NOW = new Date(2026, 9, 11, 12, 0, 0).getTime();

function fixture(C) {
  return C.prepareRedesign({
    schemaVersion: 2,
    cats: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    logs: [], quests: {}, settings: {}, streak: { current: 0, best: 0, lastDoneDate: '' }, milestones: [],
  });
}
const touch = (zone, reaction, ts, catId = 'a') => ({ catId, zone, reaction, ts });

/* ── Task 1：state＋備份驗證 ── */

test('prepareRedesign 補 experiments／touches 空 array', () => {
  const C = loadCatnu();
  const s = fixture(C);
  assert.equal(Array.isArray(s.experiments), true);
  assert.equal(Array.isArray(s.touches), true);
  assert.equal(s.experiments.length, 0);
  assert.equal(s.touches.length, 0);
});

test('validateBackup：合法 experiment／touch 過；冇呢兩個 key 嘅舊備份都過', () => {
  const C = loadCatnu();
  const s = fixture(C);
  s.experiments.push({ id: 'x1', catId: 'a', type: 'name', result: 'strong', date: '2026-10-11', ts: NOW });
  s.touches.push({ id: 't1', catId: 'b', zone: 'chin', reaction: 'more', ts: NOW });
  assert.equal(C.validateBackup(s), true);
  delete s.experiments; delete s.touches;
  assert.equal(C.validateBackup(s), true);
});

test('validateBackup：未知貓／未知實驗／唔屬於該實驗嘅結果／未知部位／未知反應 → 拒絕', () => {
  const C = loadCatnu();
  const bad = [
    s => s.experiments.push({ id: 'x', catId: 'zzz', type: 'name', result: 'strong', date: '2026-10-11', ts: NOW }),
    s => s.experiments.push({ id: 'x', catId: 'a', type: 'dance', result: 'strong', date: '2026-10-11', ts: NOW }),
    s => s.experiments.push({ id: 'x', catId: 'a', type: 'name', result: 'food', date: '2026-10-11', ts: NOW }),
    s => s.touches.push({ id: 't', catId: 'a', zone: 'nose', reaction: 'more', ts: NOW }),
    s => s.touches.push({ id: 't', catId: 'a', zone: 'chin', reaction: 'meh', ts: NOW }),
    s => { s.experiments = 'nope'; },
  ];
  for (const mutate of bad) {
    const s = fixture(C);
    mutate(s);
    assert.equal(C.validateBackup(s), false);
  }
});

/* ── Task 2：小實驗 ── */

test('EXPERIMENTS：4 個實驗，各自有結果清單', () => {
  const C = loadCatnu();
  assert.equal([...C.EXPERIMENTS].map(e => e.id).join(','), 'name,blink,prefer,reunion');
  assert.equal([...C.EXPERIMENTS.find(e => e.id === 'prefer').results].join(','), 'social,food,toy,none');
});

test('experimentSummary：按貓計次數、各結果次數、最新一次（按 ts）', () => {
  const C = loadCatnu();
  const xs = [
    { catId: 'a', type: 'name', result: 'subtle', date: '2026-10-01', ts: NOW - 10 * DAY },
    { catId: 'a', type: 'name', result: 'strong', date: '2026-10-09', ts: NOW - 2 * DAY },
    { catId: 'a', type: 'name', result: 'none', date: '2026-10-05', ts: NOW - 6 * DAY },
    { catId: 'b', type: 'name', result: 'none', date: '2026-10-10', ts: NOW - DAY },
  ];
  const s = C.experimentSummary(xs, 'a');
  assert.equal(s.name.count, 3);
  assert.equal(s.name.counts.strong, 1);
  assert.equal(s.name.counts.subtle, 1);
  assert.equal(s.name.counts.none, 1);
  assert.equal(s.name.latest.result, 'strong');
  assert.equal(s.name.latest.date, '2026-10-09');
  assert.equal(s.blink.count, 0);
  assert.equal(s.blink.latest, null);
  assert.equal(s.blink.counts.returned, 0);
});

test('nextExperiment：第一個未試過嘅；全部試過 → null；唔理其他貓', () => {
  const C = loadCatnu();
  const xs = [
    { catId: 'a', type: 'name', result: 'strong', date: '2026-10-09', ts: NOW },
    { catId: 'b', type: 'blink', result: 'none', date: '2026-10-09', ts: NOW },
  ];
  assert.equal(C.nextExperiment(xs, 'a'), 'blink');
  assert.equal(C.nextExperiment([], 'a'), 'name');
  const all = ['name', 'blink', 'prefer', 'reunion'].map(type => ({ catId: 'a', type, result: 'none', date: '2026-10-09', ts: NOW }));
  all[3].result = 'greet';
  assert.equal(C.nextExperiment(all, 'a'), null);
});

/* ── Task 3：摸摸地圖 ── */

test('touchMap：<2 次 unknown；stop ≥50% avoid；more ≥50% loves；其餘 ok', () => {
  const C = loadCatnu();
  const ts = [
    touch('chin', 'more', NOW - 3), touch('chin', 'more', NOW - 2), touch('chin', 'ok', NOW - 1),
    touch('belly', 'stop', NOW - 3), touch('belly', 'ok', NOW - 2),
    touch('back', 'ok', NOW - 3), touch('back', 'more', NOW - 2), touch('back', 'ok', NOW - 1),
    touch('cheek', 'more', NOW - 1),
  ];
  const m = C.touchMap(ts, 'a');
  assert.equal(m.chin.verdict, 'loves');
  assert.equal(m.chin.n, 3);
  assert.equal(m.chin.more, 2);
  assert.equal(m.belly.verdict, 'avoid');
  assert.equal(m.back.verdict, 'ok');
  assert.equal(m.cheek.verdict, 'unknown');
  assert.equal(m.paws.verdict, 'unknown');
  assert.equal(m.paws.n, 0);
  assert.equal(m.belly.caution, true);
  assert.equal(m.chin.caution, false);
});

test('touchMap：每個部位只計最近 10 次（偏好會變）', () => {
  const C = loadCatnu();
  const ts = [];
  for (let i = 0; i < 10; i++) ts.push(touch('head', 'stop', NOW - 100 + i));
  for (let i = 0; i < 10; i++) ts.push(touch('head', 'more', NOW + i));
  const m = C.touchMap(ts, 'a');
  assert.equal(m.head.n, 10);
  assert.equal(m.head.more, 10);
  assert.equal(m.head.verdict, 'loves');
});

test('touchMap：只計呢隻貓', () => {
  const C = loadCatnu();
  const m = C.touchMap([touch('chin', 'stop', NOW, 'b'), touch('chin', 'stop', NOW + 1, 'b')], 'a');
  assert.equal(m.chin.n, 0);
  assert.equal(m.chin.verdict, 'unknown');
});

/* ── Task 4：貓咪說明書 ── */

test('catManual：搵唔到貓 → null', () => {
  const C = loadCatnu();
  assert.equal(C.catManual(fixture(C), 'zzz', NOW), null);
});

test('catManual：彙整摸摸地圖、實驗最新結果、最受落動作、最常見愛意', () => {
  const C = loadCatnu();
  const s = fixture(C);
  s.touches.push(touch('chin', 'more', NOW - 2), touch('chin', 'more', NOW - 1),
                 touch('belly', 'stop', NOW - 2), touch('belly', 'stop', NOW - 1));
  s.experiments.push({ catId: 'a', type: 'name', result: 'strong', date: '2026-10-10', ts: NOW });
  for (let i = 0; i < 5; i++) s.logs.push({ catId: 'a', ts: NOW - (i + 1) * DAY, actions: ['wand'], reactions: ['purr'] });
  for (let i = 0; i < 5; i++) s.logs.push({ catId: 'a', ts: NOW - (i + 20) * DAY, actions: [], reactions: ['walkaway'] });
  s.logs.push({ catId: 'a', ts: NOW - 40 * DAY, actions: [], reactions: ['knead'] });
  const m = C.catManual(s, 'a', NOW);
  assert.equal([...m.touchLoves].join(','), 'chin');
  assert.equal([...m.touchAvoid].join(','), 'belly');
  assert.equal(m.experiments.name, 'strong');
  assert.equal(m.experiments.blink, null);
  assert.equal([...m.bestActions].join(','), 'wand');
  assert.equal([...m.topReactions].join(','), 'purr,knead');
  assert.equal(m.ready, true);
});

test('catManual：得 1 類內容 → ready false', () => {
  const C = loadCatnu();
  const s = fixture(C);
  s.experiments.push({ catId: 'a', type: 'blink', result: 'returned', date: '2026-10-10', ts: NOW });
  const m = C.catManual(s, 'a', NOW);
  assert.equal(m.ready, false);
  assert.equal(m.filled, 1);
  assert.equal(m.sections, 1);
});

test('catManual：得「愛意」一類（即使有 3 項）都唔算夠 → ready false', () => {
  const C = loadCatnu();
  const s = fixture(C);
  for (const r of ['purr', 'knead', 'lap']) s.logs.push({ catId: 'a', ts: NOW - DAY, actions: [], reactions: [r] });
  const m = C.catManual(s, 'a', NOW);
  assert.equal(m.topReactions.length, 3);
  assert.equal(m.sections, 1);
  assert.equal(m.ready, false);
});

/* ── Task 5：文字 ── */

test('每日問題要講明輪到邊隻貓：turnOf 文字帶 {name}，4 個 locale 都有', () => {
  const C = loadCatnu();
  for (const l of C.LOCALES) {
    assert.ok(C.COPY[l].turnOf, `${l} 缺 turnOf`);
    assert.ok(C.COPY[l].turnOf.includes('{name}'), `${l} turnOf 冇 {name}`);
  }
});

test('新功能用到嘅每個文字 key，4 個 locale 都有', () => {
  const C = loadCatnu();
  const keys = ['labTitle', 'labProgress', 'labTry', 'labAgain', 'labNotYet', 'labNote', 'labSuggest', 'labResultPrompt',
    'touchTitle', 'touchHint', 'touchAsk', 'touchCaution', 'touchSource',
    'manualOpen', 'manualTitle', 'manualTouchLoves', 'manualTouchAvoid', 'manualBest', 'manualWarn', 'manualReactions',
    'manualExperiments', 'manualEmpty', 'manualDownload', 'manualDisclaimer'];
  for (const e of C.EXPERIMENTS) {
    keys.push('exp_' + e.id, 'exp_' + e.id + '_sci', 'exp_' + e.id + '_steps');
    for (const r of e.results) keys.push('res_' + r);
  }
  for (const z of C.TOUCH_ZONES) keys.push('zone_' + z.id);
  for (const r of C.TOUCH_REACTIONS) keys.push('touch_' + r);
  for (const v of ['loves', 'ok', 'avoid', 'unknown']) keys.push('verdict_' + v);
  for (const a of C.ACTIONS) keys.push(a.id);
  for (const r of C.REACTIONS.filter(x => x.polarity > 0)) keys.push(r.id);
  for (const l of C.LOCALES) for (const k of keys) assert.ok(C.COPY[l][k], `${l} 缺 ${k}`);
});

/* ── 刪除單條記錄（可復原）── */

test('removeRecord：按 id 移走一條，回傳新 array＋被移走嘅記錄＋原位置；唔改原 array', () => {
  const C = loadCatnu();
  const orig = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const r = C.removeRecord(orig, 'b');
  assert.equal([...r.items].map(x => x.id).join(','), 'a,c');
  assert.equal(r.removed.id, 'b');
  assert.equal(r.index, 1);
  assert.equal(orig.length, 3);
});

test('removeRecord：搵唔到 id → null', () => {
  const C = loadCatnu();
  assert.equal(C.removeRecord([{ id: 'a' }], 'zzz'), null);
});

test('restoreRecord：放返落原位置；位置超出範圍就放尾；唔改原 array', () => {
  const C = loadCatnu();
  const items = [{ id: 'a' }, { id: 'c' }];
  const back = C.restoreRecord(items, { id: 'b' }, 1);
  assert.equal([...back].map(x => x.id).join(','), 'a,b,c');
  const tail = C.restoreRecord(items, { id: 'z' }, 99);
  assert.equal([...tail].map(x => x.id).join(','), 'a,c,z');
  assert.equal(items.length, 2);
});

test('prepareRedesign：補返冇 id 嘅 experiments／touches，已有 id 唔郁，id 唔重複', () => {
  const C = loadCatnu();
  const s = C.prepareRedesign({
    schemaVersion: 2, cats: [{ id: 'a', name: 'A' }], logs: [], quests: {}, settings: {}, streak: { current: 0 }, milestones: [],
    experiments: [{ catId: 'a', type: 'name', result: 'none', date: '2026-10-11', ts: 1 }, { id: 'keep', catId: 'a', type: 'blink', result: 'none', date: '2026-10-11', ts: 2 }],
    touches: [{ catId: 'a', zone: 'chin', reaction: 'more', ts: 3 }, { catId: 'a', zone: 'chin', reaction: 'more', ts: 3 }],
  });
  assert.equal(s.experiments[1].id, 'keep');
  const ids = [...s.experiments, ...s.touches].map(x => x.id);
  assert.ok(ids.every(id => typeof id === 'string' && id.length > 0));
  assert.equal(new Set(ids).size, ids.length);
});

test('刪除記錄用到嘅文字 key，4 個 locale 都有', () => {
  const C = loadCatnu();
  for (const l of C.LOCALES) {
    for (const k of ['recordsTitle', 'deleteRecord', 'recordDeleted']) assert.ok(C.COPY[l][k], `${l} 缺 ${k}`);
    assert.ok(C.COPY[l].recordsTitle.includes('{n}'), `${l} recordsTitle 冇 {n}`);
  }
});

test('pageRecords：按 limit 切，回傳顯示嘅同剩低嘅數量；limit 大過總數就全部顯示', () => {
  const C = loadCatnu();
  const items = Array.from({ length: 14 }, (_, i) => ({ id: 'r' + i }));
  const p = C.pageRecords(items, 10);
  assert.equal(p.shown.length, 10);
  assert.equal(p.remaining, 4);
  const all = C.pageRecords(items, 20);
  assert.equal(all.shown.length, 14);
  assert.equal(all.remaining, 0);
  assert.equal(C.pageRecords([], 10).remaining, 0);
  assert.equal(items.length, 14);
});

test('prepareRedesign：每日觀察（observations）冇 id 都會補返，已有 id 唔郁', () => {
  const C = loadCatnu();
  const s = C.prepareRedesign({
    schemaVersion: 2, cats: [{ id: 'a', name: 'A' }], logs: [], quests: {}, settings: {}, streak: { current: 0 }, milestones: [],
    observations: [{ catId: 'a', date: '2026-10-10', answer: 'yes', question: 'quiet-approach' }, { id: 'keep', catId: 'a', date: '2026-10-11', answer: 'no', question: 'toy-interest' }, { catId: 'a', date: '2026-10-12', answer: 'skip' }],
  });
  assert.equal(s.observations[1].id, 'keep');
  const ids = s.observations.map(o => o.id);
  assert.ok(ids.every(id => typeof id === 'string' && id.length > 0));
  assert.equal(new Set(ids).size, ids.length);
});

test('刪除每日觀察後，Catnu.observedTraits／insight 即時跟住變（唔再算被刪嗰條）', () => {
  const C = loadCatnu();
  const s = C.prepareRedesign({
    schemaVersion: 2, cats: [{ id: 'a', name: 'A' }], logs: [], quests: {}, settings: {}, streak: { current: 0 }, milestones: [],
    observations: [1, 2, 3].map(i => ({ id: 'o' + i, catId: 'a', date: '2026-10-0' + i, answer: 'yes', question: 'quiet-approach' })),
  });
  assert.equal(C.observedTraits(s, 'a')[0].samples, 3);
  const r = C.removeRecord(s.observations, 'o2');
  s.observations = r.items;
  assert.equal(C.observedTraits(s, 'a')[0].samples, 2);
  s.observations = [];
  assert.equal(C.observedTraits(s, 'a').length, 0);
});
