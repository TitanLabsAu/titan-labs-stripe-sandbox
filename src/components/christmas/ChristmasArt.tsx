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

function Reindeer({
  x,
  y,
  delay,
  leader = false,
}: {
  x: number;
  y: number;
  delay: number;
  leader?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="christmas-deer" style={{ animationDelay: `${delay}s` }}>
        <ellipse cx="29" cy="34" rx="25" ry="12" fill="#9c7148" />
        <path d="M42 30l10-21 10 5-8 27Z" fill="#a57a4d" />
        <ellipse
          cx="60"
          cy="13"
          rx="13"
          ry="8"
          fill="#b18a5a"
          transform="rotate(-15 60 13)"
        />
        <path
          d="M52 10L45 0l13 6M59 5l-3-17m0 7-9-7m10 4 7-8m-3 17 3-15m-1 8 8-6"
          stroke="#dac59b"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="64" cy="10" r="1.6" fill="#201b17" />
        <circle cx="72" cy="12" r="3" fill={leader ? "#dc3544" : "#392820"} />
        <path d="M8 30L-1 25l4 12Z" fill="#d2b58c" />
        <path d="M47 22l8 5" stroke="#c63839" strokeWidth="5" />
        <circle cx="53" cy="27" r="2" fill="#edcb6b" />
        {[
          [13, 41, -1],
          [22, 43, 1],
          [39, 42, 1],
          [47, 39, -1],
        ].map(([lx, ly, direction], i) => (
          <g
            key={i}
            className={`christmas-leg christmas-leg-${direction}`}
            style={{
              transformOrigin: `${lx}px ${ly}px`,
              animationDelay: `${delay + i * 0.07}s`,
            }}
          >
            <path
              d={`M${lx} ${ly}l${direction! * 8} 14 ${direction! * -6} 9`}
              fill="none"
              stroke={i % 2 ? "#775333" : "#ab8050"}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={`M${lx! + direction! * 2} ${ly! + 23}h6`}
              stroke="#3b2b21"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path
          d="M15 25q12 7 25 0"
          stroke="#ba343e"
          strokeWidth="3"
          fill="none"
        />
      </g>
    </g>
  );
}

export function SantaSleigh({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 125"
      aria-hidden="true"
      focusable="false"
    >
      <g className="christmas-reins">
        <path
          d="M71 76Q140 42 208 52T391 48M72 79Q150 70 218 58T392 51"
          stroke="#d4b773"
          strokeWidth="1.3"
          fill="none"
        />
      </g>
      <g className="christmas-sleigh-body">
        <path d="M13 69q-7-30 12-31 22 0 22 33Z" fill="#304f37" />
        <path d="M21 41l8-6 6 5" stroke="#d1ae60" fill="none" strokeWidth="3" />
        <rect x="18" y="57" width="18" height="16" rx="2" fill="#165e99" />
        <path d="M27 57v16M18 64h18" stroke="#e5c775" strokeWidth="2" />
        <path d="M44 72V45q15-9 25 3l7 27Z" fill="#bd2634" />
        <path d="M48 61h23" stroke="#292820" strokeWidth="5" />
        <path d="M55 58h8v6h-8Z" fill="#eac665" />
        <circle cx="59" cy="33" r="11" fill="#f1c6a0" />
        <path
          d="M48 32q-4 25 14 20 13-6 10-17-5 13-12 1-3 7-12-4Z"
          fill="#fff9ed"
        />
        <path d="M47 29q6-28 24-13l5 10-10-4-4 5Z" fill="#c52a36" />
        <path
          className="christmas-santa-hat"
          d="M69 16q13 5 12 17"
          stroke="#c52a36"
          strokeWidth="7"
          fill="none"
        />
        <circle cx="81" cy="34" r="4" fill="#fff9ed" />
        <path
          d="M47 29l23-3"
          stroke="#fff9ed"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M68 48l11 12 10-5"
          stroke="#c52a36"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="90" cy="54" r="4" fill="#fff9ed" />
        <path
          d="M6 70h67q10 0 17-12 8 23-12 31H24Q6 84 6 70Z"
          fill="#a91f32"
          stroke="#e3bd64"
          strokeWidth="2"
        />
        <path
          d="M17 77q26 17 54 1"
          stroke="#d9b75d"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M25 88l-5 10m48-10 5 10M9 99h72q20 0 21-13"
          stroke="#e6c57b"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <Reindeer x={110} y={35} delay={0} />
      <Reindeer x={187} y={25} delay={-0.16} />
      <Reindeer x={264} y={19} delay={-0.32} />
      <Reindeer x={341} y={12} delay={-0.48} leader />
    </svg>
  );
}
