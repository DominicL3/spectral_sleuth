import { useLocation, useNavigate } from "react-router-dom";
import PrimaryButton from "../components/ui/PrimaryButton";

interface ResultsState {
  score: number;
  answered: number;
  correct: number;
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsState | null;

  if (!state) {
    navigate("/");
    return null;
  }

  const { score, answered, correct } = state;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 32,
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 36,
            color: "var(--color-ink)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Session{" "}
          <em style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Complete</em>
        </h1>

        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 56,
                color: "var(--color-ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--color-ink-soft)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Final Score
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--color-border-soft)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 28,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {answered}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Answered
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 28,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {correct}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Correct
              </span>
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--color-ink-soft)",
              paddingTop: 4,
            }}
          >
            Accuracy:{" "}
            <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>{accuracy}%</span>
          </div>
        </div>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--color-ink-soft)",
            margin: 0,
          }}
        >
          You answered {answered} question{answered !== 1 ? "s" : ""}, {correct} correct.
        </p>

        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <PrimaryButton
            onClick={() => navigate("/quiz")}
            style={{ flex: 1 }}
          >
            Play Again
          </PrimaryButton>
          <PrimaryButton
            variant="ghost"
            onClick={() => navigate("/")}
            style={{ flex: 1 }}
          >
            Home
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
