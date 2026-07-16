# 貓奴修行 — Build Spec (for Claude Code CLI)

> 呢份文件係完整 build spec。請由頭到尾讀完先動工，按「驗收 Checklist」自我驗證後先算完成。
> 所有產品決定已經拍板，唔好改動 scope；有技術疑問先問。

---

## 1. 項目概要

**貓奴修行** — 一個令貓愛上主人嘅 personal app。核心賣點係 bonding analytics：
記錄「主人嘅行為 × 貓嘅反應」，用透明嘅統計規則搵出邊樣嘢令隻貓更鍾意主人，再變成每日任務。

- 用戶：Stephanie 一個人用（唔使 login / 唔使多用戶）
- 貓：兩隻英國長毛（app 內要支援任意多隻貓，每隻獨立記錄、獨立分析）
- 語言：全 app 廣東話
- 風格：復古花磚（詳見 §3）

**明確唔做（v1）**：健康/疫苗記錄、AI 分析、任何後端、login、跨裝置同步、推送通知。

## 2. 技術約束（硬性）

1. **單一 `index.html`**：所有 CSS 喺一個 `<style>`、所有 JS 喺一個 `<script>`，vanilla JS，唔用框架、唔用 build step。外部資源（Google Fonts、圖片、CDN）皆准用，但唔准用 build step / npm 框架。
2. **數據全部存 `localStorage`**，key = `catnu.v1`，內容係一個 JSON object（schema 見 §4），入面有 `schemaVersion` 欄位方便將來 migrate。
3. **手機優先**：以 iPhone Safari 為主要目標，390px 寬度設計，desktop 只需置中一個 phone-width container。
4. 加 `<meta name="theme-color">`、`apple-mobile-web-app-capable`、`apple-mobile-web-app-title="貓奴修行"`，icon 用 inline data-URL（簡單 SVG 貓爪 favicon + apple-touch-icon）。
5. **Deploy 上 Vercel**：獨立新 project（建議名 `catnu-app`），repo 結構：
   ```
   /index.html        ← 個 app
   /landing.html      ← landing page（已有檔案，只需將品牌名由「貓心計劃」改做「貓奴修行」）
   /images/           ← 圖片檔案（如有），HTML 用 relative path 引用
   /vercel.json       ← 唔需要特別設定，static 即可
   /CLAUDE.md         ← 完成後寫低架構決定 + 點行 dev/deploy
   ```
6. 所有動畫尊重 `@media (prefers-reduced-motion: reduce)`。

## 3. 設計系統

CSS variables（必須用 variable，唔好 hardcode hex 喺中間）：

```css
:root{
  --cream:#f4edda; --paper:#fbf6e9;
  --teal:#1d5c52; --teal-dk:#123f38; --night:#0d2b26;
  --terra:#c05a2e; --mustard:#d9a441; --rose:#c98d83;
  --ink:#2f2a22; --sub:#7d7361; --line:#e2d7bd;
}
```

- 字體：`Noto Sans TC`（body）＋ `Noto Serif TC`（標題）；大數字可用 `Fraunces` italic
- 風格語言：奶油底、墨綠 header 帶花磚 SVG pattern（八瓣花紋）、卡片 2px 深色邊框 + 實色 offset shadow（chunky retro 手感）、chips 圓角 + 揀中變芥末黃
- Header 常駐：app 名 + 🔥Streak 日數；下面 5 個 tab：**記錄 / 任務 / 分析 / 圖鑑 / 檔案**

## 4. 數據模型（localStorage `catnu.v1`）

```jsonc
{
  "schemaVersion": 1,
  "cats": [
    { "id": "c1", "name": "", "breedId": "british-longhair", "emoji": "🐱",
      "sex": "", "birthYM": "", "neutered": null, "homeDate": "", "notes": "" }
  ],
  "logs": [
    // 一次互動一條 entry
    { "id": "uuid", "catId": "c1", "ts": 1760000000000,
      "reactions": ["approach","purr"],        // reaction ids，可多選
      "actions": ["feed","wand"],              // action ids，可多選
      "note": "", "backfilled": false }         // backfilled = 補記
  ],
  "quests": { "2026-07-12": { "catQuests": [ { "id":"q1","text":"","done":false,"catId":"c1","source":"universal|data|breed" } ] } },
  "streak": { "current": 0, "best": 0, "lastDoneDate": "" },
  "milestones": [ { "id": "first-purr", "catId": "c1", "unlockedAt": 1760000000000 } ],
  "customActions": [ { "id": "custom-1", "emoji": "🧶", "label": "" } ],
  "settings": { "createdAt": 0 }
}
```

**Reactions 分類（固定）**

