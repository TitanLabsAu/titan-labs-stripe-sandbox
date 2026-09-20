import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FlaskConical, Shield, UserRound } from "lucide-react";
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
import headerImage from "@/assets/titan-light-header.jpg";

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
    <header className="border-b border-border bg-background shadow-sm">
      <div className="relative overflow-hidden">
        <img src={headerImage} alt="" width={1920} height={768} className="absolute inset-0 h-full w-full object-cover object-center opacity-48" />
        <div className="brand-image-shade absolute inset-0" />
        <div className="relative mx-auto grid min-h-28 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 sm:px-6">
          <Link to="/" aria-label="Titan Labs Australia home" className="min-w-0">
            <TitanLogo size={54} />
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="outline" size="icon" className="md:hidden">
              <Link to="/range" aria-label="The range"><FlaskConical /></Link>
            </Button>
            <Button asChild variant="ghost" className="hidden font-bold uppercase sm:inline-flex">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" className="hidden font-bold uppercase md:inline-flex">
              <Link to="/range">The range</Link>
            </Button>
            {signedIn && isAdmin ? (
              <Button asChild variant="outline" size="icon" className="sm:hidden">
                <Link to="/admin" aria-label="Admin"><Shield /></Link>
              </Button>
            ) : null}
            {signedIn && isAdmin ? (
              <Button asChild variant="outline" className="hidden font-bold uppercase sm:inline-flex">
                <Link to="/admin">Admin</Link>
              </Button>
            ) : null}
            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
               <Button variant="outline" className="font-bold uppercase" size="icon">
                    <UserRound />
                    <span className="sr-only">My account</span>
                    <ChevronDown className="hidden h-4 w-4 sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild><Link to="/account">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/orders">Current orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/order-history">Order history</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleSignOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                 <Button asChild variant="outline" className="font-bold uppercase"><Link to="/auth">Log in</Link></Button>
                <Button asChild variant="outline" className="hidden font-bold uppercase lg:inline-flex"><Link to="/auth/signup">Join Titan</Link></Button>
              </>
            )}
            <CartSheet />
          </nav>
        </div>
      </div>
    </header>
  );
}
