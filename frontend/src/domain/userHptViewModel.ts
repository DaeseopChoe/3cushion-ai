/**
 * USER read-only HP/T card view model (display only).
 * SSOT: slot draft/applied hpt — same hit_point, mode selects Case 1 vs Case 2 labels.
 */

import {
  formatThickness,
  hitPointToRotationText,
  hitPointToTipDisplay,
  hitPointToVerticalText,
} from "../utils/aiPlayStrategyBuilder";
import { convertThetaToClock } from "../utils/tipClockConverter";
import type { UserInfoHptSlice } from "./userInfoPanelModel";

export type UserHptDisplayMode = "tip_clock" | "spin_follow";

export type UserHptViewModel = {
  displayMode: UserHptDisplayMode;
  isEmpty: boolean;
  /** Shown when isEmpty or no strategy slot selected */
  emptyMessage: string;
  thicknessLabel: string;
  tipLabel?: string;
  clockLabel?: string;
  rotationLabel?: string;
  followLabel?: string;
  viz: {
    T: string;
    hitX: number;
    hitY: number;
  } | null;
};

export type BuildUserHptViewModelArgs = {
  /** Physics/runtime hpT (calculator, trajectory). */
  hpt?: UserInfoHptSlice | null;
  /**
   * Display Runtime HPT — track-aware visual SSOT (modal label, SVG, table impact).
   * When set, thickness label and ball viz use this instead of physics runtime hpt.
   */
  displayHpt?: UserInfoHptSlice | null;
  /** ADMIN SYS bridge; USER modal typically null */
  sysHpNResult?: number | null;
  /** No strategy picked yet */
  noStrategySelected?: boolean;
};

function resolveHitPoint(hpt?: UserInfoHptSlice | null): { x: number; y: number } | null {
  const hp = hpt?.hit_point ?? hpt?.hp;
  if (!hp || typeof hp !== "object") return null;
  if (typeof hp.x !== "number" || typeof hp.y !== "number") return null;
  if (!Number.isFinite(hp.x) || !Number.isFinite(hp.y)) return null;
  return { x: hp.x, y: hp.y };
}

/** True only when hit_point (or hp) exists — T alone / BANK without tip data is not HP/T. */
export function hasHptHitPoint(hpt?: UserInfoHptSlice | null): boolean {
  return resolveHitPoint(hpt) != null;
}

function formatThicknessUserLabel(T: string | null | undefined): string {
  if (!T) return "8/8";
  if (T === "BANK") return "BANK";
  const base = formatThickness(T);
  if (base === "뱅크 샷") return "BANK";
  return base;
}

/** 회전/당점 파생값이 의미 있을 때 (hit_point 없어도 SPIN 텍스트만 있는 레거시 대비). */
function hasSpinFollowLabels(hpt: UserInfoHptSlice): boolean {
  const hp = resolveHitPoint(hpt);
  if (!hp) return false;
  const rot = hitPointToRotationText(hp);
  const fol = hitPointToVerticalText(hp);
  const rotMeaningful = rot !== "0팁" && rot !== "--";
  const folMeaningful = fol !== "0팁" && fol !== "--";
  return rotMeaningful || folMeaningful;
}

function hasHptDisplayData(hpt?: UserInfoHptSlice | null): boolean {
  if (!hpt) return false;
  if (hasHptHitPoint(hpt)) return true;
  return hasSpinFollowLabels(hpt);
}

function buildTipClockLabels(
  hpt: UserInfoHptSlice,
  hitPoint: { x: number; y: number },
  sysHpNResult: number | null | undefined
): { tipLabel: string; clockLabel: string } {
  if (sysHpNResult != null && typeof sysHpNResult === "number") {
    const dir = sysHpNResult >= 0 ? "right" : "left";
    const n = Math.abs(sysHpNResult);
    const tipLabel =
      n === 0 ? "중앙(12시)" : dir === "right" ? `우측 ${n}팁` : `좌측 ${n}팁`;
    const theta = (dir === "right" ? 1 : -1) * (Math.PI / 2) * (1 - n / 4);
    return { tipLabel, clockLabel: convertThetaToClock(theta) };
  }
  const tip = hitPointToTipDisplay(hitPoint);
  return { tipLabel: tip.tipText, clockLabel: tip.tipClockText };
}

export function buildUserHptViewModel(args: BuildUserHptViewModelArgs): UserHptViewModel {
  const { hpt, displayHpt, sysHpNResult, noStrategySelected } = args;
  const visualHpt = displayHpt ?? hpt;

  if (noStrategySelected) {
    return {
      displayMode: "tip_clock",
      isEmpty: true,
      emptyMessage: "표시할 공략을 선택한 뒤 다시 열어주세요.",
      thicknessLabel: "",
      viz: null,
    };
  }

  if (!visualHpt || !hasHptDisplayData(visualHpt)) {
    return {
      displayMode: "tip_clock",
      isEmpty: true,
      emptyMessage: "HP/T 설정 없음",
      thicknessLabel: "",
      viz: null,
    };
  }

  const hitPoint = resolveHitPoint(visualHpt) ?? { x: 0, y: 0 };
  const mode = visualHpt.mode === "SPIN" ? "SPIN" : "TIP";
  const displayMode: UserHptDisplayMode = mode === "SPIN" ? "spin_follow" : "tip_clock";
  const thicknessLabel = formatThicknessUserLabel(visualHpt.T ?? "8/8");
  const T = visualHpt.T ?? "8/8";

  if (displayMode === "tip_clock") {
    const { tipLabel, clockLabel } = buildTipClockLabels(visualHpt, hitPoint, sysHpNResult);
    return {
      displayMode,
      isEmpty: false,
      emptyMessage: "",
      thicknessLabel,
      tipLabel,
      clockLabel,
      viz: { T, hitX: hitPoint.x, hitY: hitPoint.y },
    };
  }

  return {
    displayMode,
    isEmpty: false,
    emptyMessage: "",
    thicknessLabel,
    rotationLabel: hitPointToRotationText(hitPoint),
    followLabel: hitPointToVerticalText(hitPoint),
    viz: { T, hitX: hitPoint.x, hitY: hitPoint.y },
  };
}
