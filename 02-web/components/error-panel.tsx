"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check, X, ChevronRight } from "lucide-react";
import type { ExtractError, Attempt } from "@/lib/schema";
import { formatDuration } from "@/lib/utils";

const CODE_LABEL: Record<ExtractError["error_code"], { label: string; hint: string; severity: "danger" | "warning" }> = {
  bad_request: { label: "請求格式錯誤", hint: "前端 payload 有問題，請通知開發者。", severity: "danger" },
  auth_invalid: { label: "服務認證失效", hint: "Bearer token 過期或被撤銷，請聯絡管理員。", severity: "danger" },
  quota_exhausted: { label: "AI 服務額度用盡", hint: "今日 quota 用完，請稍後再試或聯絡管理員加額度。", severity: "warning" },
  provider_down: { label: "AI 服務暫時不可用", hint: "所有 fallback provider 都失敗，請稍後重試。", severity: "danger" },
  content_policy: { label: "內容被安全過濾阻擋", hint: "圖片內容觸發了模型的安全過濾，請換一張圖。", severity: "warning" },
  schema_validation: { label: "資料格式驗證失敗", hint: "AI 回傳的內容無法通過 Schema 驗證（已重試一次）。", severity: "danger" },
  parse_error: { label: "AI 回應無法解析", hint: "回應不是有效的 JSON。", severity: "danger" },
  network_error: { label: "連線失敗", hint: "無法連到 AI 服務，請檢查網路或重試。", severity: "danger" },
  unknown: { label: "未知錯誤", hint: "請查看詳細訊息。", severity: "danger" },
};

type Props = {
  error: ExtractError;
  onRetry?: () => void;
};

export function ErrorPanel({ error, onRetry }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = CODE_LABEL[error.error_code];

  const handleCopy = async () => {
    if (!error.raw_content) return;
    await navigator.clipboard.writeText(error.raw_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWarning = meta.severity === "warning";

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      <div
        className={
          "flex items-start gap-3 rounded-xl border p-4 " +
          (isWarning
            ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10"
            : "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10")
        }
      >
        <AlertTriangle
          className={
            "size-5 shrink-0 mt-0.5 " +
            (isWarning ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]")
          }
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{meta.label}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{meta.hint}</p>
          <p className="mt-2 font-mono text-xs text-[var(--color-fg)] break-words">
            {error.error}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">
            error_code: {error.error_code}
          </p>
        </div>
      </div>

      {error.meta?.attempts && error.meta.attempts.length > 0 && (
        <div className="rounded-xl border bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted)] mb-2">
            Fallback chain（{error.meta.attempts.length} 個 provider 全部失敗）
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {error.meta.attempts.map((a: Attempt, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--color-danger)]/10 px-1.5 py-0.5 font-mono text-[var(--color-danger)]"
                  title={a.error}
                >
                  <X className="size-3" />
                  <span>{a.provider}</span>
                  <span className="opacity-60">·</span>
                  <span>{a.error_code ?? a.outcome}</span>
                  <span className="opacity-60">·</span>
                  <span>{formatDuration(a.latency_ms)}</span>
                </span>
                {idx < error.meta!.attempts!.length - 1 && (
                  <ChevronRight className="size-3 text-[var(--color-muted)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error.validation_issues && error.validation_issues.length > 0 && (
        <div className="rounded-xl border bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted)] mb-2">
            Schema 驗證錯誤（{error.validation_issues.length}）
          </p>
          <ul className="space-y-1 text-xs font-mono">
            {error.validation_issues.map((issue, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-[var(--color-brand-600)]">{issue.path || "$"}</span>
                <span className="text-[var(--color-fg)]">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error.raw_content && (
        <div className="rounded-xl border bg-[var(--color-surface)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-bg)] transition"
          >
            <span className="text-xs font-medium text-[var(--color-muted)]">
              AI 原始輸出
            </span>
            {showRaw ? (
              <ChevronUp className="size-4 text-[var(--color-muted)]" />
            ) : (
              <ChevronDown className="size-4 text-[var(--color-muted)]" />
            )}
          </button>
          {showRaw && (
            <div className="border-t relative">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-[var(--color-code-bg)] px-2 py-1 text-[10px] text-[var(--color-code-fg)] hover:opacity-80"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "已複製" : "複製"}
              </button>
              <pre className="font-mono text-[12px] text-[var(--color-code-fg)] bg-[var(--color-code-bg)] p-4 overflow-auto max-h-64 whitespace-pre-wrap">
                {error.raw_content}
              </pre>
            </div>
          )}
        </div>
      )}

      {onRetry && error.error_code !== "bad_request" && error.error_code !== "content_policy" && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-[var(--color-bg)] transition"
        >
          重試
        </button>
      )}
    </div>
  );
}
