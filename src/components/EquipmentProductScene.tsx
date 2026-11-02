import type { CSSProperties } from "react";
import type { EquipmentScene, SceneDetail } from "@/lib/equipment-scenes";

/** Photo backgrounds fill each card; the product retains its proportions at any aspect ratio. */
export function EquipmentProductScene({
  scene,
  alt,
  className,
  style,
  width,
  height,
  detail = "full",
}: {
  scene: EquipmentScene;
  alt: string;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
  detail?: SceneDetail | undefined;
}) {
  const w = Math.min(840, (740 * scene.width) / scene.height);
  const h = (w * scene.height) / scene.width;
  const x = (1000 - w) / 2,
    y = 860 - h;
  const anchor =
    detail === "dial" ? scene.dial : detail === "logo" ? scene.logo : undefined;
  const camera = anchor
    ? `${x + w * (anchor[0] ?? 0.5) - 150} ${y + h * (anchor[1] ?? 0.5) - 150} 300 300`
    : "0 0 1000 1000";
  const background: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={{
        display: "block",
        position: className?.split(/\s+/).includes("absolute")
          ? "absolute"
          : "relative",
        overflow: "hidden",
        width,
        height,
        ...style,
      }}
      data-equipment-scene={scene.cutout}
    >
      <img
        className="theme-variant-dark"
        src="/images/catalogue-v4/laboratory-scene.webp"
        alt=""
        loading="lazy"
        decoding="async"
        style={background}
      />
      <img
        className="theme-variant-light"
        src="/images/catalogue-v4/laboratory-scene-light.webp"
        alt=""
        loading="lazy"
        decoding="async"
        style={background}
      />
      <svg
        viewBox={camera}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <ellipse
          cx="500"
          cy="866"
          rx={w * 0.4}
          ry="15"
          fill="#071624"
          opacity=".16"
        />
        <image href={scene.cutout} x={x} y={y} width={w} height={h} />
      </svg>
    </span>
  );
}
