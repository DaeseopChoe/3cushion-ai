/**
 * PHASE 1 — Render-time slot.sys selection (no StrategyEntry / hydrate deps).
 * EMPTY ≠ BROKEN: incomplete draft (no outputs.result) must not win over applied.
 *
 * TODO(PHASE 2+): SlotStatus enum on SlotState — EMPTY | EDITING | APPLIED | BROKEN
 */

export type SlotDraftSys = {
  systemId: string;
  track: string;
  inputs: Record<string, number>;
  outputs: { result: Record<string, number> };
};

export type SlotDraftSysSlice = {
  draft?: { sys?: SlotDraftSys | null } | null;
  applied?: { sys?: SlotDraftSys | null } | null;
};

export function hasRenderableOutputsResult(
  sys: SlotDraftSys | null | undefined
): boolean {
  const result = sys?.outputs?.result;
  if (!result || typeof result !== "object") return false;
  return Object.values(result).some(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
}

export function resolveSlotSysForRender(
  slot: SlotDraftSysSlice | null | undefined
): SlotDraftSys | null | undefined {
  if (!slot) return null;
  const draftSys = slot.draft?.sys;
  const appliedSys = slot.applied?.sys;

  if (hasRenderableOutputsResult(draftSys)) return draftSys;
  if (hasRenderableOutputsResult(appliedSys)) return appliedSys;
  return draftSys ?? appliedSys ?? null;
}
