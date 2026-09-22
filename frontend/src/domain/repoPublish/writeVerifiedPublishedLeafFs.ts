/**
 * Phase 4-A / D-2 — Failure-safe / verified Node FS write for Normalized leaves.
 *
 * Not "guaranteed atomic". Strategy: sibling temp → write → read-back temp →
 * replace target (Windows-safe) → read-back target → semantic verify →
 * best-effort restore from memory backup on failure.
 *
 * Candidate type: NormalizedDatasetEnvelope (schemaVersion 3).
 */

import fs from "node:fs";
import path from "node:path";
import {
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
} from "../dataset/normalizedDatasetEnvelope";
import {
  serializeNormalizedCandidate,
  verifyNormalizedPublishedReadBack,
  type VerifiedNormalizedWriteResult,
} from "../publishedNormalizedWrite";

export type WriteVerifiedPublishedLeafFsArgs = {
  absoluteTargetPath: string;
  candidate: NormalizedDatasetEnvelope;
  /** Prior file contents for best-effort restore; null = new file. */
  originalText?: string | null;
  revalidate?: boolean;
};

function bestEffortRestoreFile(
  absoluteTargetPath: string,
  originalText: string | null | undefined
): { restored: boolean; restoreFailed: boolean } {
  if (typeof originalText !== "string") {
    try {
      if (fs.existsSync(absoluteTargetPath)) {
        fs.unlinkSync(absoluteTargetPath);
      }
      return { restored: true, restoreFailed: false };
    } catch {
      return { restored: false, restoreFailed: true };
    }
  }
  try {
    fs.mkdirSync(path.dirname(absoluteTargetPath), { recursive: true });
    fs.writeFileSync(absoluteTargetPath, originalText, "utf8");
    return { restored: true, restoreFailed: false };
  } catch {
    return { restored: false, restoreFailed: true };
  }
}

function replaceTargetFromTemp(
  absoluteTargetPath: string,
  tempPath: string
): void {
  if (fs.existsSync(absoluteTargetPath)) {
    fs.unlinkSync(absoluteTargetPath);
  }
  fs.renameSync(tempPath, absoluteTargetPath);
}

/**
 * Verified repo leaf write (Node FS) for NormalizedDatasetEnvelope.
 * Does NOT claim true OS atomic rename guarantees.
 */
export function writeVerifiedPublishedLeafFs(
  args: WriteVerifiedPublishedLeafFsArgs
): VerifiedNormalizedWriteResult {
  const {
    absoluteTargetPath,
    candidate,
    originalText = null,
    revalidate = true,
  } = args;

  if (
    typeof absoluteTargetPath !== "string" ||
    !absoluteTargetPath.trim() ||
    !path.isAbsolute(absoluteTargetPath)
  ) {
    return {
      ok: false,
      reason: "target-path-invalid",
      issues: ["absoluteTargetPath:invalid"],
    };
  }

  if (revalidate) {
    const gate = parseNormalizedDatasetEnvelope(candidate);
    if (!gate.ok) {
      return {
        ok: false,
        reason: "pre-write-validation-failed",
        issues: gate.issues.map((i) => `${i.code}:${i.reason}`),
      };
    }
  }

  const serialized = serializeNormalizedCandidate(candidate);
  if (!serialized.ok) {
    return {
      ok: false,
      reason: serialized.reason,
      issues: serialized.issues,
    };
  }

  const dir = path.dirname(absoluteTargetPath);
  const tempPath = path.join(
    dir,
    `.${path.basename(absoluteTargetPath)}.${process.pid}.${Date.now()}.tmp`
  );

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tempPath, serialized.text, "utf8");
  } catch (e) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      reason: "temp-write-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  let tempText: string;
  try {
    tempText = fs.readFileSync(tempPath, "utf8");
  } catch (e) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      reason: "temp-read-back-io-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  const tempVerified = verifyNormalizedPublishedReadBack(candidate, tempText);
  if (!tempVerified.ok) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      reason: tempVerified.reason,
      issues: tempVerified.issues,
    };
  }

  try {
    replaceTargetFromTemp(absoluteTargetPath, tempPath);
  } catch (e) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    const restore = bestEffortRestoreFile(absoluteTargetPath, originalText);
    return {
      ok: false,
      reason: "replace-target-failed",
      issues: [e instanceof Error ? e.message : String(e)],
      restored: restore.restored,
      restoreFailed: restore.restoreFailed,
    };
  }

  let readBackText: string;
  try {
    readBackText = fs.readFileSync(absoluteTargetPath, "utf8");
  } catch (e) {
    const restore = bestEffortRestoreFile(absoluteTargetPath, originalText);
    return {
      ok: false,
      reason: "target-read-back-io-failed",
      issues: [e instanceof Error ? e.message : String(e)],
      restored: restore.restored,
      restoreFailed: restore.restoreFailed,
    };
  }

  const verified = verifyNormalizedPublishedReadBack(candidate, readBackText);
  if (!verified.ok) {
    const restore = bestEffortRestoreFile(absoluteTargetPath, originalText);
    return {
      ok: false,
      reason: verified.reason,
      issues: verified.issues,
      restored: restore.restored,
      restoreFailed: restore.restoreFailed,
    };
  }

  return {
    ok: true,
    envelope: verified.envelope,
    restored: false,
  };
}
