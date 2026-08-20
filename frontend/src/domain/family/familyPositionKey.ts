import type { Ball3 } from "../positionSearchEngine";
import { createPositionId } from "../positionId";

/**
 * Collision identity for "same track + same exact balls".
 * This is intentionally separate from Family/Member lineage identity.
 */
export function createFamilyPositionKey(track: string, balls: Ball3): string | null {
  if (typeof track !== "string") return null;
  const normalizedTrack = track.trim();
  if (!normalizedTrack) return null;
  return `${normalizedTrack}:${createPositionId(balls)}`;
}
