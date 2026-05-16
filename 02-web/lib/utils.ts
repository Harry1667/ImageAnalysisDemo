import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function stripCodeFences(s: string): string {
  let v = s.trim();
  if (v.startsWith("```")) {
    const firstNewline = v.indexOf("\n");
    if (firstNewline !== -1) v = v.slice(firstNewline + 1);
    if (v.endsWith("```")) v = v.slice(0, -3);
  }
  return v.trim();
}
