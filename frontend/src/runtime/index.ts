/**
 * runtime/index.ts
 * Batch 6 — Runtime layer public exports.
 *
 * Registry Public API (AD-B6-04): getSystemContract, listRegisteredSystemIds, isRegistered.
 * bootstrapRegistry is runtime-internal only (AD-B6-06).
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
