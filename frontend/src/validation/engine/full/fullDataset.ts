/**
 * validation/engine/full/fullDataset.ts
 *
 * STEP6-9 Full Validation Catalog / Register Snapshot.
 *
 * Derived from STEP6-4 §5.3 Seed cell priorities (Consume Only).
 * Does not invent new Domain/Family/Layer axes.
 * Target package: frontend/src/data/systems/5_half_system (Consume Only).
 */

import type { CatalogSource, RegisterSource, RuleRecordView } from "../models";

function rule(
  partial: Pick<RuleRecordView, "ruleId" | "registerState"> &
    Partial<RuleRecordView>,
): RuleRecordView {
  return {
    catalogVersion: "1.0",
    catalogRevision: "r1-full",
    coverageClass: "Required",
    ...partial,
  };
}

/** Full Validation Catalog Header (STEP6-4 §9.5 cite). */
export const FULL_CATALOG: CatalogSource = {
  header: {
    catalogVersion: "1.0",
    catalogRevision: "r1-full",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
    generatedFrom: [
      "STEP6-4_Rule_Catalog_Design.md §5.3 Seed cell priorities",
      "STEP6-5_Validation_Register_Suite.md",
      "system_meta.schema.json (Consume)",
    ],
    lastUpdated: "2026-07-17",
    status: "FreezeCandidate",
  },
};

/**
 * Full Validation Register Snapshot — P0 seeds + P1 Deferred Semantic.
 * Rule IDs are snapshot inventory keys (not Framework namespace lock).
 */
export const FULL_REGISTER: RegisterSource = {
  header: {
    suiteId: "full-validation-register-suite",
    catalogVersion: "1.0",
    catalogRevision: "r1-full",
    catalogPinId: "pin-full-5half-1",
    lastUpdated: "2026-07-17",
  },
  pin: {
    catalogPinId: "pin-full-5half-1",
    catalogVersion: "1.0",
    catalogRevision: "r1-full",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
    generatedFrom: "STEP6-4 §5.3 / 5_half_system package",
    pinnedAt: "2026-07-17",
    mode: "Official",
  },
  ruleRecords: [
    rule({
      ruleId: "SCH-FV-L1-PKG-PRESENCE",
      registerState: "Active",
      primaryLayer: "L1",
      family: "F-PRESENCE",
      domain: "D-PACKAGE",
      ruleType: "Package",
      coverageClass: "Required",
      blockingCandidate: true,
    }),
    rule({
      ruleId: "SCH-FV-L2-SYN-PARSE",
      registerState: "Active",
      primaryLayer: "L2",
      family: "F-PARSEABILITY",
      domain: "D-SYNTAX",
      ruleType: "Syntax",
      coverageClass: "Required",
      blockingCandidate: true,
    }),
    rule({
      ruleId: "SCH-FV-L3-STR-SHAPE",
      registerState: "Active",
      primaryLayer: "L3",
      family: "F-SHAPE",
      domain: "D-STRUCTURE",
      ruleType: "Structure",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "SCH-FV-L4-FLD-PRESENCE",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-PRESENCE",
      domain: "D-FIELD",
      ruleType: "Required",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "SCH-FV-L4-FLD-TYPING",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-TYPING",
      domain: "D-FIELD",
      ruleType: "Type",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "SCH-FV-L4-FLD-DOMAIN",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-DOMAIN-CHECK",
      domain: "D-FIELD",
      ruleType: "Domain",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "SCH-FV-L5-REF-RESOLVE",
      registerState: "Active",
      primaryLayer: "L5",
      family: "F-RESOLUTION",
      domain: "D-REFERENCE",
      ruleType: "Reference",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "SCH-FV-L6-XFILE-CONS",
      registerState: "Active",
      primaryLayer: "L6",
      family: "F-CONSISTENCY",
      domain: "D-CROSS-FILE",
      ruleType: "Cross-file",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "SCH-FV-L7-SEM-CONS",
      registerState: "Active",
      primaryLayer: "L7",
      family: "F-CONSISTENCY",
      domain: "D-SEMANTIC",
      ruleType: "Semantic",
      coverageClass: "Deferred",
    }),
  ],
};

export const FULL_RUN_ID = "full-step6-9-5half";
export const FULL_TARGET_SYSTEM_ID = "5_half_system";
