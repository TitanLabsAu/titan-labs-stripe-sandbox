import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  suggestAddresses,
  resolveAddress,
  type AddressSuggestion,
} from "@/lib/places.functions";

export type AddressValue = {
  address_line: string;
  city: string;
  state: string;
  postcode: string;
};

export function AddressFields({
  value,
  onChange,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
}) {
  const suggest = useServerFn(suggestAddresses);
  const resolve = useServerFn(resolveAddress);
  const suggestRef = useRef(suggest);
  suggestRef.current = suggest;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const sessionToken = useMemo(
    () => (typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-token`),
    [],
  );
  const tokenRef = useRef(sessionToken);

  useEffect(() => {
    const q = query.trim();
    console.log("[addr] effect", q);
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        setBusy(true);
        console.log("[addr] fetching");
        const results = await suggestRef.current({ data: { query: q, sessionToken: tokenRef.current } });
        if (id === requestId.current) {
          setSuggestions(results);
          setOpen(true);
        }
      } catch (err) {
        console.log("[addr] error", String(err));
        if (id === requestId.current) setSuggestions([]);
      } finally {
        if (id === requestId.current) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function pick(s: AddressSuggestion) {
    setOpen(false);
    setQuery(s.label);
    try {
      setBusy(true);
      const detail = await resolve({ data: { placeId: s.placeId, sessionToken: tokenRef.current } });
      tokenRef.current = typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-token`;
      onChange({
        address_line: detail.address_line,
        city: detail.city,
        state: detail.state,
        postcode: detail.postcode,
      });
    } catch {
      // leave the manual fields for the user to complete
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative space-y-2">
        <Label htmlFor="address_search">Find your address</Label>
        <Input
          id="address_search"
          autoComplete="off"
          placeholder="Start typing your address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {busy ? (
          <p className="text-xs text-muted-foreground">Searching…</p>
        ) : null}
        {open && suggestions.length > 0 ? (
          <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent/20"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line">Address</Label>
        <Input
          id="address_line"
          autoComplete="street-address"
          value={value.address_line}
          maxLength={200}
          onChange={(e) => onChange({ ...value, address_line: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            autoComplete="address-level2"
            value={value.city}
            maxLength={100}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            autoComplete="address-level1"
            value={value.state}
            maxLength={40}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postcode">Post code</Label>
          <Input
            id="postcode"
            inputMode="numeric"
            autoComplete="postal-code"
            value={value.postcode}
            maxLength={10}
            onChange={(e) => onChange({ ...value, postcode: e.target.value })}
            required
          />
        </div>
      </div>
    </div>
  );
}

export function combineAddress(v: AddressValue) {
  return [v.address_line, v.city, v.state, v.postcode].filter(Boolean).join(", ");
}
