/**
 * Phase 3A-359H — Atomic 4-track C3+ scoring structure consistency.
 *
 * Partial success is forbidden: either all tracks share the same semantic
 * scoring structure (and all hit SB), all tracks miss SB (family skip),
 * or the family fails closed.
 */

import type { Point } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import {
  resolveC3PlusScoringLine,
  type C3PlusNodeKind,
  type C3PlusPathNode,
} from "./c3PlusScoringPath";
import {
  resolveC3PlusSecondBall,
  type C3PlusSourceMember,
} from "./generateC3PlusScoringDerivedMembers";
import { FAMILY_TRACKS, type FamilyTrack, parseFamilyTrack } from "./trackSymmetry";

export const C3_PLUS_FOUR_TRACK_INCONSISTENT = "FOUR_TRACK_INCONSISTENT" as const;
export const C3_PLUS_ALL_NO_SB = "ALL_NO_SB" as const;

export type C3PlusPreparedTrackSource = C3PlusSourceMember & {
  track: FamilyTrack;
  pathNodes: ReadonlyArray<Point | null | undefined>;
  /** Effective extensions used for scoring (may equal entry.trajectoryExtensions). */
  extensions: TrajectoryExtensionPayload | null;
};

export type C3PlusTrackScoringFingerprint = {
  track: FamilyTrack;
  sbHit: boolean;
  resolveCode: string;
  extensionMask: "none" | "e1" | "e1e2";
  systemTailId: string | null;
  scoringLineIds: string[];
  scoringEndpointId: string | null;
  scoringEndpointKind: C3PlusNodeKind | null;
  hitFromId: string | null;
  hitToId: string | null;
};

export type C3PlusFourTrackConsistencyResult =
  | {
      ok: true;
      kind: "GENERATE";
      fingerprints: C3PlusTrackScoringFingerprint[];
    }
  | {
      ok: true;
      kind: "SKIP_ALL_NO_SB";
      fingerprints: C3PlusTrackScoringFingerprint[];
    }
  | {
      ok: false;
      code: typeof C3_PLUS_FOUR_TRACK_INCONSISTENT;
      reason: string;
      fingerprints: C3PlusTrackScoringFingerprint[];
    };

function extensionMask(
  extensions: TrajectoryExtensionPayload | null | undefined
): "none" | "e1" | "e1e2" {
  const items = Array.isArray(extensions?.items) ? extensions!.items : [];
  const has1 = items.some((it) => it.index === 1);
  const has2 = items.some((it) => it.index === 2);
  if (has1 && has2) return "e1e2";
  if (has1) return "e1";
  return "none";
}

function lastSystemNodeId(nodes: C3PlusPathNode[]): string | null {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    if (nodes[i]!.kind === "system") return nodes[i]!.id;
  }
  return null;
}

export function fingerprintC3PlusTrackScoring(args: {
  track: FamilyTrack;
  pathNodes: ReadonlyArray<Point | null | undefined>;
  extensions: TrajectoryExtensionPayload | null;
  sourceMember: C3PlusSourceMember;
  hitTolerance?: number;
}): C3PlusTrackScoringFingerprint {
  const secondBall = resolveC3PlusSecondBall(
    args.sourceMember.balls,
    args.sourceMember.targetBall
  );
  const resolved = resolveC3PlusScoringLine({
    pathNodes: args.pathNodes,
    extensions: args.extensions,
    secondBall,
    hitTolerance: args.hitTolerance,
  });

  const base = {
    track: args.track,
    extensionMask: extensionMask(args.extensions),
  };

  if (!resolved.ok) {
    return {
      ...base,
      sbHit: false,
      resolveCode: resolved.code,
      systemTailId: null,
      scoringLineIds: [],
      scoringEndpointId: null,
      scoringEndpointKind: null,
      hitFromId: null,
      hitToId: null,
    };
  }

  const end = resolved.scoringLine[resolved.scoringLine.length - 1]!;
  return {
    ...base,
    sbHit: true,
    resolveCode: "OK",
    systemTailId: lastSystemNodeId(resolved.candidate),
    scoringLineIds: resolved.scoringLine.map((n) => n.id),
    scoringEndpointId: end.id,
    scoringEndpointKind: end.kind,
    hitFromId: resolved.hitSegment.from.id,
    hitToId: resolved.hitSegment.to.id,
  };
}

