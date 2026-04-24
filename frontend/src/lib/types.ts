/**
 * lib/types.ts — TypeScript mirror of backend/quiz/schemas.py (Pydantic models).
 * Agent B and C must import from here; do not duplicate these types.
 */

// ---------------------------------------------------------------------------
// Quiz mode discriminant
// ---------------------------------------------------------------------------

export type QuizMode = "multiple_choice" | "category_id" | "feature_spotting";

// ---------------------------------------------------------------------------
// Spectrum models
// ---------------------------------------------------------------------------

export interface DiagnosticFeature {
  wavelength_nm: number;
  label: string;
  description: string;
}

export interface SpectrumIndexEntry {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  display_name: string;
}

export interface SpectrumFull {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  display_name: string;
  wavelengths_nm: number[];
  // Some spectra contain `null` values in masked regions; uPlot renders gaps.
  reflectance: (number | null)[];
  reflectance_cr: (number | null)[];
  diagnostic_features: DiagnosticFeature[];
  explanation: string;
}

// ---------------------------------------------------------------------------
// Question / evaluation models
// ---------------------------------------------------------------------------

/** Payload shapes differ per mode */
export interface MultipleChoicePayload {
  choices: string[];
}

export interface CategoryIDPayload {
  categories: string[];
}

export interface FeatureSpottingPayload {
  feature_label: string;
}

export type QuestionPayload =
  | MultipleChoicePayload
  | CategoryIDPayload
  | FeatureSpottingPayload;

export interface QuestionResponse {
  question_id: string;
  mode: QuizMode;
  spectrum_id: string;
  prompt: string;
  payload: QuestionPayload;
}

export interface EvaluateRequest {
  question_id: string;
  user_answer: string;
  hint_used?: boolean;
}

export interface Result {
  correct: boolean;
  correct_answer: string;
  score_delta: number;
  explanation: string;
  diagnostic_features: DiagnosticFeature[];
}

// ---------------------------------------------------------------------------
// Error model
// ---------------------------------------------------------------------------

export interface ErrorResponse {
  error: string;
  detail: string | null;
}
