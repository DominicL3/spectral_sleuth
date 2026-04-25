import { useState } from "react";
import type { CategoryIDPayload } from "../../lib/types";
import AnswerChoice from "../ui/AnswerChoice";

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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {payload.categories.map((cat) => (
        <AnswerChoice
          key={cat}
          label={capitalize(cat)}
          selected={selected === cat}
          onClick={() => handleSelect(cat)}
          disabled={disabled || selected !== null}
        />
      ))}
    </div>
  );
}
