// frontend/src/domain/positionSearchEngine.ts
export type Point = { x: number; y: number };
export type Ball3 = { cue: Point; target: Point; second: Point };

export type StrategySignature = {
  systemId: string; // 예: "5_half_system"
  formulaHash: string; // profile.formula.expr 기반 해시/버전
  shotType: string; // 예: "뒤돌리기" or "T=BANK" 등 프로젝트 기준
};

export type StrategyMeta = {
  // 저장 시점에 미리 계산/저장해두는 메타 (A안 채택)
  impact: Point; // 임팩트볼(또는 임팩트 지점) 좌표
  final: Point; // 최종 도착(쿠션 접점) 좌표
  angle_ci: number; // cue -> impact 방향 각도 (atan2)
  angle_fs: number; // final -> second 방향 각도 (atan2)  ✅ 목계님 기준 반영
};

export type StrategyEntry = {
  slot: "S1" | "S2" | "S3";
  signature: StrategySignature;

  // 보간 대상(원본 입력값)
  sysInputs: Record<string, number>;
  hpT?: unknown;
  str?: unknown;
  ai?: unknown;

  // 검색용 메타
  meta: StrategyMeta;
};

export type PositionRecord = {
  positionId: string;
  balls: Ball3;
  strategies: StrategyEntry[];
};

export type SearchParams = {
  userBalls: Ball3;
  dataset: PositionRecord[];

  // 1차 필터: signature 고정 (사용자 화면에서는 "현재 선택한 전략 그룹" 또는 "전체 검색" 둘 다 가능)
  signature?: StrategySignature; // 주어지면 해당 signature만, 없으면 모든 signature 그룹 대상으로

  // 2볼 근사 허용 반경(그리드 단위)
  epsilon?: number; // default는 아래 getDefaultEpsilon 사용
  maxCandidatesAfter2Ball?: number; // default 15

  // 각도 유사 임계치(라디안)
  angleThresholdCi?: number; // default ~ 0.20 rad (약 11.5도)
  angleThresholdFs?: number; // default ~ 0.25 rad (약 14.3도)

  // "남은 1볼이 선상 근처인가" 판정 임계치(그리드 단위)
  lineThreshold?: number; // default 0.7

  // 최종 공식 실행 개수
  maxToEvaluate?: number; // default 8

  // 공식 실행 콜백 (systemCalculator + trajectory builder 등은 domain 밖)
  evaluateStrategy?: (args: {
    userBalls: Ball3;
    strategy: StrategyEntry;
  }) => {
    userImpact: Point;
    userFinal: Point;
    // 필요하면 sysResult/trajectorySamples 등 추가 가능
  };
};

export type SearchHit = {
  positionId: string;
  slot: "S1" | "S2" | "S3";
  signature: StrategySignature;
  baseBalls: Ball3;

  strategy: StrategyEntry;

  // 랭킹 점수(작을수록 좋음)
  score: number;

  // evaluateStrategy를 수행했으면 채움
  userImpact?: Point;
  userFinal?: Point;
};

export type SearchResult = {
  hitsTop3: SearchHit[];
  debug?: {
    total: number;
    afterSignature: number;
    after2Ball: number;
    afterAngle: number;
    afterLine: number;
    evaluated: number;
  };
};

// ---------- math helpers ----------
function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

// 최소 각도 차이(0..PI)
function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

// 점 P가 선분 AB에서 얼마나 떨어졌는지(직선거리). AB가 너무 짧으면 큰 값 리턴.
function pointLineDistance(A: Point, B: Point, P: Point): number {
  const vx = B.x - A.x;
  const vy = B.y - A.y;
  const len = Math.hypot(vx, vy);
  if (len < 1e-6) return Number.POSITIVE_INFINITY;
  const num = Math.abs((P.x - A.x) * vy - (P.y - A.y) * vx);
  return num / len;
}

export function getDefaultEpsilon(tableLong = 80, ballRadius = 0.5): number {
  // ε = max(ballRadius*1.5, 0.015*tableLong)
  return Math.max(ballRadius * 1.5, 0.015 * tableLong);
}

// 2볼 근사 점수(작을수록 좋음). min(dc+dt, dc+ds, dt+ds)
function score2Ball(
  user: Ball3,
  cand: Ball3
): { score: number; pair: "CT" | "CS" | "TS" } {
  const dc = dist(user.cue, cand.cue);
  const dt = dist(user.target, cand.target);
  const ds = dist(user.second, cand.second);

  const ct = dc + dt;
  const cs = dc + ds;
  const ts = dt + ds;

  if (ct <= cs && ct <= ts) return { score: ct, pair: "CT" };
  if (cs <= ct && cs <= ts) return { score: cs, pair: "CS" };
  return { score: ts, pair: "TS" };
}

