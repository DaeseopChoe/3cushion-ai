/**
 * Spider Web (거미줄) — frame marks, rail points, C2 connection (SSOT §4).
 *
 * C3 is the absolute answer (formula value); C2 never moves C3. C2 is solved on
 * the track's C2 long rail so that C1 → C2 → C3 obeys the spin-corrected
 * reflection (specular + tip rotation in the track's own spin direction).
 */

import type { Rail } from "../reflectionEngine";
import type { RgPoint } from "../trajectory/c2ReflectionOverride";
import {
  SPIDER_CONTINUATION_DEFAULTS,
  computeSpiderContinuation,
  type SpiderContinuationConfig,
  type SpiderContinuationNode,
  type SpiderContinuationVertices,
} from "./spiderWebContinuation";
import {
  spiderValuesFromStoredInputs,
  spiderHitPointFromSelection,
  type SpiderHitPoint,
  type SpiderSolvedValues,
} from "./spiderWebSolver";
import {
  SPIDER_WEB_TRACKS,
  isSpiderWebTrack,
  spiderC3Branch,
  spiderC3Rail,
  type SpiderC3Branch,
  type SpiderWebTrackId,
} from "./spiderWebTracks";

export type SpiderAnchorsData = {
  trajectories?: Record<string, { anchors?: Array<{ id?: string }> } | undefined>;
} | null | undefined;

export type SpiderMark = "CO" | "C1" | "C3";

const RG_W = 80;
const RG_H = 40;
const FRAME_MIN = -2.25;
const FRAME_X_MAX = 82.25;
const FRAME_Y_MAX = 42.25;
const KNOT_EPS = 0.05;
const SYS_EPS = 1e-9;

type Knot = { mark: string; x: number; y: number; sys: number };

const ANCHOR_ID_RE = /^([A-Z0-9]+)_\((-?[\d.]+),(-?[\d.]+)\)_(-?[\d.]+)$/;

function parseKnot(id: unknown): Knot | null {
  if (typeof id !== "string") return null;
  const m = id.match(ANCHOR_ID_RE);
  if (!m) return null;
  const x = Number(m[2]);
  const y = Number(m[3]);
  const sys = Number(m[4]);
  if (![x, y, sys].every(Number.isFinite)) return null;
  return { mark: m[1], x, y, sys };
}

/**
 * Frame rail(s) a knot lies on. Short rails exclude the frame corners so the
 * corner knot (sys 60) belongs only to the long-rail segment of C3.
 */
function knotOnFrameRail(k: Knot, rail: Rail): boolean {
  const inShortSpan = k.y >= -KNOT_EPS && k.y <= RG_H + KNOT_EPS;
  const inLongSpan = k.x >= FRAME_MIN - KNOT_EPS && k.x <= FRAME_X_MAX + KNOT_EPS;
  switch (rail) {
    case "LEFT":
      return Math.abs(k.x - FRAME_MIN) <= KNOT_EPS && inShortSpan;
    case "RIGHT":
      return Math.abs(k.x - FRAME_X_MAX) <= KNOT_EPS && inShortSpan;
    case "BOTTOM":
      return Math.abs(k.y - FRAME_MIN) <= KNOT_EPS && inLongSpan;
    case "TOP":
      return Math.abs(k.y - FRAME_Y_MAX) <= KNOT_EPS && inLongSpan;
  }
}

export function spiderMarkRail(track: SpiderWebTrackId, mark: SpiderMark, value: number): Rail {
  const spec = SPIDER_WEB_TRACKS[track];
  if (mark === "CO") return spec.co;
  if (mark === "C1") return spec.c1;
  return spiderC3Rail(track, value);
}

