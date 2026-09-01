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
import { loadWorkingDataset } from "../dataset/infra/datasetStorage";
import { listFamilyMemberLocations } from "./familyAwareWriter";
import {
  familySymmetryIdentity,
  parseMemberOrigin,
  parseSymmetryOp,
} from "./familyIdentity";
import {
  resolveDisplayFamilyHpt,
  resolveFamilyHpt,
  resolveFamilyThickness,
} from "./hptResolver";
import {
  authoredTrackFromSymmetryMember,
  parseFamilyTrack,
  type FamilyTrack,
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

function resolveAuthoredTrackForFamilyMember(
  entry: StrategyEntry,
  dataset?: PositionRecord[]
): { authoredTrack: FamilyTrack; requestedTrack: FamilyTrack } | null {
  const requestedTrack = parseFamilyTrack(entry.track);
  if (!requestedTrack) return null;

  const origin = parseMemberOrigin(entry.memberOrigin);
  const op = parseSymmetryOp(entry.symmetryOp);

  let authoredTrack: FamilyTrack | null = null;
  if (origin === "AUTHORED") {
    authoredTrack = requestedTrack;
  } else if (op) {
    authoredTrack = authoredTrackFromSymmetryMember(requestedTrack, op);
  } else if (entry.familyId) {
    try {
      const ds =
        Array.isArray(dataset) && dataset.length > 0
          ? dataset
          : loadWorkingDataset();
      const authored = findAuthoredFamilyEntry(ds, entry.familyId);
      if (authored?.entry.track) {
        authoredTrack = parseFamilyTrack(authored.entry.track);
      }
    } catch {
      authoredTrack = null;
    }
  }

  if (!authoredTrack) return null;
  return { authoredTrack, requestedTrack };
}

/**
 * Resolve runtime HPT for a recalled Family Member.
 * Canonical HPT is mirrored when requestedTrack is opposite handedness to authoredTrack,
 * regardless of memberOrigin (AUTHORED, SYMMETRY, DERIVED_*).
 * Fallback to persisted hpT if authoredTrack cannot be determined.
 */
export function hydrateFamilyMemberRuntimeHpt(
  entry: StrategyEntry | null | undefined,
  dataset?: PositionRecord[]
): unknown {
  if (!entry) return undefined;
  const tracks = resolveAuthoredTrackForFamilyMember(entry, dataset);
  if (!tracks) {
    return entry.hpT;
  }

  return resolveFamilyHpt({
    authoredTrack: tracks.authoredTrack,
    requestedTrack: tracks.requestedTrack,
    canonicalHpt: canonicalHptFromEntry(entry),
  }).hpt;
}

/**
 * Display Runtime HPT for visual consumers (modal, table impact, ADMIN overlay viz).
 * Separate hydrate entry point from physics runtime — same mirror primitive today.
 */
export function hydrateFamilyMemberDisplayHpt(
  entry: StrategyEntry | null | undefined,
  dataset?: PositionRecord[]
): unknown {
  if (!entry) return undefined;
  const tracks = resolveAuthoredTrackForFamilyMember(entry, dataset);
  if (!tracks) {
    return entry.hpT;
  }

  return resolveDisplayFamilyHpt({
    authoredTrack: tracks.authoredTrack,
    requestedTrack: tracks.requestedTrack,
    canonicalHpt: canonicalHptFromEntry(entry),
  }).hpt;
}

export function hydrateFamilyMemberRuntimeThickness(
  entry: StrategyEntry | null | undefined,
  dataset?: PositionRecord[]
): string | undefined {
  if (!entry) return undefined;
  const canonicalT =
    typeof entry.hpT === "object" &&
    entry.hpT &&
    typeof (entry.hpT as { T?: unknown }).T === "string"
      ? (entry.hpT as { T: string }).T
      : undefined;
  if (canonicalT == null) return undefined;

  const requestedTrack = parseFamilyTrack(entry.track);
  if (!requestedTrack) {
    return canonicalT;
  }
  const origin = parseMemberOrigin(entry.memberOrigin);
  const op = parseSymmetryOp(entry.symmetryOp);

  let authoredTrack: FamilyTrack | null = null;
  if (origin === "AUTHORED") {
    authoredTrack = requestedTrack;
  } else if (op) {
    authoredTrack = authoredTrackFromSymmetryMember(requestedTrack, op);
  } else if (entry.familyId) {
    try {
      const ds =
        Array.isArray(dataset) && dataset.length > 0
          ? dataset
          : loadWorkingDataset();
      const authored = findAuthoredFamilyEntry(ds, entry.familyId);
      if (authored?.entry.track) {
        authoredTrack = parseFamilyTrack(authored.entry.track);
      }
    } catch {
      authoredTrack = null;
    }
  }

  if (!authoredTrack) {
    return canonicalT;
  }

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
