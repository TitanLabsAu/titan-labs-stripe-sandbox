import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartSheet } from "@/components/CartSheet";
import { TitanLogo } from "@/components/TitanLogo";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function SiteHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const { isAdmin } = useIsAdmin();


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">
      <Link to="/" aria-label="Titan Labs Australia home">
        <TitanLogo size={52} />
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3">
        <Button asChild className="font-bold uppercase">
          <Link to="/">Home</Link>
        </Button>
        <Button asChild className="hidden font-bold uppercase sm:inline-flex">
          <Link to="/range">View the Range</Link>
        </Button>
        {signedIn && isAdmin ? (
          <Button asChild className="font-bold uppercase">
            <Link to="/admin">Admin</Link>
          </Button>
        ) : null}
        {signedIn ? (
          <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <Button className="font-bold uppercase">
                My account
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/account">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/orders">Current orders</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/order-history">Order history</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleSignOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button asChild className="font-bold uppercase">
              <Link to="/auth">Log in</Link>
            </Button>
            <Button asChild className="hidden font-bold uppercase sm:inline-flex">
              <Link to="/auth/signup">Create account</Link>
            </Button>
          </>
        )}
        <CartSheet />
      </nav>
    </header>
  );
}
