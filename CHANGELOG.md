# CHANGELOG — catnu-app

> 改動記錄出口：新條目一律插喺呢個檔案頂部。CLAUDE.md 只放路由同現行規則。早期開發史 → `docs/superpowers/plans/2026-07-12-catnu-app.md`。

- 2026-08-09：**雙貓PK＋貓格分析卡**（Phase 3，回應「唔夠fun／唔夠吸引」意見）——
  - `Catnu.twoCatPK(logs, catIdA, catIdB, nowTs)`：本週邊隻正面互動次數多就贏，打平顯示「打成平手」。Analysis tab 新卡「本週雙貓PK」，得 2+ 隻貓先出現，兩隻都冇本週記錄就顯示未夠data提示。
  - `Catnu.personalityCard(logs, catId, nowTs)`：全期非中性記錄 <20 條顯示未夠data；夠鐘就按黏人指數／負面率／關係等級／夜晚log比例判斷 5 個型格之一（黐身小棉襖／傲嬌型／慢熱型／夜貓子／神秘型 fallback）。檔案 tab 每隻貓加「🔮 生成性格卡」掣，借用現有 share-card canvas 系統加第 4 個 template（`Catnu.sharePersonalityCard`）。
  - 兩個都係 pure-logic，`tests/phase3.test.mjs` 新增 12 個 test（PK 3 個、personality 9 個，涵蓋 5 個型格分支＋門檻邊界），`node --test tests/*.test.mjs` 53/53 全綠。
  - 手動驗證：sandbox 冇 root 裝唔到 playwright 全套 system deps，改用 `apt-get download libxdamage1`（唯一缺嘅 so）解壓後 `LD_LIBRARY_PATH` 指過去，headless chromium 起到本機 http server 版本 index.html 實測——seed 2 貓+21條log，Analysis tab PK卡數字啱（Mochi 7次 vs Eheh 3次）、Profile tab 撳「生成性格卡」真係觸發 PNG download 兼內容正確（黏人指數90%／最鍾意梳毛），全程零 console error。
  - 上一輪同時提出嘅 UI 色系（加sage第二色系）呢次未做，維持單獨提案未落地。

- 2026-08-01（承 07-31 制度複檢）：**`scripts/github_push.py` 修靜默故障** — 舊版 `_PUSH_STATE_DIR` 用 `os.path.dirname(REPO)` 當 stephanie-personal 係隔籬 folder；04-MAINTENANCE §6 將 5 個 repo 搬出 Drive Mirror 後假設崩咗，`makedirs` 靜靜咁喺 `~/Desktop/dev`、`~/dev`、`daily-novel/` 開咗 3 個假 stephanie-personal，concurrent-push 偵測對 6 個 repo 死咗都冇人知（真 state 檔停留喺 7/26–7/30）。改為 `STEPHANIE_PERSONAL_DIR` 環境變數 → Drive 正本絕對路徑 → legacy sibling 三段 resolve，搵唔到就**唔寫兼出聲**（S5「死咗邊個會知」）。12 份 script 一齊改，py_compile 全過，sales-trainer 實跑驗證真 state 有更新。假 folder 已收入 `_to_delete/`。

- 2026-07-31：`.gitignore` 加 `*.bak-*` 第二道防線 — 配合 06-STANDARDS §S3「備份一律開喺 `_to_delete/`」，就算漏咗 mv 都唔會畀 `github_push.py` 誤推上 GitHub（2026-07-25 事故嘅根治）。本 repo 冇 governance `backups/`，所以唔需要 negation 例外。

## 2026-07-28 Phase 2：紀念日＋關係等級＋週報＋share 卡重造＋landing 換皮＋提醒

