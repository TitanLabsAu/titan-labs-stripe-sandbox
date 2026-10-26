/**
 * Storefront CMS registry. Each section is stored as ONE site_content row
 * (`cms:<sectionId>`) holding a JSON object of overrides. A key that is
 * absent falls back to the default; a key present with "" is a deliberate
 * empty value. Reset = save `{}`. Shared by the Admin editor, the server
 * validator and every storefront reader so rules cannot drift.
 */
import { z } from "zod";
import drawBacWaterPhoto from "@/assets/guides/titan-guide-draw-bac-water-safety-photo.webp.asset.json";

export type ListItemField = { key: string; label: string; type: "text" | "textarea" | "url" | "toggle"; max?: number };
export type CmsField =
  | { key: string; label: string; type: "text" | "textarea"; max: number; help?: string | undefined }
  | { key: string; label: string; type: "url"; help?: string | undefined }
  | { key: string; label: string; type: "image"; help?: string | undefined }
  | { key: string; label: string; type: "product"; section?: "range" | "pens" | "equipment"; help?: string | undefined }
  | { key: string; label: string; type: "toggle"; help?: string | undefined }
  | { key: string; label: string; type: "choice"; options: [string, string][]; help?: string | undefined }
  | { key: string; label: string; type: "list"; itemFields: ListItemField[]; maxItems: number; help?: string | undefined };

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

export type CmsGroup = "Homepage" | "Badges" | "Pages" | "Guides" | "Cart & checkout" | "Navigation" | "SEO";
export const CMS_GROUPS: CmsGroup[] = ["Homepage", "Badges", "Pages", "Guides", "Cart & checkout", "Navigation", "SEO"];

const T = (key: string, label: string, max = 160, help?: string): CmsField => ({ key, label, type: "text", max, help });
const P = (key: string, label: string, max = 1200, help?: string): CmsField => ({ key, label, type: "textarea", max, help });
const U = (key: string, label: string, help?: string): CmsField => ({ key, label, type: "url", help });
const B = (key: string, label: string, help?: string): CmsField => ({ key, label, type: "toggle", help });

