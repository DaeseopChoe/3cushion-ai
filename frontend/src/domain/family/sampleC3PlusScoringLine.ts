/**
 * sampleC3PlusScoringLine.ts
 * Phase 3A-359F — Hybrid sampling on the C3+ scoring line.
 *
 * Reuses Cue→Impact spacing/min-count guards.
 * Does NOT reuse VALID_FRACTION = 0.30.
 * SB closest-point is NOT a mandatory sample.
 */

import {
  CUE_IMPACT_MAX_SAMPLE_SPACING,
  CUE_IMPACT_MIN_SAMPLE_COUNT,
} from "./generateCueImpactDerivedMembers";
import {
  C3_PLUS_NEAR_ZERO_SEGMENT_EPS,
  type C3PlusPathNode,
  type C3PlusPoint,
} from "./c3PlusScoringPath";

export const C3_PLUS_MAX_SAMPLE_SPACING = CUE_IMPACT_MAX_SAMPLE_SPACING;
export const C3_PLUS_MIN_SAMPLE_COUNT = CUE_IMPACT_MIN_SAMPLE_COUNT;

const STEP_FORMAT_DIGITS = 6;

export type C3PlusSample = {
  point: C3PlusPoint;
  /** Deterministic derivedStep key */
  derivedStep: string;
  kind: "vertex" | "interior";
  nodeId?: string;
  segmentIndex?: number;
  t?: number;
};

export type SampleC3PlusScoringLineResult =
  | { ok: true; samples: C3PlusSample[] }
  | { ok: false; code: string; reason: string };

