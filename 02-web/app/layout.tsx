import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "零誤差 PO 解析器 · AI Demo",
  description:
    "上傳採購單圖片，AI 多模態解析 + Schema 強制驗證，輸出可直接寫入 ERP 的標準化 JSON。",
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
