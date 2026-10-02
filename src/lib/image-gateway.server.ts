const IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

/** Non-streaming product image generation. Returns base64 PNG or a safe error. */
export async function generateProductImage(apiKey: string, prompt: string) {
  const res = await fetch(IMAGE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1024x1024" }),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const message = body?.error?.message || body?.message || "Image generation failed";
    return { ok: false as const, status: res.status, message: String(message) };
  }
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) return { ok: false as const, status: 502, message: "No image was returned" };
  return { ok: true as const, b64: String(b64) };
}
