"use client";

import { useMemo } from "react";

type Token =
  | { type: "key"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: string }
  | { type: "bool"; value: string }
  | { type: "null"; value: string }
  | { type: "punct"; value: string }
  | { type: "whitespace"; value: string };

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = json.length;

  while (i < n) {
    const ch = json[i];

    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
      let j = i;
      while (j < n && /\s/.test(json[j])) j++;
      tokens.push({ type: "whitespace", value: json.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (json[j] === "\\") {
          j += 2;
          continue;
        }
        if (json[j] === '"') break;
        j++;
      }
      const value = json.slice(i, j + 1);
      let k = j + 1;
      while (k < n && /\s/.test(json[k])) k++;
      if (json[k] === ":") {
        tokens.push({ type: "key", value });
      } else {
        tokens.push({ type: "string", value });
      }
      i = j + 1;
      continue;
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let j = i;
      if (json[j] === "-") j++;
      while (j < n && /[0-9.eE+-]/.test(json[j])) j++;
      tokens.push({ type: "number", value: json.slice(i, j) });
      i = j;
      continue;
    }

    if (json.startsWith("true", i)) {
      tokens.push({ type: "bool", value: "true" });
      i += 4;
      continue;
    }
    if (json.startsWith("false", i)) {
      tokens.push({ type: "bool", value: "false" });
      i += 5;
      continue;
    }
    if (json.startsWith("null", i)) {
      tokens.push({ type: "null", value: "null" });
      i += 4;
      continue;
    }

    tokens.push({ type: "punct", value: ch });
    i++;
  }

  return tokens;
}

const colorMap: Record<Token["type"], string> = {
  key: "text-[var(--color-code-key)]",
  string: "text-[var(--color-code-str)]",
  number: "text-[var(--color-code-num)]",
  bool: "text-[var(--color-code-bool)]",
  null: "text-[var(--color-code-null)]",
  punct: "text-[var(--color-code-punct)]",
  whitespace: "",
};

type Props = {
  data: unknown;
};

export function JsonViewer({ data }: Props) {
  const tokens = useMemo(() => {
    const str = JSON.stringify(data, null, 2);
    return tokenize(str);
  }, [data]);

  return (
    <pre className="font-mono text-[13px] leading-relaxed text-[var(--color-code-fg)] whitespace-pre overflow-auto p-5 rounded-xl bg-[var(--color-code-bg)] h-full">
      {tokens.map((tok, idx) => (
        <span key={idx} className={colorMap[tok.type]}>
          {tok.value}
        </span>
      ))}
    </pre>
  );
}
