// convertCanonicalAnchors.js
// FG → RG 변환 전용 canonical 모듈
// 송설님 요구: 레일 교점 정확 계산

export function convertCanonicalAnchors(anchors, canonical) {
  const offset = canonical.coords.offset_fg2rg || 2.25;

  // -----------------------
  // 1) FG / RG 자동 판별
  // -----------------------
  function detectSpace(pt) {
    if (pt.y < 0 || pt.y > 40) return "FG";
    return "RG";
  }

  // -----------------------
  // 레일 자동 판정
  // -----------------------
  function detectRail(pt) {
    const tolerance = 0.1;
    
    // FG 좌표 기준
    if (Math.abs(pt.y - (-2.25)) < tolerance) return "BOTTOM";
    if (Math.abs(pt.y - 42.25) < tolerance) return "TOP";
    if (Math.abs(pt.x - (-2.25)) < tolerance) return "LEFT";
    if (Math.abs(pt.x - 82.25) < tolerance) return "RIGHT";
    
    // RG 좌표 기준
    if (Math.abs(pt.y - 0) < tolerance) return "BOTTOM";
    if (Math.abs(pt.y - 40) < tolerance) return "TOP";
    if (Math.abs(pt.x - 0) < tolerance) return "LEFT";
    if (Math.abs(pt.x - 80) < tolerance) return "RIGHT";

    return null;
  }

  // -----------------------
  // 2) 레일 교점 계산 (송설님 방식!)
  // -----------------------
  function calculateRailIntersection(p_fg, baseDir, rail) {
    const dx = baseDir.x;
    const dy = baseDir.y;
    
    const eps = 1e-6;
    
    if (rail === "BOTTOM") {
      // y_fg → 2.25 (Fg BOTTOM → Rg y=0)
      if (Math.abs(dy) > eps) {
        const t = (2.25 - p_fg.y) / dy;
        return {
          x: p_fg.x + t * dx - offset,
          y: 0,
        };
      } else {
        return { x: p_fg.x - offset, y: 0 };
      }
    }
    
    if (rail === "TOP") {
      // y_fg → 42.25 (Fg TOP → Rg y=40)
      if (Math.abs(dy) > eps) {
        const t = (42.25 - p_fg.y) / dy;
        return {
          x: p_fg.x + t * dx - offset,
          y: 40,
        };
      } else {
        return { x: p_fg.x - offset, y: 40 };
      }
    }
    
    if (rail === "LEFT") {
      // x_fg → -2.25 (Fg LEFT → Rg x=0)
      if (Math.abs(dx) > eps) {
        const t = (-2.25 - p_fg.x) / dx;
        return {
          x: 0,
          y: p_fg.y + t * dy - offset,
        };
      } else {
        return { x: 0, y: p_fg.y - offset };
      }
    }
    
    if (rail === "RIGHT") {
      // x_fg → 82.25 (Fg RIGHT → Rg x=80)
      if (Math.abs(dx) > eps) {
        const t = (82.25 - p_fg.x) / dx;
        return {
          x: 80,
          y: p_fg.y + t * dy - offset,
        };
      } else {
        return { x: 80, y: p_fg.y - offset };
      }
    }
    
    // 레일이 아니면 단순 offset
    return {
      x: p_fg.x - offset,
      y: p_fg.y - offset,
    };
  }

  // -----------------------
  // 3) CO–1C 기준선 방향
  // -----------------------
  const CO_fg = anchors["CO"];
  const C1_fg = anchors["1C"];

  const CO_space = detectSpace(CO_fg);
  const C1_space = detectSpace(C1_fg);

  let baseDir = { x: 1, y: 0 };
  if (CO_space === "FG" && C1_space === "FG") {
    baseDir = { x: C1_fg.x - CO_fg.x, y: C1_fg.y - CO_fg.y };
  }

  console.log("✅ Canonical 변환:", {
    CO_fg,
    C1_fg,
    baseDir,
    offset,
  });

  // -----------------------
  // 4) 앵커 하나씩 FG→RG 변환
  // -----------------------
  const result = {};

  for (const key of Object.keys(anchors)) {
    const pt = anchors[key];
    if (!pt) {
      result[key] = null;
      continue;
    }

    const space = detectSpace(pt);

    if (space === "RG") {
      // 이미 RG면 그대로
      result[key] = { x: pt.x, y: pt.y };
      console.log(`  ${key} (RG):`, result[key]);
      continue;
    }

    // FG → RG 교점 계산
    const rail = detectRail(pt);
    result[key] = calculateRailIntersection(pt, baseDir, rail);
    
    console.log(`  ${key} (FG→RG):`, {
      fg: pt,
      rail,
      rg: result[key],
    });
  }

  return result;
}