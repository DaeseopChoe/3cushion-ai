import { useMemo } from "react";
import { toPx } from "../utils/geometry/coords";

const EMPTY = {
  guideLineNode: null as { x1: number; y1: number; x2: number; y2: number } | null,
  impactBallPx: null as { cx: number; cy: number } | null,
  impactBallRadius: null as number | null,
  impactBallOpacity: null as number | null,
  onImpactBallDoubleClick: undefined as ((e: React.MouseEvent) => void) | undefined,
  impactBallCursor: "default" as string,
};

export type CoachingControllerProps = {
  appMode: string;
  isTargetSelected?: boolean;
  showCoaching: boolean;
  canEdit: boolean;
  T: string;
  impactMode: string;
  setImpactMode?: React.Dispatch<React.SetStateAction<string>>;
  balls: Record<string, { x: number; y: number } | undefined>;
  targetPointForImpact?: { x: number; y: number } | null;
  setBallsState?: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number } | undefined> | null>>;
  calcImpactBall: (cue: { x: number; y: number }, target: { x: number; y: number }, T: string) => { x: number; y: number } | null;
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
  impactMode,
  setImpactMode,
  balls,
  targetPointForImpact,
  setBallsState,
  calcImpactBall,
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

  let impactBall: { x: number; y: number } | null = null;
  if (impactMode === "CONTACT") {
    impactBall = calcImpactBall(balls.cue, targetForImpact, T);
  } else {
    impactBall = balls.impact || calcImpactBall(balls.cue, targetForImpact, T);
  }

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

  const onImpactBallDoubleClick = canEdit
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("🎯🎯 ImpactBall 더블클릭! 현재 모드:", impactMode);
        setImpactMode?.((prev) => {
          const nextMode = prev === "CONTACT" ? "FREE" : "CONTACT";
          console.log("✅ 모드 전환:", prev, "→", nextMode);
          if (nextMode === "FREE" && targetForImpact) {
            const currentImpact = calcImpactBall(balls.cue!, targetForImpact, T);
            if (currentImpact) {
              console.log("💾 impact 저장:", currentImpact);
              setBallsState?.((prev) => (prev ? { ...prev, impact: currentImpact } : { impact: currentImpact }));
            }
          }
          return nextMode;
        });
      }
    : undefined;

  const impactBallCursor = canEdit ? "pointer" : "default";

  return {
    guideLineNode,
    impactBallPx,
    impactBallRadius,
    impactBallOpacity,
    onImpactBallDoubleClick,
    impactBallCursor,
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
      props.impactMode,
      props.balls,
      props.targetPointForImpact,
      props.setImpactMode,
      props.setBallsState,
      props.calcImpactBall,
      props.SCALE,
      props.TABLE_H,
      props.PADDING,
      props.RENDER_RADIUS_RG,
      props.BALL_RADIUS_RG,
    ]
  );
}