/** Frame (Fg) mark point, interpolated only between knots on the declared rail. */
export function spiderMarkFramePoint(
  anchorsData: SpiderAnchorsData,
  track: SpiderWebTrackId,
  mark: SpiderMark,
  value: number
): { point: RgPoint; rail: Rail } | null {
  if (!Number.isFinite(value)) return null;
  const rail = spiderMarkRail(track, mark, value);
  const items = anchorsData?.trajectories?.[track]?.anchors ?? [];
  const knots = items
    .map((a) => parseKnot(a?.id))
    .filter((k): k is Knot => !!k && k.mark === mark && knotOnFrameRail(k, rail))
    .sort((a, b) => a.sys - b.sys);
  if (knots.length === 0) return null;
  if (value < knots[0].sys - SYS_EPS || value > knots[knots.length - 1].sys + SYS_EPS) {
    return null;
  }
  if (knots.length === 1) return { point: { x: knots[0].x, y: knots[0].y }, rail };
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[i];
    const b = knots[i + 1];
    if (value >= a.sys - SYS_EPS && value <= b.sys + SYS_EPS) {
      const span = b.sys - a.sys;
      const u = span <= SYS_EPS ? 0 : Math.max(0, Math.min(1, (value - a.sys) / span));
      return { point: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, rail };
    }
  }
  return null;
}

function clampToRail(p: RgPoint, rail: Rail): RgPoint {
  const cx = Math.max(0, Math.min(RG_W, p.x));
  const cy = Math.max(0, Math.min(RG_H, p.y));
  switch (rail) {
    case "LEFT":
      return { x: 0, y: cy };
    case "RIGHT":
      return { x: RG_W, y: cy };
    case "BOTTOM":
      return { x: cx, y: 0 };
    case "TOP":
      return { x: cx, y: RG_H };
  }
}

function lineRailIntersection(p: RgPoint, q: RgPoint, rail: Rail): RgPoint | null {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  if (rail === "LEFT" || rail === "RIGHT") {
    if (Math.abs(dx) < 1e-12) return null;
    const x = rail === "LEFT" ? 0 : RG_W;
    const t = (x - p.x) / dx;
    return { x, y: p.y + dy * t };
  }
  if (Math.abs(dy) < 1e-12) return null;
  const y = rail === "BOTTOM" ? 0 : RG_H;
  const t = (y - p.y) / dy;
  return { x: p.x + dx * t, y };
}

/**
 * C1 → C2 spin correction (deg, CCW positive in Rg y-up).
 * Always the track's own spin (_R = +, _L = −) × tipDeltaDeg[level]; independent of C3.
 * The C3 > 60 reversed branch applies only from C3 → C4 onward (spiderContinuationDeltaDeg).
 */
export function spiderC2SpinDeltaDeg(
  track: SpiderWebTrackId,
  level: number,
  config: SpiderContinuationConfig = SPIDER_CONTINUATION_DEFAULTS
): number {
  const base = config.tipDeltaDeg[Math.max(0, Math.min(4, Math.round(level)))] ?? 0;
  const d = (SPIDER_WEB_TRACKS[track].spin === "R" ? 1 : -1) * base;
  return d === 0 ? 0 : d;
}

/** Bisection stops when the rail interval is below this width (Rg units). */
export const SPIDER_C2_SOLVE_X_TOL = 1e-10;
/** Accepted angular residual |θ(vOut) − θ(vExpected)| at the solution (rad). */
export const SPIDER_C2_SOLVE_ANGLE_TOL = 1e-8;
const SPIDER_C2_MAX_ITER = 200;

export type SpiderC2SolveErrorCode = "C2_DEGENERATE" | "C2_NO_SOLUTION" | "C2_NOT_CONVERGED";

export type SpiderC2SolveResult =
  | { ok: true; point: RgPoint; residualRad: number }
  | { ok: false; code: SpiderC2SolveErrorCode; message: string };

/**
 * Solve C2 = (s, railY) on a TOP / BOTTOM rail with C1 and C3 fixed:
 *   vOut = rotate(specularReflect(vIn), deltaDeg),  vIn = C2 − C1, vOut = C3 − C2.
 * For a horizontal rail the reflection flips the angle, so the condition is
 *   θ(vIn) + θ(vOut) = deltaDeg.
 * With C1 / C3 strictly on the table side of the rail, θ(vIn) and θ(vOut) stay in
 * opposite open half-planes and their sum is strictly monotonic in s → at most one
 * root; bisection on s ∈ [0, 80]. A root outside the rail is an error (no clamp).
 */
