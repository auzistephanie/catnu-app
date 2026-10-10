# 貓咪小實驗＋摸摸地圖＋貓咪說明書 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加三個互相連接嘅功能：①貓咪小實驗（4 個有研究根據、1 分鐘做完嘅家居觀察）②摸摸地圖（記錄摸邊度＋反應，累積成偏好圖）③貓咪說明書（將①②＋現有分析整理成一頁，可下載圖片交俾 cat sitter）。

**Architecture:** 全部喺單一 `index.html`。計算邏輯放 pure-logic zone（`/* @APP:STORE */` 之前），掛喺 `window.Catnu`，用 `tests/lab.test.mjs` 測；UI 放 redesign app zone（`r` 開頭嘅 render 函數，`rRender()` 統一綁事件）。資料係 state 嘅兩個新 array（`experiments`、`touches`），additive，**唔升 schemaVersion**（同 redesign 加 `moments`／`observations` 一樣做法），由 `Catnu.prepareRedesign` 補空 array、`Catnu.validateBackup` 驗證。

**Tech Stack:** Vanilla JS／CSS／inline SVG／Canvas 2D；Node `node:test`（經 `tests/helpers/load-app.mjs` 用 `vm` 讀 `<script>`）。

**定位約束（唔可以違反）：** 溫柔、唔迫人、唔係診斷；唔用 AI、唔加遊戲化獎賞／內疚提示；資料只留喺裝置。每個實驗結果都要寫明「冇反應都好正常」。

**Repo 規則（CLAUDE.md 凌駕 skill 預設）：** 唔好逐個 task 用 git commit。全部 task 做完、測試全綠、瀏覽器驗證完，先用 `python3 scripts/github_push.py "<msg>"` 一次過推（一 run 一 commit），開工前先跑 `python3 scripts/github_push.py --check`。

---

## File Structure

| 檔案 | 改動 | 職責 |
|---|---|---|
| `index.html` `<style>` | Modify（`@media(max-width:420px){.r-app` 嗰行之前） | `.r-lab`／`.lab-*`／`.touch-*`／`.tz-*`／`.manual-*` 樣式 |
| `index.html` pure-logic | Modify（`/* @APP:STORE */` 之前插入） | `EXPERIMENTS`、`experimentSummary`、`nextExperiment`、`TOUCH_ZONES`、`TOUCH_REACTIONS`、`touchMap`、`catManual` |
| `index.html` `wrapCenteredText` | Modify（加 `return lines.length;`） | 畀說明書 canvas 知道每段用咗幾多行 |
| `index.html` share card | Modify（`/* @APP:BOOT */` 之前插入） | `Catnu.shareCatManualCard` |
| `index.html` redesign | Modify | `copyRows` 新文字（4 locale）、`prepareRedesign`／`validateBackup` 新 array、`rLabBlock`／`rLabSuggest`／`rExperimentOpen`／`rTouchBlock`／`rTouchOpen`／`rManualOpen`、`rToday`／`rCats`／`rRender` 掛鈎 |
| `tests/lab.test.mjs` | Create | 上面所有 pure-logic 嘅 unit test |
| `CHANGELOG.md` | Modify（頂部） | 改動記錄 |

---

## 資料格式

```js
// state.experiments[]
{ id: 'x1791700000000ab12', catId: 'c1', type: 'name', result: 'strong', date: '2026-10-11', ts: 1791700000000 }
// state.touches[]
{ id: 't1791700000000cd34', catId: 'c1', zone: 'chin', reaction: 'more', ts: 1791700000000 }
```

---

### Task 1: State 補 array＋備份驗證

**Files:**
- Modify: `index.html`（`Catnu.prepareRedesign`、`Catnu.validateBackup`）
- Test: `tests/lab.test.mjs`（新檔）

- [ ] **Step 1: 寫失敗測試**（建立 `tests/lab.test.mjs`）

```js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test tests/lab.test.mjs`
Expected: FAIL（`s.experiments` 係 `undefined`；壞資料 `validateBackup` 回傳 `true`）

- [ ] **Step 3: 實作**

`Catnu.prepareRedesign` 入面將：
```js
 for(const key of ['moments','assets','observations','insightFeedback','relationships']) if(!Array.isArray(state[key])) state[key]=[];
```
改成：
```js
 for(const key of ['moments','assets','observations','insightFeedback','relationships','experiments','touches']) if(!Array.isArray(state[key])) state[key]=[];
```

`Catnu.validateBackup` 入面將：
```js
 for(const key of ['moments','assets','observations','insightFeedback','relationships'])if(parsed[key]!==undefined&&!Array.isArray(parsed[key]))return false;
```
改成：
```js
 for(const key of ['moments','assets','observations','insightFeedback','relationships','experiments','touches'])if(parsed[key]!==undefined&&!Array.isArray(parsed[key]))return false;
```
並喺 `return true;` 之前加：
```js
 if((parsed.experiments||[]).some(x=>!x||!ids.has(x.catId)||!Catnu.EXPERIMENTS.some(e=>e.id===x.type&&e.results.includes(x.result))))return false;
 if((parsed.touches||[]).some(t=>!t||!ids.has(t.catId)||!Catnu.TOUCH_ZONES.some(z=>z.id===t.zone)||!Catnu.TOUCH_REACTIONS.includes(t.reaction)))return false;
```
（`Catnu.EXPERIMENTS`／`TOUCH_ZONES`／`TOUCH_REACTIONS` 喺 Task 2、3 定義；兩個 task 做完先會全綠。為咗 Task 1 自己可以過，Task 2、3 嘅常量定義可以喺呢步一齊貼入，見下面兩個 task 嘅 Step 3。）

- [ ] **Step 4: 跑測試（做埋 Task 2、3 常量之後）**

Run: `node --test tests/lab.test.mjs`
Expected: 上面 3 個 PASS

---

### Task 2: 貓咪小實驗 pure-logic

**Files:**
- Modify: `index.html`（`/* @APP:STORE */` 之前）
- Test: `tests/lab.test.mjs`

