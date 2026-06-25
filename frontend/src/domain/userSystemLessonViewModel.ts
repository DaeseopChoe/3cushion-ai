/**
 * USER 시스템 레슨 read-only ViewModel (표시 전용).
 * 계산 SSOT: App.jsx buildSlotEffectiveRenderSysValues → resolvedSlotBase/Corrected.
 */

import type { AdminSysSnapshot } from "./adminSysFromSlot";
import type { SlotDraftSys } from "./slotSysResolve";
import {
  getUserFormulaLine,
  hasAnySysCorrection,
  unifiedSlideFromCorrections,
  type SysCorrectionsInput,
} from "./aiAutoCommentViewModel";
import { getSystemNameKo } from "../utils/aiPlayStrategyBuilder";

const CORRECTION_EPS = 1e-9;

export type SystemLessonC4Block = {
  exprLine: string;
  calcLine: string;
  resultLine: string;
};

export type SystemLessonPositionSection = {
  valuesLine: string;
  c4: SystemLessonC4Block;
  footnotes: string[];
};

export type SystemLessonCorrectionSection = {
  correctionsLine: string;
  startAdjustLine: string;
  c3AdjustLine: string;
  c4: SystemLessonC4Block;
  footnotes: string[];
};

export type SystemLessonOverviewSection = {
  systemName: string;
  body: string;
};

export type SystemLessonValueEntry = {
  label: string;
  value: string;
};

export type SystemLessonSystemValuesSection = {
  entries: SystemLessonValueEntry[];
};

export type UserSystemLessonModel = {
  title: string;
  formulaLine: string;
  isEmpty: boolean;
  emptyMessage?: string;
  overviewSection: SystemLessonOverviewSection | null;
  positionExplainLine: string | null;
  positionSection: SystemLessonPositionSection | null;
  correctionSection: SystemLessonCorrectionSection | null;
  systemValuesSection: SystemLessonSystemValuesSection | null;
};

