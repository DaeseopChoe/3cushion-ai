/**
 * Phase F-2B — Existing legacy v2 leaf migration-boundary meta repair.
 *
 * ONLY for first-touch consumption of repository schemaVersion-2 leaves
 * (convertFlatDatasetExportToNormalizedLeaf / Published v2 reader).
 *
 * Does NOT weaken validators. Does NOT repair new SAVE / PublishFamilyPayload /
 * normalized v3. meta remains runtime-derivable; this only bridges historical
 * flat StrategyEntry.meta omissions so strict flat validation can pass.
 *
 * Repair = rebuildCanonicalMemberMeta only. No placeholders.
 */

import type { DatasetExportPayload } from "../datasetExport";
import type {
  Ball3,
  Point,
  PositionRecord,
  StrategyEntry,
  StrategyMeta,
} from "../positionSearchEngine";
import { rebuildCanonicalMemberMeta } from "./rebuildCanonicalMemberMeta";

const SLOTS = ["S1", "S2", "S3"] as const;

export type LegacyV2MetaRepairOk = {
  ok: true;
  payload: DatasetExportPayload;
  repairedCount: number;
  preservedExistingMetaCount: number;
};

export type LegacyV2MetaRepairFail = {
  ok: false;
  reason: string;
  issues: string[];
};