- [ ] **Step 1: 寫失敗測試**（append）

```js
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
  all[1].result = 'returned'; all[2].result = 'none'; all[3].result = 'greet';
  assert.equal(C.nextExperiment(all, 'a'), null);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test tests/lab.test.mjs`
Expected: FAIL（`C.EXPERIMENTS` undefined）

- [ ] **Step 3: 實作**（插喺 `/* @APP:STORE */` 正上方）

```js
/* @LOGIC:LAB — 貓咪小實驗（每個實驗對應一份研究；結果文字喺 copyRows 嘅 res_<result>）*/
Catnu.EXPERIMENTS = [
  { id: 'name',    emoji: '📛', results: ['strong', 'subtle', 'none'] },
  { id: 'blink',   emoji: '😌', results: ['returned', 'approached', 'none'] },
  { id: 'prefer',  emoji: '🎁', results: ['social', 'food', 'toy', 'none'] },
  { id: 'reunion', emoji: '🚪', results: ['greet', 'nearby', 'carryon'] },
];

Catnu.experimentSummary = function experimentSummary(experiments, catId) {
  const out = {};
  for (const def of Catnu.EXPERIMENTS) {
    const rows = experiments.filter(x => x.catId === catId && x.type === def.id);
    const counts = Object.fromEntries(def.results.map(r => [r, 0]));
    rows.forEach(x => { if (counts[x.result] !== undefined) counts[x.result]++; });
    const last = rows.reduce((best, x) => (!best || x.ts > best.ts ? x : best), null);
    out[def.id] = { count: rows.length, counts, latest: last ? { result: last.result, date: last.date } : null };
  }
  return out;
};

Catnu.nextExperiment = function nextExperiment(experiments, catId) {
  const def = Catnu.EXPERIMENTS.find(e => !experiments.some(x => x.catId === catId && x.type === e.id));
  return def ? def.id : null;
};
```

- [ ] **Step 4: 跑測試**

Run: `node --test tests/lab.test.mjs`
Expected: 呢 3 個 PASS（Task 1 嘅驗證測試要等 Task 3 常量）

---

### Task 3: 摸摸地圖 pure-logic

**Files:**
- Modify: `index.html`（緊接 Task 2 代碼之後）
- Test: `tests/lab.test.mjs`

- [ ] **Step 1: 寫失敗測試**（append）

```js
const touch = (zone, reaction, ts, catId = 'a') => ({ catId, zone, reaction, ts });

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
});

test('touchMap：每個部位只計最近 10 次（偏好會變）', () => {
  const C = loadCatnu();
  const ts = [];
  for (let i = 0; i < 10; i++) ts.push(touch('head', 'stop', NOW - 100 + i)); // 舊
  for (let i = 0; i < 10; i++) ts.push(touch('head', 'more', NOW + i));       // 新
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test tests/lab.test.mjs`
Expected: FAIL（`C.touchMap` is not a function）

- [ ] **Step 3: 實作**

```js
/* @LOGIC:TOUCH — 摸摸地圖（參考 Haywood 2021 CAT 指引；caution＝好多貓都敏感嘅位置）*/
Catnu.TOUCH_ZONES = [
  { id: 'cheek', caution: false }, { id: 'chin', caution: false }, { id: 'earbase', caution: false }, { id: 'head', caution: false },
  { id: 'back', caution: true }, { id: 'tailbase', caution: true }, { id: 'belly', caution: true }, { id: 'paws', caution: true },
];
Catnu.TOUCH_REACTIONS = ['more', 'ok', 'stop'];
Catnu.TOUCH_WINDOW = 10;

Catnu.touchMap = function touchMap(touches, catId) {
  const out = {};
  for (const z of Catnu.TOUCH_ZONES) {
    const rows = touches.filter(t => t.catId === catId && t.zone === z.id)
      .sort((p, q) => q.ts - p.ts).slice(0, Catnu.TOUCH_WINDOW);
    const n = rows.length;
    const more = rows.filter(t => t.reaction === 'more').length;
    const ok = rows.filter(t => t.reaction === 'ok').length;
    const stop = rows.filter(t => t.reaction === 'stop').length;
    let verdict = 'unknown';
    if (n >= 2) verdict = stop / n >= 0.5 ? 'avoid' : more / n >= 0.5 ? 'loves' : 'ok';
    out[z.id] = { n, more, ok, stop, verdict, caution: z.caution };
  }
  return out;
};
```

- [ ] **Step 4: 跑測試**

Run: `node --test tests/lab.test.mjs`
Expected: Task 1–3 全部 PASS

---

### Task 4: 貓咪說明書 pure-logic

**Files:**
- Modify: `index.html`（緊接 Task 3 代碼之後）
- Test: `tests/lab.test.mjs`

- [ ] **Step 1: 寫失敗測試**（append）

```js
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
  // 5 次逗貓棒後全部正面；另外 5 條相隔好遠嘅負面 → wand 係 positiveFinding
  for (let i = 0; i < 5; i++) s.logs.push({ catId: 'a', ts: NOW - (i + 1) * DAY, actions: ['wand'], reactions: ['purr'] });
  for (let i = 0; i < 5; i++) s.logs.push({ catId: 'a', ts: NOW - (i + 20) * DAY, actions: [], reactions: ['walkaway'] });
  s.logs.push({ catId: 'a', ts: NOW - 40 * DAY, actions: [], reactions: ['knead'] });
  const m = C.catManual(s, 'a', NOW);
  assert.equal([...m.touchLoves].join(','), 'chin');
  assert.equal([...m.touchAvoid].join(','), 'belly');
  assert.equal(m.experiments.name, 'strong');
  assert.equal(m.experiments.blink, null);
  assert.equal([...m.bestActions].join(','), 'wand');
  assert.equal([...m.topReactions].join(','), 'purr,knead'); // 只計正面，按次數排
  assert.equal(m.ready, true);
});

test('catManual：資料唔夠（<3 項有內容）→ ready false', () => {
  const C = loadCatnu();
  const s = fixture(C);
  s.experiments.push({ catId: 'a', type: 'blink', result: 'returned', date: '2026-10-10', ts: NOW });
  const m = C.catManual(s, 'a', NOW);
  assert.equal(m.ready, false);
  assert.equal(m.filled, 1);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test tests/lab.test.mjs`
