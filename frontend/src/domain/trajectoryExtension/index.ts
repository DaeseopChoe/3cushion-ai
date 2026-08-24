/**
 * index.ts
 * Trajectory Extension Domain public entry.
 *
 * Import graph (SSOT §16):
 *   trajectoryExtension → trajectory     allowed later (read-only)
 *   trajectory → trajectoryExtension     forbidden
 *   trajectoryExtension → runtime/*      forbidden
 *   trajectoryExtension → data/systems/* forbidden
 *
 * P1-1: types / Origin stubs
 * P1-2: Reflection Table (Default Proposal data + linear interpolation)
 * P1-3: Origin Resolver (pathNodes → Origin Index / Point / Validation)
 * P2: Default Proposal · Handle Drag · DoubleClick Projection (v1.3)
 */

export {
  EXTENSION_SCHEMA_VERSION,
  EXTENSION2_DEFAULT_LENGTH_RG,
  MAX_TRAJECTORY_EXTENSIONS,
  TRAJECTORY_EXTENSION_ID_PREFIX,
  type ExtensionSchemaVersion,
  type RgPoint,
  type TrajectoryExtension,
  type TrajectoryExtensionChain,
  type TrajectoryExtensionChainSegment,
  type TrajectoryExtensionId,
  type TrajectoryExtensionIndex,
  type TrajectoryExtensionOrigin,
  type TrajectoryExtensionPayload,
  type TrajectoryExtensionTerminal,
} from "./model";

export {
  ORIGIN_INDEX_POLICY,
  canCreateExtensionFromOrigin,
  resolveOrigin,
  resolveOriginIndex,
  resolveOriginPoint,
  validateOrigin,
  type OriginCapKind,
  type OriginIndexPolicy,
  type OriginValidity,
  type OriginValidityReason,
  type ResolvedOrigin,
} from "./origin";

export {
  PROJECTION_POLICY,
  type GeometryWriteOwner,
  type ProjectionPolicy,
  type SecondBallDragGeometryAccess,
} from "./snapPolicy";

export {
  findClosestSegmentProjection,
  projectBallOntoNearestSegment,
  projectPointToSegment,
  type SegmentLike,
  type SegmentProjection,
} from "./secondBallConstraint";

export {
  collectDisplayProjectionSegments,
  polylineToProjectionSegments,
  type ProjectionSegment,
} from "./projectionSegments";

export {
  DEFAULT_REFLECTION_TABLE,
  GLOBAL_REFLECTION_TABLE,
  getReflectionTableIncidentRange,
  interpolateReflectDeg,
  lookupReflectionAngle,
  type ReflectionLookupMode,
  type ReflectionLookupResult,
  type ReflectionTable,
  type ReflectionTableKnot,
} from "./reflectionTable";

export {
  appendExtension1Draft,
  appendExtension2Draft,
  buildRevealPathNodes,
  canAddAnotherExtension,
  createTrajectoryExtensionId,
  draftItemCount,
  draftToPayload,
  payloadToDraft,
  findNextCushionHit,
  proposeExtension1,
  proposeExtension2,
  proposeOutgoingTravelDeg,
  resolveDraftSegments,
  type Extension1ProposalResult,
  type Extension2ProposalResult,
  type TrajectoryExtensionDraft,
} from "./proposal";

export {
  EXTENSION_HANDLE_HIT_RADIUS_RG,
  constrainExtension1Endpoint,
  constrainExtension2Endpoint,
  hitTestExtensionHandle,
  resolveExtension1RailLock,
  updateDraftEndpoint,
  type ExtensionHandleMark,
} from "./endpointEdit";

/** Phase 3A-359C — Manual Extension E1/E2 → physical C7/C8 (read-only). */
export {
  MANUAL_EXTENSION_DIRECTION_EPS_RG,
  deriveManualExtensionCushions,
  deriveManualExtensionCushionsFromPayload,
  resolveManualExtensionC7,
  resolveManualExtensionC8,
  type DeriveManualExtensionCushionsInput,
  type ManualExtensionCushionFailReason,
  type ManualExtensionCushionPoint,
  type ManualExtensionCushionsResult,
} from "./deriveManualExtensionCushions";
