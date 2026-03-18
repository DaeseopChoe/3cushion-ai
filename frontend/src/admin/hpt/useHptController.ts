import { useState, useMemo, useCallback, useEffect } from "react";
import type { Point } from "@/data/system/calculator/types";
import { convertThetaToClock } from "@/utils/tipClockConverter";

const MAX_TIP = 4;
const OUTER_RADIUS_SQ = MAX_TIP * MAX_TIP;
const TIP_STEP_RAD = Math.PI / 8; // 22.5도 (시계 팁 단위)

// 타점 한계선 = 공 반지름의 3/5 (내부 ±4 정규화 기준)
export const BALL_RADIUS_RG = 1.43;
export const TIP_LIMIT_RATIO = 3 / 5;
export const MAX_HP_RADIUS_RG = BALL_RADIUS_RG * TIP_LIMIT_RATIO; // ≈ 0.858
export const RG_TO_TIP_SCALE = 4 / MAX_HP_RADIUS_RG;
export const TIP_TO_RG_SCALE = MAX_HP_RADIUS_RG / 4;

/** 원형 clamp (반경 rMax) - SSOT */
export function clampHpToRadius(x: number, y: number, rMax: number): { x: number; y: number } {
  const r = Math.hypot(x, y);
  if (r === 0 || r <= rMax) return { x, y };
  const ratio = rMax / r;
  return { x: x * ratio, y: y * ratio };
}

export interface HptState {
  hp: Point;
  T: string;
  mode?: "TIP" | "SPIN";  // 없으면 "TIP" (기존 데이터 호환)
  tipCount?: number;      // UI 입력값 1|2|3|4 (r 기반 계산 사용 금지)
}

interface UseHptControllerArgs {
  hpt: HptState;
  onChange: (next: HptState) => void;
}

export type HptMode = "TIP" | "SPIN";