Expected: FAIL（`C.catManual` is not a function）

- [ ] **Step 3: 實作**

```js
/* @LOGIC:MANUAL — 貓咪說明書：將摸摸地圖＋實驗＋互動分析整理成一頁（唔係診斷）*/
Catnu.MANUAL_MIN_FILLED = 3;

Catnu.catManual = function catManual(state, catId, nowTs) {
  if (!(state.cats || []).some(c => c.id === catId)) return null;
  const map = Catnu.touchMap(state.touches || [], catId);
  const zoneIds = Catnu.TOUCH_ZONES.map(z => z.id);
  const touchLoves = zoneIds.filter(z => map[z].verdict === 'loves');
  const touchAvoid = zoneIds.filter(z => map[z].verdict === 'avoid');

  const summary = Catnu.experimentSummary(state.experiments || [], catId);
  const experiments = Object.fromEntries(Catnu.EXPERIMENTS.map(e => [e.id, summary[e.id].latest ? summary[e.id].latest.result : null]));

  const logs = state.logs || [];
  const bestActions = [], warnActions = [];
  for (const a of Catnu.ACTIONS) {
    const r = Catnu.actionCorrelation(logs, catId, a.id, nowTs);
    if (r.positiveFinding) bestActions.push(a.id);
    else if (r.negativeWarning) warnActions.push(a.id);
  }

  const counts = {};
  logs.filter(l => l.catId === catId).forEach(l => (l.reactions || []).forEach(r => {
    if (Catnu.REACTION_POLARITY[r] > 0) counts[r] = (counts[r] || 0) + 1;
  }));
  const topReactions = Object.entries(counts)
    .sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1)).slice(0, 3).map(([id]) => id);

  const filled = touchLoves.length + touchAvoid.length + Object.values(experiments).filter(Boolean).length
    + bestActions.length + warnActions.length + topReactions.length;
  return { catId, touchLoves, touchAvoid, experiments, bestActions, warnActions, topReactions, filled, ready: filled >= Catnu.MANUAL_MIN_FILLED };
};
```

- [ ] **Step 4: 跑測試**

Run: `node --test tests/*.test.mjs`
Expected: 全部 PASS（原有 91 個＋新增 lab 測試）

---

### Task 5: 文字（4 個 locale）

**Files:**
- Modify: `index.html`（`copyRows` 最尾，`linked:['連結貓咪','連結貓咪','关联猫咪','Linked cats']` 之後）
- Test: `tests/lab.test.mjs`

- [ ] **Step 1: 寫失敗測試**（append）

```js
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
  for (const l of C.LOCALES) for (const k of keys) assert.ok(C.COPY[l][k], `${l} 缺 ${k}`);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test tests/lab.test.mjs`
Expected: FAIL（`zh-HK 缺 labTitle`）

- [ ] **Step 3: 實作** — 將 `linked:['連結貓咪','連結貓咪','关联猫咪','Linked cats']` 改成以下（逗號接上）：

