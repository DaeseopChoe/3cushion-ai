/**
 * reflectionEngine.ts
 * 2C fallback Reflection Engine v1.0
 *
 * anchors["2C"]가 없을 때 CO, C1, C3, tip, track 기반으로
 * 반사 노드 C2를 자동 생성하여 C1→C3 점프를 제거한다.
 *
 * 좌표는 반드시 RG 기준.
 */

export type Rail = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";

export type Point = {
  x: number;
  y: number;
};

export type TipInput = {
  count: number;
  side: "L" | "R";
};

export type ReflectionInput = {
  co: Point;
  c1: Point;
  c3: Point;
  track?: string;
  tip?: TipInput | null;
  manualHint?: {
    preferredRail?: Rail;
    deltaAngleDeg?: number;
  } | null;
};

export type ReflectionOutput = {
  c2: Point;
  c2Rail: Rail;
  thetaInDeg: number;
  thetaOutDeg: number;
  spinAdjustDeg: number;
  source: "auto" | "auto_with_hint";
  diagnostics: {
    c1Rail: Rail;
    c3Rail: Rail;
    candidateRails: Rail[];
    selectedBy: "preferredRail" | "track_bias" | "first_valid";
  };
};

/** |coord - rail| <= EPS_RAIL 이면 rail로 인정. 앵커는 정확히 레일 위가 아닐 수 있음 */
const EPS_RAIL = 3;
const RG_W = 80;
const RG_H = 40;

const TIP_TO_DELTA_DEG: Record<number, number> = {
  0: 0,
  1: 7.125,
  2: 14.036,
  3: 20.556,
  4: 26.565,
};

/** 레일 판정 */
export function detectRail(p: Point, eps = EPS_RAIL): Rail | null {
  if (Math.abs(p.y - RG_H) <= eps) return "TOP";
  if (Math.abs(p.y - 0) <= eps) return "BOTTOM";
  if (Math.abs(p.x - 0) <= eps) return "LEFT";
  if (Math.abs(p.x - RG_W) <= eps) return "RIGHT";
  return null;
}

