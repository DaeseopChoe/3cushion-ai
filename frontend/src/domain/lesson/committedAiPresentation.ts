/**
 * Phase 3C — USER/ADMIN shared committed AI presentation (pure).
 * Reads committed slot AI + Strategy Summary template SSOT only.
 * No React / LS / OpenAI / calculation / draft session state.
 */

import {
  activeOnePointBlockText,
  normalizeOnePointBlockText,
  pickCommittedAiForUser,
} from "./aiCommentEditorSession";
import {
  resolveEffectiveStrategySummary,
} from "./strategySummaryPersistence";
import {
  buildStrategySummaryTemplateInputs,
  composeFinalStrategySummary,
  type StrategySummaryTemplateInputs,
} from "./strategySummaryTemplate";

export type CommittedAiSlice = {
  text?: unknown;
  onePointLessons?: unknown;
  strategySummaryOverride?: unknown;
  strategySummaryFingerprint?: unknown;
} | null;

export type CommittedAiPresentation = {
  /** Effective Strategy Summary (override ?: generated). */
  strategySummaryText: string;
  /** Non-empty lines for read-only paragraph rendering. */
  strategySummaryParagraphs: string[];
  /** Committed current-shot PRO ONE POINT (may be multi-paragraph). */
  onePointText: string;
  /** Non-empty lines for one-point rendering. */
  onePointParagraphs: string[];
  hasStrategySummary: boolean;
  hasOnePoint: boolean;
  isEmpty: boolean;
};

function splitPresentationParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

/**
 * USER slot AI selector: prefer applied (Apply-committed), then draft.
 * Does not read adminState / session drafts.
 * Distinct from pickCommittedAiForUser(draft-first) used by ADMIN session helpers.
 */
export function selectCommittedSlotAiForUser(args: {
  draftAi?: CommittedAiSlice;
  appliedAi?: CommittedAiSlice;
}): NonNullable<ReturnType<typeof pickCommittedAiForUser>> | null {
  // Prefer applied → draft so USER leans on Apply-committed copy when they diverge.
  return pickCommittedAiForUser({
    draftAi: args.appliedAi ?? null,
    appliedAi: args.draftAi ?? null,
  });
}

export function buildCommittedAiPresentation(args: {
  committedAi?: CommittedAiSlice;
  /** Pre-built template inputs (preferred). */
  templateInputs?: StrategySummaryTemplateInputs | null;
  /** Or raw pieces to build template inputs (no engine calls). */
  systemId?: unknown;
  shotType?: unknown;
  baseValues?: Record<string, unknown> | null;
  correctedValues?: Record<string, unknown> | null;
  corrections?: {
    slide?: unknown;
    draw?: unknown;
    curve_ratio?: unknown;
    spin?: unknown;
    departure?: unknown;
  } | null;
}): CommittedAiPresentation {
  const inputs =
    args.templateInputs ??
    buildStrategySummaryTemplateInputs({
      systemId: args.systemId,
      shotType: args.shotType,
      baseValues: args.baseValues,
      correctedValues: args.correctedValues,
      corrections: args.corrections,
    });

  const generated = composeFinalStrategySummary(inputs);
  const override = args.committedAi?.strategySummaryOverride;
  const strategySummaryText = resolveEffectiveStrategySummary({
    generatedSummary: generated,
    strategySummaryOverride: override,
  });

  const onePointText = normalizeOnePointBlockText(
    activeOnePointBlockText(args.committedAi?.onePointLessons)
  );

  const strategySummaryParagraphs =
    splitPresentationParagraphs(strategySummaryText);
  const onePointParagraphs = splitPresentationParagraphs(onePointText);

  const hasStrategySummary = strategySummaryText.length > 0;
  const hasOnePoint = onePointText.length > 0;

  return {
    strategySummaryText,
    strategySummaryParagraphs,
    onePointText,
    onePointParagraphs,
    hasStrategySummary,
    hasOnePoint,
    isEmpty: !hasStrategySummary && !hasOnePoint,
  };
}