```js
 linked:['連結貓咪','連結貓咪','关联猫咪','Linked cats'],

 labTitle:['貓咪小實驗','貓咪小實驗','猫咪小实验','Little cat experiments'], labProgress:['已試 {n}／4','已試 {n}／4','已试 {n}／4','{n}/4 tried'], labTry:['試吓','試試看','试试看','Try it'], labAgain:['再試一次','再試一次','再试一次','Try again'], labNotYet:['未試過','還沒試過','还没试过','Not tried yet'],
 labNote:['結果唔係考試：冇反應都好正常，貓有自己嘅心情。','結果不是考試：沒有反應也很正常，貓有自己的心情。','结果不是考试：没有反应也很正常，猫有自己的心情。','Not a test — no reaction is perfectly normal. Cats have their own moods.'],
 labSuggest:['今日想唔想試個小實驗？','今天想試個小實驗嗎？','今天想试个小实验吗？','Try a little experiment today?'], labResultPrompt:['佢點反應？','牠怎樣反應？','它怎样反应？','How did they respond?'],
 exp_name:['認唔認得自己個名','認不認得自己的名字','认不认得自己的名字','Do they know their name?'],
 exp_name_sci:['日本研究：78 隻貓聽到自己個名，反應明顯大過相似嘅字（Saito 2019）','日本研究：78 隻貓聽到自己的名字，反應明顯大於相似的詞（Saito 2019）','日本研究：78 只猫听到自己的名字，反应明显大于相似的词（Saito 2019）','Japanese study: 78 cats reacted more to their own name than to similar words (Saito 2019)'],
 exp_name_steps:['等佢放鬆、冇望住你嗰陣，用平時語氣逐個講 4 個同佢個名差唔多長嘅字，每個隔 15 秒；最後叫佢個名一次。','趁牠放鬆、沒看著你時，用平常語氣逐一說 4 個和牠名字差不多長的詞，每個間隔 15 秒；最後叫牠的名字一次。','趁它放松、没看着你时，用平常语气逐一说 4 个和它名字差不多长的词，每个间隔 15 秒；最后叫它的名字一次。','When they are relaxed and not looking at you, say 4 words about as long as their name in your normal voice, 15 seconds apart. Then say their name once.'],
 res_strong:['郁耳仔／轉頭，仲行過嚟或者叫返你','動耳朵／轉頭，還走過來或回應你','动耳朵／转头，还走过来或回应你','Turned ears or head, and came over or called back'], res_subtle:['淨係郁吓耳仔或者轉頭','只是動耳朵或轉頭','只是动耳朵或转头','Just an ear twitch or head turn'], res_none:['冇乜反應','沒什麼反應','没什么反应','No visible reaction'],
 exp_blink:['慢眨眼對話','慢眨眼對話','慢眨眼对话','Slow-blink conversation'],
 exp_blink_sci:['英國研究：主人慢眨眼之後，貓更常眨返，亦更願意行近（Humphrey 2020）','英國研究：主人慢眨眼之後，貓更常眨回來，也更願意靠近（Humphrey 2020）','英国研究：主人慢眨眼之后，猫更常眨回来，也更愿意靠近（Humphrey 2020）','UK study: after owners slow-blinked, cats blinked back more and approached more readily (Humphrey 2020)'],
 exp_blink_steps:['坐喺佢 1 米外，望住佢，慢慢半閉眼、合埋 2 秒再打開，重複 3 次。','坐在牠 1 公尺外，看著牠，慢慢半閉眼、閉上 2 秒再張開，重複 3 次。','坐在它 1 米外，看着它，慢慢半闭眼、闭上 2 秒再张开，重复 3 次。','Sit about a metre away and look at them. Slowly narrow your eyes, close them for 2 seconds, then open. Repeat 3 times.'],
 res_returned:['佢眨返／瞇埋眼','牠眨回來／瞇起眼','它眨回来／眯起眼','They blinked or narrowed their eyes back'], res_approached:['佢行埋嚟','牠走過來','它走过来','They came closer'],
 exp_prefer:['佢最鍾意咩','牠最喜歡什麼','它最喜欢什么','What do they choose first?'],
 exp_prefer_sci:['美國研究：一半嘅貓揀咗同人互動，多過揀食物同玩具（Vitale Shreve 2017）','美國研究：一半的貓選擇與人互動，多於選食物和玩具（Vitale Shreve 2017）','美国研究：一半的猫选择与人互动，多于选食物和玩具（Vitale Shreve 2017）','US study: half the cats chose time with a person over food or toys (Vitale Shreve 2017)'],
 exp_prefer_steps:['佢唔肚餓、唔眼瞓嗰陣，喺地下放一粒小食同一件玩具，你坐喺側邊伸隻手出嚟，睇佢第一樣去邊度。','趁牠不餓也不睏時，在地上放一顆零食和一個玩具，你坐在旁邊伸出手，看牠第一個去哪裡。','趁它不饿也不困时，在地上放一颗零食和一个玩具，你坐在旁边伸出手，看它第一个去哪里。','When they are neither hungry nor sleepy, put a treat and a toy on the floor, sit nearby with your hand out, and see what they go to first.'],
 res_social:['你 🤲','你 🤲','你 🤲','You 🤲'], res_food:['小食 🍗','零食 🍗','零食 🍗','The treat 🍗'], res_toy:['玩具 🧶','玩具 🧶','玩具 🧶','The toy 🧶'],
 exp_reunion:['返屋企重逢','回家重逢','回家重逢','Coming-home reunion'],
 exp_reunion_sci:['美國研究：約 65% 貓同主人係安全型依附——重逢時會行近，又好快放鬆（Vitale 2019）','美國研究：約 65% 貓與主人是安全型依附——重逢時會靠近，又很快放鬆（Vitale 2019）','美国研究：约 65% 猫与主人是安全型依恋——重逢时会靠近，又很快放松（Vitale 2019）','US study: about 65% of cats are securely attached — they greet you, then settle quickly (Vitale 2019)'],
 exp_reunion_steps:['下次出完街返屋企，入門頭 2 分鐘唔好主動叫佢，淨係留意佢第一個反應。一次觀察，唔代表任何分類。','下次出門回家，進門前 2 分鐘不要主動叫牠，只留意牠的第一個反應。一次觀察，不代表任何分類。','下次出门回家，进门前 2 分钟不要主动叫它，只留意它的第一个反应。一次观察，不代表任何分类。','Next time you come home, don’t call them for the first 2 minutes — just notice their first response. One observation, not a label.'],
 res_greet:['行過嚟迎接／磨蹭我','走過來迎接／磨蹭我','走过来迎接／蹭我','Came to greet me / rubbed against me'], res_nearby:['喺附近望住我','在附近看著我','在附近看着我','Watched me from nearby'], res_carryon:['繼續做自己嘢','繼續做自己的事','继续做自己的事','Carried on with their own thing'],

 touchTitle:['摸摸地圖','摸摸地圖','摸摸地图','Petting map'],
 touchHint:['撳你啱啱摸過嘅位置。小貼士：摸 3 秒就停，睇佢會唔會頂返你要多啲——俾佢揀，佢會更放心。','點你剛剛摸過的位置。小提示：摸 3 秒就停，看牠會不會頂回來要更多——讓牠選，牠會更安心。','点你刚刚摸过的位置。小提示：摸 3 秒就停，看它会不会顶回来要更多——让它选，它会更安心。','Tap where you just stroked them. Tip: stroke for 3 seconds, then pause and see if they ask for more — letting them choose helps them feel safe.'],
 touchAsk:['你摸咗佢嘅{zone}，佢點反應？','你摸了牠的{zone}，牠怎樣反應？','你摸了它的{zone}，它怎样反应？','You stroked their {zone}. How did they respond?'],
 touch_more:['頂返我／要多啲 😻','頂回來／想要更多 😻','顶回来／想要更多 😻','Leaned in / wanted more 😻'], touch_ok:['接受，冇特別反應 😐','接受，沒特別反應 😐','接受，没特别反应 😐','Accepted it 😐'], touch_stop:['走開／甩尾／耳仔向後 😾','走開／甩尾／耳朵向後 😾','走开／甩尾／耳朵向后 😾','Moved away / tail flick / ears back 😾'],
 zone_cheek:['面頰','臉頰','脸颊','cheeks'], zone_chin:['下巴','下巴','下巴','chin'], zone_earbase:['耳仔底','耳朵根','耳朵根','base of ears'], zone_head:['頭頂','頭頂','头顶','top of head'], zone_back:['背脊','背部','背部','back'], zone_tailbase:['尾巴根','尾巴根','尾巴根','base of tail'], zone_belly:['肚','肚子','肚子','belly'], zone_paws:['手腳','腳掌','脚掌','paws'],
 verdict_loves:['佢鍾意','牠喜歡','它喜欢','Loves it'], verdict_ok:['可以接受','可以接受','可以接受','Fine'], verdict_avoid:['唔好摸','先別摸','先别摸','Avoid'], verdict_unknown:['未知','未知','未知','Not sure yet'],
 touchCaution:['虛線位置好多貓都唔鍾意被摸，試之前睇清楚佢身體語言。','虛線位置很多貓都不喜歡被摸，嘗試前先看清楚牠的身體語言。','虚线位置很多猫都不喜欢被摸，尝试前先看清楚它的身体语言。','Dashed areas are sensitive for many cats — read their body language first.'],
 touchSource:['參考：Haywood 等 2021 嘅 CAT 指引（俾佢揀、留意反應、揀啱位置）','參考：Haywood 等 2021 的 CAT 指引（讓牠選擇、留意反應、選對位置）','参考：Haywood 等 2021 的 CAT 指引（让它选择、留意反应、选对位置）','Based on the CAT guidelines (Haywood et al. 2021): choice, attention, touch.'],

 manualOpen:['📋 睇{name}說明書','📋 看{name}說明書','📋 看{name}说明书','📋 {name}’s guide'], manualTitle:['{name}說明書','{name}說明書','{name}说明书','{name}’s guide'],
 manualTouchLoves:['最鍾意被摸','最喜歡被摸','最喜欢被摸','Favourite petting spots'], manualTouchAvoid:['唔好摸','先別摸','先别摸','Please avoid'], manualBest:['佢最受落','牠最受用','它最受用','What works best'], manualWarn:['要溫柔啲','要溫柔一點','要温柔一点','Go gently with'], manualReactions:['佢點表達愛意','牠怎樣表達愛意','它怎样表达爱意','How they show love'], manualExperiments:['小實驗結果','小實驗結果','小实验结果','Experiment results'],
 manualEmpty:['仲未夠資料：試幾個小實驗、喺摸摸地圖記低幾次，說明書就會慢慢寫出嚟。','資料還不夠：試幾個小實驗、在摸摸地圖記錄幾次，說明書就會慢慢寫出來。','资料还不够：试几个小实验、在摸摸地图记录几次，说明书就会慢慢写出来。','Not enough yet — try a few experiments and log some petting, and the guide will fill itself in.'],
 manualDownload:['⤴ 下載說明書圖（可以交俾 cat sitter）','⤴ 下載說明書圖（可以交給保姆）','⤴ 下载说明书图（可以交给上门喂猫）','⤴ Download as image (for your cat sitter)'],
 manualDisclaimer:['根據你自己嘅記錄整理，唔係醫療或行為診斷。','根據你自己的記錄整理，並非醫療或行為診斷。','根据你自己的记录整理，并非医疗或行为诊断。','Based on your own records — not a medical or behavioural diagnosis.']
```
（`res_none` 三個實驗共用；`wand` 等動作名已有現成 key，說明書直接 `rt(actionId)`。）

