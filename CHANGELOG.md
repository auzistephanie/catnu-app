# CHANGELOG — catnu-app

> 改動記錄出口：新條目一律插喺呢個檔案頂部。CLAUDE.md 只放路由同現行規則。早期開發史 → `docs/superpowers/plans/2026-07-12-catnu-app.md`。

## 2026-07-19 Code review 🟢 hero-photo tilt 俾 JS parallax 蓋晒

- **背景**：跟第一輪 🔴 review 之後補埋 🟡🟢。
- **Fix（🟢 hero-photo 應該有嘅 -2.5deg 微傾側，實際完全冇出現）**：`.hero-photo` 本身 CSS 有 `transform:rotate(-2.5deg)` 底樣＋hover 復正，但呢個 div 同時有 `reveal zoom` class，`.reveal.show{transform:none}` 用多一個 class 嘅 specificity 蓋咗底樣；就算補一條 `.hero-photo.reveal.show{transform:rotate(-2.5deg)}` 蓋返，實測（Playwright）仲係唔work——因為 `.hero-photo` 有 `data-plx="-0.05"`，俾落面通用 `[data-plx]` parallax rAF handler 逐 scroll frame 寫 `el.style.transform` inline style，inline style 優先級贏晒任何 CSS selector。
  - 修：(1) 加返 CSS override `.hero-photo.reveal.show{transform:rotate(-2.5deg)}`＋對應 `:hover{transform:rotate(0)}`；(2) 拎走 `.hero-photo` 個 `data-plx` 屬性，令 parallax loop 唔再摸呢個 element，CSS-driven 嘅 tilt/hover/reveal-zoom 系統攞返晒控制權。
- **驗證**：Playwright headless 實測（非純睇 code）：靜止時 computed transform = `rotate(-2.5deg)`矩陣；hover 時變返 identity（`rotate(0)`）；hover 完scroll，冇 inline style 殘留（證實 parallax handler 真係唔再摸呢個element）；`.reveal.zoom` entrance動畫（opacity/scale）正常。
- **檔案**：`landing.html`。

## 2026-07-18 CLAUDE.md 加 repo 專屬 DoD（開檔呢份 CHANGELOG）

- CLAUDE.md 加「✅ 完成前檢查」section：test glob 真跑／plan 文件 manual verification steps／push＋核實 GitHub HEAD（全 repo CLAUDE.md 升級 session，承接同日 Standards 收斂）。改前版本 → `CLAUDE.md.bak-20260718`。
- 本 repo 之前冇 CHANGELOG.md，今日起計。
