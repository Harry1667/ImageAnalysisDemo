# 技術選型 (Tech Stack)

> **配套文件**：1-PRD.md（產品需求）、2-UserFlow.md（使用者流程）
> **更新日期**：2026-05-16

---

## 1. 總覽 (Architecture Overview)

```
┌─────────────────┐    fetch + FormData    ┌──────────────────┐
│  Browser        │ ─────────────────────► │  Next.js BFF     │
│  (React + UI)   │ ◄───────────────────── │  /api/extract    │
└─────────────────┘     JSON (validated)   └────────┬─────────┘
                                                    │ POST /api/chat
                                                    │ Bearer <PROXY_TOKEN>
                                                    ▼
                                          ┌──────────────────┐
                                          │  proxy-cli       │
                                          │  clip.twloop.com │
                                          └────────┬─────────┘
                                                   │ gemini CLI (OAuth)
                                                   ▼
                                          ┌──────────────────┐
                                          │  Gemini 2.5 Flash│
                                          └──────────────────┘
```

**為什麼要 BFF（Backend-for-Frontend）而不是瀏覽器直連 proxy？**

1. **Bearer token 不能暴露給瀏覽器**：proxy-cli 的 token 等於整個 AI 額度的鑰匙，前端塞 env 就洩光。BFF 把 token 鎖在 server-side env。
2. **Schema 驗證放後端比較穩**：Pydantic/Zod 驗證 + re-prompt 重試邏輯在 server 比較好寫，前端只負責顯示。
3. **未來易擴充**：要加 rate limit、log、計費統計都在 BFF 加一層即可。

---

## 2. 前端 (Frontend)

| 項目 | 選擇 | 理由 |
|------|------|------|
| Framework | **Next.js 15+ (App Router)** | 同專案內可寫 server API route 當 BFF，省一個 backend 部署 |
| 語言 | **TypeScript** | schema 型別跟 Zod 共用，避免前後端漂移 |
| UI 元件 | **shadcn/ui** + **Tailwind CSS** | Demo 質感最快、客製性高、不需綁定 design system |
| 檔案上傳 | **react-dropzone** | 拖曳區標配，size/mime 防呆內建 |
| JSON 高亮 | **shiki**（推薦）或 `react-syntax-highlighter` | shiki 用 VSCode 同款 grammar，視覺最有「程式感」|
| 動畫 | **framer-motion** | 逐行淡入 / 狀態切換流暢 |
| Toast | **sonner** | shadcn 標配，零配置 |
| Icons | **lucide-react** | shadcn 內建 |

**取捨備註**：
- 沒選 Vite + 獨立 Express：要多一個部署單元，Demo 不值得。
- 沒選 SvelteKit：團隊熟悉度未知，Next.js 是最安全的選擇。
- 沒用 React Server Components 處理上傳：圖片要在 client 預覽，state 留在 client 比較單純。

---

## 3. 後端 BFF (Next.js API Route)

| 項目 | 選擇 | 理由 |
|------|------|------|
| Runtime | **Next.js Node runtime**（**不是** Edge） | 要處理 base64（記憶體 + CPU），Edge runtime 受限 |
| Schema 驗證 | **Zod** | 跟前端共享同一份 schema 定義，TypeScript 自動推導型別 |
| HTTP client | **`fetch`**（內建） | 不需要 axios，原生夠用 |
| 環境變數 | **`@t3-oss/env-nextjs`** | type-safe env，避免拼錯 `PROXY_TOKEN` |
| Log | `console`（demo 階段） / `pino`（production） | demo 不過度設計 |

**核心檔案結構**：

```
app/
├── page.tsx                    # 主畫面（左右分欄）
├── api/
│   └── extract/route.ts        # BFF: 收圖 → 打 proxy → 驗證 → 回 JSON
components/
├── upload-zone.tsx             # react-dropzone 包裝
├── image-preview.tsx
├── json-viewer.tsx             # shiki 高亮
├── meta-bar.tsx                # 顯示 provider / model / latency / tokens
└── status-loader.tsx           # 跑馬燈動畫
lib/
├── schema.ts                   # Zod schema（前後端共用）
├── prompt.ts                   # 萃取用的 prompt 模板
└── proxy-client.ts             # 包裝 /api/chat 呼叫 + retry 邏輯
public/
└── samples/
    ├── po-sample-1.png
    └── po-sample-2.png
```

---

## 4. AI 服務整合細節

### 4.1 環境變數 (`.env.local`)

```bash
PROXY_BASE_URL=https://clip.twloop.com
PROXY_TOKEN=<proxy-cli 上發給此 demo 專案的 Bearer token>
PROXY_PROJECT=po-parser-demo
PROXY_CHAIN=gemini/gemini-2.5-flash,openai/gpt-5,claude/claude-haiku-4-5
```

> ⚠️ `PROXY_TOKEN` 絕對不能加 `NEXT_PUBLIC_` 前綴。打包時 Next.js 會把帶該前綴的 env 注入 bundle。

**`PROXY_CHAIN` 設計**：`provider/model` 逗號分隔，BFF 依序嘗試。任一失敗（auth / quota / provider_down / parse / schema 驗證）自動跳下一個。每個 provider 內部還會 re-prompt 一次再放棄。完整邏輯見 `app/api/extract/route.ts` 的雙層迴圈。

### 4.2 Zod Schema（`lib/schema.ts`）