- [ ] **Step 4: 跑測試**

Run: `node --test tests/*.test.mjs`
Expected: 全部 PASS（包括原有「four locales have identical complete translation keys」）

---

### Task 6: CSS

**Files:**
- Modify: `index.html`（`@media(max-width:420px){.r-app{padding-left:14px` 嗰行之前插入）

- [ ] **Step 1: 加樣式**

```css
.r-lab,.r-touch{margin-top:12px;background:#FFF8F1;border-radius:16px;padding:10px 12px}
.r-lab summary,.r-touch summary{font-weight:800;cursor:pointer;color:var(--teal-dk)}
.lab-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed var(--line)}
.lab-row:last-of-type{border-bottom:none}
.lab-emoji{font-size:22px;flex:none}
.lab-txt{flex:1;min-width:0}.lab-txt b{display:block;font-size:13.5px}.lab-txt small{color:var(--sub);font-size:11.5px}
.lab-row button{flex:none}
.lab-note,.lab-sci{font-size:12px;color:var(--sub);margin-top:8px;line-height:1.6}
.lab-results{display:flex;flex-direction:column;gap:8px;margin:8px 0}
.touch-svg{display:block;width:100%;max-width:340px;margin:8px auto 4px}
.touch-svg .tz{stroke:var(--ink);stroke-width:2;cursor:pointer;transition:fill .2s}
.touch-svg .tz:focus-visible{outline:none;stroke:var(--terra);stroke-width:4}
.tz-loves{fill:#F7BFA6}.tz-ok{fill:#FFE2C6}.tz-avoid{fill:#D9BCE4}.tz-unknown{fill:#FFFDFA}
.tz-caution.tz-unknown{stroke-dasharray:5 4}
.touch-svg .deco{fill:#FFFDFA;stroke:var(--ink);stroke-width:2;pointer-events:none}
.touch-svg .deco-line{fill:none;stroke:var(--ink);stroke-width:10;stroke-linecap:round;pointer-events:none}
.touch-legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.touch-legend .chip{font-size:12px;padding:6px 10px}
.manual-sec{margin:10px 0}.manual-sec b{display:block;color:var(--terra);font-size:13px}.manual-sec span{font-size:14px}
```

- [ ] **Step 2: 確認冇破壞**：`node --test tests/*.test.mjs` 仍全綠。

---

### Task 7: 小實驗 UI（貓咪 tab＋今日 tab 提示）

**Files:**
- Modify: `index.html`（redesign app zone，`function rCats(){` 之前插入新函數；改 `rToday`、`rCats`、`rRender`）

- [ ] **Step 1: 加 details 開合記憶＋實驗函數**（插喺 `function rCats(){` 正上方）

