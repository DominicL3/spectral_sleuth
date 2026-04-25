import type { Result } from "../lib/types";
import PrimaryButton from "./ui/PrimaryButton";

interface Props {
  result: Result;
  onNext: () => void;
}

export default function ExplanationPanel({ result, onNext }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Correct/incorrect banner */}
      <div
        style={{
          padding: "10px 14px",
          background: result.correct ? "var(--color-correct-soft)" : "var(--color-wrong-soft)",
          border: `1px solid ${result.correct ? "var(--color-correct)" : "var(--color-wrong)"}`,
          color: result.correct ? "var(--color-correct)" : "var(--color-wrong)",
          borderRadius: 6,
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: 14,
        }}
      >
        {result.correct ? "Correct!" : "Not quite."}
      </div>

      {/* Correct answer */}
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-ink-soft)" }}>
        Correct answer:{" "}
        <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>{result.correct_answer}</span>
      </div>

      {/* Score delta */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-accent)",
          fontWeight: 500,
        }}
      >
        {result.score_delta > 0 ? "+" : ""}
        {result.score_delta} pts
      </div>

      {/* Explanation */}
      <div
        style={{
          padding: 14,
          background: "var(--color-surface-2)",
          borderRadius: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--color-ink-soft)",
          border: "1px solid var(--color-border-soft)",
          whiteSpace: "pre-wrap",
        }}
      >
        {result.explanation}
      </div>

      <PrimaryButton onClick={onNext}>Next question →</PrimaryButton>
    </div>
  );
}
