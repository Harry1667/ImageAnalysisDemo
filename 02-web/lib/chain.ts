export type ChainEntry = { provider: string; model: string };

const DEFAULT_CHAIN: ChainEntry[] = [
  { provider: "gemini", model: "gemini-2.5-flash" },
  { provider: "openai", model: "gpt-5" },
  { provider: "gemini", model: "gemini-2.5-pro" },
];

export function parseChain(raw: string | undefined): ChainEntry[] {
  if (!raw || !raw.trim()) return DEFAULT_CHAIN;

  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry): ChainEntry => {
      const slash = entry.indexOf("/");
      if (slash === -1) {
        throw new Error(
          `Invalid PROXY_CHAIN entry "${entry}": expected provider/model`
        );
      }
      const provider = entry.slice(0, slash).trim();
      const model = entry.slice(slash + 1).trim();
      if (!provider || !model) {
        throw new Error(`Invalid PROXY_CHAIN entry "${entry}"`);
      }
      return { provider, model };
    });

  if (entries.length === 0) return DEFAULT_CHAIN;
  return entries;
}
