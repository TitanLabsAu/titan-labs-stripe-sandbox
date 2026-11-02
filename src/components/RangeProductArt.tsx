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
    upper.length > 20 && breaks.length
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
  const { navy, gold } = RANGE_PALETTE;
  return (
    <svg
      viewBox="0 0 550 450"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-gold`}>
          <stop stopColor="#B98832" />
          <stop offset=".4" stopColor={gold} />
          <stop offset=".65" stopColor="#F6DE98" />
          <stop offset="1" stopColor={gold} />
        </linearGradient>
        <linearGradient id={`${id}-curve`}>
          <stop stopColor="#081c31" stopOpacity=".3" />
          <stop offset=".12" stopColor="#081c31" stopOpacity=".05" />
          <stop offset=".35" stopColor="white" stopOpacity=".08" />
          <stop offset=".65" stopColor="white" stopOpacity="0" />
          <stop offset=".88" stopColor="#081c31" stopOpacity=".04" />
          <stop offset="1" stopColor="#081c31" stopOpacity=".28" />
        </linearGradient>
        <clipPath id={`${id}-paper`}>
          <path d="M0 0Q275 10 550 0V440Q275 457 0 440Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-paper)`}>
        <rect width="550" height="450" fill="white" />
        <path
          d="M0 9Q275 19 550 9M0 433Q275 450 550 433"
          fill="none"
          stroke={`url(#${id}-gold)`}
          strokeWidth="7"
        />
        <g stroke={gold} strokeWidth="1.7" fill="none" opacity=".65">
          <path d="M0 141L22 155L39 186L22 216L0 224M39 186H70L87 216L70 246H39L22 216M39 246L22 277L39 308M70 246L89 277M550 152L529 168L513 199L529 229L550 237M513 199H482L465 229L482 259H513L529 229M513 259L529 290L513 320" />
          {[
            [22, 155],
            [39, 186],
            [22, 216],
            [70, 186],
            [87, 216],
            [70, 246],
            [39, 246],
            [22, 277],
            [39, 308],
            [89, 277],
            [529, 168],
            [513, 199],
            [529, 229],
            [482, 199],
            [465, 229],
            [482, 259],
            [513, 259],
            [529, 290],
            [513, 320],
          ].map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="4"
              fill={`url(#${id}-gold)`}
            />
          ))}
        </g>
        <MasterCrop
          box="340 641 210 174"
          x={42}
          y={27}
          width={108}
          height={90}
        />
        <MasterCrop
          box="583 644 716 158"
          x={174}
          y={28}
          width={376}
          height={83}
        />
        {lines.map((line, i) => (
          <text
            key={i}
            x="275"
            y={lines.length > 1 ? 174 + i * 43 : 202}
            textAnchor="middle"
            fill={navy}
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            fontSize={lines.length > 1 ? 35 : 47}
            textLength={
              line.length > (lines.length > 1 ? 19 : 15) ? 400 : undefined
            }
            lengthAdjust="spacingAndGlyphs"
          >
            {line}
          </text>
        ))}
        {strength ? (
          <>
            <rect x="145" y="244" width="260" height="63" rx="17" fill={navy} />
            <text
              x="275"
              y="289"
              textAnchor="middle"
              fill={`url(#${id}-gold)`}
              fontFamily="Arial, sans-serif"
              fontWeight="800"
              fontSize={strength.length > 10 ? 29 : 43}
              textLength={strength.length > 14 ? 225 : undefined}
              lengthAdjust="spacingAndGlyphs"
            >
              {strength}
            </text>
          </>
        ) : null}
        <g
          fill={navy}
          fontFamily="Arial, sans-serif"
          fontSize="17"
          textAnchor="middle"
        >
          <text x="275" y="351">
            For research purpose only
          </text>
          <text x="275" y="377">
            Keep out of reach of children
          </text>
          <text x="275" y="403">
            Keep refrigerated 2°C to 8°C
          </text>
        </g>
        <rect
          width="550"
          height="450"
          fill={`url(#${id}-curve)`}
          pointerEvents="none"
        />
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
      <svg
        x="366"
        y="565"
        width="524"
        height="438"
        viewBox="0 0 550 450"
        preserveAspectRatio="none"
      >
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
  thumbnail = false,
}: {
  product: Product;
  variant?: ProductVariant | undefined;
  view?: RangeView;
  className?: string | undefined;
  alt?: string | undefined;
  thumbnail?: boolean;
}) {
  const selected = variant ?? firstAvailableVariant(product) ?? undefined;
  const details = rangeLabelDetails(product, selected);
  return (
    <svg
      viewBox={thumbnail ? "0 0 1200 900" : "0 0 1000 1000"}
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
      <image
        href={`${root}laboratory-scene.webp`}
        width={thumbnail ? 1200 : 1000}
        height={thumbnail ? 900 : 1000}
        preserveAspectRatio="xMidYMid slice"
      />
      <rect
        className="range-art-scene-shade opacity-0 dark:opacity-50"
        width={thumbnail ? 1200 : 1000}
        height={thumbnail ? 900 : 1000}
        fill="#03172b"
      />
      <g transform={thumbnail ? "translate(150 0) scale(.9)" : undefined}>
        {view === "label" ? (
          <Vial
            product={product}
            variant={selected}
            x={-580}
            y={-750}
            size={2200}
          />
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
      </g>
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
