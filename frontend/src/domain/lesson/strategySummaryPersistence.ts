/**
 * Phase 3B / 3B.1 — Strategy Summary override persistence helpers.
 * Presentation layer only — no SYS/STR/calculation mutation.
 */

import {
  normalizeStrategySummaryDraftText,
  type OnePointLessonItem,
  buildCommittedOnePointLessons,
} from "./aiCommentEditorSession";
import {
  assertStrategySummaryNumericSubmultiset,
  type StrategySummaryTemplateInputs,
} from "./strategySummaryTemplate";
import { extractNumericTokens } from "../../../api/_lib/numericGuard.js";

export { extractNumericTokens };
export { assertStrategySummaryNumericSubmultiset as assertStrategySummaryNumericPreserved };

/** Fingerprint aligned with final Strategy Summary generator inputs (v2). */
export type StrategySummaryFingerprintInputs = {
  systemId: string;
  shotType: string;
  baseCo: number | null;
  unifiedSlide: number | null;
  effCo: number | null;
  inclination: number | null;
  baseC1: number | null;
  effC3: number | null;
  sn: number | null;
  c4: number | null;
};

export type SlotAiPresentation = {
  text?: string;
  onePointLessons?: OnePointLessonItem[];
  strategySummaryOverride?: string;
  strategySummaryFingerprint?: string;
};

/** Effective summary: committed override wins; else generated. */
export function resolveEffectiveStrategySummary(args: {
  generatedSummary?: unknown;
  strategySummaryOverride?: unknown;
}): string {
  const override = normalizeStrategySummaryDraftText(
    args.strategySummaryOverride
  );
  if (override) return override;
  return normalizeStrategySummaryDraftText(args.generatedSummary);
}

export function buildStrategySummaryFingerprintInputs(
  templateInputs: StrategySummaryTemplateInputs
): StrategySummaryFingerprintInputs {
  return {
    systemId: templateInputs.systemId,
    shotType: templateInputs.shotType,
    baseCo: templateInputs.baseCo,
    unifiedSlide: templateInputs.unifiedSlide,
    effCo: templateInputs.effCo,
    inclination: templateInputs.inclination,
    baseC1: templateInputs.baseC1,
    effC3: templateInputs.effC3,
    sn: templateInputs.sn,
    c4: templateInputs.c4,
  };
}

/** Deterministic stale-detection fingerprint (not a security hash). */
export function serializeStrategySummaryFingerprint(
  inputs: StrategySummaryFingerprintInputs
): string {
  const ordered = {
    systemId: inputs.systemId,
    shotType: inputs.shotType,
    baseCo: inputs.baseCo,
    unifiedSlide: inputs.unifiedSlide,
    effCo: inputs.effCo,
    inclination: inputs.inclination,
    baseC1: inputs.baseC1,
    effC3: inputs.effC3,
    sn: inputs.sn,
    c4: inputs.c4,
  };
  return `v2:${JSON.stringify(ordered)}`;
}

export function isStrategySummaryOverrideStale(args: {
  strategySummaryOverride?: unknown;
  strategySummaryFingerprint?: unknown;
  currentFingerprint?: unknown;
}): boolean {
  const override = normalizeStrategySummaryDraftText(
    args.strategySummaryOverride
  );
  if (!override) return false;
  const stored =
    args.strategySummaryFingerprint == null
      ? ""
      : String(args.strategySummaryFingerprint);
  const current =
    args.currentFingerprint == null ? "" : String(args.currentFingerprint);
  if (!stored) return true;
  return stored !== current;
}

/**
 * Build Apply AI payload including optional Strategy Summary override.
 * Identical-to-generated draft → omit override fields (clears prior override on full ai replace).
 */
export function buildAiCommentApplyPayloadWithSummary(args: {
  draftText: unknown;
  preferLessonId?: string | null;
  strategySummaryDraft?: unknown;
  generatedStrategySummary?: unknown;
  fingerprint?: string | null;
}): SlotAiPresentation {
  const lessons = buildCommittedOnePointLessons(args.draftText, {
    preferId: args.preferLessonId,
  });
  const draft = normalizeStrategySummaryDraftText(args.strategySummaryDraft);
  const generated = normalizeStrategySummaryDraftText(
    args.generatedStrategySummary
  );
  const payload: SlotAiPresentation = {
    text: "",
    onePointLessons: lessons,
  };
  if (draft && draft !== generated) {
    payload.strategySummaryOverride = draft;
    payload.strategySummaryFingerprint =
      args.fingerprint == null ? "" : String(args.fingerprint);
  }
  return payload;
}
