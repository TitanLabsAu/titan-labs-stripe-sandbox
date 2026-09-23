import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Bold, GripVertical, Italic, Trash2, Underline } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminLinks } from "@/components/AdminLinks";
import { ProductEditor, draftToPayload, toDraft, type Draft } from "@/components/AdminProducts";
import { supabase } from "@/integrations/supabase/client";
import { adminListProducts, adminSaveContent, adminSaveProduct } from "@/lib/admin.functions";
import { getSiteContent } from "@/lib/catalog.functions";
import {
  contentKeysForImages,
  FOOTER_FIELDS,
  FOOTER_TABS,
  HEADER_ALIGN_KEY,
  HEADER_DISPLAY_OPTIONS,
  HEADER_FIELDS,
  HEADER_TABS,
  HEADER_LAYOUT_KEY,
  HOME_FIELDS,
  HOME_IMAGE_SLOTS,
  HOME_SECTIONS,
  PAYMENT_FIELDS,
  RANGE_FIELDS,
  RANGE_IMAGE_SLOTS,
  RANGE_SECTIONS,
  featuredSlugs,
  type HomeField,
  type PageImageSlot,
  type PageSection,
  type TextAlign,
} from "@/lib/homeContent";

import { formatPrice } from "@/lib/products";
import { cn } from "@/lib/utils";

const ALIGN_OPTIONS: { value: TextAlign; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align centre", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
];

const TEXTAREA_ALIGN_CLASS: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const HOME_IDENTITY_KEYS = new Set(["home_tagline", "home_headline"]);
const HOME_IDENTITY_FIELDS = HOME_FIELDS.filter((field) => HOME_IDENTITY_KEYS.has(field.key));
const HOME_WORDING_FIELDS = HOME_FIELDS.filter((field) => !HOME_IDENTITY_KEYS.has(field.key));

function imageStoragePath(file: File, slotKey: string) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `page-content/${slotKey}/${crypto.randomUUID()}.${ext}`;
}

