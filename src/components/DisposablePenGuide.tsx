import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { disposablePenSteps } from "@/lib/penGuides";

export function DisposablePenGuide() {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
        <BookOpen className="h-5 w-5 shrink-0 text-primary" />
        Disposable pre-filled pen guide
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Read before purchasing. The instructions supplied with your exact pen model
        take precedence. Products are for laboratory research only, not human or
        animal consumption.
      </p>
      <ol className="mt-5 space-y-5">
        {disposablePenSteps.map(([heading, body], i) => (
          <li key={heading}>
            <h3 className="text-sm font-bold text-foreground">{i + 1}. {heading}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
      <Link to="/pen-guide" className="mt-5 inline-block text-sm font-bold text-primary underline underline-offset-4 hover:text-accent">
        Compare pens in Titan Pen Guides →
      </Link>
    </section>
  );
}
