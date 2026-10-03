/**
 * Storefront CMS registry. Each section is stored as ONE site_content row
 * (`cms:<sectionId>`) holding a JSON object of overrides. A key that is
 * absent falls back to the default; a key present with "" is a deliberate
 * empty value. Reset = save `{}`. Shared by the Admin editor, the server
 * validator and every storefront reader so rules cannot drift.
 */
import { z } from "zod";

export type ListItemField = { key: string; label: string; type: "text" | "textarea" | "url" | "toggle"; max?: number };
export type CmsField =
  | { key: string; label: string; type: "text" | "textarea"; max: number; help?: string }
  | { key: string; label: string; type: "url"; help?: string }
  | { key: string; label: string; type: "image"; help?: string }
  | { key: string; label: string; type: "toggle"; help?: string }
  | { key: string; label: string; type: "list"; itemFields: ListItemField[]; maxItems: number; help?: string };

export type AdminShortcut = "products" | "reviews" | "discounts" | "members" | "edits";
export type CmsSection = {
  id: string;
  group: CmsGroup;
  title: string;
  description?: string;
  shortcut?: { tab: AdminShortcut; label: string };
  fields: CmsField[];
  defaults: Record<string, unknown>;
};

export type CmsGroup = "Homepage" | "Badges" | "Pages" | "Guides" | "Cart & checkout" | "Navigation";
export const CMS_GROUPS: CmsGroup[] = ["Homepage", "Badges", "Pages", "Guides", "Cart & checkout", "Navigation"];

const T = (key: string, label: string, max = 160, help?: string): CmsField => ({ key, label, type: "text", max, help });
const P = (key: string, label: string, max = 1200, help?: string): CmsField => ({ key, label, type: "textarea", max, help });
const U = (key: string, label: string, help?: string): CmsField => ({ key, label, type: "url", help });
const B = (key: string, label: string, help?: string): CmsField => ({ key, label, type: "toggle", help });

