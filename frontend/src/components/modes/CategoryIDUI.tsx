import { useState } from "react";
import type { CategoryIDPayload } from "../../lib/types";

interface Props {
  payload: CategoryIDPayload;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CategoryIDUI({ payload, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(category: string) {
    if (disabled || selected !== null) return;
    setSelected(category);
    onSubmit(category);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {payload.categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleSelect(cat)}
          disabled={disabled || selected !== null}
          className={[
            "px-5 py-2 rounded-full border text-sm font-medium transition-colors",
            selected === cat
              ? "bg-slate-800 text-white border-slate-800"
              : selected !== null || disabled
              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50 active:bg-slate-100",
          ].join(" ")}
        >
          {capitalize(cat)}
        </button>
      ))}
    </div>
  );
}
