/**
 * autoCaptureEngine.ts
 * 샷 상태가 1초간 안정되면 dataset candidate로 자동 캡처
 */

export type AutoCaptureCandidate = {
  balls: Record<string, { x: number; y: number } | undefined>;
  impact: { x: number; y: number } | undefined;
  systemValues: Record<string, unknown>;
  capturedAt: number;
};

/**
 * 현재 상태를 dataset candidate로 생성
 */
export function createCaptureCandidate(params: {
  balls: Record<string, { x: number; y: number } | undefined>;
  impact: { x: number; y: number } | undefined;
  systemValues: Record<string, unknown>;
}): AutoCaptureCandidate {
  return {
    balls: params.balls,
    impact: params.impact,
    systemValues: params.systemValues ?? {},
    capturedAt: Date.now(),
  };
}

/**
 * candidate를 position record 형태로 변환 (저장 파이프라인용)
 */
export function candidateToPositionPayload(candidate: AutoCaptureCandidate) {
  const balls = candidate.balls ?? {};
  const cue = balls.cue ?? { x: 10, y: 10 };
  const target = balls.target_center ?? balls.target ?? { x: 50, y: 25 };
  const second = balls.second ?? { x: 40, y: 20 };
  return {
    balls: { cue, target, second },
    impact: candidate.impact,
    systemValues: candidate.systemValues,
  };
}
