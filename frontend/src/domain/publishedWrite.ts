/**
 * Phase 3-B2 — Failure-safe / verified Published write helpers.
 *
 * Guarantees (application-level, NOT true OS atomic rename):
 * - pre-write validation (caller / internal)
 * - deterministic serialize
 * - UA createWritable temporary backing until close
 * - read-back parse + validate + semantic equivalence
 * - optional memory backup + best-effort restore on post-close verify failure
 *
 * Do not claim "ATOMIC WRITE" in logs or docs.
 */

import type { DatasetExportPayload } from "./datasetExport";
import { normalizeDatasetExport } from "./datasetExport";
import { validatePublishedExportCandidate } from "./publishedFamilyPublish";

/** Minimal File System Access surface for injectable mocks. */
export type PublishedWritableStream = {
  write: (data: string) => Promise<void> | void;
  close: () => Promise<void> | void;
  abort?: () => Promise<void> | void;
};

export type PublishedFileBlob = {
  text: () => Promise<string>;
  size?: number;
};

export type PublishedFileHandleLike = {
  getFile: () => Promise<PublishedFileBlob>;
  createWritable: () => Promise<PublishedWritableStream>;
};

export type SerializePublishedResult =
  | { ok: true; text: string }
  | { ok: false; reason: string; issues: string[] };

export type VerifyReadBackResult =
  | { ok: true; payload: DatasetExportPayload }
  | { ok: false; reason: string; issues: string[] };

export type VerifiedWriteResult =
  | {
      ok: true;
      payload: DatasetExportPayload;
      restored: false;
    }
  | {
      ok: false;
      reason: string;
      issues: string[];
      /** True when originalText restore was attempted and appeared to succeed. */
      restored?: boolean;
      restoreFailed?: boolean;
    };

/**
 * Deterministic Published JSON serialization (matches existing Export formatting).
 */
export function serializePublishedCandidate(
  candidate: DatasetExportPayload
): SerializePublishedResult {
  try {
    if (candidate == null || typeof candidate !== "object") {
      return {
        ok: false,
        reason: "serialize-invalid-candidate",
        issues: ["candidate:not-object"],
      };
    }
    const text = JSON.stringify(candidate, null, 2);
    if (typeof text !== "string" || text.length === 0) {
      return {
        ok: false,
        reason: "serialize-empty",
        issues: ["serialized:empty"],
      };
    }
    // Sanity: must round-trip as JSON object with records array.
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        reason: "serialize-not-object",
        issues: ["serialized:not-object"],
      };
    }
    if (!Array.isArray(parsed.records)) {
      return {
        ok: false,
        reason: "serialize-records-invalid",
        issues: ["serialized.records:not-array"],
      };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      reason: "serialize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }
}

/**
 * Semantic equality after normalizeDatasetExport.
 * Includes exportedAt and sourceSnapshotId — whatever was written must round-trip.
 * Note: pass raw/unnormalized inputs; do not pass an already-normalized payload
 * as one side only (normalize is not guaranteed idempotent on all fields).
 */
export function publishedExportSemanticEqual(
  a: DatasetExportPayload,
  b: DatasetExportPayload
): boolean {
  try {
    const na = normalizeDatasetExport(a);
    const nb = normalizeDatasetExport(b);
    return JSON.stringify(na) === JSON.stringify(nb);
  } catch {
    return false;
  }
}

/**
 * Parse + normalize + validate + semantic-equal against expected candidate.
 */
