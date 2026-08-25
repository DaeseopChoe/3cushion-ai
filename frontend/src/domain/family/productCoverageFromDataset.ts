/**
 * Phase 3A-360A — APPROVED / History Product coverage display SSOT.
 *
 * Coverage geometry is extracted only from persisted DERIVED_CUE_C3_PRODUCT
 * member balls — never from live buildTrajectory / scoring recompute.
 */

import type { Point, PositionRecord } from "../positionSearchEngine";
import type { CueImpactDerivedPreviewMarker } from "./cueImpactDerivedReview";
import { reconstructFamilyMembers } from "./familyAwareWriter";
import {
  CUE_C3_PRODUCT_DERIVED_RULE,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import {
  parseFamilyTrack,
  pointsEqual,
  type FamilyTrack,
} from "./trackSymmetry";

export type ProductCoveragePoint = {
  point: Point;
  /** Representative Product member for labeling / debug. */
  memberId: string;
  derivedStep: string;
};

export type ProductCoverage = {
  familyId: string;
  track: FamilyTrack;
  cuePoints: ProductCoveragePoint[];
  secondPoints: ProductCoveragePoint[];
};

function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

function isFinitePoint(p: Point | null | undefined): p is Point {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

/** Deterministic order: x asc, then y asc (exact stored floats). */
function comparePoints(a: Point, b: Point): number {
  if (a.x !== b.x) return a.x < b.x ? -1 : 1;
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  return 0;
}

function compareCoveragePoints(a: ProductCoveragePoint, b: ProductCoveragePoint): number {
  const byPoint = comparePoints(a.point, b.point);
  if (byPoint !== 0) return byPoint;
  if (a.derivedStep !== b.derivedStep) {
    return a.derivedStep < b.derivedStep ? -1 : 1;
  }
  return a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0;
}

function upsertUnique(
  list: ProductCoveragePoint[],
  point: Point,
  memberId: string,
  derivedStep: string
): void {
  if (list.some((row) => pointsEqual(row.point, point))) return;
  list.push({
    point: clonePoint(point),
    memberId,
    derivedStep,
  });
}

/**
 * Extract searchable Product coverage for one family + track from durable dataset.
 * Returns null when inputs are invalid or no Product members match.
 */
export function productCoverageFromDataset(args: {
  dataset: PositionRecord[] | null | undefined;
  familyId: string | null | undefined;
  track: string | null | undefined;
}): ProductCoverage | null {
  const familyId = typeof args.familyId === "string" ? args.familyId.trim() : "";
  const track = parseFamilyTrack(args.track);
  if (!familyId || !track) return null;

  const dataset = Array.isArray(args.dataset) ? args.dataset : [];
  if (dataset.length === 0) return null;

  const cuePoints: ProductCoveragePoint[] = [];
  const secondPoints: ProductCoveragePoint[] = [];

  for (const loc of reconstructFamilyMembers(dataset, familyId)) {
    if (loc.entry.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) continue;
    const memberTrack = parseFamilyTrack(loc.entry.track);
    if (memberTrack !== track) continue;

    const cue = loc.balls?.cue;
    const second = loc.balls?.second;
    if (!isFinitePoint(cue) || !isFinitePoint(second)) continue;

    const memberId = loc.entry.memberId?.trim() || loc.positionId;
    const derivedStep =
      typeof loc.entry.derivedStep === "string" ? loc.entry.derivedStep : "";

    upsertUnique(cuePoints, cue, memberId, derivedStep);
    upsertUnique(secondPoints, second, memberId, derivedStep);
  }

  if (cuePoints.length === 0 && secondPoints.length === 0) return null;

  cuePoints.sort(compareCoveragePoints);
  secondPoints.sort(compareCoveragePoints);

  return {
    familyId,
    track,
    cuePoints,
    secondPoints,
  };
}

function shortCueLabel(derivedStep: string): string {
  const m = /cue:cue_impact:t:([0-9.]+)/.exec(derivedStep);
  if (m?.[1]) return `c${m[1].replace(/^0\./, ".")}`;
  return "cue";
}

function shortSecondLabel(derivedStep: string): string {
  const m = /c3:(.+)$/.exec(derivedStep);
  if (!m?.[1]) return "c3";
  const raw = m[1];
  if (raw.startsWith("v:")) return raw.slice(2);
  const seg = /t:([0-9.]+)/.exec(raw);
  if (seg?.[1]) return seg[1].replace(/^0\./, ".");
  return "c3";
}

/**
 * Map coverage points to DerivedCandidatePreviewLayer markers.
 * Preview layer draws at `marker.cue` — second coverage parks display point there
 * (same pattern as C3+ Review transient balls.cue).
 */
export function productCoveragePreviewMarkers(
  coverage: ProductCoverage | null | undefined
): CueImpactDerivedPreviewMarker[] {
  if (!coverage) return [];
  const markers: CueImpactDerivedPreviewMarker[] = [];

  for (const row of coverage.cuePoints) {
    markers.push({
      familyId: coverage.familyId,
      memberId: row.memberId,
      track: coverage.track,
      derivedRule: CUE_C3_PRODUCT_DERIVED_RULE,
      derivedStep: row.derivedStep,
      tLabel: shortCueLabel(row.derivedStep),
      cue: clonePoint(row.point),
      target: clonePoint(row.point),
      second: clonePoint(row.point),
    });
  }

  for (const row of coverage.secondPoints) {
    markers.push({
      familyId: coverage.familyId,
      memberId: `${row.memberId}__second`,
      track: coverage.track,
      derivedRule: CUE_C3_PRODUCT_DERIVED_RULE,
      derivedStep: row.derivedStep
        ? `coverage:second|${row.derivedStep}`
        : "coverage:second",
      tLabel: shortSecondLabel(row.derivedStep),
      cue: clonePoint(row.point),
      target: clonePoint(row.point),
      second: clonePoint(row.point),
    });
  }

  return markers;
}
