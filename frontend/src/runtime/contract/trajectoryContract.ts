/**
 * trajectoryContract.ts
 * Batch 6 STEP 6-1 — TrajectoryContract pure projection view (AD-B6-03).
 *
 * Not assembled by Loader. Not cached in Registry.
 * SystemContract → TrajectoryContractView (extractors only).
 */

import type {
  LabelStrategy,
  SystemContract,
  SystemContractSafety,
} from "./systemContract";

export type ReflectionSafetyView = Pick<
  SystemContractSafety,
  "m_min" | "theta_t_max"
>;

export type AnchorConversionView = {
  offset_fg2rg: number | null;
};

export type RenderView = {
  labelStrategy: LabelStrategy;
};

export type BaselineHandleView = {
  enabled: boolean;
  requireTrackPrefix: string | null;
};

/** Pure projection — derived on demand, not Registry-cached. */
export type TrajectoryContractView = {
  identity: {
    systemId: string;
  };
  reflectionSafety: ReflectionSafetyView;
  anchorConversion: AnchorConversionView;
  render: RenderView;
  baselineHandle: BaselineHandleView;
};

const DEFAULT_REFLECTION_SAFETY: ReflectionSafetyView = {
  m_min: 0.05,
  theta_t_max: 68,
};

function resolveLabelStrategy(contract: SystemContract): LabelStrategy {
  const meta = contract.metadata;
  const explicit = meta?.render as { label_strategy?: LabelStrategy } | undefined;
  if (
    explicit?.label_strategy === "five_half_reference" ||
    explicit?.label_strategy === "anchor_ssot"
  ) {
    return explicit.label_strategy;
  }

  const fromCapabilities = contract.capabilities.render?.labelStrategy;
  if (fromCapabilities) {
    return fromCapabilities;
  }

  const family = contract.identity.family;
  return family === "5_half" ? "five_half_reference" : "anchor_ssot";
}

function resolveBaselineHandle(contract: SystemContract): BaselineHandleView {
  const fromCapabilities = contract.capabilities.baselineHandle;
  if (fromCapabilities) {
    return fromCapabilities;
  }

  const family = contract.identity.family;
  return {
    enabled: family === "5_half",
    requireTrackPrefix: family === "5_half" ? "B2T" : null,
  };
}

/** Pure extractor — projection only (AD-B6-09). No I/O. */
export function extractTrajectoryContractView(
  contract: SystemContract
): TrajectoryContractView {
  const safety = contract.profile.safety;

  return {
    identity: {
      systemId: contract.identity.systemId,
    },
    reflectionSafety: {
      m_min:
        typeof safety.m_min === "number" ? safety.m_min : DEFAULT_REFLECTION_SAFETY.m_min,
      theta_t_max:
        typeof safety.theta_t_max === "number"
          ? safety.theta_t_max
          : DEFAULT_REFLECTION_SAFETY.theta_t_max,
    },
    anchorConversion: {
      offset_fg2rg:
        typeof safety.offset_fg2rg === "number" ? safety.offset_fg2rg : null,
    },
    render: {
      labelStrategy: resolveLabelStrategy(contract),
    },
    baselineHandle: resolveBaselineHandle(contract),
  };
}
