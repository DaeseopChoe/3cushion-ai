/**
 * Recall Position Difference — informational notice after a successful Search/Recall.
 *
 * Compares the current screen balls with the winning stored Member's balls
 * (AUTHORED, SYMMETRY or DERIVED — whichever Member won), role by role:
 * cue↔cue, target↔target, second↔second. Actual Euclidean distance in ball grid
 * coordinates only — no similarity %, weighting, grades or Fg/Rg mapping.
 *
 * User-facing labels: cue → 내공, target → 앞공, second → 뒷공 (never color-bound).
 */
import type { Ball3 } from "../positionSearchEngine";

export type RecallPositionDifference = {
  cueDifference: number;
  targetDifference: number;
  secondDifference: number;
};

/** Half of the positionId 0.1 quantum — below this a ball counts as unchanged. */
export const RECALL_POSITION_DIFFERENCE_EPSILON = 0.05;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function computeRecallPositionDifference(
  screenBalls: Ball3,
  storedMemberBalls: Ball3
): RecallPositionDifference {
  return {
    cueDifference: distance(screenBalls.cue, storedMemberBalls.cue),
    targetDifference: distance(screenBalls.target, storedMemberBalls.target),
    secondDifference: distance(screenBalls.second, storedMemberBalls.second),
  };
}

export function isRecallPositionExact(diff: RecallPositionDifference): boolean {
  return (
    diff.cueDifference < RECALL_POSITION_DIFFERENCE_EPSILON &&
    diff.targetDifference < RECALL_POSITION_DIFFERENCE_EPSILON &&
    diff.secondDifference < RECALL_POSITION_DIFFERENCE_EPSILON
  );
}

/** Notice text, or null when every ball matches (no notice for exact Recall). */
export function formatRecallPositionDifferenceNotice(
  diff: RecallPositionDifference
): string | null {
  if (isRecallPositionExact(diff)) return null;
  return [
    "유사한 공략을 찾았습니다.",
    "",
    `내공: ${diff.cueDifference.toFixed(1)}`,
    `앞공: ${diff.targetDifference.toFixed(1)}`,
    `뒷공: ${diff.secondDifference.toFixed(1)}`,
    "",
    "검색된 공략의 내용이 화면에 표시되었습니다.",
  ].join("\n");
}

/**
 * Single alert text for a successful Recall: difference notice (if any), with the
 * existing low-similarity warning appended instead of a second alert.
 */
export function resolveRecallNoticeMessage(args: {
  screenBalls: Ball3 | null | undefined;
  storedMemberBalls: Ball3 | null | undefined;
  lowSimilarity: boolean;
}): string | null {
  const notice =
    args.screenBalls && args.storedMemberBalls
      ? formatRecallPositionDifferenceNotice(
          computeRecallPositionDifference(args.screenBalls, args.storedMemberBalls)
        )
      : null;
  if (notice && args.lowSimilarity) return `${notice}\n\n유사도 낮음`;
  if (notice) return notice;
  return args.lowSimilarity ? "유사도 낮음" : null;
}
