import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, FlaskConical, Home, LogIn, Microscope, Shield, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/CartSheet";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSiteContent } from "@/lib/useCatalog";
import { catalogueName, HEADER_TABS, headerDisplayMode, headerLayout, headerNavAlign, homeValue, pageSectionOrder } from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import headerImage from "@/assets/titan-light-header.jpg";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { data: content } = useSiteContent();

  const layout = headerLayout(content);
  const navAlign = headerNavAlign(content);
  const label = (key: string) => homeValue(content, key);
  const tabOrder = pageSectionOrder(content, "header_layout_order", HEADER_TABS);
  const display = (key: string) => headerDisplayMode(content, key);
  const pageName = homeValue(content, "home_headline");
  const headerTitle = /^titan labs(?:\s*\/\/)?\s*aus(?:tralia)?$/i.test(pageName.trim())
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
        <Button key={key} asChild variant="outline" size="icon" className="titan-nav-icon">
          <Link to={to} aria-label={text} title={text}><Icon /></Link>
        </Button>
      );
    }
    return (
      <Button key={key} asChild variant={variant} className="font-bold uppercase">
        <Link to={to}>{text}</Link>
      </Button>
    );
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const nav = (
    <nav
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2",
        navAlign === "left" && "justify-start",
        navAlign === "center" && "justify-center",
        navAlign === "right" && "justify-end",
      )}
    >
      {tabOrder.map((tab) => {
        if (tab === "home") return navButton(tab, "/", "header_nav_home", Home);
        if (tab === "range") return <Button key={tab} asChild variant="outline" size="icon" className="titan-nav-icon"><Link to="/range" aria-label={catalogueName(content)} title={catalogueName(content)}><FlaskConical /></Link></Button>;
        if (tab === "research") return <Button key={tab} asChild variant="outline" size="icon" className="titan-nav-icon"><Link to="/research" aria-label="Titan Research Lab" title="Titan Research Lab"><Microscope /></Link></Button>;
        if (tab === "calculator") return navButton(tab, "/calculator", "header_nav_calculator", Calculator, "outline");
        if (tab === "admin" && signedIn && isAdmin) return navButton(tab, "/admin", "header_nav_admin", Shield, "outline");
        if (tab === "account" && signedIn) return navButton(tab, "/account", "header_nav_account", UserRound, "outline");
        if (tab === "login" && !signedIn) return navButton(tab, "/auth", "header_nav_login", LogIn, "outline");
        if (tab === "signup" && !signedIn) return navButton(tab, "/auth/signup", "header_nav_signup", UserPlus, "outline");
        if (tab === "cart") return <CartSheet key={tab} />;
        return null;
      })}
    </nav>
  );

  return (
    <header className="border-b border-primary/25 bg-background shadow-lg">
      <div className="relative overflow-hidden">
        <img src={headerImage} alt="" width={1920} height={768} className="titan-future-art absolute inset-0 h-full w-full object-cover object-center" />
        <div className="titan-header-surface absolute inset-0" />
        <div
          className={cn(
            "relative mx-auto min-h-32 max-w-7xl items-center gap-4 px-4 py-6 sm:min-h-36 sm:px-6",
            layout === "inline" && "grid grid-cols-[minmax(0,1fr)_auto]",
            layout === "stacked" && "flex flex-col items-stretch gap-4",
            layout === "centred" && "flex flex-col items-center gap-4",
          )}
        >
          <Link
            to="/"
            aria-label={`${pageName} home`}
            className={cn("min-w-0", layout === "centred" && "flex justify-center")}
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
