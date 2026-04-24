interface Props {
  used: boolean;
  onRequest: () => void;
  disabled?: boolean;
}

export default function HintOverlay({ used, onRequest, disabled }: Props) {
  return (
    <button
      onClick={onRequest}
      disabled={used || disabled}
      className={[
        "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
        used || disabled
          ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
          : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200",
      ].join(" ")}
    >
      {used ? "Hint used" : "Use hint (-5 pts)"}
    </button>
  );
}
