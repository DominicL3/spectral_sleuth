interface Props {
  label: string;
  selected?: boolean;
  revealed?: boolean;
  correct?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export default function AnswerChoice({
  label,
  selected = false,
  revealed = false,
  correct = false,
  onClick,
  disabled,
}: Props) {
  let bg = "var(--color-surface)";
  let border = "var(--color-border)";
  let color = "var(--color-ink)";

  if (revealed && correct) {
    bg = "var(--color-correct-soft)";
    border = "var(--color-correct)";
    color = "var(--color-correct)";
  } else if (revealed && selected && !correct) {
    bg = "var(--color-wrong-soft)";
    border = "var(--color-wrong)";
    color = "var(--color-wrong)";
  } else if (selected) {
    bg = "var(--color-accent-soft)";
    border = "var(--color-accent)";
    color = "var(--color-accent)";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 14px",
        textAlign: "left",
        background: bg,
        border: `1px solid ${border}`,
        color,
        borderRadius: 6,
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s ease",
        width: "100%",
        lineHeight: 1.3,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !revealed)
          e.currentTarget.style.borderColor = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        if (!selected && !revealed)
          e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      {label}
    </button>
  );
}
