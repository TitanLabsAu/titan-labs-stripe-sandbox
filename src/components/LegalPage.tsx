import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RichText } from "@/components/RichText";
import { TEXT_ALIGN_CLASS, type TextAlign } from "@/lib/homeContent";
import { cn } from "@/lib/utils";

function LegalAnchorScroll() {
  const hash = useRouterState({ select: (state) => state.location.hash });

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.replace(/^#/, ""));
    target?.scrollIntoView({ block: "start" });
  }, [hash]);

  return null;
}

export function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-14">
        <LegalAnchorScroll />
        <p className="technical-label text-accent">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-medium uppercase text-foreground sm:text-4xl">{title}</h1>
        <div className="mt-8 max-w-3xl space-y-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  id,
  heading,
  text,
  align = "left",
}: {
  id?: string;
  heading: string;
  text: string;
  align?: TextAlign;
}) {
  // The saved copy sometimes repeats the section title on its first line.
  const body = text.replace(
    new RegExp(`^\\s*${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\n`, "i"),
    "",
  );

  return (
    <section id={id} className="industrial-panel scroll-mt-6 border-l-2 border-l-primary p-6 sm:p-8">
      <h2 className="font-display text-lg font-extrabold uppercase text-foreground">{heading}</h2>
      <div className="mt-2 h-px w-12 bg-primary" />
      <div className={cn("mt-5 text-sm text-muted-foreground", TEXT_ALIGN_CLASS[align])}>
        <RichText text={body} />
      </div>
    </section>
  );
}
