import { ChristmasSectionDecor } from "@/components/christmas/ChristmasTheme";
import { ThemedContentImage } from "@/components/ThemedImage";
import { cmsValues, guideNavLabel } from "@/lib/storefrontContent";
import { CmsLink } from "@/components/CmsLink";
import { useSiteContent, useSiteLinks } from "@/lib/useCatalog";
import { RichText } from "@/components/RichText";
import { catalogueName, contentAlign, FOOTER_TABS, homeValue, pageSectionOrder, TEXT_ALIGN_CLASS } from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { FlaskConical, MapPin, ShieldCheck } from "lucide-react";
import { TitanLogo } from "@/components/TitanLogo";
import { TestingTransparencyBanner } from "@/components/TestingTransparencyBanner";

export function SiteFooter() {
  const { data: siteLinks } = useSiteLinks();
  const { data: content } = useSiteContent();
  const pageName = homeValue(content, "home_headline");
  const standardTitle = content?.["footer_standard_title"]?.trim() || `${pageName} standard`;
  const label = (key: string) => homeValue(content, key);
  const navLabels = cmsValues(content, "nav_labels");
  const tabOrder = pageSectionOrder(content, "footer_layout_order", FOOTER_TABS);
  const brand = cmsValues(content, "branding");
  const extraLinks = (cmsValues(content, "nav_footer").links as { label: string; url: string; visible: boolean }[]).filter((l) => l.visible && l.label.trim());

  return (
    <footer className="titan-site-footer relative overflow-hidden border-t border-primary/30 bg-background text-xs text-muted-foreground">
      {brand.footer_image ? <ThemedContentImage src={brand.footer_image} alt="" width={1920} height={768} loading="lazy" className="titan-future-art titan-future-art-footer absolute inset-0 h-full w-full object-cover" /> : null}
       <div className="titan-footer-surface absolute inset-0" />
       <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 border-b border-primary/25 pb-10 md:grid-cols-[1fr_1.2fr_1fr]">
          <div>
            <div className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">{pageName}</div>
            <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-accent">{homeValue(content, "header_tagline")}</p>
            <div className={cn("mt-5 max-w-sm whitespace-pre-wrap text-sm leading-6", TEXT_ALIGN_CLASS[contentAlign(content, "footer_about")])}>
              <RichText text={label("footer_about")} />
            </div>
            <TestingTransparencyBanner placement="footer" compact className="mt-5 max-w-md" />
          <div className="mt-5 space-y-2 text-xs">
            
            <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" /> {label("footer_point_1")}</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /> {label("footer_point_2")}</p>
            <p className="flex items-center gap-3"><FlaskConical className="h-4 w-4 text-accent" /> {label("footer_point_3")}</p>
          </div>
          </div>
          <div>
            <p className="font-display text-xs font-black uppercase text-foreground">{label("footer_nav_title")}</p>
            <div className="mt-4 grid grid-cols-2 items-start gap-x-6 gap-y-3 font-normal [&>a]:min-w-0 [&>a]:break-words [&>a]:transition-colors [&>a:hover]:text-primary">
               {tabOrder.map((tab) => {
                 if (tab === "home") return <Link key={tab} to="/">{label("header_nav_home")}</Link>;
                  if (tab === "range") return <Link key={tab} to="/range">{catalogueName(content)}</Link>;
                 if (tab === "research") return navLabels.research_label ? <Link key={tab} to="/research">{navLabels.research_label}</Link> : null;
                 if (tab === "calculator") return <Link key={tab} to="/calculator">{label("header_nav_calculator")}</Link>;
                 return <Link key={tab} to="/auth">{label("header_nav_login")}</Link>;
               })}
               <Link to="/reviews" hash="leave-review">{cmsValues(content,"review_submission").cta_label}</Link>
               <Link to="/research/protocol-stacks">Protocol Stacks</Link>
               {extraLinks.map((l, i) => <CmsLink key={i} href={l.url}>{guideNavLabel(l.label, l.url)}</CmsLink>)}
            </div>
          </div>
          <div><p className="font-display text-xs font-bold uppercase text-accent">{cmsValues(content, "footer_design").support_title}</p>
        <nav aria-label="Support and legal" className="mt-4 flex flex-col gap-3 font-normal">
          {navLabels.legal_terms ? <Link to="/terms" hash="terms" className="text-foreground hover:text-primary">{navLabels.legal_terms}</Link> : null}
          {navLabels.legal_research ? <Link to="/terms" hash="research-notice" className="text-foreground hover:text-primary">{navLabels.legal_research}</Link> : null}
          {navLabels.legal_contact ? <Link to="/contact" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary">{navLabels.legal_contact}</Link> : null}
          {navLabels.legal_privacy ? <Link to="/privacy" className="text-foreground hover:text-primary">{navLabels.legal_privacy}</Link> : null}
        </nav>
          </div>
        </div>
        {siteLinks && siteLinks.length > 0 ? <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2">{siteLinks.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-accent hover:text-primary">{l.label}</a>)}</p> : null}
        <div className="mt-8 grid gap-3 border-t border-primary/25 pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className={cn("whitespace-pre-wrap", TEXT_ALIGN_CLASS[contentAlign(content, "home_footer_text")])}><RichText text={homeValue(content, "home_footer_text")} /></div>
          <div className={cn("whitespace-pre-wrap font-bold uppercase text-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "footer_notice")])}>
            <RichText text={label("footer_notice")} />
          </div>
        </div>
      </div>
    <ChristmasSectionDecor />
    </footer>
  );
}



