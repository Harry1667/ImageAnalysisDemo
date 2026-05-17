# 產品需求文檔 (PRD)：零誤差文件解析器

> **專案名稱**：跨國採購單 (PO) 自動錄入系統 Demo
> **文件版本**：v1.1
> **更新日期**：2026-05-16
> **AI 服務**：proxy-cli（`clip.twloop.com`，REST `/api/chat`，Bearer token auth）

---

## 1. 產品概述 (Product Overview)

### 1.1 背景與痛點
在跨國貿易與日常營運中，企業每天會收到大量來自不同供應商、格式五花八門的 PDF 或圖片報價單/採購單 (Purchase Order, PO)。目前主要依賴人工辨識與手動登打（Data Entry），不僅耗費巨大人力時間，且極易產生人為錯誤（如打錯數字、漏寫項目），導致後續財務對帳與庫存管理的嚴重困擾。

### 1.2 產品目標
本系統旨在打造一個**技術火力展示 (Demo)**，證明透過最新一代多模態大型語言模型 (Multimodal LLM)，能夠完美解決非結構化單據的解析難題。目標是將混亂的圖片直接轉換為 **100% 符合資料庫格式要求** 的標準化 JSON 資料，實現「零誤差」的自動化錄入。

---

## 2. 目標受眾 (Target Audience)
- **企業決策者 / IT 主管**：評估 AI 技術導入可行性與 ROI。
- **採購 / 財務 / 業管人員**：期望減少繁瑣的手動輸入工作，提升工作效率的終端使用者。

---

## 3. 使用者介面與操作流程 (UI/UX Flow)

整體介面採用 **左右分欄佈局 (Split-Screen Layout)**，提供直覺的對比體驗。

### 3.1 左側畫面：輸入與預覽區
- **拖曳上傳區 (Drag & Drop)**：使用者可以將本地的採購單圖片拖曳至此處。
- **範例快速載入**：提供兩張預設的「超級混亂、無固定排版」測試用跨國採購單圖片，方便 Demo 展示。
- **圖片預覽**：上傳或選擇範例後，清晰展示原始單據內容（包含公司名稱、日期、多個品項明細與總價等）。

### 3.2 觸發動作
- **「一鍵 AI 萃取與驗證」按鈕**：位於顯眼處，點擊後啟動解析流程。

### 3.3 右側畫面：輸出與展示區
- **讀取狀態 (Loading State)**：點擊解析後，顯示科技感或流暢的讀取動畫，提示 AI 正在處理中。
- **結果展示區**：完成後，以具有**語法高亮 (Syntax Highlighting)** 的程式碼區塊，印出完美排版的 JSON 格式資料。

---

## 4. 核心技術與功能需求 (Functional & Technical Requirements)

### 4.1 核心解析引擎
- **非單純傳統 OCR**：棄用容易受排版影響的傳統 OCR，改採呼叫多模態 LLM。
- **AI 服務**：透過自架 `proxy-cli` 閘道呼叫，端點 `POST https://clip.twloop.com/api/chat`，header `Authorization: Bearer <token>`。
- **Provider fallback chain（client 端控制，可設）— 品質遞進策略**：
  1. **gemini / gemini-2.5-flash**（首選）— Gemini CLI OAuth 路徑，~2.5s/5k tokens 免費。快速且便宜，預期 80%+ 請求在此完成。
  2. **openai / gpt-5**（次選，換廠商）— codex CLI 路徑，~6.8s/21k tokens 免費（OAuth）。獨立廠商，對 gemini 卡住的圖片提供真正不同的 second opinion。
  3. **gemini / gemini-2.5-pro**（最終王牌）— 同家 Pro 模型，能力是 flash 的 2-3 倍，對極端排版 / 手寫字 / 印章 / 傾斜掃描的辨識率明顯較高。慢且貴 (~5×)，僅在前兩個都失敗時觸發。
  - 任一 provider 失敗（quota / auth / parse / schema 驗證）自動切換下一個。
  - 每個 provider 內部先 re-prompt 一次再放棄。
  - chain 由環境變數 `PROXY_CHAIN` 配置，預設即上述順序。
  - **為何不放 Claude**：proxy-cli 對 claude 讀圖實際是 Gemini API key 代打（SKILL.md 第 374 行），且 `actual_provider` 會回真實值，UI 上會出現「試 claude → 實際用 gemini」的矛盾，故捨棄。
- **圖片理解能力**：模型需能處理單據上的表格結構、印章、手寫字跡與不規則排版（PDF 也支援，同樣走 `images` 欄位、mime type 改 `application/pdf`）。

### 4.2 API 請求/回應合約

**請求 payload（multipart 或 JSON）：**

```json
POST /api/chat
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "prompt": "<see 4.3 prompt 模板>",
  "images": [
    { "mime_type": "image/png", "data": "<base64 encoded>" }
  ],
  "project": "po-parser-demo",
  "group": "extract"
}
```

**成功回應（proxy 統一 shape）：**