export type BuildUserSystemLessonArgs = {
  strategyButtonLabel?: string;
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

function fmtSignedParen(n: number): string {
  if (n >= 0) return `(+${fmt(n)})`;
  return `(${fmt(n)})`;
}

function fmtSignedCalc(n: number): string {
  if (n >= 0) return `+ ${fmt(n)}`;
  return `- ${fmt(Math.abs(n))}`;
}

function formatSysValue(
  values: Record<string, number> | null | undefined,
  keys: string[]
): string | undefined {
  if (!values) return undefined;
  for (const key of keys) {
    const v = values[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      return fmt(v);
    }
  }
  return undefined;
}

function buildOverviewBody(systemName: string, formulaLine: string): string {
  const formulaDisplay = formulaLine.replace(/^1쿠션값\s*=\s*/, "");
  if (formulaDisplay && formulaDisplay !== formulaLine) {
    return `${systemName}은(는) ${formulaDisplay} 공식을 사용하는 시스템입니다.`;
  }
  return `${systemName}의 계산 방식을 설명합니다.`;
}

function buildPositionExplainLine(
  co: number,
  c3: number,
  c1: number
): string {
  return `현재 포지션은 출발값 ${fmt(co)}, 3쿠션값 ${fmt(c3)}이므로 1쿠션값은 ${fmt(c1)}가 됩니다.`;
}

function buildSystemValuesSection(
  values: Record<string, number> | null | undefined,
  coKey: string,
  c1Key: string,
  c3Key: string
): SystemLessonSystemValuesSection | null {
  if (!values || typeof values !== "object") return null;
  const spec: Array<{ label: string; keys: string[] }> = [
    { label: "CO", keys: [coKey, "CO_f", "CO_r", "CO"] },
    { label: "C1", keys: [c1Key, "C1_f", "C1_r", "oneC", "C1"] },
    { label: "C3", keys: [c3Key, "C3_r", "C3_f", "threeC", "C3"] },
    { label: "C4", keys: ["C4_f", "C4_r", "C4"] },
    { label: "C5", keys: ["C5_f", "C5_r", "C5"] },
    { label: "C6", keys: ["C6_f", "C6_r", "C6"] },
    { label: "Sn", keys: ["Sn"] },
  ];
  const entries: SystemLessonValueEntry[] = [];
  for (const { label, keys } of spec) {
    const value = formatSysValue(values, keys);
    if (value != null) entries.push({ label, value });
  }
  return entries.length > 0 ? { entries } : null;
}

function snFromCo(co: number): number {
  return (co - 50) * 0.5;
}

function buildC4Block(
  c3: number,
  sn: number,
  c4: number
): SystemLessonC4Block {
  return {
    exprLine: `3쿠션(${fmt(c3)}) + 출발값 보정${fmtSignedParen(sn)}`,
    calcLine: `${fmt(c3)} ${fmtSignedCalc(sn)} = ${fmt(c4)}`,
    resultLine: `4쿠션값 : ${fmt(c4)}`,
  };
}

function buildStartAdjustLine(
  coBase: number,
  coEff: number,
  corrections: SysCorrectionsInput,
  shotType?: string | null
): string {
  const unified = unifiedSlideFromCorrections(corrections, shotType);
  if (unified > CORRECTION_EPS) {
    return `출발(${fmt(coBase)})+밀림(${fmt(unified)})=출발값(${fmt(coEff)})`;
  }
  if (unified < -CORRECTION_EPS) {
    return `출발(${fmt(coBase)})-끌림(${fmt(Math.abs(unified))})=출발값(${fmt(coEff)})`;
  }
  return `출발(${fmt(coBase)})=출발값(${fmt(coEff)})`;
}

function buildC3AdjustLine(
  coEff: number,
  c1: number,
  c3Eff: number,
  corrections: SysCorrectionsInput
): string {
  const tilt = Number(corrections.curve_ratio) || 0;
  const spin = Number(corrections.spin) || 0;
  const parts = [`출발값(${fmt(coEff)})`];
  if (Math.abs(tilt) > CORRECTION_EPS) {
    parts.push(tilt > 0 ? `+기울기(${fmt(tilt)})` : `-기울기(${fmt(Math.abs(tilt))})`);
  }
  if (Math.abs(spin) > CORRECTION_EPS) {
    parts.push(spin > 0 ? `+스핀(${fmt(spin)})` : `-스핀(${fmt(Math.abs(spin))})`);
  }
  parts.push(`-1쿠션(${fmt(c1)})`);
  return `${parts.join("")}=3쿠션값(${fmt(c3Eff)})`;
}

function formatCorrectionsLine(corrections: SysCorrectionsInput, shotType?: string | null): string {
  const unified = unifiedSlideFromCorrections(corrections, shotType);
  const slide =
    unified > CORRECTION_EPS ? fmt(unified) : "0";
  const draw =
    unified < -CORRECTION_EPS ? fmt(Math.abs(unified)) : "0";
  const tilt = fmt(Number(corrections.curve_ratio) || 0);
  const spin = fmt(Number(corrections.spin) || 0);
  return `밀림 ${slide} · 끌림 ${draw} · 기울기 ${tilt} · 스핀 ${spin}`;
}

const POSITION_FOOTNOTES = [
  "출발값 보정은 50을 기준으로 계산합니다.",
  "5 증가 → +2.5 적용",
  "5 감소 → -2.5 적용",
  "출발값과 1쿠션값은 프레임 값, 3쿠션값은 레일 값을 사용합니다.",
];

const CORRECTION_FOOTNOTES = [
  "밀림·끌림은 출발값에, 기울기·스핀은 3쿠션값에 적용됩니다.",
  "3쿠션 이후의 쿠션값은 동일합니다. (4쿠션 = 5쿠션 = 6쿠션)",
];

export function buildUserSystemLessonViewModel(
  args: BuildUserSystemLessonArgs
): UserSystemLessonModel {
  const systemId = resolveSystemId(args.slotRenderSys, args.resolvedSlotSys);
  const systemName = getSystemNameKo(systemId);
  const title = `레슨 : ${systemName}`;
  const formulaLine = getUserFormulaLine(systemId);
  const overviewSection: SystemLessonOverviewSection = {
    systemName,
    body: buildOverviewBody(systemName, formulaLine),
  };

  if (args.noStrategySelected) {
    return {
      title: "레슨",
      formulaLine,
      isEmpty: true,
      emptyMessage: "공략을 선택한 뒤 레슨을 열어주세요.",
      overviewSection: null,
      positionExplainLine: null,
      positionSection: null,
      correctionSection: null,
      systemValuesSection: null,
    };
  }

  if (!isFiveHalfSystemId(systemId)) {
    return {
      title,
      formulaLine,
      isEmpty: true,
      emptyMessage: "현재 레슨은 파이브 앤드 하프 시스템부터 제공됩니다.",
      overviewSection,
      positionExplainLine: null,
      positionSection: null,
      correctionSection: null,
      systemValuesSection: null,
    };
  }

  const base = args.resolvedSlotBaseSysValues;
  const corrected = args.resolvedSlotSysValues;
  const corrections = (args.slotRenderSys?.corrections ?? {}) as SysCorrectionsInput;
  const shotType = args.slotRenderSys?.shotType;
  const { coKey, c1Key, c3Key } = resolveCoC1C3Keys(
    args.slotRenderSys?.spaceSel as Record<string, string> | undefined
  );

  const coBase = pickNum(base, [coKey, "CO_f"]);
  const c1Base = pickNum(base, [c1Key, "C1_f"]);
  const c3Base = pickNum(base, [c3Key, "C3_r", "C3_f"]);
  const c4Base =
    pickNum(base, ["C4_f", "C4_r"]) ??
    (c3Base != null && coBase != null ? c3Base + snFromCo(coBase) : null);

  const coEff = pickNum(corrected, [coKey, "CO_f"]) ?? coBase;
  const c1Eff = pickNum(corrected, [c1Key, "C1_f"]) ?? c1Base;
  const c3Eff = pickNum(corrected, [c3Key, "C3_r", "C3_f"]) ?? c3Base;
  const snBase =
    pickNum(base, ["Sn"]) ?? (coBase != null ? snFromCo(coBase) : null);
  const snEff =
    pickNum(corrected, ["Sn"]) ?? (coEff != null ? snFromCo(coEff) : null);
  const c4Eff =
    pickNum(corrected, ["C4_f", "C4_r"]) ??
    (c3Eff != null && snEff != null ? c3Eff + snEff : null);

  if (
    coBase == null ||
    c1Base == null ||
    c3Base == null ||
    c4Base == null ||
    snBase == null
  ) {
    return {
      title,
      formulaLine,
      isEmpty: true,
      emptyMessage: "SYS 입력이 완료되지 않았습니다. 관리자 설정 후 다시 열어주세요.",
      overviewSection,
      positionExplainLine: null,
      positionSection: null,
      correctionSection: null,
      systemValuesSection: null,
    };
  }

  const positionExplainLine = buildPositionExplainLine(coBase, c3Base, c1Base);
  const systemValuesSection = buildSystemValuesSection(
    corrected ?? base,
    coKey,
    c1Key,
    c3Key
  );

  const positionSection: SystemLessonPositionSection = {
    valuesLine: `출발(${fmt(coBase)}) · 3쿠션(${fmt(c3Base)}) · 1쿠션(${fmt(c1Base)})`,
    c4: buildC4Block(c3Base, snBase, c4Base),
    footnotes: POSITION_FOOTNOTES,
  };

  let correctionSection: SystemLessonCorrectionSection | null = null;
  const showCorrection = hasAnySysCorrection(
    corrections,
    shotType,
    base,
    corrected
  );

  if (
    showCorrection &&
    coEff != null &&
    c1Eff != null &&
    c3Eff != null &&
    c4Eff != null &&
    snEff != null &&
    coBase != null
  ) {
    correctionSection = {
      correctionsLine: formatCorrectionsLine(corrections, shotType),
      startAdjustLine: buildStartAdjustLine(coBase, coEff, corrections, shotType),
      c3AdjustLine: buildC3AdjustLine(coEff, c1Eff, c3Eff, corrections),
      c4: buildC4Block(c3Eff, snEff, c4Eff),
      footnotes: CORRECTION_FOOTNOTES,
    };
  }

  return {
    title,
    formulaLine,
    isEmpty: false,
    overviewSection,
    positionExplainLine,
    positionSection,
    correctionSection,
    systemValuesSection,
  };
}
