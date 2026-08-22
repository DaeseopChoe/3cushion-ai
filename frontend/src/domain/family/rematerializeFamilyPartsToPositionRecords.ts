/**
 * Phase 3A-345 — Exact-ball rematerialization of FamilyMaster+FamilyMember
 * into legacy-compatible PositionRecord[] packing.
 *
 * Contract:
 *   one Exact balls bucket → one PositionRecord
 *   member.sourceSlot → strategies[sourceSlot]
 *   same Exact + same sourceSlot → fail-closed (no overwrite / no fan-out)
 *
 * READ-only: never mutates localStorage.
 */

import { ballsExactEqual } from "../cueEditSnap";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, TargetBall } from "../positionSearchEngine";
import { hydrateFamilyMemberToPositionRecord } from "./familyHydrate";
import type { FamilyMaster, FamilyMember } from "./familyNormalizedSchema";
import { isFamilySourceSlot } from "./familyNormalizedSchema";

export type RematerializeIssueCode =
  | "MISSING_SOURCE_SLOT"
  | "SLOT_COLLISION"
  | "TARGET_BALL_CONFLICT"
  | "ORPHAN_MEMBER"
  | "HYDRATE_FAILED";

export type RematerializeIssue = {
  code: RematerializeIssueCode;
  reason: string;
  familyId?: string;
  memberId?: string;
  sourceSlot?: string;
};

export type RematerializeFamilyPartsSuccess = {
  ok: true;
  dataset: PositionRecord[];
  recordCount: number;
  memberCount: number;
};

export type RematerializeFamilyPartsFailure = {
  ok: false;
  issues: RematerializeIssue[];
};

export type RematerializeFamilyPartsResult =
  | RematerializeFamilyPartsSuccess
  | RematerializeFamilyPartsFailure;

type Bucket = {
  balls: Ball3;
  members: FamilyMember[];
};

function cloneBall3(balls: Ball3): Ball3 {
  return {
    cue: { x: balls.cue.x, y: balls.cue.y },
    target: { x: balls.target.x, y: balls.target.y },
    second: { x: balls.second.x, y: balls.second.y },
  };
}

/**
 * Group validated members by Exact balls, pack strategies[sourceSlot].
 */
export function rematerializeFamilyPartsToPositionRecords(args: {
  masters: FamilyMaster[] | Record<string, FamilyMaster>;
  members: FamilyMember[];
}): RematerializeFamilyPartsResult {
  const masterById = new Map<string, FamilyMaster>(
    Array.isArray(args.masters)
      ? args.masters.map((m) => [m.familyId, m])
      : Object.entries(args.masters)
  );

  const buckets: Bucket[] = [];
  for (const member of args.members) {
    if (!isFamilySourceSlot(member.sourceSlot)) {
      return {
        ok: false,
        issues: [
          {
            code: "MISSING_SOURCE_SLOT",
            reason: `member ${member.memberId} missing sourceSlot`,
            familyId: member.familyId,
            memberId: member.memberId,
          },
        ],
      };
    }
    if (!masterById.has(member.familyId)) {
      return {
        ok: false,
        issues: [
          {
            code: "ORPHAN_MEMBER",
            reason: `missing Master for member ${member.memberId}`,
            familyId: member.familyId,
            memberId: member.memberId,
          },
        ],
      };
    }
    const existing = buckets.find((b) => ballsExactEqual(b.balls, member.balls));
    if (existing) {
      existing.members.push(member);
    } else {
      buckets.push({ balls: cloneBall3(member.balls), members: [member] });
    }
  }

  const dataset: PositionRecord[] = [];
  for (const bucket of buckets) {
    const positionId = createPositionId(bucket.balls);
    const strategies: PositionRecord["strategies"] = {};
    let targetBall: TargetBall | undefined;

    for (const member of bucket.members) {
      const slot = member.sourceSlot;
      if (strategies[slot]) {
        return {
          ok: false,
          issues: [
            {
              code: "SLOT_COLLISION",
              reason: `Exact balls ${positionId} already has strategies.${slot}`,
              familyId: member.familyId,
              memberId: member.memberId,
              sourceSlot: slot,
            },
          ],
        };
      }
      if (member.targetBall === "yellow" || member.targetBall === "red") {
        if (targetBall != null && targetBall !== member.targetBall) {
          return {
            ok: false,
            issues: [
              {
                code: "TARGET_BALL_CONFLICT",
                reason: `Exact balls ${positionId} has conflicting targetBall`,
                familyId: member.familyId,
                memberId: member.memberId,
              },
            ],
          };
        }
        targetBall = member.targetBall;
      }

      const master = masterById.get(member.familyId)!;
      try {
        const partial = hydrateFamilyMemberToPositionRecord(master, member, {
          slot,
          positionId,
          schemaVersion: 1,
        });
        const entry = partial.strategies[slot];
        if (!entry) {
          return {
            ok: false,
            issues: [
              {
                code: "HYDRATE_FAILED",
                reason: `hydrate produced no strategies.${slot}`,
                familyId: member.familyId,
                memberId: member.memberId,
                sourceSlot: slot,
              },
            ],
          };
        }
        strategies[slot] = entry;
      } catch (e) {
        return {
          ok: false,
          issues: [
            {
              code: "HYDRATE_FAILED",
              reason: e instanceof Error ? e.message : String(e),
              familyId: member.familyId,
              memberId: member.memberId,
              sourceSlot: slot,
            },
          ],
        };
      }
    }

    const record: PositionRecord = {
      positionId,
      balls: cloneBall3(bucket.balls),
      strategies,
      schemaVersion: 1,
    };
    if (targetBall === "yellow" || targetBall === "red") {
      record.targetBall = targetBall;
    }
    dataset.push(record);
  }

  dataset.sort((a, b) => a.positionId.localeCompare(b.positionId));

  return {
    ok: true,
    dataset,
    recordCount: dataset.length,
    memberCount: args.members.length,
  };
}
