/**
 * validation/engine/baseline.ts
 *
 * STEP6-7B — Locked Consume identities for Header preflight.
 * Framework / Pipeline / SPS versions are Consume Only (do not redefine).
 */

/** Compatible SPS Version baseline (STEP6 Framework / Pipeline docs). */
export const ENGINE_COMPATIBLE_SPS_VERSION = "SPS v1.0";

/** Compatible Framework Version — Schema Validation Framework Freeze Candidate. */
export const ENGINE_COMPATIBLE_FRAMEWORK_VERSION = "v1.0";

/** Compatible Validation Pipeline Version — Pipeline Freeze Candidate. */
export const ENGINE_COMPATIBLE_PIPELINE_VERSION = "v0.6";

export interface EngineCompatibilityBaseline {
  compatibleSpsVersion: string;
  compatibleFrameworkVersion: string;
  compatiblePipelineVersion: string;
}

export const ENGINE_COMPATIBILITY_BASELINE: EngineCompatibilityBaseline = {
  compatibleSpsVersion: ENGINE_COMPATIBLE_SPS_VERSION,
  compatibleFrameworkVersion: ENGINE_COMPATIBLE_FRAMEWORK_VERSION,
  compatiblePipelineVersion: ENGINE_COMPATIBLE_PIPELINE_VERSION,
};
