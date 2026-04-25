interface Props {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export default function AnswerChoice({
  label,
  selected = false,
  onClick,
  disabled,
}: Props) {
  const bg = selected ? "var(--color-accent-soft)" : "var(--color-surface)";
  const border = selected ? "var(--color-accent)" : "var(--color-border)";
  const color = selected ? "var(--color-accent)" : "var(--color-ink)";

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
        if (!disabled) e.currentTarget.style.borderColor = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      {label}
    </button>
  );
}