- **Schema v2（version-dispatch migration）**：`Catnu.migrateState()` v1→v2 自動升級（cats 加 `birthDate`（完整日期，生日倒數用）＋`anniversaries[]` 自訂紀念日），舊數據/舊備份檔照食；`defaultState` schemaVersion=2；還原 validate 兼容 1/2。
- **紀念日**：pure-logic `daysTogether`／`upcomingAnniversaries`（生日🎂／嚟屋企🏠／自訂，按倒數排序；birthYM 唔夠精度唔出倒數）；檔案頁每貓「相處第 N 日＋倒數」box＋自訂紀念日加/刪；編輯表格加「出生日期」date field；記錄頁 7 日內預告 badge、正日 🎉 celebration banner→burst＋紀念日 share 卡；相處 100/365/500/1000 日自動做里程碑（開 app 即 check，唔使等有新記錄）。
- **關係等級**：`Catnu.relationshipLevel`（Lv1 高冷陌生貓 40→Lv2 畀少少面 55→Lv3 開始融化 70→Lv4 黐身小棉襖 85→Lv5 靈魂伴侶）；分析頁好感度卡顯示 Lv＋稱號＋「仲差 X 分升級」。
- **貓咪週報**：`Catnu.weeklyReport`（7 日 count／正面率／對上週變化／最常做 action）；分析頁週報卡＋「生成週報靚卡」。
- **Share 卡重造**：canvas 1080×1350 全新奶茶 clay 視覺（漸變底＋爪印 pattern＋白卡柔影＋tagline），三款共用底框：里程碑／週報／紀念日。
- **每日提醒 .ics**：任務頁「🔔 加入每日提醒」→ 生成 FREQ=DAILY 21:00 行事曆事件（floating local time＋VALARM）。v1 冇 backend，真 push 維持 v2。
- **公開入口分流**：onboarding 前加歡迎頁（tagline＋「我有貓→開檔案」／「我未有貓→配對測驗」）；`switchTab` 加 onboarding 期間 guard（測驗結果撳品種唔會爆）。
- **Mascot**：header 由 emoji 換做 inline SVG 動畫貓（眨眼＋耳仔郁＋浮動，零外部依賴——冇用 Lottie 因為要另外 host 動畫 JSON，效果同級，想轉 Lottie 隨時可換）。
- **landing.html 換皮**：全 palette 墨綠花磚→奶茶蜜桃（含 dark zone 轉深可可、花磚 pattern 轉暖色）、chunky offset shadow→柔影、btn 圓角 99px、hero 加英文 tagline。改版前原檔留 `landing.html.bak-20260728`（gitignored）。
- **驗證**：`node --test tests/*.test.mjs` **44/44 全綠**（新增 `tests/phase2.test.mjs` 12 個 test：等級邊界/日數/紀念日排序/週報計算/migration/日數里程碑；`store.test.mjs` default schema 斷言跟 v2）；Playwright 實測：v1 seed 開 app 自動升 v2、預告 badge／正日 banner 出現、紀念日卡＋週報卡＋.ics 實際 download、自訂紀念日加/刪寫入 localStorage、days-100 開 app 即解鎖、onboarding 分流兩邊行到、無橫 scroll、零 console error。

## 2026-07-28 Phase 1 大改版：重新定位＋全 app 換皮「奶茶軟萌」clay 3D＋記錄頁減磅

- **重新定位（決定已鎖）**：由 Stephanie 個人 app → 公開俾 20–40 歲女性貓奴用；維持無 login、數據存各自裝置 localStorage（真同步/push 留 v2 Supabase）。名 keep「貓奴修行」；tagline "Win your cat's heart, one moment at a time."；UI 方向 A「奶茶軟萌」；3D 做法 = clay CSS＋mascot（Phase 2 升級 Lottie）。
- **index.html 換皮**：`<style>` 設計系統全換 — palette 墨綠花磚 → 奶茶蜜桃 clay 3D（頂光＋底影＋press 回彈），**CSS variable 名全部不變**（--teal/--terra 等只改值），JS zone 免改；5 個 tab 由頂部搬去 bottom nav（拇指可及）＋icon；header 浮動 mascot；theme-color/favicon 跟新色；字體加 M PLUS Rounded 1c。
- **記錄頁減磅**（痛點：要入太多嘢）：新增「一撳即記」6 tiles（每張 map 落現有 reactions/actions 組合，pure-logic 分析引擎零改動）＋「⟳ 同上次一樣」重複掣＋原有詳細 chips 收入「✏️ 記詳細啲」toggle；新增 `commitLog()` helper 統一所有入 log 路徑（tiles/repeat/晚間回顧/詳細 submit 共用 milestone check＋toast＋burst）。
- **唔記得記**：晚間回顧 banner（當日未記該貓先出現）→ 3 揀 1 快速補記（`backfilled:true`、note「晚間回顧」；「一般」= 中性 entry 唔計分）。
- **micro-interactions**：記錄成功爪印/心心 burst、負面紫色分色、記錄頁好感度 mini-card（`Catnu.affectionScore` 直接攞）。
- **驗證**：`node --test tests/*.test.mjs` 32/32 全綠；Playwright 390px 實開 5 tabs＋onboarding，互動實測（night review／tile／repeat／詳細 submit 各入 1 條 log，內容核對正確）；`scrollWidth=390` 無橫向 scroll。
- `.gitignore` 加 `*.bak-*`（暫存檔冇 ignore rule 同類第 4 宗）；改版前原檔留 `index.html.bak-20260728`（gitignored）。
- **Phase 2 backlog（已批未做）**：landing.html 換皮＋英文 tagline、share 卡重造（IG 1080×1350 新視覺）、「加入每日提醒」.ics、關係等級＋稱號、貓咪週報、配對測驗做公開入口 hook、紀念日 function（生日 schema 年月→完整日期，方案 a）、mascot 升級 Lottie。share 卡 canvas 暫仍舊 palette，Phase 2 一併重造。

## 2026-07-25 `.active-session.lock*` 冇入 .gitignore → session 鎖檔一直推上 GitHub

