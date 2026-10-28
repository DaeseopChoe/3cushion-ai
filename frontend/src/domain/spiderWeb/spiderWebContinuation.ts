/**
 * Spider Web (거미줄) — expected continuation C3 → C4 → C5 → C6 (SSOT §5).
 *
 * Spider-only. Global reflection (reflectionEngine) and 5&Half are not touched.
 * Each vertex: specular reflection of the incoming direction, then a signed rotation
 *   δ_k = branchSign × spinSign × tipDeltaDeg[level] × decay[k]
 * (CCW positive in Rg, y-up). branchSign = −1 when C3 > 60 (reversed spin direction).
 */

import type { Rail } from "../reflectionEngine";
import {
  normalizeReflectionOverride,
  railPointFromT,
  type ReflectionOverride,
  type RgPoint,
} from "../trajectory/c2ReflectionOverride";
import {
  SPIDER_WEB_TRACKS,
  spiderC3Branch,
  type SpiderWebTrackId,
} from "./spiderWebTracks";

export const SPIDER_CONTINUATION_RULE_VERSION = 1;

export const SPIDER_CONTINUATION_MARKS = ["C4", "C5", "C6"] as const;
export type SpiderContinuationMark = (typeof SPIDER_CONTINUATION_MARKS)[number];

export type SpiderContinuationConfig = {
  /** Rotation (deg) per tip level 0..4 before decay. */
  tipDeltaDeg: readonly number[];
  /** Decay per continuation step [C4, C5, C6]. */
  decay: readonly number[];
};

/** Adjustable spider-only defaults (tip table matches the engine's TIP_TO_DELTA_DEG). */
export const SPIDER_CONTINUATION_DEFAULTS: SpiderContinuationConfig = Object.freeze({
  tipDeltaDeg: Object.freeze([0, 5, 10, 13, 18]),
  decay: Object.freeze([1.0, 0.8, 0.7]),
});

export type SpiderContinuationVertices = Partial<
  Record<SpiderContinuationMark, ReflectionOverride>
>;

/** StrategyEntry.spiderContinuation — separate from system_values / trajectoryExtensions. */
export type SpiderContinuationPayload = {
  ruleVersion: number;
  signature: string;
  vertices: SpiderContinuationVertices;
};

export type SpiderContinuationNode = {
  mark: SpiderContinuationMark;
  point: RgPoint;
  rail: Rail;
  overridden: boolean;
  deltaDeg: number;
};

const RG_W = 80;
const RG_H = 40;
const ON_RAIL_EPS = 1e-6;
const MIN_INWARD_DEG = 2;

function fmt(n: number): string {
  return String(Number(n.toFixed(6)));
}

/** Input fingerprint; any SYS / track / tip change yields a different signature. */
export function spiderContinuationSignature(input: {
  track: string;
  CO_f: number;
  C1_f: number;
  C3_f: number;
  HP_sel: number;
}): string {
  return [input.track, fmt(input.CO_f), fmt(input.C1_f), fmt(input.C3_f), fmt(input.HP_sel)].join("|");
}

export function normalizeSpiderContinuationVertices(raw: unknown): SpiderContinuationVertices {
  const out: SpiderContinuationVertices = {};
  if (!raw || typeof raw !== "object") return out;
  for (const mark of SPIDER_CONTINUATION_MARKS) {
    const ov = normalizeReflectionOverride((raw as Record<string, unknown>)[mark]);
    if (ov) out[mark] = ov;
  }
  return out;
}

export function normalizeSpiderContinuation(raw: unknown): SpiderContinuationPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.signature !== "string" || !r.signature) return null;
  const ruleVersion = Number(r.ruleVersion);
  if (!Number.isInteger(ruleVersion)) return null;
  const vertices = normalizeSpiderContinuationVertices(r.vertices);
  if (Object.keys(vertices).length === 0) return null;
  return { ruleVersion, signature: r.signature, vertices };
}

