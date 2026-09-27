/**
 * ADMIN Strategy Destination Slot (Phase F-3B).
 *
 * During ADMIN editing, S1/S2/S3 selects where the current edit draft will be
 * SAVEd as a NEW Family. It is not navigation into another slot's stored data.
 *
 * Runtime authoring state only: no durable write, no History, no familyId mint.
 * The destination keeps its own Family identity fields (if any), so OVERWRITE
 * eligibility (slot identity === trusted source familyId) stays tied to the
 * recalled source slot.
 */

export type StrategySlotId = "S1" | "S2" | "S3";

export const STRATEGY_SLOT_IDS: readonly StrategySlotId[] = ["S1", "S2", "S3"];

export const SLOT_FAMILY_IDENTITY_KEYS = [
  "familyId",
  "memberId",
  "memberOrigin",
  "generatedFromMemberId",
  "symmetryOp",
] as const;

type SlotLayer = Record<string, unknown> | null | undefined;

export type DestinationSlotContainer = {
  draft: SlotLayer;
  applied: SlotLayer;
  balls?: unknown;
};

export type DestinationSlotsShape = Record<
  StrategySlotId,
  DestinationSlotContainer
>;

/** Live runtime that is not continuously mirrored into the slot container. */
export type LiveEditRuntime = {
  trajectoryExtensions?: unknown | null;
  reflectionOverride?: unknown | null;
};

export type AdminStrategySlotSelection = "CARRY_EDIT_DRAFT" | "NAVIGATE";

export function isStrategySlotId(raw: unknown): raw is StrategySlotId {
  return raw === "S1" || raw === "S2" || raw === "S3";
}

function layerHasEditContent(layer: SlotLayer): boolean {
  if (!layer || typeof layer !== "object") return false;
  return Object.keys(layer).some(
    (key) => key !== "targetBall" && layer[key] != null
  );
}

/** targetBall-only stubs (Search pre-clear / meta patch) are not edit content. */
export function slotHasEditDraft(
  slot: DestinationSlotContainer | null | undefined
): boolean {
  if (!slot) return false;
  return layerHasEditContent(slot.draft) || layerHasEditContent(slot.applied);
}

export function resolveAdminStrategySlotSelection(args: {
  appMode: string;
  fromSlot: unknown;
  toSlot: unknown;
  fromSlotContainer: DestinationSlotContainer | null | undefined;
  derivedReviewPending?: boolean;
}): AdminStrategySlotSelection {
  if (args.appMode !== "ADMIN") return "NAVIGATE";
  if (args.derivedReviewPending) return "NAVIGATE";
  if (!isStrategySlotId(args.fromSlot) || !isStrategySlotId(args.toSlot)) {
    return "NAVIGATE";
  }
  if (args.fromSlot === args.toSlot) return "NAVIGATE";
  if (!slotHasEditDraft(args.fromSlotContainer)) return "NAVIGATE";
  return "CARRY_EDIT_DRAFT";
}

function readSlotIdentity(
  slot: DestinationSlotContainer | null | undefined
): Record<string, unknown> {
  const identity: Record<string, unknown> = {};
  for (const key of SLOT_FAMILY_IDENTITY_KEYS) {
    const value = slot?.applied?.[key] ?? slot?.draft?.[key];
    if (value != null) identity[key] = value;
  }
  return identity;
}

function carryLayer(
  source: SlotLayer,
  destIdentity: Record<string, unknown>,
  live: LiveEditRuntime | undefined
): SlotLayer {
  if (!source) return null;
  const next = structuredClone(source) as Record<string, unknown>;
  for (const key of SLOT_FAMILY_IDENTITY_KEYS) delete next[key];
  Object.assign(next, destIdentity);
  if (live && "trajectoryExtensions" in live) {
    if (live.trajectoryExtensions != null) {
      next.trajectoryExtensions = structuredClone(live.trajectoryExtensions);
    } else {
      delete next.trajectoryExtensions;
    }
  }
  if (live && "reflectionOverride" in live) {
    if (live.reflectionOverride != null) {
      next.reflectionOverride = structuredClone(live.reflectionOverride);
    } else {
      delete next.reflectionOverride;
    }
  }
  return next;
}

/**
 * Copy the source slot edit draft (draft + applied + balls) into the destination.
 * Source slot is untouched. Destination identity fields are preserved (or absent).
 */
export function carryEditDraftToDestinationSlot<T extends DestinationSlotsShape>(
  slots: T,
  fromSlot: StrategySlotId,
  toSlot: StrategySlotId,
  live?: LiveEditRuntime
): T {
  if (fromSlot === toSlot) return slots;
  const source = slots[fromSlot];
  const dest = slots[toSlot];
  const destIdentity = readSlotIdentity(dest);
  const balls =
    source?.balls != null
      ? structuredClone(source.balls)
      : dest?.balls ?? null;
  return {
    ...slots,
    [toSlot]: {
      ...dest,
      draft: carryLayer(source?.draft, destIdentity, live),
      applied: carryLayer(source?.applied, destIdentity, live),
      balls,
    },
  };
}