// 남은 1볼이 "파생 선상" 근처인지 확인
function passLineGate(
  pair: "CT" | "CS" | "TS",
  user: Ball3,
  meta: StrategyMeta,
  lineThreshold: number
): boolean {
  // pair에 따라 남는 볼이 달라짐
  // 핵심 철학(B): cue->impact 선, final->second 선을 사용해서 "남은 볼"이 선상 근처인지 체크
  //
  // - CT가 맞았다면 남는 건 second: final->second 선과의 관계가 의미 있을 수 있음
  // - CS가 맞았다면 남는 건 target: cue->impact 선과의 관계가 의미 있을 수 있음
  // - TS가 맞았다면 남는 건 cue: cue->impact 선은 cue가 시작점이라 의미 약함. 이 케이스는 보수적으로 통과 조건을 약하게(또는 다른 선) 처리.
  //
  if (pair === "CS") {
    // 남는 target이 cue->impact 직선 근처인가?
    const d = pointLineDistance(user.cue, meta.impact, user.target);
    return d <= lineThreshold;
  }
  if (pair === "CT") {
    // CT의 선상 검증은 의미가 약함 - 보수적으로 통과
    return true;
  }
  // TS: 남는 cue는 출발점이라 선상검증이 크게 의미 없어서 true
  return true;
}

// signature 비교
function sameSignature(a: StrategySignature, b: StrategySignature): boolean {
  return (
    a.systemId === b.systemId &&
    a.formulaHash === b.formulaHash &&
    a.shotType === b.shotType
  );
}

export function searchStrategies(params: SearchParams): SearchResult {
  const {
    userBalls,
    dataset,
    signature,
    epsilon = getDefaultEpsilon(),
    maxCandidatesAfter2Ball = 15,
    angleThresholdCi = 0.2,
    angleThresholdFs = 0.25,
    lineThreshold = 0.7,
    maxToEvaluate = 8,
    evaluateStrategy,
  } = params;

  let total = 0;
  let afterSignature = 0;
  let after2Ball = 0;
  let afterAngle = 0;
  let afterLine = 0;
  let evaluated = 0;

  // 1) flatten 전략
  const all: Array<{ rec: PositionRecord; strat: StrategyEntry }> = [];
  for (const rec of dataset) {
    for (const strat of rec.strategies) {
      total++;
      if (signature && !sameSignature(strat.signature, signature)) continue;
      afterSignature++;
      all.push({ rec, strat });
    }
  }

  // 2) 2볼 근사로 후보 축소
  const scored2Ball = all
    .map(({ rec, strat }) => {
      const s = score2Ball(userBalls, rec.balls);
      return {
        rec,
        strat,
        pair: s.pair,
        score2: s.score,
      };
    })
    .filter((x) => x.score2 <= epsilon * 2) // ε*2는 "두 공 합"이라 보수적으로
    .sort((a, b) => a.score2 - b.score2)
    .slice(0, maxCandidatesAfter2Ball);

  after2Ball = scored2Ball.length;

  // 3) 각도 게이트(저장 메타 기반). user 각도는 아직 확정 불가 -> "근사 대체"를 사용:
  //    - cue->target 방향을 user의 1차 방향 힌트로 사용하여 cue->impact 방향과 크게 다르면 제거
  //    - final->second도 user의 target/second 배치 힌트로 제한적으로 사용
  const userAngleHintCi = angle(userBalls.cue, userBalls.target);
  const userAngleHintFs = angle(userBalls.target, userBalls.second); // 힌트용. 최종은 evaluate 후 비교

  const afterAngleGate = scored2Ball.filter((x) => {
    const dCi = angleDiff(x.strat.meta.angle_ci, userAngleHintCi);
    if (dCi > angleThresholdCi) return false;

    const dFs = angleDiff(x.strat.meta.angle_fs, userAngleHintFs);
    if (dFs > angleThresholdFs) return false;

    return true;
  });

  afterAngle = afterAngleGate.length;

  // 4) 선상 게이트(선택적/보수적)
  const afterLineGate = afterAngleGate.filter((x) =>
    passLineGate(x.pair, userBalls, x.strat.meta, lineThreshold)
  );
  afterLine = afterLineGate.length;

  // 5) 상위 maxToEvaluate만 공식 실행하여 userImpact/userFinal 계산 후 정밀 스코어링
  const toEval = afterLineGate.slice(0, maxToEvaluate);

  const hits: SearchHit[] = toEval.map((x) => {
    const baseScore = x.score2; // 2볼 점수 기반
    const hit: SearchHit = {
      positionId: x.rec.positionId,
      slot: x.strat.slot,
      signature: x.strat.signature,
      baseBalls: x.rec.balls,
      strategy: x.strat,
      score: baseScore,
    };

    if (evaluateStrategy) {
      evaluated++;
      const out = evaluateStrategy({ userBalls, strategy: x.strat });

      // 정밀 스코어 = 2볼점수 + impact 거리 + final 거리 + 각도차
      const dImpact = dist(out.userImpact, x.strat.meta.impact);
      const dFinal = dist(out.userFinal, x.strat.meta.final);
      const aCi = angleDiff(
        angle(userBalls.cue, out.userImpact),
        x.strat.meta.angle_ci
      );
      const aFs = angleDiff(
        angle(out.userFinal, userBalls.second),
        x.strat.meta.angle_fs
      ); // final->second 비교

      hit.userImpact = out.userImpact;
      hit.userFinal = out.userFinal;

      hit.score =
        baseScore +
        dImpact * 2.0 +
        dFinal * 2.5 +
        aCi * 3.0 +
        aFs * 3.0;
    }

    return hit;
  });

  // 6) 최종 Top3
  const hitsTop3 = hits.sort((a, b) => a.score - b.score).slice(0, 3);

  return {
    hitsTop3,
    debug: {
      total,
      afterSignature,
      after2Ball,
      afterAngle,
      afterLine,
      evaluated,
    },
  };
}