- **問題**：`session-lock.sh` 喺每個 repo 根寫 `.active-session.lock`；release 嗰陣 Drive mount `rm` 唔到（device bridge 冇 rm 權限），會 fallback 改名做 `.active-session.lock.DELETE-ME-<epoch>`。兩種檔全部 repo 都**冇入 `.gitignore`**，所以 `github_push.py` 照推——最舊一個殘留檔 timestamp 係 **2026-07-14**，即係呢個洩漏行咗成十日。
- **修**：12 個 repo（含 `novel-web`）`.gitignore` 全部加 `.active-session.lock*`（一條 pattern 蓋埋活鎖同 `.DELETE-ME-*`）；現存 16 個殘留檔 mv 入各自 `_to_delete/`。
- **同類第三宗**：同日先修咗 ①`_to_delete/` 冇入 ignore、②`.bak-*` 冇入回收筒，今次係 ③鎖檔。三宗共通根因＝**新產生嘅暫存檔冇人幫佢配 ignore rule**。
- ⚠️ **未做（要 Stephanie 拍板）**：真正治本係改 `session-lock.sh`，唔好將鎖寫入 repo 樹，改寫去 `stephanie-personal/scripts/.session-locks/<repo>.lock` 集中管——咁就冇檔會落 repo，亦唔使靠 12 份 `.gitignore` 各自記得。

## 2026-07-25 `_to_delete/` 冇入 .gitignore → 回收筒檔案推咗上 GitHub（修）

- **問題**：全局規則係「清理檔案一律 mv 去 `_to_delete/`」，但本 repo `.gitignore` 冇 `_to_delete/` 一行。`github_push.py` 嘅 `working_files()` 用 `git ls-files -c -o --exclude-standard`，`--exclude-standard` 只擋 .gitignore 有列嘅嘢——冇列就當普通未追蹤檔照上傳。GitHub Git Trees API 核實 remote `main`：**實際有 1 個（`_to_delete/CLAUDE.md.bak-20260718`）**。
- **修**：`.gitignore` 加 `_to_delete/`。下次 push，`working_files()` 唔再列佢 → `deletions = [p for p in remote if p not in local_set]` 會用 `sha: None` 自動由 remote 樹刪走，唔使（亦唔准）動用 git CLI `rm --cached`。
- **範圍**：同一 session 掃晒 11 個 repo，6 個中招（AI for elderly／stephanie-portfolio／xuanli／catnu-app／MakeMyHome／fable-prompt），一次過全部補。原本已有嘅 5 個：Travel App／daily-novel／sales-trainer／stephanie-personal／venturenix-lab-seminar。
- ⚠️ **只由 HEAD 移除，舊 commit 歷史仍然有**。已 grep 過全部內容，冇 token／secret **值**（只有變數名如 `GITHUB_TOKEN` 出現喺說明文字），本 repo 為 **public**，判斷唔需要 rewrite history。

## 2026-07-19 Code review 🟢 hero-photo tilt 俾 JS parallax 蓋晒

- **背景**：跟第一輪 🔴 review 之後補埋 🟡🟢。
- **Fix（🟢 hero-photo 應該有嘅 -2.5deg 微傾側，實際完全冇出現）**：`.hero-photo` 本身 CSS 有 `transform:rotate(-2.5deg)` 底樣＋hover 復正，但呢個 div 同時有 `reveal zoom` class，`.reveal.show{transform:none}` 用多一個 class 嘅 specificity 蓋咗底樣；就算補一條 `.hero-photo.reveal.show{transform:rotate(-2.5deg)}` 蓋返，實測（Playwright）仲係唔work——因為 `.hero-photo` 有 `data-plx="-0.05"`，俾落面通用 `[data-plx]` parallax rAF handler 逐 scroll frame 寫 `el.style.transform` inline style，inline style 優先級贏晒任何 CSS selector。
  - 修：(1) 加返 CSS override `.hero-photo.reveal.show{transform:rotate(-2.5deg)}`＋對應 `:hover{transform:rotate(0)}`；(2) 拎走 `.hero-photo` 個 `data-plx` 屬性，令 parallax loop 唔再摸呢個 element，CSS-driven 嘅 tilt/hover/reveal-zoom 系統攞返晒控制權。
- **驗證**：Playwright headless 實測（非純睇 code）：靜止時 computed transform = `rotate(-2.5deg)`矩陣；hover 時變返 identity（`rotate(0)`）；hover 完scroll，冇 inline style 殘留（證實 parallax handler 真係唔再摸呢個element）；`.reveal.zoom` entrance動畫（opacity/scale）正常。
- **檔案**：`landing.html`。

## 2026-07-18 CLAUDE.md 加 repo 專屬 DoD（開檔呢份 CHANGELOG）

- CLAUDE.md 加「✅ 完成前檢查」section：test glob 真跑／plan 文件 manual verification steps／push＋核實 GitHub HEAD（全 repo CLAUDE.md 升級 session，承接同日 Standards 收斂）。改前版本 → `CLAUDE.md.bak-20260718`。
- 本 repo 之前冇 CHANGELOG.md，今日起計。
