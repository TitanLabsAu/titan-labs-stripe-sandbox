import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag, Trash2 } from "lucide-react";
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

type DiscountType = "fixed" | "percent" | "full";

function randomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let out = "";
  for (let i = 0; i < 2; i++) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 2; i++) out += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 2; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return `TITAN-${out}`;
}

export function AdminDiscounts() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<DiscountType>("fixed");
  const [value, setValue] = useState("50");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");

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
          value: Number(value) || 0,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          expiresAt: expires ? expires : null,
          ...(note ? { note } : {}),
        },
      }),
    onSuccess: (res) => {
      toast.success(`Code ${res.code} created`);
      setCode("");
      setNote("");
      setMaxUses("");
      setExpires("");
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
        <h3 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
          <Tag className="h-5 w-5 text-accent" /> Discount codes
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Create a code for a customer or vendor: take a set number of dollars off, a percentage
          off, or cover their whole order with a full discount.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Code</Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={code}
                placeholder="VENDOR-AB12CD"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <Button
                type="button"
                variant="outline"
                className="font-bold uppercase"
                onClick={() => setCode(randomCode())}
              >
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Customer / vendor note</Label>
            <Input
              className="mt-2"
              value={note}
              placeholder="Who is this for?"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div>
            <Label>Discount type</Label>
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
            >
              <option value="fixed">Dollar amount off</option>
              <option value="percent">Percentage off</option>
              <option value="full">Full discount (100% off)</option>
            </select>
          </div>

          <div>
            <Label>
              {type === "fixed"
                ? "Dollars off (AUD)"
                : type === "percent"
                  ? "Percentage off (%)"
                  : "Full discount"}
            </Label>
            <Input
              className="mt-2"
              type="number"
              min={1}
              value={type === "full" ? "100" : value}
              disabled={type === "full"}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div>
            <Label>Max uses (optional)</Label>
            <Input
              className="mt-2"
              type="number"
              min={1}
              value={maxUses}
              placeholder="Unlimited"
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <div>
            <Label>Expires (optional)</Label>
            <Input
              className="mt-2"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="mt-5 font-bold uppercase"
          disabled={create.isPending || !code.trim()}
          onClick={() => create.mutate()}
        >
          Create discount code
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
            {codes.map((c) => {
              const uses =
                c.max_uses >= 1000000 ? `${c.times_used} used` : `${c.times_used}/${c.max_uses} used`;
              return (
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
                        : `${formatPrice(Number(c.value))} off`}
                      {c.note ? ` · ${c.note}` : ""} · {uses}
                      {c.expires_at
                        ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-AU")}`
                        : ""}
                      {c.active ? "" : " · disabled"}
                    </p>
                    {c.milestone ? (
                      <p className="text-xs">Milestone reward at {c.milestone} orders</p>
                    ) : null}
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
                      size="icon"
                      aria-label={`Delete ${c.code}`}
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
