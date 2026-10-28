import { WebsitePromotionEditor } from "./WebsitePromotionEditor";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminSaveChristmasSettings } from "@/lib/admin.functions";
import {
  CHRISTMAS_KEY,
  parseChristmas,
  validateChristmas,
  type ChristmasSettings,
} from "@/lib/christmas";
import { setCmsDirty } from "@/lib/cmsDirtyGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SantaFlight } from "./SantaFlight";
import { PineSprig, Wreath } from "./ChristmasArt";

type ToggleKey =
  | "enabled"
  | "lights"
  | "greenery"
  | "wreaths"
  | "hats"
  | "santaEnabled"
  | "snowEnabled";
type TimingKey =
  | "firstDelayMin"
  | "firstDelayMax"
  | "intervalMin"
  | "intervalMax"
  | "flightSeconds";
export function ChristmasThemeEditor({
  content,
}: {
  content: Record<string, string> | undefined;
}) {
  const raw = content?.[CHRISTMAS_KEY];
  const [expectedRaw, setExpectedRaw] = useState(raw);
  const [draft, setDraft] = useState<ChristmasSettings>(() =>
    parseChristmas(raw),
  );
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(0);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(parseChristmas(raw));
      setExpectedRaw(raw);
    }
  }, [raw]);
  useEffect(() => () => setCmsDirty(CHRISTMAS_KEY, false), []);
  function update<K extends keyof ChristmasSettings>(
    key: K,
    value: ChristmasSettings[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    dirtyRef.current = true;
    setCmsDirty(CHRISTMAS_KEY, true);
    setError("");
  }
  async function save() {
    setError("");
    let settings: ChristmasSettings;
    try {
      settings = validateChristmas(draft);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Check the timing values.";
      setError(message);
      return;
    }
    setSaving(true);
    try {
      const response = await adminSaveChristmasSettings({
        data: { settings, expectedRaw },
      });
      setExpectedRaw(response.raw);
      setDraft(settings);
      setDirty(false);
      dirtyRef.current = false;
      setCmsDirty(CHRISTMAS_KEY, false);
      qc.setQueryData<Record<string, string>>(["site-content"], (old) => ({
        ...old,
        [CHRISTMAS_KEY]: response.raw,
      }));
      await qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(
        settings.enabled
          ? "Christmas decorations enabled"
          : "Christmas decorations switched off",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save Christmas settings.",
      );
    } finally {
      setSaving(false);
    }
  }
  const toggle = (key: ToggleKey, label: string) => (
    <div key={key} className="flex items-center justify-between gap-4 py-2">
      <Label htmlFor={`christmas-${key}`}>{label}</Label>
      <Switch
        id={`christmas-${key}`}
        checked={draft[key]}
        disabled={saving}
        onCheckedChange={(v) => update(key, v)}
      />
    </div>
  );
  const timing = (key: TimingKey, label: string, min: number, max: number) => (
    <div key={key}>
      <Label htmlFor={`christmas-${key}`}>{label} (seconds)</Label>
      <Input
        className="mt-2"
        id={`christmas-${key}`}
        type="number"
        min={min}
        max={max}
        step={1}
        value={Number.isNaN(draft[key]) ? "" : draft[key]}
        disabled={saving}
        onChange={(e) =>
          update(
            key,
            e.currentTarget.value === ""
              ? Number.NaN
              : e.currentTarget.valueAsNumber,
          )
        }
      />
    </div>
  );
  return (
    <section
      className="rounded-xl border border-border bg-card p-6"
      aria-labelledby="christmas-editor-title"
    >
      <p className="technical-label text-accent">Seasonal appearance</p>
      <h3
        id="christmas-editor-title"
        className="mt-2 text-xl font-extrabold uppercase"
      >
        Titan Gold Christmas
      </h3>
      <p className="my-3 max-w-2xl text-sm text-muted-foreground">
        An optional decoration layer for both Light and Dark modes. Your page
        content, original photos and prices stay unchanged. This saved switch
        controls the storefront for everyone.
      </p>
      <fieldset disabled={saving || !content}>
        {toggle("enabled", "Christmas decorations")}
        {draft.enabled ? (
          <div className="mt-4 space-y-5 border-t border-border pt-4">
            <div>
              <Label htmlFor="christmas-density">Decoration level</Label>
              <select
                id="christmas-density"
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                value={draft.density}
                onChange={(e) =>
                  update(
                    "density",
                    e.target.value as ChristmasSettings["density"],
                  )
                }
              >
                <option value="subtle">Subtle</option>
                <option value="full">
                  Full — includes product corner greenery
                </option>
              </select>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {toggle("lights", "Warm fairy lights")}
              {toggle("greenery", "Evergreen branches and baubles")}
              {toggle("wreaths", "Catalogue wreath")}
              {toggle("hats", "Santa hat on the homepage helmet")}
            </div>
            <p className="text-xs text-muted-foreground">
              The helmet hat follows the built-in welcome artwork. A custom
              welcome photo keeps its image clear.
            </p>
            <div className="border-t border-border pt-4">
              {toggle("santaEnabled", "Santa sleigh animation")}
              {draft.santaEnabled ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {timing(
                      "firstDelayMin",
                      "First flight: minimum delay",
                      1,
                      3600,
                    )}
                    {timing(
                      "firstDelayMax",
                      "First flight: maximum delay",
                      1,
                      3600,
                    )}
                    {timing(
                      "intervalMin",
                      "Between flights: minimum wait",
                      10,
                      7200,
                    )}
                    {timing(
                      "intervalMax",
                      "Between flights: maximum wait",
                      10,
                      7200,
                    )}
                    {timing("flightSeconds", "Flight duration", 4, 20)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Delays are random within these ranges. The next interval
                    starts when the previous flight and snow trail finish.
                    Hidden tabs pause the effect.
                  </p>
                  {toggle("snowEnabled", "Snow trail behind the sleigh")}
                  {draft.snowEnabled ? (
                    <div>
                      <Label htmlFor="christmas-snow-amount">Snow amount</Label>
                      <select
                        id="christmas-snow-amount"
                        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                        value={draft.snowAmount}
                        onChange={(e) =>
                          update(
                            "snowAmount",
                            e.target.value as ChristmasSettings["snowAmount"],
                          )
                        }
                      >
                        <option value="light">Light sprinkle</option>
                        <option value="medium">Medium</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      try {
                        validateChristmas(draft);
                        setError("");
                        setPreview((v) => v + 1);
                      } catch {
                        setError(
                          "Check the delay ranges and flight duration before previewing.",
                        );
                      }
                    }}
                  >
                    Preview flight without saving
                  </Button>
                  {preview > 0 ? (
                    <div
                      className="relative h-44 overflow-hidden rounded-lg border border-border bg-background"
                      aria-label="Santa sleigh preview"
                    >
                      <div className="pointer-events-none absolute inset-x-4 top-4 font-display text-sm uppercase tracking-widest text-muted-foreground">
                        Titan Gold · preview
                      </div>
                      {draft.greenery ? (
                        <PineSprig className="absolute bottom-0 right-0 w-24 rotate-180" />
                      ) : null}
                      {draft.wreaths ? (
                        <Wreath className="absolute bottom-2 left-2 w-16" />
                      ) : null}
                      <SantaFlight
                        settings={{ ...draft, enabled: true }}
                        preview
                        replay={preview}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </fieldset>
      <p className="mt-4 text-xs text-muted-foreground">
        Motion respects visitors’ reduced-motion settings. Decorations are
        hidden in checkout, account, authentication and Admin flows.
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-3 whitespace-pre-line text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!dirty || saving || !content}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save Christmas settings"}
        </Button>
        {dirty ? (
          <span className="text-xs text-muted-foreground">
            Unsaved changes — storefront unchanged until saved.
          </span>
        ) : null}
      </div>
      <WebsitePromotionEditor content={content} />
    </section>
  );
}
