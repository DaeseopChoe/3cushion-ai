/**
 * Phase 3A-324 B5 — Compatibility read adapter.
 *
 * family_masters + family_members
 *   → validateFamilyStore (fail-closed)
 *   → hydrateFamilyMemberToPositionRecord
 *   → PositionRecord[]
 *
 * Does NOT mutate positions_dataset, React state, History, SAVE, Search, or Export.
 * Production App must not call this until a later gated phase (flag remains OFF).
 */

import type { PositionRecord } from "../positionSearchEngine";
import { hydrateFamilyMemberToPositionRecord } from "./familyHydrate";
import {
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "./familyNormalizedSchema";
import {
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
  validateFamilyStore,
  type FamilyStoreValidationFail,
} from "./familyNormalizedStore";

export type FamilyCompatibleReadIssue = {
  code: FamilyStoreValidationFail["code"] | "SCHEMA_MISMATCH" | "HYDRATE_FAILED";
  reason: string;
  familyId?: string;
  memberId?: string;
};

export type LoadFamilyCompatibleDatasetSuccess = {
  ok: true;
  dataset: PositionRecord[];
  source: "normalized";
  masterCount: number;
  memberCount: number;
};

export type LoadFamilyCompatibleDatasetFailure = {
  ok: false;
  issues: FamilyCompatibleReadIssue[];
};

export type LoadFamilyCompatibleDatasetResult =
  | LoadFamilyCompatibleDatasetSuccess
  | LoadFamilyCompatibleDatasetFailure;

/**
 * Read-only: load validated normalized stores and hydrate to PositionRecord[].
 * Partial/corrupt stores → fail-closed (no partial dataset).
 */
export function loadFamilyCompatibleDataset(): LoadFamilyCompatibleDatasetResult {
  const mastersEnv = loadFamilyMastersEnvelope();
  const membersEnv = loadFamilyMembersEnvelope();

  if (
    mastersEnv.schemaVersion !== FAMILY_NORMALIZED_SCHEMA_VERSION ||
    membersEnv.schemaVersion !== FAMILY_NORMALIZED_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      issues: [
        {
          code: "SCHEMA_MISMATCH",
          reason: `expected schemaVersion ${FAMILY_NORMALIZED_SCHEMA_VERSION}, got masters=${mastersEnv.schemaVersion} members=${membersEnv.schemaVersion}`,
        },
      ],
    };
  }

  const validation = validateFamilyStore(mastersEnv, membersEnv);
  if (!validation.ok) {
    return {
      ok: false,
      issues: [
        {
          code: validation.code,
          reason: validation.reason,
        },
      ],
    };
  }

  const masters = mastersEnv.masters;
  const members = Object.values(membersEnv.members);

  // Preserve store insertion order (migration persist order) — no extra alphabetic reorder.
  const dataset: PositionRecord[] = [];
  for (const member of members) {
    const master: FamilyMaster | undefined = masters[member.familyId];
    if (!master) {
      return {
        ok: false,
        issues: [
          {
            code: "ORPHAN_MEMBER",
            reason: `hydrate aborted: missing Master for member ${member.memberId}`,
            familyId: member.familyId,
            memberId: member.memberId,
          },
        ],
      };
    }
    try {
      dataset.push(hydrateFamilyMemberToPositionRecord(master, member));
    } catch (e) {
      return {
        ok: false,
        issues: [
          {
            code: "HYDRATE_FAILED",
            reason: e instanceof Error ? e.message : String(e),
            familyId: member.familyId,
            memberId: member.memberId,
          },
        ],
      };
    }
  }

  return {
    ok: true,
    dataset,
    source: "normalized",
    masterCount: validation.masterCount,
    memberCount: validation.memberCount,
  };
}

/**
 * Test/helper: hydrate an in-memory Master+Member set without touching localStorage.
 * Still fail-closed if any member cannot resolve its master.
 */
export function hydrateFamilyPartsToCompatibleDataset(args: {
  masters: FamilyMaster[];
  members: FamilyMember[];
}): LoadFamilyCompatibleDatasetResult {
  const masterById = new Map(args.masters.map((m) => [m.familyId, m]));
  const dataset: PositionRecord[] = [];
  for (const member of args.members) {
    const master = masterById.get(member.familyId);
    if (!master) {
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
    try {
      dataset.push(hydrateFamilyMemberToPositionRecord(master, member));
    } catch (e) {
      return {
        ok: false,
        issues: [
          {
            code: "HYDRATE_FAILED",
            reason: e instanceof Error ? e.message : String(e),
            familyId: member.familyId,
            memberId: member.memberId,
          },
        ],
      };
    }
  }
  return {
    ok: true,
    dataset,
    source: "normalized",
    masterCount: args.masters.length,
    memberCount: args.members.length,
  };
}
