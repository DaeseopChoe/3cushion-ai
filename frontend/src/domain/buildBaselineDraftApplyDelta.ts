/**
 * baselineDraftState → commitDraftSys용 inputDelta (단일 마크, activeMark 기준).
 * C3/C4 계산은 하지 않음 — P0-4c에서 기존 SYS Apply 파이프라인이 처리.
 */

export type BaselineDraftMark = "CO" | "C1";

export type BaselineDraftState = {
  coSysValue?: number | null;
  c1SysValue?: number | null;
  activeMark?: BaselineDraftMark | null;
};

export type BaselineDraftApplyDelta = {
  targetMark: BaselineDraftMark;
  inputDelta: Record<string, number>;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildBaselineDraftApplyDelta(params: {
  baselineDraftState: BaselineDraftState;
  /** P0-4c+ reserved; P0-4b does not branch on systemId */
  systemId?: string;
}): BaselineDraftApplyDelta | null {
  const { baselineDraftState } = params;
  const { activeMark, coSysValue, c1SysValue } = baselineDraftState;

  if (activeMark === "CO") {
    if (!isFiniteNumber(coSysValue)) return null;
    return {
      targetMark: "CO",
      inputDelta: { CO_f: coSysValue },
    };
  }

  if (activeMark === "C1") {
    if (!isFiniteNumber(c1SysValue)) return null;
    return {
      targetMark: "C1",
      inputDelta: { C1_f: c1SysValue },
    };
  }

  return null;
}
