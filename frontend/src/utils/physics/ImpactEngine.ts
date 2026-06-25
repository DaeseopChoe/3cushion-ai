// frontend/src/utils/physics/ImpactEngine.ts

export type Point = { x: number; y: number };
export type Side = -1 | 0 | 1;

export interface PhysicsScale {
  BALL_DIAMETER_RG: number;
  BALL_RADIUS_RG: number;
}

export interface ThicknessInfo {
  hitFraction: number;       // 0..1  (1 = 8/8)
  fraction8: number;         // 1..8
  side: Side;                // +1 left, -1 right, 0 center
  signedPerp: number;        // signed lateral offset
  displayThickness: string;  // "1/8".."8/8"
  legacyT: string;           // "+7/8", "-5/8", "8/8"
}

export interface ImpactSolveResult {
  impactBall: Point;
  contactPoint: Point;
  thickness: ThicknessInfo;
}

export interface SnapResult {
  impactBall: Point;
  snapped: boolean;
  distanceToTarget: number;
  threshold: number;
}

export const DEFAULT_BALL_DIAMETER_MM = 61.5;
export const DEFAULT_RG_UNIT_MM = 35.55;

export const DEFAULT_SCALE: PhysicsScale = {
  BALL_DIAMETER_RG: DEFAULT_BALL_DIAMETER_MM / DEFAULT_RG_UNIT_MM,
  BALL_RADIUS_RG: (DEFAULT_BALL_DIAMETER_MM / DEFAULT_RG_UNIT_MM) / 2,
};

const EPS = 1e-6;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function length(v: Point): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Point): Point {
  const len = length(v);
  if (len < EPS) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function perpLeft(v: Point): Point {
  return { x: -v.y, y: v.x };
}

function fraction8ToDisplay(n: number): string {
  const v = clamp(Math.round(n), 1, 8);
  switch (v) {
    case 2: return "1/4";
    case 4: return "1/2";
    case 6: return "3/4";
    default: return `${v}/8`;
  }
}

function parseAB(raw: string): { a: number; b: number } | null {
  const m = raw.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return { a, b };
}

/**
 * display thickness:
 *  - "1/8", "3/8", "1/2", "8/8"
 *  - "+3/8", "-2/8" 도 허용 (UI: + = 우측, - = 좌측)
 *
 * 의미:
 *  - 8/8 = full ball
 *  - 1/8 = thin hit
 */
export function parseDisplayThickness(
  raw: string,
  sideHint: Side = 1
): { hitFraction: number; side: Side } {
  const txt = raw.trim();
  const signed = txt.match(/^([+-])\s*(.+)$/);

  let side: Side = sideHint;
  let body = txt;

  if (signed) {
    side = signed[1] === "+" ? -1 : 1;
    body = signed[2].trim();
  }

  const ab = parseAB(body);
  if (!ab) {
    return { hitFraction: 1, side: 0 };
  }

  const hitFraction = clamp(ab.a / ab.b, 0, 1);

  if (Math.abs(hitFraction - 1) < EPS) {
    side = 0;
  }

  return { hitFraction, side };
}

/**
 * legacy T (UI 규약: + = 우측, - = 좌측, n/8 = hitFraction 직접):
 *  - "8/8"           => full ball (hitFraction=1)
 *  - "+7/8"          => 우측 7/8 = hit 7/8 of ball (거의 정면)
 *  - "+1/8"          => 우측 1/8 = hit 1/8 of ball (얇게)
 *
 * orbit side: +1 = left, -1 = right (수학 좌표)
 * UI + (우측) → orbit side -1, UI - (좌측) → orbit side 1
 */
export function parseLegacyT(raw: string): { hitFraction: number; side: Side } {
  const txt = raw.trim();
  if (txt === "8/8") {
    return { hitFraction: 1, side: 0 };
  }

  const signed = txt.match(/^([+-])\s*(\d+)\s*\/\s*(\d+)$/);
  if (!signed) {
    return parseDisplayThickness(txt, 1);
  }

  const side: Side = signed[1] === "+" ? -1 : 1;
  const a = Number(signed[2]);
  const b = Number(signed[3]);

  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return { hitFraction: 1, side: 0 };
  }

  const hitFraction = clamp(a / b, 0, 1);

  if (Math.abs(hitFraction - 1) < EPS) {
    return { hitFraction: 1, side: 0 };
  }

  return { hitFraction, side };
}

