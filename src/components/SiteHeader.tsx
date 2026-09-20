import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, FlaskConical, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/CartSheet";
import { TitanLogo } from "@/components/TitanLogo";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSiteContent } from "@/lib/useCatalog";
import { headerLayout, headerNavAlign, homeValue } from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import headerImage from "@/assets/titan-light-header.jpg";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { data: content } = useSiteContent();

  const layout = headerLayout(content);
  const navAlign = headerNavAlign(content);
  const label = (key: string) => homeValue(content, key);

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
      <Button asChild variant="outline" size="icon" className="md:hidden">
        <Link to="/range" aria-label={label("header_nav_range")}><FlaskConical /></Link>
      </Button>
      <Button asChild variant="ghost" className="hidden font-bold uppercase sm:inline-flex">
        <Link to="/">{label("header_nav_home")}</Link>
      </Button>
      <Button asChild variant="ghost" className="hidden font-bold uppercase md:inline-flex">
        <Link to="/range">{label("header_nav_range")}</Link>
      </Button>
      <Button asChild variant="outline" size="icon">
        <Link to="/calculator" aria-label={label("header_nav_calculator")} title={label("header_nav_calculator")}><Calculator /></Link>
      </Button>
      {signedIn && isAdmin ? (
        <Button asChild variant="outline" size="icon" className="sm:hidden">
          <Link to="/admin" aria-label={label("header_nav_admin")}><Shield /></Link>
        </Button>
      ) : null}
      {signedIn && isAdmin ? (
        <Button asChild variant="outline" className="hidden font-bold uppercase sm:inline-flex">
          <Link to="/admin">{label("header_nav_admin")}</Link>
        </Button>
      ) : null}
      {signedIn ? (
        <Button asChild variant="outline" size="icon">
          <Link to="/account" aria-label={label("header_nav_account")}><UserRound /></Link>
        </Button>
      ) : (
        <>
          <Button asChild variant="outline" className="font-bold uppercase">
            <Link to="/auth">{label("header_nav_login")}</Link>
          </Button>
          <Button asChild variant="outline" className="hidden font-bold uppercase lg:inline-flex">
            <Link to="/auth/signup">{label("header_nav_signup")}</Link>
          </Button>
        </>
      )}
      <CartSheet />
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
