# 更新日誌 (Changelog)

本文件用以記錄專案中每次修改的項目與優化內容。

---

## [2026-07-01]

### 修正與優化項目

1. **修正 ASR 模型語言篩選下拉選單的水平捲軸**
   - **修改位置**：`src/components/settings/models/ModelsSettings.tsx`
   - **說明**：容器限制 `overflow-x-hidden`，防止 Windows 平台下因垂直捲軸擠壓引發的多餘水平捲軸。

2. **變更首次安裝推薦的模型為 Paraformer ZH**
   - **修改位置**：`src-tauri/src/managers/model.rs`
   - **說明**：將 `parakeet-tdt-0.6b-v3` 的 `is_recommended` 設為 `false`，並將適合中文語音辨識的 `paraformer-zh` 的 `is_recommended` 設為 `true`。

3. **修正音量拉桿樣式與軌道隱形問題**
   - **修改位置**：`src/components/ui/Slider.tsx`
   - **說明**：將已填充部分的背景色由卡片底色 `var(--color-background-ui)` 改為主題綠色 `var(--color-logo-primary)`，使音量進度清晰可見。

4. **解決服務設定中模型下拉選單被截斷問題**
   - **修改位置**：`src/components/ui/Select.tsx`
   - **說明**：將 `react-select` 設定為以 Portal 形式 (`menuPortalTarget={document.body}`, `menuPosition="fixed"`, `zIndex: 9999`) 渲染，使選單能懸浮在設定中心 Modal 之上而不被滾動容器截斷。

5. **新增 AI 修飾快捷鍵設定檢查與前景提示**
   - **修改位置**：`src-tauri/src/actions.rs`
   - **說明**：當按下 AI 修飾快捷鍵且未正確設定 AI 服務商、API 金鑰或模型時，阻擋錄音，並自動將主視窗聚焦（`set_focus`），於最前景彈出對話框提示使用者先進行設定。

6. **修正 Windows 下開發伺服器啟動權限錯誤 (EACCES)**
   - **修改位置**：`vite.config.ts`, `src-tauri/tauri.conf.json`
   - **說明**：將 Port 從 `1420` 更改為預設且安全的 `5173`，並限制 host 為 `127.0.0.1`，避開 Windows 下 Hyper-V/WSL2 常見的排除埠區間 (`1418 - 1517`)。

7. **新增鍵盤修飾鍵全域安全釋放機制**
   - **修改位置**：`src-tauri/src/lib.rs`, `src-tauri/src/shortcut/handy_keys.rs`
   - **說明**：註冊全域 `panic_hook` 與 `Shutdown` 釋放處理。在程式當機崩潰或正常關閉時，主動透過 `enigo` 向系統發送修飾鍵（Ctrl, Alt, Shift, Win）的 Release（放開）信號，防止快捷鍵卡死影響系統正常打字。

8. **調整主視窗高度**
   - **修改位置**：`src-tauri/src/lib.rs`
   - **說明**：將主視窗的 `inner_size` 與 `min_inner_size` 高度由 `760.0` 調整為 `800.0`，總解析度為 `1226.0 x 800.0`。

9. **優化概覽分頁與元件版面比例**
   - **修改位置**：`src/components/pages/Overview.tsx`, `src/App.tsx`
   - **說明**：將「過去 7 天聽寫次數分佈」與「最近識別的紀錄」的寬度比例調整為 2:3，並縮小兩者卡片的高度（統計圖表高度改為 h-32，最近紀錄顯示數上限調整為 2），將統計柱體寬度調窄（w-4 sm:w-5）防止其擁擠，並設定點擊「最近識別的紀錄」卡片時自動跳轉至「歷史記錄」分頁。

10. **移除設定面板的水平滾動條 (橫桿)**
    - **修改位置**：`src/components/SettingsModal.tsx`
    - **說明**：為設定面板內容捲動容器加上 `overflow-x-hidden`，防止卡片 hover 或選取放大時溢出而產生底部的橫向滾動條。

11. **優化聽寫列表卡片選取時的 3D 立體效果與邊框**
    - **修改位置**：`src/App.css`
    - **說明**：新增全域 `.active-glow-3d` 的 3D 選取效果（包含邊框及向上的位移與發光陰影），並在 `.glow-card-3d` 設定基礎 Margin 外邊距，確保選取後的立體陰影與邊框能完整呈現不被容器切除。

