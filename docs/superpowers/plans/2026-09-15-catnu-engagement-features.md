# 貓奴修行 — 4 個「更貼合定位」嘅吸引力功能 Implementation Plan

> 呢份係 Cowork session 同 Stephanie 傾出嚟嘅方向文件，交畀 Claude Code 落實。**唔係代碼，落手前請先確認底下「開工前要核對」嗰節。**

## 背景

Stephanie 覺得 app「而家有啲悶」，Cowork 提過一輪方向（mini game／季節皮膚／dopamine hook），佢反饋「唔夾」——因為呢個 app 嘅定位由頭到尾都係「溫柔了解、唔係診斷、唔迫用戶」（見 `index.html` 入面「呢個唔係醫療或行為診斷」呢類 disclaimer 已經係一致寫法），唔係一般 engagement app 果套。跟返呢個定位，揀咗 4 個方向，全部用**本地 pure-logic**做，唔叫外部 AI，唔加遊戲化機制：

1. 貓行為小知識彈窗（扣返實際記錄）
2. 「呢排嘅暗號」——本地邏輯生成嘅觀察洞見
3. 關係時間軸
4. 年度／月度回顧冊

呢 4 個都係喺你已有嘅 pure-logic zone／app zone 分離架構度加新函數＋新 UI 卡，唔郁現有 tab 結構、唔加第 6 個 tab。

## ⚠️ 開工前要核對

呢份 plan 假設喺**鎖定咗嘅 clay 3D 版本**（即 `git show HEAD:index.html`，非 Codex 未 commit 嗰個 redesign preview）度加。另外有份獨立文件都待處理：`claude/ui-diagnosis-2026-09-15.md`（project doc）診斷咗 Codex 嗰輪 redesign 推翻咗鎖定嘅視覺方向，同埋頭像方案（用戶相為主／9款AI生成頭像為次／mascot做底）都定咗方向未落地。**呢兩份嘢邊份做先，要問返 Stephanie**——唔好自己假設順序。如果決定「先重新換皮／頭像，再加呢 4 個功能」，落手前一樣要重讀嗰份 project doc。

---

## Task 1: 貓行為小知識彈窗

**目的**：每次記錄特定 reaction/action，彈一張小知識卡解釋呢個行為背後嘅意思，將「填表」變成「識多啲隻貓」。

- [ ] **Step 1：內容庫**（`/* @LOGIC:DATA */` 附近新增）
  ```js
  Catnu.BEHAVIOR_FACTS = {
    slowblink: '慢眨眼係貓咪嘅「我愛你」表情，科學上叫 slow blink——你都可以送返俾佢。',
    purr: '呼嚕唔一定代表開心，有時係自我安撫，但喺你身邊呼嚕通常係安心嘅訊號。',
    knead: '踩奶源自幼貓食奶時嘅動作，長大後保留低嚟代表佢覺得同你相處好舒服。',
    belly: '露肚係高度信任先會出現嘅動作，但唔代表想俾人摸肚——摸唔摸要睇佢反應。',
    lap: '揀你張大脾坐低，係佢主動揀擇同你埋身嘅距離。',
    hiss: '嘶聲係防衛反應唔係憎你，代表佢覺得受威脅，畀啲空間佢。',
    flatears: '耳仔向後代表緊張或者唔妥，觀察埋前文後理會準啲。',
    // ...其餘 reaction/action id 對齊現有 REACTIONS/ACTIONS 常量，逐個補
  };
  ```
- [ ] **Step 2：pure-logic getter**（`/* @LOGIC:ENGINE */`）：`Catnu.behaviorFact(id) => string | null`，冇對應內容就 return null——**要有 unit test**，覆蓋存在／唔存在兩種情況。
- [ ] **Step 3：UI 掛鈎**（`commitLog()` 附近，`/* @APP:INIT */`）：記錄成功之後，若果呢個 reaction/action 係**今日第一次**（或者呢隻貓歷史上第一次）出現，喺 toast/burst 之後多彈一張細卡顯示 fact，可以撳走，唔好逼睇。
- [ ] **Step 4（可選加分）**：喺「圖鑑」tab 加一個「行為小百科」區塊，只列出用戶**已經記錄過**嘅 reaction/action 對應嘅 fact（未記過嘅唔顯示，維持「解鎖」感，同現有 milestone 牆邏輯一致）。

**Manual verification**：記一條未記過嘅 reaction → 見到對應 fact 卡；再記多次同一個 reaction → 唔再彈（或彈得溫和啲，唔煩）；圖鑑 tab 見到已解鎖嘅 fact 清單。

---

## Task 2:「呢排嘅暗號」——本地邏輯觀察洞見