export function solveSpiderC2(input: {
  c1: RgPoint;
  c3: RgPoint;
  c2Rail: Rail;
  deltaDeg: number;
  maxIter?: number;
}): SpiderC2SolveResult {
  const { c1, c3, c2Rail } = input;
  const maxIter = input.maxIter ?? SPIDER_C2_MAX_ITER;
  if (c2Rail !== "TOP" && c2Rail !== "BOTTOM") {
    return { ok: false, code: "C2_DEGENERATE", message: "C2는 장쿠션(TOP/BOTTOM) 위에서만 계산합니다." };
  }
  if (![c1.x, c1.y, c3.x, c3.y, input.deltaDeg].every(Number.isFinite)) {
    return { ok: false, code: "C2_DEGENERATE", message: "C1 / C3 / 타점 회전값이 유효한 숫자가 아니어서 C2를 계산할 수 없습니다." };
  }
  const railY = c2Rail === "TOP" ? RG_H : 0;
  const side = c2Rail === "TOP" ? -1 : 1;
  if ((c1.y - railY) * side <= 1e-9 || (c3.y - railY) * side <= 1e-9) {
    return {
      ok: false,
      code: "C2_DEGENERATE",
      message: "C1 또는 C3가 C2 장쿠션 위에 있어 C2 반사점을 계산할 수 없습니다.",
    };
  }
  const delta = (input.deltaDeg * Math.PI) / 180;
  const g = (s: number) =>
    Math.atan2(railY - c1.y, s - c1.x) + Math.atan2(c3.y - railY, c3.x - s) - delta;

  let lo = 0;
  let hi = RG_W;
  let gLo = g(lo);
  const gHi = g(hi);
  if (gLo === 0) return { ok: true, point: { x: lo, y: railY }, residualRad: 0 };
  if (gHi === 0) return { ok: true, point: { x: hi, y: railY }, residualRad: 0 };
  if (Math.sign(gLo) === Math.sign(gHi)) {
    return {
      ok: false,
      code: "C2_NO_SOLUTION",
      message:
        "타점 회전을 반영한 C2 반사점이 장쿠션 범위(0~80) 밖이라 C1과 C3를 연결할 수 없습니다. CO / C1 / 타점을 조정하십시오.",
    };
  }
  for (let i = 0; i < maxIter && hi - lo > SPIDER_C2_SOLVE_X_TOL; i++) {
    const mid = (lo + hi) / 2;
    const gMid = g(mid);
    if (gMid === 0) {
      lo = hi = mid;
      break;
    }
    if (Math.sign(gMid) === Math.sign(gLo)) {
      lo = mid;
      gLo = gMid;
    } else {
      hi = mid;
    }
  }
  const s = (lo + hi) / 2;
  const residualRad = Math.abs(g(s));
  if (hi - lo > SPIDER_C2_SOLVE_X_TOL || !(residualRad <= SPIDER_C2_SOLVE_ANGLE_TOL)) {
    return {
      ok: false,
      code: "C2_NOT_CONVERGED",
      message: "C2 반사점 계산이 수렴하지 않았습니다. 입력값을 확인하십시오.",
    };
  }
  return { ok: true, point: { x: s, y: railY }, residualRad };
}

export type SpiderWebPathErrorCode =
  | "INVALID_TRACK"
  | "INVALID_VALUES"
  | "ANCHOR_MISSING"
  | SpiderC2SolveErrorCode;

