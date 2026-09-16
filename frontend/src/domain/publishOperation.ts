/**
 * Phase 3-C1 — Immutable PublishOperation (History / Export command metadata).
 *
 * NOT persisted into positions.json. Destination identity on disk remains
 * StrategyEntry.familyId only.
 *
 * Live editingPublishedFamilyId ≠ immutable sourceFamilyId (mapped at History commit).
 */

import { isValidFamilyId } from "./family/familyIdentity";
import type { FamilySaveIntent } from "./family/familyIdentity";

export const PUBLISH_OPERATION_SCHEMA_VERSION = 1 as const;

export type PublishIntent = "CREATE" | "UPDATE";

export type PublishOperation = {
  schemaVersion: typeof PUBLISH_OPERATION_SCHEMA_VERSION;
  intent: PublishIntent;
  /** Published Search origin family to purge on UPDATE; null on CREATE. */
  sourceFamilyId: string | null;
  /** Family written by SAVE (minted on CREATE; preserved on normal UPDATE). */
  destinationFamilyId: string;
};

export type ValidatePublishOperationResult =
  | { ok: true; operation: PublishOperation }
  | { ok: false; reason: string; issues: string[] };

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Structural validation of PublishOperation (no Published leaf lookup).
 */
export function validatePublishOperation(
  raw: unknown
): ValidatePublishOperationResult {
  if (raw == null || typeof raw !== "object") {
    return {
      ok: false,
      reason: "publish-operation-missing",
      issues: ["operation:not-object"],
    };
  }
  const op = raw as Record<string, unknown>;
  const issues: string[] = [];

  if (op.schemaVersion !== PUBLISH_OPERATION_SCHEMA_VERSION) {
    issues.push("schemaVersion:invalid");
  }
  const intent = op.intent;
  if (intent !== "CREATE" && intent !== "UPDATE") {
    issues.push("intent:invalid");
  }

  const sourceRaw = op.sourceFamilyId;
  const dest = trimId(op.destinationFamilyId);
  if (!isValidFamilyId(dest)) {
    issues.push("destinationFamilyId:invalid");
  }

  if (intent === "CREATE") {
    if (sourceRaw != null && trimId(sourceRaw) !== "") {
      issues.push("CREATE:sourceFamilyId-must-be-null");
    }
  } else if (intent === "UPDATE") {
    const source = trimId(sourceRaw);
    if (!isValidFamilyId(source)) {
      issues.push("UPDATE:sourceFamilyId:invalid");
    }
  }

  if (issues.length > 0) {
    return { ok: false, reason: "publish-operation-invalid", issues };
  }

  const sourceFamilyId =
    intent === "CREATE" ? null : trimId(sourceRaw);

  return {
    ok: true,
    operation: {
      schemaVersion: PUBLISH_OPERATION_SCHEMA_VERSION,
      intent: intent as PublishIntent,
      sourceFamilyId,
      destinationFamilyId: dest,
    },
  };
}

export type BuildPublishOperationFromSaveArgs = {
  saveIntent: "LEGACY" | FamilySaveIntent;
  /** Live session source at SAVE time (editingPublishedFamilyId). */
  editingPublishedFamilyId?: string | null;
  destinationFamilyId?: string | null;
};

/**
 * Map SAVE outcome → immutable PublishOperation.
 * LEGACY / missing destination → null (omit from History; Export uses inference).
 */
export function buildPublishOperationFromSave(
  args: BuildPublishOperationFromSaveArgs
): PublishOperation | null {
  const destinationFamilyId = trimId(args.destinationFamilyId);
  if (!isValidFamilyId(destinationFamilyId)) return null;

  if (args.saveIntent === "CREATE") {
    return {
      schemaVersion: PUBLISH_OPERATION_SCHEMA_VERSION,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId,
    };
  }

  if (args.saveIntent === "UPDATE") {
    const sourceFamilyId = trimId(args.editingPublishedFamilyId);
    // Prefer session source; fall back to destination when policy UPDATE
    // without published-edit session (explicit slot identity path).
    const source = isValidFamilyId(sourceFamilyId)
      ? sourceFamilyId
      : destinationFamilyId;
    const built: PublishOperation = {
      schemaVersion: PUBLISH_OPERATION_SCHEMA_VERSION,
      intent: "UPDATE",
      sourceFamilyId: source,
      destinationFamilyId,
    };
    const validated = validatePublishOperation(built);
    return validated.ok ? validated.operation : null;
  }

  return null;
}

/** Parse optional History field without inventing. */
export function readPublishOperationFromSnapshot(
  snapshot: { publishOperation?: unknown } | null | undefined
): PublishOperation | null {
  if (!snapshot || snapshot.publishOperation == null) return null;
  const validated = validatePublishOperation(snapshot.publishOperation);
  return validated.ok ? validated.operation : null;
}
