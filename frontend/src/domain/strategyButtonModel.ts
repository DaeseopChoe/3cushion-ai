/**
 * USER strategy button abstraction — display layer only.
 *
 * SSOT:
 * - Search → applyPositionRecall sets draft.meta.recommendedFrom → rail labels + hasRecall
 * - 공략 버튼 클릭 → table hydrate (trajectory / impact / labels) — not on Search
 * - 볼 이동 중 recall 금지 (App에서 passive recall 미실행)
 */

import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";

export type SlotId = "S1" | "S2" | "S3";

export type StrategyButtonItem = {
  slotId: SlotId;
  label: string;
  /** Post-Search: strategy button enabled (not table display) */
  hasRecall: boolean;
  hasLoadedDraft: boolean;
  isActive: boolean;
};

export type StrategyButtonSlotSlice = {
  draft?: {
    sys?: unknown;
    shotType?: string | null;
    meta?: { recommendedFrom?: { positionId?: string; score?: number } };
  } | null;
  applied?: {
    sys?: unknown;
    shotType?: string | null;
  } | null;
};

export type BuildStrategyButtonsArgs = {
  recallRecord: PositionRecord | null | undefined;
  slots: Partial<Record<SlotId, StrategyButtonSlotSlice | null | undefined>>;
  activeSlot: SlotId;
  slotRenderShotTypes?: Partial<Record<SlotId, string | null | undefined>>;
};

export type BuildStrategyButtonsFromRuntimeArgs = {
  slots: Partial<Record<SlotId, StrategyButtonSlotSlice | null | undefined>>;
  activeSlot: SlotId;
  slotRenderShotTypes?: Partial<Record<SlotId, string | null | undefined>>;
  /** Last successful USER Search record — label priority #1 */
  searchRecord?: PositionRecord | null;
};

const SLOT_IDS: SlotId[] = ["S1", "S2", "S3"];
const SLOT_PLACEHOLDER_LABELS: Record<SlotId, string> = {
  S1: "공략1",
  S2: "공략2",
  S3: "공략3",
};
const DUPLICATE_SUFFIXES = ["①", "②", "③"] as const;

function normalizeShotType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "default" || trimmed === "_") return null;
  return trimmed;
}

function slotHasLoadedDraft(slot: StrategyButtonSlotSlice | null | undefined): boolean {
  if (!slot) return false;
  return !!(slot.draft?.sys ?? slot.applied?.sys);
}

/** USER Search apply — draft.meta.recommendedFrom from applyPositionRecall */
export function slotHasUserSearchMatch(
  slot: StrategyButtonSlotSlice | null | undefined
): boolean {
  return !!slot?.draft?.meta?.recommendedFrom?.positionId;
}

function baseLabelForSlot(args: {
  slotId: SlotId;
  recallEntry: StrategyEntry | null | undefined;
  slot: StrategyButtonSlotSlice | null | undefined;
  slotRenderShotType: string | null | undefined;
}): string {
  const fromDraft = normalizeShotType(args.slot?.draft?.shotType);
  const fromApplied = normalizeShotType(args.slot?.applied?.shotType);
  return (
    normalizeShotType(args.recallEntry?.signature?.shotType) ??
    fromDraft ??
    fromApplied ??
    normalizeShotType(args.slotRenderShotType) ??
    SLOT_PLACEHOLDER_LABELS[args.slotId]
  );
}

function applyDuplicateNumbering(
  items: Array<{
    slotId: SlotId;
    baseLabel: string;
    hasRecall: boolean;
    hasLoadedDraft: boolean;
    isActive: boolean;
  }>
): StrategyButtonItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.baseLabel, (counts.get(item.baseLabel) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return items.map((item) => {
    const total = counts.get(item.baseLabel) ?? 1;
    let label = item.baseLabel;
    if (total > 1) {
      const idx = (seen.get(item.baseLabel) ?? 0) + 1;
      seen.set(item.baseLabel, idx);
      label = `${item.baseLabel}${DUPLICATE_SUFFIXES[idx - 1] ?? String(idx)}`;
    }
    return {
      slotId: item.slotId,
      label,
      hasRecall: item.hasRecall,
      hasLoadedDraft: item.hasLoadedDraft,
      isActive: item.isActive,
    };
  });
}

/** Post-Search rail labels (Search-only; does not gate table render). */
export function buildStrategyButtonsFromRuntime(
  args: BuildStrategyButtonsFromRuntimeArgs
): StrategyButtonItem[] {
  const { slots, activeSlot, slotRenderShotTypes, searchRecord } = args;
  const rawItems: Array<{
    slotId: SlotId;
    baseLabel: string;
    hasRecall: boolean;
    hasLoadedDraft: boolean;
    isActive: boolean;
  }> = [];

  for (const slotId of SLOT_IDS) {
    const slot = slots[slotId];
    if (!slotHasUserSearchMatch(slot)) continue;
    const recallEntry = searchRecord?.strategies?.[slotId] ?? null;
    rawItems.push({
      slotId,
      baseLabel: baseLabelForSlot({
        slotId,
        recallEntry,
        slot,
        slotRenderShotType: slotRenderShotTypes?.[slotId] ?? null,
      }),
      hasRecall: true,
      hasLoadedDraft: slotHasLoadedDraft(slot),
      isActive: activeSlot === slotId,
    });
  }

  return applyDuplicateNumbering(rawItems);
}

/** Build USER-facing strategy buttons from recall + slot runtime (legacy ADMIN path). */
export function buildStrategyButtons(args: BuildStrategyButtonsArgs): StrategyButtonItem[] {
  const { recallRecord, slots, activeSlot, slotRenderShotTypes } = args;
  const rawItems: Array<{
    slotId: SlotId;
    baseLabel: string;
    hasRecall: boolean;
    hasLoadedDraft: boolean;
    isActive: boolean;
  }> = [];

  for (const slotId of SLOT_IDS) {
    const recallEntry = recallRecord?.strategies?.[slotId] ?? null;
    if (!recallEntry) continue;

    const slot = slots[slotId];
    rawItems.push({
      slotId,
      baseLabel: baseLabelForSlot({
        slotId,
        recallEntry,
        slot,
        slotRenderShotType: slotRenderShotTypes?.[slotId] ?? null,
      }),
      hasRecall: true,
      hasLoadedDraft: slotHasLoadedDraft(slot),
      isActive: activeSlot === slotId,
    });
  }

  return applyDuplicateNumbering(rawItems);
}

/** Derive legacy strategyCountMap from strategy buttons (slotId → 1 when Search matched). */
export function strategyCountMapFromButtons(
  buttons: StrategyButtonItem[]
): Partial<Record<SlotId, number>> {
  const map: Partial<Record<SlotId, number>> = {};
  for (const btn of buttons) {
    if (btn.hasRecall) map[btn.slotId] = 1;
  }
  return map;
}
