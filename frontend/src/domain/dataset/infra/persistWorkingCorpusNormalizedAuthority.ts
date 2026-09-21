/**
 * Phase B-1 — Production WRITE orchestrator.
 *
 * Order (reversed from dual-write era):
 *   1. PositionRecord[] candidate (in memory from SAVE/Approval writers)
 *   2. migrate → NormalizedDatasetEnvelope
 *   3. validate + ONE canonical durable commit
 *   4. optional flat positions_dataset compatibility projection
 *   5. optional family_* shadow (best-effort; never gates SAVE success)
 *
 * SAVE success = step 3 only.
 */

import type { PositionRecord } from "../../positionSearchEngine";
import { systemIdToFolderLabel } from "../../datasetPath";
import {
  composeNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
  type NormalizedDatasetIssue,
} from "../normalizedDatasetEnvelope";
import { migratePositionRecordsToFamilyParts } from "../../family/migratePositionRecordsToFamilyParts";
import {
  syncPositionDatasetToNormalizedFamilyStore,
  type NormalizedDualWriteResult,
} from "../../family/syncPositionDatasetToNormalizedFamilyStore";
import {
  persistPositionsDatasetWithGeneration,
  type PersistPositionsWithGenerationResult,
} from "./persistPositionsDatasetWithGeneration";
import {
  commitCanonicalNormalizedCorpus,
  type CommitCanonicalNormalizedCorpusResult,
} from "./canonicalNormalizedCorpusStore";

export type PersistWorkingCorpusNormalizedAuthorityArgs = {
  dataset: PositionRecord[] | null | undefined;
  shotType: string;
  systemId: string;
  systemLabel?: string;
  /**
   * When true (default), write positions_dataset after canonical success.
   * Compatibility projection only — not WRITE authority.
   */
  writeFlatCompatibility?: boolean;
  /**
   * When true (default), best-effort family_* shadow after flat generation bump.
   * Never fails the overall persist when canonical succeeded.
   */
  writeFamilyShadow?: boolean;
};

export type PersistWorkingCorpusNormalizedAuthoritySuccess = {
  ok: true;
  envelope: NormalizedDatasetEnvelope;
  canonical: CommitCanonicalNormalizedCorpusResult & { ok: true };
  flatProjection: PersistPositionsWithGenerationResult;
  shadowSync: NormalizedDualWriteResult | { ok: false; stage: "skipped"; reason: string };
  corpusGeneration: number | null;
};

export type PersistWorkingCorpusNormalizedAuthorityFailure = {
  ok: false;
  stage: "migrate" | "compose" | "canonical";
  reason: string;
  issues?: NormalizedDatasetIssue[];
  migrationIssues?: unknown[];
  canonical?: CommitCanonicalNormalizedCorpusResult;
};

export type PersistWorkingCorpusNormalizedAuthorityResult =
  | PersistWorkingCorpusNormalizedAuthoritySuccess
  | PersistWorkingCorpusNormalizedAuthorityFailure;

/**
 * Promote working PositionRecord[] corpus to canonical normalized authority.
 */
export function persistWorkingCorpusNormalizedAuthority(
  args: PersistWorkingCorpusNormalizedAuthorityArgs
): PersistWorkingCorpusNormalizedAuthorityResult {
  const records = Array.isArray(args.dataset) ? args.dataset : [];
  const shotType =
    typeof args.shotType === "string" && args.shotType.trim()
      ? args.shotType.trim()
      : "뒤돌리기";
  const systemId =
    typeof args.systemId === "string" && args.systemId.trim()
      ? args.systemId.trim()
      : "5_half_system";
  const systemLabel =
    (typeof args.systemLabel === "string" && args.systemLabel.trim()
      ? args.systemLabel.trim()
      : "") || systemIdToFolderLabel(systemId);

  const migrated = migratePositionRecordsToFamilyParts(records);
  if (!migrated.ok) {
    return {
      ok: false,
      stage: "migrate",
      reason:
        migrated.issues[0]?.reason ??
        `migration failed (${migrated.issues.length} issue(s))`,
      migrationIssues: migrated.issues,
    };
  }

  const composed = composeNormalizedDatasetEnvelope({
    shotType,
    systemId,
    systemLabel,
    masters: migrated.masters,
    members: migrated.members,
  });

  const canonical = commitCanonicalNormalizedCorpus(composed);
  if (!canonical.ok) {
    return {
      ok: false,
      stage: "canonical",
      reason: canonical.reason,
      issues: canonical.issues,
      canonical,
    };
  }

  const writeFlat = args.writeFlatCompatibility !== false;
  let flatProjection: PersistPositionsWithGenerationResult;
  if (writeFlat) {
    flatProjection = persistPositionsDatasetWithGeneration(records);
  } else {
    flatProjection = {
      ok: false,
      stage: "positions",
      reason: "flat compatibility write skipped",
      previousGeneration: null,
    };
  }

  let shadowSync: PersistWorkingCorpusNormalizedAuthoritySuccess["shadowSync"];
  const writeShadow = args.writeFamilyShadow !== false;
  if (
    writeShadow &&
    flatProjection.ok &&
    typeof flatProjection.corpusGeneration === "number"
  ) {
    shadowSync = syncPositionDatasetToNormalizedFamilyStore(records, {
      corpusGeneration: flatProjection.corpusGeneration,
    });
  } else {
    shadowSync = {
      ok: false,
      stage: "skipped",
      reason: writeShadow
        ? "flat compatibility generation unavailable; family_* shadow skipped"
        : "family_* shadow write skipped",
    };
  }

  return {
    ok: true,
    envelope: canonical.envelope,
    canonical,
    flatProjection,
    shadowSync,
    corpusGeneration: flatProjection.ok ? flatProjection.corpusGeneration : null,
  };
}