```js
let rOpenDetails=new Set();
function rDetailsAttr(key){return `data-details-key="${esc(key)}" ${rOpenDetails.has(key)?'open':''}`;}
function rLabBlock(cat){
  const sum=Catnu.experimentSummary(STATE.experiments,cat.id);
  const tried=Catnu.EXPERIMENTS.filter(e=>sum[e.id].count>0).length;
  const rows=Catnu.EXPERIMENTS.map(e=>{const latest=sum[e.id].latest;return `<div class="lab-row"><span class="lab-emoji" aria-hidden="true">${e.emoji}</span><div class="lab-txt"><b>${rt('exp_'+e.id)}</b><small>${latest?`${esc(rt('res_'+latest.result))} · ${esc(latest.date)}`:rt('labNotYet')}</small></div><button type="button" data-exp-start="${e.id}" data-id="${esc(cat.id)}">${rt(latest?'labAgain':'labTry')}</button></div>`;}).join('');
  return `<details class="r-lab" ${rDetailsAttr('lab:'+cat.id)}><summary>🔬 ${rt('labTitle')} · ${rt('labProgress').replace('{n}',tried)}</summary>${rows}<p class="lab-note">${rt('labNote')}</p></details>`;
}
function rLabSuggest(catId){
  const next=Catnu.nextExperiment(STATE.experiments,catId);
  return next?`<button type="button" class="backup-nudge" data-exp-start="${next}" data-id="${esc(catId)}"><span aria-hidden="true">🔬</span><div>${rt('labSuggest')}<small>${rt('exp_'+next)}</small></div></button>`:'';
}
function rExperimentOpen(type,catId){
  const def=Catnu.EXPERIMENTS.find(e=>e.id===type);const cat=STATE.cats.find(c=>c.id===catId);if(!def||!cat)return;
  const dialog=document.createElement('dialog');dialog.className='r-dialog';dialog.setAttribute('aria-labelledby','r-exp-title');
  dialog.innerHTML=`<h2 id="r-exp-title">${def.emoji} ${rt('exp_'+type)} · ${esc(cat.name)}</h2><p class="lab-sci">${rt('exp_'+type+'_sci')}</p><p>${rt('exp_'+type+'_steps')}</p><p style="font-weight:800;margin-top:12px">${rt('labResultPrompt')}</p><div class="lab-results">${def.results.map(r=>`<button type="button" data-exp-result="${r}">${rt('res_'+r)}</button>`).join('')}</div><p class="lab-note">${rt('labNote')}</p><button type="button" data-exp-close>${rt('cancel')}</button>`;
  document.getElementById('app').appendChild(dialog);
  dialog.querySelector('[data-exp-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>dialog.remove();
  dialog.querySelectorAll('[data-exp-result]').forEach(b=>b.onclick=()=>{
    STATE.experiments.push({id:'x'+Date.now()+Math.random().toString(36).slice(2,6),catId,type,result:b.dataset.expResult,date:todayStr(),ts:Date.now()});
    if(rSave()){rOpenDetails.add('lab:'+catId);dialog.close();rRender();Catnu.showToast(rt('saved'));}
  });
  dialog.showModal();
}
```

- [ ] **Step 2: 掛入 `rCats`** — 將 `${rCatAnalysis(c)}<small>${rt('confidence')}` 改成：

```js
${rCatAnalysis(c)}${rLabBlock(c)}<small>${rt('confidence')}
```

- [ ] **Step 3: 掛入 `rToday`** — 將 `${rLogWidget(rActive!=='all'?rActive:cat.id)}` 改成：

```js
${rLogWidget(rActive!=='all'?rActive:cat.id)}${rLabSuggest(rActive!=='all'?rActive:cat.id)}
```

- [ ] **Step 4: 綁事件** — `rRender()` 入面，喺 `const recapOpenBtn=` 嗰句之前加：

```js
app.querySelectorAll('[data-exp-start]').forEach(b=>b.onclick=()=>rExperimentOpen(b.dataset.expStart,b.dataset.id));
app.querySelectorAll('[data-details-key]').forEach(d=>d.ontoggle=()=>{d.open?rOpenDetails.add(d.dataset.detailsKey):rOpenDetails.delete(d.dataset.detailsKey);});
```

- [ ] **Step 5: Manual verification**（`python3 -m http.server 8934`，開 `http://localhost:8934/index.html?v=lab`，375px）
  1. 今日 tab：見到「🔬 今日想唔想試個小實驗？／認唔認得自己個名」。
  2. 撳落去 → dialog 有研究出處、步驟、3 個結果掣、「結果唔係考試」。揀「淨係郁吓耳仔」→ toast「記低咗」。
  3. 今日 tab 提示變成下一個實驗「慢眨眼對話」；四個全部做完提示消失。
  4. 貓咪 tab：「🔬 貓咪小實驗 · 已試 1／4」，展開見最新結果＋日期，掣變「再試一次」；記錄後 details 保持展開。
  5. 重新整理頁面，資料仍在（`localStorage` 有 `experiments`）；Console 零 error。

---

### Task 8: 摸摸地圖 UI

**Files:**
- Modify: `index.html`（緊接 Task 7 嘅函數之後；改 `rCats`、`rRender`）

- [ ] **Step 1: 加 SVG 同 dialog**

