import type { FeatureSpottingPayload } from "../../lib/types";
import PrimaryButton from "../ui/PrimaryButton";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: 14,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border-soft)",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-ink-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Feature to find
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 16,
            color: "var(--color-ink)",
          }}
        >
          {payload.feature_label}
        </span>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-ink-soft)", margin: 0 }}>
          Click the wavelength on the chart where you see this feature.
        </p>
      </div>

      {selectedWavelength !== null ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-ink-soft)",
          }}
        >
          Selected:{" "}
          <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>
            {Math.round(selectedWavelength)} nm
          </span>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--color-ink-soft)",
            fontStyle: "italic",
          }}
        >
          No wavelength selected yet
        </div>
      )}

      <PrimaryButton
        onClick={handleSubmit}
        disabled={selectedWavelength === null || disabled}
      >
        Submit Answer
      </PrimaryButton>
    </div>
  );
}
