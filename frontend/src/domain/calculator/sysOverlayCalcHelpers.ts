/**
 * domain/calculator/sysOverlayCalcHelpers.ts
 *
 * AAS v2.0 Batch 4 — CAL-002 / CAL-005 shared pure calculation helpers.
 * AD-B4-01 (Option A): moved from overlay/utils/sysOverlayUtils.jsx.
 * Presentation Layer must not own calculation; Domain is SSOT.
 */

import { getShotTypeCorrectionSign } from "../englishCorrectionSign";

export function resolveCoC1C3Keys(
  forced: { CO?: string; C1?: string; C3?: string } | null | undefined,
  spaceSel: Record<string, string>
) {
  const co = forced?.CO ? `CO_${forced.CO}` : `CO_${spaceSel.CO}`;
  const c1 = forced?.C1 ? `C1_${forced.C1}` : `C1_${spaceSel.C1}`;
  const c3 = forced?.C3 ? `C3_${forced.C3}` : `C3_${spaceSel.C3}`;
  return { coKey: co, c1Key: c1, c3Key: c3 };
}

/**
 * derived: CO·C1으로 c3Key 자동 (C3 = CO + coSlide − C1). coSlide는 기본 0(공식 C1_f=CO_f−C3_r 정합).
 * full_input: CO/C1/C3 등 사용자 입력 필드는 수정하지 않음.
 */
export function normalizeToFormulaInputsApp(
  numericPayload: Record<string, number>,
  systemMode: string,
  coKey: string,
  c1Key: string,
  c3Key: string,
  coSlide = 0
) {
  const out = { ...numericPayload };
  if (systemMode !== "derived" || !c3Key || !coKey || !c1Key) {
    return out;
  }
  const coN = Number(out[coKey]);
  const c1N = Number(out[c1Key]);
  const co = Number.isFinite(coN) ? coN : 0;
  const c1 = Number.isFinite(c1N) ? c1N : 0;
  const coEff = co + (Number(coSlide) || 0);
  out[c3Key] = coEff - c1;
  return out;
}

export function isRhsKeyReadOnlyForSys(
  key: string,
  systemMode: string,
  c3Key: string
) {
  if (!key || key === "HP_n" || key === "An") return false;
  if (systemMode === "derived" && c3Key && key === c3Key) return true;
  return false;
}

/** normalize 전 숫자 payload (rhs + CO/C1/C3 토큰 + HP/An) */
export function buildSysOverlayNumericPayload(
  inputs: Record<string, number>,
  rhsKeys: string[],
  coKey: string,
  c1Key: string,
  c3Key: string,
  needsHP: boolean,
  needsAn: boolean
) {
  const payload: Record<string, number> = {};
  (rhsKeys || []).forEach((k) => {
    const v = inputs[k];
    payload[k] = v === "" || v == null ? 0 : Number(v);
  });
  [coKey, c1Key, c3Key].forEach((k) => {
    if (!k) return;
    if (!(k in payload)) {
      const v = inputs[k];
      payload[k] = v === "" || v == null ? 0 : Number(v);
    }
  });
  if (needsHP) payload.HP_n = Number(inputs.HP_n ?? 0);
  if (needsAn) payload.An = Number(inputs.An ?? 0);
  return payload;
}

/** slide(양수 밀림)와 draw(음수 끌림 저장) 상호 배타 → 단일 signed 스칼라 (물리·곡선 공통). */
export function unifiedSlideFromCorrections(
  corrections: Record<string, unknown> | null | undefined,
  shotType: string | null | undefined
) {
  if (!corrections || typeof corrections !== "object") return 0;
  const s = Number(corrections.slide);
  const d = Number(corrections.draw);
  const slideVal = Math.abs(Number.isFinite(s) ? s : 0);
  const drawVal = -Math.abs(Number.isFinite(d) ? d : 0);
  const raw = drawVal !== 0 ? drawVal : slideVal;
  return raw * getShotTypeCorrectionSign(shotType);
}
