// application/flows/historyFlow.ts
// DS-003 — Canonical Save + Workspace History Flow
// Batch 3 STEP 3-7B
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// Flow → Flow: saveFlow.runSaveStrategy 경유 (동일 Layer 참조 허용).

import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import { type PositionRecord } from "../../domain/positionSearchEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HistoryFlowContext = SaveFlowContext & {
  // READ (추가)
  canUseSystemControls: boolean;

  // ACTION (추가)
  commitWorkspaceHistoryWithStrategyDataset: (
    updated: PositionRecord[]
  ) => void;
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * Canonical Save Flow (DS-003).
 * 저장 가능 상태 검증 → runSaveStrategy → workspace_history snapshot 기록.
 * handleCanonicalRightPanelSave 로직을 추출.
 */
export function runCanonicalSave(ctx: HistoryFlowContext): void {
  // Guard: 저장 가능 상태 검증
  if (!ctx.canUseSystemControls) {
    alert("Search/로컬DB 편집 세션 및 Target 확정 후 저장할 수 있습니다.");
    return;
  }

  const adminSys = ctx.adminState?.sys as
    | Record<string, unknown>
    | undefined;
  const systemId: string =
    (adminSys?.system_id as string | undefined) ??
    (adminSys?.system as string | undefined) ??
    "5_half_system";

  if (!systemId || systemId === "null") {
    alert("시스템을 선택하세요 (SYS 설정)");
    return;
  }

  // SRCH-005 + DS-002: Strategy 저장
  const r = runSaveStrategy(ctx);

  if (!r?.ok) {
    if (import.meta.env.DEV) {
      console.warn("[SAVE] failed", r?.reason);
    }
    if (r?.reason === "missing-balls-state-cue") {
      alert(
        "공 배치(ballsState)를 확인할 수 없습니다. 테이블 공 위치를 확인 후 다시 저장하세요."
      );
    }
    return;
  }

  // DS-003: workspace_history snapshot 기록
  if (r.updated) {
    ctx.commitWorkspaceHistoryWithStrategyDataset(r.updated);
  }
}
