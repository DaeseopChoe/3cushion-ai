/**
 * c3PlusScoringPath.ts
 * Phase 3A-359F — Assemble variable-length C3+ candidate / scoring line.
 *
 * Candidate: C3 → … → Origin(system tail) → EXT1? → EXT2?
 * Scoring line: truncate after first Second-Ball hit segment (full segment to endpoint).
 * Display Cap is not used.
 */

import { isSegmentHitBall } from "../../utils/geometry";
import { PATH_NODE_MARKS } from "../trajectoryPathDisplayPolicy";
import {
  resolveOrigin,
  type ResolvedOrigin,
} from "../trajectoryExtension/origin";
import type {
  RgPoint,
  TrajectoryExtensionPayload,
} from "../trajectoryExtension/model";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";

export const C3_PLUS_PATH_INDEX_C3 = 3;
export const C3_PLUS_NEAR_ZERO_SEGMENT_EPS = 1e-9;

export type C3PlusPoint = { x: number; y: number };

export type C3PlusNodeKind = "system" | "ext1" | "ext2";

export type C3PlusPathNode = {
  /** Stable id: C3…C6 | EXT1 | EXT2 */
  id: string;
  kind: C3PlusNodeKind;
  point: C3PlusPoint;
  /** pathNodes index when kind=system */
  systemIndex?: number;
};

export type C3PlusSegment = {
  index: number;
  from: C3PlusPathNode;
  to: C3PlusPathNode;
};

export type AssembleC3PlusCandidateResult =
  | {
      ok: true;
      origin: ResolvedOrigin;
      nodes: C3PlusPathNode[];
      segments: C3PlusSegment[];
    }
  | { ok: false; code: string; reason: string };

export type ResolveC3PlusScoringLineResult =
  | {
      ok: true;
      candidate: C3PlusPathNode[];
      scoringLine: C3PlusPathNode[];
      hitSegment: C3PlusSegment;
      hitSegmentIndex: number;
    }
  | { ok: false; code: string; reason: string };

function isFinitePoint(p: C3PlusPoint | null | undefined): p is C3PlusPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function clonePoint(p: C3PlusPoint): C3PlusPoint {
  return { x: p.x, y: p.y };
}

function nearlyEqual(a: C3PlusPoint, b: C3PlusPoint, eps = C3_PLUS_NEAR_ZERO_SEGMENT_EPS): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}

function systemMarkId(index: number): string {
  return PATH_NODE_MARKS[index] ?? `SYS${index}`;
}

/**
 * Build ordered candidate path nodes from corrected pathNodes + extension payload.
 * Origin = min(chainBreak, sameRail) — not Display Cap / not forced C6.
 */
