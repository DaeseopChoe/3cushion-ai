/**
 * Runtime projection bridge for Family HPT / thickness.
 *
 * Canonical HPT lives on the AUTHORED Member. SYMMETRY persistence may carry
 * a TEMPORARY unmirrored compatibility copy — consumers must resolve here
 * (or via resolveFamilyHpt) before Calculator / Builder input.
 *
 * Hydrate can recover AUTHORED track from (memberTrack, symmetryOp) because
 * H/V/RPI are involutions — no dataset scan required for a single recalled Entry.
 */

import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { listFamilyMemberLocations } from "./familyAwareWriter";
import {
  familySymmetryIdentity,
  parseMemberOrigin,
  parseSymmetryOp,
} from "./familyIdentity";
import {
  resolveFamilyHpt,
  resolveFamilyThickness,
} from "./hptResolver";
import {
  authoredTrackFromSymmetryMember,
  parseFamilyTrack,
} from "./trackSymmetry";

export function findAuthoredFamilyEntry(
  dataset: PositionRecord[],
  familyId: string
): { record: PositionRecord; slot: StrategyEntry["slot"]; entry: StrategyEntry } | null {
  const authored = listFamilyMemberLocations(dataset, familyId).find(
    (loc) => familySymmetryIdentity(loc.entry) === "IDENTITY"
  );
  if (!authored) return null;
  return {
    record: dataset[authored.recordIndex],
    slot: authored.slot,
    entry: authored.entry,
  };
}

function canonicalHptFromEntry(entry: StrategyEntry | undefined): unknown {
  return entry?.hpT;
}

/**
 * Resolve runtime HPT for a recalled Family Member from the Entry alone.
 * Legacy / AUTHORED / incomplete identity → persisted hpT unchanged.
 */
export function hydrateFamilyMemberRuntimeHpt(entry: StrategyEntry | null | undefined): unknown {
  if (!entry) return undefined;
  const origin = parseMemberOrigin(entry.memberOrigin);
  const op = parseSymmetryOp(entry.symmetryOp);
  const requestedTrack = parseFamilyTrack(entry.track);
  if (origin !== "SYMMETRY" || !op || !requestedTrack) {
    return entry.hpT;
  }
  const authoredTrack = authoredTrackFromSymmetryMember(requestedTrack, op);
  return resolveFamilyHpt({
    authoredTrack,
    requestedTrack,
    canonicalHpt: canonicalHptFromEntry(entry),
  }).hpt;
}

export function hydrateFamilyMemberRuntimeThickness(
  entry: StrategyEntry | null | undefined
): string | undefined {
  if (!entry) return undefined;
  const canonicalT =
    typeof entry.hpT === "object" &&
    entry.hpT &&
    typeof (entry.hpT as { T?: unknown }).T === "string"
      ? (entry.hpT as { T: string }).T
      : undefined;
  if (canonicalT == null) return undefined;
  const origin = parseMemberOrigin(entry.memberOrigin);
  const op = parseSymmetryOp(entry.symmetryOp);
  const requestedTrack = parseFamilyTrack(entry.track);
  if (origin !== "SYMMETRY" || !op || !requestedTrack) {
    return canonicalT;
  }
  const authoredTrack = authoredTrackFromSymmetryMember(requestedTrack, op);
  return resolveFamilyThickness({
    authoredTrack,
    requestedTrack,
    canonicalT,
  }).T;
}

export function resolveRuntimeHptForFamilyMember(args: {
  dataset: PositionRecord[];
  familyId: string;
  requestedTrack?: string;
  memberEntry?: StrategyEntry;
}): ReturnType<typeof resolveFamilyHpt> | null {
  const authored = findAuthoredFamilyEntry(args.dataset, args.familyId);
  if (!authored) return null;
  const requestedTrack = args.requestedTrack ?? args.memberEntry?.track;
  return resolveFamilyHpt({
    authoredTrack: authored.entry.track,
    requestedTrack,
    canonicalHpt: authored.entry.hpT,
  });
}

export function resolveRuntimeThicknessForFamilyMember(args: {
  dataset: PositionRecord[];
  familyId: string;
  requestedTrack?: string;
  memberEntry?: StrategyEntry;
  canonicalT?: string;
}): ReturnType<typeof resolveFamilyThickness> | null {
  const authored = findAuthoredFamilyEntry(args.dataset, args.familyId);
  if (!authored) return null;
  const canonicalT =
    args.canonicalT ??
    (typeof authored.entry.hpT === "object" &&
    authored.entry.hpT &&
    typeof (authored.entry.hpT as { T?: unknown }).T === "string"
      ? (authored.entry.hpT as { T: string }).T
      : null);
  if (canonicalT == null) return null;
  return resolveFamilyThickness({
    authoredTrack: authored.entry.track,
    requestedTrack: args.requestedTrack ?? args.memberEntry?.track,
    canonicalT,
  });
}

export function projectRuntimeHptForFamilyMember(
  args: Parameters<typeof resolveRuntimeHptForFamilyMember>[0]
): unknown | null {
  return resolveRuntimeHptForFamilyMember(args)?.hpt ?? null;
}