| id | label | 極性 |
|----|-------|------|
| approach | 😻 主動貼近 | + |
| slowblink | 😌 慢眨眼 | + |
| purr | 🎵 呼嚕 | + |
| knead | 🍞 踩奶 | + |
| belly | 🙃 露肚 | + |
| lap | 🦵 坐大脾 | + |
| walkaway | 🏃 即刻走開 | − |
| flatears | 👂 飛機耳 | − |
| hiss | 😾 hiss／拍手 | − |
| bite | 🦷 咬／抓 | − |

**Actions（固定 + 可自訂）**：🍗 餵食/小食 `feed`、🪮 梳毛 `groom`、🎣 逗貓棒 `wand`、🤗 抱佢 `hold`、✋ 摸頭/下巴 `pet`、📢 叫佢名 `callname`、🧹 執貓砂 `litter`、🗣 同佢傾偈 `talk`。用戶可以喺記錄頁加自訂 action（emoji + 名）。

## 5. 功能 Spec（逐 tab）

### Tab 1 · 記錄
- 頂部貓 switcher（chips，多貓橫排）
- 兩組 chips：「佢對我嘅反應」（±極性分色：正面芥末黃、負面 rose）＋「我啱啱做咗咩」
- 可選備註（單行 input，摺埋，撳「＋備註」先展開）
- 大掣「✓ 記錄呢一刻」→ 存 entry（ts = now），成功後 toast + chips reset
- **補記模式**：一個「🕐 補記」toggle，開咗會出時間揀選器（今日內，半小時粒度），存嗰陣 `backfilled: true`
- 首次開 app：onboarding 引導開兩隻貓 profile（名/品種揀選/emoji）

### Tab 2 · 任務
- 每日生成 **3 個任務**（生成規則見 §7），列表式，checkbox 撳完成
- 3 個全部完成 → 當日 streak +1；顯示 🔥current / 🏆best
- 過咗夜 11:59 未完成 → streak 斷（歸 0）
- 下方「最新里程碑」卡（最近解鎖嗰個，撳入去有 share 功能，見 §9）

### Tab 3 · 分析
- 貓 switcher
- **好感度指數卡**：大數字 + 對上星期嘅變化箭咀 + 條紋 meter + 近 7 日 mini bar chart（純 CSS/inline SVG）
- **溝貓建議列表**（§6 演算法輸出，最多 5 條，正面發現 → 負面警告 → 數據不足提示 順序排）
- 數據少過 5 條 entries：成頁顯示「修行未夠，繼續記錄」空狀態

### Tab 4 · 圖鑑
- **貓語解碼**：5 大類（尾巴/耳仔/鬍鬚/坐姿/叫聲）accordion，每類 4–6 條目：icon + 訊號 + 意思 + 應對建議。內容要用正經貓行為學（slow blink＝信任、飛機耳＝壓力、尾巴直豎＝友好 etc.），寫廣東話
- **品種圖鑑 16 類**（內容要求見 §8）
- **配對測驗**入口兩個模式（邏輯見 §10）

### Tab 5 · 檔案
- 每貓卡：emoji、名、品種 tag、基料、個性筆記（可編輯）、好感度
- 「＋加貓」/ 編輯 / 刪除（刪除要 confirm，連埋佢啲 logs 一齊刪）
- **里程碑牆**：全部里程碑 grid，未解鎖灰化
- **數據備份**：「⤓ 匯出 JSON」（download file `catnu-backup-YYYYMMDD.json`）+「⤒ 還原」（file input，讀入前 validate schemaVersion，成功後 reload）

## 6. 分析引擎（規則式，全部 client-side）

**Entry 極性**：一條 entry 計正面 if `正面reactions數 > 負面reactions數`；相等或齊零 → 中性（唔計入分子分母）。

**好感度指數（每貓）**：
```
對近 7 日每條非中性 entry：w = 0.85 ^ days_ago
好感度 = round( 100 × Σ(w × isPositive) / Σw )
```
- 非中性 entries < 5 → 顯示「--」＋「數據不足」
- 「對上星期變化」＝今個 7 日 vs 上一個 7 日嘅同式計算差

**行為關聯（每貓、每 action a）**：
- 樣本 = 包含 action a 嘅 entries，加埋「a 之後 30 分鐘內同一隻貓嘅 entries」
- `P_a` = 樣本正面率；`P_base` = 該貓全部非中性 entries 正面率
- 規則：
  - `n ≥ 5` 先出結論；否則如果 `1 ≤ n < 5` 出「🪮 XX記錄得 n 次，未夠數據——今晚試多次？」
  - `P_a − P_base ≥ 15pp` → 正面發現：「**{action}後 30 分鐘**正面反應率 {P_a}%（平時 {P_base}%）——{建議句}」
  - 負面 reactions（飛機耳/走開/hiss/咬）出現率 ≥ 60% → 警告：「**{action}** {n} 次有 {x} 次負面反應——{品種相關解釋或通用建議}」
- 疊加**品種規則庫**：每個品種帶 2–3 條 rule（例：英長 `hold` 負面警告時補一句「英長普遍抗拒被抱——坐埋佢隔離等佢主動」；`groom` 3 日冇記錄 → 提示「英長係長毛貓，梳毛係佢哋接受度最高嘅親密接觸」）

