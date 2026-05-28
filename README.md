# 零誤差 PO 解析器 · Image Analysis Demo

跨國採購單 (PO) 自動錄入系統 Demo —— 用多模態 LLM 把混亂格式的 PDF/圖片採購單直接轉為符合資料庫 schema 的標準 JSON。

## 📁 Repo 結構

```
.
├── 01-dev/          # 產品 / 設計文件
│   ├── 1-PRD.md         # 產品需求
│   ├── 2-UserFlow.md    # 使用者流程 + 演示腳本
│   └── 3-TechStack.md   # 技術選型
└── 02-web/          # Next.js 15 應用程式
    ├── app/             # 路由 + BFF (/api/extract)
    ├── components/      # UI 元件
    ├── lib/             # schema (Zod) / prompt / proxy client / chain
    └── README.md        # 開發指引
```

## 🚀 快速開始

```bash
cd 02-web
cp .env.example .env.local
# 編輯 .env.local，填入 proxy-cli 的 PROXY_TOKEN
npm install
npm run dev
# → http://localhost:3000
```

詳見 [`02-web/README.md`](./02-web/README.md)。

## ✨ 重點特性

- **多模態解析**：透過 [`proxy-cli`](https://clip.twloop.com) 閘道呼叫 Gemini 2.5 Flash 等視覺模型，~2.5s/張。
- **Provider Fallback Chain**：`gemini-flash → openai/gpt-5 → gemini-pro`（品質遞進策略）依序嘗試，任一失敗自動切換，UI 上顯示 fallback 軌跡。
- **三層 Schema 保險**：Prompt 約束 + Zod 驗證 + re-prompt 重試，確保輸出 100% 符合資料庫 schema。
- **可觀測性**：UI 顯示 provider / model / 延遲 / token 用量 / 重試次數 / fallback chain。

## 🏗️ 架構

```
Browser ──multipart──▶ Next.js BFF ──/api/chat──▶ proxy-cli ──▶ Gemini Flash / OpenAI / Gemini Pro
                       (Zod validate)            (clip.twloop.com)
```

Bearer token 鎖在 server side，瀏覽器永遠拿不到。

## 📄 相關文件

- 產品需求：[`01-dev/1-PRD.md`](./01-dev/1-PRD.md)
- 使用者流程：[`01-dev/2-UserFlow.md`](./01-dev/2-UserFlow.md)
- 技術選型：[`01-dev/3-TechStack.md`](./01-dev/3-TechStack.md)

---

## English

# Zero-error PO Parser · Image Analysis Demo

Demo of an automated international purchase-order intake system — a multimodal LLM turns messy PDF/image POs straight into JSON that matches the target database schema.

### 📁 Repo structure

```
.
├── 01-dev/          # Product and design docs
│   ├── 1-PRD.md         # Product requirements
│   ├── 2-UserFlow.md    # User flow + demo script
│   └── 3-TechStack.md   # Stack choices
└── 02-web/          # Next.js 15 application
    ├── app/             # Routes + BFF (/api/extract)
    ├── components/      # UI components
    ├── lib/             # schema (Zod) / prompt / proxy client / chain
    └── README.md        # Dev guide
```

### 🚀 Quick start

```bash
cd 02-web
cp .env.example .env.local
# Edit .env.local, fill in proxy-cli PROXY_TOKEN
npm install
npm run dev
# → http://localhost:3000
```

See [`02-web/README.md`](./02-web/README.md) for details.

### ✨ Highlights

- **Multimodal parsing**: calls Gemini 2.5 Flash and other vision models through [`proxy-cli`](https://clip.twloop.com), ~2.5s per image.
- **Provider fallback chain**: `gemini-flash → openai/gpt-5 → gemini-pro` — quality-ascending strategy, auto-switches on failure, fallback trail shown in the UI.
- **Three-layer schema guard**: prompt constraints + Zod validation + re-prompt on failure → 100% schema-conformant output.
- **Observability**: UI shows provider / model / latency / token usage / retry count / fallback chain.

### 🏗️ Architecture

```
Browser ──multipart──▶ Next.js BFF ──/api/chat──▶ proxy-cli ──▶ Gemini Flash / OpenAI / Gemini Pro
                       (Zod validate)            (clip.twloop.com)
```

The bearer token is locked to the server — the browser never sees it.

### 📄 Related docs

- PRD: [`01-dev/1-PRD.md`](./01-dev/1-PRD.md)
- User flow: [`01-dev/2-UserFlow.md`](./01-dev/2-UserFlow.md)
- Tech stack: [`01-dev/3-TechStack.md`](./01-dev/3-TechStack.md)
