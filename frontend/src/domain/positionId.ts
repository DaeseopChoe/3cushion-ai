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