export const CMS_SECTIONS: CmsSection[] = [
  {
    id: "home_testing",
    group: "Homepage",
    title: "Testing Transparency section",
    description: "The photo section on the homepage. Its position is set in Home > section order.",
    fields: [
      B("visible", "Show on homepage"),
      { key: "image", label: "Photo", type: "image", help: "Leave empty to use the built-in photo." },
      T("image_alt", "Photo description (alt text)", 300),
      T("caption", "Photo caption", 80),
      T("eyebrow", "Small heading", 60),
      T("headline", "Headline", 120),
      P("body", "Body text", 800),
      { key: "bullets", label: "Bullet points", type: "list", maxItems: 6, itemFields: [{ key: "text", label: "Text", type: "text", max: 140 }] },
      T("primary_label", "Main button label", 40),
      U("primary_url", "Main button link"),
      T("secondary_label", "Second button label", 40),
      U("secondary_url", "Second button link"),
      T("secondary_helper", "Text under second button", 80),
    ],
    defaults: {
      visible: true,
      image: "",
      image_alt: "Illustration of laboratory analysis equipment beside a clear sample cell, printed report and tablet displaying a document symbol.",
      caption: "Illustrative image",
      eyebrow: "TESTING TRANSPARENCY",
      headline: "Confidence starts with the certificate.",
      body: "Explore the available Certificates of Analysis for Titan Labs products. For reports issued by Peptide Test Canada, use the code printed on your certificate to check it directly with the laboratory.",
      bullets: [
        { text: "Review the report for your product and batch" },
        { text: "Check certificate details at the source" },
        { text: "Titan Labs // Aus - Member of The Peptide Society" },
      ],
      primary_label: "Browse Catalogue",
      primary_url: "/range",
      secondary_label: "Verify COA",
      secondary_url: "https://peptidetestcanada.ca/verify",
      secondary_helper: "Opens Peptide Test Canada",
    },
  },
  {
    id: "home_offer",
    group: "Homepage",
    title: "New-member offer banner",
    description: "Shown to signed-out visitors while the first-purchase offer is switched on. Write {percent} where the discount should appear — the amount always comes from Discounts settings.",
    shortcut: { tab: "discounts", label: "Change offer amount/settings" },
    fields: [B("visible", "Show on homepage"), T("text", "Banner text", 200), T("join_label", "Join link label", 30), T("login_label", "Log in link label", 30)],
    defaults: { visible: true, text: "New members receive {percent}% off their first purchase.", join_label: "Join", login_label: "Log in" },
  },
  {
    id: "badge",
    group: "Badges",
    title: "Testing Transparency badge",
    description: "The compact badge used in the catalogue, footer and certificates page.",
    fields: [
      T("headline", "Headline", 60),
      T("membership", "Membership line", 120),
      T("link_label", "Link label", 60),
      U("link_url", "Link"),
      { key: "image", label: "Emblem image", type: "image", help: "Leave empty to use the built-in emblem." },
      T("image_alt", "Emblem description (leave empty if decorative)", 200),
      B("show_catalogue", "Show in catalogue"),
      B("show_footer", "Show in footer"),
      B("show_certificates", "Show on certificates page"),
    ],
    defaults: {
      headline: "Testing Transparency",
      membership: "Titan Labs // Aus - Member of The Peptide Society",
      link_label: "View product certificates",
      link_url: "/certificates",
      image: "",
      image_alt: "",
      show_catalogue: true,
      show_footer: true,
      show_certificates: true,
    },
  },
  {
    id: "branding",
    group: "Homepage",
    title: "Branding & homepage heading",
    description: "The site name itself is edited in Home > Page name.",
    fields: [
      { key: "logo", label: "Logo image", type: "image", help: "Leave empty to use the built-in logo." },
      T("home_eyebrow", "Homepage small heading", 80),
      T("home_title", "Homepage big heading", 80),
      { key: "watermark", label: "Homepage faded background logo", type: "image", help: "Leave empty to use the built-in logo." },
      B("watermark_visible", "Show faded background logo"),
      { key: "footer_image", label: "Footer background image", type: "image", help: "Leave empty to use the built-in picture." },
    ],
    defaults: { logo: "", home_eyebrow: "Australian owned · Quality tested", home_title: "Titan Labs // Aus", watermark: "", watermark_visible: true, footer_image: "" },
  },
  {
    id: "page_intros",
    group: "Pages",
    title: "Page headings & introductions",
    description: "Headings at the top of member, tool and guide pages. Leave an introduction empty to hide it.",
    fields: [
      T("calc_eyebrow", "Calculator: small heading", 60), T("calc_title", "Calculator: title", 80), P("calc_intro", "Calculator: introduction", 600, "The calculator maths is not editable."),
      T("account_eyebrow", "Account: small heading", 60), T("account_title", "Account: title", 80), P("account_intro", "Account: introduction", 400),
      T("calendar_eyebrow", "Calendar: small heading", 60), T("calendar_title", "Calendar: title", 80), P("calendar_intro", "Calendar: introduction", 400),
      T("research_eyebrow", "Research Lab: small heading", 60), T("research_title", "Research Lab: title", 80), P("research_intro", "Research Lab: introduction", 600),
      T("login_eyebrow", "Log in: small heading", 60), T("login_title", "Log in: title", 80), P("login_intro", "Log in: welcome text", 300),
      T("signup_eyebrow", "Sign up: small heading", 60), T("signup_title", "Sign up: title", 80), P("signup_intro", "Sign up: welcome text", 300),
    ],
    defaults: {
      calc_eyebrow: "Research tool", calc_title: "Reconstitution Calculator", calc_intro: "",
      account_eyebrow: "Titan member area", account_title: "Your account", account_intro: "",
      calendar_eyebrow: "Member research tool", calendar_title: "My Calendar", calendar_intro: "Record your own research measurements and reminders. Titan does not prescribe schedules or doses.",
      research_eyebrow: "Explore · Understand · Go deeper", research_title: "Understand the research. Faster.", research_intro: "Start with a simple explanation, explore what researchers are studying, then open the science and references only when you want more detail.",
      login_eyebrow: "Titan member access", login_title: "Member log in", login_intro: "Welcome back to Titan Labs Aus.",
      signup_eyebrow: "Titan member access", signup_title: "Create account", signup_intro: "Enter your details, then confirm your email to unlock ordering.",
    },
  },
  {
    id: "guide_pages",
    group: "Guides",
    title: "Pen Guides page",
    fields: [
      T("eyebrow", "Small heading", 60), T("title", "Title", 80), P("intro", "Introduction", 600),
      T("reusable_title", "Reusable pen guide heading", 80),
      { key: "reusable_steps", label: "Reusable pen steps", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step title", type: "text", max: 80 }, { key: "body", label: "Step text", type: "textarea", max: 500 }] },
      T("products_title", "Product information heading", 80), P("products_body", "Product information text", 300),
    ],
    defaults: {
      eyebrow: "Equipment reference", title: "Titan Pen Guides",
      intro: "Reference information for Titan V2 reusable and disposable pens. Model-specific instructions supplied with the hardware take precedence. Products are for laboratory research only, not human or animal consumption.",
      reusable_title: "Titan V2 reusable pen",
      reusable_steps: [
        { title: "Check compatibility", body: "Confirm the cartridge and accessories match the exact V2 pen model and manufacturer instructions." },
        { title: "Inspect before handling", body: "Check packaging, labels and the device for damage. Follow the handling and cleaning instructions supplied with the hardware." },
        { title: "Cartridge and unit scale", body: "Use only the manufacturer’s cartridge-loading and priming instructions. A pen’s unit scale must not be assumed to match a U-100 syringe." },
        { title: "Storage and disposal", body: "Follow the device and research material storage instructions. Place sharp accessories in an appropriate sharps container." },
      ],
      products_title: "Product information & supplied guides", products_body: "Open the product information for its current options and documents.",
    },
  },
  {
    id: "starter_kit",
    group: "Cart & checkout",
    title: "Starter kit offer",
    description: "Kit contents and price come from the kit product.",
    shortcut: { tab: "products", label: "Manage starter kits" },
    fields: [T("add_label", "Add button label", 40), T("coming_soon_label", "Coming soon label", 40), T("unavailable_label", "Unavailable label", 40)],
    defaults: { add_label: "Add starter kit", coming_soon_label: "Coming soon", unavailable_label: "Starter kit unavailable" },
  },
  {
    id: "page_contact",
    group: "Pages",
    title: "Contact & support page",
    fields: [T("eyebrow", "Small heading", 60), T("title", "Page title", 80), T("card_label", "Card label", 60), T("card_title", "Card title", 80), P("body", "Body text", 800), T("phone_display", "Phone number shown", 40), U("whatsapp_url", "WhatsApp link", "Usually https://wa.me/ followed by the number."), T("button_label", "Button label", 40)],
    defaults: {
      eyebrow: "Here to help",
      title: "Contact & Customer Support",
      card_label: "WhatsApp support",
      card_title: "Titan Labs // Aus Sales Rep",
      body: "Have a question about your order or need a hand? Contact our sales rep directly on WhatsApp. For an existing order, include your order number so we can help you sooner.",
      phone_display: "+63 956 889 4105",
      whatsapp_url: "https://wa.me/639568894105",
      button_label: "Chat on WhatsApp",
    },
  },
  {
    id: "page_certificates",
    group: "Pages",
    title: "Certificates page",
    shortcut: { tab: "products", label: "Add certificate files to products" },
    fields: [T("title", "Page title", 80), P("intro", "Intro / empty-state text", 600), T("verify_label", "Verify button label (leave empty to hide)", 40), U("verify_url", "Verify button link")],
    defaults: { title: "Product Certificates", intro: "Certificates will appear here as they are added.", verify_label: "", verify_url: "https://peptidetestcanada.ca/verify" },
  },
  {
    id: "page_reviews",
    group: "Pages",
    title: "Reviews page",
    description: "Reviews themselves are managed in the Reviews tab — only genuine published reviews appear.",
    shortcut: { tab: "reviews", label: "Manage reviews" },
    fields: [T("eyebrow", "Small heading", 60), T("title", "Page title", 80), T("empty_title", "No-reviews heading", 80), P("empty_body", "No-reviews text", 300), T("empty_cta", "No-reviews button label", 40)],
    defaults: { eyebrow: "Community", title: "Customer reviews", empty_title: "No reviews published yet", empty_body: "Check back soon. In the meantime, browse the catalogue.", empty_cta: "Browse the catalogue" },
  },
  {
    id: "page_referrals",
    group: "Pages",
    title: "Referral program page",
    description: "Reward amounts and limits always come from the Discounts settings. Use {reward}, {max_credits}, {max_credit_value} and {cap} to insert the live values.",
    shortcut: { tab: "discounts", label: "Change reward settings" },
    fields: [
      T("title", "Page title", 80),
      P("intro", "Intro text", 600),
      { key: "steps", label: "How it works steps", type: "list", maxItems: 8, itemFields: [{ key: "title", label: "Step title", type: "text", max: 80 }, { key: "body", label: "Step text", type: "textarea", max: 300 }] },
    ],
    defaults: {
      title: "Referral Program",
      intro: "",
      steps: [
        { title: "Get your code", body: "Members can request a personal referral code. You'll see it in My Profile once it's linked to your account." },
        { title: "Share it", body: "Friends enter your code at checkout. Some codes also give them a discount — shown before they pay." },
        { title: "Earn credit", body: "You earn {reward} store credit for every fully paid order placed with your code — repeat customers and repeat orders all count. Cancelled, failed or refunded orders don't count." },
        { title: "Spend it", body: "Apply up to {max_credits} credits ({max_credit_value}) per order at checkout. Credit has no cash value." },
      ],
    },
  },
  {
    id: "guide_pen",
    group: "Guides",
    title: "Disposable pen guide",
    description: "Shown on pen product pages and the Pen Guides page.",
    fields: [
      T("title", "Heading", 80),
      P("intro", "Intro text", 600),
      { key: "steps", label: "Guide steps", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step title", type: "text", max: 80 }, { key: "body", label: "Step text", type: "textarea", max: 500 }] },
      T("link_label", "Link label", 60),
      U("link_url", "Link"),
    ],
    defaults: {
      title: "Disposable pre-filled pen guide",
      intro: "Read before purchasing. The instructions supplied with your exact pen model take precedence. Products are for laboratory research only, not human or animal consumption.",
      steps: [
        { title: "Check the supplied product", body: "Confirm the compound, strength, label and sealed packaging. Do not use damaged or incorrectly labelled equipment." },
        { title: "Check compatible accessories", body: "Use the accessory type specified for the actual pen. The optional Pen Starter Kit contents are listed on its product page." },
        { title: "Use the manufacturer’s instructions", body: "Priming, loading, scale readings and disposal vary by device. Refer to the instructions supplied with the exact model." },
        { title: "Disposal", body: "Follow the manufacturer’s directions and local sharps disposal requirements. Do not refill a disposable device." },
      ],
      link_label: "Compare pens in Titan Pen Guides →",
      link_url: "/pen-guide",
    },
  },
  {
    id: "cart_upsell",
    group: "Cart & checkout",
    title: "Cart equipment suggestion",
    description: "Prices, stock and what can be added always come from Products.",
    shortcut: { tab: "products", label: "Manage equipment products" },
    fields: [B("visible", "Show equipment suggestion in cart"), T("heading", "Heading", 60), T("body", "Supporting text", 120)],
    defaults: { visible: true, heading: "Need Equipment? Tap to browse", body: "Or add BAC Water below before checkout." },
  },
  {
    id: "nav_footer",
    group: "Navigation",
    title: "Footer extra links",
    description: "Links in the footer menu below the main pages. Internal links start with /.",
    fields: [{ key: "links", label: "Links", type: "list", maxItems: 12, itemFields: [{ key: "label", label: "Label", type: "text", max: 40 }, { key: "url", label: "Link", type: "url" }, { key: "visible", label: "Visible", type: "toggle" }] }],
    defaults: {
      links: [
        { label: "Pen Guides", url: "/pen-guide", visible: true },
        { label: "Reviews", url: "/reviews", visible: true },
        { label: "Referral Program", url: "/referrals", visible: true },
        { label: "Certificates", url: "/certificates", visible: true },
      ],
    },
  },
];

export const cmsKey = (id: string) => `cms:${id}`;
export const cmsSection = (id: string) => CMS_SECTIONS.find((s) => s.id === id);

/** Safe link: internal "/path" (not "//") or http(s) URL. Empty allowed. */
export function isSafeUrl(v: string) {
  const s = v.trim();
  if (!s) return true;
  if (s.startsWith("/")) return !s.startsWith("//") && !s.startsWith("/\\") && !/[\s<>"]/.test(s);
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && !/[\s<>"]/.test(s);
  } catch {
    return false;
  }
}
export const isExternalUrl = (v: string) => /^https?:\/\//i.test(v.trim());

const urlSchema = z.string().max(500).refine(isSafeUrl, "Use a link starting with / or https://");
function itemSchema(f: ListItemField) {
  if (f.type === "toggle") return z.boolean();
  if (f.type === "url") return urlSchema;
  return z.string().max(f.max ?? 500);
}
function fieldSchema(f: CmsField): z.ZodTypeAny {
  switch (f.type) {
    case "text":
    case "textarea":
      return z.string().max(f.max);
    case "url":
    case "image":
      return urlSchema;
    case "toggle":
      return z.boolean();
    case "list":
      return z.array(z.object(Object.fromEntries(f.itemFields.map((i) => [i.key, itemSchema(i)]))).strict()).max(f.maxItems);
  }
}
export function sectionSchema(section: CmsSection) {
  return z.object(Object.fromEntries(section.fields.map((f) => [f.key, fieldSchema(f).optional()]))).strict();
}

/** Validate an override object; returns cleaned overrides or throws ZodError. */
export function validateSection(id: string, value: unknown) {
  const section = cmsSection(id);
  if (!section) throw new Error("Unknown content section");
  return sectionSchema(section).parse(value) as Record<string, unknown>;
}

export function parseOverrides(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** Resolved values for a section: defaults merged with valid overrides. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cmsValues(content: Record<string, string> | undefined, id: string): any {
  const section = cmsSection(id)!;
  const overrides = parseOverrides(content?.[cmsKey(id)]);
  const out: Record<string, unknown> = { ...section.defaults };
  const schema = sectionSchema(section).shape as Record<string, z.ZodTypeAny>;
  for (const [k, v] of Object.entries(overrides)) {
    if (schema[k]?.safeParse(v).success) out[k] = v;
  }
  return out;
}

/** Replace {token} placeholders with live values (unknown tokens stay as-is). */
export function fillTokens(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

/** Server-side merge: apply only changed fields, refusing if someone else changed them since `base`. */
export function mergeSectionChanges(
  id: string,
  currentRaw: string | undefined,
  changes: Record<string, unknown>,
  base: Record<string, unknown>,
) {
  const section = cmsSection(id);
  if (!section) throw new Error("Unknown content section");
  const current: Record<string, unknown> = cmsValues({ [cmsKey(id)]: currentRaw ?? "" }, id);
  for (const k of Object.keys(changes)) {
    if (JSON.stringify(current[k]) !== JSON.stringify(base[k])) {
      throw new Error(`"${section.fields.find((f) => f.key === k)?.label ?? k}" was changed by someone else. Reload and try again.`);
    }
  }
  const overrides = validateSection(id, parseOverrides(currentRaw));
  return validateSection(id, { ...overrides, ...changes });
}