/** from → to 방향 각도 (deg) */
export function angleDeg(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** track suffix (_L / _R) 추출 */
export function detectTrackTurn(track?: string): "L" | "R" | null {
  if (!track) return null;
  if (track.endsWith("_L")) return "L";
  if (track.endsWith("_R")) return "R";
  return null;
}

/** spin 부호 해석: track 선회방향과 tip.side가 같으면 +, 반대면 - */
export function resolveSignedSpinDeg(
  track?: string,
  tip?: TipInput | null,
  extraDeltaDeg = 0
): number {
  if (!tip || tip.count === 0) return extraDeltaDeg;

  const base = TIP_TO_DELTA_DEG[tip.count] ?? TIP_TO_DELTA_DEG[Math.round(tip.count)] ?? 0;
  const turn = detectTrackTurn(track);

  if (!turn) {
    return (tip.side === "R" ? 1 : -1) * base + extraDeltaDeg;
  }

  const sign = turn === tip.side ? 1 : -1;
  return sign * base + extraDeltaDeg;
}

/** C1 레일을 제외한 후보 레일 */
export function getCandidateRails(c1Rail: Rail): Rail[] {
  const all: Rail[] = ["TOP", "BOTTOM", "LEFT", "RIGHT"];
  return all.filter((r) => r !== c1Rail);
}

/** 후보 레일 선택: preferredRail > track_bias > first_valid */
export function chooseCandidateRail(
  c1Rail: Rail,
  track?: string,
  preferredRail?: Rail
): {
  rail: Rail;
  selectedBy: "preferredRail" | "track_bias" | "first_valid";
  candidates: Rail[];
} {
  const candidates = getCandidateRails(c1Rail);

  if (preferredRail && candidates.includes(preferredRail)) {
    return { rail: preferredRail, selectedBy: "preferredRail", candidates };
  }

  const turn = detectTrackTurn(track);
  if (turn === "L" && candidates.includes("LEFT")) {
    return { rail: "LEFT", selectedBy: "track_bias", candidates };
  }
  if (turn === "R" && candidates.includes("RIGHT")) {
    return { rail: "RIGHT", selectedBy: "track_bias", candidates };
  }

  return { rail: candidates[0], selectedBy: "first_valid", candidates };
}

/** 각도 → 방향 벡터 */
export function directionFromAngleDeg(thetaDeg: number): { dx: number; dy: number } {
  const rad = (thetaDeg * Math.PI) / 180;
  return { dx: Math.cos(rad), dy: Math.sin(rad) };
}

/** C1에서 thetaDeg 방향 반직선이 rail과 만나는 점 (t > 0만) */
export function intersectRayWithRail(
  origin: Point,
  thetaDeg: number,
  rail: Rail,
  eps = 1e-9
): Point | null {
  const { dx, dy } = directionFromAngleDeg(thetaDeg);

  if (rail === "TOP") {
    if (Math.abs(dy) < eps) return null;
    const t = (RG_H - origin.y) / dy;
    if (t <= 0) return null;
    const x = origin.x + t * dx;
    if (x < 0 || x > RG_W) return null;
    return { x, y: RG_H };
  }

  if (rail === "BOTTOM") {
    if (Math.abs(dy) < eps) return null;
    const t = (0 - origin.y) / dy;
    if (t <= 0) return null;
    const x = origin.x + t * dx;
    if (x < 0 || x > RG_W) return null;
    return { x, y: 0 };
  }

  if (rail === "LEFT") {
    if (Math.abs(dx) < eps) return null;
    const t = (0 - origin.x) / dx;
    if (t <= 0) return null;
    const y = origin.y + t * dy;
    if (y < 0 || y > RG_H) return null;
    return { x: 0, y };
  }

  if (rail === "RIGHT") {
    if (Math.abs(dx) < eps) return null;
    const t = (RG_W - origin.x) / dx;
    if (t <= 0) return null;
    const y = origin.y + t * dy;
    if (y < 0 || y > RG_H) return null;
    return { x: RG_W, y };
  }

  return null;
}

/** 레일 법선 각도 (deg) */
function railNormalAngle(rail: Rail): number {
  switch (rail) {
    case "TOP": return 90;
    case "BOTTOM": return -90;
    case "LEFT": return 180;
    case "RIGHT": return 0;
    default: return 0;
  }
}

/** 입사각 → 반사각 */
function reflectAngle(thetaInDeg: number, rail: Rail): number {
  const normalDeg = railNormalAngle(rail);
  return 2 * normalDeg - thetaInDeg;
}

/** orderedRails 순서로 첫 번째 유효 C2 반환 */
export function findFirstValidC2(
  c1: Point,
  thetaOutDeg: number,
  orderedRails: Rail[]
): { c2: Point; c2Rail: Rail } | null {
  for (const rail of orderedRails) {
    const p = intersectRayWithRail(c1, thetaOutDeg, rail);
    if (p) return { c2: p, c2Rail: rail };
  }
  return null;
}

/**
 * CO, C1, C3, tip, track으로 C2 반사 노드 생성
 * RG 좌표 입력 전제
 */
export function computeReflectionC2(input: ReflectionInput): ReflectionOutput | null {
  const { co, c1, c3, tip, track, manualHint } = input;

  const c1Rail = detectRail(c1);
  const c3Rail = detectRail(c3);

  if (!c1Rail || !c3Rail) {
    console.warn("Reflection skipped: rail detection failed", { c1, c3, c1Rail, c3Rail });
    return null;
  }

  const thetaInDeg = angleDeg(co, c1);
  const spinAdjustDeg = resolveSignedSpinDeg(
    track,
    tip,
    manualHint?.deltaAngleDeg ?? 0
  );
  const thetaReflectDeg = reflectAngle(thetaInDeg, c1Rail);
  const thetaOutDeg = thetaReflectDeg + spinAdjustDeg + 180;

  const preferred = manualHint?.preferredRail;
  const chosen = chooseCandidateRail(c1Rail, track, preferred);

  const orderedRails = [
    chosen.rail,
    ...chosen.candidates.filter((r) => r !== chosen.rail),
  ];

  const allRails: Rail[] = ["RIGHT", "BOTTOM", "LEFT"];
  console.log("[C2_REFLECT] c1Rail:", c1Rail);
  console.log("[C2_REFLECT] thetaOutDeg:", thetaOutDeg);
  allRails.forEach((rail) => {
    const p = intersectRayWithRail(c1, thetaOutDeg, rail);
    console.log("[C2_REFLECT] rail:", rail, "intersectRayWithRail:", p);
  });

  const found = findFirstValidC2(c1, thetaOutDeg, orderedRails);
  if (found) {
    console.log("[C2_REFLECT] targetRail (selected):", found.c2Rail, "c2:", found.c2);
  }
  if (!found) {
    console.warn("Reflection skipped: intersection failed", {
      c1,
      thetaOutDeg,
      orderedRails,
    });
    return null;
  }

  return {
    c2: found.c2,
    c2Rail: found.c2Rail,
    thetaInDeg,
    thetaOutDeg,
    spinAdjustDeg,
    source: preferred ? "auto_with_hint" : "auto",
    diagnostics: {
      c1Rail,
      c3Rail,
      candidateRails: chosen.candidates,
      selectedBy: chosen.selectedBy,
    },
  };
}
