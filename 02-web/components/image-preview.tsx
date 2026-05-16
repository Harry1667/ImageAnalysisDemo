"use client";

import { X, FileText } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

type Props = {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
  dim?: boolean;
};

export function ImagePreview({ file, previewUrl, onRemove, dim }: Props) {
  const isPdf = file.type === "application/pdf";

  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-full rounded-2xl border bg-[var(--color-surface)] overflow-hidden",
        dim && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {formatBytes(file.size)} · {file.type}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)] transition"
          aria-label="移除檔案"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 bg-[var(--color-bg)] overflow-auto">
        {isPdf ? (
          <div className="flex flex-col items-center gap-3 text-[var(--color-muted)]">
            <FileText className="size-16" />
            <p className="text-sm">PDF 已就緒，點擊右側按鈕開始解析</p>
          </div>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="採購單預覽"
            className="max-h-full max-w-full rounded-lg shadow-sm object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
