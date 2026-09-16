import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/products";
import {
  adminCreateDiscountCode,
  adminDeleteDiscountCode,
  adminListDiscountCodes,
  adminToggleDiscountCode,
} from "@/lib/admin.functions";

export function AdminDiscounts() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [singleUse, setSingleUse] = useState(true);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-discounts"],
    queryFn: () => adminListDiscountCodes({}),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-discounts"] });

  const create = useMutation({
    mutationFn: () =>
      adminCreateDiscountCode({
        data: {
          code,
          discount_type: type,
          value: Number(value),
          singleUse,
          note: note || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Code ${res.code} created`);
      setCode("");
      setNote("");
      void refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create the code"),
  });

  const toggle = useMutation({
    mutationFn: (input: { id: string; active: boolean }) =>
      adminToggleDiscountCode({ data: input }),
    onSuccess: () => refresh(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteDiscountCode({ data: { id } }),
    onSuccess: () => {
      toast.success("Code deleted");
      void refresh();
    },
  });

  const codes = data ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/80 p-6">
        <h3 className="text-lg font-extrabold uppercase text-foreground">Create a discount code</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Code</Label>
            <Input
              value={code}
              placeholder="TITAN10"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Label>Discount type</Label>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant={type === "percent" ? "default" : "outline"}
                className="font-bold uppercase"
                onClick={() => setType("percent")}
              >
                Percentage
              </Button>
              <Button
                type="button"
                variant={type === "fixed" ? "default" : "outline"}
                className="font-bold uppercase"
                onClick={() => setType("fixed")}
              >
                Dollar amount
              </Button>
            </div>
          </div>
          <div>
            <Label>{type === "percent" ? "Percentage off (%)" : "Dollars off (AUD)"}</Label>
            <Input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={singleUse}
            onChange={(e) => setSingleUse(e.target.checked)}
          />
          One-off use only
        </label>

        <Button
          className="mt-4 font-bold uppercase"
          disabled={create.isPending || !code.trim() || !(Number(value) > 0)}
          onClick={() => create.mutate()}
        >
          Create code
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          All codes ({codes.length})
        </h3>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading codes…</p>
        ) : codes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No codes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {codes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 p-4"
              >
                <div className="text-sm text-muted-foreground">
                  <p className="text-base font-extrabold uppercase tracking-wide text-foreground">
                    {c.code}
                  </p>
                  <p>
                    {c.discount_type === "percent"
                      ? `${Number(c.value)}% off`
                      : `${formatPrice(Number(c.value))} off`}{" "}
                    · {c.max_uses === 1 ? "one-off use" : "multi-use"} · used {c.times_used}{" "}
                    time(s)
                  </p>
                  {c.milestone ? (
                    <p className="text-xs">Milestone reward at {c.milestone} orders</p>
                  ) : null}
                  {c.note ? <p className="text-xs">{c.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="font-bold uppercase"
                    onClick={() => toggle.mutate({ id: c.id, active: !c.active })}
                  >
                    {c.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="font-bold uppercase"
                    onClick={() => remove.mutate(c.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
