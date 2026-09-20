/**
 * Position Key owner — deterministic Exact Ball3 identity.
 *
 * Identity Contract (2026-09-20, PROJECT_MASTER_INDEX):
 * - Position = logical cue/target/second Ball3 (6 coordinates). Physical color excluded.
 * - PositionKey = this positionId (createPositionId). Conceptually PositionKey ≡ positionId.
 * - Quantum in this key only: round(value * 10) → 0.1 grid. Does NOT imply whole-corpus
 *   storage rounding (that is a separate future policy).
 * - Strategy S1/S2/S3, familyId, and track are NOT part of this key.
 * - MUST NOT use PositionKey / positionId / coordinates as familyId.
 */
import type { Ball3 } from "./positionSearchEngine";

/**
 * balls 기반 deterministic positionId (targetBall 미포함).
 * 동일 양자화 입력 → 항상 동일 문자열.
 */
export function createPositionId(ball3: Ball3): string {
  const q = (v: number) => Math.round(v * 10);
  const pad = (v: number) => v.toString().padStart(3, "0");
  return [
    pad(q(ball3.cue.x)),
    pad(q(ball3.cue.y)),
    pad(q(ball3.target.x)),
    pad(q(ball3.target.y)),
    pad(q(ball3.second.x)),
    pad(q(ball3.second.y)),
  ].join("");
}
