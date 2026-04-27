import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuestion, evaluateAnswer, getSpectrum } from "../lib/quizClient";
import type { QuestionResponse, Result, SpectrumFull } from "../lib/types";
import SpectrumChart from "../components/SpectrumChart";
import QuestionPanel from "../components/QuestionPanel";
import HintOverlay from "../components/HintOverlay";
import ExplanationPanel from "../components/ExplanationPanel";
import ScoreStat from "../components/ui/ScoreStat";

type Phase = "loading" | "answering" | "evaluating" | "showing_result";

function ctrlBtn(active: boolean): React.CSSProperties {
  return {
    padding: "5px 10px",
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
    background: active ? "var(--color-accent-soft)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-ink-soft)",
    borderRadius: 4,
    cursor: "pointer",
  };
}

export default function Quiz() {
  const navigate = useNavigate();
  const resetZoomRef = useRef<(() => void) | null>(null);

  // Session state
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);

  // Per-question state
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [currentSpectrum, setCurrentSpectrum] = useState<SpectrumFull | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [selectedWavelength, setSelectedWavelength] = useState<number | null>(null);
  const [continuumRemoved, setContinuumRemoved] = useState(false);
  const [showAtmosphericGaps, setShowAtmosphericGaps] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;

    (async () => {
      try {
        const q = await createQuestion(sessionHistory);
        if (cancelled) return;
        const spec = await getSpectrum(q.spectrum_id);
        if (cancelled) return;
        setCurrentQuestion(q);
        setCurrentSpectrum(spec);
        setHintUsed(false);
        setShowHints(false);
        setSelectedWavelength(null);
        setResult(null);
        setPhase("answering");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load question");
        setPhase("answering");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function handleSubmit(answer: string) {
    if (!currentQuestion) return;
    setPhase("evaluating");
    setError(null);

    try {
      const res = await evaluateAnswer({
        question_id: currentQuestion.question_id,
        user_answer: answer,
        hint_used: hintUsed,
      });
      setResult(res);
      setScore((s) => s + res.score_delta);
      setAnswered((a) => a + 1);
      if (res.correct) setCorrect((c) => c + 1);
      setShowHints(true);
      setSessionHistory((hist) => {
        const next = [...hist, currentQuestion.spectrum_id];
        return next.slice(-10);
      });
      setPhase("showing_result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate answer");
      setPhase("answering");
    }
  }

  function handleHintRequest() {
    setHintUsed(true);
    setShowHints(true);
  }

  function handleNextQuestion() {
    setPhase("loading");
  }

  function handleRetry() {
    setPhase("loading");
  }

  function handleEndSession() {
    navigate("/results", { state: { score, answered, correct } });
  }

  const isLoading = phase === "loading" || phase === "evaluating";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        minHeight: "100vh",
        background: "var(--color-bg)",
      }}
      className="max-lg:flex max-lg:flex-col"
    >
      {/* Main column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "28px 32px",
          gap: 20,
          minWidth: 0,
        }}
      >
        {/* Brand header */}
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: "-0.02em",
            color: "var(--color-ink)",
            lineHeight: 1,
          }}
        >
          Spectral{" "}
          <em style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Sleuth</em>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: "var(--color-wrong-soft)",
              border: "1px solid var(--color-wrong)",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-wrong)" }}>
              {error}
            </span>
            <button
              onClick={handleRetry}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-wrong)",
                textDecoration: "underline",
                cursor: "pointer",
                marginLeft: 12,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {phase === "loading" && !error && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: "2px solid var(--color-border)",
                  borderTopColor: "var(--color-accent)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
                className="animate-spin"
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Loading…
              </span>
            </div>
          </div>
        )}

        {/* Chart card */}
        {currentSpectrum && currentQuestion && phase !== "loading" && (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Card header: eyebrow + controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-ink-soft)",
                  fontWeight: 400,
                }}
              >
                Reflectance spectrum
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={ctrlBtn(!continuumRemoved)}
                  onClick={() => setContinuumRemoved(false)}
                >
                  Raw
                </button>
                <button
                  style={ctrlBtn(continuumRemoved)}
                  onClick={() => setContinuumRemoved(true)}
                >
                  Continuum-Removed
                </button>
                <button
                  style={ctrlBtn(showAtmosphericGaps)}
                  onClick={() => setShowAtmosphericGaps((v) => !v)}
                >
                  H₂O bands
                </button>
                <button
                  style={ctrlBtn(false)}
                  onClick={() => resetZoomRef.current?.()}
                >
                  Reset zoom
                </button>
              </div>
            </div>

            <SpectrumChart
              wavelengths={currentSpectrum.wavelengths_nm}
              reflectance={currentSpectrum.reflectance}
              reflectanceCR={currentSpectrum.reflectance_cr}
              diagnosticFeatures={currentSpectrum.diagnostic_features}
              showHints={showHints}
              continuumRemoved={continuumRemoved}
              showAtmosphericGaps={showAtmosphericGaps}
              mode={currentQuestion.mode}
              selectedWavelength={selectedWavelength}
              onFeatureClick={setSelectedWavelength}
              resetZoomRef={resetZoomRef}
            />
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <aside
        style={{
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          padding: 28,
          gap: 28,
        }}
        className="max-lg:border-l-0 max-lg:border-t max-lg:border-t-border"
      >
        {/* Session stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            paddingBottom: 20,
            borderBottom: "1px solid var(--color-border-soft)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-ink-soft)",
            }}
          >
            Session
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <ScoreStat label="Score" value={score} />
            <ScoreStat label="Answered" value={answered} />
            <ScoreStat label="Correct" value={correct} />
          </div>
        </div>

        {/* Question area */}
        {currentQuestion && phase !== "loading" && (
          <>
            {phase === "evaluating" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid var(--color-border)",
                    borderTopColor: "var(--color-accent)",
                    borderRadius: "50%",
                  }}
                />
                Evaluating…
              </div>
            )}

            {(phase === "answering" || phase === "evaluating") && (
              <>
                <QuestionPanel
                  question={currentQuestion}
                  selectedWavelength={selectedWavelength}
                  onSubmit={handleSubmit}
                  disabled={isLoading}
                />
                <HintOverlay
                  used={hintUsed}
                  onRequest={handleHintRequest}
                  disabled={isLoading}
                />
              </>
            )}

            {phase === "showing_result" && result && (
              <ExplanationPanel result={result} onNext={handleNextQuestion} />
            )}
          </>
        )}

        {/* End session */}
        <button
          onClick={handleEndSession}
          style={{
            marginTop: "auto",
            padding: "10px 14px",
            background: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--color-ink-soft)",
            cursor: "pointer",
          }}
        >
          End session
        </button>
      </aside>
    </div>
  );
}
