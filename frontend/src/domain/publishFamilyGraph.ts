/**
 * Normalized History publish graph (one FamilyMaster + every FamilyMember).
 *
 * Stored on new History snapshots as the approved Publish input.
 * Distinct from the legacy flat PublishFamilyPayload (PositionRecord[] with
 * Family common values repeated per slot), which stays read-only compatible.
 */

import {
  composeNormalizedDatasetEnvelope,
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
} from "./dataset/normalizedDatasetEnvelope";
import type { FamilyMaster, FamilyMember } from "./family/familyNormalizedSchema";
import { isValidFamilyId } from "./family/familyIdentity";
import { migratePositionRecordsToFamilyParts } from "./family/migratePositionRecordsToFamilyParts";
import { rematerializeFamilyPartsToPositionRecords } from "./family/rematerializeFamilyPartsToPositionRecords";
import {
  extractFamilyScopedRecords,
  PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION,
  validatePublishFamilyPayload,
  type ValidatePublishFamilyPayloadResult,
} from "./publishFamilyPayload";
import { validatePublishOperation, type PublishOperation } from "./publishOperation";
import type { PositionRecord } from "./positionSearchEngine";

export const PUBLISH_FAMILY_GRAPH_KIND = "NORMALIZED_FAMILY_GRAPH" as const;
export const PUBLISH_FAMILY_GRAPH_SCHEMA_VERSION = 1 as const;

export type PublishFamilyGraph = {
  kind: typeof PUBLISH_FAMILY_GRAPH_KIND;
  schemaVersion: typeof PUBLISH_FAMILY_GRAPH_SCHEMA_VERSION;
  familyId: string;
  master: FamilyMaster;
  members: FamilyMember[];
};

export type PublishFamilyGraphResult =
  | { ok: true; graph: PublishFamilyGraph }
  | { ok: false; reason: string; issues: string[] };

const DEFAULT_SHOT_TYPE = "뒤돌리기";
const DEFAULT_SYSTEM_ID = "5_half_system";

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isDerivedMemberOrigin(origin: unknown): boolean {
  return typeof origin === "string" && origin.startsWith("DERIVED_");
}

/** Pick one Family slice out of a validated normalized envelope. */
export function buildPublishFamilyGraphFromEnvelope(
  envelope: NormalizedDatasetEnvelope,
  familyId: string
): PublishFamilyGraphResult {
  const id = trimId(familyId);
  if (!isValidFamilyId(id)) {
    return { ok: false, reason: "family-id-invalid", issues: [`familyId:${id || "empty"}`] };
  }
  const master = envelope.familyMasters.find((m) => m.familyId === id);
  if (!master) {
    return { ok: false, reason: "family-master-missing", issues: [`family:${id}`] };
  }
  const members = envelope.familyMembers.filter((m) => m.familyId === id);
  if (members.length === 0) {
    return { ok: false, reason: "family-members-missing", issues: [`family:${id}`] };
  }
  return validatePublishFamilyGraph({
    kind: PUBLISH_FAMILY_GRAPH_KIND,
    schemaVersion: PUBLISH_FAMILY_GRAPH_SCHEMA_VERSION,
    familyId: id,
    master: deepClone(master),
    members: deepClone(members),
  });
}

/**
 * Runtime PositionRecord[] → normalized graph for one Family, using the same
 * migrate + envelope validation as the LocalDB canonical commit.
 */
export function buildPublishFamilyGraphFromRecords(
  records: PositionRecord[] | null | undefined,
  familyId: string,
  meta?: { shotType?: string; systemId?: string }
): PublishFamilyGraphResult {
  const id = trimId(familyId);
  const scoped = extractFamilyScopedRecords(records, id);
  if (scoped.length === 0) {
    return { ok: false, reason: "family-records-missing", issues: [`family:${id || "empty"}`] };
  }
  const migrated = migratePositionRecordsToFamilyParts(scoped);
  if (!migrated.ok) {
    return {
      ok: false,
      reason: "family-migrate-failed",
      issues: migrated.issues.map((i) => `${i.code}:${i.reason}`),
    };
  }
  const parsed = parseNormalizedDatasetEnvelope(
    composeNormalizedDatasetEnvelope({
      shotType: meta?.shotType || DEFAULT_SHOT_TYPE,
      systemId: meta?.systemId || DEFAULT_SYSTEM_ID,
      masters: migrated.masters,
      members: migrated.members,
    })
  );
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "family-envelope-invalid",
      issues: parsed.issues.map((i) => `${i.code}:${i.reason}`),
    };
  }
  return buildPublishFamilyGraphFromEnvelope(parsed.envelope, id);
}

