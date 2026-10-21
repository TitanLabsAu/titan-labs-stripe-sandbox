import { TitanPageHeading } from "@/components/TitanPageHeading";
import {
  BookOpen,
  FlaskConical,
  GraduationCap,
  Layers3,
  Microscope,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function ResearchLabShell({
  children,
  preview = false,
  protocolStacks = false,
  detail = false,
}: {
  children: React.ReactNode;
  preview?: boolean;
  protocolStacks?: boolean;
  detail?: boolean;
}) {
  return (
    <div className={`research-lab-theme bg-hero min-h-screen${protocolStacks ? " protocol-stacks-shell" : ""}${detail ? " research-detail-shell" : ""}`}>
      <SiteHeader />
      <main className={detail ? "research-detail-container" : "page-shell py-8 sm:py-12"}>
        {detail ? <p className="research-detail-breadcrumb"><Link to={preview ? "/research-preview" : "/research"}>Research Lab</Link><span aria-hidden="true"> / </span>Compound reference{preview ? " · Admin preview" : ""}</p> : <TitanPageHeading
          icon={Microscope}
          eyebrow={
            preview
              ? "Admin preview · unpublished"
              : "Research reference library"
          }
          title="Titan Research Lab"
        />}
        <nav
          className={`${detail ? "research-detail-nav" : "mt-4"} flex gap-2 overflow-x-auto pb-1`}
          aria-label="Research Lab navigation"
        >
          <Link
            to={preview ? "/research-preview" : "/research"}
            activeOptions={{ exact: true }}
            activeProps={{ className: "border-primary text-primary" }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            <FlaskConical className="h-4 w-4" /> Compound Library
          </Link>
          <Link
            to="/research/protocol-stacks"
            activeProps={{ className: "border-primary text-primary" }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            <Layers3 className="h-4 w-4" aria-hidden="true" /> Protocol Stacks
          </Link>
          <a
            href={`${preview ? "/research-preview" : "/research"}#collections`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            <BookOpen className="h-4 w-4" /> Research Collections
          </a>
          <Link
            to="/stacks"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            <Layers3 className="h-4 w-4" /> Titan Stacks
          </Link>
          <a
            href={`${preview ? "/research-preview" : "/research"}#blends`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            <Layers3 className="h-4 w-4" /> Titan Blends
          </a>
          <a
            href={`${preview ? "/research-preview" : "/research"}#learn`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            <GraduationCap className="h-4 w-4" /> Learn
          </a>
        </nav>
        <div className={detail ? "" : "mt-7"}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
