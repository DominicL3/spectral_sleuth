import type { Result } from "../lib/types";

interface Props {
  result: Result;
  onNext: () => void;
}

export default function ExplanationPanel({ result, onNext }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Correct/incorrect banner */}
      <div
        className={[
          "rounded-lg px-4 py-3 font-semibold text-base",
          result.correct
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-red-100 text-red-800 border border-red-200",
        ].join(" ")}
      >
        {result.correct ? "Correct!" : "Incorrect"}
      </div>

      {/* Correct answer */}
      <div className="text-sm text-slate-700">
        <span className="text-slate-500">Correct answer: </span>
        <span className="font-bold">{result.correct_answer}</span>
      </div>

      {/* Score delta */}
      {result.score_delta > 0 && (
        <div className="text-sm font-semibold text-green-700">
          +{result.score_delta} points
        </div>
      )}
      {result.score_delta === 0 && (
        <div className="text-sm text-slate-500">0 points</div>
      )}

      {/* Explanation */}
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
        {result.explanation}
      </div>

      {/* Next question button */}
      <button
        onClick={onNext}
        className="w-full px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition-colors"
      >
        Next Question
      </button>
    </div>
  );
}
