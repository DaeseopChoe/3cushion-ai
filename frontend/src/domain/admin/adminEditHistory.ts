/**
 * ADMIN edit history — pure SSOT helpers (Undo stack + Recall Origin).
 *
 * Snapshot = canonical authored inputs only (no calculated C2 / trajectory / q-K).
 * Undo and Recall Origin are separate lifecycles (never encode Origin as undoStack[0]).
 */

import type { ReflectionOverride } from "../trajectory/c2ReflectionOverride";
import type { ShotEditorState } from "../../hooks/useShotSlots";

export type AdminEditTransactionLabel =
  | "hpt"
  | "c2"
  | "ball"
  | "target"
  | "sys"
  | "str"
  | "ai"
  | "other";

/** Canonical authored ADMIN edit state — restore then recompute via existing pipeline. */
export type AdminAuthoredEditSnapshot = {
  ballsState: unknown;
  targetColor: string | null;
  isTargetSelected: boolean;
  adminHpt: unknown;
  adminSys: unknown;
  adminStr: unknown;
  adminAi: unknown;
  /** Authored override only — never calculated C2 point. */
  c2ReflectionOverride: ReflectionOverride | null;
  shotEditor: ShotEditorState;
};

export type AdminEditHistoryState = {
  undoStack: AdminAuthoredEditSnapshot[];
  recallOriginSnapshot: AdminAuthoredEditSnapshot | null;
  pendingBefore: AdminAuthoredEditSnapshot | null;
};

export function createEmptyAdminEditHistoryState(): AdminEditHistoryState {
  return {
    undoStack: [],
    recallOriginSnapshot: null,
    pendingBefore: null,
  };
}

export function cloneAdminAuthoredEditSnapshot(
  snap: AdminAuthoredEditSnapshot
): AdminAuthoredEditSnapshot {
  return structuredClone(snap);
}

export function adminAuthoredEditSnapshotsEqual(
  a: AdminAuthoredEditSnapshot | null | undefined,
  b: AdminAuthoredEditSnapshot | null | undefined
): boolean {
  if (a == null || b == null) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** New successful Load/History hydrate — replace Origin and clear Undo. */
export function replaceRecallOrigin(
  state: AdminEditHistoryState,
  origin: AdminAuthoredEditSnapshot
): AdminEditHistoryState {
  return {
    undoStack: [],
    recallOriginSnapshot: cloneAdminAuthoredEditSnapshot(origin),
    pendingBefore: null,
  };
}

/** Fresh blank / page session end — Origin and Undo gone. */
export function clearAdminEditHistory(
  state: AdminEditHistoryState
): AdminEditHistoryState {
  return createEmptyAdminEditHistoryState();
}

export function beginAdminEditTransaction(
  state: AdminEditHistoryState,
  before: AdminAuthoredEditSnapshot
): AdminEditHistoryState {
  return {
    ...state,
    pendingBefore: cloneAdminAuthoredEditSnapshot(before),
  };
}

export function cancelAdminEditTransaction(
  state: AdminEditHistoryState
): AdminEditHistoryState {
  return { ...state, pendingBefore: null };
}

/**
 * Commit pending before-snapshot as one Undo step when current differs.
 * No-op when no pending or authored state unchanged (UI-only / no-op drag).
 */
export function commitAdminEditTransaction(
  state: AdminEditHistoryState,
  current: AdminAuthoredEditSnapshot,
  _label?: AdminEditTransactionLabel
): AdminEditHistoryState {
  const before = state.pendingBefore;
  if (!before) return state;
  if (adminAuthoredEditSnapshotsEqual(before, current)) {
    return { ...state, pendingBefore: null };
  }
  return {
    ...state,
    undoStack: [...state.undoStack, before],
    pendingBefore: null,
  };
}

/** Atomic: push before-state immediately (Apply paths). */
export function recordAdminEditBefore(
  state: AdminEditHistoryState,
  before: AdminAuthoredEditSnapshot
): AdminEditHistoryState {
  return {
    ...state,
    undoStack: [...state.undoStack, cloneAdminAuthoredEditSnapshot(before)],
    pendingBefore: null,
  };
}

export function undoAdminEdit(
  state: AdminEditHistoryState
): {
  state: AdminEditHistoryState;
  restore: AdminAuthoredEditSnapshot | null;
} {
  if (state.undoStack.length === 0) {
    return { state, restore: null };
  }
  const undoStack = state.undoStack.slice(0, -1);
  const restore = state.undoStack[state.undoStack.length - 1]!;
  return {
    state: { ...state, undoStack, pendingBefore: null },
    restore: cloneAdminAuthoredEditSnapshot(restore),
  };
}

/**
 * Recall → Origin S0. Clears Undo. Origin itself is retained.
 * SAVE must never call replaceRecallOrigin with current screen.
 */
export function recallAdminEditToOrigin(
  state: AdminEditHistoryState
): {
  state: AdminEditHistoryState;
  restore: AdminAuthoredEditSnapshot | null;
} {
  if (!state.recallOriginSnapshot) {
    return { state, restore: null };
  }
  return {
    state: {
      ...state,
      undoStack: [],
      pendingBefore: null,
    },
    restore: cloneAdminAuthoredEditSnapshot(state.recallOriginSnapshot),
  };
}

export function canUndoAdminEdit(state: AdminEditHistoryState): boolean {
  return state.undoStack.length > 0;
}

export function hasAdminRecallOrigin(state: AdminEditHistoryState): boolean {
  return state.recallOriginSnapshot != null;
}

export function isAdminEditAtRecallOrigin(
  state: AdminEditHistoryState,
  current: AdminAuthoredEditSnapshot
): boolean {
  return adminAuthoredEditSnapshotsEqual(
    state.recallOriginSnapshot,
    current
  );
}
