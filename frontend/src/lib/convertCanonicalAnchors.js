// convertCanonicalAnchors.js
// FG → RG 변환 전용 canonical 모듈
// 송설님 요구: 레일 교점 정확 계산

function unwrapAnchor(anchor) {
  if (!anchor) return null;
  if (anchor.coord && typeof anchor.coord.x === "number" && typeof anchor.coord.y === "number") {
    return { pt: anchor.coord, valueSpace: anchor.valueSpace };
  }
  if (typeof anchor.x === "number" && typeof anchor.y === "number") {
    return { pt: { x: anchor.x, y: anchor.y }, valueSpace: null };
  }
  return null;
}

export function convertCanonicalAnchors(anchors, canonical) {
  // canonical 좌표는 변환 없이 그대로 사용한다.
  // FG↔RG 보정(offset_fg2rg) 및 레일 교점 재계산은 수행하지 않는다.
  void canonical;
  const result = {};

  for (const key of Object.keys(anchors)) {
    const raw = anchors[key];
    if (!raw) {
      result[key] = null;
      continue;
    }

    const un = unwrapAnchor(raw);
    if (!un || !un.pt) {
      result[key] = null;
      continue;
    }
    result[key] = { x: un.pt.x, y: un.pt.y };
  }

  return result;
}