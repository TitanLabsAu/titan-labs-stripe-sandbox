import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RichText } from "@/components/RichText";

export function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-14">
        <p className="technical-label text-accent">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-medium uppercase text-foreground sm:text-4xl">{title}</h1>
        <div className="mt-8 max-w-3xl space-y-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ id, heading, text }: { id?: string; heading: string; text: string }) {
  return (
    <section id={id} className="industrial-panel scroll-mt-6 border-l-2 border-l-primary p-6">
      <h2 className="font-display text-lg font-extrabold uppercase text-foreground">{heading}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        <RichText text={text} />
      </p>
    </section>
  );
}