function structuralKey(fp: C3PlusTrackScoringFingerprint): string {
  return JSON.stringify({
    sbHit: fp.sbHit,
    resolveCode: fp.sbHit ? "OK" : fp.resolveCode === "NO_SB_HIT" ? "NO_SB_HIT" : fp.resolveCode,
    extensionMask: fp.extensionMask,
    systemTailId: fp.systemTailId,
    scoringLineIds: fp.scoringLineIds,
    scoringEndpointId: fp.scoringEndpointId,
    scoringEndpointKind: fp.scoringEndpointKind,
    hitFromId: fp.hitFromId,
    hitToId: fp.hitToId,
  });
}

/**
 * Validate prepared 4-track sources before any derived member is minted.
 */
export function validateC3PlusFourTrackConsistency(
  sources: C3PlusPreparedTrackSource[],
  options?: { hitTolerance?: number }
): C3PlusFourTrackConsistencyResult {
  if (sources.length !== FAMILY_TRACKS.length) {
    return {
      ok: false,
      code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
      reason: `expected ${FAMILY_TRACKS.length} Family tracks, got ${sources.length}`,
      fingerprints: [],
    };
  }

  const byTrack = new Map<FamilyTrack, C3PlusPreparedTrackSource>();
  for (const source of sources) {
    const track = parseFamilyTrack(source.track) ?? parseFamilyTrack(source.entry.track);
    if (!track) {
      return {
        ok: false,
        code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
        reason: `source missing FamilyTrack (${source.entry.memberId ?? "?"})`,
        fingerprints: [],
      };
    }
    if (byTrack.has(track)) {
      return {
        ok: false,
        code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
        reason: `duplicate track ${track}`,
        fingerprints: [],
      };
    }
    byTrack.set(track, { ...source, track });
  }

  for (const track of FAMILY_TRACKS) {
    if (!byTrack.has(track)) {
      return {
        ok: false,
        code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
        reason: `missing Family track ${track}`,
        fingerprints: [],
      };
    }
  }

  const fingerprints: C3PlusTrackScoringFingerprint[] = FAMILY_TRACKS.map((track) => {
    const source = byTrack.get(track)!;
    return fingerprintC3PlusTrackScoring({
      track,
      pathNodes: source.pathNodes,
      extensions: source.extensions,
      sourceMember: source,
      hitTolerance: options?.hitTolerance,
    });
  });

  // Dataset extension presence must match across tracks (no partial DROP).
  const masks = new Set(fingerprints.map((fp) => fp.extensionMask));
  if (masks.size > 1) {
    return {
      ok: false,
      code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
      reason: `trajectoryExtensions structure differs across tracks (${[...masks].join(", ")})`,
      fingerprints,
    };
  }

  const sbHits = fingerprints.map((fp) => fp.sbHit);
  const allHit = sbHits.every(Boolean);
  const noneHit = sbHits.every((v) => !v);

  if (!allHit && !noneHit) {
    const missing = fingerprints.filter((fp) => !fp.sbHit).map((fp) => fp.track);
    return {
      ok: false,
      code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
      reason: `Second Ball hit inconsistent across tracks (NO_SB on ${missing.join(", ")})`,
      fingerprints,
    };
  }

  if (noneHit) {
    const nonSbCodes = new Set(
      fingerprints
        .map((fp) => fp.resolveCode)
        .filter((c) => c !== "NO_SB_HIT")
    );
    if (nonSbCodes.size > 0) {
      return {
        ok: false,
        code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
        reason: `non-NO_SB failure mixed with NO_SB (${[...nonSbCodes].join(", ")})`,
        fingerprints,
      };
    }
    return { ok: true, kind: "SKIP_ALL_NO_SB", fingerprints };
  }

  const keys = new Set(fingerprints.map(structuralKey));
  if (keys.size > 1) {
    return {
      ok: false,
      code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
      reason:
        "C3+ scoring structure (tail / EXT / endpoint / hit segment) differs across tracks",
      fingerprints,
    };
  }

  return { ok: true, kind: "GENERATE", fingerprints };
}
