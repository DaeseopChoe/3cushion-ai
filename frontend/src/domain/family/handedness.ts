/**
 * Family-track handedness wrappers over production reflection helpers.
 * Mirror of HPT / thickness is handedness-only — not symmetryOp-based.
 * RPI (e.g. B2T_L → T2B_L) is same handedness → no mirror.
 */

import { detectTrackTurn, isLeftHandedTrack } from "../reflectionEngine";

export type TrackHandedness = "L" | "R";

export { detectTrackTurn, isLeftHandedTrack };

export function getTrackHandedness(track?: string): TrackHandedness | null {
  return detectTrackTurn(track);
}

export function isOppositeHandedness(
  authoredTrack?: string,
  requestedTrack?: string
): boolean {
  const authored = getTrackHandedness(authoredTrack);
  const requested = getTrackHandedness(requestedTrack);
  if (authored == null || requested == null) return false;
  return authored !== requested;
}
