/**
 * USER read-only integrated info panel model (display layer only).
 * No mutation — slot/render SSOT inputs only.
 */

import type { AdminSysSnapshot } from "./adminSysFromSlot";
import type { SlotDraftSys } from "./slotSysResolve";
import {
  buildAiAutoCommentModel,
  composeAiAutoComment,
  type AiAutoCommentModel,
} from "./aiAutoCommentViewModel";
import {
  formatThickness,
  getSystemNameKo,
  hitPointToRotationText,
  hitPointToTipDisplay,
  hitPointToVerticalText,
} from "../utils/aiPlayStrategyBuilder";
import { convertThetaToClock } from "../utils/tipClockConverter";

export type UserInfoPanelModel = {
  title: string;
  shotType: string;
  systemName: string;
  /** @deprecated 레거시 — autoComment + compose 사용 권장 */
  summaryText: string;
  /** SYS+STR 자동 생성 (HP/T·타격강도 제외) */
  autoComment: AiAutoCommentModel | null;
  /** 관리자 원 포인트 레슨만 (자동 문장과 분리) */
  onePointLessons: string[];
  systemValues: {
    co?: string;
    c1?: string;
    c2?: string;
    c3?: string;
    c4?: string;
  };
  trajectorySummary: {
    arrival?: string;
    firstCushion?: string;
    thickness?: string;
    tip?: string;
    spin?: string;
  };
  hpPreview: {
    tip?: string;
    thickness?: string;
    rotation?: string;
  };
};

export type UserInfoHptSlice = {
  T?: string;
  hit_point?: { x?: number; y?: number };
  hp?: { x?: number; y?: number };
  mode?: "TIP" | "SPIN" | string;
};

export type UserInfoStrSlice = {
  curve?: string;
  type?: string | null;
  acceleration?: string;
  speed?: number;
  depth?: number;
  impact?: string;
  spin?: number;
};

export type UserInfoAiSlice = {
  text?: string;
  onePointLessons?: Array<{ id?: string; text?: string; content?: string } | string>;
};

export type BuildUserInfoPanelArgs = {
  strategyButtonLabel?: string;
  slotRenderSys?: AdminSysSnapshot | null;
  resolvedSlotSys?: SlotDraftSys | null;
  resolvedSlotSysValues?: Record<string, number>;
  resolvedSlotBaseSysValues?: Record<string, number> | null;
  appliedSys?: SlotDraftSys | null;
  hpt?: UserInfoHptSlice | null;
  str?: UserInfoStrSlice | null;
  ai?: UserInfoAiSlice | null;
  /** USER 표시 전용: draft/applied/admin ai에서 레슨 텍스트 병합 (저장 구조 변경 없음) */
  aiLessonSources?: (UserInfoAiSlice | null | undefined)[];
  sysHpNResult?: number | null;
  viewStrategyNarrative?: string[] | null;
};

function normalizeShotType(raw: unknown, fallback = "뒤돌리기"): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t || t === "default" || t === "_") return fallback;
  return t;
}

function formatSysValue(values: Record<string, number>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = values[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
    }
  }
  return undefined;
}

