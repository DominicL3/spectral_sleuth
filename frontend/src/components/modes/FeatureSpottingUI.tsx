import type { FeatureSpottingPayload } from "../../lib/types";

interface Props {
  payload: FeatureSpottingPayload;
  selectedWavelength: number | null;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export default function FeatureSpottingUI({
  payload,
  selectedWavelength,
  onSubmit,
  disabled,
}: Props) {
  function handleSubmit() {
    if (selectedWavelength === null || disabled) return;
    onSubmit(String(selectedWavelength));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Feature to find
        </span>
        <span className="text-lg font-bold text-slate-800">
          {payload.feature_label}
        </span>
        <p className="text-sm text-slate-600">
          Click the wavelength on the chart where you see this feature.
        </p>
      </div>

      {selectedWavelength !== null ? (
        <div className="text-sm text-slate-700 font-medium">
          Selected:{" "}
          <span className="font-bold text-slate-800">
            {Math.round(selectedWavelength)} nm
          </span>
        </div>
      ) : (
        <div className="text-sm text-slate-400 italic">
          No wavelength selected yet
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={selectedWavelength === null || disabled}
        className={[
          "px-6 py-3 rounded-lg font-semibold text-sm transition-colors",
          selectedWavelength !== null && !disabled
            ? "bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900"
            : "bg-slate-100 text-slate-400 cursor-not-allowed",
        ].join(" ")}
      >
        Submit Answer
      </button>
    </div>
  );
}
