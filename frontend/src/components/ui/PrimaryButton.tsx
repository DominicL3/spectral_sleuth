type Variant = "solid" | "ghost";

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: React.CSSProperties;
  type?: "button" | "submit";
}

export default function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "solid",
  style,
  type = "button",
}: Props) {
  const base: React.CSSProperties = {
    padding: "12px 20px",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 6,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "filter 0.15s ease",
    letterSpacing: "0.01em",
    lineHeight: 1,
  };

  const variants: Record<Variant, React.CSSProperties> = {
    solid: {
      background: "var(--color-accent)",
      color: "var(--color-accent-fg)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-ink-soft)",
      border: "1px solid var(--color-border)",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.filter = "brightness(0.95)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "none";
      }}
    >
      {children}
    </button>
  );
}
