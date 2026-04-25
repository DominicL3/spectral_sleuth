import { useEffect, useRef, useState, useCallback } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { DiagnosticFeature, QuizMode } from "../lib/types";

export interface SpectrumChartProps {
  wavelengths: number[];
  reflectance: (number | null)[];
  reflectanceCR: (number | null)[];
  diagnosticFeatures?: DiagnosticFeature[];
  showHints?: boolean;
  continuumRemoved?: boolean;
  mode?: QuizMode;
  atmosphericGaps?: [number, number][];
  selectedWavelength?: number | null;
  onFeatureClick?: (wavelength_nm: number) => void;
  showRegionLabels?: boolean;
  resetZoomRef?: React.MutableRefObject<(() => void) | null>;
}

interface CursorReadout {
  lambda: number;
  r: number;
}

interface GapRect {
  x: number;
  width: number;
  cx: number;
  label: string;
}

interface RegionLabel {
  x: number;
  label: string;
}

interface HintLine {
  x: number;
  label: string;
}

const DEFAULT_GAPS: [number, number][] = [[1350, 1450], [1800, 1950]];

const ZOOM_FACTOR = 0.85;
const MIN_X_RANGE = 20;
const MIN_Y_RANGE = 0.01;
const Y_DATA_MIN = 0;
const Y_DATA_MAX = 1;
const DRAG_THRESHOLD_PX = 4;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clampPan(min: number, max: number, lo: number, hi: number): [number, number] {
  const range = max - min;
  const fullRange = hi - lo;
  if (range >= fullRange) return [lo, hi];
  if (min < lo) return [lo, lo + range];
  if (max > hi) return [hi - range, hi];
  return [min, max];
}

const REGIONS: [number, number, string][] = [
  [380, 1000, "VNIR"],
  [1000, 1800, "SWIR-1"],
  [1800, 2500, "SWIR-2"],
];

// Design token values (must match index.css) — used for canvas (uPlot) and SVG overlays
const TOKEN = {
  accent: "oklch(0.62 0.13 40)",
  accentSoft: "oklch(0.94 0.04 50 / 0.9)",
  accentBorder: "oklch(0.62 0.13 40)",
  inkSoft: "oklch(0.48 0.02 55)",
  gridLine: "oklch(0.88 0.015 65)",
  gapFill: "oklch(0.88 0.015 65 / 0.45)",
  surface: "oklch(1 0 0)",
  font: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
  fontMono: "'IBM Plex Mono', Menlo, monospace",
};