export function useHptController({ hpt, onChange }: UseHptControllerArgs) {

  const [hpX, setHpX] = useState<number>(hpt.hp.x ?? 0);
  const [hpY, setHpY] = useState<number>(hpt.hp.y ?? 0);
  const [mode, setMode] = useState<HptMode>((hpt as { mode?: HptMode }).mode ?? "TIP");
  const [systemTipIndex, setSystemTipIndex] = useState<number>(0);

  // 부모 반영 (mode, tipCount 포함)
  const sync = useCallback(
    (x: number, y: number, m: HptMode, tipCount?: number) => {
      const next: HptState & { tipCount?: number } = { ...hpt, hp: { x, y }, mode: m };
      if (tipCount !== undefined) next.tipCount = tipCount;
      else if (m === "SPIN") next.tipCount = (hpt as { tipCount?: number }).tipCount ?? 0;
      onChange(next);
    },
    [hpt, onChange]
  );

  // -----------------------------
  // 📌 단일 clamp 진입점
  // -----------------------------
  const applyHpLocal = useCallback((x: number, y: number) => {
    const clamped = clampHpToRadius(x, y, MAX_TIP);
    const r = Math.hypot(clamped.x, clamped.y);
    if (r > 4.0001) {
      console.error("[CLAMP BREAK - local apply]", { x: clamped.x, y: clamped.y, r });
    }
    setHpX(clamped.x);
    setHpY(clamped.y);
  }, []);

  const applyHpAndSync = useCallback((x: number, y: number, nextMode: HptMode, tipCount?: number) => {
    const clamped = clampHpToRadius(x, y, MAX_TIP);
    const r = Math.hypot(clamped.x, clamped.y);
    if (r > 4.0001) {
      console.error("[CLAMP BREAK - controller outbound]", { x: clamped.x, y: clamped.y, r });
    }
    setMode(nextMode);
    setHpX(clamped.x);
    setHpY(clamped.y);
    sync(clamped.x, clamped.y, nextMode, tipCount);
  }, [sync, hpt]);

  // 외부 동기화 (parent→controller 역주입) - applyHpLocal만 사용 (루프 방지)
  useEffect(() => {
    const x = hpt.hp.x ?? 0;
    const y = hpt.hp.y ?? 0;
    const r = Math.hypot(x, y);
    const parentMode = (hpt as { mode?: HptMode }).mode;
    if (r > 4.0001) {
      console.error("[CLAMP BREAK - parent→controller]", { x, y, r });
    }
    applyHpLocal(x, y);
    const tc = (hpt as { tipCount?: number }).tipCount;
    if (tc !== undefined && tc >= 0 && tc <= MAX_TIP) setSystemTipIndex(tc);
  }, [hpt.hp.x, hpt.hp.y, (hpt as { tipCount?: number }).tipCount, applyHpLocal]);

  // parent에서 mode 전달 시 동기화
  useEffect(() => {
    const nextMode = (hpt as { mode?: HptMode }).mode;
    if (nextMode === "TIP" || nextMode === "SPIN") setMode(nextMode);
  }, [(hpt as { mode?: HptMode }).mode]);

  // -----------------------------
  // 📌 시스템 / HP_n 직접 입력 (외곽 강제)
  // -----------------------------
  const setHpFromSystem = useCallback(
    (direction: "left" | "right", tip: number) => {
      const clampedTip = Math.max(0, Math.min(MAX_TIP, Number(tip.toFixed(1))));

      let theta: number;
      if (direction === "right") {
        theta = Math.PI / 2 - clampedTip * TIP_STEP_RAD;
      } else {
        theta = Math.PI / 2 + clampedTip * TIP_STEP_RAD;
      }

      const x = MAX_TIP * Math.cos(theta);
      const y = MAX_TIP * Math.sin(theta);

      setSystemTipIndex(clampedTip);
      applyHpAndSync(x, y, "TIP", clampedTip);
    },
    [applyHpAndSync]
  );

  const setSystemTip = useCallback(
    (direction: "left" | "right", nextTip: number) => {
      const clamped = Math.max(0, Math.min(MAX_TIP, Number(nextTip.toFixed(1))));
      setSystemTipIndex(clamped);
      setHpFromSystem(direction, clamped);
    },
    [setHpFromSystem]
  );

  // -----------------------------
  // 📌 조이스틱 / 회전 / 당점 / setHp (모두 applyHpAndSync 경유)
  // -----------------------------
  const setJoystick = useCallback(
    (x: number, y: number) => {
      applyHpAndSync(x, y, "SPIN");
    },
    [applyHpAndSync]
  );

  const setRotationTip = useCallback(
    (x: number) => {
      applyHpAndSync(x, hpY, "SPIN");
    },
    [hpY, applyHpAndSync]
  );

  const setVerticalTip = useCallback(
    (y: number) => {
      applyHpAndSync(hpX, y, "SPIN");
    },
    [hpX, applyHpAndSync]
  );

  const setHp = useCallback(
    (next: { x: number; y: number }) => {
      setJoystick(next.x, next.y);
    },
    [setJoystick]
  );

  // -----------------------------
  // 📌 setT (두께)
  // -----------------------------
  const setT = useCallback(
    (t: string) => {
      onChange({ ...hpt, T: t, mode: hpt.mode ?? mode });
    },
    [hpt, onChange, mode]
  );

  // -----------------------------
  // 📌 파생 값 + 모드 기반 표시값
  // -----------------------------
  const hpN = useMemo(() => Number(hpX.toFixed(1)), [hpX]);
  const hpDirection = hpX >= 0 ? "right" : "left";
  const theta = useMemo(() => Math.atan2(hpY, hpX), [hpX, hpY]);
  const clockText = useMemo(() => convertThetaToClock(theta), [theta]);

  const displayTip = mode === "TIP" ? systemTipIndex : 0;
  const displayClock = mode === "TIP" ? clockText : "0";
  const displayRotation = mode === "SPIN" ? hpX : 0;
  const displayVertical = mode === "SPIN" ? hpY : 0;

  return {
    hp: { x: hpX, y: hpY },
    T: hpt.T,
    hpN,
    hpDirection,
    mode,
    systemTipIndex,
    setSystemTip,
    rotationTip: hpX,
    verticalTip: hpY,
    clockText,
    displayTip,
    displayClock,
    displayRotation,
    displayVertical,
    setHpFromSystem,
    setHpFromTip: setHpFromSystem,
    setJoystick,
    setHp,
    setT,
    setRotationTip,
    setVerticalTip,
  };
}
