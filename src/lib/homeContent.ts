export type HomeField = { key: string; label: string; multiline?: boolean; fallback: string };

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
  { key: "home_range_title", label: "Range heading", fallback: "The range" },
  {
    key: "home_range_note",
    label: "Note under the range",
    multiline: true,
    fallback: "Full price list, starter packs and bulk discounts available once you're logged in.",
  },
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

export function homeValue(content: Record<string, string> | undefined, key: string) {
  const field = HOME_FIELDS.find((f) => f.key === key);
  const value = content?.[key]?.trim();
  return value || field?.fallback || "";
}
