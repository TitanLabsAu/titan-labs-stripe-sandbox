import { Microscope } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function ResearchLabShell({ children, preview = false }: { children: React.ReactNode; preview?: boolean }) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <div className="flex items-center gap-3 border-b border-border pb-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary/35 bg-primary/10">
            <Microscope className="h-6 w-6 text-primary" aria-hidden="true" />
          </span>
          <div>
            <p className="technical-label text-accent">{preview ? "Admin preview · unpublished" : "Research reference library"}</p>
            <p className="font-display text-2xl font-bold uppercase text-foreground sm:text-3xl">Titan's Research Lab</p>
          </div>
        </div>
        <div className="mt-7">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}