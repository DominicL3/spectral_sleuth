/**
 * lib/quizClient.ts — typed fetch wrappers for every API endpoint.
 * Reads the API base URL from the VITE_API_URL env variable.
 */

import type {
  EvaluateRequest,
  QuestionResponse,
  Result,
  SpectrumFull,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "unknown", detail: null }));
    throw Object.assign(new Error(body.error ?? "request_failed"), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}

export async function getSpectrum(id: string): Promise<SpectrumFull> {
  return request<SpectrumFull>(`/spectra/${encodeURIComponent(id)}`);
}

export async function createQuestion(
  sessionHistory: string[] = []
): Promise<QuestionResponse> {
  return request<QuestionResponse>("/question", {
    method: "POST",
    body: JSON.stringify({ session_history: sessionHistory }),
  });
}

export async function evaluateAnswer(payload: EvaluateRequest): Promise<Result> {
  return request<Result>("/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
