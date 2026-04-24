import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuestion, evaluateAnswer, getSpectrum } from "../lib/quizClient";
import type { QuestionResponse, Result, SpectrumFull } from "../lib/types";
import ScoreTracker from "../components/ScoreTracker";
import SpectrumChart from "../components/SpectrumChart";
import QuestionPanel from "../components/QuestionPanel";
import HintOverlay from "../components/HintOverlay";
import ExplanationPanel from "../components/ExplanationPanel";

type Phase = "loading" | "answering" | "evaluating" | "showing_result";

interface ErrorState {
  message: string;
}

export default function Quiz() {
  const navigate = useNavigate();

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

  // Error state
  const [error, setError] = useState<ErrorState | null>(null);

  useEffect(() => {
    if (phase !== "loading") return;
    setError(null);

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
        setError({ message: err instanceof Error ? err.message : "Failed to load question" });
        setPhase("answering"); // stop spinning; user can retry
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally only trigger on phase change, not sessionHistory
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
      setError({ message: err instanceof Error ? err.message : "Failed to evaluate answer" });
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <ScoreTracker score={score} answered={answered} correct={correct} />

      {/* Error banner */}
      {error && (
        <div className="w-full bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-red-700">{error.message}</span>
          <button
            onClick={handleRetry}
            className="text-sm text-red-700 font-semibold underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {phase === "loading" && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span className="text-sm">Loading question...</span>
          </div>
        </div>
      )}

      {/* Main quiz layout */}
      {currentSpectrum && currentQuestion && phase !== "loading" && (
        <div className="flex-1 flex flex-col lg:flex-row gap-0">
          {/* Chart column */}
          <div className="flex-1 flex flex-col p-4 gap-3 min-w-0">
            {/* Chart controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setContinuumRemoved((v) => !v)}
                className={[
                  "px-3 py-1 text-xs font-medium rounded border transition-colors",
                  continuumRemoved
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {continuumRemoved ? "Continuum Removed" : "Raw Reflectance"}
              </button>
            </div>

            <SpectrumChart
              wavelengths={currentSpectrum.wavelengths_nm}
              reflectance={currentSpectrum.reflectance}
              reflectanceCR={currentSpectrum.reflectance_cr}
              diagnosticFeatures={currentSpectrum.diagnostic_features}
              showHints={showHints}
              continuumRemoved={continuumRemoved}
              mode={currentQuestion.mode}
              selectedWavelength={selectedWavelength}
              onFeatureClick={setSelectedWavelength}
            />
          </div>

          {/* Question column */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 p-4 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white">
            {phase === "evaluating" && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Evaluating...
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
              <ExplanationPanel
                result={result}
                onNext={handleNextQuestion}
              />
            )}

            {/* End session */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <button
                onClick={handleEndSession}
                className="w-full px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