function pickSystemValues(values: Record<string, number> | undefined): UserInfoPanelModel["systemValues"] {
  if (!values || typeof values !== "object") return {};
  return {
    co: formatSysValue(values, ["CO_f", "CO", "CO_r"]),
    c1: formatSysValue(values, ["C1_f", "C1", "C1_r", "oneC"]),
    c2: formatSysValue(values, ["C2_f", "C2", "C2_r"]),
    c3: formatSysValue(values, ["C3_f", "C3", "C3_r", "threeC"]),
    c4: formatSysValue(values, ["C4_f", "C4", "C4_r"]),
  };
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

function resolveHitPoint(hpt?: UserInfoHptSlice | null): { x: number; y: number } {
  const hp = hpt?.hit_point ?? hpt?.hp;
  return {
    x: typeof hp?.x === "number" ? hp.x : 0,
    y: typeof hp?.y === "number" ? hp.y : 0,
  };
}

function buildTipTexts(
  hpt: UserInfoHptSlice | null | undefined,
  sysHpNResult: number | null | undefined
): { tipText: string; tipClockText: string; rotationText: string; verticalText: string } {
  const mode = hpt?.mode ?? "TIP";
  const hitPoint = resolveHitPoint(hpt);
  let tipText = "";
  let tipClockText = "";

  if (mode === "TIP") {
    if (sysHpNResult != null && typeof sysHpNResult === "number") {
      const dir = sysHpNResult >= 0 ? "right" : "left";
      const n = Math.abs(sysHpNResult);
      tipText =
        n === 0 ? "중앙(12시)" : dir === "right" ? `우측 ${n}팁` : `좌측 ${n}팁`;
      const theta = (dir === "right" ? 1 : -1) * (Math.PI / 2) * (1 - n / 4);
      tipClockText = convertThetaToClock(theta);
    } else {
      const tip = hitPointToTipDisplay(hitPoint);
      tipText = tip.tipText;
      tipClockText = tip.tipClockText;
    }
  }

  return {
    tipText,
    tipClockText,
    rotationText: hitPointToRotationText(hitPoint),
    verticalText: hitPointToVerticalText(hitPoint),
  };
}

export type BuildAiAutoCommentContextArgs = {
  slotRenderSys?: AdminSysSnapshot | null;
  resolvedSlotSys?: SlotDraftSys | null;
  resolvedSlotSysValues?: Record<string, number> | null;
  resolvedSlotBaseSysValues?: Record<string, number> | null;
  str?: UserInfoStrSlice | null;
};

/** SYS+STR 자동 코멘트 ViewModel (ADMIN/USER 공통 SSOT) */
export function buildAiAutoCommentFromContext(
  args: BuildAiAutoCommentContextArgs
): AiAutoCommentModel {
  const systemId = resolveSystemId(args.slotRenderSys, args.resolvedSlotSys);
  return buildAiAutoCommentModel({
    systemId,
    systemName: getSystemNameKo(systemId),
    shotType: args.slotRenderSys?.shotType,
    baseValues: args.resolvedSlotBaseSysValues ?? undefined,
    correctedValues: args.resolvedSlotSysValues ?? undefined,
    corrections: args.slotRenderSys?.corrections ?? undefined,
    str: args.str ?? undefined,
  });
}

/** @deprecated composeAiAutoComment(buildAiAutoCommentFromContext(...)) 사용 */
export function buildPlayStrategySummaryText(
  args: BuildAiAutoCommentContextArgs
): string {
  return composeAiAutoComment(buildAiAutoCommentFromContext(args));
}

function lessonTextFromItem(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;
  for (const key of ["text", "content", "message", "body", "lesson"] as const) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickOnePointLessonTexts(ai?: UserInfoAiSlice | null): string[] {
  if (!ai?.onePointLessons?.length) return [];
  const out: string[] = [];
  for (const item of ai.onePointLessons) {
    const t = lessonTextFromItem(item);
    if (t) out.push(t);
  }
  return out;
}

/** USER 패널: 슬롯·admin 여러 ai 소스에서 레슨 문장 수집 (중복 제거) */
export function collectOnePointLessonTexts(
  ...sources: (UserInfoAiSlice | null | undefined)[]
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    for (const t of pickOnePointLessonTexts(src)) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Build USER AI coaching panel read model (pure, no side effects). */
export function buildUserInfoPanel(args: BuildUserInfoPanelArgs): UserInfoPanelModel {
  const systemId = resolveSystemId(args.slotRenderSys, args.resolvedSlotSys);
  const systemName = getSystemNameKo(systemId);
  const shotType = normalizeShotType(args.slotRenderSys?.shotType);
  const title = args.strategyButtonLabel?.trim() || shotType;
  const sysValues = pickSystemValues(args.resolvedSlotSysValues);
  const { tipText, tipClockText, rotationText } = buildTipTexts(
    args.hpt,
    args.sysHpNResult
  );
  const thicknessText = formatThickness(args.hpt?.T);
  const res = args.appliedSys?.outputs?.result ?? {};
  const toNum = (v: unknown): number | null =>
    typeof v === "number" && !Number.isNaN(v) ? v : null;
  const arrivalNum =
    toNum(res.threeC) ?? toNum(res.C4_f) ?? toNum(res.C4_r);
  const firstNum = toNum(res.oneC) ?? toNum(res.C1_f) ?? toNum(res.C1_r);

  const onePointLessons =
    args.aiLessonSources != null
      ? collectOnePointLessonTexts(...args.aiLessonSources)
      : pickOnePointLessonTexts(args.ai);

  const autoComment = buildAiAutoCommentFromContext({
    slotRenderSys: args.slotRenderSys,
    resolvedSlotSys: args.resolvedSlotSys,
    resolvedSlotSysValues: args.resolvedSlotSysValues,
    resolvedSlotBaseSysValues: args.resolvedSlotBaseSysValues,
    str: args.str,
  });
  const summaryText = composeAiAutoComment(autoComment);

  const spinText =
    typeof args.str?.spin === "number" && Number.isFinite(args.str.spin)
      ? String(args.str.spin)
      : undefined;

  return {
    title,
    shotType,
    systemName,
    summaryText,
    autoComment,
    onePointLessons,
    systemValues: sysValues,
    trajectorySummary: {
      arrival: arrivalNum != null ? String(arrivalNum) : sysValues.c3,
      firstCushion: firstNum != null ? String(firstNum) : sysValues.c1,
      thickness: thicknessText,
      tip: tipText || tipClockText || undefined,
      spin: spinText,
    },
    hpPreview: {
      tip: tipText || tipClockText || undefined,
      thickness: thicknessText,
      rotation: rotationText || undefined,
    },
  };
}
