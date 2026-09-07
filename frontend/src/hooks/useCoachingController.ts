import { useMemo } from "react";
import { toPx } from "../utils/geometry/coords";
import { resolveContactImpactRg } from "../domain/admin/impactContactOwnership";

const EMPTY = {
  guideLineNode: null as { x1: number; y1: number; x2: number; y2: number } | null,
  impactBallPx: null as { cx: number; cy: number } | null,
  impactBallRadius: null as number | null,
  impactBallOpacity: null as number | null,
  onImpactBallDoubleClick: undefined as ((e: React.MouseEvent) => void) | undefined,
  impactBallCursor: "default" as string,
  /** Resolved CONTACT impact in Rg (for hit-testing / snap). */
  contactImpactRg: null as { x: number; y: number } | null,
};

export type CoachingControllerProps = {
  appMode: string;
  isTargetSelected?: boolean;
  showCoaching: boolean;
  canEdit: boolean;
  T: string;
  balls: Record<string, { x: number; y: number } | undefined>;
  targetPointForImpact?: { x: number; y: number } | null;
  /**
   * Temporary Impact center while ADMIN is dragging the Impact ball.
   * When null/undefined, display always uses CONTACT calcImpactBall.
   */
  liveDragImpactRg?: { x: number; y: number } | null;
  calcImpactBall: (cue: { x: number; y: number }, target: { x: number; y: number }, T: string) => { x: number; y: number } | null;
  onImpactBallDoubleClick?: (e: React.MouseEvent) => void;
  SCALE: number;
  TABLE_H: number;
  PADDING: number;
  RENDER_RADIUS_RG: number;
  BALL_RADIUS_RG: number;
};

export function computeCoachingState({
  appMode,
  isTargetSelected,
  showCoaching,
  canEdit,
  T,
  balls,
  targetPointForImpact,
  liveDragImpactRg,
  calcImpactBall,
  onImpactBallDoubleClick,
  SCALE,
  TABLE_H,
  PADDING,
  RENDER_RADIUS_RG,
  BALL_RADIUS_RG,
}: CoachingControllerProps) {
  if (appMode === "USER" && !showCoaching) {
    return EMPTY;
  }
  if (appMode === "ADMIN" && !isTargetSelected) {
    return EMPTY;
  }
  const targetForImpact =
    targetPointForImpact ??
    balls.target ??
    balls.target_center;
  if (!balls.cue || !targetForImpact) {
    return EMPTY;
  }

  const contactImpactRg = resolveContactImpactRg({
    cue: balls.cue,
    target: targetForImpact,
    T,
    calcImpactBall,
  });

  const impactBall =
    liveDragImpactRg &&
    Number.isFinite(liveDragImpactRg.x) &&
    Number.isFinite(liveDragImpactRg.y)
      ? liveDragImpactRg
      : contactImpactRg;

  if (!impactBall) {
    return EMPTY;
  }

  const cuePx = toPx(balls.cue, SCALE, TABLE_H);
  const impactPx = toPx(impactBall, SCALE, TABLE_H);

  const guideLineNode = {
    x1: cuePx.x + PADDING,
    y1: cuePx.y + PADDING,
    x2: impactPx.x + PADDING,
    y2: impactPx.y + PADDING,
  };

  const impactBallPx = {
    cx: impactPx.x + PADDING,
    cy: impactPx.y + PADDING,
  };

  const impactBallRadius = BALL_RADIUS_RG * SCALE;
  const impactBallOpacity = 0.6;

  const impactBallCursor = canEdit ? "pointer" : "default";

  return {
    guideLineNode,
    impactBallPx,
    impactBallRadius,
    impactBallOpacity,
    onImpactBallDoubleClick: canEdit ? onImpactBallDoubleClick : undefined,
    impactBallCursor,
    contactImpactRg,
  };
}

export function useCoachingController(props: CoachingControllerProps) {
  return useMemo(
    () => computeCoachingState(props),
    [
      props.appMode,
      props.isTargetSelected,
      props.showCoaching,
      props.canEdit,
      props.T,
      props.balls,
      props.targetPointForImpact,
      props.liveDragImpactRg,
      props.calcImpactBall,
      props.onImpactBallDoubleClick,
      props.SCALE,
      props.TABLE_H,
      props.PADDING,
      props.RENDER_RADIUS_RG,
      props.BALL_RADIUS_RG,
    ]
  );
}
