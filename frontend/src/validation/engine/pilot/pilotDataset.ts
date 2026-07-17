/**
 * validation/engine/pilot/pilotDataset.ts
 *
 * STEP6-8 Pilot Fixture — minimal Catalog / Register sample.
 *
 * Source: STEP6-7 Integration sample already used by the Engine package
 * (no formal frozen Catalog SSOT JSON exists yet in-repo).
 *
 * Consume Only:
 * - Header fields cite STEP6-4 §9.5 / Engine baseline
 * - Rule rows cite STEP6-4 Domain×Family lean axes (L1 Presence, L4 Typing, L7 Deferred)
 * - Does NOT invent new Rule semantics or mutate Catalog/Register SSOTs
 */

import type { CatalogSource, RegisterSource, RuleRecordView } from "../models";

function rule(
  partial: Pick<RuleRecordView, "ruleId" | "registerState"> &
    Partial<RuleRecordView>,
): RuleRecordView {
  return {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    coverageClass: "Required",
    ...partial,
  };
}

/** Pilot Catalog Header snapshot (Consume Only). */
export const PILOT_CATALOG: CatalogSource = {
  header: {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
    generatedFrom: [
      "STEP6-4_Rule_Catalog_Design.md v0.2",
      "STEP6-7 Integration sample (Pilot Fixture)",
    ],
    lastUpdated: "2026-07-17",
    status: "Draft",
  },
};

/**
 * Pilot Register Suite snapshot (Consume Only).
 * Rules: R-L1 (Required), R-L4 (Required), R-DEF (Deferred).
 */
export const PILOT_REGISTER: RegisterSource = {
  header: {
    suiteId: "pilot-register-suite",
    catalogVersion: "1.0",
    catalogRevision: "r1",
    catalogPinId: "pin-pilot-1",
    lastUpdated: "2026-07-17",
  },
  pin: {
    catalogPinId: "pin-pilot-1",
    catalogVersion: "1.0",
    catalogRevision: "r1",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
    generatedFrom: "STEP6-7 Integration sample (Pilot Fixture)",
    pinnedAt: "2026-07-17",
    mode: "Design",
  },
  ruleRecords: [
    rule({
      ruleId: "R-L1",
      registerState: "Active",
      primaryLayer: "L1",
      family: "F-PRESENCE",
      domain: "D-PACKAGE",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "R-L4",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-TYPING",
      domain: "D-FIELD",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "R-DEF",
      registerState: "Active",
      primaryLayer: "L7",
      family: "F-CONSISTENCY",
      domain: "D-SEMANTIC",
      coverageClass: "Deferred",
    }),
  ],
};

export const PILOT_RUN_ID = "pilot-step6-8";