/** Fail-closed structural + normalized-envelope validation. */
export function validatePublishFamilyGraph(raw: unknown): PublishFamilyGraphResult {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "publish-family-graph-missing", issues: ["graph:not-object"] };
  }
  const g = raw as Record<string, unknown>;
  const issues: string[] = [];
  if (g.kind !== PUBLISH_FAMILY_GRAPH_KIND) issues.push("kind:invalid");
  if (g.schemaVersion !== PUBLISH_FAMILY_GRAPH_SCHEMA_VERSION) issues.push("schemaVersion:invalid");
  const familyId = trimId(g.familyId);
  if (!isValidFamilyId(familyId)) issues.push("familyId:invalid");
  const master = g.master as FamilyMaster | undefined;
  if (!master || typeof master !== "object") issues.push("master:missing");
  else if (master.familyId !== familyId) issues.push("master:familyId-mismatch");
  if (!Array.isArray(g.members) || g.members.length === 0) issues.push("members:empty");
  if (issues.length > 0) {
    return { ok: false, reason: "publish-family-graph-invalid", issues };
  }

  const members = g.members as FamilyMember[];
  for (const m of members) {
    if (m?.familyId !== familyId) {
      issues.push(`member:${m?.memberId ?? "?"}:familyId-mismatch`);
    }
  }
  if (issues.length > 0) {
    return { ok: false, reason: "publish-family-graph-invalid", issues };
  }

  const signature = (master as FamilyMaster).signature as
    | { shotType?: unknown; systemId?: unknown }
    | undefined;
  const parsed = parseNormalizedDatasetEnvelope(
    composeNormalizedDatasetEnvelope({
      shotType: trimId(signature?.shotType) || DEFAULT_SHOT_TYPE,
      systemId: trimId(signature?.systemId) || DEFAULT_SYSTEM_ID,
      masters: [master as FamilyMaster],
      members,
    })
  );
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "publish-family-graph-invalid",
      issues: parsed.issues.map((i) => `${i.code}:${i.reason}`),
    };
  }

  return {
    ok: true,
    graph: {
      kind: PUBLISH_FAMILY_GRAPH_KIND,
      schemaVersion: PUBLISH_FAMILY_GRAPH_SCHEMA_VERSION,
      familyId,
      master: deepClone(parsed.envelope.familyMasters[0]!),
      members: deepClone(parsed.envelope.familyMembers),
    },
  };
}

/** Fail-closed when the field is present but invalid. */
export function readPublishFamilyGraphFromSnapshot(
  snapshot: { publishFamilyGraph?: unknown } | null | undefined
): PublishFamilyGraphResult | { ok: true; graph: null; absent: true } {
  if (!snapshot || !Object.prototype.hasOwnProperty.call(snapshot, "publishFamilyGraph")) {
    return { ok: true, graph: null, absent: true };
  }
  return validatePublishFamilyGraph(snapshot.publishFamilyGraph);
}

/**
 * Publish-execution bridge: graph → flat PublishFamilyPayload for the existing
 * leaf mutation / occupancy pipeline. Never stored back into History.
 */
export function convertPublishFamilyGraphToPublishFamilyPayload(
  graph: PublishFamilyGraph
): ValidatePublishFamilyPayloadResult {
  const validated = validatePublishFamilyGraph(graph);
  if (!validated.ok) return validated;
  const rematerialized = rematerializeFamilyPartsToPositionRecords({
    masters: [validated.graph.master],
    members: validated.graph.members,
  });
  if (!rematerialized.ok) {
    return {
      ok: false,
      reason: "publish-family-graph-rematerialize-failed",
      issues: rematerialized.issues.map((i) => `${i.code}:${i.reason}`),
    };
  }
  return validatePublishFamilyPayload({
    schemaVersion: PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION,
    familyId: validated.graph.familyId,
    records: rematerialized.dataset,
  });
}

export function countPublishFamilyGraphMembersByOrigin(
  graph: Pick<PublishFamilyGraph, "members">
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of graph.members ?? []) {
    const key = String(m.memberOrigin);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** DERIVED_* Members only (AUTHORED / SYMMETRY excluded). */
export function countPublishFamilyGraphDerivedMembers(
  graph: Pick<PublishFamilyGraph, "members">
): number {
  return (graph.members ?? []).filter((m) => isDerivedMemberOrigin(m.memberOrigin)).length;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function graphFingerprint(graph: Pick<PublishFamilyGraph, "familyId" | "master" | "members">): string {
  const members = [...(graph.members ?? [])].sort((a, b) =>
    String(a.memberId).localeCompare(String(b.memberId))
  );
  return stableStringify({ familyId: graph.familyId, master: graph.master, members });
}

/** Semantic equality: same Master + same Member set (order-independent). */
export function publishFamilyGraphsEqual(
  a: Pick<PublishFamilyGraph, "familyId" | "master" | "members"> | null | undefined,
  b: Pick<PublishFamilyGraph, "familyId" | "master" | "members"> | null | undefined
): boolean {
  if (!a || !b) return false;
  return graphFingerprint(a) === graphFingerprint(b);
}

export function crossValidateOperationAndGraph(
  operation: PublishOperation,
  graph: PublishFamilyGraph
): { ok: true } | { ok: false; reason: string; issues: string[] } {
  const op = validatePublishOperation(operation);
  if (!op.ok) return { ok: false, reason: op.reason, issues: op.issues };
  if (op.operation.destinationFamilyId !== graph.familyId) {
    return {
      ok: false,
      reason: "operation-graph-family-mismatch",
      issues: [`destination:${op.operation.destinationFamilyId}`, `graph:${graph.familyId}`],
    };
  }
  return { ok: true };
}
