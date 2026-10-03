import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { BookOpen } from "lucide-react";
import { CmsLink } from "@/components/CmsLink";

export function DisposablePenGuide() {
  const c = cmsValues(useSiteContent().data, "guide_pen");
  const steps = c.steps as { title: string; body: string }[];
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
        <BookOpen className="h-5 w-5 shrink-0 text-primary" />
        {c.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {c.intro}
      </p>
      <ol className="mt-5 space-y-5">
        {steps.map(({ title: heading, body }, i) => (
          <li key={i}>
            <h3 className="text-sm font-bold text-foreground">{i + 1}. {heading}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
      {c.link_label ? <CmsLink href={c.link_url} className="mt-5 inline-block text-sm font-bold text-primary underline underline-offset-4 hover:text-accent">
        {c.link_label}
      </CmsLink> : null}
    </section>
  );
}
