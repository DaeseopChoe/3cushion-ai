// convertCanonicalAnchors.js
// FG → RG 변환 전용 canonical 모듈
// 송설님 요구: 레일 교점 정확 계산

function unwrapAnchor(anchor) {
  if (!anchor) return null;
  const sysFieldKey =
    typeof anchor.sysFieldKey === "string" && anchor.sysFieldKey.length > 0
      ? anchor.sysFieldKey
      : undefined;
  if (anchor.coord && typeof anchor.coord.x === "number" && typeof anchor.coord.y === "number") {
    return {
      pt: anchor.coord,
      valueSpace: anchor.valueSpace,
      sysFieldKey,
    };
  }
  if (typeof anchor.x === "number" && typeof anchor.y === "number") {
    return {
      pt: { x: anchor.x, y: anchor.y },
      valueSpace: anchor.valueSpace ?? null,
      sysFieldKey,
    };
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
    // Preserve Phase 1 Mark reference provenance when present.
    const out = { x: un.pt.x, y: un.pt.y };
    if (un.valueSpace === "Fg" || un.valueSpace === "Rg") {
      out.valueSpace = un.valueSpace;
    }
    if (un.sysFieldKey) {
      out.sysFieldKey = un.sysFieldKey;
    }
    result[key] = out;
  }

  return result;
}