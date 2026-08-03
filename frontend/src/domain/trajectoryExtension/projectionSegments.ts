/**
 * projectionSegments.ts
 * Build nearest-Projection candidates from already-rendered display geometry.
 *
 * Read-only over Display Cap / Reveal / Extension outputs.
 * Does not call Builder, Reflection, or Display Cap resolvers.
 */

import type { RgPoint, TrajectoryExtensionChainSegment } from "./model";

export type ProjectionSegment = {
  id: string;
  /** Tie-break ordinal (lower wins). */
  index: number;
  start: RgPoint;
  end: RgPoint;
  source: "calculated" | "reveal" | "extension";
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

/** Expand a polyline into consecutive segments. */
export function polylineToProjectionSegments(
  points: ReadonlyArray<RgPoint | null | undefined> | null | undefined,
  args: {
    idPrefix: string;
    indexBase: number;
    source: ProjectionSegment["source"];
  }
): ProjectionSegment[] {
  if (!Array.isArray(points) || points.length < 2) return [];
  const out: ProjectionSegment[] = [];
  let ordinal = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!isValidPoint(a) || !isValidPoint(b)) continue;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-12) continue;
    out.push({
      id: `${args.idPrefix}-${ordinal}`,
      index: args.indexBase + ordinal,
      start: { x: a.x, y: a.y },
      end: { x: b.x, y: b.y },
      source: args.source,
    });
    ordinal += 1;
  }
  return out;
}

/**
 * Collect all currently displayed trajectory-related segments for 1× nearest Projection.
 * Order / indexBase: calculated → reveal → extension (stable tie-break).
 */
export function collectDisplayProjectionSegments(args: {
  calculatedPath?: ReadonlyArray<RgPoint | null | undefined> | null;
  revealPath?: ReadonlyArray<RgPoint | null | undefined> | null;
  extensionSegments?: ReadonlyArray<TrajectoryExtensionChainSegment> | null;
}): ProjectionSegment[] {
  const calculated = polylineToProjectionSegments(args.calculatedPath, {
    idPrefix: "calc",
    indexBase: 0,
    source: "calculated",
  });
  const reveal = polylineToProjectionSegments(args.revealPath, {
    idPrefix: "reveal",
    indexBase: 1000,
    source: "reveal",
  });
  const extRaw = args.extensionSegments ?? [];
  const extension: ProjectionSegment[] = [];
  for (const seg of extRaw) {
    if (!isValidPoint(seg?.start) || !isValidPoint(seg?.end)) continue;
    extension.push({
      id: seg.id || `ext-${seg.index}`,
      index: 2000 + (seg.index === 2 ? 2 : 1),
      start: { x: seg.start.x, y: seg.start.y },
      end: { x: seg.end.x, y: seg.end.y },
      source: "extension",
    });
  }
  return [...calculated, ...reveal, ...extension];
}