export function assembleC3PlusCandidatePath(args: {
  pathNodes: ReadonlyArray<RgPoint | null | undefined>;
  extensions?: TrajectoryExtensionPayload | null;
}): AssembleC3PlusCandidateResult {
  const { pathNodes, extensions } = args;
  if (!Array.isArray(pathNodes) || pathNodes.length === 0) {
    return { ok: false, code: "MISSING_PATH", reason: "pathNodes required" };
  }

  const c3 = pathNodes[C3_PLUS_PATH_INDEX_C3];
  if (!isFinitePoint(c3)) {
    return { ok: false, code: "MISSING_C3", reason: "C3 path node missing or invalid" };
  }

  const originRef = extensions?.origin ?? {
    kind: "path_node" as const,
    source: "corrected" as const,
  };
  const origin = resolveOrigin(pathNodes, originRef);
  if (origin == null || !isFinitePoint(origin.point)) {
    return {
      ok: false,
      code: "ORIGIN_UNRESOLVED",
      reason: "Extension Origin could not be resolved from pathNodes",
    };
  }
  if (origin.index < C3_PLUS_PATH_INDEX_C3) {
    return {
      ok: false,
      code: "ORIGIN_BEFORE_C3",
      reason: `Origin index ${origin.index} is before C3`,
    };
  }

  const nodes: C3PlusPathNode[] = [];
  for (let i = C3_PLUS_PATH_INDEX_C3; i <= origin.index; i += 1) {
    const p = pathNodes[i];
    if (!isFinitePoint(p)) {
      return {
        ok: false,
        code: "BROKEN_SYSTEM_PATH",
        reason: `system path node ${systemMarkId(i)} missing between C3 and Origin`,
      };
    }
    const prev = nodes[nodes.length - 1];
    if (prev && nearlyEqual(prev.point, p)) {
      continue;
    }
    nodes.push({
      id: systemMarkId(i),
      kind: "system",
      point: clonePoint(p),
      systemIndex: i,
    });
  }

  if (nodes.length === 0) {
    return { ok: false, code: "EMPTY_SYSTEM_TAIL", reason: "no system nodes on candidate path" };
  }

  const items = Array.isArray(extensions?.items) ? [...extensions!.items] : [];
  items.sort((a, b) => a.index - b.index);

  const e1 = items.find((it) => it.index === 1);
  if (e1) {
    if (!isFinitePoint(e1.endpoint)) {
      return { ok: false, code: "INVALID_E1", reason: "Extension1 endpoint invalid" };
    }
    const prev = nodes[nodes.length - 1]!;
    if (!nearlyEqual(prev.point, e1.endpoint)) {
      nodes.push({
        id: "EXT1",
        kind: "ext1",
        point: clonePoint(e1.endpoint),
      });
    }
  }

  const e2 = items.find((it) => it.index === 2);
  if (e2) {
    if (!e1) {
      return {
        ok: false,
        code: "E2_WITHOUT_E1",
        reason: "Extension2 present without Extension1",
      };
    }
    if (!isFinitePoint(e2.endpoint)) {
      return { ok: false, code: "INVALID_E2", reason: "Extension2 endpoint invalid" };
    }
    const prev = nodes[nodes.length - 1]!;
    if (!nearlyEqual(prev.point, e2.endpoint)) {
      nodes.push({
        id: "EXT2",
        kind: "ext2",
        point: clonePoint(e2.endpoint),
      });
    }
  }

  const segments = buildSegments(nodes);
  if (segments.length === 0) {
    return {
      ok: false,
      code: "NO_SEGMENTS",
      reason: "candidate path has no positive-length segments",
    };
  }

  return { ok: true, origin, nodes, segments };
}

function buildSegments(nodes: C3PlusPathNode[]): C3PlusSegment[] {
  const segments: C3PlusSegment[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const from = nodes[i]!;
    const to = nodes[i + 1]!;
    if (nearlyEqual(from.point, to.point)) continue;
    segments.push({ index: segments.length, from, to });
  }
  return segments;
}

/**
 * First Second-Ball hit segment defines the last scoring segment.
 * Scoring line includes the full segment through its endpoint (not SB center).
 */
export function resolveC3PlusScoringLine(args: {
  pathNodes: ReadonlyArray<RgPoint | null | undefined>;
  extensions?: TrajectoryExtensionPayload | null;
  secondBall: C3PlusPoint | null | undefined;
  hitTolerance?: number;
}): ResolveC3PlusScoringLineResult {
  const assembled = assembleC3PlusCandidatePath({
    pathNodes: args.pathNodes,
    extensions: args.extensions,
  });
  if (!assembled.ok) {
    return { ok: false, code: assembled.code, reason: assembled.reason };
  }

  if (!isFinitePoint(args.secondBall)) {
    return {
      ok: false,
      code: "MISSING_SECOND_BALL",
      reason: "Second Ball center required for C3+ scoring derived",
    };
  }

  const tolerance =
    args.hitTolerance ?? resolveTrajectoryHitTolerance();

  let hit: C3PlusSegment | null = null;
  for (const segment of assembled.segments) {
    if (
      isSegmentHitBall(
        segment.from.point,
        segment.to.point,
        args.secondBall,
        tolerance
      )
    ) {
      hit = segment;
      break;
    }
  }

  if (!hit) {
    return {
      ok: false,
      code: "NO_SB_HIT",
      reason: "no Second Ball hit on C3+ candidate path",
    };
  }

  const endId = hit.to.id;
  const endIndex = assembled.nodes.findIndex((n) => n.id === endId);
  if (endIndex < 0) {
    return {
      ok: false,
      code: "SCORING_ENDPOINT_INVALID",
      reason: "scoring segment endpoint not found on candidate path",
    };
  }

  const scoringLine = assembled.nodes.slice(0, endIndex + 1);
  if (scoringLine.length < 2) {
    return {
      ok: false,
      code: "SCORING_LINE_TOO_SHORT",
      reason: "scoring line must contain at least one segment",
    };
  }

  return {
    ok: true,
    candidate: assembled.nodes,
    scoringLine,
    hitSegment: hit,
    hitSegmentIndex: hit.index,
  };
}
