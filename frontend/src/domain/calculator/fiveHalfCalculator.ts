/**
 * domain/calculator/fiveHalfCalculator.ts
 *
 * AAS v2.0 Batch 1 — CAL-001 (5½ 2-of-3 Calculation)
 * Migration Map: App_Migration_Map.md Part A (CAL-001)
 * Design: Runtime Refactoring/Batch01/Batch1_Design.md (v1.2)
 *
 * Public API: solveFiveHalfTwoOfThree / fiveHalfComputedInputKey.
 *
 * sysOverlayInputFinite는 Batch 1 한정 예외로 export한다
 * (App.jsx SysOverlay 잔존 직접 호출 1건, Migration Debt D-002).
 * Batch 2에서 OVL-005(SysOverlay) 이동이 완료되면 export를 제거하고
 * module-private helper로 전환한다.
 */

type NumericInputs = Record<string, unknown>;

/**
 * formData.inputs 기준: 비어 있지 않고 유한 숫자면 값 반환, 아니면 null.
 * @internal Batch1 한정 예외 export — App.jsx SysOverlay 직접 호출 때문.
 * Batch 2에서 OVL-005 이동 완료 후 export 제거 예정 (Migration Debt D-002).
 */
export function sysOverlayInputFinite(
  inputs: NumericInputs | null | undefined,
  key: string
): number | null {
  if (!inputs || !(key in inputs)) return null;
  const v = inputs[key];
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 5&Half 전용 2-of-3: CO·C1·C3 중 2개 입력 시 나머지 1개 계산 (base만, CV 미사용).
 * C1 = CO − C3 정합: CO+C1→C3, CO+C3→C1, C1+C3→CO 모두 CO_base(co)만 사용.
 */
export function solveFiveHalfTwoOfThree(
  inputs: NumericInputs,
  coKey: string,
  c1Key: string,
  c3Key: string
): Record<string, number> | null {
  const co = sysOverlayInputFinite(inputs, coKey);
  const c1 = sysOverlayInputFinite(inputs, c1Key);
  const c3 = sysOverlayInputFinite(inputs, c3Key);
  const out: Record<string, number> = {};
  if (co != null && c1 != null) {
    out[coKey] = co;
    out[c1Key] = c1;
    out[c3Key] = co - c1;
    return out;
  }
  if (co != null && c3 != null) {
    out[coKey] = co;
    out[c3Key] = c3;
    out[c1Key] = co - c3;
    return out;
  }
  if (c1 != null && c3 != null) {
    out[c1Key] = c1;
    out[c3Key] = c3;
    out[coKey] = c1 + c3;
    return out;
  }
  return null;
}

/** CO/C1/C3 중 자동으로 채워지는 입력 키 (2-of-3) */
export function fiveHalfComputedInputKey(
  inputs: NumericInputs,
  coKey: string,
  c1Key: string,
  c3Key: string
): string | null {
  const co = sysOverlayInputFinite(inputs, coKey);
  const c1 = sysOverlayInputFinite(inputs, c1Key);
  const c3 = sysOverlayInputFinite(inputs, c3Key);
  if (co != null && c1 != null) return c3Key;
  if (co != null && c3 != null) return c1Key;
  if (c1 != null && c3 != null) return coKey;
  return null;
}
