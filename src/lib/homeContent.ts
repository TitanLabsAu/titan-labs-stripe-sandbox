export type TextAlign = "left" | "center" | "right";
export type HomeField = {
  key: string;
  label: string;
  multiline?: boolean;
  fallback: string;
  align?: TextAlign;
};
export type PageImageSlot = { key: string; label: string; page: "home" | "range" };

export const HOME_FIELDS: HomeField[] = [
  {
    key: "home_tagline",
    label: "Top tagline",
    fallback: "Premium quality ★ Pure form ★ Research use only",
  },
  { key: "home_headline", label: "Main headline", fallback: "How far can you go with Titan Labs?" },
  {
    key: "home_subtext",
    label: "Intro paragraph",
    multiline: true,
    fallback:
      "Australian-owned research supply. Lab-tested peptides and wellness compounds, shipped fast and discreetly. Create your free account to unlock ordering.",
  },
  {
    key: "home_shipping_banner",
    label: "Free shipping banner",
    fallback: "FREE express shipping on all orders over $200",
  },
  { key: "home_featured_title", label: "Hot products heading", fallback: "Hot right now" },
  {
    key: "home_featured_note",
    label: "Hot products intro",
    multiline: true,
    fallback: "This month's picks and promotions from the Titan Labs range.",
  },
  { key: "home_range_button", label: "Range button text", fallback: "View the full range" },
  { key: "home_pillar1_title", label: "Pillar 1 heading", fallback: "Science Backed" },
  {
    key: "home_pillar1_body",
    label: "Pillar 1 text",
    multiline: true,
    fallback: "Formulas you can trust, batch tested for purity.",
  },
  { key: "home_pillar2_title", label: "Pillar 2 heading", fallback: "Premium Quality" },
  {
    key: "home_pillar2_body",
    label: "Pillar 2 text",
    multiline: true,
    fallback: "Only the highest grade compounds, every single vial.",
  },
  { key: "home_pillar3_title", label: "Pillar 3 heading", fallback: "Discreet Shipping" },
  {
    key: "home_pillar3_body",
    label: "Pillar 3 text",
    multiline: true,
    fallback: "Express post with insurance, fast and private.",
  },
  { key: "home_cta_title", label: "Sign-up box heading", fallback: "Join Titan Labs" },
  {
    key: "home_cta_body",
    label: "Sign-up box text",
    multiline: true,
    fallback:
      "Sign up with your email, confirm it with the link we send, then complete your profile to start ordering.",
  },
  { key: "home_cta_button", label: "Sign-up button text", fallback: "Get started" },
  {
    key: "home_footer_text",
    label: "Footer line",
    multiline: true,
    fallback: "Titan Labs Aus ★ Trusted source ★ Discreet shipping ★ Telegram @Titanlabsau",
  },
];

export const RANGE_FIELDS: HomeField[] = [
  { key: "home_range_title", label: "Range page heading", fallback: "The range" },
  {
    key: "range_intro",
    label: "Text under The Range",
    multiline: true,
    fallback: "",
  },
  {
    key: "home_range_note",
    label: "Note under product range",
    multiline: true,
    fallback: "Full price list, starter packs and bulk discounts available once you're logged in.",
  },
  {
    key: "range_disclaimer",
    label: "Research use disclaimer",
    multiline: true,
    align: "left",
    fallback:
      "Research grade peptides supplied for laboratory research use only.\n\nAll products are supplied for laboratory and research use only. They are not for human or animal consumption, and no therapeutic, medical or performance use is described or implied.",
  },
];

export const HOME_IMAGE_SLOTS: PageImageSlot[] = [
  { key: "home_picture_1", label: "Home picture box 1", page: "home" },
  { key: "home_picture_2", label: "Home picture box 2", page: "home" },
  { key: "home_picture_3", label: "Home picture box 3", page: "home" },
];

export const RANGE_IMAGE_SLOTS: PageImageSlot[] = [
  { key: "range_picture_1", label: "View the Range picture box 1", page: "range" },
  { key: "range_picture_2", label: "View the Range picture box 2", page: "range" },
  { key: "range_picture_3", label: "View the Range picture box 3", page: "range" },
];

export const TEXT_ALIGN_CLASS: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export const FLEX_ALIGN_CLASS: Record<TextAlign, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const validAligns: TextAlign[] = ["left", "center", "right"];

function normaliseAlign(value: string | undefined, fallback: TextAlign = "center"): TextAlign {
  return validAligns.includes(value as TextAlign) ? (value as TextAlign) : fallback;
}

export function fieldAlign(
  content: Record<string, string> | undefined,
  field: HomeField,
  fallback: TextAlign = field.align ?? "center",
) {
  return normaliseAlign(content?.[`${field.key}_align`], fallback);
}

export function imageAlign(content: Record<string, string> | undefined, key: string) {
  return normaliseAlign(content?.[`${key}_align`], "center");
}

export function pageImageSlots(content: Record<string, string> | undefined, slots: PageImageSlot[]) {
  return slots
    .map((slot) => {
      const url = content?.[`${slot.key}_url`]?.trim() ?? "";
      return {
        ...slot,
        url,
        alt: content?.[`${slot.key}_alt`]?.trim() || slot.label,
        caption: content?.[`${slot.key}_caption`]?.trim() ?? "",
        align: imageAlign(content, slot.key),
      };
    })
    .filter((slot) => slot.url);
}

export function contentKeysForImages(slots: PageImageSlot[]) {
  return slots.flatMap((slot) => [
    `${slot.key}_url`,
    `${slot.key}_alt`,
    `${slot.key}_caption`,
    `${slot.key}_align`,
  ]);
}

/** Slugs of the products the owner has pinned to the home page. */
export function featuredSlugs(content: Record<string, string> | undefined) {
  return (content?.["home_featured"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function homeValue(content: Record<string, string> | undefined, key: string) {
  const field = [...HOME_FIELDS, ...RANGE_FIELDS].find((f) => f.key === key);
  const value = content?.[key]?.trim();
  return value || field?.fallback || "";
}
