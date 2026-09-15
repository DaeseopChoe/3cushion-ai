/**
 * Strategy Summary Bold — pure presentation helpers (no React).
 * Emphasized units come from template segments; never from AI guessing.
 */

import type { StrategySummarySegment } from "./strategySummaryTemplate";

/** Emphasized semantic units in template order (acceptance: bold-only flow). */
export function listEmphasizedStrategySummaryUnits(
  segments: StrategySummarySegment[]
): string[] {
  const out: string[] = [];
  for (const seg of segments ?? []) {
    for (const part of seg.parts ?? []) {
      if (part.emphasize && part.text) out.push(part.text);
    }
  }
  return out;
}

/** Rich Bold only when draft text still matches generated template text. */
export function canRenderStrategySummaryEmphasis(args: {
  draftText?: unknown;
  generatedText?: unknown;
}): boolean {
  const draft = String(args.draftText ?? "");
  const generated = String(args.generatedText ?? "");
  if (!generated.trim()) return false;
  return draft === generated;
}
