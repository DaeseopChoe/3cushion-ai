/**
 * Phase 3A-324 B5 / 3A-345 — Compatibility read adapter.
 *
 * family_masters + family_members
 *   → validateFamilyStore (fail-closed)
 *   → Exact-ball rematerialize (sourceSlot packing)
 *   → PositionRecord[]
 *
 * Does NOT mutate positions_dataset, React state, History, SAVE, Search, or Export.
 * Production App uses this only behind loadProductionCompatibleDataset gate
 * (flag ∧ freshness ∧ hydration success; flag default OFF).
 */

import type { PositionRecord } from "../positionSearchEngine";
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
import {
  rematerializeFamilyPartsToPositionRecords,
  type RematerializeIssueCode,
} from "./rematerializeFamilyPartsToPositionRecords";

export type FamilyCompatibleReadIssue = {
  code:
    | FamilyStoreValidationFail["code"]
    | "SCHEMA_MISMATCH"
    | "HYDRATE_FAILED"
    | RematerializeIssueCode;
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
 * Read-only: load validated normalized stores and rematerialize to PositionRecord[].
 * Partial/corrupt stores or packing collisions → fail-closed (no partial dataset).
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

  const masters = Object.values(mastersEnv.masters);
  const members = Object.values(membersEnv.members);
  const rematerialized = rematerializeFamilyPartsToPositionRecords({
    masters,
    members,
  });
  if (!rematerialized.ok) {
    return {
      ok: false,
      issues: rematerialized.issues.map((issue) => ({
        code: issue.code,
        reason: issue.reason,
        familyId: issue.familyId,
        memberId: issue.memberId,
      })),
    };
  }

  return {
    ok: true,
    dataset: rematerialized.dataset,
    source: "normalized",
    masterCount: validation.masterCount,
    memberCount: validation.memberCount,
  };
}

/**
 * Test/helper: rematerialize an in-memory Master+Member set without touching localStorage.
 * Still fail-closed on packing collision / missing sourceSlot / orphan.
 */
export function hydrateFamilyPartsToCompatibleDataset(args: {
  masters: FamilyMaster[];
  members: FamilyMember[];
}): LoadFamilyCompatibleDatasetResult {
  const rematerialized = rematerializeFamilyPartsToPositionRecords(args);
  if (!rematerialized.ok) {
    return {
      ok: false,
      issues: rematerialized.issues.map((issue) => ({
        code: issue.code,
        reason: issue.reason,
        familyId: issue.familyId,
        memberId: issue.memberId,
      })),
    };
  }
  return {
    ok: true,
    dataset: rematerialized.dataset,
    source: "normalized",
    masterCount: args.masters.length,
    memberCount: args.members.length,
  };
}
