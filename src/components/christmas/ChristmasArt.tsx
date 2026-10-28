/** Original, lightweight vector artwork. No changes to catalogue image files. */
export function SantaHat({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 130"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M25 96C34 30 65 3 94 13c29 10 46 39 60 70l-15 12C112 63 95 47 77 55L62 99Z"
        fill="#bc2333"
      />
      <path d="M40 89C51 43 66 18 89 17c-8 11-20 29-21 56Z" fill="#e54448" />
      <path
        d="M30 90c36-11 73-8 108 7l-6 24c-35-13-68-15-103-6-9-1-10-17 1-25Z"
        fill="#fff8ed"
        stroke="#e2d7c2"
        strokeWidth="2"
      />
      <path
        d="M32 96c30-7 67-7 100 7"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="151"
        cy="94"
        r="18"
        fill="#fff8ed"
        stroke="#e2d7c2"
        strokeWidth="2"
      />
      <circle cx="146" cy="88" r="7" fill="#fff" />
    </svg>
  );
}

export function PineSprig({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 160"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {[0, 27, 55, 82].map((angle) => (
        <g key={angle} transform={`translate(15 10) rotate(${angle})`}>
          <path d="M0 0L180 12" stroke="#826239" strokeWidth="3" />
          {Array.from({ length: 13 }, (_, i) => (
            <g key={i} transform={`translate(${i * 13} ${i * 0.85})`}>
              <path
                d="M0 0l25-15M0 0l25 19M5 0l27-10M5 0l25 14"
                stroke={i % 2 ? "#315c46" : "#1d4638"}
                strokeWidth="2.3"
                strokeLinecap="round"
              />
              <path d="M0 0l24-12" stroke="#78926b" strokeWidth=".8" />
            </g>
          ))}
        </g>
      ))}
      <path d="M50 20v36M97 35v43" stroke="#c9a657" strokeWidth="2" />
      <circle
        cx="50"
        cy="68"
        r="19"
        fill="#bb9444"
        stroke="#edce83"
        strokeWidth="2"
      />
      <ellipse cx="44" cy="61" rx="5" ry="8" fill="#f8e5ad" opacity=".8" />
      <circle
        cx="97"
        cy="90"
        r="16"
        fill="#075e9d"
        stroke="#6ca7d1"
        strokeWidth="2"
      />
      <ellipse cx="92" cy="84" rx="4" ry="6" fill="#bbdfff" opacity=".8" />
      {[
        [25, 35],
        [80, 49],
        [122, 24],
        [143, 66],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill="#f4c96d" opacity=".25" />
          <circle cx={x} cy={y} r="2" fill="#fff0b5" />
        </g>
      ))}
    </svg>
  );
}

export function Wreath({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 180"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="90"
        cy="90"
        r="56"
        fill="none"
        stroke="#244c3b"
        strokeWidth="26"
      />
      {Array.from({ length: 20 }, (_, i) => (
        <g key={i} transform={`translate(90 90) rotate(${i * 18})`}>
          <path
            d="M-5-45l-14-24 18 10 9-18 5 25-13 13Z"
            fill={i % 2 ? "#456b49" : "#315740"}
          />
          <path d="M0-47l1-23" stroke="#9caa6a" strokeWidth="1" />
          {i % 3 === 0 ? (
            <circle
              cy="-58"
              r="6"
              fill={i % 2 ? "#0868ab" : "#d6b363"}
              stroke="#edd89e"
              strokeWidth="1"
            />
          ) : null}
          {i % 2 === 0 ? (
            <circle cx="-8" cy="-52" r="2" fill="#fff0b5" />
          ) : null}
        </g>
      ))}
      <path
        d="M87 32Q44 3 52 36q5 17 35 3m6-7q43-29 35 4-5 17-35 3M86 39L67 74l17-4 6-29 10 29 16 5-20-36"
        fill="#d1ad54"
        stroke="#f3d78b"
        strokeWidth="2"
      />
      <circle cx="90" cy="36" r="7" fill="#b68d3a" />
    </svg>
  );
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
