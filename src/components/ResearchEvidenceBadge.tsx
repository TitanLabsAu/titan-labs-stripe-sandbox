import { CircleCheck, FlaskConical, Scale } from "lucide-react";
import { EVIDENCE_STATUSES, label, type EvidenceStatus } from "@/lib/research";
import { cn } from "@/lib/utils";

export function ResearchEvidenceBadge({ status, className }: { status: EvidenceStatus; className?: string }) {
  const Icon = status === "established_clinical" || status === "human_clinical" ? CircleCheck : status === "mixed" || status === "insufficient" ? Scale : FlaskConical;
  return (
    <span className={cn("inline-flex min-h-8 items-center gap-2 border border-primary/35 bg-primary/10 px-3 py-1 font-display text-xs font-bold uppercase text-foreground", className)}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      {label(EVIDENCE_STATUSES, status)}
    </span>
  );
}