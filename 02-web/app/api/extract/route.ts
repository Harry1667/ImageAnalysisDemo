import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callProxyChat } from "@/lib/proxy-client";
import { EXTRACT_PROMPT, REPROMPT_PREFIX } from "@/lib/prompt";
import { POSchema } from "@/lib/schema";
import type {
  ExtractResponse,
  ExtractError,
  ExtractMeta,
  Attempt,
} from "@/lib/schema";
import { stripCodeFences } from "@/lib/utils";
import { parseChain } from "@/lib/chain";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

function mapProxyError(code?: string): ExtractError["error_code"] {
  switch (code) {
    case "bad_request":
    case "auth_invalid":
    case "quota_exhausted":
    case "provider_down":
    case "content_policy":
    case "network_error":
      return code;
    default:
      return "unknown";
  }
}

function zodIssuesToList(err: z.ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join(".") || "$",
    message: i.message,
  }));
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ExtractResponse>> {
  const startedAt = Date.now();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid multipart body", error_code: "bad_request" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "missing file field", error_code: "bad_request" },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        error: `unsupported mime type: ${file.type}`,
        error_code: "bad_request",
      },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `file too large: ${file.size} bytes (max ${MAX_BYTES})`,
        error_code: "bad_request",
      },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");
  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;

  let chain;
  try {
    chain = parseChain(process.env.PROXY_CHAIN);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "bad chain config",
        error_code: "bad_request",
      },
      { status: 500 }
    );
  }

  const attempts: Attempt[] = [];
  let lastRaw = "";
  let lastIssues: { path: string; message: string }[] = [];
  let lastErrorCode: ExtractError["error_code"] = "unknown";
  let lastError = "all providers in chain failed";
  let lastChat: Awaited<ReturnType<typeof callProxyChat>> | null = null;

  for (const entry of chain) {
    let prompt = EXTRACT_PROMPT;
    let retries = 0;
    let skipToNextProvider = false;

    for (let attempt = 0; attempt < 2 && !skipToNextProvider; attempt++) {
      const chat = await callProxyChat({
        prompt,
        images: [{ mime_type: mime, data: b64 }],
        provider: entry.provider,
        model: entry.model,
      });
      lastChat = chat;

      if (!chat.ok) {
        const code = mapProxyError(chat.error_code);
        attempts.push({
          provider: entry.provider,
          model: entry.model,
          outcome: "proxy_error",
          error_code: chat.error_code ?? "unknown",
          error: chat.error,
          latency_ms: chat.latency_ms ?? 0,
          retries,
        });
        lastErrorCode = code;
        lastError = chat.error ?? "proxy call failed";
        skipToNextProvider = true;
        break;
      }

      const raw = stripCodeFences(chat.content ?? "");
      lastRaw = raw;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const issues = [{ path: "$", message: "response is not valid JSON" }];
        lastIssues = issues;
        if (attempt === 0) {
          prompt =
            REPROMPT_PREFIX(issues.map((i) => `${i.path}: ${i.message}`)) +
            EXTRACT_PROMPT;
          retries++;
          continue;
        }
        attempts.push({
          provider: entry.provider,
          model: entry.model,
          outcome: "parse_error",
          error: "non-JSON output",
          latency_ms: chat.latency_ms ?? 0,
          retries,
        });
        lastErrorCode = "parse_error";
        lastError = "AI response is not valid JSON";
        skipToNextProvider = true;
        break;
      }

      const result = POSchema.safeParse(parsed);
      if (result.success) {
        attempts.push({
          provider: entry.provider,
          model: entry.model,
          outcome: "success",
          latency_ms: chat.latency_ms ?? 0,
          retries,
        });
        const meta: ExtractMeta = {
          actual_provider: chat.actual_provider ?? entry.provider,
          actual_model: chat.actual_model ?? entry.model,
          actual_source: chat.actual_source,
          latency_ms: chat.latency_ms ?? 0,
          input_tokens: chat.input_tokens ?? 0,
          output_tokens: chat.output_tokens ?? 0,
          retries,
          total_ms: Date.now() - startedAt,
          attempts,
        };
        return NextResponse.json({ ok: true, data: result.data, meta });
      }

      lastIssues = zodIssuesToList(result.error);
      if (attempt === 0) {
        prompt =
          REPROMPT_PREFIX(lastIssues.map((i) => `${i.path}: ${i.message}`)) +
          EXTRACT_PROMPT;
        retries++;
        continue;
      }
      attempts.push({
        provider: entry.provider,
        model: entry.model,
        outcome: "schema_validation",
        error: `${lastIssues.length} issue(s)`,
        latency_ms: chat.latency_ms ?? 0,
        retries,
      });
      lastErrorCode = "schema_validation";
      lastError = "schema validation failed after re-prompt";
      skipToNextProvider = true;
      break;
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: lastError,
      error_code: lastErrorCode,
      raw_content: lastRaw || undefined,
      validation_issues: lastIssues.length > 0 ? lastIssues : undefined,
      meta: {
        actual_provider: lastChat?.actual_provider,
        actual_model: lastChat?.actual_model,
        actual_source: lastChat?.actual_source,
        latency_ms: lastChat?.latency_ms ?? 0,
        input_tokens: lastChat?.input_tokens ?? 0,
        output_tokens: lastChat?.output_tokens ?? 0,
        retries: 0,
        total_ms: Date.now() - startedAt,
        attempts,
      },
    },
    { status: 502 }
  );
}
