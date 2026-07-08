# 雲端 ASR 模型支援設計說明書 (Cloud ASR Support Spec)

本文件說明在「模型設定」中新增「雲端模型」與「本地端模型」切換機制，並整合雲端語音轉文字 (ASR) 服務之設計細節。

## 需求概述
在設定的「模型」選項中新增切換標籤 (Tab)，讓使用者可選擇「本地端模型」或「雲端模型」。
- **本地端模型**：維持 Handy 現有的本地 Whisper (GGML/GGUF) 載入與下載機制。
- **雲端模型**：允許使用者輸入雲端供應商、API 密鑰、接口端點與模型名稱。
  - **預設供應商**：Groq (預設端點與模型為 `whisper-large-v3`)。
  - **其他熱門供應商**：OpenAI, Gemini, Deepgram, 自定義 (Custom)。
  - **驗證連線**：提供連線測試按鈕，產生 0.5 秒的靜音音訊傳送給雲端 ASR 進行功能驗證。

---

## 系統架構與資料流

### 1. 資料儲存與設定變更 (`settings.rs`)
新增 `CloudAsrSettings` 結構體，並將其整合至 `AppSettings`：
```rust
#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct CloudAsrSettings {
    pub enabled: bool,
    pub provider: String,          // "groq", "openai", "gemini", "deepgram", "custom"
    pub api_key: String,
    pub base_url: String,
    pub model: String,
}
```

### 2. 雲端 ASR API 請求
新增一個 Rust 模組（如 `src-tauri/src/cloud_asr_client.rs` 或整合在 `transcription.rs` 中），負責將錄製的 WAV 音訊以 `multipart/form-data` 格式發送至對應供應商的語音轉寫接口（通常相容於 `/v1/audio/transcriptions`）：
- **音訊格式**：Handy 錄製的預設 WAV 格式（一般為 16kHz, 單聲道）。
- **驗證連線機制**：Rust 後端產生極短的靜音 WAV 位元組數據，直接模擬上傳發送請求，以減少對外部工具的依賴。

---

## 修改範圍

### 1. 後端修改 (`src-tauri/src/`)
- **`settings.rs`**: 新增 `CloudAsrSettings` 以及更新/重設的命令。
- **`lib.rs`**: 註冊 `verify_cloud_asr_connection` 命令與更新設定之命令。
- **`managers/transcription.rs`**: 
  - 在開始轉寫前判定：若 `settings.cloud_asr.enabled` 為 `true`，則不初始化與使用本地的 `transcribe-cpp`。
  - 轉為呼叫雲端 ASR 接口，傳入錄音檔案路徑，取得文字結果。
- **`cloud_asr_client.rs`** [NEW]: 實作 ASR HTTP 請求上傳音訊及 API 驗證邏輯。

### 2. 前端修改 (`src/`)
- **`stores/settingsStore.ts`**: 新增 `cloudAsr` 設定的讀寫 Action。
- **`components/settings/models/ModelsSettings.tsx`**:
  - 在頁面頂部加入 `Tabs` 元件，切換「本地端模型」與「雲端模型」。
  - 雲端模型分頁中，渲染對應的表單（供應商、API 密鑰、接口端點、模型名、驗證連線按鈕）。
- **`i18n/locales/en/translation.json` 及其他語言檔**: 新增對應詞條。

---

## 驗證計畫

### 自動與手動測試
1. **驗證連線功能**：
   - 輸入正確的 Groq API Key，點擊「驗證連線」，預期彈出成功提示。
   - 輸入錯誤的 API Key，預期彈出錯誤原因。
2. **轉寫功能測試**：
   - 啟用「雲端模型」，執行錄音，確認文字是由雲端模型（例如 Groq 的 whisper-large-v3）產出，且能成功貼上至目前視窗。
