import "server-only";

export type ChatImage = { mime_type: string; data: string };

export type ChatRequest = {
  prompt: string;
  images?: ChatImage[];
  project?: string;
  group?: string;
  provider?: string;
  model?: string;
};

export type ChatResponse = {
  ok: boolean;
  content?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  actual_provider?: string;
  actual_model?: string;
  actual_source?: string;
  error?: string;
  error_code?: string;
  retryable?: boolean;
  details?: string;
};

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function callProxyChat(req: ChatRequest): Promise<ChatResponse> {
  const baseUrl = env("PROXY_BASE_URL");
  const token = env("PROXY_TOKEN");
  const project = req.project ?? env("PROXY_PROJECT", "po-parser-demo");

  const body: Record<string, unknown> = {
    prompt: req.prompt,
    project,
    group: req.group ?? "extract",
    ...(req.provider ? { provider: req.provider } : {}),
    ...(req.model ? { model: req.model } : {}),
    ...(req.images && req.images.length > 0 ? { images: req.images } : {}),
  };

  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network failure",
      error_code: "network_error",
    };
  }

  const errorCodeHeader = res.headers.get("x-pcli-error-code") ?? undefined;

  let json: ChatResponse;
  try {
    json = (await res.json()) as ChatResponse;
  } catch {
    return {
      ok: false,
      error: `proxy returned non-JSON (HTTP ${res.status})`,
      error_code: errorCodeHeader ?? "unknown",
    };
  }

  if (!res.ok && !json.error_code && errorCodeHeader) {
    json.error_code = errorCodeHeader;
  }
  return json;
}