export function displayThicknessToLegacyT(
  displayThickness: string,
  side: Side = 1
): string {
  const { hitFraction, side: parsedSide } = parseDisplayThickness(displayThickness, side);
  const finalSide: Side = parsedSide === 0 ? side : parsedSide;

  const fraction8 = clamp(Math.round(hitFraction * 8), 1, 8);

  if (fraction8 >= 8) {
    return "8/8";
  }

  const sign = finalSide === -1 ? "+" : "-";
  return `${sign}${fraction8}/8`;
}

export function legacyTToDisplayThickness(T: string): { displayThickness: string; side: Side } {
  const { hitFraction, side } = parseLegacyT(T);
  const fraction8 = clamp(Math.round(hitFraction * 8), 1, 8);
  return {
    displayThickness: fraction8ToDisplay(fraction8),
    side,
  };
}

/**
 * canonical inverse:
 * impactBall이 주어졌을 때 thickness를 계산
 *
 * 기준:
 *  - cue -> impact 방향을 기준 벡터로 사용
 *  - target - impact를 cue->impact에 수직인 방향으로 투영
 */
export function computeThicknessFromImpact(
  cue: Point | null,
  target: Point | null,
  impactBall: Point | null,
  scale: PhysicsScale = DEFAULT_SCALE
): ThicknessInfo | null {
  if (!cue || !target || !impactBall) return null;

  const approach = normalize(sub(impactBall, cue));
  if (length(approach) < EPS) return null;

  const lateralAxis = perpLeft(approach);
  const rel = sub(target, impactBall);

  const signedPerp = dot(rel, lateralAxis);

  // 핵심: 지름 기준. 8/8=0, 1/8≈7/8 D
  const hitFraction = clamp(
    1 - Math.abs(signedPerp) / scale.BALL_DIAMETER_RG,
    0,
    1
  );

  let fraction8 = Math.round(hitFraction * 8);

  // UI는 1/8 ~ 8/8 범위로 다룸
  fraction8 = clamp(fraction8, 1, 8);

  let side: Side = 0;
  if (Math.abs(signedPerp) > EPS) {
    side = signedPerp > 0 ? 1 : -1;
  }

  const displayThickness = fraction8ToDisplay(fraction8);

  let legacyT = "8/8";
  if (fraction8 < 8) {
    const sign = side === 1 ? "-" : "+";
    legacyT = `${sign}${fraction8}/8`;
  }

  return {
    hitFraction,
    fraction8,
    side,
    signedPerp,
    displayThickness,
    legacyT,
  };
}

function orbitPoint(
  cue: Point,
  target: Point,
  angle: number,
  side: Side,
  diameterRG: number
): Point {
  const base = normalize(sub(target, cue));        // cue -> target
  const left = perpLeft(base);

  const s = side >= 0 ? 1 : -1;

  // cue 쪽 반원만 사용
  const back = Math.cos(angle) * diameterRG;
  const lat = Math.sin(angle) * diameterRG * s;

  return add(
    target,
    add(mul(base, -back), mul(left, lat))
  );
}

/**
 * canonical forward:
 * legacy T -> impactBall
 *
 * computeThicknessFromImpact와 최대한 역함수처럼 동작하도록
 * orbit 상에서 binary search
 */
