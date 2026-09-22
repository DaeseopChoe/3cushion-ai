/**
 * Phase B-1 / C-2 — Canonical Local durable SSOT: single-key NormalizedDatasetEnvelope.
 *
 * AUTHORITATIVE: localStorage key CANONICAL_NORMALIZED_CORPUS_KEY (`normalized_dataset`)
 * Phase C-2: positions_dataset / family_masters / family_members are NOT production
 * durable mirrors or App-load fallbacks (stale browser keys are ignored).
 *
 * Storage commit = one localStorage.setItem replacement (not a DB transaction).
 * Validate + serialize before write; read-back parse required for success.
 */

import { systemIdToFolderLabel } from "../../datasetPath";
import {
  NORMALIZED_DATASET_SCHEMA_VERSION,
  composeNormalizedDatasetEnvelope,
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
  type NormalizedDatasetIssue,
  type ParseNormalizedDatasetResult,
} from "../normalizedDatasetEnvelope";
import type { FamilyMaster, FamilyMember } from "../../family/familyNormalizedSchema";

/** Single authoritative durable corpus key (Local WRITE SSOT). */
export const CANONICAL_NORMALIZED_CORPUS_KEY = "normalized_dataset";

export type CanonicalCorpusMeta = {
  shotType: string;
  systemId: string;
  systemLabel?: string;
};

export type LoadCanonicalNormalizedCorpusResult =
  | { ok: true; envelope: NormalizedDatasetEnvelope; present: true }
  | { ok: true; envelope: NormalizedDatasetEnvelope; present: false }
  | { ok: false; reason: string; issues?: NormalizedDatasetIssue[] };

export type CommitCanonicalNormalizedCorpusSuccess = {
  ok: true;
  envelope: NormalizedDatasetEnvelope;
  serializedBytes: number;
};

export type CommitCanonicalNormalizedCorpusFailure = {
  ok: false;
  stage: "validate" | "serialize" | "write" | "readback";
  reason: string;
  issues?: NormalizedDatasetIssue[];
};

export type CommitCanonicalNormalizedCorpusResult =
  | CommitCanonicalNormalizedCorpusSuccess
  | CommitCanonicalNormalizedCorpusFailure;

/** Test-only failure injection. Never set in production. */
export type CanonicalCommitTestForceFail =
  | "serialize"
  | "write"
  | "readback"
  | null;

let testForceFail: CanonicalCommitTestForceFail = null;

export function forceCanonicalCommitFailureForTests(
  stage: CanonicalCommitTestForceFail
): void {
  testForceFail = stage;
}

export function clearCanonicalCommitFailureForTests(): void {
  testForceFail = null;
}

function trimStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Valid empty corpus (zero Families). Dataset-wide emptiness is legal;
 * per-Family AUTHORED/Member invariants apply only when Masters exist.
 */
export function createEmptyCanonicalNormalizedCorpus(
  meta: CanonicalCorpusMeta
): NormalizedDatasetEnvelope {
  const systemId = trimStr(meta.systemId);
  const shotType = trimStr(meta.shotType);
  const systemLabel =
    trimStr(meta.systemLabel) ||
    (systemId ? systemIdToFolderLabel(systemId) : "");
  return {
    schemaVersion: NORMALIZED_DATASET_SCHEMA_VERSION,
    shotType,
    systemId,
    systemLabel,
    familyMasters: [],
    familyMembers: [],
  };
}

/**
 * Load authoritative normalized corpus.
 * Missing key → present:false + empty envelope (caller supplies meta for empty).
 * Corrupt key → ok:false (do not silently treat as empty authority).
 */
