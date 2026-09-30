import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function ResearchAcknowledgement({
  checked,
  onChange,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("border border-accent/60 bg-background p-4", className)}>
      <p className="technical-label text-foreground">Research Use Acknowledgement</p>
      <label htmlFor="research-ack" className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
        <Checkbox
          id="research-ack"
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onChange(v === true)}
          className="mt-1"
          aria-required="true"
        />
        <span>
          I acknowledge that the products in this order are supplied for laboratory research purposes only and are not
          intended for human or animal consumption. I confirm that I have read and agree to the{" "}
          <Link to="/terms" target="_blank" className="font-bold text-primary underline underline-offset-2">
            Terms &amp; Conditions
          </Link>
          .
        </span>
      </label>
    </div>
  );
}
