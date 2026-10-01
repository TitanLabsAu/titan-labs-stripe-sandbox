import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Shared page identity from the Research Lab interface. */
export function TitanPageHeading({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: ReactNode;
}) {
  return (
    <div className="titan-page-heading">
      <span className="titan-page-icon">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="technical-label text-accent">{eyebrow}</p>
        <p className="font-display text-2xl font-bold uppercase text-foreground sm:text-3xl">
          {title}
        </p>
      </div>
    </div>
  );
}