## 7. 任務生成（每日每貓池，全 app 共 3 個任務）

每日 00:00 後首次開 app 生成當日任務（deterministic：用日期做 seed，唔用 `Math.random()` 都得，簡單 hash 日期揀）：

1. **通用溝貓任務**（rotate pool）：慢眨眼 3 次／坐喺佢附近 5 分鐘唔掂佢／用玩具代替手玩／講嘢調低聲線…（起碼 8 條 pool）
2. **數據驅動任務**：攞該貓分析入面 `P_a` 最高嘅 action →「今日做多次 {action}」；如果冇夠數據 → 攞記錄最少嘅 action →「試下 {action}，收集數據」
3. **品種任務**：由品種規則庫出（英長：梳毛／唐貓：觀察任務）

任務對象喺多貓之間輪流分配。3 個全 done → streak+1。

## 8. 品種圖鑑內容（16 類）

每個品種 object：`{ id, name, emoji, origin, traits: {clingy, holdOk, active, vocal}(0–100), strategy, pitfalls[], breedRules[] }`

- **英國長毛 British Longhair — 詳細版**：additionally 有 `deepDive`（性格全寫、社交模式、對人親密度典型發展、同類相處、常見誤解），因為係主人嘅貓
- **唐貓／混種 — 獨立類別**：冇 traits 條（顯示「性格差異極大，唔套 baseline」），代替內容係「摸底攻略」——教點樣用 2 星期記錄快速摸清一隻唐貓嘅底（觀察 checklist）
- **簡版 ×14**：英短、美短、布偶、緬因、蘇格蘭摺耳、暹羅、波斯、金吉拉、俄羅斯藍貓、豹貓、阿比西尼亞、斯芬克斯無毛貓、挪威森林、曼赤肯
- 內容要準確反映品種公認性格特徵（例：布偶黐人接受抱、俄藍慢熱怕生、摺耳要提健康爭議）；全部廣東話

## 9. 里程碑 + Share 卡

里程碑清單（每貓獨立，除咗 streak 類）：

| id | 條件（自動檢查） |
|----|------|
| first-log | 該貓第一條記錄 |
| first-purr / first-knead / first-belly / first-lap / first-slowblink | 對應 reaction 第一次出現 |
| logs-50 / logs-100 | 記錄累計 |
| score-70 / score-85 | 好感度首次達標 |
| streak-7 / streak-30 | 連續日數（全 app 計） |

- 解鎖時 toast + 記入 `milestones`
- **Share 卡**：撳里程碑 → `<canvas>` 生成 1080×1350 靚卡（復古花磚框、貓 emoji、里程碑名、日期、相處第 N 日、app 名）→ 下載 PNG

## 10. 配對測驗（兩模式）

問題 6–8 條（居住空間、屋企時間、想要黐人定獨立、接受梳毛功夫、有冇細路、預算、經驗）。每條答案對 16 品種庫嘅 traits 加權計分，出頭 3 名 + 每個一句「點解夾你」，撳入去去品種頁。

- **模式 A「我想養第一隻貓」**：純上面邏輯
- **模式 B「我想加多隻」**：先揀現有邊隻貓 → 計分時額外加「同現有貓相容性」維度（品種庫每個品種有 `multiCatFriendly` 0–100；同埋用現有貓嘅實際數據：如果佢對「陌生刺激」負面率高，建議偏向獨立、低活躍品種）＋ 出「引入新貓步驟」貼士卡

## 11. 驗收 Checklist（完成前逐項自測）

- [ ] iPhone Safari 390px 無橫向 scroll，所有 tab 正常
- [ ] 開新 browser → onboarding 開 2 隻貓 → 記錄 10 條（混正負） → 分析頁有好感度 + 至少 1 條建議
- [ ] 某 action 記錄 <5 次時顯示「未夠數據」而唔係出結論
- [ ] 補記 entry 時間正確、`backfilled: true`
- [ ] 完成 3 任務 → streak +1；隔日模擬（改 system date 或注入測試數據）→ 未完成會斷
- [ ] 里程碑自動解鎖 + share 卡 PNG 下載成功
- [ ] 匯出 JSON → 清 localStorage → 還原 → 數據完整返晒嚟
- [ ] 刪除一隻貓 → 佢啲 logs 一齊消失，另一隻唔受影響
- [ ] 配對測驗兩模式行到尾、結果連去品種頁
- [ ] `prefers-reduced-motion` 下冇動畫
- [ ] deploy 上 Vercel，手機「加到主畫面」開得

## 12. v2 Backlog（唔好做，淨係喺 CLAUDE.md 記低）

配對測驗結果分享、AI 分析（匯出數據俾 Claude）、跨裝置同步（Supabase）、推送提醒、相簿、健康記錄 integration。