export function computeImpactFromLegacyT(
  cue: Point | null,
  target: Point | null,
  T: string,
  scale: PhysicsScale = DEFAULT_SCALE
): ImpactSolveResult | null {
  if (!cue || !target) return null;

  const { hitFraction, side } = parseLegacyT(T);

  // full ball
  if (hitFraction >= 0.999) {
    const dir = normalize(sub(cue, target)); // target -> cue
    let impactBall = add(target, mul(dir, scale.BALL_DIAMETER_RG));
    const dx = impactBall.x - target.x;
    const dy = impactBall.y - target.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1e-6) {
      const nx = dx / dist;
      const ny = dy / dist;
      impactBall = {
        x: target.x + nx * scale.BALL_DIAMETER_RG,
        y: target.y + ny * scale.BALL_DIAMETER_RG,
      };
    }
    const normal = normalize(sub(impactBall, target));
    const contactPoint = add(target, mul(normal, scale.BALL_RADIUS_RG));
    const thickness = computeThicknessFromImpact(cue, target, impactBall, scale)!;
    return { impactBall, contactPoint, thickness };
  }

  let lo = 0;
  let hi = Math.PI / 2 - 1e-4;

  let best = orbitPoint(cue, target, hi, side === 0 ? 1 : side, scale.BALL_DIAMETER_RG);
  let bestInfo = computeThicknessFromImpact(cue, target, best, scale)!;

  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    const cand = orbitPoint(cue, target, mid, side === 0 ? 1 : side, scale.BALL_DIAMETER_RG);
    const info = computeThicknessFromImpact(cue, target, cand, scale)!;

    best = cand;
    bestInfo = info;

    if (info.hitFraction > hitFraction) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  let impactBall = best;

  /**
   * Final contact snap - ensure |impactBall - target| = BALL_DIAMETER_RG
   * Applied as the absolute last step before return
   */
  const dx = impactBall.x - target.x;
  const dy = impactBall.y - target.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 1e-6) {
    const nx = dx / dist;
    const ny = dy / dist;
    impactBall = {
      x: target.x + nx * scale.BALL_DIAMETER_RG,
      y: target.y + ny * scale.BALL_DIAMETER_RG,
    };
  }

  const normal = normalize(sub(impactBall, target));
  const contactPoint = add(target, mul(normal, scale.BALL_RADIUS_RG));

  return {
    impactBall,
    contactPoint,
    thickness: bestInfo,
  };
}

export function computeImpactFromDisplayThickness(
  cue: Point | null,
  target: Point | null,
  thicknessStr: string,
  sideHint: Side = 1,
  scale: PhysicsScale = DEFAULT_SCALE
): ImpactSolveResult | null {
  const { hitFraction, side } = parseDisplayThickness(thicknessStr, sideHint);
  const fraction8 = clamp(Math.round(hitFraction * 8), 1, 8);

  if (fraction8 >= 8) {
    return computeImpactFromLegacyT(cue, target, "8/8", scale);
  }

  const sign = side === -1 ? "+" : "-";
  return computeImpactFromLegacyT(cue, target, `${sign}${fraction8}/8`, scale);
}

/**
 * impact drag snap/orbit
 * target 근처로 오면 정확히 접촉 원(r = BALL_DIAMETER_RG) 위로 보정
 */
export function snapImpactToOrbit(
  target: Point | null,
  candidateImpact: Point | null,
  cue: Point | null,
  scale: PhysicsScale = DEFAULT_SCALE,
  snapExtraRG = 1.0
): SnapResult | null {
  if (!target || !candidateImpact) return null;

  const threshold = scale.BALL_DIAMETER_RG + snapExtraRG;

  let delta = sub(candidateImpact, target);
  let dist = length(delta);

  if (dist > threshold) {
    return {
      impactBall: candidateImpact,
      snapped: false,
      distanceToTarget: dist,
      threshold,
    };
  }

  // len≈0일 때는 target -> cue 반대 방향이 아니라
  // "target 에서 cue 방향" 쪽에 impactBall이 있도록 보정
  if (dist < EPS) {
    if (cue) {
      delta = normalize(sub(cue, target)); // target -> cue
      dist = 1;
    } else {
      delta = { x: -1, y: 0 };
      dist = 1;
    }
  }

  const unit = { x: delta.x / dist, y: delta.y / dist };
  const snapped = add(target, mul(unit, scale.BALL_DIAMETER_RG));

  return {
    impactBall: snapped,
    snapped: true,
    distanceToTarget: dist,
    threshold,
  };
}
