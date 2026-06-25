/**
 * Which rail receives corrections.curve_ratio (angle/tilt) + corrections.spin
 * when building effective system values for trajectory/anchors.
 * Future: per-system id or profile-driven value.
 */
export const angleSpinTargetRail = "C3" as const;

export type AngleSpinTargetRail = typeof angleSpinTargetRail;
