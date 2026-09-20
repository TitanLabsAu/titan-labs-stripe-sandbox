import { useSiteContent, useSiteLinks } from "@/lib/useCatalog";
import { RichText } from "@/components/RichText";
import { contentAlign, homeValue, TEXT_ALIGN_CLASS } from "@/lib/homeContent";
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

  return (
    <footer className="relative overflow-hidden border-t border-border bg-secondary text-xs text-muted-foreground">
      <img src={footerImage} alt="" width={1920} height={768} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-50" />
       <div className="brand-footer-shade absolute inset-0" />
       <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 border-b border-border pb-10 md:grid-cols-[1.15fr_0.85fr_1fr]">
          <div>
            <TitanLogo size={72} />
            <p className={cn("mt-5 max-w-sm whitespace-pre-wrap text-sm leading-6", TEXT_ALIGN_CLASS[contentAlign(content, "footer_about")])}>
              <RichText text={label("footer_about")} />
            </p>
          </div>
          <div>
            <p className="font-display text-xs font-black uppercase text-foreground">{label("footer_nav_title")}</p>
            <div className="mt-4 grid gap-3 font-bold uppercase">
              <Link to="/">{label("header_nav_home")}</Link>
              <Link to="/range">{label("header_nav_range")}</Link>
              <Link to="/auth">{label("header_nav_login")}</Link>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-display text-xs font-black uppercase text-foreground">{standardTitle}</p>
            <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" /> {label("footer_point_1")}</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /> {label("footer_point_2")}</p>
            <p className="flex items-center gap-3"><FlaskConical className="h-4 w-4 text-accent" /> {label("footer_point_3")}</p>
          </div>
        </div>
        {siteLinks && siteLinks.length > 0 ? <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2">{siteLinks.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-accent hover:text-primary">{l.label}</a>)}</p> : null}
        <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <p className={cn("whitespace-pre-wrap", TEXT_ALIGN_CLASS[contentAlign(content, "home_footer_text")])}><RichText text={homeValue(content, "home_footer_text")} /></p>
          <p className={cn("whitespace-pre-wrap font-bold uppercase text-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "footer_notice")])}>
            <RichText text={label("footer_notice")} />
          </p>
        </div>
      </div>
    </footer>
  );
}
