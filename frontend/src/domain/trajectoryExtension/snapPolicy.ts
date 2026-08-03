/**
 * snapPolicy.ts
 * Trajectory Extension Projection / Geometry ownership policy (v1.3).
 *
 * Source of truth: TRAJECTORY_EXTENSION_SSOT.md §7 · §8 · §10
 *
 * Runtime Snap / Attachment / Follow were removed in v1.3.
 * Projection is explicit DoubleClick only — see secondBallConstraint.ts.
 */

/** How a point projects onto an Extension centerline segment (§7.3). */
export type ProjectionPolicy = {
  /**
   * Perpendicular projection onto the segment;
   * out-of-segment results clamp to the nearest endpoint.
   * Never relocates to an arbitrary t (e.g. 0.5).
   */
  mode: "perpendicular_clamp";
  /** Continuous / radius-based snap is forbidden (v1.3). */
  usesAttachRadius: false;
  /** Trigger: Second Ball DoubleClick after Target Lock. */
  trigger: "second_ball_double_click";
};

export const PROJECTION_POLICY: ProjectionPolicy = {
  mode: "perpendicular_clamp",
  usesAttachRadius: false,
  trigger: "second_ball_double_click",
};

/**
 * Geometry ownership reminder for policy consumers (§8.0).
 * Types only — enforces documentation at the type layer.
 */
export type GeometryWriteOwner = "extension_handle";

/** Second Ball may move freely; it must not write Extension geometry. */
export type SecondBallDragGeometryAccess = "read_only";
