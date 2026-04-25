import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHealth } from "../lib/quizClient";
import MagnifyingGlassHero from "../components/MagnifyingGlassHero";
import PrimaryButton from "../components/ui/PrimaryButton";

type BackendStatus = "checking" | "ok" | "error" | "warming";

const STATUS_LABELS: Record<BackendStatus, string> = {
  checking: "● Connecting…",
  warming: "● Warming up…",
  ok: "● Connected",
  error: "● Offline",
};

const STATUS_COLORS: Record<BackendStatus, string> = {
  checking: "var(--color-ink-soft)",
  warming: "oklch(0.72 0.13 75)",
  ok: "var(--color-correct)",
  error: "var(--color-wrong)",
};

export default function Landing() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let warmingTimer: ReturnType<typeof setTimeout> | null = null;

    warmingTimer = setTimeout(() => {
      setStatus((prev) => (prev === "checking" ? "warming" : prev));
    }, 2000);

    getHealth()
      .then(() => {
        if (warmingTimer) clearTimeout(warmingTimer);
        setStatus("ok");
      })
      .catch(() => {
        if (warmingTimer) clearTimeout(warmingTimer);
        setStatus("error");
      });

    return () => {
      if (warmingTimer) clearTimeout(warmingTimer);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        padding: 40,
        flexDirection: "column",
        gap: 48,
      }}
    >
      <MagnifyingGlassHero />

      <div
        style={{
          textAlign: "center",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 72,
            letterSpacing: "-0.035em",
            color: "var(--color-ink)",
            margin: 0,
            lineHeight: 0.95,
          }}
        >
          Spectral{" "}
          <em style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Sleuth</em>
        </h1>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--color-ink-soft)",
            margin: 0,
          }}
        >
          Train your eye to recognize reflectance spectra from minerals, vegetation,
          soils, water, and more. Identify materials from their spectral signatures
          across the 380–2500&nbsp;nm range.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
          <PrimaryButton
            onClick={() => navigate("/quiz")}
            style={{ padding: "14px 28px", fontSize: 15 }}
          >
            Start a session →
          </PrimaryButton>
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: STATUS_COLORS[status],
            letterSpacing: "0.08em",
            marginTop: 8,
            textTransform: "uppercase",
          }}
        >
          {STATUS_LABELS[status]}
        </div>

        {status === "error" && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--color-ink-soft)",
              margin: 0,
            }}
          >
            Make sure the backend is running at{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>localhost:8000</code>.
          </p>
        )}
      </div>
    </div>
  );
}
