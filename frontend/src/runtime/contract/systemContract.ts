/**
 * systemContract.ts
 * Batch 6 STEP 6-1 — SystemContract Shape SSOT (SYS-001/002).
 *
 * Types only + assembly target marker. No behavior / calculation / policy.
 * AD-B6-02 · AD-B6-09 · AD-B6-10 · INV-B6-01/02/03
 */

export const SYSTEM_CONTRACT_VERSION = 1 as const;

export type LabelStrategy = "five_half_reference" | "anchor_ssot";

export type SystemContractSafety = {
  m_min: number;
  theta_t_max: number;
  offset_fg2rg: number | null;
};

export type SystemContractProfile = {
  formulaExpr: string | null;
  valueDomains: Record<string, [number, number]> | null;
  safety: SystemContractSafety;
  display: Record<string, string | number | boolean | null> | null;
};

export type SystemContractAnchors = {
  trajectories: Record<
    string,
    { anchors: Array<{ id: string; [key: string]: string | number | boolean | null }> }
  > | null;
  meta: Record<string, string | number | boolean | null> | null;
};

export type SystemContractIdentity = {
  systemId: string;
  family: string | null;
  aliases: string[] | null;
};

export type SystemContractMetadata = Record<
  string,
  string | number | boolean | null | string[] | number[]
>;

export type SystemContractCapabilities = {
  render: {
    labelStrategy: LabelStrategy | null;
  } | null;
  baselineHandle: {
    enabled: boolean;
    requireTrackPrefix: string | null;
  } | null;
};

export type SystemContractValidation = {
  ok: boolean;
  errors: string[];
};

export type SystemContractVersion = {
  contractVersion: typeof SYSTEM_CONTRACT_VERSION;
  packageVersion: string | null;
};

/**
 * Assembled System Contract — immutable · read-only · serializable shape.
 * Loader is the sole assembler (SPS §18).
 */
export type SystemContract = {
  identity: SystemContractIdentity;
  profile: SystemContractProfile;
  anchors: SystemContractAnchors;
  logic: Record<string, unknown> | null;
  metadata: SystemContractMetadata | null;
  capabilities: SystemContractCapabilities;
  validation: SystemContractValidation;
  version: SystemContractVersion;
};
