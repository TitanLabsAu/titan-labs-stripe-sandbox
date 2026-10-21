import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchSection } from "@/lib/research";
import { RESEARCH_REFERENCE_LABELS, referenceFieldValue, setReferenceField } from "@/lib/research-reference-fields";

export function ResearchReferenceFieldsEditor({ content, onChange }: { content: ResearchSection[]; onChange: (content: ResearchSection[]) => void }) {
  return <fieldset className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Optional research reference fields">
    {RESEARCH_REFERENCE_LABELS.map(label => <div key={label} className="space-y-2">
      <Label htmlFor={`research-reference-${label.toLowerCase()}`}>{label} (optional)</Label>
      <Textarea id={`research-reference-${label.toLowerCase()}`} rows={3} value={referenceFieldValue(content, label)} onChange={event => onChange(setReferenceField(content, label, event.target.value))} />
    </div>)}
  </fieldset>;
}