export function loadCanonicalNormalizedCorpus(
  emptyMeta?: CanonicalCorpusMeta
): LoadCanonicalNormalizedCorpusResult {
  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, reason: "localStorage is not available" };
    }
    const rawText = localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY);
    if (rawText == null) {
      const meta = emptyMeta ?? {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      };
      return {
        ok: true,
        present: false,
        envelope: createEmptyCanonicalNormalizedCorpus(meta),
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return {
        ok: false,
        reason: e instanceof Error ? e.message : "JSON parse failed",
      };
    }
    const validated = parseNormalizedDatasetEnvelope(parsed);
    if (!validated.ok) {
      return {
        ok: false,
        reason: validated.issues[0]?.reason ?? "normalized corpus invalid",
        issues: validated.issues,
      };
    }
    return { ok: true, present: true, envelope: validated.envelope };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Durable commit: validate → serialize → one setItem → read-back parse.
 * On any failure after validate, previous localStorage value is left unchanged
 * (setItem not called, or failed before replace).
 */
export function commitCanonicalNormalizedCorpus(
  candidate: unknown
): CommitCanonicalNormalizedCorpusResult {
  const validated = parseNormalizedDatasetEnvelope(candidate);
  if (!validated.ok) {
    return {
      ok: false,
      stage: "validate",
      reason: validated.issues[0]?.reason ?? "validation failed",
      issues: validated.issues,
    };
  }

  let serialized: string;
  try {
    if (testForceFail === "serialize") {
      throw new Error("forced serialize failure (test)");
    }
    serialized = JSON.stringify(validated.envelope);
  } catch (e) {
    return {
      ok: false,
      stage: "serialize",
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    if (typeof localStorage === "undefined") {
      return {
        ok: false,
        stage: "write",
        reason: "localStorage is not available",
      };
    }
    if (testForceFail === "write") {
      return {
        ok: false,
        stage: "write",
        reason: "forced write failure (test)",
      };
    }
    localStorage.setItem(CANONICAL_NORMALIZED_CORPUS_KEY, serialized);
  } catch (e) {
    return {
      ok: false,
      stage: "write",
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    if (testForceFail === "readback") {
      return {
        ok: false,
        stage: "readback",
        reason: "forced readback failure (test)",
      };
    }
    const rawText = localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY);
    if (rawText == null) {
      return {
        ok: false,
        stage: "readback",
        reason: "canonical key missing after write",
      };
    }
    const readback = parseNormalizedDatasetEnvelope(JSON.parse(rawText));
    if (!readback.ok) {
      return {
        ok: false,
        stage: "readback",
        reason: readback.issues[0]?.reason ?? "readback validation failed",
        issues: readback.issues,
      };
    }
    if (rawText !== serialized) {
      // Structural equality via re-parse is enough; byte mismatch after JSON roundtrip
      // is still ok if parse matches. Prefer semantic check:
      const a = JSON.stringify(validated.envelope);
      const b = JSON.stringify(readback.envelope);
      if (a !== b) {
        return {
          ok: false,
          stage: "readback",
          reason: "readback envelope semantic mismatch",
        };
      }
    }
    return {
      ok: true,
      envelope: readback.envelope,
      serializedBytes: serialized.length,
    };
  } catch (e) {
    return {
      ok: false,
      stage: "readback",
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

export function clearCanonicalNormalizedCorpusForTests(): void {
  try {
    localStorage.removeItem(CANONICAL_NORMALIZED_CORPUS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Merge/replace one Family slice into an in-memory envelope (pure).
 * Does not persist — caller must commitCanonicalNormalizedCorpus.
 */
export function upsertFamilySliceInEnvelope(
  base: NormalizedDatasetEnvelope,
  master: FamilyMaster,
  members: FamilyMember[]
): ParseNormalizedDatasetResult {
  const familyId = trimStr(master.familyId);
  const nextMasters = base.familyMasters.filter((m) => m.familyId !== familyId);
  nextMasters.push(master);
  const nextMembers = base.familyMembers.filter((m) => m.familyId !== familyId);
  for (const member of members) {
    nextMembers.push(member);
  }
  const raw = composeNormalizedDatasetEnvelope({
    shotType: base.shotType,
    systemId: base.systemId,
    systemLabel: base.systemLabel,
    exportedAt: base.exportedAt,
    sourceSnapshotId: base.sourceSnapshotId,
    masters: nextMasters,
    members: nextMembers,
  });
  return parseNormalizedDatasetEnvelope(raw);
}

/**
 * Remove one Family slice (pure). Caller commits.
 */
export function removeFamilySliceFromEnvelope(
  base: NormalizedDatasetEnvelope,
  familyId: string
): ParseNormalizedDatasetResult {
  const id = trimStr(familyId);
  const raw = composeNormalizedDatasetEnvelope({
    shotType: base.shotType,
    systemId: base.systemId,
    systemLabel: base.systemLabel,
    exportedAt: base.exportedAt,
    sourceSnapshotId: base.sourceSnapshotId,
    masters: base.familyMasters.filter((m) => m.familyId !== id),
    members: base.familyMembers.filter((m) => m.familyId !== id),
  });
  return parseNormalizedDatasetEnvelope(raw);
}
