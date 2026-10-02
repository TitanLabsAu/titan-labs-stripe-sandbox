import { TitanPageHeading } from "@/components/TitanPageHeading";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, FileText } from "lucide-react";
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

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <LegalAnchorScroll />
        <TitanPageHeading
          as="h1"
          icon={FileText}
          eyebrow={eyebrow}
          title={title}
        />
        <div className="mt-8 max-w-4xl space-y-4">{children}</div>
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
    new RegExp(
      `^\\s*${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\n`,
      "i",
    ),
    "",
  );

  const hash = useRouterState({ select: (state) => state.location.hash });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (id && hash.replace(/^#/, "") === id) setOpen(true);
  }, [hash, id]);

  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border border-primary/25 border-l-2 border-l-primary bg-card/85"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-6 text-left sm:p-8"
      >
        <span>
          <h2 className="font-display text-lg font-extrabold uppercase text-foreground">
            {heading}
          </h2>
          <span className="mt-2 block h-px w-12 bg-primary" />
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-primary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "px-6 pb-6 text-sm text-muted-foreground sm:px-8 sm:pb-8",
            TEXT_ALIGN_CLASS[align],
          )}
        >
          <RichText text={body} />
        </div>
      ) : null}
    </section>
  );
}