export const CMS_SECTIONS: CmsSection[] = [
  {
    id: "theme_artwork", group: "Homepage", title: "Theme artwork (light product photos)",
    description: "Optional light-theme photos for individual products. Enter the product slug (from its URL) and a real light photo of that same product. Products without an entry keep their original photo in a light frame. Dark theme photos are never changed.",
    fields: [{ key: "products", label: "Light product photos", type: "list", maxItems: 200, itemFields: [{ key: "slug", label: "Product slug (from its URL)", type: "text", max: 160 }, { key: "image", label: "Light photo URL", type: "url" }] }],
    defaults: { products: [] },
  },
  {
    id: "seo", group: "SEO", title: "Search & social previews",
    description: "These settings change search metadata and shared-link previews only. They do not change visible storefront headings or product descriptions. Leave product overrides blank to use automatic defaults.",
    fields: [T("home_title", "Homepage search title", 160), P("home_description", "Homepage search description", 320), {key: "home_image", label: "Homepage social preview image", type: "image"},
      {key: "products", label: "Product search overrides", type: "list", maxItems: 200, itemFields: [{key:"slug",label:"Product slug (from its URL)",type:"text",max:160},{key:"title",label:"Search title",type:"text",max:160},{key:"description",label:"Search description",type:"textarea",max:320},{key:"image",label:"Social preview image URL",type:"url"}]}],
    defaults: {home_title:"Titan Labs Australia | Research Products & Equipment", home_description:"Titan Labs Australia supplies high quality research compounds and accessories.  Product certificates and Australia-wide express shipping. For research use only.",home_image:"",products:[]},
  },
  {
    id: "home_category_photos", group: "Homepage", title: "Range, Pens & Equipment tile photos",
    description: "Choose one product photo for each homepage catalogue tile. You can also select it beside each product in Admin > Products. Empty or unavailable selections fall back to another visible product photo in that section.",
    shortcut: { tab: "products", label: "Choose photos beside products" },
    fields: [
      { key: "range_slug", label: "Range tile product", type: "product", section: "range" },
      { key: "pens_slug", label: "Pens tile product", type: "product", section: "pens" },
      { key: "equipment_slug", label: "Equipment tile product", type: "product", section: "equipment" },
    ],
    defaults: { range_slug: "", pens_slug: "", equipment_slug: "" },
  },
  {
    id: "guide_learning", group: "Guides", title: "Pen comparison & Pens 101",
    fields: [T("title", "Guide section heading", 100), P("intro", "Guide section introduction", 600),
      T("reusable_title", "Reusable column heading", 80), T("disposable_title", "Disposable column heading", 80),
      { key: "comparison", label: "Pen comparison rows", type: "list", maxItems: 8, itemFields: [{ key: "topic", label: "Topic", type: "text", max: 80 }, { key: "reusable", label: "V2 reusable", type: "textarea", max: 300 }, { key: "disposable", label: "Disposable", type: "textarea", max: 300 }] },
      { key: "reusable_steps", label: "V2 equipment guide", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step heading", type: "text", max: 80 }, { key: "body", label: "Step information", type: "textarea", max: 600 }] },
      { key: "disposable_steps", label: "Disposable equipment guide", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step heading", type: "text", max: 80 }, { key: "body", label: "Step information", type: "textarea", max: 600 }] },
      T("faq_title", "Pens 101 heading", 100), P("faq_intro", "Pens 101 introduction", 500),
      { key: "questions", label: "Pens 101 questions", type: "list", maxItems: 16, itemFields: [{ key: "title", label: "Question", type: "text", max: 120 }, { key: "body", label: "Answer", type: "textarea", max: 1000 }] },
      T("checklist_title", "Checklist heading", 100),
      { key: "checklist", label: "Equipment checklist", type: "list", maxItems: 10, itemFields: [{ key: "text", label: "Checklist item", type: "text", max: 200 }] }],
    defaults: {
      title: "How to Use Your Peptide Pen", intro: "A quick step-by-step guide for both the V2 reusable pen and disposable pre-filled pens.",
      reusable_title: "V2 Reusable Insulin Pen", disposable_title: "Disposable Pre-filled Pen",
      comparison: [
        { topic: "Device format", reusable: "A reusable pen body with a replaceable, compatible cartridge.", disposable: "A pre-filled device supplied as one complete unit." },
        { topic: "Cartridge", reusable: "Replace only with a cartridge approved for the exact V2 model.", disposable: "Do not open, refill or replace the built-in cartridge." },
        { topic: "Accessories", reusable: "Check the exact model’s compatible pen pins and cartridge specifications.", disposable: "Check the supplied device’s accessory requirements; do not assume all pens share a fitting." },
        { topic: "End of use", reusable: "Retain the pen body only as directed by its manufacturer; dispose of sharps appropriately.", disposable: "Follow the supplied instructions for disposal of the complete device." },
      ],
      reusable_steps: [
        { title: "Load the Cartridge", body: "Unscrew the pen body and insert a filled peptide cartridge. Reassemble firmly until it clicks." },
        { title: "Sterilise the Pen Top", body: "Use an alcohol prep pad to wipe the rubber septum (where you insert the pen needle) and let it air-dry." },
        { title: "Attach a Pen Needle", body: "Peel the seal off a new pen needle and screw it onto the pen tip. Remove the outer cap, then the inner cap." },
        { title: "Prime the Pen", body: "Turn the dose dial to 2 units, point the needle up, and press the plunger until a drop appears. Repeat if needed." },
        { title: "Set Your Desired Dose", body: "Turn the dose dial to your desired number of units — each click equals 1 unit (number 1 = 1 unit). Check the display window to confirm." },
        { title: "Prep the Injection Site", body: "Clean the injection site with a fresh alcohol prep pad and let it air-dry." },
        { title: "Follow appropriate administration guidance", body: "For a prescribed medicine, use the medicine’s instructions and the technique taught by your clinician. Titan research products are not supplied for human administration." },
        { title: "Dispose and store", body: "Dispose of used sharps in an appropriate container. Store and maintain the reusable pen body as its manual directs." },
      ],
      disposable_steps: [
        { title: "Inspect the Pen", body: "Check for the correct peptide, reconstitution, and concentration. Ensure the liquid is clear with no particles." },
        { title: "Sterilise the Pen Top", body: "Use an alcohol prep pad to wipe the rubber septum where you insert the pen needle and let it air-dry." },
        { title: "Attach a Pen Needle", body: "Peel a new pen needle seal and screw it onto the pen tip. Remove the outer cap, then the inner cap." },
        { title: "Set Your Desired Dose", body: "Turn the dose dial to your desired units — each click equals 1 unit (number 1 = 1 unit). Confirm the number in the display window." },
        { title: "Prep the Injection Site", body: "Clean the injection site with a fresh alcohol prep pad and let it air-dry." },
        { title: "Inject", body: "Pinch the injection site, insert the needle on a 45° angle, press the plunger fully, and hold for 6–8 seconds." },
        { title: "Dispose of the device", body: "When the device reaches the end of its intended use, follow its disposal instructions and local sharps arrangements. Do not refill a disposable pen." },
      ],
      faq_title: "Pens 101", faq_intro: "The essentials, explained — pens, pen pins and compatible equipment at a glance.",
      questions: [
        { title: "What are pen pins?", body: "Pen pins is a common name for detachable pen needles. They are accessories fitted to compatible pen devices. Check the exact fitting and the supplied instructions rather than relying on appearance alone." },
        { title: "What do length and gauge mean?", body: "Length is usually expressed in millimetres (mm); gauge is expressed as G. They describe different physical dimensions. Match the accessory specification to the device instructions; these measurements do not describe the contents or strength of a product." },
        { title: "Are pen pins single-use?", body: "Accessories labelled single-use must not be reused. Check the packaging, expiry information and manufacturer’s directions. A reusable pen body does not make its disposable accessories reusable." },
        { title: "How are accessories attached and removed?", body: "Use the method shown in the exact device and accessory instructions. Threaded, push-fit and protected designs can differ. Do not force a connection or improvise removal of a sharp accessory." },
        { title: "How should sharps be disposed of?", body: "Use an appropriate sharps container and follow its fill limit and closure instructions. Do not place loose sharps in household waste or recycling. Arrange disposal through an appropriate local service." },
        { title: "Will every pen pin fit every pen?", body: "No universal fit is assumed here. Confirm compatibility using the exact manufacturer, model and accessory specification before selecting an item." },
        { title: "Are clicks, units and milligrams the same?", body: "No. A click is a mechanical increment, a displayed unit is a device scale, and milligrams describe mass. These are not interchangeable. Consult the supplied model documentation and product specifications." },
        { title: "How do I store a pen?", body: "Read both the device instructions and the labelled contents’ storage requirements. Do not assume a single temperature rule applies to every empty device, cartridge or pre-filled product." },
      ],
      checklist_title: "Quick equipment checklist",
      checklist: [{ text: "Exact model and supplied instructions identified" }, { text: "Packaging, labels and components inspected" }, { text: "Cartridge and accessories confirmed compatible" }, { text: "Display and scale terminology understood" }, { text: "Storage instructions checked" }, { text: "Sharps container and disposal plan ready" }],
    },
  },
  { id: "catalogue_banner", group: "Pages", title: "Catalogue banner", fields: [T("eyebrow", "Small heading", 60), { key: "image", label: "Banner artwork", type: "image" }, { key: "image_light", label: "Light theme banner artwork", type: "image", help: "Shown only in the light theme. Leave empty to use the approved light helmet artwork." }, T("search_placeholder", "Search placeholder", 100)], defaults: { eyebrow: "The", image: "", image_light: "", search_placeholder: "Search products…" } },
  { id: "footer_design", group: "Navigation", title: "Footer presentation", fields: [T("support_title", "Support column heading", 60)], defaults: { support_title: "Support" } },
  {
    id: "home_membership", group: "Homepage", title: "Join Titan Labs",
    description: "The illustrated membership section. First-purchase offer follows your discount settings and Homepage offer text.",
    fields: [B("visible", "Show membership section"), T("eyebrow", "Small heading", 60), T("title", "Heading", 100), P("body", "Introduction", 800),
      { key: "image", label: "Membership artwork", type: "image", help: "Leave empty to use the approved Titan helmet artwork." },
      { key: "image_light", label: "Light theme membership artwork", type: "image", help: "Shown only in the light theme. Leave empty to use the approved light helmet artwork." },
      T("primary_label", "Sign-up button label", 40), U("primary_url", "Sign-up button link"),
      T("login_prompt", "Login introduction", 80), T("login_label", "Login link label", 40), U("login_url", "Login link"),
      P("help", "Sign-up guidance", 300)],
    defaults: { visible: true, eyebrow: "Become a Titan member", title: "Join Titan Labs", body: "Create your account to explore the full catalogue, manage your orders and access member rewards.", image: "", image_light: "", primary_label: "Create account", primary_url: "/auth/signup", login_prompt: "Already a member?", login_label: "Log in", login_url: "/auth", help: "Enter your details and get instant member access." },
  },

  {
    id: "home_welcome", group: "Homepage", title: "Discovery welcome interface",
    description: "The integrated homepage welcome, including its background artwork and live buttons. Replaces the old welcome blocks.",
    fields: [T("eyebrow", "Small heading", 60), P("headline", "Headline", 160), P("body", "Welcome text", 800),
      { key: "image", label: "Welcome artwork", type: "image", help: "Leave empty to use the approved blue and gold helmet artwork." },
      { key: "image_light", label: "Light theme welcome artwork", type: "image", help: "Shown only in the light theme. Leave empty to use the approved light helmet artwork." },
      T("primary_label", "Catalogue button label", 40), U("primary_url", "Catalogue button link"),
      T("secondary_label", "Certificates button label", 40), U("secondary_url", "Certificates button link"), P("notice", "Research notice", 300)],
    defaults: { eyebrow: "Welcome to Titan", headline: "Your next discovery\nstarts here.", body: "Explore the Range, discover our Pens and Equipment, and view available product certificates — all in one place.", image: "", image_light: "", primary_label: "Explore Catalogue", primary_url: "/range", secondary_label: "View Certificates", secondary_url: "/certificates", notice: "For laboratory research only. Not for human or animal consumption." },
  },
  {
    id: "home_catalogue", group: "Homepage", title: "Catalogue discovery links",
    description: "Category links automatically hide when a category has no products. Category names come from Product page settings.",
    fields: [B("visible", "Show catalogue links"), T("eyebrow", "Small heading", 60), T("title", "Heading", 100), P("body", "Introduction", 500)],
    defaults: { visible: true, eyebrow: "Browse", title: "The Catalogue", body: "Explore our Range, Pens and laboratory Equipment." },
  },
  {
    id: "home_testing",
    group: "Homepage",
    title: "Testing Transparency section",
    description: "The photo section on the homepage. Its position is set in Home > section order.",
    fields: [
      B("visible", "Show on homepage"),
      { key: "image", label: "Photo", type: "image", help: "Leave empty to use the built-in photo." },
      { key: "image_light", label: "Light theme photo", type: "image", help: "Leave empty to use the built-in light laboratory artwork." },
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
      image_light: "",
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
    id: "home_reviews",
    group: "Homepage",
    title: "Homepage featured reviews",
    description: "Shows up to three genuine, published featured reviews. Move this block in Home page configuration. Existing scroll controls are retained.",
    shortcut: { tab: "reviews", label: "Manage reviews" },
    fields: [
      B("visible", "Show on homepage"),
      T("eyebrow", "Small heading", 60),
      T("title", "Heading", 100),
      T("cta_label", "All reviews link label (leave empty to hide)", 40),
      B("autoplay", "Scroll automatically"),
      { key: "speed", label: "Scroll speed", type: "choice", options: [["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]] },
      T("pause_label", "Pause button label", 20),
      T("play_label", "Play button label", 20),
    ],
    defaults: { visible: true, eyebrow: "Community", title: "What Our Customers Say", cta_label: "View All Reviews", autoplay: true, speed: "normal", pause_label: "Pause", play_label: "Play" },
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
      { key: "header_image", label: "Header background image", type: "image", help: "Leave empty to use the built-in picture." },
    ],
    defaults: { logo: "", home_eyebrow: "Australian owned · Quality tested", home_title: "Titan Labs // Aus", watermark: "", watermark_visible: true, footer_image: "", header_image: "" },
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
      signup_eyebrow: "Titan member access", signup_title: "Create account", signup_intro: "Enter your details to create your account — you can start ordering straight away.",
    },
  },
  {
    id: "guide_documents",
    group: "Guides",
    title: "Titan Guides page & kit guides",
    description: "Page heading, guide tabs and the supplied kit guide documents.",
    fields: [
      T("eyebrow", "Small heading", 60), T("title", "Page title", 80), P("intro", "Page introduction", 400),
      T("pens_tab", "Pen Guides tab label", 40), T("reconstitution_tab", "Reconstitution tab label", 40), T("administration_tab", "Administration tab label", 40),
      T("reconstitution_title", "Reconstitution guide heading", 80), P("reconstitution_intro", "Reconstitution guide introduction", 400),
      { key: "reconstitution_image", label: "Reconstitution guide document image", type: "image" },
      T("administration_title", "Administration guide heading", 80), P("administration_intro", "Administration guide introduction", 400),
      { key: "administration_image", label: "Administration guide document image", type: "image" },
    ],
    defaults: {
      eyebrow: "Learn • Prepare • Reference", title: "Titan Guides",
      intro: "Reference guides for Titan pens and kits. Choose a guide below.",
      pens_tab: "Pen Guides", reconstitution_tab: "Reconstitution Kit", administration_tab: "Administration Kit",
      reconstitution_title: "Peptide Reconstitution Guide",
      reconstitution_intro: "The guide supplied with the Titan Reconstitution Kit. Open it full size to read the details.",
      reconstitution_image: "/__l5e/assets-v1/f8a434e0-f9d9-484a-8c04-e9c5d30b86fd/titan-peptide-reconstitution-guide.png",
      administration_title: "Administering Kit Usage Guide",
      administration_intro: "The guide supplied with the Titan Administration Kit. Open it full size to read the details.",
      administration_image: "/__l5e/assets-v1/5276d310-073e-4c91-9e3c-716b3155ae7c/titan-administering-kit-usage-guide.png",
    },
  },
  {
    id: "guide_reconstitution",
    group: "Guides",
    title: "Reconstitution Kit guide (page content)",
    description: "The native step-by-step Reconstitution Kit guide on the Titan Guides page. Text and photos come from the supplied guide document.",
    fields: [
      T("title", "Guide heading", 80), P("intro", "Guide introduction", 400),
      T("kit_title", "Kit contents heading", 80),
      { key: "kit", label: "Kit contents", type: "list", maxItems: 8, itemFields: [{ key: "label", label: "Item", type: "text", max: 80 }, { key: "body", label: "What it is for", type: "textarea", max: 300 }, { key: "image", label: "Photo URL", type: "url" }] },
      { key: "steps", label: "Steps", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step heading", type: "text", max: 80 }, { key: "body", label: "Step text", type: "textarea", max: 600 }, { key: "image", label: "Step photo URL", type: "url" }] },
      T("tips_title", "Tips heading", 80),
      { key: "tips", label: "Important tips", type: "list", maxItems: 10, itemFields: [{ key: "text", label: "Tip", type: "text", max: 200 }] },
      T("note_title", "Note heading", 80), P("note", "Important note", 600),
    ],
    defaults: {
      title: "Peptide Reconstitution Guide",
      intro: "The guide supplied with the Titan Reconstitution Kit, step by step.",
      kit_title: "Reconstitution Kit contents",
      kit: [
        { label: "1 × 3 mL Luer Lock Syringe", body: "For measuring and transferring bacteriostatic water.", image: "/__l5e/assets-v1/2b49bde6-f54b-4700-8c8a-ad88670087ee/titan-guide-clean-kit-luer-syringe.png" },
        { label: "1 × 38 mm Safety Hypodermic Needle", body: "Use to draw bacteriostatic water (BAC) from vial (hold vial upright on a slight angle).", image: "/__l5e/assets-v1/fb9641cd-46a2-4ac7-a57f-9744276895a4/titan-guide-clean-kit-needle-38.png" },
        { label: "2 × 16 mm Safety Hypodermic Needles", body: "1st needle – transfer BAC water into peptide vial. 2nd needle (optional) – used as a vent needle to assist with negative air pressure.", image: "/__l5e/assets-v1/6c1c75f4-3a05-473b-adcc-b3a4d1d54b16/titan-guide-clean-kit-needles-16.png" },
        { label: "1 × Alcohol Prep Pad", body: "Used to wipe down vial tops.", image: "/__l5e/assets-v1/d4e5683d-d055-43a0-8ff7-f72c6185ffff/titan-guide-recon-kit-alcohol.png" },
      ],
      steps: [
        { title: "Prepare", body: "Wash and dry your hands.\nEnsure your workspace is clean.\nWipe the rubber stoppers of both the BAC water vial and peptide vial with the alcohol prep pad.\nAllow to air dry for a few seconds.", image: "/__l5e/assets-v1/22e2a727-c123-49bd-a9dd-677ac6bec20e/titan-guide-clean-recon-step-1.png" },
        { title: "Draw BAC water", body: "Attach the 38 mm Safety Hypodermic Needle to the 3 mL syringe (Luer Lock).\nHold the BAC water vial upright on a slight angle.\nInsert the needle and draw the required amount of BAC water (e.g. 1–3 mL as per product instructions).", image: drawBacWaterPhoto.url },
        { title: "Swap needle", body: "Remove the 38 mm Safety Hypodermic Needle and safely dispose of it in a sharps container.\nAttach a new 16 mm Safety Hypodermic Needle to the syringe.\nDo not touch the sterile needle or tip.", image: "/__l5e/assets-v1/532b20be-2163-4069-91e6-5419178a4e76/titan-guide-clean-recon-step-3.png" },
        { title: "Transfer to peptide vial", body: "Insert the 16 mm Safety Hypodermic Needle through the peptide vial’s rubber stopper.\nSlowly inject the BAC water into the vial.\nIf desired, you can insert a second 16 mm Safety Hypodermic Needle as a vent (in a separate spot on the stopper) to help release negative air pressure.\nInject slowly to avoid foaming.", image: "/__l5e/assets-v1/79d40f69-8e31-46d4-a28f-bf2dca2108e8/titan-guide-clean-recon-step-4.png" },
        { title: "Mix gently", body: "Once all the BAC water is added, remove the needle(s).\nGently swirl the vial between your fingers until the powder is fully dissolved.\nDo not shake vigorously.", image: "/__l5e/assets-v1/35f43d81-1b84-4ca8-8378-964ab021b8b8/titan-guide-clean-recon-step-5.png" },
        { title: "Store correctly", body: "Store in the refrigerator (2–8°C).\nTake note of the reconstitution date.\nOn average, the vial is good for 4 to 6 weeks, pending use, storage conditions and frequency of use.", image: "/__l5e/assets-v1/c21d2d22-4be6-4aa6-8b66-7c06cb28a405/titan-guide-clean-recon-step-6.png" },
      ],
      tips_title: "Important tips",
      tips: [
        { text: "Always use sterile equipment." },
        { text: "Use a new needle for each step." },
        { text: "Inject slowly to reduce foaming." },
        { text: "Gently swirl – do not shake." },
        { text: "Avoid touching sterile needle tips." },
        { text: "Keep refrigerated (2–8°C)." },
      ],
      note_title: "Important note",
      note: "The second 16 mm Safety Hypodermic Needle is optional and used as a vent needle to assist with negative air pressure while transferring. Do not leave needles in the vial after reconstitution. Always use sterile technique and single use needles only.",
    },
  },
  {
    id: "guide_administration",
    group: "Guides",
    title: "Administration Kit guide (page content)",
    description: "The native step-by-step Administration Kit guide on the Titan Guides page. Text and photos come from the supplied guide document.",
    fields: [
      T("title", "Guide heading", 80), P("intro", "Guide introduction", 400),
      T("kit_title", "Kit contents heading", 80),
      { key: "kit", label: "Kit contents", type: "list", maxItems: 8, itemFields: [{ key: "label", label: "Item", type: "text", max: 80 }, { key: "body", label: "What it is for", type: "textarea", max: 300 }, { key: "image", label: "Photo URL", type: "url" }] },
      { key: "steps", label: "Steps", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step heading", type: "text", max: 80 }, { key: "body", label: "Step text", type: "textarea", max: 600 }, { key: "image", label: "Step photo URL", type: "url" }] },
      T("tips_title", "Tips heading", 80),
      { key: "tips", label: "Important tips", type: "list", maxItems: 10, itemFields: [{ key: "text", label: "Tip", type: "text", max: 200 }] },
      T("note_title", "Remember heading", 80), P("note", "Remember note", 600),
    ],
    defaults: {
      title: "Administering Kit Usage Guide",
      intro: "The guide supplied with the Titan Administration Kit, step by step. Clean. Precise. Confident.",
      kit_title: "Kit contents",
      kit: [
        { label: "5 × 1 mL Insulin Syringes", body: "100 unit markings (U-100).\nFor accurate, precise dosing.\nIndividually sterile and single use only.", image: "/__l5e/assets-v1/787e9df2-3d76-4142-a627-eca0ca89c696/titan-guide-clean-kit-insulin-syringes.png" },
        { label: "5 × Alcohol Prep Wipes", body: "Used to clean the injection site.\nKills surface bacteria.\nIndividually wrapped and sterile.", image: "/__l5e/assets-v1/466511c2-8837-4a97-9679-76a0997decb1/titan-guide-admin-kit-wipes.png" },
      ],
      steps: [
        { title: "Wash & prepare", body: "Wash your hands thoroughly with soap and water.\nEnsure your workspace is clean.\nGather your syringe and alcohol prep wipe.", image: "/__l5e/assets-v1/439bf610-15be-4c5a-9a12-e7a9a7f14995/titan-guide-clean-admin-step-1.png" },
        { title: "Check syringe", body: "Ensure the syringe is sealed and sterile.\nCheck the 100 unit (U-100) markings.\nDo not use if the packaging is damaged.", image: "/__l5e/assets-v1/f0a1ac21-8a8f-4e96-a96e-e7d0d6a55f17/titan-guide-clean-admin-step-2.png" },
        { title: "Clean injection site", body: "Use an alcohol prep wipe to clean the chosen injection site (e.g. abdomen, outer thigh or upper arm).\nAllow the skin to air dry completely (around 10–30 seconds).", image: "/__l5e/assets-v1/76b5106b-f23d-4cd8-b6db-1dea076f8d62/titan-guide-clean-admin-step-3.png" },
        { title: "Inject", body: "Gently pinch the skin (if needed).\nInsert the needle at a 90° angle (45° can be used if very lean).\nSlowly depress the plunger until the full dose is delivered.\nKeep the needle in place for 5–10 seconds, then remove smoothly.", image: "/__l5e/assets-v1/d790e3d9-5024-4d7e-8cb6-291d88606afa/titan-guide-clean-admin-step-4.png" },
        { title: "After injection", body: "Gently press the site with a clean alcohol wipe.\nDo not rub vigorously.\nA small drop of blood is normal and should stop quickly.", image: "/__l5e/assets-v1/d57d0b7c-9709-4687-b1a1-cac717157b1b/titan-guide-clean-admin-step-5.png" },
        { title: "Dispose safely", body: "Immediately dispose of the used syringe in an approved sharps container.\nNever reuse syringes.\nDo not dispose in regular household waste.", image: "/__l5e/assets-v1/e492447d-0b80-4a65-9c11-d7a008a15c49/titan-guide-clean-admin-step-6.png" },
        { title: "Injection sites", body: "Abdomen (avoid 2–3 cm around navel).\nOuter thighs.\nUpper arms (outer area).\nRotate injection sites to reduce irritation.\nUse a different area each time.\nAvoid injecting into the same spot repeatedly.", image: "/__l5e/assets-v1/572c36c5-a74c-4e98-95c7-bb013b4e68b0/titan-guide-clean-admin-step-7.png" },
      ],
      tips_title: "Important tips",
      tips: [
        { text: "Always use a new, sterile syringe for each injection." },
        { text: "Use alcohol prep wipes and let the skin dry." },
        { text: "Inject slowly for comfort." },
        { text: "Rotate injection sites." },
        { text: "Dispose of used syringes in a sharps container." },
        { text: "Do not share syringes." },
      ],
      note_title: "Remember",
      note: "Single use only.\nKeep out of reach of children.\nStore syringes in a cool, dry place.\nFollow your specific dosing instructions.\nIf you experience persistent redness, swelling or irritation, seek professional advice.",
    },
  },
  {
    id: "guide_pages",
    group: "Guides",
    title: "Pen Guides page",
    fields: [
      T("eyebrow", "Small heading", 60), T("title", "Title", 80), P("intro", "Introduction", 600),
      { key: "banner_image", label: "Pen guide banner artwork", type: "image" },
      { key: "banner_image_light", label: "Light theme pen guide banner artwork", type: "image", help: "Leave empty to use the existing light discovery artwork." }, T("shop_label", "Shop Pens button", 60),
      T("reusable_title", "Reusable pen guide heading", 80),
      { key: "reusable_steps", label: "Reusable pen steps", type: "list", maxItems: 12, itemFields: [{ key: "title", label: "Step title", type: "text", max: 80 }, { key: "body", label: "Step text", type: "textarea", max: 500 }] },
      T("products_title", "Product information heading", 80), P("products_body", "Product information text", 300),
    ],
    defaults: {
      eyebrow: "Compare • Learn • Explore", title: "Titan Pen Guides", banner_image: "", banner_image_light: "", shop_label: "Shop Pens",
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
    fields: [T("title", "Page title", 80), P("intro", "Intro text", 600), T("empty_text", "No certificates message", 200), T("verify_label", "Verify button label (leave empty to hide)", 40), U("verify_url", "Verify button link")],
    defaults: { title: "Product Certificates", intro: "Browse the available Certificates of Analysis attached to our products.", empty_text: "Certificates will appear here as they are added.", verify_label: "", verify_url: "https://peptidetestcanada.ca/verify" },
  },
  {
    id: "review_submission", group: "Pages", title: "Leave a review form & buttons",
    shortcut: {tab:"reviews",label:"Approve customer reviews"},
    fields: [T("cta_label","Homepage / footer button label",40),T("heading","Form heading",80),P("intro","Form introduction",400),P("consent","Public display consent text",300),T("submit_label","Submit button label",40),P("success","Submission confirmation",300)],
    defaults: {cta_label:"Leave a review",heading:"Leave a review",intro:"Tell us about your Titan Labs experience. Your review will be checked by our team before it appears on the website.",consent:"I confirm this is my genuine experience and give Titan Labs permission to display my review, name and optional location on the website.",submit_label:"Submit review",success:"Thank you! Your review has been received and is awaiting Admin approval."},
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
    description: "Reward amounts and limits always come from the Discounts settings. Use {reward}, {every}, {expiry_days}, {max_credits} and {cap} to insert the live values.",
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
        { title: "Share it", body: "Friends enter your code at checkout. Some codes also give them a discount — shown before they pay. A referral code can be used once per person, on their first successful order, and they'll need to sign in or join to use it." },
        { title: "Earn rewards", body: "Every {every} paid first orders placed with your code earns you {reward} off your next purchase. Discounted orders count too. Cancelled, failed or refunded orders don't count." },
        { title: "Use them", body: "Use up to {max_credits} rewards on one order. They stack with your other discounts up to a maximum of {cap} off a single purchase. Rewards expire {expiry_days} days after they're earned and have no cash value." },
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
    id: "cart_summary", group: "Cart & checkout", title: "Floating catalogue order summary", fields: [T("label", "Order summary label", 40)], defaults: { label: "Order Summary" },
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
    id: "checkout_offer",
    group: "Cart & checkout",
    title: "Checkout new-member offer banner",
    description: "Separate from the homepage banner. Write {percent} where the discount should appear — the amount comes from Discounts settings.",
    shortcut: { tab: "discounts", label: "Change offer amount/settings" },
    fields: [B("visible", "Show on checkout"), T("text", "Banner text", 200), T("join_label", "Join link label", 30), T("login_label", "Log in link label", 30)],
    defaults: { visible: true, text: "New members receive {percent}% off their first purchase.", join_label: "Join", login_label: "Log in" },
  },
  {
    id: "checkout_copy",
    group: "Cart & checkout",
    title: "Checkout guest & member wording",
    description: "Explanatory wording only. Discounts, eligibility, acknowledgements and payment rules are not affected.",
    fields: [
      T("intro", "Checkout introduction", 200),
      T("login_label", "Log in button", 40),
      T("join_label", "Join button", 40),
      T("guest_label", "Continue as guest button", 40),
      P("choice_note", "Text under the buttons", 300),
      T("guest_active_title", "Guest mode heading", 80),
      P("guest_active_body", "Guest mode text ({login} becomes a Log in link)", 300),
      P("guest_confirmed_note", "Guest order confirmation note", 300),
    ],
    defaults: {
      intro: "Confirm your delivery details and review your order.",
      login_label: "Log in",
      join_label: "Join as a member",
      guest_label: "Continue as guest",
      choice_note: "Your cart is saved while you log in. Guests can check out without an account; member and referral rewards need an account.",
      guest_active_title: "Checking out as a guest.",
      guest_active_body: "Your confirmation will go to the email you enter below. {login} instead to use member rewards.",
      guest_confirmed_note: "Guest order: your confirmation is sent to the email you entered. Keep your order number for any questions.",
    },
  },
  {
    id: "product_page",
    group: "Pages",
    title: "Product page & catalogue labels",
    shortcut: { tab: "products", label: "Manage products" },
    fields: [
      T("coa_heading", "COA section heading", 80), T("coa_action", "COA link label", 40),
      T("usage_heading", "Product information heading", 80),
      T("more_heading", "\"More products\" heading (use {catalogue} for the catalogue name)", 80),
      T("link_fallback", "Default label for product links", 40),
      T("section_range", "Catalogue tab: Range", 30),
      T("section_pens", "Catalogue tab: Pens", 30),
      T("section_equipment", "Catalogue tab: Equipment", 30),
    ],
    defaults: { coa_heading: "Certificates of Analysis", coa_action: "View COA", usage_heading: "How to use this product", more_heading: "More from {catalogue}", link_fallback: "View link", section_range: "Range", section_pens: "Pens", section_equipment: "Equipment" },
  },
  {
    id: "research_entry",
    group: "Pages",
    title: "Research Lab entry labels",
    description: "Labels on each Research Lab entry. Scientific content and research-use notices are managed in Research Lab.",
    fields: [
      T("map_area", "Research area label", 40), T("map_evidence", "Evidence label", 40), T("map_refs", "References label", 40), T("map_check", "Source check label", 40),
      T("quick_read", "Quick read label", 40), T("level", "Research level heading", 60), T("studying", "\"What researchers are studying\" heading", 80),
      T("related_eyebrow", "Related research label", 40), T("related_title", "Related research heading", 80), T("blends", "Titan Blends heading", 60),
      T("details", "Research details heading", 60), T("composition", "Composition heading", 60), T("crossref", "Cross-reference heading", 80), T("references", "References heading", 40),
    ],
    defaults: {
      map_area: "Research area", map_evidence: "Evidence", map_refs: "References", map_check: "Source check",
      quick_read: "Quick read", level: "Research level", studying: "What researchers are studying",
      related_eyebrow: "Related research", related_title: "Explore similar research", blends: "Found in Titan Blends",
      details: "Research details", composition: "Composition & identifiers", crossref: "Cross-reference & regulatory status", references: "References",
    },
  },
  {
    id: "nav_header",
    group: "Navigation",
    title: "Header extra links",
    description: "Extra text links in the top menu, shown after the built-in buttons. Log in, account, Admin and cart stay automatic.",
    fields: [{ key: "links", label: "Links", type: "list", maxItems: 6, itemFields: [{ key: "label", label: "Label", type: "text", max: 30 }, { key: "url", label: "Link", type: "url" }, { key: "visible", label: "Visible", type: "toggle" }] }],
    defaults: { links: [] },
  },
  {
    id: "nav_labels",
    group: "Navigation",
    title: "Menu & footer labels",
    description: "Leave a footer support/legal label empty to hide that link. Destinations stay fixed so legal links always work.",
    fields: [
      T("research_label", "Research Lab menu label", 40),
      T("legal_terms", "Footer: Terms & Conditions", 40),
      T("legal_research", "Footer: Research Use Notice", 40),
      T("legal_contact", "Footer: Contact & Customer Support", 40),
      T("legal_privacy", "Footer: Privacy Policy", 40),
    ],
    defaults: { research_label: "Titan Research Lab", legal_terms: "Terms & Conditions", legal_research: "Research Use Notice", legal_contact: "Contact & Customer Support", legal_privacy: "Privacy Policy" },
  },
  {
    id: "nav_footer",
    group: "Navigation",
    title: "Footer extra links",
    description: "Links in the footer menu below the main pages. Internal links start with /.",
    fields: [{ key: "links", label: "Links", type: "list", maxItems: 12, itemFields: [{ key: "label", label: "Label", type: "text", max: 40 }, { key: "url", label: "Link", type: "url" }, { key: "visible", label: "Visible", type: "toggle" }] }],
    defaults: {
      links: [
        { label: "Guides", url: "/pen-guide", visible: true },
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
export function canonicalUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return "";
  // No control chars, whitespace, backslashes or HTML-breaking characters anywhere.
  if (/[\u0000-\u001f\u007f\s\\<>"'`]/.test(s)) return null;
  if (s.startsWith("/")) return s.startsWith("//") ? null : s;
  if (!/^https?:\/\/[^/]/i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? s : null;
  } catch {
    return null;
  }
}
export const isSafeUrl = (v: string) => canonicalUrl(v) !== null;

/** Visible, labelled, safe items from a structured link list (keeps saved order). */
export function visibleCmsLinks(links: unknown): { label: string; url: string }[] {
  if (!Array.isArray(links)) return [];
  return links
    .filter((l) => l && l.visible !== false && typeof l.label === "string" && l.label.trim() && typeof l.url === "string" && canonicalUrl(l.url))
    .map((l) => ({ label: l.label.trim(), url: canonicalUrl(l.url)! }));
}
export const isExternalUrl = (v: string) => /^https?:\/\//i.test(v.trim());
/** Render-only rename of the legacy "Pen Guides" → /pen-guide nav entry to "Guides"; every other label is returned unchanged. */
export function guideNavLabel(label: string, url: string): string {
  const path = (url.trim().split(/[?#]/)[0] ?? "").replace(/\/+$/, "");
  return path === "/pen-guide" && /^(titan\s+)?pen\s+guides?$/i.test(label.trim()) ? "Guides" : label;
}

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
    case "product":
      return z.string().max(160).regex(/^[a-z0-9-]*$/, "Choose a valid catalogue product");
    case "toggle":
      return z.boolean();
    case "choice":
      return z.enum(f.options.map((o) => o[0]) as [string, ...string[]]);
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
    if (Object.hasOwn(schema, k) && schema[k]!.safeParse(v).success) out[k] = v;
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

/** Reset guard: refuses to clear a section unless it still matches the snapshot the editor showed. */
export function assertResetBase(id: string, currentRaw: string | undefined, base: Record<string, unknown>) {
  const section = cmsSection(id);
  if (!section) throw new Error("Unknown content section");
  const current: Record<string, unknown> = cmsValues({ [cmsKey(id)]: currentRaw ?? "" }, id);
  for (const f of section.fields) {
    if (JSON.stringify(current[f.key]) !== JSON.stringify(base[f.key])) {
      throw new Error(`"${f.label}" was changed by someone else. Reload before resetting.`);
    }
  }
}
