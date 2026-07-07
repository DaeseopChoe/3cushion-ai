// application/flows/resetFlow.ts
// SRCH-004 — USER Reset Flow
// Batch 3 STEP 3-4
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION 분리).
// React import 금지. useState/useEffect/useRef 사용 금지.
// Named Export Only.

import { createEmptyAdminSysSnapshot } from "../../domain/adminSysFromSlot";
import type { PositionRecord } from "../../domain/positionSearchEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminState = Record<string, unknown>;

type OverlayState = { open: boolean; type: string | null; [key: string]: unknown };

export type ResetFlowContext = {
  // READ
  appMode: "ADMIN" | "USER";
  slots: Record<string, unknown>;
  trajectory: { resetTrajectory: () => void };
  adminState: AdminState;
  userTableDisplaySlotId: string | null;
  targetColor: string | null;
  isTargetSelected: boolean;

  // WRITE
  setUserTableDisplaySlotId: (value: string | null) => void;
  setOverlayContent: (value: string | null) => void;
  setOverlayState: (value: OverlayState) => void;
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  setUserLastSearchRecord: (record: PositionRecord | null) => void;

  // ACTION
  clearSearchSlotDrafts: () => void;
  resetUserSearchTargetSelection: () => void;
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * USER Reset: balls 위치 유지, 표시/runtime Search draft 제거.
 * clearUserSearchDisplayRuntime 로직을 포함한 전체 Reset 시퀀스.
 */
export function runUserSearchReset(ctx: ResetFlowContext): void {
  if (ctx.appMode !== "USER") return;

  // inlined clearUserSearchDisplayRuntime
  ctx.setUserTableDisplaySlotId(null);
  ctx.trajectory.resetTrajectory();
  ctx.setAdminState((prev) => ({
    ...prev,
    sys: createEmptyAdminSysSnapshot(),
  }));
  ctx.setOverlayContent(null);
  ctx.setOverlayState({ open: false, type: null });

  ctx.clearSearchSlotDrafts();
  ctx.resetUserSearchTargetSelection();
  ctx.setUserLastSearchRecord(null);
}
