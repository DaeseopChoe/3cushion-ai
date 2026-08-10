/**
 * Phase 5 Mission 01 — Real Interpolation policy constants.
 * Search Quality policy only — not Architecture Freeze values.
 */

export const SECOND_SCORE_TOLERANCE_RG = 1.73;
export const CUE_TARGET_POS_TOLERANCE_RG = 2.0;
export const CUE_TARGET_SHAPE_TOLERANCE_RG = 2.0;
export const CUE_TARGET_ANGLE_TOLERANCE_DEG = 5.0;

/** MVP: angle term off (shape vector covers primary compatibility). */
export const USE_ANGLE_TERM = false;

export const CONFIDENCE_WEIGHT_SECOND = 0.4;
export const CONFIDENCE_WEIGHT_GEOM = 0.35;
export const CONFIDENCE_WEIGHT_PAIR = 0.25;

export const ZERO_VECTOR_EPS_RG = 1e-6;

export const TOP_STRATEGY_RESULTS = 3;
