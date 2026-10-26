import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ReviewPhoto } from "@/lib/review-photos";

export function ReviewPhotos({ photos = [], name }: { photos?: ReviewPhoto[]; name: string }) {
  const [selected, setSelected] = useState<ReviewPhoto | null>(null);
  if (!photos.length) return null;
  return <div className="mt-4">
    <div className="flex flex-wrap gap-2">{photos.map((p, i) => <Button key={p.id} type="button" variant="ghost" className="h-20 w-20 overflow-hidden rounded-md border border-border p-0" aria-label={`View photo ${i + 1} from ${name}`} onClick={() => setSelected(p)}><img src={p.url} alt={`Delivery or product photo ${i + 1} from ${name}`} className="h-full w-full object-cover" loading="lazy" /></Button>)}</div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-3xl"><DialogTitle>Photo from {name}</DialogTitle>{selected ? <img src={selected.url} alt={`Delivery or product photo from ${name}`} className="max-h-[75vh] w-full object-contain" /> : null}</DialogContent></Dialog>
  </div>;
}