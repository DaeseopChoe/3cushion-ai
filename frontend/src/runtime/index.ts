/**
 * runtime/index.ts
 * Batch 6 STEP 6-1 — Runtime layer public exports (smoke / future consumer entry).
 *
 * STEP 6-1: scaffold only. Existing App/Flow/Domain consumers unchanged.
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
  bootstrapRegistry,
} from "./registry/systemRegistry";
