"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileImage } from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function UploadZone({ onFile, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const r = rejected[0];
        const code = r.errors[0]?.code;
        if (code === "file-too-large") {
          toast.error(`圖片過大（${formatBytes(r.file.size)}），上限 10MB`);
        } else if (code === "file-invalid-type") {
          toast.error("僅支援 PNG / JPG / WEBP / PDF");
        } else {
          toast.error(`上傳失敗：${code ?? "unknown"}`);
        }
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: MAX_BYTES,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-full",
        "rounded-2xl border-2 border-dashed transition-all cursor-pointer",
        "bg-[var(--color-surface)] hover:bg-[var(--color-brand-50)]",
        isDragActive
          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] scale-[1.01]"
          : "border-[var(--color-border)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="rounded-full bg-[var(--color-brand-100)] p-4">
          <UploadCloud className="size-8 text-[var(--color-brand-600)]" />
        </div>
        <div>
          <p className="text-base font-medium">
            {isDragActive ? "放開以上傳" : "拖曳採購單到此，或點擊選擇檔案"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            支援 PNG / JPG / WEBP / PDF，最大 10MB
          </p>
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <FileImage className="size-3.5" />
          檔案不會上傳到第三方，僅經由您的伺服器轉送到 AI 服務
        </div>
      </div>
    </div>
  );
}
