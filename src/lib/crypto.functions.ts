import { createServerFn } from "@tanstack/react-start";

/** Live AUD prices for the coins the store accepts. */
export const getCryptoRates = createServerFn({ method: "GET" })
  .inputValidator((input: { ids: string[] }) => ({
    ids: Array.from(new Set((input?.ids ?? []).filter(Boolean).map((i) => String(i).toLowerCase()))).slice(0, 12),
  }))
  .handler(async ({ data }) => {
    if (data.ids.length === 0) return {} as Record<string, number>;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      data.ids.join(","),
    )}&vs_currencies=aud`;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) return {} as Record<string, number>;
      const json = (await res.json()) as Record<string, { aud?: number }>;
      const out: Record<string, number> = {};
      for (const [id, value] of Object.entries(json)) {
        if (typeof value?.aud === "number" && value.aud > 0) out[id] = value.aud;
      }
      return out;
    } catch {
      return {} as Record<string, number>;
    }
  });
