/**
 * 동선분석 카드 ViewModel (표시 전용).
 * 계산 SSOT: resolvedSlotBaseSysValues / resolvedSlotSysValues (엔진 무변경).
 */

import type { AdminSysSnapshot } from "./adminSysFromSlot";
import type { SlotDraftSys } from "./slotSysResolve";
import {
  getUserFormulaLine,
  type SysCorrectionsInput,
  unifiedSlideFromCorrections,
} from "./aiAutoCommentViewModel";
import type { TrajectoryCardSource } from "./userDisplayFlags";

const CORRECTION_EPS = 1e-9;

export type TrajectoryCardValueLine = {
  key: string;
  label: string;
  value: string;
};

export type UserTrajectoryCardModel = {
  title: string;
  formulaLine: string;
  valueLines: TrajectoryCardValueLine[];
  guideLine: string;
  correctionDetailLines: string[];
  isEmpty: boolean;
  emptyMessage?: string;
};

export type BuildUserTrajectoryCardArgs = {
  source: TrajectoryCardSource;
  slotRenderSys?: AdminSysSnapshot | null;
  resolvedSlotSys?: SlotDraftSys | null;
  resolvedSlotBaseSysValues?: Record<string, number> | null;
  resolvedSlotSysValues?: Record<string, number> | null;
  noStrategySelected?: boolean;
};

function isFiveHalfSystemId(systemId: string | null | undefined): boolean {
  const s = systemId == null ? "" : String(systemId);
  return s === "5_half_system" || s === "5_HALF" || s === "five_half";
}

function resolveSystemId(
  slotRenderSys?: AdminSysSnapshot | null,
  resolvedSlotSys?: SlotDraftSys | null
): string {
  return (
    slotRenderSys?.systemId ??
    slotRenderSys?.system_id ??
    slotRenderSys?.system ??
    resolvedSlotSys?.systemId ??
    "5_half_system"
  );
}

function resolveCoC1C3Keys(spaceSel?: Record<string, string | null | undefined>) {
  const sel = {
    CO: "f",
    C1: "f",
    C2: "f",
    C3: "r",
    C4: "f",
    ...(spaceSel ?? {}),
  };
  return {
    coKey: `CO_${sel.CO}`,
    c1Key: `C1_${sel.C1}`,
    c3Key: `C3_${sel.C3}`,
  };
}