/** Stored edits apply only to the exact inputs + rule version they were made for. */
export function resolveSpiderContinuationVertices(
  payload: unknown,
  signature: string | null
): SpiderContinuationVertices {
  const p = normalizeSpiderContinuation(payload);
  if (!p || !signature) return {};
  if (p.ruleVersion !== SPIDER_CONTINUATION_RULE_VERSION) return {};
  if (p.signature !== signature) return {};
  return p.vertices;
}

export function buildSpiderContinuationPayload(
  signature: string | null,
  vertices: SpiderContinuationVertices | null | undefined
): SpiderContinuationPayload | null {
  if (!signature) return null;
  const v = normalizeSpiderContinuationVertices(vertices);
  if (Object.keys(v).length === 0) return null;
  return { ruleVersion: SPIDER_CONTINUATION_RULE_VERSION, signature, vertices: v };
}

/**
 * Moving Ck fixes Ck and drops every later override so it is recomputed:
 * C4 → C5/C6 recompute · C5 → C6 recompute · C6 → only C6.
 */
export function applySpiderVertexEdit(
  vertices: SpiderContinuationVertices | null | undefined,
  mark: SpiderContinuationMark,
  override: ReflectionOverride | null
): SpiderContinuationVertices {
  const idx = SPIDER_CONTINUATION_MARKS.indexOf(mark);
  const out: SpiderContinuationVertices = {};
  const prev = normalizeSpiderContinuationVertices(vertices);
  SPIDER_CONTINUATION_MARKS.forEach((m, i) => {
    if (i < idx && prev[m]) out[m] = prev[m];
  });
  const ov = normalizeReflectionOverride(override);
  if (ov) out[mark] = ov;
  return out;
}

export function spiderContinuationDeltaDeg(input: {
  track: SpiderWebTrackId;
  c3: number;
  level: number;
  stepIndex: number;
  config?: SpiderContinuationConfig;
}): number {
  const cfg = input.config ?? SPIDER_CONTINUATION_DEFAULTS;
  const base = cfg.tipDeltaDeg[Math.max(0, Math.min(4, Math.round(input.level)))] ?? 0;
  const decay = cfg.decay[input.stepIndex] ?? 0;
  const spinSign = SPIDER_WEB_TRACKS[input.track].spin === "R" ? 1 : -1;
  const branchSign = spiderC3Branch(input.c3) === "long" ? -1 : 1;
  const d = branchSign * spinSign * base * decay;
  return d === 0 ? 0 : d;
}

function inwardNormal(rail: Rail): RgPoint {
  switch (rail) {
    case "LEFT":
      return { x: 1, y: 0 };
    case "RIGHT":
      return { x: -1, y: 0 };
    case "BOTTOM":
      return { x: 0, y: 1 };
    case "TOP":
      return { x: 0, y: -1 };
  }
}

