import { useState } from "react";
import type { CategoryIDPayload } from "../../lib/types";
import AnswerChoice from "../ui/AnswerChoice";
import PrimaryButton from "../ui/PrimaryButton";

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
    if (disabled) return;
    setSelected(category);
  }

  function handleSubmit() {
    if (!selected || disabled) return;
    onSubmit(selected);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {payload.categories.map((cat) => (
          <AnswerChoice
            key={cat}
            label={capitalize(cat)}
            selected={selected === cat}
            onClick={() => handleSelect(cat)}
            disabled={disabled}
          />
        ))}
      </div>
      <PrimaryButton onClick={handleSubmit} disabled={!selected || disabled}>
        Submit Answer
      </PrimaryButton>
    </div>
  );
}
