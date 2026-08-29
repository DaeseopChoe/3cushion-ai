/**
 * ADMIN edit-session gates (SYS / HP/T / STR / AI / SAVE).
 *
 * POLICY A (canonical):
 * - Recall (LocalDB / History) = view-only → isAdminInputSessionActive = false
 * - Reset = only Recall→Edit transition → session true + Target Ready
 * - Target dblclick does NOT resume edit session while recalled view-only
 *   (layers visible + session inactive). Locked Target dblclick remains no-op;
 *   Second dblclick Projection is unchanged (handled outside this module).
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
 * Reset resolves Target metadata from active slot or current targetColor.
 * Preserves recalled physical target identity across Recall → Edit transition.
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
 * POLICY A — Recall Target Lock hydrate must be explicit (no stale lock).
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
 * POLICY A — unlocked Target dblclick must not open edit session while
 * recall/history view-only display is active (layers on + session off).
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
 * Pure transition: post-recall view-only → Reset → editable.
 * Preserves recalled Target physical identity if present, or stays NONE if unselected.
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

/** One POLICY A cycle step for tests (Recall view-only → optional dblclick → Reset). */
export function simulateAdminRecallViewOnlyState(args: {
  appMode?: string;
  recordTargetBall: unknown;
  searchQueryTargetBall?: unknown;
  /** Stale UI lock before hydrate — must be overwritten. */
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
