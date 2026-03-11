/**
 * systemEngine.ts
 * 볼 좌표 → 시스템 값 역산
 * ball drag 시 CO_f, C1_f, C3_r 등을 자동 계산
 */

export type Point = { x: number; y: number };

const RG_W = 80;
const RG_H = 40;

/**
 * cue → target 직선과 테이블 레일의 교점 계산
 * Rg 좌표계: 테이블 0-80 x 0-40 y
 * CO = cue 쪽 교점, C1 = target 쪽 교점
 */
function lineRailIntersections(
  cue: Point,
  target: Point
): { CO_rail: Point | null; C1_rail: Point | null } {
  const dx = target.x - cue.x;
  const dy = target.y - cue.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { CO_rail: null, C1_rail: null };
  }
  const intersections: { t: number; pt: Point }[] = [];
  if (Math.abs(dy) > 1e-6) {
    const t_bottom = (0 - cue.y) / dy;
    const t_top = (RG_H - cue.y) / dy;
    if (t_bottom >= -0.01 && t_bottom <= 1.01) {
      const x = cue.x + t_bottom * dx;
      if (x >= -0.5 && x <= RG_W + 0.5) intersections.push({ t: t_bottom, pt: { x, y: 0 } });
    }
    if (t_top >= -0.01 && t_top <= 1.01) {
      const x = cue.x + t_top * dx;
      if (x >= -0.5 && x <= RG_W + 0.5) intersections.push({ t: t_top, pt: { x, y: RG_H } });
    }
  }
  if (Math.abs(dx) > 1e-6) {
    const t_left = (0 - cue.x) / dx;
    const t_right = (RG_W - cue.x) / dx;
    if (t_left >= -0.01 && t_left <= 1.01) {
      const y = cue.y + t_left * dy;
      if (y >= -0.5 && y <= RG_H + 0.5) intersections.push({ t: t_left, pt: { x: 0, y } });
    }
    if (t_right >= -0.01 && t_right <= 1.01) {
      const y = cue.y + t_right * dy;
      if (y >= -0.5 && y <= RG_H + 0.5) intersections.push({ t: t_right, pt: { x: RG_W, y } });
    }
  }
  intersections.sort((a, b) => a.t - b.t);
  const behind = intersections.filter((p) => p.t < -0.01);
  const toward = intersections.filter((p) => p.t > 0.01);
  const CO_rail = behind.length > 0 ? behind[behind.length - 1].pt : toward[0]?.pt ?? null;
  const C1_rail = toward.length > 0 ? toward[0].pt : behind[0]?.pt ?? null;
  return { CO_rail, C1_rail };
}

/**
 * Rg x (0-80) → 대략적인 sys 값 (0-80 스케일)
 * 실제 시스템별 스케일은 다를 수 있음
 */
function rgXToSys(x: number): number {
  return Math.round(Math.max(0, Math.min(80, x)));
}

/**
 * 볼 좌표로부터 시스템 값 추정
 * @param cue - 큐볼 Rg 좌표
 * @param target - 타겟볼 Rg 좌표 (target_center)
 * @returns { CO_f, C1_f } 등 추정값 (C3_r은 trajectory 필요해 별도)
 */
export function computeSystemFromPositions(params: {
  cue: Point | null;
  target: Point | null;
}): Partial<Record<string, number>> {
  const { cue, target } = params;
  if (!cue || !target) return {};
  const { CO_rail, C1_rail } = lineRailIntersections(cue, target);
  const result: Record<string, number> = {};
  if (CO_rail) {
    const onHorizontal = Math.abs(CO_rail.y - 0) < 0.5 || Math.abs(CO_rail.y - RG_H) < 0.5;
    result.CO_f = onHorizontal ? rgXToSys(CO_rail.x) : rgXToSys(CO_rail.y);
    result.CO_r = result.CO_f;
  }
  if (C1_rail) {
    const onHorizontal = Math.abs(C1_rail.y - 0) < 0.5 || Math.abs(C1_rail.y - RG_H) < 0.5;
    result.C1_f = onHorizontal ? rgXToSys(C1_rail.x) : rgXToSys(C1_rail.y);
    result.C1_r = result.C1_f;
  }
  return result;
}

/**
 * SYS 시스템값 → 앵커 좌표 변환
 * 관리자 입력 시 anchors 생성 (B2T 기본: CO=bottom, 1C=top)
 */
export function sysValuesToAnchors(
  sysValues: Record<string, unknown> | undefined
): Record<string, { x: number; y: number }> {
  const anchors: Record<string, { x: number; y: number }> = {};
  if (!sysValues || typeof sysValues !== "object") return anchors;

  const num = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return typeof n === "number" && !Number.isNaN(n) ? n : null;
  };

  const co = num(sysValues.CO_f) ?? num(sysValues.CO_r) ?? num(sysValues.CO);
  if (co != null) anchors.CO = { x: Math.max(0, Math.min(RG_W, co)), y: 0 };

  const c1 = num(sysValues.C1_f) ?? num(sysValues.C1_r) ?? num(sysValues.oneC) ?? num(sysValues["1C"]);
  if (c1 != null) anchors["1C"] = { x: Math.max(0, Math.min(RG_W, c1)), y: RG_H };

  const c2 = num(sysValues.C2_f) ?? num(sysValues.C2_r) ?? num(sysValues["2C"]);
  if (c2 != null) anchors["2C"] = { x: RG_W, y: Math.max(0, Math.min(RG_H, c2)) };

  const c3 = num(sysValues.C3_f) ?? num(sysValues.C3_r) ?? num(sysValues.threeC) ?? num(sysValues["3C"]);
  if (c3 != null) anchors["3C"] = { x: Math.max(0, Math.min(RG_W, c3)), y: 0 };

  const c4 = num(sysValues.C4_f) ?? num(sysValues.C4_r) ?? num(sysValues["4C"]);
  if (c4 != null) anchors["4C"] = { x: 0, y: Math.max(0, Math.min(RG_H, c4)) };

  return anchors;
}
