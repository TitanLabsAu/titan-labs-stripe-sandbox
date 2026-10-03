export type TextAlign = "left" | "center" | "right";
export type HomeField = {
  key: string;
  label: string;
  multiline?: boolean;
  fallback: string;
  align?: TextAlign;
};
export type PageImageSlot = { key: string; label: string; page: "home" | "range" };
export type PageSection = { key: string; label: string; /** Where a newly added section goes when missing from a saved order. */ insertAfter?: string | "start" };

export const HOME_FIELDS: HomeField[] = [
  {
    key: "home_tagline",
    label: "Subheading",
    fallback: "Premium quality ★ Pure form ★ Research use only",
  },
  { key: "home_headline", label: "Page name", fallback: "Titan Labs Australia" },
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
  { key: "home_range_title", label: "Catalogue name", fallback: "Catalogue" },
  {
    key: "range_intro",
    label: "Text under Catalogue",
    multiline: true,
    fallback: "",
  },
  {
    key: "home_range_note",
    label: "Note under Catalogue",
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

export const HEADER_FIELDS: HomeField[] = [
  { key: "header_tagline", label: "Small line under the site name", fallback: "Australia // Research Supply" },
  { key: "header_nav_home", label: "Tab name: Home", fallback: "Home" },
  { key: "header_nav_calculator", label: "Tab name: Calculator", fallback: "Calculator" },
  { key: "header_nav_admin", label: "Tab name: Admin", fallback: "Admin" },
  { key: "header_nav_login", label: "Tab name: Log in", fallback: "Log in" },
  { key: "header_nav_signup", label: "Tab name: Join / sign up", fallback: "Join Titan" },
  { key: "header_nav_account", label: "Tab name: My profile", fallback: "My profile" },
];

export const FOOTER_FIELDS: HomeField[] = [
  {
    key: "footer_about",
    label: "About paragraph",
    multiline: true,
    align: "left",
    fallback:
      "Australian owned, driven and different. Precision research products backed by uncompromising standards.",
  },
  { key: "footer_nav_title", label: "Links column heading", align: "left", fallback: "Navigate" },
  { key: "footer_standard_title", label: "Right column heading", align: "left", fallback: "Titan Labs Australia standard" },
  { key: "footer_point_1", label: "Right column line 1", align: "left", fallback: "Australia-wide delivery" },
  { key: "footer_point_2", label: "Right column line 2", align: "left", fallback: "100% delivery guarantee" },
  { key: "footer_point_3", label: "Right column line 3", align: "left", fallback: "Laboratory research use only" },
  {
    key: "footer_notice",
    label: "Bottom notice",
    multiline: true,
    align: "right",
    fallback: "Research use only. Not for human or animal consumption.",
  },
];

/** Checkout payment wording and details, editable in Admin Edits. */
export const PAYMENT_FIELDS: HomeField[] = [
  {
    key: "payment_intro",
    label: "Text above the payment choices",
    multiline: true,
    align: "left",
    fallback:
      "Choose your preferred payment method below. Payment instructions and confirmation will be provided based on your selected method.",
  },
  { key: "payment_bank_enabled", label: "Show bank transfer at checkout", align: "left", fallback: "false" },
  { key: "payment_payid_label", label: "PayID option name", align: "left", fallback: "PayID / Bank transfer" },
  { key: "payment_payid_id", label: "Your PayID", align: "left", fallback: "" },
  { key: "payment_payid_account", label: "Account name", align: "left", fallback: "Titan Labs Australia" },
  { key: "payment_payid_bsb", label: "BSB (optional)", align: "left", fallback: "" },
  { key: "payment_payid_account_number", label: "Account number (optional)", align: "left", fallback: "" },
  {
    key: "payment_payid_instructions",
    label: "PayID instructions",
    multiline: true,
    align: "left",
    fallback:
      "Transfer the order total from your banking app using your order number as the payment description. Payments clear instantly with Osko.",
  },
  { key: "payment_crypto_label", label: "Crypto option name", align: "left", fallback: "Cryptocurrency (10% off)" },
  { key: "payment_card_label", label: "Card option name", align: "left", fallback: "Credit / Debit Card" },
  {
    key: "payment_crypto_options",
    label: "Coins you accept",
    multiline: true,
    align: "left",
    fallback: "",
  },
  {
    key: "payment_crypto_instructions",
    label: "Crypto instructions",
    multiline: true,
    align: "left",
    fallback:
      "Send the exact coin amount shown above to the wallet address, then paste your transaction hash so we can match your payment.",
  },
  {
    key: "payment_confirmation_note",
    label: "Text on the order received screen",
    multiline: true,
    align: "left",
    fallback:
      "Your order is confirmed. Complete your payment using the details above and we will dispatch as soon as it clears.",
  },
  {
    key: "order_admin_email",
    label: "Order notification email (receives a copy of every customer order email)",
    align: "left",
    fallback: "sjrendall@live.com.au",
  },
];

/** Legal pages (/terms, /privacy), editable in Admin → Website editor → Legal. */
export const LEGAL_FIELDS: HomeField[] = [
  { key: "legal_terms_version", label: "Terms version", align: "left", fallback: "2026.1" },
  {
    key: "legal_terms",
    label: "Terms & Conditions",
    multiline: true,
    align: "left",
    fallback:
      "These Terms & Conditions apply to orders placed with Titan Labs Australia through this website.\n\n1. Research use\nAll products are supplied for laboratory research purposes only. They are not intended for human or animal consumption, and no therapeutic, medical or performance use is described or implied.\n\n2. Accounts and eligibility\nYou must be 18 years or older and provide accurate account, contact and delivery details.\n\n3. Orders and pricing\nPrices are shown in Australian dollars. An order is accepted once payment has been confirmed. We may cancel and refund an order if a product becomes unavailable or a pricing error occurs.\n\n4. Your consumer rights\nNothing in these terms excludes, restricts or modifies any right or remedy you have under the Australian Consumer Law or any other law that cannot lawfully be excluded.\n\n5. Contact\nIf you have a question about these terms or your order, please contact us through our listed contact channels.",
  },
  {
    key: "legal_research_notice",
    label: "Research Use Notice",
    multiline: true,
    align: "left",
    fallback:
      "Products sold by Titan Labs Australia are supplied strictly for laboratory and research purposes. They are not medicines, foods or supplements and are not intended for human or animal consumption. Information on this website is provided for research reference only and is not medical advice.",
  },
  {
    key: "legal_shipping",
    label: "Shipping / Returns information",
    multiline: true,
    align: "left",
    fallback:
      "Orders are dispatched within Australia by Australia Post with tracking. Delivery times are estimates. If your order arrives damaged, incorrect or does not arrive, please contact us so we can help. Your rights under the Australian Consumer Law are not affected.",
  },
  {
    key: "legal_privacy",
    label: "Privacy Policy",
    multiline: true,
    align: "left",
    fallback:
      "Titan Labs Australia collects the personal information you give us — such as your name, email, phone number and delivery address — to create your account, process and deliver your orders, and contact you about them.\n\nPayments by card are handled by our payment provider; we do not store card numbers on this website.\n\nWe do not sell your personal information. We share it only with service providers needed to run the store (for example delivery and payment providers), or where required by law.\n\nYou can ask to access or correct your personal information at any time by contacting us. We handle personal information in line with the Australian Privacy Principles.",
  },
];

export function termsVersion(content: Record<string, string> | undefined) {
  return homeValue(content, "legal_terms_version").trim() || "2026.1";
}

export type PaymentMethodKey = "payid" | "crypto" | "card";

export function paymentMethodName(
  content: Record<string, string> | undefined,
  method: PaymentMethodKey,
) {
  const key =
    method === "payid"
      ? "payment_payid_label"
      : method === "crypto"
        ? "payment_crypto_label"
        : "payment_card_label";
  return homeValue(content, key);
}


export const HEADER_TABS: PageSection[] = [
  { key: "home", label: "Home" },
  { key: "range", label: "Catalogue" },
  { key: "research", label: "Research Lab" },
  { key: "pens", label: "Disposable Pens" },
  { key: "calendar", label: "My Calendar" },
  { key: "calculator", label: "Calculator" },
  { key: "admin", label: "Admin" },
  { key: "account", label: "My profile" },
  { key: "login", label: "Log in" },
  { key: "signup", label: "Join / sign up" },
  { key: "cart", label: "Cart" },
];

export type HeaderDisplayMode = "text" | "icon";
export type HeaderDisplayOption = {
  key: string;
  label: string;
  contentKey: string;
  fallback: HeaderDisplayMode;
};

/** Header items whose visible treatment can be changed in Admin Edits. */
export const HEADER_DISPLAY_OPTIONS: HeaderDisplayOption[] = [
  { key: "home", label: "Home", contentKey: "header_display_home", fallback: "text" },
  { key: "calculator", label: "Calculator", contentKey: "header_display_calculator", fallback: "icon" },
  { key: "admin", label: "Admin", contentKey: "header_display_admin", fallback: "text" },
  { key: "account", label: "My profile", contentKey: "header_display_account", fallback: "icon" },
  { key: "login", label: "Log in", contentKey: "header_display_login", fallback: "text" },
  { key: "signup", label: "Join / sign up", contentKey: "header_display_signup", fallback: "text" },
];

export function headerDisplayMode(
  content: Record<string, string> | undefined,
  key: string,
): HeaderDisplayMode {
  const option = HEADER_DISPLAY_OPTIONS.find((item) => item.key === key);
  return content?.[option?.contentKey ?? ""] === "icon" ? "icon" : option?.fallback ?? "text";
}

export const FOOTER_TABS: PageSection[] = [
  { key: "home", label: "Home" },
  { key: "range", label: "Catalogue" },
  { key: "calculator", label: "Calculator" },
  { key: "login", label: "Log in" },
];

/** Header layout / tab orientation options. */
export const HEADER_ALIGN_KEY = "header_nav_position";
export const HEADER_LAYOUT_KEY = "header_layout";

export function headerNavAlign(content: Record<string, string> | undefined): TextAlign {
  return normaliseAlign(content?.[HEADER_ALIGN_KEY], "right");
}

export function headerLayout(content: Record<string, string> | undefined) {
  const value = content?.[HEADER_LAYOUT_KEY];
  return value === "stacked" || value === "centred" ? value : "inline";
}

export const HOME_IMAGE_SLOTS: PageImageSlot[] = [

  { key: "home_picture_1", label: "Home picture box 1", page: "home" },
  { key: "home_picture_2", label: "Home picture box 2", page: "home" },
  { key: "home_picture_3", label: "Home picture box 3", page: "home" },
];

export const RANGE_IMAGE_SLOTS: PageImageSlot[] = [
  { key: "range_picture_1", label: "Catalogue picture box 1", page: "range" },
  { key: "range_picture_2", label: "Catalogue picture box 2", page: "range" },
  { key: "range_picture_3", label: "Catalogue picture box 3", page: "range" },
];

export const HOME_SECTIONS: PageSection[] = [
  { key: "tagline", label: "Top tagline" },
  { key: "headline", label: "Main headline" },
  { key: "intro", label: "Intro paragraph" },
  { key: "shipping", label: "Free shipping banner" },
  { key: "range-button", label: "Catalogue button" },
  { key: "pictures", label: "Picture boxes" },
  { key: "featured", label: "Hot products" },
  { key: "pillars", label: "Information boxes" },
  { key: "signup", label: "Sign-up box" },
  { key: "offer", label: "New-member offer banner", insertAfter: "start" },
  { key: "testing", label: "Testing Transparency section", insertAfter: "pillars" },
];

export const RANGE_SECTIONS: PageSection[] = [
  { key: "title", label: "Catalogue heading" },
  { key: "intro", label: "Intro paragraph" },
  { key: "disclaimer", label: "Research disclaimer" },
  { key: "pictures", label: "Picture boxes" },
  { key: "products", label: "Categories, search and products" },
  { key: "note", label: "Bottom note" },
];

export function pageSectionOrder(
  content: Record<string, string> | undefined,
  storageKey: string,
  sections: PageSection[],
) {
  const available = new Set(sections.map((section) => section.key));
  const saved = (content?.[storageKey] ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => available.has(key));
  const order = saved.length ? [...saved] : sections.filter((s) => !s.insertAfter).map((s) => s.key);
  for (const section of sections) {
    if (order.includes(section.key)) continue;
    if (section.insertAfter === "start") order.unshift(section.key);
    else if (section.insertAfter && order.includes(section.insertAfter)) order.splice(order.indexOf(section.insertAfter) + 1, 0, section.key);
    else order.push(section.key);
  }
  return order;
}

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

export const BLOCK_ALIGN_CLASS: Record<TextAlign, string> = {
  left: "mr-auto ml-0",
  center: "mx-auto",
  right: "ml-auto mr-0",
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

export function contentAlign(content: Record<string, string> | undefined, key: string) {
  const field = [...HOME_FIELDS, ...RANGE_FIELDS, ...HEADER_FIELDS, ...FOOTER_FIELDS, ...PAYMENT_FIELDS, ...LEGAL_FIELDS].find((f) => f.key === key);
  return normaliseAlign(content?.[`${key}_align`], field?.align ?? "center");
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
  const field = [...HOME_FIELDS, ...RANGE_FIELDS, ...HEADER_FIELDS, ...FOOTER_FIELDS, ...PAYMENT_FIELDS, ...LEGAL_FIELDS].find((f) => f.key === key);
  const value = content?.[key];
  return value && value.trim() ? value : field?.fallback || "";
}

/** The single editable name used for the product listing everywhere. */
export function catalogueName(content: Record<string, string> | undefined) {
  return homeValue(content, "home_range_title");
}


