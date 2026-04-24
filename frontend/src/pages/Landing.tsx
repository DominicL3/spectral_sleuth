import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHealth } from "../lib/quizClient";

type BackendStatus = "checking" | "ok" | "error" | "warming";

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-slate-50">
      <div className="max-w-lg w-full flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold text-slate-800 tracking-tight">
            Spectral Sleuth
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Train your eye to recognize reflectance spectra from minerals,
            vegetation, soils, water, and more. Identify materials from their
            spectral signatures across the 380–2500 nm range.
          </p>
        </div>

        <button
          onClick={() => navigate("/quiz")}
          className="px-8 py-3 bg-slate-800 text-white text-lg font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition-colors"
        >
          Start Quiz
        </button>

        {status === "warming" && (
          <p className="text-sm text-amber-600 font-medium">
            warming up backend...
          </p>
        )}

        {status === "ok" && (
          <p className="text-sm text-green-600 font-medium">connected</p>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-red-600 font-medium">
              Could not reach the backend. The quiz may not work correctly.
            </p>
            <p className="text-xs text-slate-500">
              Make sure the backend server is running at{" "}
              <code className="font-mono">localhost:8000</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
