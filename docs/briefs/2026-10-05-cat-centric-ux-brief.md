# Brief：Catnu「以隻貓為中心」UX 升級（4 項）

> 交俾：Claude Code　｜　出自：Cowork review 2026-10-05（用 2 隻貓＋40 條 seed log、390px 實開 5 個 tab）
> Stephanie 已經睇過 before/after preview 兼批咗方向。**用廣東話＋繁體中文同佢報告。**

---

## 0. 開工前（必做）

1. 讀同層 `CLAUDE.md`、`AGENTS.md`、`CHANGELOG.md` 頂嗰幾條（2026-09-17）。
2. `python3 scripts/github_push.py --check`：如果遠端有變，等同步完先開工。
3. **鎖定咗、唔准推翻嘅決定：**
   - 視覺 =「奶茶軟萌」clay 3D。`:root` 嘅 CSS token（`--terra`／`--mustard`／`--clay-card`…）**一個色值都唔准改**，亦唔准起第二套視覺系統（2026-09-15 Codex 撞過一次）。
   - 單一 `index.html`，vanilla JS，冇 build step；pure-logic zone（`window.Catnu`）唔可以有 DOM 或 localStorage 依賴。
   - 定位係「溫柔、唔迫人、唔係診斷」：**唔准**用內疚式訊息、倒數、隨機獎勵或者社會證明數字。
   - Runtime 唔准打外部 API（包括 Pollinations）。
4. 遇到 spec 互相矛盾就停低問 Stephanie，唔好自己估。

---

## 1. 🐞 Bug：一次過解鎖多個里程碑時 toast 爆版（先做，風險最低）

**現況**：`index.html` 有兩處（約 L1309–1314 boot check、L1550–1554 `commitLog()`）將**所有** unlocked milestone 用「／」砌成一條字，再塞入 `Catnu.showToast()`。實測 12 個里程碑會變成一個巨大嘅深啡色圓波，遮住半個畫面；而且兩隻貓各自嘅「第一次記錄」會重複出現，又冇寫係邊隻貓。

**改法**
- 抽一個共用嘅 `announceMilestones(unlocked)`，取代上面兩處重複嘅 code。
- 只得 1 個：維持而家寫法（`🎉 解鎖里程碑：📝 第一次記錄`）。如果 milestone 有 catId，喺前面加貓名，例如 `Mochi・第一次記錄`。
- 2 個或以上：toast 只顯示「🎉 {貓名／你哋} 解鎖咗 N 個新回憶 · 去睇」。撳落去 `switchTab('almanac')`，跳去里程碑牆。
- `.toast` CSS 加 `max-width` 同 `max-height`，文字最多 2 行，超出用省略號（防止第二次爆版）；toast 只准用現有 token。

**驗收**：用 seed 資料開 app，toast ≤ 2 行，撳落去去到圖鑑；剩 1 個 milestone 時顯示照舊。

---

## 2. 🐱 每隻貓有自己個樣（avatar）

**現況**：全 app 嘅貓都用 `cat.emoji`（通常係 🐱），出現喺 `.avatar`（L1995、L2317）、各個 chip switcher（L1603、L1955、L2185）、PK（L1908/1913）。`images/avatars/` 已經有 9 款 clay 頭像（ginger／grey／cream／dark／tabby／calico／longhair／white／black，400×400 透明底），但 code 一次都冇用過。

**Schema**
- cat 加欄位 `avatar`：值係 `null`（fallback）、`'preset:<name>'`，或者 `'photo:<dataURL>'`。
- `defaultState` 嘅 `schemaVersion` 升做 3；`Catnu.migrateState()` 加 v2→v3（`avatar: null`），舊數據同舊備份都要食得落。還原 validate 要兼容 1/2/3。

**3 層 fallback（2026-09-15 已同 Stephanie 定咗）**
1. 主：用家自己上傳嘅相
2. 次：揀一款 preset 頭像
3. 底：未揀之前顯示 `cat.emoji`（現有行為），**唔好**改成強制要揀

**實作**
- 加 pure helper `Catnu.avatarSrc(cat)`：preset 回傳 `images/avatars/cat-avatar-<name>.png`，photo 回傳 dataURL，兩樣都冇就回傳 `null`。要寫 unit test。
- App zone 加 `avatarHtml(cat, size)`：有 src 就出 `<img class="avatar-img">`（圓形、`object-fit:cover`），冇就出返 emoji。**所有**顯示貓 emoji 嘅 UI 位置都改用呢個 helper（chip 用細 size，約 22px）。
- Share-card canvas（L2583 之後）暫時**唔郁**，維持 emoji，留做下一輪。
- 編輯貓表格：「Emoji」欄改成「頭像」揀選器 = 9 款 preset 縮圖 grid＋「上傳相」掣＋「用返 emoji」。Emoji input 保留做 fallback。
- Onboarding 加貓嗰步加同一個揀選器，**可以略過**。
- 上傳相：用 `<canvas>` 中心裁正方形、縮到 **256×256**，轉做 `image/jpeg` quality 0.8 嘅 dataURL（大約 15–30KB）。`Catnu.Store.save()` 要包 try/catch，撞到 `QuotaExceededError` 就出溫和 toast（「部機儲存空間唔夠，試下揀款預設頭像」），**唔准**令 app 壞。
- 9 張 PNG 如果每張大過 60KB，可以順手壓細（例如縮到 256px）。原檔 mv 入 `_to_delete/`，唔好刪。

**驗收**：揀 preset 之後重新整理頁面仍然記得；上傳一張 4MB 嘅相，儲存後 localStorage 增加 < 50KB；舊 v2 備份還原成功，冇揀過頭像嘅貓顯示返 emoji；9 款 preset 張張都 load 到。

---

