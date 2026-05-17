# 零誤差 PO 解析器 · Web Demo

跨國採購單 (PO) 自動錄入系統的 Demo 前端，搭配自架 `proxy-cli` 多模態 AI 閘道。

詳見：
- 產品需求：`../01-dev/1-PRD.md`
- 使用者流程：`../01-dev/2-UserFlow.md`
- 技術選型：`../01-dev/3-TechStack.md`

---

## 快速開始

```bash
# 1. 安裝依賴（建議 pnpm，npm/yarn 也可）
pnpm install

# 2. 環境變數
cp .env.example .env.local
# 編輯 .env.local，填入有效的 PROXY_TOKEN

# 3. 啟動 dev server
pnpm dev
# → http://localhost:3000
```

需要 Node 20 LTS 以上。

---

## 環境變數

| 變數 | 說明 | 預設 |
|------|------|------|
| `PROXY_BASE_URL` | proxy-cli REST 端點 | `https://clip.twloop.com` |
| `PROXY_TOKEN` | Bearer token（從 proxy-cli dashboard 取得） | — |
| `PROXY_PROJECT` | 用量歸戶的 project 名稱 | `po-parser-demo` |
| `PROXY_CHAIN` | Provider fallback chain，`provider/model` 逗號分隔 | `gemini/gemini-2.5-flash,openai/gpt-5,gemini/gemini-2.5-pro` |

⚠️ `PROXY_TOKEN` 只在 server 端使用，**絕對不能加 `NEXT_PUBLIC_` 前綴**。

### Fallback chain 運作方式

BFF 會**依序**嘗試 `PROXY_CHAIN` 裡的每個 `provider/model`：

1. **第 1 個 provider**：呼叫 proxy → 收到 `content` → JSON.parse → Zod 驗證 → 通過則回傳 ✓
2. **同 provider re-prompt 一次**：若 parse 或 schema 驗證失敗，附驗證錯誤訊息再 prompt 同個 provider 一次
3. **切換下個 provider**：兩次都失敗（或 proxy 回 `auth_invalid` / `quota_exhausted` / `provider_down` / `content_policy` / 網路錯誤），跳到 chain 的下一個 entry，重新從步驟 1 開始
4. **全部失敗**：回 502，response 內含 `meta.attempts[]`，列出每個 provider 失敗的原因

UI 上若用到 fallback（成功前先試過某個 provider），meta 列下方會顯示「Fallback chain: gemini-flash ✗ → openai ✓」，方便 demo 時解釋穩定性。

**為什麼預設是這個 chain？**「品質遞進」策略：先用最快最便宜的 `gemini-2.5-flash`；不行就換獨立廠商 `openai/gpt-5`；最後出自家重量級 `gemini-2.5-pro`（對極端排版/手寫/印章辨識率更高）。比「試三家品牌」更有 reliability engineering 故事。

---

## 範例圖片

放兩張 PNG 到 `public/samples/`：
- `po-sample-1.png` — 整齊英文 PO（基本能力展示）
- `po-sample-2.png` — 混雜中英日文 + 印章 + 傾斜（極端排版展示）

UI 上的「範例 1 / 範例 2」按鈕會直接 fetch 這兩個檔案。檔案不存在時會顯示 toast 提示，不影響上傳功能。

---

## 架構

```
Browser (app/page.tsx)
   │ multipart upload
   ▼
Next.js BFF (app/api/extract/route.ts)
   │ 1. 驗 mime / size
   │ 2. base64 編碼
   │ 3. 呼叫 proxy /api/chat
   │ 4. JSON.parse + Zod 驗證
   │ 5. 失敗自動 re-prompt 一次
   ▼
proxy-cli (clip.twloop.com)
   │ Gemini CLI OAuth path
   ▼
Gemini 2.5 Flash
```

關鍵檔案：
- `lib/schema.ts` — Zod schema (PO 結構)
- `lib/prompt.ts` — extract prompt + re-prompt 模板
- `lib/proxy-client.ts` — server-only proxy 呼叫
- `app/api/extract/route.ts` — BFF route + 重試邏輯

---

## 指令

```bash
pnpm dev        # 開發
pnpm build      # 生產 build
pnpm start      # 啟動 production server
pnpm lint       # ESLint
pnpm typecheck  # TypeScript 檢查（tsc --noEmit）
```

---

## 故障排除

| 症狀 | 原因 | 處置 |
|------|------|------|
| 上傳後立刻 422，error_code 為 `schema_validation` | 模型回了正確但欄位不完整的 JSON | 看 `raw_content` 折疊區，調整 prompt 或讓 sample 圖片更清晰 |
| 502 error_code: `auth_invalid` | `PROXY_TOKEN` 失效 | 重設 .env.local |
| 502 error_code: `quota_exhausted` | proxy 端 quota 用完 | 等隔日重置或聯絡管理員 |
| 502 error_code: `network_error` | proxy 連線不上 | 確認 `clip.twloop.com` 可達；或改連同 NAS docker network 內部位址 |
| 解析品質不穩 | gemini-2.5-flash 對極端圖片表現邊緣 | 升級到 v2：改用 `/api/chat/tools` function calling 強制 schema |
