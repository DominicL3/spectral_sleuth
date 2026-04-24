import { useState } from "react";
import type { MultipleChoicePayload } from "../../lib/types";

interface Props {
  payload: MultipleChoicePayload;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export default function MultipleChoiceUI({ payload, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(choice: string) {
    if (disabled || selected !== null) return;
    setSelected(choice);
    onSubmit(choice);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {payload.choices.map((choice) => (
        <button
          key={choice}
          onClick={() => handleSelect(choice)}
          disabled={disabled || selected !== null}
          className={[
            "px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors",
            selected === choice
              ? "bg-slate-800 text-white border-slate-800"
              : selected !== null || disabled
              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50 active:bg-slate-100",
          ].join(" ")}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
