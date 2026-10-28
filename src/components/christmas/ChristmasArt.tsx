/** Transparent photographic decorations; originals and catalogue photos stay untouched. */
function Decoration({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <img
      src={`/christmas/${name}-realistic-v2.webp`}
      className={className}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
    />
  );
}
export function SantaHat({ className = "" }: { className?: string }) {
  return <Decoration name="hat" className={className} />;
}
export function PineSprig({ className = "" }: { className?: string }) {
  return <Decoration name="pine-corner" className={className} />;
}
export function Wreath({ className = "" }: { className?: string }) {
  return <Decoration name="wreath" className={className} />;
}
export function FairyLights({ className = "" }: { className?: string }) {
  return <Decoration name="lights" className={className} />;
}

export const SANTA_ARTWORK = "/christmas/santa-sleigh-realistic-v1.webp";

/** Four consecutive realistic gallop poses, packed into a transparent 2×2 sprite. */
export function SantaSleigh({ className = "" }: { className?: string }) {
  return (
    <span
      className={`christmas-realistic-sleigh ${className}`}
      aria-hidden="true"
    />
  );
}

export function OrganicCorners() {
  return (
    <>
      <img
        src="/christmas/corner-left-organic-v3.webp"
        className="christmas-organic-corner christmas-organic-corner-left"
        alt=""
        aria-hidden="true"
      />
      <img
        src="/christmas/corner-right-organic-v3.webp"
        className="christmas-organic-corner christmas-organic-corner-right"
        alt=""
        aria-hidden="true"
      />
    </>
  );
}
export function OrganicGarland({ greenery = true }: { greenery?: boolean }) {
  return (
    <img
      src={
        greenery
          ? "/christmas/garland-organic-v3.webp"
          : "/christmas/lights-realistic-v2.webp"
      }
      className="christmas-organic-garland"
      alt=""
      aria-hidden="true"
    />
  );
}
export function OrganicArrangement({ className = "" }: { className?: string }) {
  return (
    <img
      src="/christmas/arrangement-organic-v3.webp"
      className={className}
      alt=""
      aria-hidden="true"
    />
  );
}
