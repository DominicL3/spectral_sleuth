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
      style={{
        background: "transparent",
        border: "none",
        padding: "4px 0",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: used ? "var(--color-ink-soft)" : "var(--color-accent)",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        cursor: used || disabled ? "default" : "pointer",
        opacity: used ? 0.5 : 1,
      }}
    >
      {used ? "Hint shown" : "Use a hint (−5)"}
    </button>
  );
}
