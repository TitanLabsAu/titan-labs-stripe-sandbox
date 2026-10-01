import { BookOpen, FlaskConical, GraduationCap, Layers3, Microscope } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function ResearchLabShell({ children, preview = false }: { children: React.ReactNode; preview?: boolean }) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <div className="flex items-center gap-3 border-b border-border pb-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/10">
            <Microscope className="h-6 w-6 text-primary" aria-hidden="true" />
          </span>
          <div>
            <p className="technical-label text-accent">{preview ? "Admin preview · unpublished" : "Research reference library"}</p>
            <p className="font-display text-2xl font-bold uppercase text-foreground sm:text-3xl">Titan's Research Lab</p>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Research Lab navigation">
          <Link to={preview ? "/research-preview" : "/research"} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"><FlaskConical className="h-4 w-4" /> Compound Library</Link>
          <a href="#collections" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"><BookOpen className="h-4 w-4" /> Research Collections</a>
          <a href="#blends" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"><Layers3 className="h-4 w-4" /> Titan Blends</a>\n          <a href="#learn" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 font-display text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"><GraduationCap className="h-4 w-4" /> Learn</a>
        </nav>
        <div className="mt-7">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}