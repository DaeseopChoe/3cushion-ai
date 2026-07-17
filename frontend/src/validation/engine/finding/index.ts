/**
 * validation/engine/finding/index.ts
 * STEP6-7F — Finding support barrel.
 */

export {
  allocateValId,
  buildFindingMessage,
  shouldEmitFinding,
} from "./findingPolicy";
export type { FindingEmitMode } from "./findingPolicy";
export type {
  AggregatedFindingCounts,
  AggregatedFindingSet,
  Finding,
  FindingBatch,
  FindingPinCite,
  FindingTrace,
} from "./findingModels";
