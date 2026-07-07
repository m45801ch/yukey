# 更新日誌

## [0.2.3] — 2026-07-07

### 變更

- **實作 OpenLess Prompt Framework v1.0** — 模組化提示詞架構，包含：
  - Main Prompt v1.0（角色 + 不可違背規則 + 輸出格式）
  - Style Library（11 種修飾模式，含 YAML front matter 中繼資料）
  - Dictionary Module（6 個專業詞庫，結構化 metadata）
  - Prompt Builder 引擎（front matter 解析、priority 排序、衝突驗證）
- **新增 6 個修飾模式**：Email、LINE、社群貼文、教學、筆記、公文

## [0.2.2] — 2026-07-07

### 變更

- **品牌更名：Handy → yukey** — 更新所有使用者可見字串（i18n、CLI、紀錄檔、系統匣圖示、除錯路徑、HTML 標題）。技術識別碼（handy-keys crate、handy-computer HF 組織、blob.handy.computer 網址、致謝區）保留不動。
- **版本號修正**為有效 semver `0.2.2`（原為 `0.2.02`）。
- **簡化 Bundle 資源設定** — 模型排除規則從 `tauri.conf.json` 移至 `.gitignore`。
- **修復 i18n JSON 結構** — `pages.models` 與 `pages.translate` 金鑰原被錯誤嵌套在 `settings.advanced.overlay` 下。
- **更新金鑰** — 重新產生簽署金鑰對，更新設定檔中的公鑰。
- **正式建置產出**：MSI（109 MB）+ NSIS（28.5 MB），附 `.sig` + `latest.json`，已簽署且可供 GitHub Releases 發布。
