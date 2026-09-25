/**
 * Phase F-2E — Derived (positionId, sourceSlot) occupancy index +
 * resolvable Publish overwrite classification.
 *
 * Index is rebuildable / non-authoritative. SSOT remains NormalizedDatasetEnvelope.
 * Lookup: O(N) build + O(M) query — not O(N×M).
 */

import { createPositionId } from "./positionId";
import type { FamilyMember } from "./family/familyNormalizedSchema";
import type { FamilySourceSlot } from "./family/familyNormalizedSchema";
import type { NormalizedDatasetEnvelope } from "./dataset/normalizedDatasetEnvelope";
import type { PublishOperation } from "./publishOperation";
import {
  convertPublishFamilyPayloadToNormalizedFamily,
} from "./publishedNormalizedLeafMutation";
import type { PublishFamilyPayload } from "./publishFamilyPayload";
import type { Ball3 } from "./positionSearchEngine";

function isBall3Shape(balls: unknown): balls is Ball3 {
  if (balls == null || typeof balls !== "object") return false;
  const b = balls as Record<string, unknown>;
  for (const role of ["cue", "target", "second"] as const) {
    const p = b[role];
    if (p == null || typeof p !== "object") return false;
    const pt = p as Record<string, unknown>;
    if (typeof pt.x !== "number" || typeof pt.y !== "number") return false;
  }
  return true;
}

export type PositionSlotKey = string;

export type OccupancyEntry = {
  familyId: string;
  memberId: string;
  memberOrigin: string;
  positionId: string;
  sourceSlot: FamilySourceSlot;
};

export type OccupancyIndex = Map<PositionSlotKey, OccupancyEntry>;

export type OccupancyConflict = {
  positionId: string;
  sourceSlot: FamilySourceSlot;
  incoming: OccupancyEntry;
  existing: OccupancyEntry;
};

export function makePositionSlotKey(
  positionId: string,
  sourceSlot: string
): PositionSlotKey {
  return `${positionId}|${sourceSlot}`;
}

/**
 * Build occupancy Map from FamilyMembers (first occupant wins per key).
 * Same family occupying a key twice is not a cross-Family conflict.
 */
export function buildOccupancyIndex(
  members: readonly FamilyMember[]
): OccupancyIndex {
  const index: OccupancyIndex = new Map();
  for (const member of members) {
    if (!isBall3Shape(member.balls)) continue;
    const sourceSlot = member.sourceSlot;
    if (sourceSlot !== "S1" && sourceSlot !== "S2" && sourceSlot !== "S3") {
      continue;
    }
    const positionId = createPositionId(member.balls);
    const key = makePositionSlotKey(positionId, sourceSlot);
    if (index.has(key)) continue;
    index.set(key, {
      familyId: member.familyId,
      memberId: member.memberId,
      memberOrigin: String(member.memberOrigin),
      positionId,
      sourceSlot,
    });
  }
  return index;
}

/**
 * Query incoming Members against a pre-built repository occupancy index.
 * O(M) lookups — does not scan repository per incoming Member pairwise.
 */
export function collectOccupancyConflicts(
  index: OccupancyIndex,
  incomingMembers: readonly FamilyMember[]
): {
  conflicts: OccupancyConflict[];
  positionIdMismatchCount: number;
} {
  const conflicts: OccupancyConflict[] = [];
  let positionIdMismatchCount = 0;

  for (const member of incomingMembers) {
    if (!isBall3Shape(member.balls)) continue;
    const sourceSlot = member.sourceSlot;
    if (sourceSlot !== "S1" && sourceSlot !== "S2" && sourceSlot !== "S3") {
      continue;
    }
    const positionId = createPositionId(member.balls);
    // FamilyMember has no persisted positionId field — mismatch N/A at Member layer.
    const key = makePositionSlotKey(positionId, sourceSlot);
    const existing = index.get(key);
    if (existing && existing.familyId !== member.familyId) {
      conflicts.push({
        positionId,
        sourceSlot,
        incoming: {
          familyId: member.familyId,
          memberId: member.memberId,
          memberOrigin: String(member.memberOrigin),
          positionId,
          sourceSlot,
        },
        existing,
      });
    }
  }

  return { conflicts, positionIdMismatchCount };
}

export type ResolvablePublishOverwriteConflict = {
  code: "RESOLVABLE_PUBLISH_OVERWRITE";
  incomingFamilyId: string;
  existingFamilyId: string;
  authoredPositionId: string;
  authoredSourceSlot: FamilySourceSlot;
  conflictCount: number;
  uniquePositionIds: string[];
  slots: FamilySourceSlot[];
  originPairCounts: Record<string, number>;
};

export type PublishOccupancyClassifyResult =
  | {
      kind: "NO_CROSS_FAMILY_CONFLICT";
    }
  | {
      kind: "RESOLVABLE_PUBLISH_OVERWRITE";
      conflict: ResolvablePublishOverwriteConflict;
    }
  | {
      kind: "HARD_OCCUPANCY_CONFLICT";
      reason:
        | "not-create"
        | "incoming-convert-failed"
        | "authored-count"
        | "no-conflicts"
        | "derived-only-different-authored-root"
        | "multi-existing-family"
        | "incoming-internal-corruption"
        | "position-id-mismatch";
      conflicts: OccupancyConflict[];
      existingFamilyIds: string[];
      issues: string[];
    };