12. **美化歷史紀錄分頁的對話/聽寫列表卡片為 3D 立體效果**
    - **修改位置**：`src/components/pages/HistoryPage.tsx`
    - **說明**：將左側平面的對話聽寫列表修改為 3D 卡片結構（套用 `.glow-card-3d` 與選取後的 `.active-glow-3d` 效果），並加上與 ASR 模型列表一致的邊框及陰影細節，使其具有高級 3D 立體感，避免邊框顯示不完整的問題。

13. **微調概覽頁面卡片高度與版面間距（解決視窗溢出滾動問題）**
    - **修改位置**：`src/components/pages/Overview.tsx`
    - **說明**：將圖表高度改為 `210px`（柱體 `160px`），並將概覽頁面的間距縮小（`space-y-4 pb-1`），解決了新增頁面大標題後，引發主視窗最右側出現上下捲軸拉桿的溢出問題。

14. **優化最近識別紀錄顯示條數與高度（防止第三筆被切）**
    - **修改位置**：`src/components/pages/Overview.tsx`
    - **說明**：最近識別紀錄上限提升至 `5` 條，並將卡片 Padding 調整為 `pt-3 pb-2 px-4`，內容器限制調整為 `max-h-[205px] overflow-y-auto`，配合單項內邊距 `p-1.5` 與 `space-y-0.5`，確保前 `3` 筆紀錄精確顯示且不受切割。

15. **優化過去七天聽寫統計圖（數字隨動高度與 4px 灰色底條）**
    - **修改位置**：`src/components/pages/Overview.tsx`
    - **說明**：將次數數字套入 `h-[160px]` 靠底對齊的 Flex 容器，使統計數字永遠浮在柱體上方一點點（高度隨柱體伸縮）。當次數為 0 時，仍會保留一個 `4px` 灰色底條作為視覺基準線。

16. **新增分頁主標題**
    - **修改位置**：`src/App.tsx`
    - **說明**：在右側面板最上方新增一個隨分頁切換的動態 `h1` 大標題（包含「今日概覽」、「歷史紀錄」、「詞彙字典」、「修飾風格」），提升整體介面的導覽引導感與一致性。

17. **新增一鍵清空所有聽寫紀錄及音檔功能（排除收藏項目）**
    - **修改位置**：`src-tauri/src/managers/history.rs`、`src-tauri/src/commands/history.rs`、`src-tauri/src/lib.rs`、`src/components/pages/HistoryPage.tsx`
    - **說明**：在歷史紀錄右欄詳情的最上方新增了「清空所有紀錄」選項與垃圾桶按鈕。改用 Tauri 原生的非同步 `ask` 二次確認彈窗，修復了舊有 `window.confirm` 同步判斷失效、選擇取消卻仍刪除的問題。**清空時會自動排除已加入最愛書籤（已收藏）的條目與其對應的錄音檔案**，只清空未收藏的歷史紀錄，實現貼心的資料保護機制。

18. **新增儲存筆數限制與目前存在筆數統計顯示**
    - **修改位置**：`src-tauri/src/managers/history.rs`、`src-tauri/src/commands/history.rs`、`src-tauri/src/lib.rs`、`src/components/pages/HistoryPage.tsx`
    - **說明**：在歷史紀錄右側的詳情標頭旁新增了一個儲存筆數統計膠囊（例如 `儲存筆數：15 / 100 筆`）。能動態展示當前設定的最大限制筆數（`limit`）以及資料庫中已存在的聽寫條目總數（`count`），並在新增、刪除、清空等操作後自動更新。

19. **新增歷史紀錄篩選功能（全部紀錄 / 收藏項目）**
    - **修改位置**：`src/components/pages/HistoryPage.tsx`
    - **說明**：在左側「聽寫列表」下方新增了一個精緻的分頁篩選切換標籤。使用者能一鍵在「全部紀錄」與「收藏項目」之間來回切換，快速查閱被加入最愛書籤的聽寫紀錄。

