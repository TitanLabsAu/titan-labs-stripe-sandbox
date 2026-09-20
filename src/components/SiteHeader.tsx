import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, FlaskConical, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/CartSheet";
import { TitanLogo } from "@/components/TitanLogo";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSiteContent } from "@/lib/useCatalog";
import { HEADER_TABS, headerLayout, headerNavAlign, homeValue, pageSectionOrder } from "@/lib/homeContent";
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
        if (tab === "home") return <Button key={tab} asChild variant="ghost" className="hidden font-bold uppercase sm:inline-flex"><Link to="/">{label("header_nav_home")}</Link></Button>;
        if (tab === "range") return <span key={tab} className="contents"><Button asChild variant="outline" size="icon" className="md:hidden"><Link to="/range" aria-label={label("header_nav_range")}><FlaskConical /></Link></Button><Button asChild variant="ghost" className="hidden font-bold uppercase md:inline-flex"><Link to="/range">{label("header_nav_range")}</Link></Button></span>;
        if (tab === "calculator") return <Button key={tab} asChild variant="outline" size="icon"><Link to="/calculator" aria-label={label("header_nav_calculator")} title={label("header_nav_calculator")}><Calculator /></Link></Button>;
        if (tab === "admin" && signedIn && isAdmin) return <span key={tab} className="contents"><Button asChild variant="outline" size="icon" className="sm:hidden"><Link to="/admin" aria-label={label("header_nav_admin")}><Shield /></Link></Button><Button asChild variant="outline" className="hidden font-bold uppercase sm:inline-flex"><Link to="/admin">{label("header_nav_admin")}</Link></Button></span>;
        if (tab === "account" && signedIn) return <Button key={tab} asChild variant="outline" size="icon"><Link to="/account" aria-label={label("header_nav_account")}><UserRound /></Link></Button>;
        if (tab === "login" && !signedIn) return <Button key={tab} asChild variant="outline" className="font-bold uppercase"><Link to="/auth">{label("header_nav_login")}</Link></Button>;
        if (tab === "signup" && !signedIn) return <Button key={tab} asChild variant="outline" className="hidden font-bold uppercase lg:inline-flex"><Link to="/auth/signup">{label("header_nav_signup")}</Link></Button>;
        if (tab === "cart") return <CartSheet key={tab} />;
        return null;
      })}
    </nav>
  );

  return (
    <header className="border-b border-border bg-background shadow-sm">
      <div className="relative overflow-hidden">
        <img src={headerImage} alt="" width={1920} height={768} className="absolute inset-0 h-full w-full object-cover object-center opacity-48" />
        <div className="brand-image-shade absolute inset-0" />
        <div
          className={cn(
            "relative mx-auto min-h-28 max-w-7xl items-center gap-3 px-3 py-4 sm:px-6",
            layout === "inline" && "grid grid-cols-[minmax(0,1fr)_auto]",
            layout === "stacked" && "flex flex-col items-stretch gap-4",
            layout === "centred" && "flex flex-col items-center gap-4",
          )}
        >
          <Link
            to="/"
            aria-label={`${homeValue(content, "home_headline")} home`}
            className={cn("min-w-0", layout === "centred" && "flex justify-center")}
          >
            <TitanLogo size={54} />
          </Link>
          {nav}
        </div>
      </div>
    </header>
  );
}
