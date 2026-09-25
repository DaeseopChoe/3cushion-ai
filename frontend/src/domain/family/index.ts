/**
 * Family domain (Phase 1B identity + Phase 2B 4-track generation).
 * Physical FamilyMaster/Member schema + hydrate/split live here.
 * Local durable SSOT = `normalized_dataset` (Phase B-1/C/C-2).
 * Production App load uses loadProductionCompatibleDataset (normalized only).
 */

export * from "./familyIdentity";
export * from "./familyMigrationDebt";
export * from "./trackSymmetry";
export * from "./handedness";
export * from "./hptResolver";
export * from "./generateFourTrackMembers";
export * from "./familyAwareWriter";
export * from "./familySavePolicy";
export * from "./familyRuntimeProjection";
export * from "./familyPositionKey";
export * from "./familyDerivedSource";
export * from "./generateCueImpactDerivedMembers";
export * from "./generateC3PlusScoringDerivedMembers";
export * from "./c3PlusScoringPath";
export * from "./sampleC3PlusScoringLine";
export * from "./cueImpactDerivedReview";
export * from "./c3PlusDerivedReview";
export * from "./c3PlusFourTrackConsistency";
export * from "./unifiedDerivedReview";
export * from "./buildCueC3ProductMembers";
export * from "./rebuildCanonicalMemberMeta";
export * from "./legacyV2MetaRepair";
export * from "./legacyProductMetaMigration";
export * from "./legacyProductTwinDedupe";
export * from "./productCoverageFromDataset";
export * from "./projectDerivedCandidateToRuntimeView";
export * from "./familyNormalizedSchema";
export * from "./familyNormalizedFlag";
export * from "./familyNormalizedStore";
export * from "./familyHydrate";
export * from "./migratePositionRecordsToFamilyParts";
export * from "./loadFamilyCompatibleDataset";
export * from "./rematerializeFamilyPartsToPositionRecords";
export * from "./loadProductionCompatibleDataset";
export * from "./syncPositionDatasetToNormalizedFamilyStore";
export * from "./familyCorpusFreshness";