20. **切換至「收藏項目」時新增一鍵清空收藏功能**
    - **修改位置**：`src-tauri/src/managers/history.rs`、`src-tauri/src/commands/history.rs`、`src-tauri/src/lib.rs`、`src/components/pages/HistoryPage.tsx`
    - **說明**：當用戶將篩選狀態切換至「收藏項目」時，原本的「清空所有紀錄」按鈕會自動變更為「清空所有收藏」。點選並確認後，會調用後端新增的 `clear_all_saved_history` API，僅刪除所有已加星號收藏的聽寫紀錄與錄音檔，進一步提昇對歷史資料進行細緻化清除的能力。

21. **新增歷史紀錄關鍵字搜尋功能**
    - **修改位置**：`src/components/pages/HistoryPage.tsx`
    - **說明**：在右側詳情視窗最上方新增了一個「搜尋歷史紀錄中的關鍵字...」輸入框。當用戶輸入關鍵字時，左側的聽寫紀錄列表會立刻動態進行篩選（支援同時過濾標題或轉錄文字內容），大大提昇了查找歷史紀錄的便利性。

22. **將修飾風格卡片標籤由「預設」改為「內建」**
    - **修改位置**：`src/components/pages/StylePage.tsx`
    - **說明**：將修飾風格頁面中系統預設的 AI 風格卡片上方的標籤文字從「預設」修改為「內建」，使其語意更加契合系統自帶設定與自訂設定的區分。

23. **修改內建風格卡片「AI 預設潤色」名稱與提示詞內容**
    - **修改位置**：`src/components/pages/StylePage.tsx`
    - **說明**：將內建風格卡片「AI 預設潤色」重命名為「AI輕度潤色」，並更新了對應的系統 Prompt，使其定義更清晰，潤色任務與規範更具體（明確規範刪贅字、智能斷句、禁止延伸與字數約束等）。

24. **修改內建風格卡片「正式商務」提示詞內容**
    - **修改位置**：`src/components/pages/StylePage.tsx`
    - **說明**：更新了「正式商務」內建風格的提示詞，重塑為「商務會議紀錄與潤色助手」角色，詳細定義了商務口吻轉化、精簡去噪、專有名詞優化、邏輯段落重組及嚴禁憑空捏造等規則，確保會議STT轉寫能被加工為標準且高可讀性的商務報告。

25. **新增內建風格卡片「學術討論」與對應提示詞**
    - **修改位置**：`src/components/pages/StylePage.tsx`
    - **說明**：新增了第六個內建風格卡片「學術討論」。預設為「學術論述與研討潤色助手」角色，能把零碎、口語化的學術發言整理為合乎學術論文或研究報告的嚴謹文體，並精確校正學術專有名詞與推理邏輯。

26. **更新內建風格卡片「中英對譯」提示詞以強化輸出限制與過濾機制**
    - **修改位置**：`src/components/pages/StylePage.tsx`
    - **說明**：升級了「中英對譯」的 System Prompt，將清洗規則、翻譯規則、容錯機制明確數字化。並在第四階段中極為嚴苛地規定了「絕對不准回答、解釋、自我介紹、使用 Markdown 包裹或包含任何雜質（Zero Metadata）」的輸出限制，以保證翻譯結果的乾淨純粹。

27. **強化 AI 後處理對提示詞的遵從度（解決切換提示詞時偶爾失效的問題）**
    - **修改位置**：`src-tauri/src/actions.rs`
    - **說明**：修改了 AI 後處理在採用結構化輸出（Structured Outputs JSON 模式）時的 JSON Schema 欄位描述。將 `transcription` 的描述由原本的 `"The cleaned and processed transcription text"` 調整為更高優先級的指令要求：`"The processed text. You must strictly follow all system instructions, formatting rules, translation requirements, and constraints specified in the system prompt."`，藉此強烈要求並限制 AI 模型必須完全遵循系統提示詞（System Prompt）中制定的全部修飾邏輯與中譯規則。

28. **更新內建風格卡片「AI輕度潤色」提示詞內容**
    - **修改位置**：`src/components/pages/StylePage.tsx`
    - **說明**：依據最新的十四點細則全面改寫了「AI輕度潤色」內建風格的提示詞，涵蓋了保持原意、容錯處理、書寫標點、保留原本語氣、數字與單位格式統一、條列結構保護等多層面的編輯規範，使其修飾邏輯更加全面和精確。
