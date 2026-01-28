// /frontend/admin/hpt/useHptController.ts

import { useMemo } from "react";
import { calcImpactBall } from "@/data/system/calculator";
import type { Point } from "@/data/system/calculator/types";

export interface HptState {
  hp: Point;        // 타점 (Rg)
  T: string;        // "-3/8" ~ "8/8"
}

interface UseHptControllerArgs {
  cue: Point | null;
  target: Point | null;
  hpt: HptState;
  onChange: (next: HptState) => void;
}

export function useHptController({
  cue,
  target,
  hpt,
  onChange,
}: UseHptControllerArgs) {

  /** ImpactBall 위치 (SSOT) */
  const impactBall = useMemo(() => {
    if (!cue || !target) return null;
    return calcImpactBall(cue, target, hpt.T);
  }, [cue, target, hpt.T]);

  /** 타점 변경 */
  function setHp(next: Point) {
    onChange({ ...hpt, hp: next });
  }

  /** 두께 변경 */
  function setT(nextT: string) {
    onChange({ ...hpt, T: nextT });
  }

  return {
    hp: hpt.hp,
    T: hpt.T,
    impactBall,

    setHp,
    setT,
  };
}
