# CLAUDE.md — 貓奴修行 catnu-app

單一 `index.html` 嘅貓咪 bonding tracker。2026-07-28 起重新定位：公開俾 20–40 歲女性貓奴用（無 login，數據存各自裝置 localStorage `catnu.v1`）；UI＝「奶茶軟萌」clay 3D（方向 A），品牌 keep「貓奴修行」，tagline “Win your cat's heart, one moment at a time.”。v1 build spec（舊定位）→ `docs/CATNU_BUILD_SPEC.md`；改版明細＋Phase 2 backlog → `CHANGELOG.md` 2026-07-28。

## ⚙️ Standards（MANDATORY — 正本：`stephanie-personal/docs/ai-governance/06-STANDARDS.md`，改規則只改正本）

Push（`github_push.py`，永不 git CLI・HTTPS・一 run 一 commit・**開工前 `--check`**・**收工即推**・三道閘 刪檔／SHA／交叉 review，撞閘唔好即刻 `--force`）・寫入分流（改動記錄 → `CHANGELOG.md` **頂部**；本檔上限 100 行/6KB）・清理 mv `_to_delete/`・方向性決定先 preview（02 §R3）・改完以用家身份 run 一次先報完成・governance 00–06（派工 01 §1＋03 模板；完成前過 02 §R2；冇 mount stephanie-personal 就叫 Stephanie 連埋）。**Codex 讀同層 `AGENTS.md`**。詳文＋例外表 → 正本。

## 架構決定

- **單一 index.html**：全部 CSS 喺一個 `<style>`、全部 JS 喺一個 `<script>`，vanilla JS，冇框架冇 build step。JS 分兩個 zone：
  - **Pure-logic zone**（`window.Catnu = {...}`）：好感度計算、action correlation、任務生成、里程碑、配對測驗計分——全部冇 DOM/localStorage 依賴，靠 `tests/helpers/load-app.mjs` 用 Node `vm` 讀 `index.html` 嘅 `<script>` 出嚟做 unit test。
  - **App zone**（`Catnu.Store` + render functions）：localStorage 讀寫、DOM 渲染，全部收埋喺 `initApp()`，靠 `window.addEventListener('DOMContentLoaded', initApp)` 先郁，唔會喺 Node test 環境入面執行。
- **測試**：`node --test tests/*.test.mjs`（Node ≥18，冇裝額外套件；bare 嘅 `node --test tests/` directory form 喺呢部機 Node v22 冇 package.json 時唔work，一定要用 glob form）。淨係測 pure-logic zone 嘅精確公式（好感度加權、P_a/P_base、任務生成 determinism、配對計分）；UI 部分靠手動喺瀏覽器驗證，步驟記喺 plan 文件每個 task 嘅 manual verification steps。
- **Push**：見 ⚙️ Standards §S1。本 repo 特有：`scripts/github_push.py` 有 empty-repo bootstrap（Git Data API 對零 commit repo 會 409，首次 push 經 Contents API 先種一個檔案）。

## 開發

```bash
cd "/Users/stephanieau/Desktop/Stephanie-Google Drive/dev/catnu-app"
node --test tests/*.test.mjs    # 跑晒 pure-logic 測試
python3 -m http.server 8934     # 本機睇 index.html / landing.html
```

## 部署

Vercel project `catnu-app`（static，`vercel.json` 唔需要特別設定），git auto-deploy from `main`。`index.html` = 個 app，`landing.html` = 對外 landing page。手機「加到主畫面」靠 `apple-mobile-web-app-capable` + inline SVG icon。Repo 喺 GitHub 係 **public**（Stephanie 確認過唔緊要，唔使刻意收埋）。

## ✅ 完成前檢查（本 repo 專屬 DoD；通用四格 → 02-JUDGMENT §R2）

1. 改咗 pure-logic zone → `node --test tests/*.test.mjs` 真跑全綠，貼 output
2. UI 有改 → 瀏覽器實開 `index.html`／`landing.html`，行返 plan 文件該 task 嘅 manual verification steps
3. Push：`python3 scripts/github_push.py "<msg>"`＋核實 GitHub HEAD（→ Standards §S1）

## v2 Backlog（唔好做，記低就算）

配對測驗結果分享、AI 分析（匯出數據俾 Claude）、跨裝置同步（Supabase）、推送提醒、相簿、健康記錄 integration。
