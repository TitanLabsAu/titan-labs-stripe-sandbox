import { useId, type ImgHTMLAttributes } from "react";
import {
  firstAvailableVariant,
  type Product,
  type ProductVariant,
} from "@/lib/products";
import {
  rangeLabelDetails,
  RANGE_PALETTE,
  usesRangeArtwork,
  type RangeView,
} from "@/lib/range-artwork";
import { ThemedProductImage } from "./ThemedImage";

const root = "/images/catalogue-v4/";

/** The approved reference is cropped by SVG viewports, preserving its actual helmet and lettering. */
function MasterCrop({
  box,
  x,
  y,
  width,
  height,
}: {
  box: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={box}
      preserveAspectRatio="none"
    >
      <image href={`${root}approved-master.webp`} width="1536" height="1024" />
    </svg>
  );
}

export function RangeLabelArt({
  product,
  variant,
}: {
  product: Product;
  variant?: ProductVariant | undefined;
}) {
  const { name, strength } = rangeLabelDetails(product, variant);
  const upper = name.toUpperCase();
  const breaks = [...upper.matchAll(/\s+/g)].map((m) => m.index!);
  const split =
    upper.length > 23 && breaks.length
      ? breaks.reduce((best, n) =>
          Math.abs(n - upper.length / 2) < Math.abs(best - upper.length / 2)
            ? n
            : best,
        )
      : 0;
  const lines = split
    ? [upper.slice(0, split), upper.slice(split).trim()]
    : [upper];
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const navy = RANGE_PALETTE.navy;
  const gold = RANGE_PALETTE.gold;
  return (
    <svg
      viewBox="0 0 800 400"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-gold`}>
          <stop stopColor="#B98832" />
          <stop offset=".45" stopColor={gold} />
          <stop offset=".7" stopColor="#F6DE98" />
          <stop offset="1" stopColor={gold} />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill="white" />
      <path
        d="M0 5H800M0 395H800"
        stroke={`url(#${id}-gold)`}
        strokeWidth="10"
      />
      <g stroke={gold} strokeWidth="2" fill="none" opacity=".8">
        <path d="M0 160L30 176L48 212L28 250L0 259M48 212H88L110 249L91 287H50L28 250M50 287L29 325L48 361M88 212L108 176M91 287L114 322" />
        {[
          [30, 176],
          [48, 212],
          [28, 250],
          [88, 212],
          [110, 249],
          [91, 287],
          [50, 287],
          [29, 325],
          [48, 361],
          [108, 176],
          [114, 322],
        ].map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="5"
            fill={`url(#${id}-gold)`}
          />
        ))}
      </g>
      <MasterCrop
        box="340 641 210 174"
        x={65}
        y={20}
        width={157}
        height={130}
      />
      <MasterCrop
        box="583 644 716 158"
        x={245}
        y={15}
        width={555}
        height={135}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x="122"
          y={lines.length > 1 ? 215 + i * 53 : 258}
          fill={navy}
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize={lines.length > 1 ? 45 : 65}
          textLength={
            line.length > (lines.length > 1 ? 23 : 12) ? 650 : undefined
          }
          lengthAdjust="spacingAndGlyphs"
        >
          {line}
        </text>
      ))}
      {strength ? (
        <>
          <path d="M0 305H205Q245 305 245 345V388H0Z" fill={navy} />
          <text
            x="122"
            y="367"
            textAnchor="middle"
            fill={`url(#${id}-gold)`}
            fontFamily="Arial, sans-serif"
            fontSize={strength.length > 9 ? 29 : 51}
            fontWeight="800"
            textLength={strength.length > 14 ? 215 : undefined}
            lengthAdjust="spacingAndGlyphs"
          >
            {strength}
          </text>
        </>
      ) : null}
      <g fill={navy} fontFamily="Arial, sans-serif" fontSize="15">
        <text x="405" y="321">
          For research purpose only
        </text>
        <text x="405" y="345">
          Keep out of reach of children
        </text>
        <text x="405" y="369">
          Keep refrigerated 2°C to 8°C
        </text>
      </g>
    </svg>
  );
}

function Vial({
  product,
  variant,
  x = 0,
  y = 0,
  size = 1000,
}: {
  product: Product;
  variant?: ProductVariant | undefined;
  x?: number;
  y?: number;
  size?: number;
}) {
  // Image geometry belongs to this immutable blank photograph (1280 × 1280).
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 1280 1280">
      <image href={`${root}vial-blank.webp`} width="1280" height="1280" />
      <svg x="367" y="650" width="522" height="261" viewBox="0 0 800 400">
        <RangeLabelArt product={product} variant={variant} />
      </svg>
    </svg>
  );
}

export function RangeProductArt({
  product,
  variant,
  view = "vial",
  className = "",
  alt,
}: {
  product: Product;
  variant?: ProductVariant | undefined;
  view?: RangeView;
  className?: string | undefined;
  alt?: string | undefined;
}) {
  const selected = variant ?? firstAvailableVariant(product) ?? undefined;
  const details = rangeLabelDetails(product, selected);
  return (
    <svg
      viewBox="0 0 1000 1000"
      role={alt === "" ? undefined : "img"}
      aria-hidden={alt === "" ? true : undefined}
      aria-label={
        alt === ""
          ? undefined
          : alt ||
            `${details.name}${details.strength ? ` — ${details.strength}` : ""}: ${view === "label" ? "label detail" : view === "boxed" ? "vial and matching Titan Labs box" : "full vial"}`
      }
      className={`range-product-art ${className}`}
      style={{ display: "block", overflow: "hidden" }}
    >
      {view === "label" ? (
        <svg x="35" y="265" width="930" height="465" viewBox="0 0 800 400">
          <RangeLabelArt product={product} variant={selected} />
        </svg>
      ) : view === "boxed" ? (
        <>
          <image
            href={`${root}box-front.webp`}
            x="305"
            y="40"
            width="700"
            height="850"
            preserveAspectRatio="xMidYMid meet"
          />
          <Vial
            product={product}
            variant={selected}
            x={-145}
            y={240}
            size={740}
          />
        </>
      ) : (
        <Vial product={product} variant={selected} x={30} y={10} size={940} />
      )}
    </svg>
  );
}

/** Shared by catalogue, related products and cart; non-Range photos keep their existing CMS/theme behavior. */
export function CatalogueProductImage({
  product,
  variant,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  product: Product;
  variant?: ProductVariant | undefined;
  sizes?: string;
}) {
  if (usesRangeArtwork(product))
    return (
      <RangeProductArt
        product={product}
        variant={variant}
        className={props.className}
        alt={props.alt === "" ? "" : undefined}
      />
    );
  return (
    <ThemedProductImage
      {...props}
      slug={product.slug}
      variantId={variant?.image ? variant.id : undefined}
      src={variant?.image || product.image}
      alt={props.alt || product.alt}
    />
  );
}
