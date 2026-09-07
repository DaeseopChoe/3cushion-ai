/**
 * ADMIN edit-session gates (SYS / HP/T / STR / AI / SAVE).
 *
 * POLICY (canonical — Undo/Recall model):
 * - Load (LocalDB / History) = editable
 *     → isAdminInputSessionActive = true (beginAdminInputSession / History hydrate)
 *     → capture recallOriginSnapshot S0 (App / useAdminEditHistory)
 *     → Target Lock hydrate is explicit (meta → lock; no meta → unlock; no stale lock)
 * - Undo = repeated authored edit-transaction rollback (floor = empty stack / Origin)
 * - Recall (UI label "Recall") = restore immutable Load Origin S0; clears Undo
 * - SAVE ≠ replace Recall Origin; SAVE ≠ clear Undo
 * - New Load replaces Origin; page refresh clears Origin
 * - Fresh blank → no Recall Origin
 *
 * Legacy Reset (view-only unlock) removed — applyAdminWorkResetSession retained as
 * pure helper for Target Ready + session true (tests / migration).
 *
 * canUseSystemControls =
 *   ADMIN && isAdminInputSessionActive && targetReady
 *
 * Role-based Ball3 SSOT unchanged (field name == physical role).
 */

export type AdminTargetBall = "red" | "yellow";

export function normalizeAdminTargetBall(
  value: unknown
): AdminTargetBall | null {
  return value === "red" || value === "yellow" ? value : null;
}

/** Same Ready rule as App getAdminSearchTargetBall → isAdminTargetReady. */
export function resolveAdminTargetReadyBall(args: {
  isTargetSelected: boolean;
  targetColor: unknown;
  slotTargetBall?: unknown;
}): AdminTargetBall | null {
  if (args.isTargetSelected) {
    const ui = normalizeAdminTargetBall(args.targetColor);
    if (ui) return ui;
  }
  return null;
}

export function canUseAdminSystemControls(args: {
  appMode: string;
  isAdminInputSessionActive: boolean;
  targetReadyBall: AdminTargetBall | null;
}): boolean {
  return (
    args.appMode === "ADMIN" &&
    args.isAdminInputSessionActive &&
    args.targetReadyBall != null
  );
}

/**
 * Resolve Target metadata for Ready (Load hydrate / legacy Reset helper).
 * Preserves recalled physical target identity.
 * When target was unselected (Target=NONE), returns null.
 */
export function resolveAdminResetTargetMeta(args?: {
  targetColor?: unknown;
  slotTargetBall?: unknown;
}): AdminTargetBall | null {
  const slot = normalizeAdminTargetBall(args?.slotTargetBall);
  if (slot) return slot;
  const tc = normalizeAdminTargetBall(args?.targetColor);
  if (tc) return tc;
  return null;
}

/** LocalDB / Published match: prefer explicit query lock, else record metadata. */
export function resolveAdminRecallTargetMeta(args: {
  searchQueryTargetBall: unknown;
  recordTargetBall: unknown;
}): AdminTargetBall | null {
  return (
    normalizeAdminTargetBall(args.searchQueryTargetBall) ??
    normalizeAdminTargetBall(args.recordTargetBall)
  );
}

/**
 * Load Target Lock hydrate must be explicit (no stale lock).
 * meta present → lock true; meta absent → lock false + clear color.
 */
export function applyAdminRecallTargetLockHydrate(
  targetMeta: AdminTargetBall | null
): {
  targetColor: AdminTargetBall | null;
  isTargetSelected: boolean;
} {
  if (targetMeta) {
    return { targetColor: targetMeta, isTargetSelected: true };
  }
  return { targetColor: null, isTargetSelected: false };
}

/**
 * Guard for layers-on + session-off edge (should not occur after successful Load).
 * Fresh ADMIN (layers off) still allows Target lock → beginAdminInputSession.
 */
export function shouldBlockTargetDblclickEditSession(args: {
  isAdminInputSessionActive: boolean;
  adminTableLayersVisible: boolean;
}): boolean {
  return (
    !args.isAdminInputSessionActive && args.adminTableLayersVisible === true
  );
}

/**
 * Pure: ensure editable + Target Ready metadata.
 * Legacy name kept — no longer the only Load→Edit path (Load is immediately editable).
 */
