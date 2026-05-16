"use client";

import {
  Sparkles,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Cpu,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import type { ExtractMeta, Attempt } from "@/lib/schema";
import { formatDuration, formatNumber } from "@/lib/utils";

type Props = {
  meta: ExtractMeta;
};

export function MetaBar({ meta }: Props) {
  const showChain = meta.attempts.length > 1;
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-muted)]">
        <Item icon={<Cpu className="size-3.5" />} label="模型">
          <span className="font-mono text-[var(--color-fg)]">
            {meta.actual_provider} · {meta.actual_model}
          </span>
          {meta.actual_source && (
            <span className="ml-1 rounded bg-[var(--color-brand-100)] px-1.5 py-0.5 text-[10px] text-[var(--color-brand-700)] font-medium uppercase">
              {meta.actual_source}
            </span>
          )}
        </Item>
        <Item icon={<Clock className="size-3.5" />} label="AI 延遲">
          <span className="font-mono text-[var(--color-fg)]">
            {formatDuration(meta.latency_ms)}
          </span>
        </Item>
        <Item icon={<Sparkles className="size-3.5" />} label="總耗時">
          <span className="font-mono text-[var(--color-fg)]">
            {formatDuration(meta.total_ms)}
          </span>
        </Item>
        <Item icon={<ArrowUpFromLine className="size-3.5" />} label="輸入">
          <span className="font-mono text-[var(--color-fg)]">
            {formatNumber(meta.input_tokens)} tok
          </span>
        </Item>
        <Item icon={<ArrowDownToLine className="size-3.5" />} label="輸出">
          <span className="font-mono text-[var(--color-fg)]">
            {formatNumber(meta.output_tokens)} tok
          </span>
        </Item>
        {meta.retries > 0 && (
          <Item icon={<RefreshCw className="size-3.5" />} label="重試">
            <span className="font-mono text-[var(--color-warning)]">
              {meta.retries}
            </span>
          </Item>
        )}
      </div>

      {showChain && <ChainTrace attempts={meta.attempts} />}
    </div>
  );
}

function ChainTrace({ attempts }: { attempts: Attempt[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="text-[var(--color-muted)]">Fallback chain：</span>
      {attempts.map((a, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <AttemptPill attempt={a} />
          {idx < attempts.length - 1 && (
            <ChevronRight className="size-3 text-[var(--color-muted)]" />
          )}
        </div>
      ))}
    </div>
  );
}

function AttemptPill({ attempt }: { attempt: Attempt }) {
  const ok = attempt.outcome === "success";
  const label =
    attempt.outcome === "success"
      ? "OK"
      : attempt.outcome === "proxy_error"
      ? attempt.error_code ?? "error"
      : attempt.outcome === "parse_error"
      ? "非 JSON"
      : "schema 失敗";

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono " +
        (ok
          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
          : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]")
      }
      title={attempt.error}
    >
      {ok ? <Check className="size-3" /> : <X className="size-3" />}
      <span>{attempt.provider}</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
      <span className="opacity-60">·</span>
      <span>{formatDuration(attempt.latency_ms)}</span>
    </span>
  );
}

function Item({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span>{label}：</span>
      {children}
    </div>
  );
}
