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
      viewBox="0 0 550 600"
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
          <path d="M0 0Q275 10 550 0V590Q275 607 0 590Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-paper)`}>
        <rect width="550" height="600" fill="white" />
        <path
          d="M0 9Q275 19 550 9M0 583Q275 600 550 583"
          fill="none"
          stroke={`url(#${id}-gold)`}
          strokeWidth="7"
        />
        <g
          stroke={gold}
          strokeWidth="1.7"
          fill="none"
          opacity=".5"
          transform="translate(0 70) scale(1 1.2)"
        >
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
          x={190}
          y={28}
          width={170}
          height={141}
        />
        <MasterCrop
          box="583 644 716 158"
          x={60}
          y={185}
          width={430}
          height={95}
        />
        {lines.map((line, i) => (
          <text
            key={i}
            x="275"
            y={lines.length > 1 ? 331 + i * 43 : 357}
            textAnchor="middle"
            fill={navy}
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            fontSize={lines.length > 1 ? 38 : 52}
            textLength={
              line.length > (lines.length > 1 ? 19 : 15) ? 430 : undefined
            }
            lengthAdjust="spacingAndGlyphs"
          >
            {line}
          </text>
        ))}
        {strength ? (
          <>
            <rect x="135" y="402" width="280" height="69" rx="17" fill={navy} />
            <text
              x="275"
              y="451"
              textAnchor="middle"
              fill={`url(#${id}-gold)`}
              fontFamily="Arial, sans-serif"
              fontWeight="800"
              fontSize={strength.length > 10 ? 32 : 49}
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
          fontSize="18"
          textAnchor="middle"
        >
          <text x="275" y="510">
            For research purpose only
          </text>
          <text x="275" y="538">
            Keep out of reach of children
          </text>
          <text x="275" y="566">
            Keep refrigerated 2°C to 8°C
          </text>
        </g>
        <rect
          width="550"
          height="600"
          fill={`url(#${id}-curve)`}
          pointerEvents="none"
        />
      </g>
    </svg>
  );
}

/** Original photographed glass, with the navy cap from the approved theme concept. */
function WebsitePhoto() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <>
    <defs>
      <filter id={`${id}-neutral`} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values=".25"/></filter>
      <filter id={`${id}-navy`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".12 .24 .10 0 .015 .20 .34 .20 0 .025 .32 .40 .32 0 .055 0 0 0 1 0"/></filter>
      <clipPath id={`${id}-cap`}><rect x="570" y="278" width="240" height="72"/></clipPath>
    </defs>
    <image href="/images/product-optimized/retatrutide.webp" width="1024" height="1024" filter={`url(#${id}-neutral)`}/>
    <g clipPath={`url(#${id}-cap)`}><image href="/images/product-optimized/retatrutide.webp" width="1024" height="1024" filter={`url(#${id}-navy)`}/></g>
  </>;
}
function WebsitePaper({
  product,
  variant,
}: {
  product: Product;
  variant?: ProductVariant | undefined;
}) {
  return (
    <svg
      x="577"
      y="495"
      width="227"
      height="303"
      viewBox="0 0 550 600"
      preserveAspectRatio="none"
    >
      <RangeLabelArt product={product} variant={variant} />
    </svg>
  );
}
function Vial({
  product,
  variant,
  x,
  y,
  height,
}: {
  product: Product;
  variant?: ProductVariant | undefined;
  x: number;
  y: number;
  height: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      x={x}
      y={y}
      width={(height * 250) / 568}
      height={height}
      viewBox="565 278 250 568"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={`${id}-glass`}>
          <path d="M690 281C742 280 801 284 802 310V340L790 347V397Q790 409 773 414L771 439Q808 456 809 490V815Q809 841 785 842H595Q571 840 571 815V490Q571 461 604 439V416Q580 410 580 397V347L576 342V311Q577 285 690 281Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-glass)`}>
        <WebsitePhoto />
      </g>
      <WebsitePaper product={product} variant={variant} />
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
  const hero = !thumbnail && view === "vial";
  return (
    <svg
      viewBox={hero ? "0 0 1200 1200" : "0 0 1200 800"}
      preserveAspectRatio="xMidYMid slice"
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
      {hero ? (
        <>
          <g className="theme-variant-dark"><image href={`${root}branded-display-scene.webp`} width="1200" height="1200" preserveAspectRatio="xMidYMid slice"/></g>
          <g className="theme-variant-light"><image href={`${root}branded-display-light.webp`} width="1200" height="1200" preserveAspectRatio="xMidYMid slice"/></g>
          <Vial product={product} variant={selected} x={660} y={350} height={650} />
        </>
      ) : (
        <>
          <g className="theme-variant-dark">
            <image
              href={`${root}laboratory-scene.webp`}
              width="1200"
              height={view === "boxed" ? 1200 : 800}
              y={view === "boxed" ? -157 : 0}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
          <g className="theme-variant-light">
            <image
              href={`${root}laboratory-scene-light.webp`}
              width="1200"
              height={view === "boxed" ? 1200 : 800}
              y={view === "boxed" ? -157 : 0}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
          {view === "label" ? (
            <Vial
              product={product}
              variant={selected}
              x={280}
              y={-550}
              height={1450}
            />
          ) : view === "boxed" ? (
            <>
              <svg
                x="410"
                y="35"
                width="620"
                height="750"
                viewBox="230 35 800 1200"
                preserveAspectRatio="none"
              >
                <image
                  href={`${root}box-front.webp`}
                  width="1280"
                  height="1280"
                />
              </svg>
              <Vial
                product={product}
                variant={selected}
                x={197}
                y={205}
                height={590}
              />
            </>
          ) : (
            <Vial
              product={product}
              variant={selected}
              x={428}
              y={10}
              height={780}
            />
          )}
        </>
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

