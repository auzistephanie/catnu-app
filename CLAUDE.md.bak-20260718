# CLAUDE.md — 貓奴修行 catnu-app

單一 `index.html` 嘅貓咪 bonding tracker，Stephanie 個人用（唔使 login，數據淨係存喺 localStorage `catnu.v1`）。完整 build spec + 實現計劃喺 `docs/superpowers/plans/2026-07-12-catnu-app.md`。

## 架構決定

- **單一 index.html**：全部 CSS 喺一個 `<style>`、全部 JS 喺一個 `<script>`，vanilla JS，冇框架冇 build step。JS 分兩個 zone：
  - **Pure-logic zone**（`window.Catnu = {...}`）：好感度計算、action correlation、任務生成、里程碑、配對測驗計分——全部冇 DOM/localStorage 依賴，靠 `tests/helpers/load-app.mjs` 用 Node `vm` 讀 `index.html` 嘅 `<script>` 出嚟做 unit test。
  - **App zone**（`Catnu.Store` + render functions）：localStorage 讀寫、DOM 渲染，全部收埋喺 `initApp()`，靠 `window.addEventListener('DOMContentLoaded', initApp)` 先郁，唔會喺 Node test 環境入面執行。
- **測試**：`node --test tests/*.test.mjs`（Node ≥18，冇裝額外套件；bare 嘅 `node --test tests/` directory form 喺呢部機 Node v22 冇 package.json 時唔work，一定要用 glob form）。淨係測 pure-logic zone 嘅精確公式（好感度加權、P_a/P_base、任務生成 determinism、配對計分）；UI 部分靠手動喺瀏覽器驗證，步驟記喺 plan 文件每個 task 嘅 manual verification steps。
- **Push**：`python3 scripts/github_push.py "<msg>"`，唔用 git CLI（同 sales-trainer/daily-novel/venturenix-lab-seminar 一致做法，避免 sandbox 留低 `.git/index.lock`）。呢個 repo 嘅 script 額外處理咗全新、零 commit 嘅 empty repo bootstrap（Git Data API 對完全冇 commit 嘅 repo 會 409，第一次 push 會經 Contents API 先種一個檔案）。一次 run = 一個 commit = 一次 Vercel deployment，唔好連環 push。
- **冇背景 auto-push daemon**（2026-07-16 起，裝機步驟正本 → `stephanie-personal/docs/PUSH-SETUP.md`）：Cowork 雲端改完 → `device_commit_files` 寫返 Mac 之後，唔會自動 push，要手動雙擊 `stephanie-personal/scripts/push-now.command`（跑晒 autopush-registry 入面全部 repo，包括呢個），或者喺呢個 repo 入面直接跑上面嗰句 `github_push.py`。

## 開發

```bash
cd "/Users/stephanieau/Desktop/Stephanie-Google Drive/dev/catnu-app"
node --test tests/*.test.mjs    # 跑晒 pure-logic 測試
python3 -m http.server 8934     # 本機睇 index.html / landing.html
```

## 部署

Vercel project `catnu-app`（static，`vercel.json` 唔需要特別設定），git auto-deploy from `main`。`index.html` = 個 app，`landing.html` = 對外 landing page。手機「加到主畫面」靠 `apple-mobile-web-app-capable` + inline SVG icon。Repo 喺 GitHub 係 **public**（Stephanie 確認過唔緊要，唔使刻意收埋）。

## v2 Backlog（唔好做，記低就算）

配對測驗結果分享、AI 分析（匯出數據俾 Claude）、跨裝置同步（Supabase）、推送提醒、相簿、健康記錄 integration。
