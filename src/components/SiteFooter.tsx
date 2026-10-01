import { useSiteContent, useSiteLinks } from "@/lib/useCatalog";
import { RichText } from "@/components/RichText";
import { catalogueName, contentAlign, FOOTER_TABS, homeValue, pageSectionOrder, TEXT_ALIGN_CLASS } from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { FlaskConical, MapPin, ShieldCheck } from "lucide-react";
import footerImage from "@/assets/titan-light-footer.jpg";
import { TitanLogo } from "@/components/TitanLogo";

export function SiteFooter() {
  const { data: siteLinks } = useSiteLinks();
  const { data: content } = useSiteContent();
  const pageName = homeValue(content, "home_headline");
  const standardTitle = content?.["footer_standard_title"]?.trim() || `${pageName} standard`;
  const label = (key: string) => homeValue(content, key);
  const tabOrder = pageSectionOrder(content, "footer_layout_order", FOOTER_TABS);

  return (
    <footer className="relative overflow-hidden border-t border-border bg-secondary text-xs text-muted-foreground">
      <img src={footerImage} alt="" width={1920} height={768} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-50" />
       <div className="brand-footer-shade absolute inset-0" />
       <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 border-b border-border pb-10 md:grid-cols-[1.15fr_0.85fr_1fr]">
          <div>
            <TitanLogo size={72} />
            <div className={cn("mt-5 max-w-sm whitespace-pre-wrap text-sm leading-6", TEXT_ALIGN_CLASS[contentAlign(content, "footer_about")])}>
              <RichText text={label("footer_about")} />
            </div>
          </div>
          <div>
            <p className="font-display text-xs font-black uppercase text-foreground">{label("footer_nav_title")}</p>
            <div className="mt-4 grid gap-3 font-bold uppercase">
               {tabOrder.map((tab) => {
                 if (tab === "home") return <Link key={tab} to="/">{label("header_nav_home")}</Link>;
                  if (tab === "range") return <Link key={tab} to="/range">{catalogueName(content)}</Link>;
                 if (tab === "calculator") return <Link key={tab} to="/calculator">{label("header_nav_calculator")}</Link>;
                 return <Link key={tab} to="/auth">{label("header_nav_login")}</Link>;
               })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-display text-xs font-black uppercase text-foreground">{standardTitle}</p>
            <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" /> {label("footer_point_1")}</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /> {label("footer_point_2")}</p>
            <p className="flex items-center gap-3"><FlaskConical className="h-4 w-4 text-accent" /> {label("footer_point_3")}</p>
          </div>
        </div>
        <nav aria-label="Legal" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-bold uppercase">
          <Link to="/terms" hash="terms" className="text-foreground hover:text-primary">Terms &amp; Conditions</Link>
          <Link to="/terms" hash="research-notice" className="text-foreground hover:text-primary">Research Use Notice</Link>
          <Link to="/privacy" className="text-foreground hover:text-primary">Privacy Policy</Link>
        </nav>
        {siteLinks && siteLinks.length > 0 ? <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2">{siteLinks.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-accent hover:text-primary">{l.label}</a>)}</p> : null}
        <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className={cn("whitespace-pre-wrap", TEXT_ALIGN_CLASS[contentAlign(content, "home_footer_text")])}><RichText text={homeValue(content, "home_footer_text")} /></div>
          <div className={cn("whitespace-pre-wrap font-bold uppercase text-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "footer_notice")])}>
            <RichText text={label("footer_notice")} />
          </div>
        </div>
      </div>
    </footer>
  );
}
