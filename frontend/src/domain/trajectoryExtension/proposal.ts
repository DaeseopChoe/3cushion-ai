/**
 * proposal.ts
 * Trajectory Extension — Default Proposal geometry (P2).
 *
 * Source of truth: TRAJECTORY_EXTENSION_SSOT.md §4 · §5 (v1.2)
 *
 * Reflection Table = standard Default Proposal only (NOT Reverse Spin physics).
 * Final Reverse End is admin Handle Drag (later phase).
 *
 * Does not modify trajectoryBuilder / reflectionPolicy / Display Cap logic.
 * Uses read-only exports: detectRail, angleDeg, directionFromAngleDeg,
 * intersectRayWithRail, Origin Resolver, Reflection Table lookup.
 */

import {
  angleDeg,
  detectRail,
  directionFromAngleDeg,
  intersectRayWithRail,
  type Rail,
} from "../reflectionEngine";
import {
  canCreateExtensionFromOrigin,
  resolveOrigin,
  type ResolvedOrigin,
} from "./origin";
import {
  EXTENSION2_DEFAULT_LENGTH_RG,
  MAX_TRAJECTORY_EXTENSIONS,
  type RgPoint,
  type TrajectoryExtension,
  type TrajectoryExtensionChainSegment,
  type TrajectoryExtensionId,
  type TrajectoryExtensionOrigin,
  type TrajectoryExtensionPayload,
} from "./model";
import { lookupReflectionAngle } from "./reflectionTable";

const RAY_MIN_DIST_RG = 0.5;
const ALL_RAILS: Rail[] = ["TOP", "BOTTOM", "LEFT", "RIGHT"];

/** Runtime-only draft (not Dataset). P2: Proposal display state. */
export type TrajectoryExtensionDraft = {
  origin: TrajectoryExtensionOrigin;
  items: TrajectoryExtension[];
};

export type Extension1ProposalResult = {
  origin: ResolvedOrigin;
  item: TrajectoryExtension;
  segment: TrajectoryExtensionChainSegment;
};

export type Extension2ProposalResult = {
  item: TrajectoryExtension;
  segment: TrajectoryExtensionChainSegment;
};

function isValidPoint(p: RgPoint | null | undefined): p is RgPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function normalizeDeg(deg: number): number {
  let x = deg % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
}

/** Rail inward-normal angle (deg) — local copy; does not call private reflectionEngine helpers. */
function railNormalDeg(rail: Rail): number {
  switch (rail) {
    case "TOP":
      return 90;
    case "BOTTOM":
      return -90;
    case "LEFT":
      return 180;
    case "RIGHT":
      return 0;
    default:
      return 0;
  }
}

/**
 * Standard Proposal outgoing travel angle (absolute deg) via Reflection Table.
 * Identity table ⇒ optical mirror heading (+180 for leaving-cushion ray).
 */
export function proposeOutgoingTravelDeg(
  thetaInAbsDeg: number,
  rail: Rail
): number {
  const n = railNormalDeg(rail);
  const delta = Math.abs(normalizeDeg(thetaInAbsDeg - n));
  const incidentDeg = Math.min(delta, 180 - delta);
  const { reflectDeg } = lookupReflectionAngle(incidentDeg);

  const opticalAbs = 2 * n - thetaInAbsDeg;
  const opticalDelta = normalizeDeg(opticalAbs - n);
  const sign = opticalDelta >= 0 ? 1 : -1;
  const proposedHeading = n + sign * reflectDeg;
  // Ray leaves the cushion (same convention as C2 +180 travel flip)
  return proposedHeading + 180;
}

