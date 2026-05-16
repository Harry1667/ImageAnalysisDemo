import { z } from "zod";

export const POItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const POSchema = z.object({
  company_name: z.string().min(1),
  po_number: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  currency: z.string().length(3),
  items: z.array(POItemSchema).min(1),
  total_amount: z.number().nonnegative(),
});

export type PO = z.infer<typeof POSchema>;
export type POItem = z.infer<typeof POItemSchema>;

export type AttemptOutcome =
  | "success"
  | "proxy_error"
  | "parse_error"
  | "schema_validation";

export type Attempt = {
  provider: string;
  model: string;
  outcome: AttemptOutcome;
  error_code?: string;
  error?: string;
  latency_ms: number;
  retries: number;
};

export type ExtractMeta = {
  actual_provider: string;
  actual_model: string;
  actual_source?: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  retries: number;
  total_ms: number;
  attempts: Attempt[];
};

export type ExtractSuccess = {
  ok: true;
  data: PO;
  meta: ExtractMeta;
};

export type ExtractError = {
  ok: false;
  error: string;
  error_code:
    | "bad_request"
    | "auth_invalid"
    | "quota_exhausted"
    | "provider_down"
    | "content_policy"
    | "schema_validation"
    | "parse_error"
    | "network_error"
    | "unknown";
  raw_content?: string;
  validation_issues?: { path: string; message: string }[];
  meta?: Partial<ExtractMeta> & { attempts?: Attempt[] };
};

export type ExtractResponse = ExtractSuccess | ExtractError;
