/**
 * validation/engine/models.ts
 *
 * STEP6-7B — Ingress load models (Catalog Header · Register · Pin).
 * Field names consume STEP6-4 §9.5 / STEP6-5 sketches. Shape-free Design → typed views.
 */

/** Register State (STEP6-5 §7). ≠ Execution Status. */
export type RegisterState =
  | "Draft"
  | "Proposed"
  | "Approved"
  | "Active"
  | "Deprecated"
  | "Archived";

/** Catalog Header status placeholder (STEP6-4 §9.5.3). */
export type CatalogHeaderStatus = "Draft" | "FreezeCandidate" | "Frozen";

/**
 * Catalog Header Metadata (STEP6-4 §9.5).
 * Required fields for Engine citation / preflight.
 */
export interface CatalogHeader {
  catalogVersion: string;
  catalogRevision: string;
  compatibleSpsVersion: string;
  compatibleFrameworkVersion: string;
  compatiblePipelineVersion: string;
  generatedFrom: string | string[];
  lastUpdated: string;
  status?: CatalogHeaderStatus;
  catalogPinId?: string;
}

/** Catalog Pin Record cite (STEP6-5 §12.1) — cite Header, do not redefine. */
export interface CatalogPinRecord {
  catalogPinId: string;
  catalogVersion: string;
  catalogRevision: string;
  compatibleSpsVersion: string;
  compatibleFrameworkVersion: string;
  compatiblePipelineVersion: string;
  generatedFrom?: string | string[];
  lastUpdated?: string;
  pinnedAt?: string;
  mode?: "Design" | "Official";
}

/**
 * Register Suite header / suite metadata for Ingress.
 * Minimal fields needed for Loader + Header validation (not full Suite layout).
 */
export interface RegisterHeader {
  /** Suite / inventory label (optional display). */
  suiteId?: string;
  /** Catalog Version cited by this Register snapshot. */
  catalogVersion: string;
  /** Catalog Revision cited by this Register snapshot. */
  catalogRevision: string;
  /** Active Pin id for this load (required for Official-path preflight). */
  catalogPinId: string;
  lastUpdated?: string;
}

/**
 * Rule Record inventory row (STEP6-5 §4) — Loader prepares list only.
 * Does not resolve Active set (Planner / STEP6-7C).
 */
export interface RuleRecordView {
  ruleId: string;
  ruleVersion?: string;
  ruleRevision?: string;
  catalogVersion: string;
  catalogRevision: string;
  catalogPinId?: string;
  registerState: RegisterState;
  domain?: string;
  family?: string;
  primaryLayer?: string;
  ruleType?: string;
  /** CoverageClass: Required | Optional | Deferred (STEP6-6 §9.1). */
  coverageClass?: string;
  /** Catalog Dependency overrides (STEP6-4 Option C) — optional embed. */
  inheritsLayerCascade?: boolean;
  prerequisites?: string[];
  skipWhen?: string;
  blockingCandidate?: boolean;
}

/** Catalog Loader output (RO view). */
export interface CatalogView {
  header: CatalogHeader;
  /** Optional body / indices — present but unused until later STEPs. */
  body?: unknown;
}

/** Register Loader output (RO view). */
export interface RegisterView {
  header: RegisterHeader;
  pin: CatalogPinRecord;
  /** Rule Record list prepared for Planner — not filtered/resolved. */
  ruleRecords: RuleRecordView[];
  /** Dependency index placeholder — loaded shape only, not resolved. */
  dependencyIndex?: unknown;
  metadata?: Record<string, unknown>;
}

/** Header Validator result (STEP6-6 §8.3 / early exit BLOCKED). */
export type HeaderValidationStatus = "PASS" | "BLOCKED";

export interface HeaderValidationResult {
  status: HeaderValidationStatus;
  reasons: string[];
}

/**
 * Planner-facing Ingress payload after successful Header validation.
 * Implements EnginePayload for L-Ingress → L-Plan handoff.
 */
export interface IngressValidatedPayload {
  kind: "ingress.validated";
  catalog: CatalogView;
  register: RegisterView;
  headerValidation: HeaderValidationResult;
}

/** Raw Catalog source accepted by Catalog Loader (Consume Only). */
export interface CatalogSource {
  header: CatalogHeader;
  body?: unknown;
}

/** Raw Register Suite source accepted by Register Loader (Consume Only). */
export interface RegisterSource {
  header: RegisterHeader;
  pin: CatalogPinRecord;
  ruleRecords?: RuleRecordView[];
  dependencyIndex?: unknown;
  metadata?: Record<string, unknown>;
}
