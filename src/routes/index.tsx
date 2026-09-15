import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { products, formatPrice } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Labs Aus | Premium Research Peptides Australia" },
      {
        name: "description",
        content:
          "Titan Labs Aus supplies premium-quality, lab-tested research peptides and wellness compounds with discreet express shipping across Australia.",
      },
      { property: "og:title", content: "Titan Labs Aus | Premium Research Peptides" },
      {
        property: "og:description",
        content:
          "Premium quality, pure form, research use only. Create an account to browse pricing and order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const pillars = [
  { title: "Science Backed", body: "Formulas you can trust, batch tested for purity." },
  { title: "Premium Quality", body: "Only the highest grade compounds, every single vial." },
  { title: "Discreet Shipping", body: "Express post with insurance, fast and private." },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="bg-hero min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <TitanLogo size={52} />
        <nav className="flex items-center gap-3">
          {signedIn ? (
            <Button asChild className="font-bold uppercase">
              <Link to="/account">My account</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild className="font-bold uppercase">
                <Link to="/auth">Create account</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
          Premium quality ★ Pure form ★ Research use only
        </p>
        <h1 className="text-steel mt-5 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl">
          How far can you go
          <br />
          with Titan Labs?
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Australian-owned research supply. Lab-tested peptides and wellness compounds, shipped fast
          and discreetly. Create your free account to unlock ordering.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="shadow-glow font-bold uppercase tracking-wide">
            <Link to={signedIn ? "/account" : "/auth"}>
              {signedIn ? "Go to my account" : "Create your account"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-bold uppercase tracking-wide">
            <a href="#range">View the range</a>
          </Button>
        </div>
      </section>

      <section id="range" className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight text-foreground">
          The <span className="text-accent">range</span>
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.name}
              className="overflow-hidden rounded-xl border border-border bg-card/70 transition-transform hover:-translate-y-1"
            >
              <img
                src={p.image}
                alt={p.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-3 p-5">
                <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
                  {p.name}
                </h3>
                <span className="text-lg font-extrabold text-accent">{p.price}</span>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Full price list, starter packs and bulk discounts available once you're logged in.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card/60 p-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <div className="shadow-gold rounded-2xl border border-border bg-card/80 px-6 py-12">
          <h2 className="text-steel text-4xl font-extrabold uppercase tracking-tight">
            Join Titan Labs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sign up with your email, confirm it with the link we send, then complete your profile to
            start ordering.
          </p>
          <Button asChild size="lg" className="mt-8 font-bold uppercase tracking-wide">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p>Titan Labs Aus ★ Trusted source ★ Discreet shipping ★ Telegram @Titanlabsau</p>
        <p className="mt-2">Research use only. Not for human consumption.</p>
      </footer>
    </div>
  );
}