function pointDistance(a: RgPoint, b: RgPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Next cushion hit along travel ray (excluding current rail). */
export function findNextCushionHit(
  origin: RgPoint,
  travelDeg: number,
  currentRail: Rail | null
): RgPoint | null {
  let best: RgPoint | null = null;
  let bestDist = Infinity;
  for (const rail of ALL_RAILS) {
    if (currentRail != null && rail === currentRail) continue;
    const hit = intersectRayWithRail(origin, travelDeg, rail);
    if (!hit) continue;
    const d = pointDistance(origin, hit);
    if (d < RAY_MIN_DIST_RG) continue;
    if (d < bestDist) {
      bestDist = d;
      best = hit;
    }
  }
  return best;
}

export function createTrajectoryExtensionId(
  slotId: string,
  extensionIndex: 1 | 2
): TrajectoryExtensionId {
  const slot = slotId && typeof slotId === "string" ? slotId : "S1";
  return `EXT-${slot}-${String(extensionIndex).padStart(2, "0")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Extension1 Default Proposal: Origin → Reflection Table → next cushion.
 */
export function proposeExtension1(args: {
  pathNodes: ReadonlyArray<RgPoint | null | undefined>;
  slotId: string;
  originSource?: "corrected" | "baseline";
}): Extension1ProposalResult | null {
  const reference: TrajectoryExtensionOrigin = {
    kind: "path_node",
    source: args.originSource ?? "corrected",
  };
  const origin = resolveOrigin(args.pathNodes, reference);
  if (!canCreateExtensionFromOrigin(origin) || origin == null) {
    return null;
  }

  const prev = args.pathNodes[origin.index - 1];
  if (!isValidPoint(prev)) {
    return null;
  }

  const rail = detectRail(origin.point);
  if (rail == null) {
    return null;
  }

  const thetaIn = angleDeg(prev, origin.point);
  const travelDeg = proposeOutgoingTravelDeg(thetaIn, rail);
  const endpoint = findNextCushionHit(origin.point, travelDeg, rail);
  if (!endpoint) {
    return null;
  }

  const ts = nowIso();
  const item: TrajectoryExtension = {
    id: createTrajectoryExtensionId(args.slotId, 1),
    index: 1,
    endpoint: { x: endpoint.x, y: endpoint.y },
    userEdited: false,
    createdAt: ts,
    updatedAt: ts,
  };

  return {
    origin,
    item,
    segment: {
      id: item.id,
      index: 1,
      start: { x: origin.point.x, y: origin.point.y },
      end: { x: endpoint.x, y: endpoint.y },
    },
  };
}

/**
 * Extension2 Default Proposal: E1 end → Reflection Table → ~20 Rg (not to cushion).
 */
export function proposeExtension2(args: {
  extension1Start: RgPoint;
  extension1End: RgPoint;
  slotId: string;
}): Extension2ProposalResult | null {
  const start = args.extension1End;
  if (!isValidPoint(start) || !isValidPoint(args.extension1Start)) {
    return null;
  }
  if (pointDistance(args.extension1Start, start) < 1e-9) {
    return null;
  }

  const rail = detectRail(start);
  const thetaIn = angleDeg(args.extension1Start, start);
  let travelDeg: number;
  if (rail != null) {
    travelDeg = proposeOutgoingTravelDeg(thetaIn, rail);
  } else {
    // Soft fallback: continue along E1 direction (still a Proposal, not physics)
    travelDeg = thetaIn;
  }

  const { dx, dy } = directionFromAngleDeg(travelDeg);
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) {
    return null;
  }
  const endpoint = {
    x: start.x + (dx / len) * EXTENSION2_DEFAULT_LENGTH_RG,
    y: start.y + (dy / len) * EXTENSION2_DEFAULT_LENGTH_RG,
  };

  const ts = nowIso();
  const item: TrajectoryExtension = {
    id: createTrajectoryExtensionId(args.slotId, 2),
    index: 2,
    endpoint,
    userEdited: false,
    createdAt: ts,
    updatedAt: ts,
  };

  return {
    item,
    segment: {
      id: item.id,
      index: 2,
      start: { x: start.x, y: start.y },
      end: { x: endpoint.x, y: endpoint.y },
    },
  };
}

/** Resolve chain segments from draft + live pathNodes (starts not stored). */
export function resolveDraftSegments(
  draft: TrajectoryExtensionDraft | null | undefined,
  pathNodes: ReadonlyArray<RgPoint | null | undefined>
): TrajectoryExtensionChainSegment[] {
  if (!draft || !Array.isArray(draft.items) || draft.items.length === 0) {
    return [];
  }
  const origin = resolveOrigin(pathNodes, draft.origin);
  if (origin == null || !isValidPoint(origin.point)) {
    return [];
  }

  const sorted = [...draft.items].sort((a, b) => a.index - b.index);
  const segments: TrajectoryExtensionChainSegment[] = [];
  let cursor: RgPoint = { x: origin.point.x, y: origin.point.y };

  for (const item of sorted) {
    if (!isValidPoint(item.endpoint)) continue;
    segments.push({
      id: item.id,
      index: item.index,
      start: { x: cursor.x, y: cursor.y },
      end: { x: item.endpoint.x, y: item.endpoint.y },
    });
    cursor = { x: item.endpoint.x, y: item.endpoint.y };
  }
  return segments;
}

/**
 * Reveal calculated nodes from Display Cap end through Origin (visual continuity).
 * Uses Cap endIndex for reveal only — never as Origin.
 */
export function buildRevealPathNodes(
  pathNodes: ReadonlyArray<RgPoint | null | undefined>,
  displayCapEndIndex: number,
  originIndex: number
): RgPoint[] {
  if (
    !Number.isFinite(displayCapEndIndex) ||
    !Number.isFinite(originIndex) ||
    originIndex <= displayCapEndIndex
  ) {
    return [];
  }
  const out: RgPoint[] = [];
  const start = Math.max(0, Math.floor(displayCapEndIndex));
  const end = Math.floor(originIndex);
  for (let i = start; i <= end; i++) {
    const p = pathNodes[i];
    if (isValidPoint(p)) {
      out.push({ x: p.x, y: p.y });
    }
  }
  return out;
}

export function draftItemCount(
  draft: TrajectoryExtensionDraft | null | undefined
): number {
  return draft?.items?.length ?? 0;
}

export function canAddAnotherExtension(
  draft: TrajectoryExtensionDraft | null | undefined
): boolean {
  return draftItemCount(draft) < MAX_TRAJECTORY_EXTENSIONS;
}

/** Append Extension1 into a new draft. */
export function appendExtension1Draft(
  pathNodes: ReadonlyArray<RgPoint | null | undefined>,
  slotId: string
): TrajectoryExtensionDraft | null {
  const result = proposeExtension1({ pathNodes, slotId });
  if (!result) return null;
  return {
    origin: result.origin.reference,
    items: [result.item],
  };
}

/** Append Extension2 onto an existing draft that has Extension1 only. */
export function appendExtension2Draft(
  draft: TrajectoryExtensionDraft,
  pathNodes: ReadonlyArray<RgPoint | null | undefined>,
  slotId: string
): TrajectoryExtensionDraft | null {
  if (!draft || draft.items.length !== 1) return null;
  const segments = resolveDraftSegments(draft, pathNodes);
  const e1 = segments.find((s) => s.index === 1);
  if (!e1) return null;
  const result = proposeExtension2({
    extension1Start: e1.start,
    extension1End: e1.end,
    slotId,
  });
  if (!result) return null;
  return {
    origin: draft.origin,
    items: [...draft.items, result.item],
  };
}

/** Dataset payload from runtime draft (endpoints + origin ref only). */
export function draftToPayload(
  draft: TrajectoryExtensionDraft
): TrajectoryExtensionPayload {
  return {
    extensionSchemaVersion: 1,
    origin: draft.origin,
    items: draft.items.slice(0, MAX_TRAJECTORY_EXTENSIONS),
  };
}

/** Hydrate runtime draft from Dataset payload (Reveal regenerated at render). */
export function payloadToDraft(
  payload: TrajectoryExtensionPayload | null | undefined
): TrajectoryExtensionDraft | null {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return null;
  }
  const origin = payload.origin ?? {
    kind: "path_node" as const,
    source: "corrected" as const,
  };
  return {
    origin,
    items: payload.items.slice(0, MAX_TRAJECTORY_EXTENSIONS).map((it) => ({
      ...it,
      endpoint: { x: it.endpoint.x, y: it.endpoint.y },
    })),
  };
}
