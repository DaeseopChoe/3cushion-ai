/**
 * Published 현황 — size / count summary of one Published leaf.
 *
 * Built host-side from the Production-verified commit blob only (never the
 * working tree, LocalDB or History). Carries counts and byte size, nothing else:
 * no paths, commands, remotes or FamilyMember data. Browser-safe (no Node APIs).
 */

import {
  isNormalizedDataset,
  parseNormalizedDatasetEnvelope,
} from "../dataset/normalizedDatasetEnvelope";

/**
 * Largest Published leaf (UTF-8 bytes) the Publish path reads back: Production
 * read-back response and committed-blob read (verification + 현황) share it.
 * Exactly 12MiB is allowed; one byte more is rejected. Above the 10MiB
 * "분할 전환 필요" status so every 현황 state is reachable on a verified Publish.
 */
export const PUBLISHED_LEAF_MAX_BYTES = 12 * 1024 * 1024;

export type PublishedLeafSummary = {
  shotType: string;
  systemId: string;
  systemLabel?: string;
  familyCount: number;
  memberCount: number;
  /** UTF-8 byte size of the committed leaf blob. */
  byteLength: number;
};

export const PUBLISHED_LEAF_SUMMARY_FIELDS: readonly string[] = Object.freeze([
  "shotType",
  "systemId",
  "systemLabel",
  "familyCount",
  "memberCount",
  "byteLength",
]);

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Summarize committed leaf text (normalized v3 envelope). */
export function summarizePublishedLeafText(
  text: string
): { ok: true; summary: PublishedLeafSummary } | { ok: false; reason: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "leaf-json-invalid" };
  }
  if (!isNormalizedDataset(raw)) return { ok: false, reason: "leaf-not-normalized" };
  const parsed = parseNormalizedDatasetEnvelope(raw);
  if (!parsed.ok) return { ok: false, reason: "leaf-validation-failed" };
  const leaf = raw as { familyMasters: unknown[]; familyMembers: unknown[] };
  const systemLabel = parsed.envelope.systemLabel?.trim();
  return {
    ok: true,
    summary: {
      shotType: parsed.envelope.shotType,
      systemId: parsed.envelope.systemId,
      ...(systemLabel ? { systemLabel } : {}),
      familyCount: leaf.familyMasters.length,
      memberCount: leaf.familyMembers.length,
      byteLength: utf8ByteLength(text),
    },
  };
}

function isCount(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

/**
 * Client-side parse of host `leafSummaries`: keeps only the summary fields.
 * Any malformed entry → undefined (shown as "현황을 읽지 못했습니다", never as 0).
 */
export function parsePublishedLeafSummaries(
  raw: unknown
): PublishedLeafSummary[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: PublishedLeafSummary[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined;
    const e = entry as Record<string, unknown>;
    const shotType = typeof e.shotType === "string" ? e.shotType.trim() : "";
    const systemId = typeof e.systemId === "string" ? e.systemId.trim() : "";
    if (!shotType || !systemId) return undefined;
    if (!isCount(e.familyCount) || !isCount(e.memberCount) || !isCount(e.byteLength)) {
      return undefined;
    }
    const systemLabel = typeof e.systemLabel === "string" ? e.systemLabel.trim() : "";
    out.push({
      shotType,
      systemId,
      ...(systemLabel ? { systemLabel } : {}),
      familyCount: e.familyCount,
      memberCount: e.memberCount,
      byteLength: e.byteLength,
    });
  }
  return out;
}
