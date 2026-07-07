// application/flows/ballDragFlow.ts
// CAL-006 — Ball Drag Runtime SYS Calculation Flow
// Batch 3 STEP 3-8
//
// AD-B3-02: Hybrid Object Context (READ / WRITE 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// NOTE: Batch 4(CAL-005)에서 computeSystemFromPositions 계산 Domain 추가 분리 예정.
// 이번 STEP에서는 동작 변경 없이 Flow만 분리.

import { computeSystemFromPositions } from "../../domain/systemEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BallPos = { x: number; y: number };
type AdminState = Record<string, unknown>;

export type BallDragFlowContext = {
  // READ
  canEdit: boolean;
  isAdminInputSessionActive: boolean;
  ballId: string | null | undefined;
  nextBallPos: BallPos | null | undefined;
  balls: Record<string, BallPos | null | undefined>;

  // WRITE
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * Ball Drag Runtime SYS Calculation Flow (CAL-006).
 * Cue/Target ball drag 완료 시 computeSystemFromPositions → adminState.sys 갱신.
 * handlePointerUp 내부의 런타임 계산 블록을 추출.
 *
 * Guard 조건:
 *   - canEdit (ADMIN mode)
 *   - !isAdminInputSessionActive (역산 Skip 규칙 유지)
 *   - ballId ∈ { "cue", "target", "target_center" }
 */
export function runBallDrag(ctx: BallDragFlowContext): void {
  if (
    !ctx.canEdit ||
    ctx.isAdminInputSessionActive ||
    !ctx.nextBallPos ||
    (ctx.ballId !== "cue" &&
      ctx.ballId !== "target" &&
      ctx.ballId !== "target_center")
  ) {
    return;
  }

  const nextBalls = { ...ctx.balls, [ctx.ballId]: ctx.nextBallPos };
  const cuePos = nextBalls.cue;
  const targetPos = nextBalls.target_center ?? nextBalls.target;

  if (!cuePos || !targetPos) return;

  const computed = computeSystemFromPositions({ cue: cuePos, target: targetPos });
  if (Object.keys(computed).length === 0) return;

  ctx.setAdminState((prev) => {
    const p = (prev || {}) as Record<string, unknown>;
    const prevSys = (p.sys ?? {}) as Record<string, unknown>;
    const prevVals = (prevSys.systemValues ?? prevSys.inputs ?? {}) as Record<
      string,
      unknown
    >;
    return {
      ...p,
      sys: {
        ...prevSys,
        systemValues: { ...prevVals, ...computed },
        inputs: { ...((prevSys.inputs as Record<string, unknown>) ?? {}), ...computed },
      },
    };
  });
}