export function applyAdminWorkResetSession(args: {
  appMode: string;
  targetColor?: unknown;
  slotTargetBall?: unknown;
}): {
  isTargetSelected: boolean;
  targetColor: AdminTargetBall | null;
  slotTargetBall: AdminTargetBall | null;
  isAdminInputSessionActive: true;
  canUseSystemControls: boolean;
} {
  const readyTarget = resolveAdminResetTargetMeta({
    targetColor: args.targetColor,
    slotTargetBall: args.slotTargetBall,
  });
  const isTargetSelected = readyTarget != null;
  const targetColor = readyTarget;
  const slotTargetBall = readyTarget;
  const isAdminInputSessionActive = true as const;

  return {
    isTargetSelected,
    targetColor,
    slotTargetBall,
    isAdminInputSessionActive,
    canUseSystemControls: canUseAdminSystemControls({
      appMode: args.appMode,
      isAdminInputSessionActive,
      targetReadyBall: resolveAdminTargetReadyBall({
        isTargetSelected,
        targetColor,
        slotTargetBall,
      }),
    }),
  };
}

/** Post-Load editable state for tests (LocalDB / History). */
export function simulateAdminRecallLoadedEditableState(args: {
  appMode?: string;
  recordTargetBall: unknown;
  searchQueryTargetBall?: unknown;
  /** Stale UI lock before hydrate — must be overwritten. */
  prevIsTargetSelected?: boolean;
  prevTargetColor?: unknown;
}): {
  isAdminInputSessionActive: true;
  adminTableLayersVisible: true;
  targetColor: AdminTargetBall | null;
  isTargetSelected: boolean;
  canUseSystemControls: boolean;
  blockTargetDblclickEditSession: boolean;
} {
  const meta = resolveAdminRecallTargetMeta({
    searchQueryTargetBall: args.searchQueryTargetBall ?? null,
    recordTargetBall: args.recordTargetBall,
  });
  const lock = applyAdminRecallTargetLockHydrate(meta);
  const session = true as const;
  const layers = true as const;
  const ready = resolveAdminTargetReadyBall({
    isTargetSelected: lock.isTargetSelected,
    targetColor: lock.targetColor,
    slotTargetBall: lock.targetColor,
  });
  return {
    isAdminInputSessionActive: session,
    adminTableLayersVisible: layers,
    targetColor: lock.targetColor,
    isTargetSelected: lock.isTargetSelected,
    canUseSystemControls: canUseAdminSystemControls({
      appMode: args.appMode ?? "ADMIN",
      isAdminInputSessionActive: session,
      targetReadyBall: ready,
    }),
    blockTargetDblclickEditSession: shouldBlockTargetDblclickEditSession({
      isAdminInputSessionActive: session,
      adminTableLayersVisible: layers,
    }),
  };
}

/**
 * @deprecated Use simulateAdminRecallLoadedEditableState — Load is immediately editable.
 * Kept for documenting the layers-on + session-off edge guard only.
 */
export function simulateAdminRecallViewOnlyState(args: {
  appMode?: string;
  recordTargetBall: unknown;
  searchQueryTargetBall?: unknown;
  prevIsTargetSelected?: boolean;
  prevTargetColor?: unknown;
}): {
  isAdminInputSessionActive: false;
  adminTableLayersVisible: true;
  targetColor: AdminTargetBall | null;
  isTargetSelected: boolean;
  canUseSystemControls: boolean;
  blockTargetDblclickEditSession: boolean;
} {
  const meta = resolveAdminRecallTargetMeta({
    searchQueryTargetBall: args.searchQueryTargetBall ?? null,
    recordTargetBall: args.recordTargetBall,
  });
  const lock = applyAdminRecallTargetLockHydrate(meta);
  const session = false as const;
  const layers = true as const;
  const ready = resolveAdminTargetReadyBall({
    isTargetSelected: lock.isTargetSelected,
    targetColor: lock.targetColor,
    slotTargetBall: lock.targetColor,
  });
  return {
    isAdminInputSessionActive: session,
    adminTableLayersVisible: layers,
    targetColor: lock.targetColor,
    isTargetSelected: lock.isTargetSelected,
    canUseSystemControls: canUseAdminSystemControls({
      appMode: args.appMode ?? "ADMIN",
      isAdminInputSessionActive: session,
      targetReadyBall: ready,
    }),
    blockTargetDblclickEditSession: shouldBlockTargetDblclickEditSession({
      isAdminInputSessionActive: session,
      adminTableLayersVisible: layers,
    }),
  };
}