function dist(a: C3PlusPoint, b: C3PlusPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerp(a: C3PlusPoint, b: C3PlusPoint, t: number): C3PlusPoint {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
}

function nearlyEqual(
  a: C3PlusPoint,
  b: C3PlusPoint,
  eps = C3_PLUS_NEAR_ZERO_SEGMENT_EPS
): boolean {
  return dist(a, b) <= eps;
}

export function encodeC3PlusVertexDerivedStep(nodeId: string): string {
  return `c3plus:v:${nodeId}`;
}

export function encodeC3PlusInteriorDerivedStep(
  segmentIndex: number,
  t: number
): string {
  if (!Number.isFinite(t)) return `c3plus:seg:${segmentIndex}:t:invalid`;
  return `c3plus:seg:${segmentIndex}:t:${t.toFixed(STEP_FORMAT_DIGITS)}`;
}

/** Short HUD / marker label for a C3+ derivedStep. */
export function parseC3PlusDerivedStepLabel(derivedStep: string | undefined): string {
  if (!derivedStep) return "";
  const vertex = /^c3plus:v:(.+)$/.exec(derivedStep.trim());
  if (vertex) return vertex[1]!;
  const seg = /^c3plus:seg:(\d+):t:(-?\d+(?:\.\d+)?)$/.exec(derivedStep.trim());
  if (seg) return `s${seg[1]}@${Number(seg[2]).toFixed(2)}`;
  return derivedStep;
}

/**
 * Hybrid: keep all scoring-line vertices; densify long segments (spacing ≤ 3).
 * Ensure at least MIN_SAMPLE_COUNT samples when line length allows.
 */
export function sampleC3PlusScoringLine(
  scoringLine: C3PlusPathNode[]
): SampleC3PlusScoringLineResult {
  if (!Array.isArray(scoringLine) || scoringLine.length < 2) {
    return {
      ok: false,
      code: "SCORING_LINE_TOO_SHORT",
      reason: "scoring line requires at least two nodes",
    };
  }

  const samples: C3PlusSample[] = [];

  const pushVertex = (node: C3PlusPathNode) => {
    const last = samples[samples.length - 1];
    if (last && nearlyEqual(last.point, node.point)) return;
    samples.push({
      point: { x: node.point.x, y: node.point.y },
      derivedStep: encodeC3PlusVertexDerivedStep(node.id),
      kind: "vertex",
      nodeId: node.id,
    });
  };

  pushVertex(scoringLine[0]!);

  for (let i = 0; i < scoringLine.length - 1; i += 1) {
    const a = scoringLine[i]!;
    const b = scoringLine[i + 1]!;
    const L = dist(a.point, b.point);
    if (L <= C3_PLUS_NEAR_ZERO_SEGMENT_EPS) {
      continue;
    }

    let nGaps = Math.max(1, Math.ceil(L / C3_PLUS_MAX_SAMPLE_SPACING));
    for (let k = 1; k < nGaps; k += 1) {
      const t = k / nGaps;
      const point = lerp(a.point, b.point, t);
      const last = samples[samples.length - 1];
      if (last && nearlyEqual(last.point, point)) continue;
      if (nearlyEqual(point, b.point)) continue;
      samples.push({
        point,
        derivedStep: encodeC3PlusInteriorDerivedStep(i, t),
        kind: "interior",
        segmentIndex: i,
        t,
      });
    }
    pushVertex(b);
  }

  // Densify until MIN_SAMPLE_COUNT when the polyline is long enough.
  const totalLen = scoringLine.reduce((acc, node, idx) => {
    if (idx === 0) return 0;
    return acc + dist(scoringLine[idx - 1]!.point, node.point);
  }, 0);

  if (
    samples.length < C3_PLUS_MIN_SAMPLE_COUNT &&
    totalLen > C3_PLUS_NEAR_ZERO_SEGMENT_EPS
  ) {
    densifyToMinCount(samples, scoringLine);
  }

  if (samples.length === 0) {
    return {
      ok: false,
      code: "NO_SAMPLES",
      reason: "hybrid sampling produced no Cue samples",
    };
  }

  // Deduplicate derivedStep collisions (should not happen)
  const seen = new Set<string>();
  for (const s of samples) {
    if (seen.has(s.derivedStep)) {
      return {
        ok: false,
        code: "DUPLICATE_STEP",
        reason: `duplicate derivedStep ${s.derivedStep}`,
      };
    }
    seen.add(s.derivedStep);
  }

  return { ok: true, samples };
}

function densifyToMinCount(
  samples: C3PlusSample[],
  scoringLine: C3PlusPathNode[]
): void {
  const maxIter = 64;
  for (let iter = 0; iter < maxIter && samples.length < C3_PLUS_MIN_SAMPLE_COUNT; iter += 1) {
    let bestI = -1;
    let bestGap = 0;
    for (let i = 0; i < samples.length - 1; i += 1) {
      const g = dist(samples[i]!.point, samples[i + 1]!.point);
      if (g > bestGap) {
        bestGap = g;
        bestI = i;
      }
    }
    if (bestI < 0 || bestGap <= C3_PLUS_NEAR_ZERO_SEGMENT_EPS * 2) break;

    const a = samples[bestI]!;
    const b = samples[bestI + 1]!;
    const mid = lerp(a.point, b.point, 0.5);
    // Find owning segment index for step key
    let segIdx = 0;
    for (let s = 0; s < scoringLine.length - 1; s += 1) {
      const A = scoringLine[s]!.point;
      const B = scoringLine[s + 1]!.point;
      const ab = dist(A, B);
      if (ab <= C3_PLUS_NEAR_ZERO_SEGMENT_EPS) continue;
      const t =
        ((mid.x - A.x) * (B.x - A.x) + (mid.y - A.y) * (B.y - A.y)) / (ab * ab);
      if (t >= -1e-6 && t <= 1 + 1e-6) {
        const proj = lerp(A, B, Math.max(0, Math.min(1, t)));
        if (nearlyEqual(proj, mid, 1e-4)) {
          segIdx = s;
          break;
        }
      }
    }
    samples.splice(bestI + 1, 0, {
      point: mid,
      derivedStep: encodeC3PlusInteriorDerivedStep(segIdx, 0.5 + iter * 1e-6),
      kind: "interior",
      segmentIndex: segIdx,
      t: 0.5,
    });
  }
}
