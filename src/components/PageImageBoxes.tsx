import { RichText } from "@/components/RichText";
import { FLEX_ALIGN_CLASS, TEXT_ALIGN_CLASS, type TextAlign } from "@/lib/homeContent";
import { cn } from "@/lib/utils";

type PageImage = {
  key: string;
  url: string;
  alt: string;
  caption: string;
  align: TextAlign;
};

export function PageImageBoxes({ images }: { images: PageImage[] }) {
  if (images.length === 0) return null;

  return (
    <div className={cn("grid gap-5", images.length === 1 ? "grid-cols-1" : "md:grid-cols-3")}>
      {images.map((image) => (
        <figure key={image.key} className={cn("space-y-3", TEXT_ALIGN_CLASS[image.align])}>
          <div className={cn("flex", FLEX_ALIGN_CLASS[image.align])}>
            <img
              src={image.url}
              alt={image.alt}
              className="brand-cut aspect-video w-full max-w-3xl border border-border object-cover shadow-gold"
              loading="lazy"
            />
          </div>
          {image.caption ? (
            <figcaption className="whitespace-pre-wrap text-sm text-muted-foreground">
              <RichText text={image.caption} />
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}