```json
{
  "ok": true,
  "content": "<模型回傳的純文字，預期為 JSON 字串>",
  "input_tokens": 5123,
  "output_tokens": 412,
  "latency_ms": 2480,
  "actual_provider": "gemini",
  "actual_model": "gemini-2.5-flash",
  "actual_source": "cli"
}
```

**支援的圖片格式**：`image/png`、`image/jpeg`、`image/webp`、`application/pdf`（同欄位）。base64 編碼後放 `data` 欄位。
**單張大小建議**：≤ 10MB（PDF 多頁也走同欄位，影片才需另開 `videos`）。

### 4.3 結構化輸出策略 (火力展示核心)

⚠️ **重要前提**：`/api/chat` 回的是模型生成的純文字 `content`，proxy 端**沒有透傳上游 provider 的 Structured Outputs / response_format 參數**。要做到「100% 符合 Schema」靠以下三層保險：

1. **Prompt 端約束**：System / User prompt 內明確指示「只回 JSON、不加任何前後說明、不要 ```json 包裹」，並把目標 schema 描述塞進去。
2. **Client 端 schema 驗證**：用 Pydantic（Python）或 Zod（TypeScript）對 `content` 做 `JSON.parse` + schema validation，包含型別、enum、日期格式（regex `^\d{4}-\d{2}-\d{2}$`）。
3. **驗證失敗時 re-prompt 一次**：若解析或驗證失敗，附帶錯誤訊息 + 原圖再呼叫一次，最多重試 1 次。兩次都失敗才把原始 `content` 與錯誤回傳前端。

> **進階選項（v2）**：改用 `POST /api/chat/tools`（function calling）強制模型透過 tool call 回 JSON 物件，比純 prompt 更穩。Demo 階段先用方案 1+2+3 即可。

**目標 JSON Schema**：

```jsonc
{
  "company_name":    "string",                  // 供應商公司名稱
  "po_number":       "string | null",           // 採購單號（圖上有才填）
  "date":            "string",                  // 強制 YYYY-MM-DD
  "currency":        "string",                  // ISO 4217，e.g. "USD" / "TWD" / "JPY"
  "items": [
    {
      "name":        "string",                  // 品名
      "quantity":    "integer",                 // 數量，整數
      "unit_price":  "number",                  // 單價，浮點
      "subtotal":    "number"                   // 小計，浮點（quantity * unit_price，模型自行算）
    }
  ],
  "total_amount":    "number"                   // 總價，浮點
}
```

### 4.4 錯誤處理與驗證

- **圖片端 (client)**：格式不符 / 大小超限（> 10MB）→ 上傳前防呆提示，不打 API。
- **proxy 錯誤碼**（從 response header `x-pcli-error-code` 或 body `error_code` 取，列舉如下）：

| `error_code` | 處置 |
|---|---|
| `bad_request` | 修 payload，**不要 retry** |
| `auth_invalid` | token 過期，通知管理員 |
| `quota_exhausted` | proxy 端 quota 用完，提示稍後再試 |
| `provider_down` | 全部 fallback 失敗，提示「AI 服務暫時不可用」|
| `content_policy` | 圖片被 safety filter 擋，**不要 retry 同圖**，請使用者換圖 |

- **schema 驗證失敗**：依 4.3 流程 re-prompt 一次；二次失敗則前端展示原始 `content` + 紅色錯誤橫幅，並提供「複製原始輸出」按鈕方便 debug。

---

## 5. 驗收標準 (Acceptance Criteria)

1. **視覺體驗**：左右對照介面流暢，上傳與動畫無卡頓，呈現專業的 Demo 質感。
2. **極端情況測試**：使用排版極度混亂、傾斜、有污漬的測試圖片，系統仍能準確抓取所有欄位。
3. **格式絕對正確**：經過 4.3 三層保險（prompt + Pydantic/Zod 驗證 + 1 次 re-prompt）後，輸出 JSON 100% 通過 schema 驗證（特別是日期 `YYYY-MM-DD` 與數字型別），不含 markdown 包裹（```json）或模型前後說明。
4. **效能基準**：單張圖片從點擊「萃取」到 JSON 渲染完成，p50 ≤ 4 秒、p95 ≤ 8 秒（含網路 + AI inference + 驗證重試）。
5. **錯誤可觀測**：UI 上能清楚顯示 `actual_provider` / `actual_model` / `latency_ms` / `input_tokens` / `output_tokens`，方便 Demo 時解釋成本與路徑。

---

## 6. 後續擴展規劃 (Future Roadmap)
- 改用 `/api/chat/tools`（function calling）強制 JSON tool-call，省掉 prompt-only 的 re-prompt 開銷。
- 支援多頁 PDF 文件解析（proxy 端已支援，只需前端處理多頁圖預覽）。
- 加入 Human-in-the-loop 介面，讓使用者在最終送出前可進行欄位微調與確認。
- 提供將 JSON 結果匯出為 Excel/CSV 或直接呼叫企業 ERP API 的功能。
- 加入信心分數（confidence score）：對每個欄位讓模型額外回 `_confidence`，低於閾值的欄位前端標紅提示人工複核。