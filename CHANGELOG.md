# CHANGELOG — catnu-app

> 改動記錄出口：新條目一律插喺呢個檔案頂部。CLAUDE.md 只放路由同現行規則。早期開發史 → `docs/superpowers/plans/2026-07-12-catnu-app.md`。

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
