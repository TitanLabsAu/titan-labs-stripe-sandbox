import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/CartSheet";
import { TitanLogo } from "@/components/TitanLogo";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">
      <Link to="/" aria-label="Titan Labs Australia home">
        <TitanLogo size={52} />
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3">
        {signedIn ? (
          <Button asChild className="font-bold uppercase">
            <Link to="/account">My account</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost">
              <Link to="/auth">Log in</Link>
            </Button>
            <Button asChild className="hidden font-bold uppercase sm:inline-flex">
              <Link to="/auth">Create account</Link>
            </Button>
          </>
        )}
        <CartSheet />
      </nav>
    </header>
  );
}
