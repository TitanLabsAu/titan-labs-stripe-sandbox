import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/** Generate a product photo with AI, preview it, and only keep it when the admin chooses "Use image". */
export function ProductImageGenerator({
  productName,
  disabled,
  onUse,
}: {
  productName: string;
  disabled?: boolean;
  onUse: (blob: Blob) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch("/api/admin-generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: [productName, prompt].filter(Boolean).join(" — ") }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.b64) throw new Error(body?.error || "Could not generate the photo");
      setPreview(`data:image/png;base64,${body.b64}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the photo");
    } finally {
      setLoading(false);
    }
  }

  async function use() {
    if (!preview) return;
    setSaving(true);
    try {
      const blob = await (await fetch(preview)).blob();
      await onUse(blob);
      setPreview(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Label className="text-xs text-muted-foreground">Or generate a photo with AI</Label>
      <Textarea
        rows={2}
        value={prompt}
        maxLength={900}
        placeholder="Describe the photo, e.g. clear glass vial with blue cap and white label"
        onChange={(e) => setPrompt(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        className="font-bold uppercase"
        disabled={disabled || loading || saving || prompt.trim().length < 5}
        onClick={() => void generate()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Generating…" : "Generate with AI"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {preview ? (
        <div className="space-y-2">
          <img src={preview} alt="AI generated preview" className="h-40 w-40 rounded-lg border border-border object-cover" />
          <div className="flex gap-2">
            <Button type="button" className="font-bold uppercase" disabled={saving} onClick={() => void use()}>
              {saving ? "Saving…" : "Use image"}
            </Button>
            <Button type="button" variant="outline" className="font-bold uppercase" disabled={saving} onClick={() => setPreview(null)}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