export function verifyPublishedReadBack(
  expectedCandidate: DatasetExportPayload,
  readBackText: string
): VerifyReadBackResult {
  if (typeof readBackText !== "string" || readBackText.length === 0) {
    return {
      ok: false,
      reason: "read-back-empty",
      issues: ["readBack:empty"],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readBackText);
  } catch (e) {
    return {
      ok: false,
      reason: "read-back-parse-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  let normalized: DatasetExportPayload;
  try {
    normalized = normalizeDatasetExport(raw as DatasetExportPayload);
  } catch (e) {
    return {
      ok: false,
      reason: "read-back-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  const validated = validatePublishedExportCandidate(normalized);
  if (!validated.ok) {
    return {
      ok: false,
      reason: "read-back-validation-failed",
      issues: validated.issues,
    };
  }

  // Compare normalize(expected) to the single normalize(read-back) — avoid
  // re-normalizing `normalized` (normalize is not always idempotent).
  let expectedNorm: DatasetExportPayload;
  try {
    expectedNorm = normalizeDatasetExport(expectedCandidate);
  } catch (e) {
    return {
      ok: false,
      reason: "expected-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }
  if (JSON.stringify(expectedNorm) !== JSON.stringify(normalized)) {
    return {
      ok: false,
      reason: "read-back-mismatch",
      issues: ["candidate-read-back-not-equivalent"],
    };
  }

  return { ok: true, payload: normalized };
}

async function bestEffortRestoreOriginal(
  fileHandle: PublishedFileHandleLike,
  originalText: string
): Promise<{ restored: boolean; restoreFailed: boolean }> {
  try {
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(originalText);
      await writable.close();
      return { restored: true, restoreFailed: false };
    } catch (e) {
      try {
        await writable.abort?.();
      } catch {
        /* ignore abort errors */
      }
      throw e;
    }
  } catch {
    return { restored: false, restoreFailed: true };
  }
}

/**
 * Verified Published write:
 * validate → serialize → (optional backup already held) → write/close →
 * read-back → verify → on failure best-effort restore originalText.
 *
 * Does NOT refresh cache or set History exported — caller owns sequencing.
 */
export async function writeVerifiedPublishedFile(args: {
  fileHandle: PublishedFileHandleLike;
  candidate: DatasetExportPayload;
  /** Prior file contents for best-effort restore; null/undefined = new file / no restore. */
  originalText?: string | null;
  /** When false, skip internal validate (caller already gated). Default true. */
  revalidate?: boolean;
}): Promise<VerifiedWriteResult> {
  const { fileHandle, candidate, originalText = null, revalidate = true } =
    args;

  if (revalidate) {
    const gate = validatePublishedExportCandidate(candidate);
    if (!gate.ok) {
      return {
        ok: false,
        reason: "pre-write-validation-failed",
        issues: gate.issues,
      };
    }
  }

  const serialized = serializePublishedCandidate(candidate);
  if (!serialized.ok) {
    return {
      ok: false,
      reason: serialized.reason,
      issues: serialized.issues,
    };
  }

  let writable: PublishedWritableStream | null = null;
  try {
    writable = await fileHandle.createWritable();
    await writable.write(serialized.text);
    await writable.close();
    writable = null;
  } catch (e) {
    try {
      await writable?.abort?.();
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      reason: "write-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  let readBackText: string;
  try {
    const file = await fileHandle.getFile();
    readBackText = await file.text();
  } catch (e) {
    const restore =
      typeof originalText === "string"
        ? await bestEffortRestoreOriginal(fileHandle, originalText)
        : { restored: false, restoreFailed: false };
    return {
      ok: false,
      reason: "read-back-io-failed",
      issues: [e instanceof Error ? e.message : String(e)],
      restored: restore.restored,
      restoreFailed: restore.restoreFailed,
    };
  }

  const verified = verifyPublishedReadBack(candidate, readBackText);
  if (!verified.ok) {
    const restore =
      typeof originalText === "string"
        ? await bestEffortRestoreOriginal(fileHandle, originalText)
        : { restored: false, restoreFailed: false };
    return {
      ok: false,
      reason: verified.reason,
      issues: verified.issues,
      restored: restore.restored,
      restoreFailed: restore.restoreFailed,
    };
  }

  return { ok: true, payload: verified.payload, restored: false };
}
