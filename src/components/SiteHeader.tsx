import { cmsValues, visibleCmsLinks } from "@/lib/storefrontContent";
import { CmsLink } from "@/components/CmsLink";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  PenTool,
  Calculator,
  FlaskConical,
  Home,
  LogIn,
  Microscope,
  Shield,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/CartSheet";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import {
  catalogueName,
  HEADER_TABS,
  headerDisplayMode,
  headerLayout,
  headerNavAlign,
  homeValue,
  pageSectionOrder,
} from "@/lib/homeContent";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navState = (to: string) => ({
    "aria-current":
      pathname === to || (to !== "/" && pathname.startsWith(to + "/"))
        ? ("page" as const)
        : undefined,
    className:
      pathname === to || (to !== "/" && pathname.startsWith(to + "/"))
        ? "border-primary bg-primary/10 text-primary"
        : undefined,
  });
  const [signedIn, setSignedIn] = useState(false);
  const { isAdmin } = useIsAdmin();
  const {products} = useProducts();
  const hasPens = products.some(p=>p.catalogueSection === "pens");
  const { data: content } = useSiteContent();

  const layout = headerLayout(content);
  const navAlign = headerNavAlign(content);
  const label = (key: string) => homeValue(content, key);
  const tabOrder = pageSectionOrder(
    content,
    "header_layout_order",
    HEADER_TABS,
  );
  const display = (key: string) => headerDisplayMode(content, key);
  const pageName = homeValue(content, "home_headline");
  const headerTitle = /^titan labs(?:\s*\/\/)?\s*aus(?:tralia)?$/i.test(
    pageName.trim(),
  )
    ? "TITAN LABS // AUS"
    : pageName;

  const navButton = (
    key: string,
    to: "/" | "/calculator" | "/admin" | "/account" | "/auth" | "/auth/signup",
    labelKey: string,
    Icon: typeof Home,
    variant: "ghost" | "outline" = "ghost",
  ) => {
    const text = label(labelKey);
    if (display(key) === "icon") {
      return (
        <Button
          key={key}
          asChild
          variant="outline"
          size="icon"
          className="titan-nav-icon"
        >
          <Link to={to} {...navState(to)} aria-label={text} title={text}>
            <Icon />
          </Link>
        </Button>
      );
    }
    return (
      <Button
        key={key}
        asChild
        variant={variant}
        className="titan-nav-icon font-bold uppercase"
      >
        <Link to={to} {...navState(to)}>
          {text}
        </Link>
      </Button>
    );
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const nav = (
    <nav
      aria-label="Main navigation"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2",
        navAlign === "left" && "justify-start",
        navAlign === "center" && "justify-center",
        navAlign === "right" && "justify-end",
      )}
    >
      {tabOrder.map((tab) => {
        if (tab === "home") return navButton(tab, "/", "header_nav_home", Home);
        if (tab === "range")
          return (
            <Button
              key={tab}
              asChild
              variant="outline"
              size="icon"
              className="titan-nav-icon"
            >
              <Link
                to="/range"
                {...navState("/range")}
                aria-label={catalogueName(content)}
                title={catalogueName(content)}
              >
                {display(tab) === "icon" ? <FlaskConical /> : <span>{catalogueName(content)}</span>}
              </Link>
            </Button>
          );
        if (tab === "research")
          return (
            <Button
              key={tab}
              asChild
              variant="outline"
              size="icon"
              className="titan-nav-icon"
            >
              <Link
                to="/research"
                {...navState("/research")}
                aria-label={cmsValues(content, "nav_labels").research_label || "Titan Research Lab"}
                title={cmsValues(content, "nav_labels").research_label || "Titan Research Lab"}
              >
                {display(tab) === "icon" ? <Microscope /> : <span>{cmsValues(content, "nav_labels").research_label || "Research Lab"}</span>}
              </Link>
            </Button>
          );
        if (tab === "pens" && hasPens)
          return (
            <Button key={tab} asChild variant="outline" size="icon" className="titan-nav-icon">
              <Link
                to="/pens"
                {...navState("/pens")}
                aria-label="Disposable Pens"
                title="Disposable Pens"
              >
                {display(tab) === "icon" ? <PenTool /> : <span>Pens</span>}
              </Link>
            </Button>
          );
        if (tab === "calendar" && signedIn)
          return (
            <Button key={tab} asChild variant="outline" size="icon" className="titan-nav-icon">
              <Link
                to="/calendar"
                {...navState("/calendar")}
                aria-label="My Calendar"
                title="My Calendar"
              >
                {display(tab) === "icon" ? <CalendarDays /> : <span>My Calendar</span>}
              </Link>
            </Button>
          );
        if (tab === "calculator")
          return navButton(
            tab,
            "/calculator",
            "header_nav_calculator",
            Calculator,
            "outline",
          );
        if (tab === "admin" && signedIn && isAdmin)
          return navButton(
            tab,
            "/admin",
            "header_nav_admin",
            Shield,
            "outline",
          );
        if (tab === "account" && signedIn)
          return navButton(
            tab,
            "/account",
            "header_nav_account",
            UserRound,
            "outline",
          );
        if (tab === "login" && !signedIn)
          return navButton(tab, "/auth", "header_nav_login", LogIn, "outline");
        if (tab === "signup" && !signedIn)
          return navButton(
            tab,
            "/auth/signup",
            "header_nav_signup",
            UserPlus,
            "outline",
          );
        if (tab === "cart") return <span key={tab} className="hidden md:contents"><CartSheet /></span>;
        return null;
      })}
      {visibleCmsLinks(cmsValues(content, "nav_header").links).map((l, i) => (
        <Button key={`cms-${i}`} asChild variant="outline" size="sm" className="titan-nav-icon w-auto px-3 text-xs font-bold uppercase">
          <CmsLink href={l.url}>{l.label}</CmsLink>
        </Button>
      ))}
    </nav>
  );

  return (
    <header className="titan-site-header border-b border-primary/25 bg-background">
      <div className="relative overflow-hidden">
        {cmsValues(content, "branding").header_image ? <img
          src={cmsValues(content, "branding").header_image}
          alt=""
          width={1920}
          height={768}
          className="titan-future-art absolute inset-0 h-full w-full object-cover object-center"
        /> : null}
        <div className="titan-header-surface absolute inset-0" />
        <div
          className={cn(
            "relative page-shell items-center gap-4 py-4 sm:py-4",
            layout === "inline" &&
              "flex flex-col items-stretch lg:grid lg:grid-cols-[minmax(0,1fr)_auto]",
            layout === "stacked" && "flex flex-col items-stretch gap-4",
            layout === "centred" && "flex flex-col items-center gap-4",
          )}
        >
          <Link
            to="/"
            aria-label={`${pageName} home`}
            className={cn(
              "min-w-0",
              layout === "centred" && "flex justify-center",
              layout === "inline" && "text-center sm:text-left",
            )}
          >
            <span className="block font-display text-2xl font-black uppercase tracking-wide text-foreground drop-shadow-md sm:text-3xl">
              {headerTitle}
            </span>
            <span className="mt-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-accent">
              {homeValue(content, "header_tagline")}
            </span>
          </Link>
          {nav}
        </div>
      </div>
    </header>
  );
}
