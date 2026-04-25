// Hero SVG dimensions
const W = 560, H = 200;
const PAD = { l: 24, r: 16, t: 20, b: 32 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;
const X_MIN = 400, X_MAX = 2500;
const Y_MAX = 0.75;

function vegReflectance(lam: number): number {
  let r: number;
  if (lam < 500) r = 0.035 + (lam - 400) * 0.0001;
  else if (lam < 580) r = 0.045 + Math.exp(-((lam - 550) ** 2) / 900) * 0.04;
  else if (lam < 680) r = 0.08 - (lam - 580) * 0.0005;
  else if (lam < 700) r = 0.03;
  else if (lam < 760) {
    const t = (lam - 700) / 60;
    r = 0.03 + 0.53 * (1 / (1 + Math.exp(-(t - 0.5) * 10)));
  } else if (lam < 1300) r = 0.56 + Math.sin((lam - 800) * 0.008) * 0.015;
  else if (lam < 1400) r = 0.56 - (lam - 1300) * 0.0015;
  else if (lam < 1500) r = 0.41 - Math.exp(-((lam - 1450) ** 2) / 1500) * 0.34;
  else if (lam < 1800) r = 0.07 + (lam - 1500) * 0.0014;
  else if (lam < 1900) r = 0.49 - (lam - 1800) * 0.001;
  else if (lam < 2050) r = 0.39 - Math.exp(-((lam - 1950) ** 2) / 1800) * 0.35;
  else r = 0.04 + (lam - 2050) * 0.0005 - Math.exp(-((lam - 2200) ** 2) / 4000) * 0.03;
  r += Math.sin(lam * 0.11) * 0.004 + Math.sin(lam * 0.29) * 0.002;
  return Math.max(0.01, Math.min(0.72, r));
}

const xs = (v: number) => PAD.l + ((v - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
const ys = (v: number) => PAD.t + PLOT_H - (v / Y_MAX) * PLOT_H;

// Compute path once at module load — static data, no props
const SAMPLES: { lam: number; r: number }[] = [];
for (let lam = X_MIN; lam <= X_MAX; lam += 6) {
  SAMPLES.push({ lam, r: vegReflectance(lam) });
}
const PATH = SAMPLES.map((p, i) =>
  `${i === 0 ? "M" : "L"}${xs(p.lam).toFixed(2)} ${ys(p.r).toFixed(2)}`
).join(" ");

const LENS_LAM = 640;
const GLASS_CX = xs(LENS_LAM);
const GLASS_CY = ys(vegReflectance(LENS_LAM));
const GLASS_R = 62;
const ZOOM = 1.5;

const H2O_GAPS: [number, number][] = [[1350, 1450], [1800, 1950]];
const X_TICKS = [400, 800, 1200, 1600, 2000, 2400];

export default function MagnifyingGlassHero() {
  const handleAngle = Math.PI / 4;
  const handleX1 = GLASS_CX + Math.cos(handleAngle) * GLASS_R;
  const handleY1 = GLASS_CY + Math.sin(handleAngle) * GLASS_R;
  const handleX2 = GLASS_CX + Math.cos(handleAngle) * (GLASS_R + 38);
  const handleY2 = GLASS_CY + Math.sin(handleAngle) * (GLASS_R + 38);

  const specularCx = GLASS_CX - GLASS_R * 0.38;
  const specularCy = GLASS_CY - GLASS_R * 0.48;

  return (
    <div style={{ position: "relative", width: W, height: H + 16 }}>
      <svg width={W} height={H + 16} style={{ overflow: "visible" }}>
        <defs>
          <clipPath id="lens-clip">
            <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 4} />
          </clipPath>
          <filter id="lens-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="black" floodOpacity="0.15" />
          </filter>
          <radialGradient id="lens-tint" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="40%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.06 }} />
          </radialGradient>
        </defs>

        {/* Axis baselines */}
        <line x1={PAD.l} y1={PAD.t + PLOT_H} x2={PAD.l + PLOT_W} y2={PAD.t + PLOT_H}
          style={{ stroke: "var(--color-border)" }} strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PLOT_H}
          style={{ stroke: "var(--color-border)" }} strokeWidth="1" />

        {/* X ticks */}
        {X_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={xs(t)} x2={xs(t)}
              y1={PAD.t + PLOT_H} y2={PAD.t + PLOT_H + 3}
              style={{ stroke: "var(--color-ink-soft)" }} strokeWidth="0.8"
            />
            <text
              x={xs(t)} y={PAD.t + PLOT_H + 14}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--color-ink-soft)" }}
            >
              {t}
            </text>
          </g>
        ))}

        {/* H₂O gap bands */}
        {H2O_GAPS.map(([lo, hi], i) => (
          <rect
            key={i} x={xs(lo)} y={PAD.t}
            width={xs(hi) - xs(lo)} height={PLOT_H}
            style={{ fill: "var(--color-border-soft)" }} opacity="0.6"
          />
        ))}

        {/* Base spectrum line */}
        <path d={PATH} fill="none"
          style={{ stroke: "var(--color-ink)" }}
          strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9"
        />

        {/* Magnified content inside lens */}
        <g clipPath="url(#lens-clip)">
          <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 4}
            style={{ fill: "var(--color-surface)" }} />
          {/* Crosshair guides */}
          <line
            x1={GLASS_CX - GLASS_R} x2={GLASS_CX + GLASS_R}
            y1={GLASS_CY} y2={GLASS_CY}
            style={{ stroke: "var(--color-border)" }}
            strokeDasharray="2 3" strokeWidth="0.8" opacity="0.6"
          />
          <line
            x1={GLASS_CX} x2={GLASS_CX}
            y1={GLASS_CY - GLASS_R} y2={GLASS_CY + GLASS_R}
            style={{ stroke: "var(--color-border)" }}
            strokeDasharray="2 3" strokeWidth="0.8" opacity="0.6"
          />
          {/* Zoomed path via SVG transform */}
          <g transform={`translate(${GLASS_CX} ${GLASS_CY}) scale(${ZOOM}) translate(${-GLASS_CX} ${-GLASS_CY})`}>
            <path d={PATH} fill="none"
              style={{ stroke: "var(--color-accent)" }}
              strokeWidth={1.4 / ZOOM * 1.6}
              strokeLinejoin="round" strokeLinecap="round"
            />
          </g>
          {/* Label */}
          <text
            x={GLASS_CX - 28} y={GLASS_CY + GLASS_R - 12}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--color-accent)" }}
            opacity="0.85"
          >
            chlorophyll
          </text>
        </g>

        {/* Glass tint overlay */}
        <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 4}
          fill="url(#lens-tint)" style={{ pointerEvents: "none" }} />

        {/* Lens rim and handle */}
        <g filter="url(#lens-shadow)">
          <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R}
            fill="none" style={{ stroke: "var(--color-ink)" }} strokeWidth="3.5" />
          <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 3.5}
            fill="none" style={{ stroke: "var(--color-ink)" }} strokeWidth="0.6" opacity="0.3" />
          <line
            x1={handleX1} y1={handleY1} x2={handleX2} y2={handleY2}
            style={{ stroke: "var(--color-ink)" }} strokeWidth="6.5" strokeLinecap="round"
          />
        </g>

        {/* Specular highlight */}
        <ellipse
          cx={specularCx} cy={specularCy}
          rx={GLASS_R * 0.28} ry={GLASS_R * 0.12}
          fill="white" opacity="0.55"
          transform={`rotate(-35 ${specularCx} ${specularCy})`}
        />
      </svg>
    </div>
  );
}
