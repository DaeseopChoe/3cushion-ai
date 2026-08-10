/**
 * Authoring Strategy lineage identity (Phase 5 Mission 01 · D1-C1).
 *
 * authoringStrategyId ≠ strategyRef (`${positionId}.${slot}`).
 * Hard Gate for SYS interpolation: same authoringStrategyId only.
 */

import type { Ball3, StrategyEntry } from "./positionSearchEngine";
import { pointExactEqual, type EditSourceContext } from "./cueEditSnap";

/** Prefix distinguishing from positionId / snapshot ids. */
export const AUTHORING_STRATEGY_ID_PREFIX = "as_";

/** Mint a new independent Authoring Strategy identity. */
export function mintAuthoringStrategyId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return `${AUTHORING_STRATEGY_ID_PREFIX}${uuid}`;
}

export function isValidAuthoringStrategyId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

/**
 * Resolve authoringStrategyId for SAVE.
 * - Inherit from Edit Source slot entry when Target+Second Exact (derived knot).
 * - Else mint new independent id.
 */
export function resolveAuthoringStrategyIdForSave(args: {
  editSource: EditSourceContext | null | undefined;
  balls: Ball3;
  slotId: "S1" | "S2" | "S3";
  /** StrategyEntry on the edit-source Position for this slot (if any). */
  editSourceSlotEntry?: StrategyEntry | null;
  /** Explicit override (e.g. force new independent clone). */
  forceNew?: boolean;
}): string {
  if (args.forceNew) {
    return mintAuthoringStrategyId();
  }

  const src = args.editSource;
  const entry = args.editSourceSlotEntry;
  if (
    src &&
    entry &&
    isValidAuthoringStrategyId(entry.authoringStrategyId) &&
    pointExactEqual(args.balls.target, src.balls.target) &&
    pointExactEqual(args.balls.second, src.balls.second)
  ) {
    return entry.authoringStrategyId.trim();
  }

  return mintAuthoringStrategyId();
}
