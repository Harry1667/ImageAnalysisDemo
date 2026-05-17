"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Copy, Check, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { UploadZone } from "@/components/upload-zone";
import { ImagePreview } from "@/components/image-preview";
import { JsonViewer } from "@/components/json-viewer";
import { MetaBar } from "@/components/meta-bar";
import { StatusLoader } from "@/components/status-loader";
import { ErrorPanel } from "@/components/error-panel";
import type { ExtractResponse, ExtractSuccess, ExtractError } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Status = "idle" | "previewing" | "loading" | "success" | "error";

const SAMPLES = [
  {
    key: "sample-1",
    short: "範例 1 · 英文",
    label: "範例 1：英文採購單（整齊排版）",
    description: "美國供應商英文 PO，整齊排版、5 個品項，USD",
    src: "/samples/po-sample-1.png",
    type: "image/png",
  },
  {
    key: "sample-2",
    short: "範例 2 · 多語",
    label: "範例 2：中英日混雜 + 印章",
    description: "日本供應商發注書，中英日混雜、紅色印章、手寫修正、微傾斜，JPY",
    src: "/samples/po-sample-2.png",
    type: "image/png",
  },
];

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState<ExtractSuccess | null>(null);
  const [error, setError] = useState<ExtractError | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type === "application/pdf") {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (f: File) => {
    setFile(f);
    setSuccess(null);
    setError(null);
    setStatus("previewing");
  };

  const handleRemove = () => {
    setFile(null);
    setSuccess(null);
    setError(null);
    setStatus("idle");
  };

  const loadSample = async (sample: (typeof SAMPLES)[number]) => {
    try {
      const res = await fetch(sample.src);
      if (!res.ok) {
        toast.error(
          `範例圖片不存在，請放置一張 PNG 到 public${sample.src}`
        );
        return;
      }
      const blob = await res.blob();
      const f = new File([blob], sample.src.split("/").pop()!, {
        type: sample.type,
      });
      handleFile(f);
    } catch {
      toast.error("載入範例失敗");
    }
  };

  const extract = useCallback(async () => {
    if (!file) return;
    setStatus("loading");
    setSuccess(null);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as ExtractResponse;
      if (json.ok) {
        setSuccess(json);
        setStatus("success");
      } else {
        setError(json);
        setStatus("error");
      }
    } catch (err) {
      setError({
        ok: false,
        error: err instanceof Error ? err.message : "network failure",
        error_code: "network_error",
      });
      setStatus("error");
    }
  }, [file]);

  const handleCopyJson = async () => {
    if (!success) return;
    await navigator.clipboard.writeText(JSON.stringify(success.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!success) return;
    const blob = new Blob([JSON.stringify(success.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.[^.]+$/, "") ?? "po"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b bg-[var(--color-surface)]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] p-2">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">零誤差 PO 解析器</h1>
              <p className="text-xs text-[var(--color-muted)]">
                Multimodal LLM × Schema 強制驗證 · 跨國採購單自動錄入
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span className="rounded-full bg-[var(--color-brand-100)] px-2.5 py-1 text-[var(--color-brand-700)] font-medium">
              AI by proxy-cli
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
          <section className="flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-[var(--color-muted)] shrink-0">
                1. 上傳採購單
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--color-muted)] mr-0.5 hidden sm:inline">
                  快速範例
                </span>
                {SAMPLES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => loadSample(s)}
                    disabled={status === "loading"}
                    title={s.description}
                    aria-label={s.label}
                    className={cn(
                      "group relative h-[88px] w-[68px] rounded-lg overflow-hidden",
                      "border-2 border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm",
                      "hover:border-[var(--color-brand-500)] hover:shadow-md hover:-translate-y-0.5",
                      "transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.src}
                      alt=""
                      className="absolute inset-0 size-full object-cover object-top"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pt-3 pb-1">
                      <span className="block truncate text-[9.5px] font-medium text-white leading-tight">
                        {s.short}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {file ? (
                <ImagePreview
                  file={file}
                  previewUrl={previewUrl}
                  onRemove={handleRemove}
                  dim={status === "loading"}
                />
              ) : (
                <UploadZone onFile={handleFile} disabled={status === "loading"} />
              )}
            </div>
            <button
              type="button"
              onClick={extract}
              disabled={!file || status === "loading"}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition",
                "bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow-lg shadow-[var(--color-brand-500)]/20",
                "hover:shadow-xl hover:shadow-[var(--color-brand-500)]/30 hover:-translate-y-0.5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              )}
            >
              <Sparkles className="size-4" />
              一鍵 AI 萃取與驗證
            </button>
          </section>

          <section className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--color-muted)]">
                2. 結構化 JSON 輸出
              </h2>
              {status === "success" && success && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-[var(--color-bg)] transition"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "已複製" : "複製 JSON"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-[var(--color-bg)] transition"
                  >
                    <Download className="size-3.5" />
                    下載 .json
                  </button>
                  <button
                    type="button"
                    onClick={extract}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-[var(--color-bg)] transition"
                  >
                    <RotateCcw className="size-3.5" />
                    重新解析
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 rounded-2xl border bg-[var(--color-surface)] overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                {status === "idle" || status === "previewing" ? (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center px-6"
                  >
                    <div className="rounded-full bg-[var(--color-bg)] p-4 mb-4">
                      <Sparkles className="size-7 text-[var(--color-muted)]" />
                    </div>
                    <p className="text-sm font-medium">
                      {status === "previewing"
                        ? "圖片已就緒，點擊左下「一鍵 AI 萃取與驗證」"
                        : "上傳採購單以開始"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)] max-w-xs">
                      AI 會自動辨識欄位、標準化日期格式（YYYY-MM-DD）、強制驗證型別，
                      輸出可直接寫入 ERP 的 JSON。
                    </p>
                  </motion.div>
                ) : status === "loading" ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full p-6"
                  >
                    <StatusLoader />
                  </motion.div>
                ) : status === "success" && success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col h-full"
                  >
                    <div className="flex-1 min-h-0 p-3">
                      <JsonViewer data={success.data} />
                    </div>
                    <div className="border-t px-4 py-3 bg-[var(--color-bg)]">
                      <MetaBar meta={success.meta} />
                    </div>
                  </motion.div>
                ) : status === "error" && error ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full p-5"
                  >
                    <ErrorPanel error={error} onRetry={extract} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