## 3. 💗 記錄完隻貓會回應（「一撳即記」回饋）

**現況**：撳 6 塊 tile 之後只有 `spawnBurst()`＋toast「✓ 記錄咗喇！」，隻貓本身冇反應。

**改法**
- 記錄頁頂部加一張「貓 hero」：大頭像（約 64px，用 #2 嘅 `avatarHtml`）＋貓名＋一行副標（例如「相處第 201 日」）。
- 撳 tile 之後：
  - 頭像做一個約 0.8s 嘅「呼嚕」動畫：輕微左右擺＋scale 1.06，再彈返原位。
  - 頭像旁邊浮出對話泡泡，用**隻貓嘅口吻**講一句（句子由 #4 嘅 pool 抽），約 1.8s 後淡出。
  - 現有 `spawnBurst()` 照用；正面 log 嘅心心改由頭像位置飄出。
  - 原本嘅「✓ 記錄咗喇」toast 改為只喺冇泡泡嘅路徑先出（例如詳細表格 submit）。
- 負面 tile（紫色嗰塊）：**唔好**加心心，亦唔好扮開心。頭像只做好細嘅縮一縮，泡泡用溫柔句子（見 #4）。
- 要尊重 `@media (prefers-reduced-motion: reduce)`：只淡入泡泡，唔做擺動。

**驗收**：6 塊 tile 逐塊撳一次都有對應泡泡；負面 tile 冇心心；連撳 3 下唔會疊出 3 個泡泡（新泡泡取代舊泡泡）；`commitLog()` 寫入嘅資料同改之前一模一樣（只改呈現，唔改數據）。

---

## 4. 🗣 用隻貓嘅口吻講數字

**現況**：分析 tab 好感度卡寫「好感度指數／近 7 日正面反應加權比率」（L1996），似報告多過似隻貓。

**改法（pure-logic，要寫 test）**
- `Catnu.catVoice(score, seed)`：按好感度分段回傳一句貓口吻。`seed` 用日期，令同一日顯示嘅句子固定（deterministic）。分段跟 `relationshipLevel` 嘅門檻（40／55／70／85）：
  - Lv1（<40）：「我仲喺度觀察緊你…」／「你行開少少先」
  - Lv2（40–54）：「都算你啦，今日畀少少面你」／「你把聲…我認得」
  - Lv3（55–69）：「其實…你都幾好嘅」／「今日可以坐近少少」
  - Lv4（70–84）：「呢個禮拜我幾鍾意你」／「你返嚟我會去門口等」
  - Lv5（≥85）：「我最鍾意你，唔好話俾其他貓知」／「你係我嘅人」
  - 冇數據：「你多啲陪我，我就會話你知我諗咩」
- `Catnu.TILE_REPLIES`：每塊 tile id 對應 3 句，隨機揀一句，畀 #3 用：
  - 黐我：「呼嚕呼嚕…再摸多陣」／「你係我嘅」／「唔准走」
  - 慢眨眼：「（慢慢眨返你一下）」／「我信你㗎」／「…（眨）」
  - 玩：「喵！再嚟一轉！」／「我捉到喇！」／「仲未攰！」
  - 梳毛：「舒服…呢度呢度」／「下巴都要」／「我靚唔靚」
  - 坐大脾：「呢度係我嘅位」／「暖笠笠」／「你唔准郁」
  - 負面：「今日唔想俾人掂…」／「等陣先啦」／「我自己靜一陣就好」
  - （tile id 對返 code 入面實際嘅 id，句子可以微調，但語氣要溫柔、可愛、唔可以內疚。）
- 分析 tab 好感度卡：標題改為「{貓名} 想同你講」，大字顯示 `catVoice()` 嗰句（serif 字體，用現有 `--disp`），分數同 Lv 縮做副線：「好感度 88 · Lv.5 靈魂伴侶」。進度條同 7 日 bar 保留。
- 「近 7 日正面反應加權比率」呢句說明搬去一個細 ⓘ tooltip 或者卡底小字，**唔好刪**，保持透明度。

**驗收**：5 個分段＋冇數據各有 test；同一日、同一個分數回傳同一句。

---

## 5. 完成前檢查（本 repo DoD）

1. 新 test 寫入 `tests/phase5.test.mjs`（`avatarSrc`、`migrateState` v2→v3、`catVoice` 分段＋determinism、`TILE_REPLIES` 每個 tile id 都有句子）。真跑 `node --test tests/*.test.mjs`，全綠先算，output 要貼出嚟。
2. Playwright 或 browser 實開 `index.html`，390px 同桌面兩個寬度都要試：seed 2 隻貓＋約 40 條 log，逐項行一次上面嘅驗收；確認冇橫向 scroll、零 console error。
3. 截圖 before/after 嘅記錄 tab、分析 tab、檔案 tab，畀 Stephanie 睇。
4. `CHANGELOG.md` 頂部加一條 2026-10-05 條目。`CLAUDE.md` 只喺有新架構規則時先加，要守 100 行／6KB 上限。
5. Push：`python3 scripts/github_push.py "<msg>"`，**一次 run 一個 commit**，建議分 4 個 commit，順序 #1 → #2 → #4 → #3（#3 依賴 #2 同 #4）。推之前核對檔案名單，見到唔係自己改嘅檔就停手問。推完核實 GitHub HEAD。
6. 呢份 brief 喺 `docs/briefs/` 入面，可以跟第一個 commit 一齊推。

## 6. 唔好做（scope 外）

- 唔好改 share-card canvas 嘅視覺或色值。
- 唔好加 push notification、mini game、streak 懲罰或者社會證明。
- 唔好郁好感度計分公式同任何 pure-logic 分析引擎（今次只係加 helper）。
- 唔好處理 `.btn` 白字對比度問題（CHANGELOG 已經記低，另開一單）。
