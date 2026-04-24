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
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-800">{question.prompt}</h2>

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