export type LegacyV2MetaRepairResult =
  | LegacyV2MetaRepairOk
  | LegacyV2MetaRepairFail;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function isFinitePoint(p: unknown): p is Point {
  return (
    isPlainObject(p) &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function isFiniteBall3(balls: unknown): balls is Ball3 {
  if (!isPlainObject(balls)) return false;
  return (
    isFinitePoint(balls.cue) &&
    isFinitePoint(balls.target) &&
    isFinitePoint(balls.second)
  );
}

function hasValidMeta(entry: StrategyEntry): boolean {
  if (entry.meta == null || !isPlainObject(entry.meta)) return false;
  const m = entry.meta as StrategyMeta;
  return (
    isFinitePoint(m.impact) &&
    isFinitePoint(m.final) &&
    typeof m.angle_ci === "number" &&
    typeof m.angle_fs === "number" &&
    Number.isFinite(m.angle_ci) &&
    Number.isFinite(m.angle_fs)
  );
}

function assessRequiredInputs(
  balls: Ball3 | undefined,
  entry: StrategyEntry,
  slot: string
): string[] {
  const missing: string[] = [];
  if (!balls || !isFiniteBall3(balls)) missing.push("balls");
  if (!entry.signature || !isPlainObject(entry.signature)) {
    missing.push("signature");
  } else {
    if (
      typeof entry.signature.systemId !== "string" ||
      !entry.signature.systemId.trim()
    ) {
      missing.push("signature.systemId");
    }
    if (typeof entry.signature.formulaHash !== "string") {
      missing.push("signature.formulaHash");
    }
    if (
      typeof entry.signature.shotType !== "string" ||
      !entry.signature.shotType.trim()
    ) {
      missing.push("signature.shotType");
    }
  }
  if (entry.sysInputs == null || !isPlainObject(entry.sysInputs)) {
    missing.push("sysInputs");
  }
  if (entry.corrections == null || !isPlainObject(entry.corrections)) {
    missing.push("corrections");
  }
  if (typeof entry.track !== "string" || !entry.track.trim()) {
    missing.push("track");
  }
  if (entry.slot != null && entry.slot !== slot) {
    missing.push("slot");
  }
  return missing;
}

function tryRebuildMeta(
  balls: Ball3,
  entry: StrategyEntry,
  slot: (typeof SLOTS)[number]
): { ok: true; meta: StrategyMeta } | { ok: false; reason: string } {
  try {
    const hpT =
      entry.hpT != null &&
      isPlainObject(entry.hpT) &&
      typeof (entry.hpT as { T?: unknown }).T === "string"
        ? { T: (entry.hpT as { T: string }).T }
        : undefined;
    const meta = rebuildCanonicalMemberMeta({
      balls,
      signature: entry.signature,
      sysInputs: { ...(entry.sysInputs ?? {}) },
      slot,
      track: entry.track,
      hpT,
    });
    if (!isFinitePoint(meta.impact) || !isFinitePoint(meta.final)) {
      return { ok: false, reason: "rebuild-non-finite-meta" };
    }
    if (
      typeof meta.angle_ci !== "number" ||
      typeof meta.angle_fs !== "number" ||
      !Number.isFinite(meta.angle_ci) ||
      !Number.isFinite(meta.angle_fs)
    ) {
      return { ok: false, reason: "rebuild-non-finite-angles" };
    }
    return { ok: true, meta };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

function issuePath(
  ri: number,
  slot: string,
  entry: StrategyEntry,
  detail: string
): string {
  const familyId = String(entry.familyId ?? "").trim();
  const memberId = String(entry.memberId ?? "").trim();
  const origin = String(entry.memberOrigin ?? "").trim();
  const parts = [
    `records[${ri}].strategies.${slot}`,
    familyId ? `familyId=${familyId}` : "",
    memberId ? `memberId=${memberId}` : "",
    origin ? `memberOrigin=${origin}` : "",
    detail,
  ].filter(Boolean);
  return parts.join(":");
}

/**
 * Pure in-memory repair for an existing legacy flat DatasetExportPayload.
 * Returns a deep-cloned payload; never mutates `input`.
 *
 * Eligibility (semantic, not origin whitelist):
 * - StrategyEntry.meta missing/invalid
 * - canonical rebuild inputs present
 * - rebuildCanonicalMemberMeta succeeds
 *
 * Fail-closed: any unrepairable missing-meta entry → ok:false.
 */
export function repairLegacyV2MissingMeta(
  input: DatasetExportPayload
): LegacyV2MetaRepairResult {
  if (input == null || typeof input !== "object") {
    return {
      ok: false,
      reason: "legacy-v2-meta-repair-input-invalid",
      issues: ["payload:not-object"],
    };
  }

  const payload = cloneJson(input);
  const records: PositionRecord[] = Array.isArray(payload.records)
    ? payload.records
    : [];
  let repairedCount = 0;
  let preservedExistingMetaCount = 0;
  const issues: string[] = [];

  for (let ri = 0; ri < records.length; ri++) {
    const rec = records[ri]!;
    for (const slot of SLOTS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;

      if (hasValidMeta(entry)) {
        preservedExistingMetaCount += 1;
        continue;
      }

      const missingInputs = assessRequiredInputs(rec.balls, entry, slot);
      if (missingInputs.length > 0) {
        issues.push(
          issuePath(
            ri,
            slot,
            entry,
            `unrepairable-missing-inputs:${missingInputs.join(",")}`
          )
        );
        continue;
      }

      if (!isFiniteBall3(rec.balls)) {
        issues.push(
          issuePath(ri, slot, entry, "unrepairable-missing-inputs:balls")
        );
        continue;
      }

      const rebuilt = tryRebuildMeta(rec.balls, entry, slot);
      if (!rebuilt.ok) {
        issues.push(
          issuePath(ri, slot, entry, `unrepairable-rebuild:${rebuilt.reason}`)
        );
        continue;
      }

      // Identity / Master payload preserved — only attach meta.
      rec.strategies![slot] = {
        ...entry,
        meta: cloneJson(rebuilt.meta),
      };
      repairedCount += 1;
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      reason: "legacy-v2-meta-unrepairable",
      issues,
    };
  }

  return {
    ok: true,
    payload,
    repairedCount,
    preservedExistingMetaCount,
  };
}

/** Count slots with missing/invalid meta (diagnostic / contracts). */
export function countLegacyV2MissingMeta(
  payload: DatasetExportPayload
): number {
  const records = Array.isArray(payload.records) ? payload.records : [];
  let n = 0;
  for (const rec of records) {
    for (const slot of SLOTS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      if (!hasValidMeta(entry)) n += 1;
    }
  }
  return n;
}