export type SpiderWebPath = {
  ok: true;
  track: SpiderWebTrackId;
  values: SpiderSolvedValues;
  hitPoint: SpiderHitPoint;
  c3Branch: SpiderC3Branch;
  /** Fg frame points (label anchors). */
  frame: { CO: RgPoint; C1: RgPoint; C3: RgPoint };
  rails: { CO: Rail; C1: Rail; C2: Rail; C3: Rail };
  /** C1 → C2 spin correction applied at C2 (deg, track spin only). */
  c2DeltaDeg: number;
  /** Rg path nodes [CO, C1, C2, C3, C4, C5, C6]. */
  pathNodes: (RgPoint | null)[];
  continuation: (SpiderContinuationNode | null)[];
};

export type SpiderWebPathResult =
  | SpiderWebPath
  | { ok: false; code: SpiderWebPathErrorCode; message: string };

export function buildSpiderWebPath(input: {
  track: unknown;
  inputs: Record<string, unknown> | null | undefined;
  anchorsData: SpiderAnchorsData;
  vertices?: SpiderContinuationVertices | null;
  config?: SpiderContinuationConfig;
}): SpiderWebPathResult {
  if (!isSpiderWebTrack(input.track)) {
    return { ok: false, code: "INVALID_TRACK", message: "거미줄 트랙이 아닙니다." };
  }
  const track = input.track;
  const values = spiderValuesFromStoredInputs(track, input.inputs);
  if (!values) {
    return { ok: false, code: "INVALID_VALUES", message: "거미줄 SYS 값(CO/C1/C3/타점)이 유효하지 않습니다." };
  }
  const hp = spiderHitPointFromSelection(track, values.HP_sel);
  if (!hp.ok) {
    return { ok: false, code: "INVALID_VALUES", message: hp.message };
  }

  const co = spiderMarkFramePoint(input.anchorsData, track, "CO", values.CO_f);
  const c1 = spiderMarkFramePoint(input.anchorsData, track, "C1", values.C1_f);
  const c3 = spiderMarkFramePoint(input.anchorsData, track, "C3", values.C3_f);
  if (!co || !c1 || !c3) {
    return { ok: false, code: "ANCHOR_MISSING", message: "거미줄 앵커에서 CO/C1/C3 좌표를 찾을 수 없습니다." };
  }

  const spec = SPIDER_WEB_TRACKS[track];
  const coLine = lineRailIntersection(co.point, c1.point, spec.co);
  const c1Line = lineRailIntersection(co.point, c1.point, spec.c1);
  const coRail = clampToRail(coLine ?? co.point, spec.co);
  const c1Rail = clampToRail(c1Line ?? c1.point, spec.c1);
  const c3Rail = clampToRail(c3.point, c3.rail);

  // C3 stays fixed; C2 absorbs the C1 → C2 spin correction (track spin, not the C3 > 60 branch).
  const c2DeltaDeg = spiderC2SpinDeltaDeg(track, hp.hitPoint.level, input.config);
  const c2Solve = solveSpiderC2({ c1: c1Rail, c3: c3Rail, c2Rail: spec.c2, deltaDeg: c2DeltaDeg });
  if (!c2Solve.ok) {
    return { ok: false, code: c2Solve.code, message: c2Solve.message };
  }
  const c2 = c2Solve.point;

  const continuation = computeSpiderContinuation({
    track,
    c3Value: values.C3_f,
    level: hp.hitPoint.level,
    c2,
    c3: c3Rail,
    c3Rail: c3.rail,
    vertices: input.vertices,
    config: input.config,
  });

  return {
    ok: true,
    track,
    values,
    hitPoint: hp.hitPoint,
    c3Branch: spiderC3Branch(values.C3_f),
    frame: { CO: co.point, C1: c1.point, C3: c3.point },
    rails: { CO: spec.co, C1: spec.c1, C2: spec.c2, C3: c3.rail },
    c2DeltaDeg,
    pathNodes: [
      coRail,
      c1Rail,
      c2,
      c3Rail,
      continuation[0]?.point ?? null,
      continuation[1]?.point ?? null,
      continuation[2]?.point ?? null,
    ],
    continuation,
  };
}