```js
// 側面貓剪影；同一 zone 可以有多個形狀（例如四隻腳）。順序＝繪畫次序（後畫嘅喺上面）
const TOUCH_SHAPES=[
 ['paws','rect','x="104" y="146" width="18" height="42" rx="9"'],
 ['paws','rect','x="134" y="148" width="18" height="40" rx="9"'],
 ['paws','rect','x="200" y="148" width="18" height="40" rx="9"'],
 ['paws','rect','x="230" y="146" width="18" height="42" rx="9"'],
 ['back','path','d="M85 118 A85 44 0 0 1 255 118 Z"'],
 ['belly','path','d="M85 118 A85 44 0 0 0 255 118 Z"'],
 ['tailbase','circle','cx="255" cy="108" r="13"'],
 ['head','circle','cx="72" cy="72" r="40"'],
 ['earbase','ellipse','cx="52" cy="40" rx="11" ry="7"'],
 ['earbase','ellipse','cx="92" cy="40" rx="11" ry="7"'],
 ['cheek','circle','cx="48" cy="90" r="11"'],
 ['chin','ellipse','cx="68" cy="108" rx="15" ry="8"'],
];
function rTouchSvg(cat){
  const map=Catnu.touchMap(STATE.touches,cat.id);
  const shapes=TOUCH_SHAPES.map(([zone,tag,attrs])=>{const z=map[zone];const label=`${rt('zone_'+zone)}：${rt('verdict_'+z.verdict)}`;return `<${tag} ${attrs} class="tz tz-${z.verdict}${z.caution?' tz-caution':''}" data-touch-zone="${zone}" data-id="${esc(cat.id)}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title></${tag}>`;}).join('');
  return `<svg class="touch-svg" viewBox="0 0 320 200" aria-label="${rt('touchTitle')}">`
    +`<path class="deco-line" d="M262 104 C300 96 304 52 286 28"/>`
    +`<path class="deco" d="M38 46 L46 8 L66 36 Z"/><path class="deco" d="M78 36 L98 8 L106 46 Z"/>`
    +shapes
    +`<g pointer-events="none"><circle cx="60" cy="68" r="4" fill="#5C4638"/><circle cx="86" cy="68" r="4" fill="#5C4638"/><path d="M69 80 L77 80 L73 85 Z" fill="#E8809A"/><path d="M73 85 Q69 90 65 88 M73 85 Q77 90 81 88" fill="none" stroke="#5C4638" stroke-width="1.6" stroke-linecap="round"/></g>`
    +`</svg>`;
}
function rTouchBlock(cat){
  const map=Catnu.touchMap(STATE.touches,cat.id);
  const legend=Catnu.TOUCH_ZONES.filter(z=>map[z.id].n>0).map(z=>`<span class="chip tz-chip">${rt('zone_'+z.id)}：${rt('verdict_'+map[z.id].verdict)}（${map[z.id].n}）</span>`).join('');
  return `<details class="r-touch" ${rDetailsAttr('touch:'+cat.id)}><summary>🖐️ ${rt('touchTitle')}</summary><p class="lab-note">${rt('touchHint')}</p>${rTouchSvg(cat)}${legend?`<div class="touch-legend">${legend}</div>`:''}<p class="lab-note">${rt('touchCaution')}</p><p class="lab-note">${rt('touchSource')}</p></details>`;
}
function rTouchOpen(zone,catId){
  if(!Catnu.TOUCH_ZONES.some(z=>z.id===zone)||!STATE.cats.some(c=>c.id===catId))return;
  const dialog=document.createElement('dialog');dialog.className='r-dialog';dialog.setAttribute('aria-labelledby','r-touch-title');
  dialog.innerHTML=`<h2 id="r-touch-title">${rt('touchAsk').replace('{zone}',rt('zone_'+zone))}</h2><div class="lab-results">${Catnu.TOUCH_REACTIONS.map(r=>`<button type="button" data-touch-reaction="${r}">${rt('touch_'+r)}</button>`).join('')}</div><p class="lab-note">${rt('touchHint')}</p><button type="button" data-touch-close>${rt('cancel')}</button>`;
  document.getElementById('app').appendChild(dialog);
  dialog.querySelector('[data-touch-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>dialog.remove();
  dialog.querySelectorAll('[data-touch-reaction]').forEach(b=>b.onclick=()=>{
    STATE.touches.push({id:'t'+Date.now()+Math.random().toString(36).slice(2,6),catId,zone,reaction:b.dataset.touchReaction,ts:Date.now()});
    if(rSave()){rOpenDetails.add('touch:'+catId);dialog.close();rRender();Catnu.showToast(rt('saved'));}
  });
  dialog.showModal();
}
```

- [ ] **Step 2: 掛入 `rCats`** — 將 Task 7 Step 2 改咗嘅 `${rLabBlock(c)}` 改成 `${rLabBlock(c)}${rTouchBlock(c)}`。

- [ ] **Step 3: 綁事件** — Task 7 Step 4 嗰兩句之後加：

```js
app.querySelectorAll('[data-touch-zone]').forEach(z=>{const open=()=>rTouchOpen(z.dataset.touchZone,z.dataset.id);z.onclick=open;z.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
```

- [ ] **Step 4: Manual verification**（375px＋桌面）
  1. 貓咪 tab 展開「🖐️ 摸摸地圖」：見到側面貓，背脊／尾巴根／肚／手腳係虛線邊。
  2. 撳「下巴」→ dialog 問「你摸咗佢嘅下巴，佢點反應？」→ 揀「頂返我」；再撳一次揀「頂返我」→ 下巴變珊瑚色，下面 chip「下巴：佢鍾意（2）」。
  3. 撳「肚」兩次揀「走開」→ 肚變淡紫，chip「肚：唔好摸（2）」。
  4. Tab 鍵可以聚焦部位，Enter 打開 dialog。
  5. 記錄後 details 保持展開；reload 後顏色保留；冇橫向 scroll；Console 零 error。

---

### Task 9: 貓咪說明書 UI＋分享圖

**Files:**
- Modify: `index.html`（`wrapCenteredText`；`/* @APP:BOOT */` 之前加 share 函數；redesign 加 `rManualOpen`；改 `rCats`、`rRender`）

- [ ] **Step 1: `wrapCenteredText` 回傳行數** — 喺 `lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));` 之後加一行：

```js
  return lines.length;
```

- [ ] **Step 2: 分享圖**（插喺 `/* @APP:BOOT */` 正上方）

```js
Catnu.shareCatManualCard = function shareCatManualCard(cat, title, sections, footer) {
  const { canvas, ctx } = newShareCanvas();
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px "M PLUS Rounded 1c","Noto Sans TC",sans-serif';
  ctx.fillStyle = '#7A4A38';
  let y = 340 + (wrapCenteredText(ctx, title, 540, 340, 760, 64) - 1) * 64 + 90;
  for (const [heading, body] of sections) {
    if (y > 1090) break;
    ctx.font = 'bold 32px "Noto Sans TC",sans-serif';
    ctx.fillStyle = '#A6573A';
    ctx.fillText(heading, 540, y);
    ctx.font = '32px "Noto Sans TC",sans-serif';
    ctx.fillStyle = '#5C4638';
    y += 48;
    y += wrapCenteredText(ctx, body, 540, y, 740, 44) * 44 + 34;
  }
  ctx.font = '24px "Noto Sans TC",sans-serif';
  ctx.fillStyle = '#6E5A4E';
  wrapCenteredText(ctx, footer, 540, 1150, 760, 32);
  downloadCanvas(canvas, `catnu-guide-${cat.id}-${todayStr()}.png`);
};
```

- [ ] **Step 3: 說明書 dialog**（插喺 Task 8 函數之後）

```js
function rManualSections(m){
  const join=ids=>ids.join('、');
  const out=[];
  if(m.touchLoves.length)out.push([rt('manualTouchLoves'),join(m.touchLoves.map(z=>rt('zone_'+z)))]);
  if(m.touchAvoid.length)out.push([rt('manualTouchAvoid'),join(m.touchAvoid.map(z=>rt('zone_'+z)))]);
  if(m.bestActions.length)out.push([rt('manualBest'),join(m.bestActions.map(a=>rt(a)))]);
  if(m.warnActions.length)out.push([rt('manualWarn'),join(m.warnActions.map(a=>rt(a)))]);
  if(m.topReactions.length)out.push([rt('manualReactions'),join(m.topReactions.map(r=>rt(r)))]);
  const exps=Catnu.EXPERIMENTS.filter(e=>m.experiments[e.id]).map(e=>`${rt('exp_'+e.id)}：${rt('res_'+m.experiments[e.id])}`);
  if(exps.length)out.push([rt('manualExperiments'),exps.join('；')]);
  return out;
}
function rManualOpen(catId){
  const cat=STATE.cats.find(c=>c.id===catId);if(!cat)return;
  const m=Catnu.catManual(STATE,catId,Date.now());
  const title=rt('manualTitle').replace('{name}',cat.name);
  const sections=rManualSections(m);
  const dialog=document.createElement('dialog');dialog.className='r-dialog';dialog.setAttribute('aria-labelledby','r-manual-title');
  dialog.innerHTML=`<h2 id="r-manual-title">📋 ${esc(title)}</h2>${m.ready?sections.map(([h,b])=>`<div class="manual-sec"><b>${esc(h)}</b><span>${esc(b)}</span></div>`).join(''):`<p>${rt('manualEmpty')}</p>`}<p class="lab-note">${rt('manualDisclaimer')}</p>${m.ready?`<button type="button" class="r-primary" data-manual-download>${rt('manualDownload')}</button>`:''}<button type="button" data-manual-close>${rt('close')}</button>`;
  document.getElementById('app').appendChild(dialog);
  dialog.querySelector('[data-manual-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>dialog.remove();
  const dl=dialog.querySelector('[data-manual-download]');if(dl)dl.onclick=()=>Catnu.shareCatManualCard(cat,title,sections,rt('manualDisclaimer'));
  dialog.showModal();
}
```

- [ ] **Step 4: 掛入 `rCats`** — 將 `${rLabBlock(c)}${rTouchBlock(c)}` 改成：

```js
${rLabBlock(c)}${rTouchBlock(c)}<button type="button" class="r-primary" style="display:block;width:100%;margin:12px 0 8px" data-manual="${esc(c.id)}">${esc(rt('manualOpen').replace('{name}',c.name))}</button>
```

- [ ] **Step 5: 綁事件** — Task 8 Step 3 之後加：

```js
app.querySelectorAll('[data-manual]').forEach(b=>b.onclick=()=>rManualOpen(b.dataset.manual));
```

- [ ] **Step 6: Manual verification**
  1. 新貓（冇資料）撳「📋 睇 X 說明書」→ 顯示「仲未夠資料…」，冇下載掣。
  2. 做完 Task 7、8 嘅驗證資料（1 個實驗＋下巴鍾意＋肚唔好摸＝3 項）→ 說明書列出「最鍾意被摸：下巴」「唔好摸：肚」「小實驗結果：…」＋免責聲明＋下載掣。
  3. 撳下載 → 觸發 PNG 下載；用瀏覽器開返張圖，標題、各段文字冇超出白卡、冇重疊。
  4. 切換 English locale 再開說明書，文字全部係英文、冇 `undefined`。
  5. Console 零 error。

---

### Task 10: 全面驗證＋記錄＋推送

- [ ] **Step 1:** `node --test tests/*.test.mjs` 全綠，貼 output。
- [ ] **Step 2:** 瀏覽器用之前嘅對比度掃描腳本掃 5 個 tab（包括展開咗嘅小實驗／摸摸地圖），0 個不達標。
- [ ] **Step 3:** 備份→還原：下載備份、清 localStorage、還原，`experiments`／`touches` 資料完整返嚟。
- [ ] **Step 4:** `CHANGELOG.md` 頂部加條目（功能、研究出處、測試數、手動驗證結果）。
- [ ] **Step 5:** `python3 scripts/github_push.py --check` 然後 `python3 scripts/github_push.py "feat(lab): 貓咪小實驗＋摸摸地圖＋貓咪說明書"`，核實 GitHub HEAD 同 Vercel 部署 READY。

---

## Self-Review 記錄

- **Spec coverage：** #1 小實驗 → Task 2、5、7；#2 摸摸地圖 → Task 3、5、8；#3 說明書 → Task 4、5、9；資料安全（備份／還原唔會被擋）→ Task 1、10。
- **刻意唔做（YAGNI）：** 刪除單條實驗／摸摸記錄、實驗提醒、說明書分享連結（v1 冇 backend）、landing 文案更新（另開一輪）。
- **風險：** `validateBackup` 失敗會令 app 開唔到（`rLoadBlocked`），所以 Task 1 嘅驗證規則同 UI 寫入格式要一致——UI 只會寫入 `EXPERIMENTS`／`TOUCH_ZONES`／`TOUCH_REACTIONS` 入面嘅值，Task 1 測試已覆蓋。
