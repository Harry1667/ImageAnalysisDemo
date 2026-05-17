import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "零誤差 PO 解析器 · AI Demo",
  description:
    "上傳跨國採購單，Multimodal LLM 直接萃取為符合資料庫 schema 的標準化 JSON。支援英中日混雜、印章、手寫修正、傾斜掃描。Fallback chain：Gemini Flash → OpenAI GPT-5 → Gemini Pro。",
  applicationName: "PO Parser Demo",
  keywords: [
    "AI",
    "OCR",
    "Purchase Order",
    "採購單",
    "Multimodal LLM",
    "Gemini",
    "Schema Validation",
    "JSON Extraction",
  ],
  openGraph: {
    type: "website",
    siteName: "零誤差 PO 解析器",
    title: "零誤差 PO 解析器 · 圖片 → JSON 零誤差錄入",
    description:
      "上傳跨國採購單，Multimodal LLM 直接萃取為符合資料庫 schema 的標準化 JSON。Provider fallback chain + Schema 強制驗證，~13s/張。",
    locale: "zh_TW",
  },
  twitter: {
    card: "summary_large_image",
    title: "零誤差 PO 解析器 · AI Demo",
    description:
      "圖片 → JSON 零誤差錄入。Multimodal LLM + Schema 強制驗證。",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
