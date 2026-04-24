interface Props {
  score: number;
  answered: number;
  correct: number;
}

export default function ScoreTracker({ score, answered, correct }: Props) {
  return (
    <div className="w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between text-sm">
      <span className="font-bold text-slate-800 text-base">Spectral Sleuth</span>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <span className="font-semibold text-slate-800">{score}</span>
          <span className="text-slate-500 text-xs">Score</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-slate-800">{answered}</span>
          <span className="text-slate-500 text-xs">Answered</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-slate-800">{correct}</span>
          <span className="text-slate-500 text-xs">Correct</span>
        </div>
      </div>
    </div>
  );
}
