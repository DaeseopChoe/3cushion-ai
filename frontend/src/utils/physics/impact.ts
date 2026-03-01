// Impact 관련 물리 계산 함수 (App.jsx에서 분리 - Step 2)
// determineRotation, getImpactDirection, calculateImpact
// BALL_DIAMETER_RG, BALL_RADIUS_RG는 호출부(App.jsx)에서 인자로 전달 (상수 정의 금지)

/* -------------------------------------------------------
   선회 방향 자동 판단 (앵커 좌표 기반)
------------------------------------------------------- */
function determineRotation(CO, C1) {
  if (!CO || !C1) return "RIGHT";

  const isB2T = Math.abs(CO.y - (-2.25)) < 0.5;
  const isT2B = Math.abs(CO.y - 42.25) < 0.5;

  if (isB2T) {
    // B2T: CO_x > 1C_x → 좌선회
    return CO.x > C1.x ? "LEFT" : "RIGHT";
  } else if (isT2B) {
    // T2B: CO_x > 1C_x → 우선회
    return CO.x > C1.x ? "RIGHT" : "LEFT";
  }

  return "RIGHT";
}

/* -------------------------------------------------------
   패턴별 impact 방향
------------------------------------------------------- */
function getImpactDirection(rotation, pattern) {
  if (pattern === "뒤돌리기" || pattern === "BACKDOUBLE") {
    // 뒤돌리기: 선회 반대로 겨냥
    return rotation === "LEFT" ? 1 : -1;  // 좌선회→우측(+1), 우선회→좌측(-1)
  } else if (pattern === "옆돌리기" || pattern === "SIDEDOUBLE") {
    // 옆돌리기: 선회 그대로 겨냥
    return rotation === "LEFT" ? -1 : 1;  // 좌선회→좌측(-1), 우선회→우측(+1)
  }

  // 기본값 (뒤돌리기와 동일)
  return rotation === "LEFT" ? 1 : -1;
}

export function calculateImpact(cue, target, CO_fg, C1_fg, thicknessStr, pattern, BALL_DIAMETER_RG, BALL_RADIUS_RG) {
  let t = 0.5;
  if (typeof thicknessStr === "string" && thicknessStr.includes("/")) {
    const [a, b] = thicknessStr.split("/").map(Number);
    if (b !== 0) t = a / b;
  }
  if (!cue || !target) return null;

  const dx_ct = target.x - cue.x;
  const dy_ct = target.y - cue.y;
  const dist_ct = Math.sqrt(dx_ct * dx_ct + dy_ct * dy_ct);
  if (dist_ct < 1e-6) return { ...target };

  const ux = dx_ct / dist_ct;
  const uy = dy_ct / dist_ct;

  // 앵커로 선회 방향 자동 판단
  const rotation = determineRotation(CO_fg, C1_fg);
  const impactSign = getImpactDirection(rotation, pattern);

  console.log("🎯 Impact 상세:", {
    "큐볼": cue,
    "타겟볼": target,
    "CO_fg": CO_fg,
    "C1_fg": C1_fg,
    "진행방향(ux,uy)": { ux, uy },
    "rotation": rotation,
    "pattern": pattern,
    "impactSign": impactSign,
    "겨냥": impactSign === 1 ? "우측(+1)" : "좌측(-1)",
    "수직벡터(vx,vy)": { vx: impactSign * uy, vy: impactSign * -ux }
  });

  const vx = impactSign * uy;
  const vy = impactSign * -ux;
  const offset = (1 - t) * BALL_DIAMETER_RG;

  return {
    x: target.x - ux * BALL_RADIUS_RG + vx * offset,
    y: target.y - uy * BALL_RADIUS_RG + vy * offset,
  };
}
