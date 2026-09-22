/**
 * Phase D-2 — Serialize / read-back verify for NormalizedDatasetEnvelope leaves.
 * Parallel to publishedWrite.ts (flat Manual Export path). No filesystem.
 */

import {
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
} from "./dataset/normalizedDatasetEnvelope";
import { normalizedPublishedLeavesSemanticallyEqual } from "./publishedNormalizedLeafMutation";

export type SerializeNormalizedResult =
  | { ok: true; text: string }
  | { ok: false; reason: string; issues: string[] };

export type VerifyNormalizedReadBackResult =
  | { ok: true; envelope: NormalizedDatasetEnvelope }
  | { ok: false; reason: string; issues: string[] };

export type VerifiedNormalizedWriteResult =
  | {
      ok: true;
      envelope: NormalizedDatasetEnvelope;
      restored: false;
    }
  | {
      ok: false;
      reason: string;
      issues: string[];
      restored?: boolean;
      restoreFailed?: boolean;
    };

/**
 * Deterministic normalized leaf JSON (2-space indent; matches existing Export style).
 */
export function serializeNormalizedCandidate(
  candidate: NormalizedDatasetEnvelope
): SerializeNormalizedResult {
  try {
    if (candidate == null || typeof candidate !== "object") {
      return {
        ok: false,
        reason: "serialize-invalid-candidate",
        issues: ["candidate:not-object"],
      };
    }
    const gate = parseNormalizedDatasetEnvelope(candidate);
    if (!gate.ok) {
      return {
        ok: false,
        reason: "serialize-validation-failed",
        issues: gate.issues.map((i) => `${i.code}:${i.reason}`),
      };
    }
    const text = JSON.stringify(gate.envelope, null, 2);
    if (typeof text !== "string" || text.length === 0) {
      return {
        ok: false,
        reason: "serialize-empty",
        issues: ["serialized:empty"],
      };
    }
    const parsed = JSON.parse(text);
    const roundTrip = parseNormalizedDatasetEnvelope(parsed);
    if (!roundTrip.ok) {
      return {
        ok: false,
        reason: "serialize-roundtrip-invalid",
        issues: roundTrip.issues.map((i) => `${i.code}:${i.reason}`),
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
 * Parse + canonical validate + semantic equality vs expected normalized candidate.
 */
export function verifyNormalizedPublishedReadBack(
  expectedCandidate: NormalizedDatasetEnvelope,
  readBackText: string
): VerifyNormalizedReadBackResult {
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

  const parsed = parseNormalizedDatasetEnvelope(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "read-back-validation-failed",
      issues: parsed.issues.map((i) => `${i.code}:${i.reason}`),
    };
  }

  if (
    !normalizedPublishedLeavesSemanticallyEqual(
      expectedCandidate,
      parsed.envelope
    )
  ) {
    return {
      ok: false,
      reason: "read-back-mismatch",
      issues: ["semantic-mismatch"],
    };
  }

  return { ok: true, envelope: parsed.envelope };
}
