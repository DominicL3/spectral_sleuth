import type { QuestionResponse, MultipleChoicePayload, CategoryIDPayload, FeatureSpottingPayload } from "../lib/types";
import MultipleChoiceUI from "./modes/MultipleChoiceUI";
import CategoryIDUI from "./modes/CategoryIDUI";
import FeatureSpottingUI from "./modes/FeatureSpottingUI";

interface Props {
  question: QuestionResponse;
  selectedWavelength?: number | null;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export default function QuestionPanel({
  question,
  selectedWavelength,
  onSubmit,
  disabled,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          fontSize: 22,
          color: "var(--color-ink)",
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
          margin: 0,
        }}
      >
        {question.prompt}
      </h2>

      {question.mode === "multiple_choice" && (
        <MultipleChoiceUI
          payload={question.payload as MultipleChoicePayload}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      )}

      {question.mode === "category_id" && (
        <CategoryIDUI
          payload={question.payload as CategoryIDPayload}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      )}

      {question.mode === "feature_spotting" && (
        <FeatureSpottingUI
          payload={question.payload as FeatureSpottingPayload}
          selectedWavelength={selectedWavelength ?? null}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      )}
    </div>
  );
}