function countAuthored(members: readonly FamilyMember[]): FamilyMember[] {
  return members.filter((m) => m.memberOrigin === "AUTHORED");
}

function detectIncomingInternalOccupancyCorruption(
  members: readonly FamilyMember[]
): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const m of members) {
    if (!isBall3Shape(m.balls)) continue;
    const slot = m.sourceSlot;
    if (slot !== "S1" && slot !== "S2" && slot !== "S3") continue;
    const key = makePositionSlotKey(createPositionId(m.balls), slot);
    const prev = seen.get(key);
    if (prev && prev !== m.memberId) {
      issues.push(`incoming-internal-duplicate:${key}`);
    } else {
      seen.set(key, m.memberId);
    }
  }
  return issues;
}

/**
 * Classify whether CREATE vs existing leaf is a user-confirmable Family
 * replacement (same AUTHORED Position+Slot, single existing Family).
 *
 * Does not mutate inputs. Does not weaken C-0.
 */
export function classifyResolvablePublishOverwrite(args: {
  base: NormalizedDatasetEnvelope;
  operation: PublishOperation;
  payload: PublishFamilyPayload;
}): PublishOccupancyClassifyResult {
  if (args.operation.intent !== "CREATE") {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "not-create",
      conflicts: [],
      existingFamilyIds: [],
      issues: ["operation-intent-not-create"],
    };
  }

  const converted = convertPublishFamilyPayloadToNormalizedFamily(args.payload);
  if (!converted.ok) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "incoming-convert-failed",
      conflicts: [],
      existingFamilyIds: [],
      issues: converted.issues,
    };
  }

  const incomingMembers = converted.members;
  const internalIssues =
    detectIncomingInternalOccupancyCorruption(incomingMembers);
  if (internalIssues.length > 0) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "incoming-internal-corruption",
      conflicts: [],
      existingFamilyIds: [],
      issues: internalIssues,
    };
  }

  const authored = countAuthored(incomingMembers);
  if (authored.length !== 1) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "authored-count",
      conflicts: [],
      existingFamilyIds: [],
      issues: [`authored-count:${authored.length}`],
    };
  }
  const authoredMember = authored[0]!;
  if (!isBall3Shape(authoredMember.balls)) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "incoming-convert-failed",
      conflicts: [],
      existingFamilyIds: [],
      issues: ["authored-balls-invalid"],
    };
  }
  const authoredPositionId = createPositionId(authoredMember.balls);
  const authoredSourceSlot = authoredMember.sourceSlot;

  const index = buildOccupancyIndex(args.base.familyMembers);
  const { conflicts, positionIdMismatchCount } = collectOccupancyConflicts(
    index,
    incomingMembers
  );

  if (positionIdMismatchCount > 0) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "position-id-mismatch",
      conflicts,
      existingFamilyIds: [
        ...new Set(conflicts.map((c) => c.existing.familyId)),
      ],
      issues: [`positionId-mismatch:${positionIdMismatchCount}`],
    };
  }

  if (conflicts.length === 0) {
    return { kind: "NO_CROSS_FAMILY_CONFLICT" };
  }

  const existingFamilyIds = [
    ...new Set(conflicts.map((c) => c.existing.familyId)),
  ];
  if (existingFamilyIds.length !== 1) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "multi-existing-family",
      conflicts,
      existingFamilyIds,
      issues: existingFamilyIds.map((id) => `existing:${id}`),
    };
  }
  const existingFamilyId = existingFamilyIds[0]!;

  // AUTHORED root must occupy the same Position+Slot as the existing Family.
  const rootKey = makePositionSlotKey(authoredPositionId, authoredSourceSlot);
  const rootOccupant = index.get(rootKey);
  if (
    !rootOccupant ||
    rootOccupant.familyId !== existingFamilyId ||
    rootOccupant.memberOrigin !== "AUTHORED"
  ) {
    return {
      kind: "HARD_OCCUPANCY_CONFLICT",
      reason: "derived-only-different-authored-root",
      conflicts,
      existingFamilyIds,
      issues: [
        `authored-root:${authoredPositionId}|${authoredSourceSlot}`,
        rootOccupant
          ? `occupant:${rootOccupant.familyId}:${rootOccupant.memberOrigin}`
          : "occupant:none",
      ],
    };
  }

  // All conflicts must be only incoming ↔ that existing Family (already enforced
  // by single existingFamilyId + convert guarantees single incoming familyId).
  const originPairCounts: Record<string, number> = {};
  const uniquePositionIds = new Set<string>();
  const slots = new Set<FamilySourceSlot>();
  for (const c of conflicts) {
    uniquePositionIds.add(c.positionId);
    slots.add(c.sourceSlot);
    const pair = `${c.incoming.memberOrigin} ↔ ${c.existing.memberOrigin}`;
    originPairCounts[pair] = (originPairCounts[pair] || 0) + 1;
  }

  return {
    kind: "RESOLVABLE_PUBLISH_OVERWRITE",
    conflict: {
      code: "RESOLVABLE_PUBLISH_OVERWRITE",
      incomingFamilyId: args.operation.destinationFamilyId,
      existingFamilyId,
      authoredPositionId,
      authoredSourceSlot,
      conflictCount: conflicts.length,
      uniquePositionIds: [...uniquePositionIds],
      slots: [...slots],
      originPairCounts,
    },
  };
}
