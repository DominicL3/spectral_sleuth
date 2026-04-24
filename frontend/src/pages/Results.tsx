import { useLocation, useNavigate } from "react-router-dom";

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
  const accuracy =
    answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-slate-50">
      <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold text-slate-800">Session Complete</h1>

        <div className="w-full bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-5xl font-bold text-slate-800">{score}</span>
            <span className="text-slate-500 text-sm">Final Score</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-semibold text-slate-700">
                {answered}
              </span>
              <span className="text-slate-500 text-xs">Questions Answered</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-semibold text-slate-700">
                {correct}
              </span>
              <span className="text-slate-500 text-xs">Correct</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-slate-600 text-sm">
              Accuracy:{" "}
              <span className="font-semibold text-slate-800">{accuracy}%</span>
            </span>
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          You answered {answered} question{answered !== 1 ? "s" : ""},{" "}
          {correct} correct. Final score: {score}.
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => navigate("/quiz")}
            className="flex-1 px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