**目的**：分析行為出席（唔叫 AI），對比「近期 vs 之前」嘅趨勢變化，用溫暖語氣講返出嚟。

- [ ] **Step 1：pure-logic**（`/* @LOGIC:ENGINE */`）
  ```js
  Catnu.recentSignal(logs, catId, nowTs, { windowDays = 14 } = {}) => {
    trend: 'up' | 'down' | null,
    actionId: string | null,
    message: string | null,
  } | null
  ```
  邏輯：攞近 `windowDays` 日 vs 之前同長度嘅一段，比較每個 positive reaction 嘅出現比率；有明顯上升／下跌（設一個門檻，例如 ≥1.5x 或者新出現 3 次以上）先出結果，唔夠data或者冇明顯變化就 return null（同現有「資料不足時顯示誠實暖場」一致做法）。**Unit test** 要覆蓋：資料不足、有上升趨勢、有下跌趨勢、冇明顯變化 4 種情況。
- [ ] **Step 2：UI**：分析 tab，喺「本週關係故事」卡下面加一張「呢排嘅暗號」卡，冇結果就唔顯示成張卡（唔好出空卡）。文案要帶埋 disclaimer：「淨係觀察趨勢，唔係行為診斷」（跟現有寫法）。

**Manual verification**：seed 一組近期某 reaction 明顯增多嘅 log data → 見到對應暗號卡；seed 均勻分佈嘅 data → 唔顯示呢張卡。

---

## Task 3: 關係時間軸

**目的**：將里程碑、紀念日、（如果有）特別記錄，砌成一條可以慢慢滑落去睇嘅直向時間軸，做返「翻睇」嘅情感回饋，唔止係任務清單。

- [ ] **Step 1：pure-logic**（`/* @LOGIC:ENGINE */`）
  ```js
  Catnu.timelineEvents(state, catId) => [
    { date: 'YYYY-MM-DD', type: 'milestone'|'anniversary'|'highlight', label: string, icon: string }
    ...
  ] // 由新到舊排序
  ```
  資料源：`state.milestones`（已解鎖，篩返該貓）、`upcomingAnniversaries`/`daysTogether`（已有function攞）、加返「相處100/365/500/1000日」轉做 highlight 事件。**Unit test** 覆蓋排序正確、多貓篩選正確、冇資料時回傳空陣列。
- [ ] **Step 2：UI**：檔案 tab，單一貓檔案卡下面加一個可收合／可滑動嘅時間軸區塊，用返現有 milestone 牆嘅卡片視覺語言（clay card），唔使新起一套樣式。

**Manual verification**：一隻有齊里程碑+紀念日嘅貓，時間軸順序同內容啱；一隻新貓（冇里程碑）顯示空狀態文案。

---

## Task 4: 年度／月度回顧冊

**目的**：儲夠一個月，自動生成一張可以低 IG 嘅回顧卡，複用現有 share-card canvas 系統（第 4 個 template）。

- [ ] **Step 1：pure-logic**（`/* @LOGIC:ENGINE */`）
  ```js
  Catnu.monthlyRecap(state, catId, monthKey /* 'YYYY-MM' */) => {
    totalLogs, positiveRate, topAction, milestonesUnlocked: [...], daysTogetherDelta
  } | null // 冇資料就 null
  ```
  **Unit test** 覆蓋：有齊資料、部分資料、完全冇資料 3 種情況嘅計算正確性。
- [ ] **Step 2：Share card template**：跟現有 `Catnu.sharePersonalityCard`/週報卡嘅 canvas 1080×1350 做法，加第 4 款「月度回顧卡」，用返同一套奶茶 clay 視覺（漸變底＋爪印 pattern＋白卡柔影）。
- [ ] **Step 3：觸發時機**：每月第一次開 app（`initApp()` check 一次日期）喺記錄 tab 出個溫和 banner「你嘅 X 月回顧已經準備好」，撳入去先生成／睇；唔好用 push notification（v1 冇 backend，都唔係呢個方向）。

**Manual verification**：seed 一個月完整 log data → banner 出現 → 生成張回顧卡，數字啱；seed 冇資料嘅月份 → 唔出 banner。

---

## 完成前檢查（跟返 repo 既有 DoD）

1. `node --test tests/*.test.mjs` 全綠，貼 output（4 個 task 各自嘅 unit test 计埋）
2. 瀏覽器實開 `index.html`，逐個 task 嘅 manual verification steps 行一次
3. `python3 scripts/github_push.py "<msg>"` + 核實 GitHub HEAD
4. `CHANGELOG.md` 頂部加條目

## 明確排除（唔好做）

外部 AI 呼叫、push notification、任何形式嘅小遊戲／dopamine hook 機制、跨裝置同步——呢批同鎖定定位唔夾，V2 backlog 都已經列明排除。
