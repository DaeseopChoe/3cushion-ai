/**
 * runtime/index.ts
 * Batch 6 STEP 6-7 — Final Runtime Public API (AD-B6-04).
 *
 * Sole Public Entry: getSystemContract().
 * bootstrapRegistry / Loader / systemPackageStore are runtime-internal.
 */

export type {
  SystemContract,
  SystemContractAnchors,
  SystemContractCapabilities,
  SystemContractIdentity,
  SystemContractProfile,
  SystemContractSafety,
  SystemContractValidation,
  LabelStrategy,
} from "./contract/systemContract";

export { SYSTEM_CONTRACT_VERSION } from "./contract/systemContract";

export type {
  TrajectoryContractView,
  ReflectionSafetyView,
  AnchorConversionView,
  RenderView,
  BaselineHandleView,
} from "./contract/trajectoryContract";

export { extractTrajectoryContractView } from "./contract/trajectoryContract";

export {
  getSystemContract,
  listRegisteredSystemIds,
  isRegistered,
} from "./registry/systemRegistry";