function pickNum(
  values: Record<string, number> | null | undefined,
  keys: string[]
): number | null {
  if (!values) return null;
  for (const key of keys) {
    const v = values[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : String(r);
}

function snFromCo(co: number): number {
  return (co - 50) * 0.5;
}

function buildStartAdjustLine(
  coBase: number,
  coEff: number,
  corrections: SysCorrectionsInput,
  shotType?: string | null
): string | null {
  const unified = unifiedSlideFromCorrections(corrections, shotType);
  if (Math.abs(unified) <= CORRECTION_EPS) return null;
  if (unified > 0) {
    return `출발 ${fmt(coBase)} + 밀림 ${fmt(unified)} = 출발값 ${fmt(coEff)}`;
  }
  return `출발 ${fmt(coBase)} - 끌림 ${fmt(Math.abs(unified))} = 출발값 ${fmt(coEff)}`;
}

function buildC3AdjustLine(
  coEff: number,
  c1: number,
  c3Eff: number,
  c3Mid: number,
  corrections: SysCorrectionsInput
): string | null {
  const tilt = Number(corrections.curve_ratio) || 0;
  const spin = Number(corrections.spin) || 0;
  if (Math.abs(tilt) <= CORRECTION_EPS && Math.abs(spin) <= CORRECTION_EPS) {
    return null;
  }
  const parts = [`출발값 ${fmt(coEff)}`];
  if (Math.abs(tilt) > CORRECTION_EPS) {
    parts.push(tilt > 0 ? `+ 기울기 ${fmt(tilt)}` : `- 기울기 ${fmt(Math.abs(tilt))}`);
  }
  if (Math.abs(spin) > CORRECTION_EPS) {
    parts.push(spin > 0 ? `+ 스핀 ${fmt(spin)}` : `- 스핀 ${fmt(Math.abs(spin))}`);
  }
  parts.push(`- 1쿠션 ${fmt(c1)}`);
  return `${parts.join(" ")} = 3쿠션값 ${fmt(c3Eff)} (기준 3쿠션 ${fmt(c3Mid)})`;
}

export function buildUserTrajectoryCardModel(
  args: BuildUserTrajectoryCardArgs
): UserTrajectoryCardModel {
  const systemId = resolveSystemId(args.slotRenderSys, args.resolvedSlotSys);
  const formulaLine = getUserFormulaLine(systemId);
  const isBaseline = args.source === "baseline";

  if (args.noStrategySelected) {
    return {
      title: isBaseline ? "기준 계산값" : "보정 계산값",
      formulaLine,
      valueLines: [],
      guideLine: "",
      correctionDetailLines: [],
      isEmpty: true,
      emptyMessage: "공략을 선택한 뒤 동선분석을 사용해 주세요.",
    };
  }

  if (!isFiveHalfSystemId(systemId)) {
    return {
      title: isBaseline ? "기준 계산값" : "보정 계산값",
      formulaLine,
      valueLines: [],
      guideLine: "",
      correctionDetailLines: [],
      isEmpty: true,
      emptyMessage: "현재 동선분석 카드는 파이브 앤드 하프 시스템부터 제공됩니다.",
    };
  }

  const base = args.resolvedSlotBaseSysValues;
  const corrected = args.resolvedSlotSysValues;
  const corrections = (args.slotRenderSys?.corrections ?? {}) as SysCorrectionsInput;
  const shotType = args.slotRenderSys?.shotType;
  const { coKey, c1Key, c3Key } = resolveCoC1C3Keys(
    args.slotRenderSys?.spaceSel as Record<string, string> | undefined
  );

  const values = isBaseline ? base : corrected;
  const co = pickNum(values, [coKey, "CO_f"]);
  const c1 = pickNum(values, [c1Key, "C1_f"]);
  const c3 = pickNum(values, [c3Key, "C3_r", "C3_f"]);
  const c4 =
    pickNum(values, ["C4_f", "C4_r"]) ??
    (c3 != null && co != null ? c3 + snFromCo(co) : null);

  if (co == null || c1 == null || c3 == null || c4 == null) {
    return {
      title: isBaseline ? "기준 계산값" : "보정 계산값",
      formulaLine,
      valueLines: [],
      guideLine: "",
      correctionDetailLines: [],
      isEmpty: true,
      emptyMessage: "SYS 입력이 완료되지 않았습니다.",
    };
  }

  const valueLines: TrajectoryCardValueLine[] = [
    { key: "co", label: "출발값", value: fmt(co) },
    { key: "c1", label: "1쿠션", value: fmt(c1) },
    { key: "c3", label: "3쿠션", value: fmt(c3) },
    { key: "c4", label: "4쿠션", value: fmt(c4) },
  ];

  const correctionDetailLines: string[] = [];
  if (!isBaseline && base && corrected) {
    const coBase = pickNum(base, [coKey, "CO_f"]);
    const c3Base = pickNum(base, [c3Key, "C3_r", "C3_f"]);
    if (coBase != null) {
      const startLine = buildStartAdjustLine(coBase, co, corrections, shotType);
      if (startLine) correctionDetailLines.push(startLine);
    }
    if (coBase != null && c3Base != null) {
      const c3Mid =
        pickNum(corrected, [c3Key, "C3_r", "C3_f"]) != null && co !== coBase
          ? co - c1
          : c3Base;
      const c3Line = buildC3AdjustLine(co, c1, c3, c3Mid, corrections);
      if (c3Line) correctionDetailLines.push(c3Line);
    }
  }

  return {
    title: isBaseline ? "기준 계산값" : "보정 계산값",
    formulaLine,
    valueLines,
    guideLine: isBaseline
      ? "이 값은 보정 전 계산값입니다."
      : "이 값은 보정값을 반영한 계산값입니다.",
    correctionDetailLines,
    isEmpty: false,
  };
}
