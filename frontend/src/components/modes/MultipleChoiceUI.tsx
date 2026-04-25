import { useState } from "react";
import type { MultipleChoicePayload } from "../../lib/types";
import AnswerChoice from "../ui/AnswerChoice";

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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {payload.choices.map((choice) => (
        <AnswerChoice
          key={choice}
          label={choice}
          selected={selected === choice}
          onClick={() => handleSelect(choice)}
          disabled={disabled || selected !== null}
        />
      ))}
    </div>
  );
}