export default function SpectrumChart({
  wavelengths,
  reflectance,
  reflectanceCR,
  diagnosticFeatures,
  showHints = false,
  continuumRemoved = false,
  mode,
  atmosphericGaps = DEFAULT_GAPS,
  selectedWavelength = null,
  onFeatureClick,
  showRegionLabels = false,
  resetZoomRef,
}: SpectrumChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);

  const [cursor, setCursor] = useState<CursorReadout | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [gapRects, setGapRects] = useState<GapRect[]>([]);
  const [regionLabels, setRegionLabels] = useState<RegionLabel[]>([]);
  const [hintLines, setHintLines] = useState<HintLine[]>([]);
  const [selectedMarkerX, setSelectedMarkerX] = useState<number | null>(null);
  const [plotBbox, setPlotBbox] = useState({
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 0,
    plotHeight: 0,
  });

  const atmosphericGapsRef = useRef(atmosphericGaps);
  const diagnosticFeaturesRef = useRef(diagnosticFeatures);
  const selectedWavelengthRef = useRef(selectedWavelength);
  const modeRef = useRef(mode);
  const onFeatureClickRef = useRef(onFeatureClick);

  // Keep refs in sync with latest prop values so stable callbacks don't go stale
  useEffect(() => {
    atmosphericGapsRef.current = atmosphericGaps;
    diagnosticFeaturesRef.current = diagnosticFeatures;
    selectedWavelengthRef.current = selectedWavelength;
    modeRef.current = mode;
    onFeatureClickRef.current = onFeatureClick;
  });

  const xMin = wavelengths[0] ?? 380;
  const xMax = wavelengths[wavelengths.length - 1] ?? 2500;

  const recomputeOverlay = useCallback(() => {
    const u = uplotRef.current;
    if (!u || !u.bbox || u.bbox.width === 0) return;

    const dpr = devicePixelRatio;
    const plotLeft = u.bbox.left / dpr;
    const plotTop = u.bbox.top / dpr;
    const plotWidth = u.bbox.width / dpr;
    const plotHeight = u.bbox.height / dpr;

    const gaps = atmosphericGapsRef.current;
    const features = diagnosticFeaturesRef.current;
    const selWl = selectedWavelengthRef.current;

    const newGaps: GapRect[] = gaps
      .map(([lo, hi]) => {
        const x1 = plotLeft + (u.valToPos(lo, "x") as number);
        const x2 = plotLeft + (u.valToPos(hi, "x") as number);
        if (!isFinite(x1) || !isFinite(x2)) return null;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const clampedLeft = Math.max(left, plotLeft);
        const clampedRight = Math.min(right, plotLeft + plotWidth);
        if (clampedRight <= clampedLeft) return null;
        return {
          x: clampedLeft,
          width: clampedRight - clampedLeft,
          cx: (clampedLeft + clampedRight) / 2,
          label: "H₂O",
        } as GapRect;
      })
      .filter((r): r is GapRect => r !== null);
    setGapRects(newGaps);

    const newRegions: RegionLabel[] = REGIONS
      .map(([lo, hi, label]) => {
        const x1 = plotLeft + (u.valToPos(lo, "x") as number);
        const x2 = plotLeft + (u.valToPos(hi, "x") as number);
        if (!isFinite(x1) || !isFinite(x2)) return null;
        return { x: (x1 + x2) / 2, label } as RegionLabel;
      })
      .filter((r): r is RegionLabel => r !== null);
    setRegionLabels(newRegions);

    if (features && features.length > 0) {
      const newHints: HintLine[] = features
        .map((f) => {
          const x = plotLeft + (u.valToPos(f.wavelength_nm, "x") as number);
          if (!isFinite(x)) return null;
          return { x, label: f.label } as HintLine;
        })
        .filter((h): h is HintLine => h !== null);
      setHintLines(newHints);
    } else {
      setHintLines([]);
    }

    if (selWl !== null) {
      const x = plotLeft + (u.valToPos(selWl, "x") as number);
      setSelectedMarkerX(isFinite(x) ? x : null);
    } else {
      setSelectedMarkerX(null);
    }

    setSvgSize({ width: u.width, height: u.height });
    setPlotBbox({ plotLeft, plotTop, plotWidth, plotHeight });
  }, []);

  function handleResetZoom() {
    const u = uplotRef.current;
    if (!u) return;
    u.batch(() => {
      u.setScale("x", { min: xMin, max: xMax });
      u.setScale("y", { min: Y_DATA_MIN, max: Y_DATA_MAX });
    });
  }

  // Mount uPlot once
  useEffect(() => {
    if (!chartRef.current || wavelengths.length === 0) return;

    const activeData = continuumRemoved ? reflectanceCR : reflectance;

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth || 800,
      height: chartRef.current.clientHeight || 400,
      legend: { show: false },
      cursor: {
        drag: { x: false, y: false },
      },
      series: [
        { label: "λ (nm)" },
        {
          label: "Reflectance",
          stroke: TOKEN.accent,
          width: 1.6,
          fill: "oklch(0.62 0.13 40 / 0.07)",
        },
      ],
      axes: [
        {
          stroke: TOKEN.inkSoft,
          font: `12px ${TOKEN.font}`,
          labelFont: `500 13px ${TOKEN.font}`,
          label: "Wavelength (nm)",
          labelSize: 22,
          size: 48,
          grid: { stroke: TOKEN.gridLine, width: 1, dash: [2, 3] },
          ticks: { stroke: TOKEN.inkSoft, width: 1 },
        },
        {
          stroke: TOKEN.inkSoft,
          font: `12px ${TOKEN.font}`,
          labelFont: `500 13px ${TOKEN.font}`,
          label: continuumRemoved ? "Continuum-removed reflectance" : "Surface Reflectance",
          labelSize: 22,
          size: 72,
          grid: { stroke: TOKEN.gridLine, width: 1, dash: [2, 3] },
          ticks: { stroke: TOKEN.inkSoft, width: 1 },
        },
      ],
      scales: {
        x: { time: false, min: xMin, max: xMax },
        y: { min: Y_DATA_MIN, max: Y_DATA_MAX },
      },
      hooks: {
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            if (idx !== null && idx !== undefined && u.data[0] && u.data[1]) {
              const rawLambda = u.data[0][idx];
              const rawR = u.data[1][idx];
              if (rawLambda != null && rawR != null) {
                setCursor({ lambda: Math.round(rawLambda), r: rawR });
              }
            }
          },
        ],
        setScale: [() => recomputeOverlay()],
        setSize: [() => recomputeOverlay()],
        ready: [() => recomputeOverlay()],
      },
    };

    const u = new uPlot(
      opts,
      [wavelengths, activeData] as uPlot.AlignedData,
      chartRef.current
    );
    uplotRef.current = u;

    if (resetZoomRef) {
      resetZoomRef.current = handleResetZoom;
    }

    const over = u.over;
    over.style.touchAction = "none";
    over.style.cursor = modeRef.current === "feature_spotting" ? "crosshair" : "grab";

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = over.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const xVal = u.posToVal(cx, "x");
      const yVal = u.posToVal(cy, "y");

      const oxMin = u.scales.x.min!;
      const oxMax = u.scales.x.max!;
      const oyMin = u.scales.y.min!;
      const oyMax = u.scales.y.max!;

      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

      const newXRange = clamp((oxMax - oxMin) * factor, MIN_X_RANGE, xMax - xMin);
      const xLeftFrac = (xVal - oxMin) / (oxMax - oxMin);
      let nxMin = xVal - xLeftFrac * newXRange;
      let nxMax = nxMin + newXRange;
      [nxMin, nxMax] = clampPan(nxMin, nxMax, xMin, xMax);

      const newYRange = clamp((oyMax - oyMin) * factor, MIN_Y_RANGE, Y_DATA_MAX - Y_DATA_MIN);
      const yTopFrac = (oyMax - yVal) / (oyMax - oyMin);
      let nyMax = yVal + yTopFrac * newYRange;
      let nyMin = nyMax - newYRange;
      [nyMin, nyMax] = clampPan(nyMin, nyMax, Y_DATA_MIN, Y_DATA_MAX);

      u.batch(() => {
        u.setScale("x", { min: nxMin, max: nxMax });
        u.setScale("y", { min: nyMin, max: nyMax });
      });
    };

    let dragStart:
      | { x: number; y: number; xMin: number; xMax: number; yMin: number; yMax: number }
      | null = null;
    let dragMoved = 0;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        xMin: u.scales.x.min!,
        xMax: u.scales.x.max!,
        yMin: u.scales.y.min!,
        yMax: u.scales.y.max!,
      };
      dragMoved = 0;
      over.setPointerCapture(e.pointerId);
      if (modeRef.current !== "feature_spotting") {
        over.style.cursor = "grabbing";
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      dragMoved = Math.max(dragMoved, Math.hypot(dx, dy));
      if (dragMoved < DRAG_THRESHOLD_PX) return;

      if (modeRef.current !== "feature_spotting") {
        over.style.cursor = "grabbing";
      }

      const rect = over.getBoundingClientRect();
      const xRange = dragStart.xMax - dragStart.xMin;
      const yRange = dragStart.yMax - dragStart.yMin;
      const dxData = (dx / rect.width) * xRange;
      const dyData = (dy / rect.height) * yRange;

      let nxMin = dragStart.xMin - dxData;
      let nxMax = dragStart.xMax - dxData;
      let nyMin = dragStart.yMin + dyData;
      let nyMax = dragStart.yMax + dyData;
      [nxMin, nxMax] = clampPan(nxMin, nxMax, xMin, xMax);
      [nyMin, nyMax] = clampPan(nyMin, nyMax, Y_DATA_MIN, Y_DATA_MAX);

      u.batch(() => {
        u.setScale("x", { min: nxMin, max: nxMax });
        u.setScale("y", { min: nyMin, max: nyMax });
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragStart) return;
      const wasClick = dragMoved < DRAG_THRESHOLD_PX;
      const startX = dragStart.x;
      dragStart = null;
      if (over.hasPointerCapture(e.pointerId)) {
        over.releasePointerCapture(e.pointerId);
      }
      over.style.cursor = modeRef.current === "feature_spotting" ? "crosshair" : "grab";

      if (wasClick && modeRef.current === "feature_spotting" && onFeatureClickRef.current) {
        const rect = over.getBoundingClientRect();
        const px = startX - rect.left;
        const wavelength = u.posToVal(px, "x");
        if (wavelength >= xMin && wavelength <= xMax) {
          onFeatureClickRef.current(Math.round(wavelength * 10) / 10);
        }
      }
    };

    over.addEventListener("wheel", handleWheel, { passive: false });
    over.addEventListener("pointerdown", handlePointerDown);
    over.addEventListener("pointermove", handlePointerMove);
    over.addEventListener("pointerup", handlePointerUp);
    over.addEventListener("pointercancel", handlePointerUp);

    return () => {
      over.removeEventListener("wheel", handleWheel);
      over.removeEventListener("pointerdown", handlePointerDown);
      over.removeEventListener("pointermove", handlePointerMove);
      over.removeEventListener("pointerup", handlePointerUp);
      over.removeEventListener("pointercancel", handlePointerUp);
      u.destroy();
      uplotRef.current = null;
      if (resetZoomRef) resetZoomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when reflectance/continuumRemoved changes
  useEffect(() => {
    const u = uplotRef.current;
    if (!u || wavelengths.length === 0) return;
    const activeData = continuumRemoved ? reflectanceCR : reflectance;
    if (u.axes[1]) {
      u.axes[1].label = continuumRemoved
        ? "Continuum-removed reflectance"
        : "Surface Reflectance";
    }
    u.setData([wavelengths, activeData] as uPlot.AlignedData);
    recomputeOverlay();
  }, [reflectance, reflectanceCR, continuumRemoved, wavelengths, recomputeOverlay]);

  // Recompute overlay when selectedWavelength or diagnosticFeatures change
  useEffect(() => {
    recomputeOverlay();
  }, [selectedWavelength, diagnosticFeatures, recomputeOverlay]);

  // Sync cursor style when mode changes (chart only initializes once)
  useEffect(() => {
    const u = uplotRef.current;
    if (!u) return;
    u.over.style.cursor = mode === "feature_spotting" ? "crosshair" : "grab";
  }, [mode]);

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const u = uplotRef.current;
      if (!u) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      u.setSize({ width: w, height: h });
      recomputeOverlay();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [recomputeOverlay]);

  const { plotTop, plotHeight } = plotBbox;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[400px] md:h-[500px]"
    >
      {/* uPlot mounts here */}
      <div ref={chartRef} className="absolute inset-0 overflow-hidden" />

      {/* SVG overlay */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={svgSize.width}
        height={svgSize.height}
        style={{ width: svgSize.width, height: svgSize.height }}
      >
        {/* Atmospheric gap shading */}
        {gapRects.map((gap, i) => (
          <g key={i}>
            <rect
              x={gap.x}
              y={plotTop}
              width={gap.width}
              height={plotHeight}
              fill={TOKEN.gapFill}
            />
            {gap.width > 20 && (
              <text
                x={gap.cx}
                y={plotTop + 16}
                textAnchor="middle"
                fontSize="11"
                fill={TOKEN.inkSoft}
                style={{ fontFamily: TOKEN.font }}
              >
                {gap.label}
              </text>
            )}
          </g>
        ))}

        {/* Region labels */}
        {showRegionLabels &&
          regionLabels.map((r, i) => (
            <text
              key={i}
              x={r.x}
              y={svgSize.height - 6}
              textAnchor="middle"
              fontSize="10"
              fill={TOKEN.inkSoft}
              style={{ fontFamily: TOKEN.font }}
            >
              {r.label}
            </text>
          ))}

        {/* Hint overlay — dashed lines with accent-soft pill labels */}
        <g style={{ opacity: showHints ? 1 : 0, transition: "opacity 350ms ease" }}>
          {hintLines.map((h, i) => {
            const truncated = h.label.length > 24 ? h.label.slice(0, 22) + "…" : h.label;
            const pillW = Math.min(truncated.length * 5.5 + 10, 160);
            return (
              <g key={i}>
                <line
                  x1={h.x} y1={plotTop}
                  x2={h.x} y2={plotTop + plotHeight}
                  stroke={TOKEN.accent}
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.75"
                />
                <g transform={`translate(${h.x + 4}, ${plotTop + 14 + (i % 2) * 14})`}>
                  <rect x="0" y="-8" width={pillW} height="14" rx="2"
                    fill={TOKEN.accentSoft}
                    stroke={TOKEN.accentBorder} strokeOpacity="0.3"
                  />
                  <text x="5" y="2"
                    fontSize="11" fontWeight="500" fill={TOKEN.accent}
                    style={{ fontFamily: TOKEN.font }}
                  >
                    {truncated}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* Selected wavelength marker (feature spotting) */}
        {selectedMarkerX !== null && (
          <line
            x1={selectedMarkerX} y1={plotTop}
            x2={selectedMarkerX} y2={plotTop + plotHeight}
            stroke={TOKEN.accent}
            strokeWidth="2"
            style={{ pointerEvents: "none" }}
          />
        )}
      </svg>

      {/* Crosshair readout */}
      {cursor && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "4px 8px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: TOKEN.inkSoft,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 10,
          }}
        >
          λ = {cursor.lambda} nm &nbsp; R = {cursor.r.toFixed(3)}
        </div>
      )}
    </div>
  );
}