function rotate(v: RgPoint, deg: number): RgPoint {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function normalize(v: RgPoint): RgPoint | null {
  const len = Math.hypot(v.x, v.y);
  return len > 1e-12 ? { x: v.x / len, y: v.y / len } : null;
}

function railsContaining(p: RgPoint): Rail[] {
  const out: Rail[] = [];
  if (Math.abs(p.x) <= ON_RAIL_EPS) out.push("LEFT");
  if (Math.abs(p.x - RG_W) <= ON_RAIL_EPS) out.push("RIGHT");
  if (Math.abs(p.y) <= ON_RAIL_EPS) out.push("BOTTOM");
  if (Math.abs(p.y - RG_H) <= ON_RAIL_EPS) out.push("TOP");
  return out;
}

/** Specular reflection on `rail`, rotated by `deltaDeg`, kept pointing into the table. */
export function spiderOutgoingDirection(
  incoming: RgPoint,
  rail: Rail,
  deltaDeg: number
): RgPoint | null {
  const d = normalize(incoming);
  if (!d) return null;
  const spec = rail === "LEFT" || rail === "RIGHT" ? { x: -d.x, y: d.y } : { x: d.x, y: -d.y };
  let out = rotate(spec, deltaDeg);
  const n = inwardNormal(rail);
  const dn = out.x * n.x + out.y * n.y;
  const minSin = Math.sin((MIN_INWARD_DEG * Math.PI) / 180);
  if (dn < minSin) {
    const t = normalize({ x: out.x - dn * n.x, y: out.y - dn * n.y }) ?? { x: n.y, y: -n.x };
    const a = (MIN_INWARD_DEG * Math.PI) / 180;
    out = { x: t.x * Math.cos(a) + n.x * Math.sin(a), y: t.y * Math.cos(a) + n.y * Math.sin(a) };
  }
  return out;
}

/** First rail hit from `origin` along `dir`, ignoring rails the origin lies on. */
export function spiderNextRailHit(
  origin: RgPoint,
  dir: RgPoint
): { point: RgPoint; rail: Rail } | null {
  const skip = new Set(railsContaining(origin));
  let best: { point: RgPoint; rail: Rail; t: number } | null = null;
  const consider = (rail: Rail, t: number) => {
    if (!(t > 1e-9) || skip.has(rail)) return;
    const p = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
    if (p.x < -ON_RAIL_EPS || p.x > RG_W + ON_RAIL_EPS) return;
    if (p.y < -ON_RAIL_EPS || p.y > RG_H + ON_RAIL_EPS) return;
    if (!best || t < best.t) best = { point: p, rail, t };
  };
  if (dir.x < -1e-12) consider("LEFT", (0 - origin.x) / dir.x);
  if (dir.x > 1e-12) consider("RIGHT", (RG_W - origin.x) / dir.x);
  if (dir.y < -1e-12) consider("BOTTOM", (0 - origin.y) / dir.y);
  if (dir.y > 1e-12) consider("TOP", (RG_H - origin.y) / dir.y);
  if (!best) return null;
  const b = best as { point: RgPoint; rail: Rail };
  const point = {
    x: Math.max(0, Math.min(RG_W, b.point.x)),
    y: Math.max(0, Math.min(RG_H, b.point.y)),
  };
  if (b.rail === "LEFT") point.x = 0;
  if (b.rail === "RIGHT") point.x = RG_W;
  if (b.rail === "BOTTOM") point.y = 0;
  if (b.rail === "TOP") point.y = RG_H;
  return { point, rail: b.rail };
}

/**
 * C4..C6 from (C2 → C3). Overridden vertices are fixed on their rail; later
 * vertices are recomputed from the (possibly moved) previous segment.
 */
export function computeSpiderContinuation(input: {
  track: SpiderWebTrackId;
  c3Value: number;
  level: number;
  c2: RgPoint;
  c3: RgPoint;
  c3Rail: Rail;
  vertices?: SpiderContinuationVertices | null;
  config?: SpiderContinuationConfig;
}): (SpiderContinuationNode | null)[] {
  const vertices = normalizeSpiderContinuationVertices(input.vertices);
  const nodes: (SpiderContinuationNode | null)[] = [null, null, null];
  let prev = input.c2;
  let cur = input.c3;
  let curRail = input.c3Rail;
  for (let i = 0; i < SPIDER_CONTINUATION_MARKS.length; i++) {
    const mark = SPIDER_CONTINUATION_MARKS[i];
    const deltaDeg = spiderContinuationDeltaDeg({
      track: input.track,
      c3: input.c3Value,
      level: input.level,
      stepIndex: i,
      config: input.config,
    });
    const ov = vertices[mark];
    let next: { point: RgPoint; rail: Rail } | null;
    if (ov) {
      next = { point: railPointFromT(ov.rail, ov.t), rail: ov.rail };
    } else {
      const dir = spiderOutgoingDirection({ x: cur.x - prev.x, y: cur.y - prev.y }, curRail, deltaDeg);
      next = dir ? spiderNextRailHit(cur, dir) : null;
    }
    if (!next) break;
    nodes[i] = { mark, point: next.point, rail: next.rail, overridden: !!ov, deltaDeg };
    prev = cur;
    cur = next.point;
    curRail = next.rail;
  }
  return nodes;
}
