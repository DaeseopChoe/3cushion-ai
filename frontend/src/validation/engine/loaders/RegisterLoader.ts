/**
 * validation/engine/loaders/RegisterLoader.ts
 *
 * STEP6-7B — Register Loader (L-Ingress).
 * Reads Register Header · Pin · Rule Record list. No Active resolve / Dependency.
 */

import { IngressLoadError } from "../errors";
import type {
  CatalogPinRecord,
  RegisterHeader,
  RegisterSource,
  RegisterState,
  RegisterView,
  RuleRecordView,
} from "../models";

const REGISTER_STATES: ReadonlySet<string> = new Set([
  "Draft",
  "Proposed",
  "Approved",
  "Active",
  "Deprecated",
  "Archived",
]);

function requireNonEmptyString(
  value: unknown,
  field: string,
  errors: string[],
): value is string {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`Register field missing or empty: ${field}`);
    return false;
  }
  return true;
}

export function readRegisterHeader(raw: unknown): RegisterHeader {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new IngressLoadError(
      "REGISTER_HEADER_MISSING",
      "Register Header does not exist",
    );
  }

  const h = raw as Record<string, unknown>;
  const errors: string[] = [];

  requireNonEmptyString(h.catalogVersion, "header.catalogVersion", errors);
  requireNonEmptyString(h.catalogRevision, "header.catalogRevision", errors);
  requireNonEmptyString(h.catalogPinId, "header.catalogPinId", errors);

  if (errors.length > 0) {
    throw new IngressLoadError("REGISTER_HEADER_INVALID", errors.join("; "));
  }

  const header: RegisterHeader = {
    catalogVersion: String(h.catalogVersion).trim(),
    catalogRevision: String(h.catalogRevision).trim(),
    catalogPinId: String(h.catalogPinId).trim(),
  };

  if (typeof h.suiteId === "string") header.suiteId = h.suiteId;
  if (typeof h.lastUpdated === "string") header.lastUpdated = h.lastUpdated;

  return header;
}

export function readCatalogPin(raw: unknown): CatalogPinRecord {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new IngressLoadError(
      "REGISTER_PIN_MISSING",
      "Catalog Pin Record does not exist",
    );
  }

  const p = raw as Record<string, unknown>;
  const errors: string[] = [];

  requireNonEmptyString(p.catalogPinId, "pin.catalogPinId", errors);
  requireNonEmptyString(p.catalogVersion, "pin.catalogVersion", errors);
  requireNonEmptyString(p.catalogRevision, "pin.catalogRevision", errors);
  requireNonEmptyString(p.compatibleSpsVersion, "pin.compatibleSpsVersion", errors);
  requireNonEmptyString(
    p.compatibleFrameworkVersion,
    "pin.compatibleFrameworkVersion",
    errors,
  );
  requireNonEmptyString(
    p.compatiblePipelineVersion,
    "pin.compatiblePipelineVersion",
    errors,
  );

  if (errors.length > 0) {
    throw new IngressLoadError("REGISTER_PIN_INVALID", errors.join("; "));
  }

  const pin: CatalogPinRecord = {
    catalogPinId: String(p.catalogPinId).trim(),
    catalogVersion: String(p.catalogVersion).trim(),
    catalogRevision: String(p.catalogRevision).trim(),
    compatibleSpsVersion: String(p.compatibleSpsVersion).trim(),
    compatibleFrameworkVersion: String(p.compatibleFrameworkVersion).trim(),
    compatiblePipelineVersion: String(p.compatiblePipelineVersion).trim(),
  };

  if (p.generatedFrom !== undefined) {
    pin.generatedFrom = p.generatedFrom as string | string[];
  }
  if (typeof p.lastUpdated === "string") pin.lastUpdated = p.lastUpdated;
  if (typeof p.pinnedAt === "string") pin.pinnedAt = p.pinnedAt;
  if (p.mode === "Design" || p.mode === "Official") pin.mode = p.mode;

  return pin;
}

function readRuleRecord(raw: unknown, index: number): RuleRecordView {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new IngressLoadError(
      "RULE_RECORD_INVALID",
      `Rule Record at index ${index} is not an object`,
    );
  }

  const r = raw as Record<string, unknown>;
  const errors: string[] = [];

  requireNonEmptyString(r.ruleId, `ruleRecords[${index}].ruleId`, errors);
  requireNonEmptyString(
    r.catalogVersion,
    `ruleRecords[${index}].catalogVersion`,
    errors,
  );
  requireNonEmptyString(
    r.catalogRevision,
    `ruleRecords[${index}].catalogRevision`,
    errors,
  );

  if (typeof r.registerState !== "string" || !REGISTER_STATES.has(r.registerState)) {
    errors.push(
      `ruleRecords[${index}].registerState missing or invalid (Register State required)`,
    );
  }

  if (errors.length > 0) {
    throw new IngressLoadError("RULE_RECORD_INVALID", errors.join("; "));
  }

  return {
    ruleId: String(r.ruleId).trim(),
    catalogVersion: String(r.catalogVersion).trim(),
    catalogRevision: String(r.catalogRevision).trim(),
    registerState: r.registerState as RegisterState,
    ruleVersion: typeof r.ruleVersion === "string" ? r.ruleVersion : undefined,
    ruleRevision: typeof r.ruleRevision === "string" ? r.ruleRevision : undefined,
    catalogPinId: typeof r.catalogPinId === "string" ? r.catalogPinId : undefined,
    domain: typeof r.domain === "string" ? r.domain : undefined,
    family: typeof r.family === "string" ? r.family : undefined,
    primaryLayer: typeof r.primaryLayer === "string" ? r.primaryLayer : undefined,
    ruleType: typeof r.ruleType === "string" ? r.ruleType : undefined,
    coverageClass:
      typeof r.coverageClass === "string" ? r.coverageClass : undefined,
    inheritsLayerCascade:
      typeof r.inheritsLayerCascade === "boolean"
        ? r.inheritsLayerCascade
        : undefined,
    prerequisites: Array.isArray(r.prerequisites)
      ? r.prerequisites.filter(
          (p): p is string => typeof p === "string" && p.trim() !== "",
        )
      : undefined,
    skipWhen: typeof r.skipWhen === "string" ? r.skipWhen : undefined,
    blockingCandidate:
      typeof r.blockingCandidate === "boolean"
        ? r.blockingCandidate
        : undefined,
  };
}

export class RegisterLoader {
  /**
   * Load Register Suite snapshot (Consume Only).
   * Prepares Rule Record list; does not filter Active or resolve dependencies.
   */
  load(source: RegisterSource): RegisterView {
    if (!source || typeof source !== "object") {
      throw new IngressLoadError(
        "REGISTER_SOURCE_MISSING",
        "Register source is required",
      );
    }

    const header = readRegisterHeader(source.header);
    const pin = readCatalogPin(source.pin);

    const rawRecords = source.ruleRecords ?? [];
    if (!Array.isArray(rawRecords)) {
      throw new IngressLoadError(
        "RULE_RECORDS_INVALID",
        "Register ruleRecords must be an array",
      );
    }

    const ruleRecords = rawRecords.map((row, i) => readRuleRecord(row, i));

    return {
      header,
      pin,
      ruleRecords,
      dependencyIndex: source.dependencyIndex,
      metadata: source.metadata,
    };
  }
}