```ts
import { z } from "zod";

export const POItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const POSchema = z.object({
  company_name: z.string().min(1),
  po_number: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期必須為 YYYY-MM-DD"),
  currency: z.string().length(3),  // ISO 4217
  items: z.array(POItemSchema).min(1),
  total_amount: z.number().nonnegative(),
});

export type PO = z.infer<typeof POSchema>;
```

### 4.3 Prompt 模板（`lib/prompt.ts`）

```ts
export const EXTRACT_PROMPT = `
You are a strict PO (Purchase Order) data extractor.

Read the attached image and extract all fields. Output ONLY a valid JSON object.

CRITICAL RULES:
1. Do NOT wrap output in markdown code fences (no \`\`\`json).
2. Do NOT add any text before or after the JSON.
3. Dates MUST be formatted as YYYY-MM-DD (ISO 8601).
4. Currency MUST be ISO 4217 code (USD, TWD, JPY, EUR, CNY, etc.).
5. Numbers MUST be JSON numbers, not strings. Quantities are integers.
6. If po_number is not visible, use null (not empty string).

Required schema:
{
  "company_name": string,
  "po_number": string | null,
  "date": "YYYY-MM-DD",
  "currency": "ISO 4217",
  "items": [{ "name": string, "quantity": integer, "unit_price": number, "subtotal": number }],
  "total_amount": number
}
`.trim();
```

### 4.4 呼叫流程（`/api/extract/route.ts` 雙層迴圈偽碼）

```ts
1. 收 multipart form → 取出 image File
2. 驗 mime type + size（< 10MB）
3. await file.arrayBuffer() → base64 編碼
4. parseChain(process.env.PROXY_CHAIN) → [{provider, model}, ...]
5. attempts = []
6. for entry of chain:                          // outer：依序試 provider
     prompt = EXTRACT_PROMPT
     for attempt in 0..1:                       // inner：同 provider 最多 2 次
       chat = callProxy({ ...entry, prompt, images })
       if chat 失敗（auth/quota/network/provider_down/content_policy）:
         attempts.push(proxy_error)
         break inner → 換下個 provider
       parsed = JSON.parse(stripCodeFences(chat.content))
       if parse 失敗:
         attempt==0 → re-prompt 同 provider；continue
         attempt==1 → attempts.push(parse_error); break inner → 換 provider
       result = POSchema.safeParse(parsed)
       if success → attempts.push(success); return { ok: true, data, meta: { ...attempts } }
       else:
         attempt==0 → re-prompt 同 provider；continue
         attempt==1 → attempts.push(schema_validation); break inner → 換 provider
7. 全 chain 跑完都沒成功 → 回 { ok: false, error_code, raw_content, validation_issues, meta.attempts }
```

最壞情況：3 個 provider × 2 次 = 6 次 API call。實務上首次或第二次就成功。

---

## 5. 部署 (Deployment)

| 項目 | 選擇 | 理由 |
|------|------|------|
| 部署平台 | **Vercel**（首選） / **Cloudflare Pages**（次選） | Next.js 原生支援、零設定、PR preview 方便 Demo |
| 自架選項 | NAS 同 proxy-cli 共網 (Docker) | 走 docker network 內部 `ai-proxy:50051`，零延遲（見 SKILL.md 情境 1）。但 Next.js 在 NAS 跑通常 overkill。 |
| Domain | 子網域如 `po-demo.twloop.com` | NPM 反代到 Vercel 或 NAS |
| HTTPS | Vercel 自動 / NAS NPM (Let's Encrypt) | 標配 |

> **生產建議**：若日後客戶要落地自己 host，BFF 改成單獨的 FastAPI / Hono 容器跟 proxy-cli 走同一個 docker network（情境 1），延遲最低、token 不外流。

---

## 6. 開發環境 (Local Dev)

```bash
# 安裝
pnpm install
# 或 npm install

# 環境變數
cp .env.example .env.local
# 填入 PROXY_TOKEN

# 啟動
pnpm dev
# → http://localhost:3000
```

**最低 Node 版本**：Node 20 LTS（Next.js 15 要求）。
**套件管理**：建議 pnpm，安裝快、磁碟省。

---

## 7. 不做的事 (Out of Scope)

明確排除避免 demo 失焦：

- ❌ 使用者認證系統（demo 是公開 URL）
- ❌ 多租戶 / 計費
- ❌ 後台管理介面
- ❌ 自架 LLM / 本地推論（直接吃 proxy-cli 即可）
- ❌ 資料庫（解析結果僅 in-memory，使用者自行下載 JSON）
- ❌ i18n（先做繁體中文 UI）
- ❌ 行動裝置適配（先以桌面 1440px 為主，但不能爆版）

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| Gemini CLI OAuth 掛掉 / 帳號被封 | 圖片解析失敗 | proxy-cli 內建 fallback chain；BFF 顯示 `actual_provider` 讓問題可被觀察 |
| 模型對某張極端圖片回非 JSON 文字 | 解析失敗 | 三層保險（4.3 章）；極端情況 demo 時 fallback 到範例 1 |
| proxy 端 quota 用完 | 全面故障 | demo 前一週監控用量；活動日提前加額度 |
| Vercel 上 base64 圖片過大爆記憶體 | 502 / timeout | BFF 限制單張 10MB；Vercel function memory 拉到 1024MB |
