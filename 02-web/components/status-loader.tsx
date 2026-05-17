"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const STAGES = [
  { ms: 0, text: "上傳圖片中…" },
  { ms: 600, text: "AI 正在解析單據結構…" },
  { ms: 3200, text: "辨識表格欄位與數字…" },
  { ms: 6500, text: "標準化日期 / 幣別 / 型別…" },
  { ms: 9500, text: "Schema 驗證中…" },
  { ms: 12000, text: "整理輸出結果…" },
];

export function StatusLoader() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timers = STAGES.slice(1).map((s, i) =>
      setTimeout(() => setStageIdx(i + 1), s.ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full text-center">
      <div className="relative">
        <Loader2 className="size-10 text-[var(--color-brand-500)] animate-spin" />
        <div className="absolute inset-0 rounded-full bg-[var(--color-brand-500)] opacity-20 blur-2xl animate-pulse-soft" />
      </div>
      <div className="flex flex-col items-center gap-2 min-h-16">
        {STAGES.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: i === stageIdx ? 1 : i < stageIdx ? 0.4 : 0,
              y: i === stageIdx ? 0 : i < stageIdx ? -4 : 6,
            }}
            transition={{ duration: 0.3 }}
            className="text-sm text-[var(--color-fg)]"
            style={{ display: i > stageIdx ? "none" : "block" }}
          >
            {s.text}
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-muted)] max-w-xs">
        正透過 proxy-cli 呼叫 Gemini 2.5 多模態模型，全程約 10-15 秒
      </p>
    </div>
  );
}