function AlignmentButtons({ value, onChange }: { value: TextAlign; onChange: (value: TextAlign) => void }) {
  return (
    <div className="flex rounded-md border border-border bg-background/40 p-1">
      {ALIGN_OPTIONS.map(({ value: option, label, Icon }) => (
        <Button
          key={option}
          type="button"
          variant={value === option ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          aria-label={label}
          onClick={() => onChange(option)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}

function TextFormatButton({
  label,
  marker,
  textarea,
  value,
  onChange,
  children,
}: {
  label: string;
  marker: "**" | "*" | "__";
  textarea: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8"
      aria-label={label}
      onClick={() => {
        const el = textarea.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.slice(start, end) || "text";
        const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
        onChange(next);
        window.requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
        });
      }}
    >
      {children}
    </Button>
  );
}

function ContentFieldEditor({
  field,
  value,
  align,
  setValue,
  setAlign,
}: {
  field: HomeField;
  value: string;
  align: TextAlign;
  setValue: (value: string) => void;
  setAlign: (value: TextAlign) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const rows = field.key === "range_disclaimer" ? 5 : field.multiline ? 4 : 2;

  return (
    <div className={field.multiline ? "sm:col-span-2" : ""}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{field.label}</Label>
        <AlignmentButtons value={align} onChange={setAlign} />
      </div>
      {field.multiline ? (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <TextFormatButton label="Bold" marker="**" textarea={textarea} value={value} onChange={setValue}>
              <Bold className="h-4 w-4" />
            </TextFormatButton>
            <TextFormatButton label="Italic" marker="*" textarea={textarea} value={value} onChange={setValue}>
              <Italic className="h-4 w-4" />
            </TextFormatButton>
            <TextFormatButton label="Underline" marker="__" textarea={textarea} value={value} onChange={setValue}>
              <Underline className="h-4 w-4" />
            </TextFormatButton>
          </div>
          <Textarea
            ref={textarea}
            rows={rows}
            className={cn("mt-2 whitespace-pre-wrap", TEXTAREA_ALIGN_CLASS[align])}
            value={value}
            placeholder={field.fallback}
            onChange={(e) => setValue(e.target.value)}
          />
        </>
      ) : (
        <Input
          className={cn("mt-2", TEXTAREA_ALIGN_CLASS[align])}
          value={value}
          placeholder={field.fallback}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
    </div>
  );
}

function PictureSlotEditor({
  slot,
  values,
  setValue,
}: {
  slot: PageImageSlot;
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const urlKey = `${slot.key}_url`;
  const altKey = `${slot.key}_alt`;
  const captionKey = `${slot.key}_caption`;
  const alignKey = `${slot.key}_align`;
  const align = (values[alignKey] as TextAlign) || "center";
  const url = values[urlKey] ?? "";

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const path = imageStoragePath(file, slot.key);
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      setValue(urlKey, `/api/public/product-image?path=${encodeURIComponent(path)}`);
      if (!(values[altKey] ?? "").trim()) setValue(altKey, slot.label);
      toast.success("Picture added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the picture");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{slot.label}</Label>
        <AlignmentButtons value={align} onChange={(value) => setValue(alignKey, value)} />
      </div>
      {url ? (
        <img
          src={url}
          alt={values[altKey] || slot.label}
          className="aspect-video w-full rounded-lg border border-border object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-card/60 text-sm text-muted-foreground">
          Empty picture box
        </div>
      )}
      <Input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
        }}
      />
      <Input
        value={values[altKey] ?? ""}
        placeholder="Image description"
        onChange={(e) => setValue(altKey, e.target.value)}
      />
      <Textarea
        rows={2}
        className={cn("whitespace-pre-wrap", TEXTAREA_ALIGN_CLASS[align])}
        value={values[captionKey] ?? ""}
        placeholder="Optional caption"
        onChange={(e) => setValue(captionKey, e.target.value)}
      />
      {url ? (
        <Button
          type="button"
          variant="destructive"
          className="font-bold uppercase"
          onClick={() => {
            setValue(urlKey, "");
            setValue(captionKey, "");
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove picture
        </Button>
      ) : null}
    </div>
  );
}

function SectionOrderEditor({
  sections,
  order,
  onChange,
}: {
  sections: PageSection[];
  order: string[];
  onChange: (order: string[]) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const labels = new Map(sections.map((section) => [section.key, section.label]));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const current = next[index];
    const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement;
    next[target] = current;
    onChange(next);
  };

  return (
    <div className="mt-5 rounded-lg border border-border bg-background/40 p-4">
      <h4 className="text-sm font-extrabold uppercase tracking-[0.15em] text-accent">Page layout</h4>
      <p className="mt-1 text-sm text-muted-foreground">Drag sections into position, or use the arrow buttons.</p>
      <div className="mt-3 space-y-2">
        {order.map((key, index) => (
          <div
            key={key}
            draggable
            onDragStart={() => setDragged(key)}
            onDragEnd={() => setDragged(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!dragged || dragged === key) return;
              const next = order.filter((item) => item !== dragged);
              next.splice(next.indexOf(key), 0, dragged);
              onChange(next);
              setDragged(null);
            }}
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-card px-3 py-2",
              dragged === key && "opacity-50",
            )}
          >
            <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-muted-foreground" />
            <span className="min-w-0 truncate text-sm font-bold text-foreground">{labels.get(key) ?? key}</span>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} aria-label={`Move ${labels.get(key)} up`} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === order.length - 1} aria-label={`Move ${labels.get(key)} down`} onClick={() => move(index, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type CryptoRow = {
  label: string;
  network: string;
  wallet: string;
  audPerUnit: string;
  coinId: string;
  note: string;
};

function parseRows(raw: string): CryptoRow[] {
  const source = raw.trim() || DEFAULT_CRYPTO_LINES;
  return source
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const p = line.split("|").map((v) => v.trim());
      return {
        label: p[0] ?? "",
        network: p[1] ?? "",
        wallet: p[2] ?? "",
        audPerUnit: p[3] ?? "",
        coinId: p[4] ?? "",
        note: p[5] ?? "",
      };
    });
}

/** Add, edit and remove the coins customers can pay with. */
function CryptoOptionsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const rows = parseRows(value);
  const update = (index: number, patch: Partial<CryptoRow>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(serialiseCryptoOptions(next));
  };

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Crypto payment options</Label>
        <Button
          type="button"
          variant="outline"
          className="font-bold uppercase"
          onClick={() =>
            onChange(
              serialiseCryptoOptions([
                ...rows,
                { label: "NEW", network: "", wallet: "", audPerUnit: "", coinId: "", note: "" },
              ]),
            )
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add payment option
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Prices update automatically from the live market when the coin is a known one (BTC, ETH,
        USDT, USDC, SOL and more). The backup price is only used if the live price is unavailable.
      </p>

      <div className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-md border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Coin name</Label>
                <Input
                  className="mt-1"
                  value={row.label}
                  placeholder="USDT"
                  onChange={(e) => update(index, { label: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Network</Label>
                <Input
                  className="mt-1"
                  value={row.network}
                  placeholder="Ethereum (ERC-20)"
                  onChange={(e) => update(index, { network: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Wallet address</Label>
                <Input
                  className="mt-1 font-mono"
                  value={row.wallet}
                  placeholder="Paste your wallet address"
                  onChange={(e) => update(index, { wallet: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Live price name (optional)</Label>
                <Input
                  className="mt-1"
                  value={row.coinId}
                  placeholder="bitcoin, ethereum, tether"
                  onChange={(e) => update(index, { coinId: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Backup price — AUD per coin</Label>
                <Input
                  className="mt-1"
                  value={row.audPerUnit}
                  placeholder="1.52"
                  onChange={(e) => update(index, { audPerUnit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Network warning shown to the customer</Label>
                <Textarea
                  rows={2}
                  className="mt-1"
                  value={row.note}
                  placeholder="Send USDT on the Ethereum (ERC-20) network only."
                  onChange={(e) => update(index, { note: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 text-destructive"
              onClick={() => onChange(serialiseCryptoOptions(rows.filter((_, i) => i !== index)))}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Remove {row.label || "this coin"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}



export function AdminEdits() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: () => getSiteContent() });
  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminListProducts({}),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [featured, setFeatured] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [homeOrder, setHomeOrder] = useState(HOME_SECTIONS.map((section) => section.key));
  const [rangeOrder, setRangeOrder] = useState(RANGE_SECTIONS.map((section) => section.key));
  const [headerOrder, setHeaderOrder] = useState(HEADER_TABS.map((section) => section.key));
  const [footerOrder, setFooterOrder] = useState(FOOTER_TABS.map((section) => section.key));

  useEffect(() => {
    if (data && !loaded) {
      const next: Record<string, string> = {};
      for (const f of HOME_FIELDS) {
        next[f.key] = data[f.key] ?? f.fallback;
        next[`${f.key}_align`] = data[`${f.key}_align`] ?? f.align ?? "center";
      }
      for (const f of [...RANGE_FIELDS, ...HEADER_FIELDS, ...FOOTER_FIELDS, ...PAYMENT_FIELDS]) {
        next[f.key] = data[f.key] ?? f.fallback;
        next[`${f.key}_align`] = data[`${f.key}_align`] ?? f.align ?? "center";
      }
      next[HEADER_ALIGN_KEY] = data[HEADER_ALIGN_KEY] ?? "right";
      next[HEADER_LAYOUT_KEY] = data[HEADER_LAYOUT_KEY] ?? "inline";
      for (const option of HEADER_DISPLAY_OPTIONS) {
        next[option.contentKey] = data[option.contentKey] ?? option.fallback;
      }
      for (const key of contentKeysForImages([...HOME_IMAGE_SLOTS, ...RANGE_IMAGE_SLOTS])) {
        next[key] = data[key] ?? (key.endsWith("_align") ? "center" : "");
      }

      setValues(next);
      setFeatured(featuredSlugs(data));
      const savedHomeOrder = (data["home_layout_order"] ?? "").split(",").filter(Boolean);
      setHomeOrder([...savedHomeOrder.filter((key) => HOME_SECTIONS.some((section) => section.key === key)), ...HOME_SECTIONS.map((section) => section.key).filter((key) => !savedHomeOrder.includes(key))]);
      const savedRangeOrder = (data["range_layout_order"] ?? "").split(",").filter(Boolean);
      setRangeOrder([...savedRangeOrder.filter((key) => RANGE_SECTIONS.some((section) => section.key === key)), ...RANGE_SECTIONS.map((section) => section.key).filter((key) => !savedRangeOrder.includes(key))]);
      const savedHeaderOrder = (data["header_layout_order"] ?? "").split(",").filter(Boolean);
      setHeaderOrder([...savedHeaderOrder.filter((key) => HEADER_TABS.some((section) => section.key === key)), ...HEADER_TABS.map((section) => section.key).filter((key) => !savedHeaderOrder.includes(key))]);
      const savedFooterOrder = (data["footer_layout_order"] ?? "").split(",").filter(Boolean);
      setFooterOrder([...savedFooterOrder.filter((key) => FOOTER_TABS.some((section) => section.key === key)), ...FOOTER_TABS.map((section) => section.key).filter((key) => !savedFooterOrder.includes(key))]);
      setLoaded(true);
    }
  }, [data, loaded]);

  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const saveContentGroup = async (fields: HomeField[], imageSlots: PageImageSlot[], layoutKey: string, order: string[]) => {
    const keys = [
      ...fields.flatMap((f) => [f.key, `${f.key}_align`]),
      ...contentKeysForImages(imageSlots), layoutKey,
    ];
    await Promise.all(
      keys.map((key) => adminSaveContent({ data: { key, body: key === layoutKey ? order.join(",") : values[key] ?? "" } })),
    );
  };

  const refreshContent = () => {
    void queryClient.invalidateQueries({ queryKey: ["site-content"] });
  };
  const refreshProducts = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
  };

  const saveHome = useMutation({
    mutationFn: () => saveContentGroup(HOME_FIELDS, HOME_IMAGE_SLOTS, "home_layout_order", homeOrder),
    onSuccess: () => {
      toast.success("Home page updated");
      refreshContent();
    },
    onError: () => toast.error("Could not save your changes"),
  });

  const saveRange = useMutation({
    mutationFn: () => saveContentGroup(RANGE_FIELDS, RANGE_IMAGE_SLOTS, "range_layout_order", rangeOrder),
    onSuccess: () => {
      toast.success("Catalogue page updated");
      refreshContent();
    },
    onError: () => toast.error("Could not save your range page changes"),
  });
  const saveChrome = useMutation({
    mutationFn: async () => {
      const keys = [
        ...[...HEADER_FIELDS, ...FOOTER_FIELDS].flatMap((f) => [f.key, `${f.key}_align`]),
        HEADER_ALIGN_KEY,
        HEADER_LAYOUT_KEY,
        ...HEADER_DISPLAY_OPTIONS.map((option) => option.contentKey),
        "header_layout_order",
        "footer_layout_order",
      ];
      await Promise.all(
        keys.map((key) => adminSaveContent({ data: { key, body: key === "header_layout_order" ? headerOrder.join(",") : key === "footer_layout_order" ? footerOrder.join(",") : values[key] ?? "" } })),
      );
    },
    onSuccess: () => {
      toast.success("Header and footer updated");
      refreshContent();
    },
    onError: () => toast.error("Could not save the header and footer"),
  });


  const savePayments = useMutation({
    mutationFn: async () => {
      const keys = PAYMENT_FIELDS.flatMap((f) => [f.key, `${f.key}_align`]);
      await Promise.all(
        keys.map((key) => adminSaveContent({ data: { key, body: values[key] ?? "" } })),
      );
    },
    onSuccess: () => {
      toast.success("Payment details updated");
      refreshContent();
    },
    onError: () => toast.error("Could not save the payment details"),
  });

  const saveFeatured = useMutation({
    mutationFn: (slugs: string[]) =>
      adminSaveContent({ data: { key: "home_featured", body: slugs.join(",") } }),
    onSuccess: () => {
      toast.success("Home page products updated");
      refreshContent();
    },
    onError: () => toast.error("Could not update the home page products"),
  });

  const saveProduct = useMutation({
    mutationFn: (d: Draft) => adminSaveProduct({ data: draftToPayload(d) as any }),
    onSuccess: () => {
      toast.success("Product updated across the website");
      setDraft(null);
      refreshProducts();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the product"),
  });

  const removeFeatured = useMutation({
    mutationFn: async (p: NonNullable<typeof products>[number]) => {
      const slugs = featured.filter((s) => s !== p.slug);
      setFeatured(slugs);
      await adminSaveContent({ data: { key: "home_featured", body: slugs.join(",") } });
      if (p.sale_price != null || (p.promo_label ?? "") !== "") {
        await adminSaveProduct({
          data: draftToPayload({ ...toDraft(p), sale_price: "", promo_label: "", active: true }) as any,
        });
      }
    },
    onSuccess: () => {
      toast.success("Removed from the home page and reverted to its normal price");
      refreshContent();
      refreshProducts();
    },
    onError: () => toast.error("Could not remove that product"),
  });

  const list = products ?? [];
  const featuredProducts = featured
    .map((s) => list.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const addable = list.filter((p) => !featured.includes(p.slug));

  const setFeaturedAndSave = (slugs: string[]) => {
    setFeatured(slugs);
    saveFeatured.mutate(slugs);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="home">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="home" className="font-bold uppercase">
            Home
          </TabsTrigger>
          <TabsTrigger value="range" className="font-bold uppercase">
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="header" className="font-bold uppercase">
            Header
          </TabsTrigger>
          <TabsTrigger value="footer" className="font-bold uppercase">
            Footer
          </TabsTrigger>
          <TabsTrigger value="payments" className="font-bold uppercase">
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-foreground">Payment details</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These are shown to the customer after they choose a payment option at checkout.
                  Leave a field blank to hide it.
                </p>
              </div>
              <Button
                className="font-bold uppercase"
                disabled={savePayments.isPending}
                onClick={() => savePayments.mutate()}
              >
                Save payment details
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {PAYMENT_FIELDS.map((f) => (
                <ContentFieldEditor
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  align={(values[`${f.key}_align`] as TextAlign) || f.align || "left"}
                  setValue={(value) => setValue(f.key, value)}
                  setAlign={(value) => setValue(`${f.key}_align`, value)}
                />
              ))}
            </div>

            <Button
              className="mt-5 font-bold uppercase"
              disabled={savePayments.isPending}
              onClick={() => savePayments.mutate()}
            >
              Save payment details
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="header" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-foreground">Header</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rename the tabs at the top of every page and choose where they sit.
                </p>
              </div>
              <Button className="font-bold uppercase" disabled={saveChrome.isPending} onClick={() => saveChrome.mutate()}>
                Save header
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tab position</Label>
                <select
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={values[HEADER_ALIGN_KEY] ?? "right"}
                  onChange={(e) => setValue(HEADER_ALIGN_KEY, e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Centre</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <Label>Header arrangement</Label>
                <select
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={values[HEADER_LAYOUT_KEY] ?? "inline"}
                  onChange={(e) => setValue(HEADER_LAYOUT_KEY, e.target.value)}
                >
                  <option value="inline">Logo left, tabs beside it</option>
                  <option value="stacked">Logo on top, tabs underneath</option>
                  <option value="centred">Everything centred</option>
                </select>
              </div>
            </div>

            <SectionOrderEditor sections={HEADER_TABS} order={headerOrder} onChange={setHeaderOrder} />

            <div className="mt-5">
              <h4 className="text-sm font-extrabold uppercase tracking-[0.15em] text-accent">
                Tab appearance
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose an icon or its editable tab name. The Catalogue always uses the test beaker.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {HEADER_DISPLAY_OPTIONS.map((option) => (
                  <div key={option.key}>
                    <Label htmlFor={option.contentKey}>{option.label}</Label>
                    <select
                      id={option.contentKey}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      value={values[option.contentKey] ?? option.fallback}
                      onChange={(event) => setValue(option.contentKey, event.target.value)}
                    >
                      <option value="text">Text</option>
                      <option value="icon">Icon</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {HEADER_FIELDS.map((f) => (
                <ContentFieldEditor
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  align={(values[`${f.key}_align`] as TextAlign) || f.align || "center"}
                  setValue={(value) => setValue(f.key, value)}
                  setAlign={(value) => setValue(`${f.key}_align`, value)}
                />
              ))}
            </div>

            <Button className="mt-5 font-bold uppercase" disabled={saveChrome.isPending} onClick={() => saveChrome.mutate()}>
              Save header
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="footer" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-foreground">Footer</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Change every line in the footer. The link names come from the Header tab.
                </p>
              </div>
              <Button className="font-bold uppercase" disabled={saveChrome.isPending} onClick={() => saveChrome.mutate()}>
                Save footer
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {FOOTER_FIELDS.map((f) => (
                <ContentFieldEditor
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  align={(values[`${f.key}_align`] as TextAlign) || f.align || "center"}
                  setValue={(value) => setValue(f.key, value)}
                  setAlign={(value) => setValue(`${f.key}_align`, value)}
                />
              ))}
            </div>

            <SectionOrderEditor sections={FOOTER_TABS} order={footerOrder} onChange={setFooterOrder} />

            <Button className="mt-5 font-bold uppercase" disabled={saveChrome.isPending} onClick={() => saveChrome.mutate()}>
              Save footer
            </Button>
          </div>

          <AdminLinks />
        </TabsContent>


        <TabsContent value="home" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-foreground">Home page name and subheading</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Change the two main lines shown over the faded Titan logo.
                </p>
              </div>
              <Button
                className="font-bold uppercase"
                disabled={saveHome.isPending}
                onClick={() => saveHome.mutate()}
              >
                Save page heading
              </Button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {HOME_IDENTITY_FIELDS.map((f) => (
                <ContentFieldEditor
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  align={(values[`${f.key}_align`] as TextAlign) || f.align || "center"}
                  setValue={(value) => setValue(f.key, value)}
                  setAlign={(value) => setValue(`${f.key}_align`, value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-6">
            <h3 className="text-lg font-extrabold uppercase text-foreground">
              Hot products on the home page
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the products you want on the front page. Anything you change here — price, sale
              price, badge, wording — updates that product everywhere on the website.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value=""
                onChange={(e) => {
                  if (e.target.value) setFeaturedAndSave([...featured, e.target.value]);
                }}
              >
                <option value="">Add a product…</option>
                {addable.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              {addable.length === 0 && list.length > 0 ? (
                <span className="text-xs text-muted-foreground">Every product is already shown.</span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {featuredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products on the home page yet — customers still see everything in the Catalogue.
                </p>
              ) : (
                featuredProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-4"
                  >
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.alt}
                          className="h-12 w-12 rounded object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <div>
                        <p className="font-extrabold uppercase text-foreground">{p.name}</p>
                        <p>
                          {p.sale_price != null ? (
                            <>
                              <span className="line-through">{formatPrice(Number(p.price))}</span>{" "}
                              <span className="font-bold text-accent">
                                {formatPrice(Number(p.sale_price))}
                              </span>
                            </>
                          ) : (
                            formatPrice(Number(p.price))
                          )}
                          {p.promo_label ? ` · ${p.promo_label}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="font-bold uppercase"
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...featured];
                          const j = next.indexOf(p.slug);
                          if (j <= 0) return;
                          const current = next[j];
                          const previous = next[j - 1];
                          if (!current || !previous) return;
                          next[j - 1] = current;
                          next[j] = previous;
                          setFeaturedAndSave(next);
                        }}
                      >
                        Move up
                      </Button>
                      <Button
                        variant="outline"
                        className="font-bold uppercase"
                        onClick={() => setDraft(toDraft(p))}
                      >
                        Edit details
                      </Button>
                      <Button
                        variant="destructive"
                        className="font-bold uppercase"
                        disabled={removeFeatured.isPending}
                        onClick={() => removeFeatured.mutate(p)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {draft ? (
              <div className="mt-5">
                <ProductEditor
                  draft={draft}
                  setDraft={setDraft}
                  saving={saveProduct.isPending}
                  title={`Edit ${draft.name}`}
                  onSave={() => saveProduct.mutate(draft)}
                  onCancel={() => setDraft(null)}
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-foreground">Home page wording</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Change any wording on your home page here. Leave a box empty to use the standard wording.
                </p>
              </div>
              <Button
                className="font-bold uppercase"
                disabled={saveHome.isPending}
                onClick={() => saveHome.mutate()}
              >
                Save home page
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {HOME_WORDING_FIELDS.map((f) => (
                <ContentFieldEditor
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  align={(values[`${f.key}_align`] as TextAlign) || f.align || "center"}
                  setValue={(value) => setValue(f.key, value)}
                  setAlign={(value) => setValue(`${f.key}_align`, value)}
                />
              ))}
            </div>

            <SectionOrderEditor sections={HOME_SECTIONS} order={homeOrder} onChange={setHomeOrder} />

            <div className="mt-6">
              <h4 className="text-sm font-extrabold uppercase tracking-[0.15em] text-accent">
                Home picture boxes
              </h4>
              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                {HOME_IMAGE_SLOTS.map((slot) => (
                  <PictureSlotEditor key={slot.key} slot={slot} values={values} setValue={setValue} />
                ))}
              </div>
            </div>

            <Button
              className="mt-5 font-bold uppercase"
              disabled={saveHome.isPending}
              onClick={() => saveHome.mutate()}
            >
              Save home page
            </Button>
          </div>

          <AdminLinks />
        </TabsContent>

        <TabsContent value="range" className="mt-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-foreground">
                   Catalogue wording
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                   Change the Catalogue name, introductory text, bottom note and research disclaimer. The name updates throughout the website.
                </p>
              </div>
              <Button
                className="font-bold uppercase"
                disabled={saveRange.isPending}
                onClick={() => saveRange.mutate()}
              >
                 Save Catalogue
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {RANGE_FIELDS.map((f) => (
                <ContentFieldEditor
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  align={(values[`${f.key}_align`] as TextAlign) || f.align || "center"}
                  setValue={(value) => setValue(f.key, value)}
                  setAlign={(value) => setValue(`${f.key}_align`, value)}
                />
              ))}
            </div>

            <SectionOrderEditor sections={RANGE_SECTIONS} order={rangeOrder} onChange={setRangeOrder} />

            <div className="mt-6">
              <h4 className="text-sm font-extrabold uppercase tracking-[0.15em] text-accent">
                 Catalogue picture boxes
              </h4>
              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                {RANGE_IMAGE_SLOTS.map((slot) => (
                  <PictureSlotEditor key={slot.key} slot={slot} values={values} setValue={setValue} />
                ))}
              </div>
            </div>

            <Button
              className="mt-5 font-bold uppercase"
              disabled={saveRange.isPending}
              onClick={() => saveRange.mutate()}
            >
               Save Catalogue
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
