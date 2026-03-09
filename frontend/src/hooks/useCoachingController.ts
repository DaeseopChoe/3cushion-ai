import { useMemo } from "react";
import { toPx } from "../utils/geometry/coords";

const EMPTY = {
  guideLineNode: null as { x1: number; y1: number; x2: number; y2: number } | null,
  impactBallPx: null as { cx: number; cy: number } | null,
  impactBallRadius: null as number | null,
  impactBallColor: null as string | null,
  impactBallOpacity: null as number | null,
  onImpactBallDoubleClick: undefined as ((e: React.MouseEvent) => void) | undefined,
  impactBallCursor: "default" as string,
};

export function useCoachingController({
  appMode,
  showCoaching,
  canEdit,
  T,
  impactMode,
  setImpactMode,
  balls,
  setBallsState,
  calcImpactBall,
  SCALE,
  TABLE_H,
  PADDING,
  RENDER_RADIUS_RG,
  BALL_RADIUS_RG,
}: {
  appMode: string;
  showCoaching: boolean;
  canEdit: boolean;
  T: string;
  impactMode: string;
  setImpactMode: React.Dispatch<React.SetStateAction<string>>;
  balls: Record<string, { x: number; y: number } | undefined>;
  setBallsState: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number } | undefined> | null>>;
  calcImpactBall: (cue: { x: number; y: number }, target: { x: number; y: number }, T: string) => { x: number; y: number } | null;
  SCALE: number;
  TABLE_H: number;
  PADDING: number;
  RENDER_RADIUS_RG: number;
  BALL_RADIUS_RG: number;
}) {
  return useMemo(() => {
    if (appMode === "USER" && !showCoaching) {
      return EMPTY;
    }
    const targetForImpact = balls.target_center ?? balls.target;
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
    const impactBallColor = canEdit ? "#00ff00" : "#ffffff";
    const impactBallOpacity = canEdit ? 0.7 : 0.55;

    const onImpactBallDoubleClick = canEdit
      ? (e: React.MouseEvent) => {
          e.stopPropagation();
          console.log("🎯🎯 ImpactBall 더블클릭! 현재 모드:", impactMode);
          setImpactMode((prev) => {
            const nextMode = prev === "CONTACT" ? "FREE" : "CONTACT";
            console.log("✅ 모드 전환:", prev, "→", nextMode);
            if (nextMode === "FREE" && targetForImpact) {
              const currentImpact = calcImpactBall(balls.cue!, targetForImpact, T);
              if (currentImpact) {
                console.log("💾 impact 저장:", currentImpact);
                setBallsState((prev) => (prev ? { ...prev, impact: currentImpact } : { impact: currentImpact }));
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
      impactBallColor,
      impactBallOpacity,
      onImpactBallDoubleClick,
      impactBallCursor,
    };
  }, [
    appMode,
    showCoaching,
    canEdit,
    T,
    impactMode,
    balls,
    setImpactMode,
    setBallsState,
    calcImpactBall,
    SCALE,
    TABLE_H,
    PADDING,
    RENDER_RADIUS_RG,
    BALL_RADIUS_RG,
  ]);
}
