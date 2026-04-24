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

const REGIONS: [number, number, string][] = [
  [380, 1000, "VNIR"],
  [1000, 1800, "SWIR-1"],
  [1800, 2500, "SWIR-2"],
];

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
}: SpectrumChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
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

  // Stable ref for plotBbox so click handler doesn't go stale
  const plotBboxRef = useRef(plotBbox);
  plotBboxRef.current = plotBbox;

  // Derive full x-range from wavelengths
  const xMin = wavelengths[0] ?? 380;
  const xMax = wavelengths[wavelengths.length - 1] ?? 2500;

  // Keep refs for props that recomputeOverlay needs (to avoid stale closures)
  const atmosphericGapsRef = useRef(atmosphericGaps);
  atmosphericGapsRef.current = atmosphericGaps;
  const diagnosticFeaturesRef = useRef(diagnosticFeatures);
  diagnosticFeaturesRef.current = diagnosticFeatures;
  const selectedWavelengthRef = useRef(selectedWavelength);
  selectedWavelengthRef.current = selectedWavelength;

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

    // Atmospheric gap rects
    const newGaps: GapRect[] = gaps
      .map(([lo, hi]) => {
        const x1 = plotLeft + (u.valToPos(lo, "x") as number);
        const x2 = plotLeft + (u.valToPos(hi, "x") as number);
        if (!isFinite(x1) || !isFinite(x2)) return null;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const clampedLeft = Math.max(left, plotLeft);
        const clampedRight = Math.min(right, plotLeft + plotWidth);
        const width = Math.max(0, clampedRight - clampedLeft);
        return {
          x: clampedLeft,
          width,
          cx: clampedLeft + width / 2,
          label: "H₂O",
        } as GapRect;
      })
      .filter((g): g is GapRect => g !== null);
    setGapRects(newGaps);

    // Region labels
    const newRegions: RegionLabel[] = REGIONS
      .map(([lo, hi, label]) => {
        const x1 = plotLeft + (u.valToPos(lo, "x") as number);
        const x2 = plotLeft + (u.valToPos(hi, "x") as number);
        if (!isFinite(x1) || !isFinite(x2)) return null;
        return { x: (x1 + x2) / 2, label } as RegionLabel;
      })
      .filter((r): r is RegionLabel => r !== null);
    setRegionLabels(newRegions);

    // Hint lines
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

    // Selected wavelength marker
    if (selWl !== null) {
      const x = plotLeft + (u.valToPos(selWl, "x") as number);
      setSelectedMarkerX(isFinite(x) ? x : null);
    } else {
      setSelectedMarkerX(null);
    }

    // Update SVG size and plot bbox
    setSvgSize({ width: u.width, height: u.height });
    setPlotBbox({ plotLeft, plotTop, plotWidth, plotHeight });
  }, []);

  // Mount uPlot once
  useEffect(() => {
    if (!chartRef.current || wavelengths.length === 0) return;

    const activeData = continuumRemoved ? reflectanceCR : reflectance;

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth || 800,
      height: chartRef.current.clientHeight || 400,
      legend: { show: false },
      cursor: {
        drag: { x: true, y: false },
      },
      series: [
        { label: "λ (nm)" },
        {
          label: "Reflectance",
          stroke: "#334155",
          width: 1.5,
        },
      ],
      axes: [
        {
          label: "Wavelength (nm)",
          labelSize: 18,
          size: 40,
        },
        {
          label: continuumRemoved
            ? "Continuum-removed reflectance"
            : "Reflectance (0–1)",
          labelSize: 18,
          size: 70,
        },
      ],
      scales: {
        x: { time: false, min: xMin, max: xMax },
        y: { min: 0, max: 1.1 },
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

    return () => {
      u.destroy();
      uplotRef.current = null;
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
        : "Reflectance (0–1)";
    }
    u.setData([wavelengths, activeData] as uPlot.AlignedData);
    recomputeOverlay();
  }, [reflectance, reflectanceCR, continuumRemoved, wavelengths, recomputeOverlay]);

  // Recompute overlay when selectedWavelength or diagnosticFeatures change
  useEffect(() => {
    recomputeOverlay();
  }, [selectedWavelength, diagnosticFeatures, recomputeOverlay]);

  // ResizeObserver to keep uPlot and SVG sized to container
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

  // Handle click on SVG click-catcher for feature spotting
  function handlePlotClick(e: React.MouseEvent<SVGRectElement>) {
    if (mode !== "feature_spotting" || !onFeatureClick) return;
    const u = uplotRef.current;
    if (!u) return;

    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const { plotLeft } = plotBboxRef.current;
    const plotX = svgX - plotLeft;
    const wavelength = u.posToVal(plotX, "x");
    if (wavelength >= xMin && wavelength <= xMax) {
      onFeatureClick(Math.round(wavelength * 10) / 10);
    }
  }

  // Reset zoom
  function handleResetZoom() {
    const u = uplotRef.current;
    if (!u) return;
    u.setScale("x", { min: xMin, max: xMax });
  }

  const { plotLeft, plotTop, plotWidth, plotHeight } = plotBbox;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleResetZoom}
          className="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 active:bg-slate-100 text-slate-700 transition-colors"
        >
          Reset zoom
        </button>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="relative w-full h-[400px] md:h-[500px]"
      >
        {/* uPlot mounts here */}
        <div ref={chartRef} className="absolute inset-0 overflow-hidden" />

        {/* SVG overlay */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          width={svgSize.width}
          height={svgSize.height}
          style={{ width: svgSize.width, height: svgSize.height }}
        >
          {/* Feature spotting click-catcher — pointer-events-auto */}
          {mode === "feature_spotting" && plotWidth > 0 && (
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              style={{ pointerEvents: "auto", cursor: "crosshair" }}
              onClick={handlePlotClick}
            />
          )}

          {/* Atmospheric gap shading */}
          {gapRects.map((gap, i) => (
            <g key={i}>
              <rect
                x={gap.x}
                y={plotTop}
                width={gap.width}
                height={plotHeight}
                fill="rgba(148, 163, 184, 0.25)"
              />
              {gap.width > 20 && (
                <text
                  x={gap.cx}
                  y={plotTop + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(100,116,139,0.8)"
                  fontFamily="sans-serif"
                >
                  {gap.label}
                </text>
              )}
            </g>
          ))}

          {/* Region labels — gated on showRegionLabels */}
          {showRegionLabels &&
            regionLabels.map((r, i) => (
              <text
                key={i}
                x={r.x}
                y={svgSize.height - 6}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(100,116,139,0.6)"
                fontFamily="sans-serif"
              >
                {r.label}
              </text>
            ))}

          {/* Hint overlay — dashed lines with labels, fade-in transition */}
          <g
            style={{
              opacity: showHints ? 1 : 0,
              transition: "opacity 300ms ease",
            }}
          >
            {hintLines.map((h, i) => (
              <g key={i}>
                <line
                  x1={h.x}
                  y1={plotTop}
                  x2={h.x}
                  y2={plotTop + plotHeight}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text
                  x={h.x + 3}
                  y={plotTop + 14}
                  fontSize="9"
                  fill="#d97706"
                  fontFamily="sans-serif"
                >
                  {h.label.length > 20 ? h.label.slice(0, 18) + "…" : h.label}
                </text>
              </g>
            ))}
          </g>

          {/* Selected wavelength marker (feature spotting) */}
          {selectedMarkerX !== null && (
            <line
              x1={selectedMarkerX}
              y1={plotTop}
              x2={selectedMarkerX}
              y2={plotTop + plotHeight}
              stroke="#2563eb"
              strokeWidth="2"
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>

        {/* Crosshair readout — fixed top-right corner */}
        {cursor && (
          <div className="absolute top-2 right-2 bg-white/90 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-700 pointer-events-none select-none z-10">
            &lambda; = {cursor.lambda} nm &nbsp; R = {cursor.r.toFixed(3)}
          </div>
        )}
      </div>
    </div>
  );
}
