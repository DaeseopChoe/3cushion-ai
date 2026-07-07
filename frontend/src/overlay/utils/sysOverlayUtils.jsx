export {
  resolveCoC1C3Keys,
  normalizeToFormulaInputsApp,
  isRhsKeyReadOnlyForSys,
  buildSysOverlayNumericPayload,
  unifiedSlideFromCorrections,
} from "../../domain/calculator/sysOverlayCalcHelpers";

/** 5&Half SYS 표시용 숫자 포맷 (계산 로직과 무관) */
export function fmtFiveHalfDisplayNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "?";
  return x % 1 === 0 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
}

/** SysOverlay input 표시 전용 — 빈값 유지, 숫자는 fmtFiveHalfDisplayNum */
export function fmtSysOverlayInputDisplay(value) {
  if (value === "" || value === null || value === undefined) return "";
  const x = Number(value);
  if (!Number.isFinite(x)) return "";
  return fmtFiveHalfDisplayNum(x);
}

export function isMarkBasisReadOnly(mark, systemMode) {
  return systemMode === "derived" && mark === "C3";
}

export function lhsTokenFromExpr(expr) {
  if (!expr || !expr.trim()) return "";
  const parts = expr.trim().split("=");
  return parts[0]?.trim() ?? "";
}

export function showMarkRowExtraForSys(mark, systemMode, lhsToken) {
  if (systemMode !== "derived" || !lhsToken) return false;
  if (mark === "C1" && lhsToken.startsWith("C1_")) return true;
  if (mark === "C3" && lhsToken.startsWith("C3_")) return true;
  return false;
}

/** 적용 시 저장된 system_values(base)를 입력 필드 초기값으로 병합 */
export function buildSysOverlayInitialInputs(data) {
  const ins = {
    CO_f: data?.inputs?.CO_f ?? "",
    CO_r: data?.inputs?.CO_r ?? "",
    C1_f: data?.inputs?.C1_f ?? "",
    C1_r: data?.inputs?.C1_r ?? "",
    C2_f: data?.inputs?.C2_f ?? "",
    C2_r: data?.inputs?.C2_r ?? "",
    C3_f: data?.inputs?.C3_f ?? "",
    C3_r: data?.inputs?.C3_r ?? "",
    C4_f: data?.inputs?.C4_f ?? "",
    C4_r: data?.inputs?.C4_r ?? "",
    HP_n: data?.inputs?.HP_n ?? 0,
    An: data?.inputs?.An ?? 0.0,
  };
  const saved = data?.system_values;
  if (saved && typeof saved === "object") {
    for (const [k, v] of Object.entries(saved)) {
      if (!(k in ins)) continue;
      if (v === undefined || v === null) continue;
      if (k === "HP_n") ins.HP_n = typeof v === "number" ? v : Number(v) || 0;
      else if (k === "An") ins.An = typeof v === "number" ? v : Number(v) || 0;
      else ins[k] = v;
    }
  }
  return ins;
}

/** 저장·복원 시 slide≥0, draw≤0, 상호 배타(draw 우선 시 slide=0) */
export function normalizeSlideDrawCorrections(corrections) {
  if (!corrections || typeof corrections !== "object") {
    return { slide: 0, draw: 0 };
  }
  const s = Number(corrections.slide);
  const d = Number(corrections.draw);
  let slide = Math.abs(Number.isFinite(s) ? s : 0);
  let draw = Number.isFinite(d) ? d : 0;
  if (draw !== 0) draw = -Math.abs(draw);
  if (draw !== 0) slide = 0;
  return { slide, draw };
}

/** SysOverlay 표시 전용 — admin/sys SysOverlay.tsx와 동일 규약 */
export function formatFormulaDisplay(expr, output) {
  const idx = expr.indexOf("=");
  if (idx < 0) return expr;
  const lhs = expr.slice(0, idx).trim();
  const rhs = expr.slice(idx + 1).trim();
  const lhsVal = lhs in output ? fmtFiveHalfDisplayNum(output[lhs]) : "?";
  const rhsSubstituted = rhs.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (token) => {
    if (token in output) {
      return `${token}_${fmtFiveHalfDisplayNum(output[token])}`;
    }
    return token;
  });
  return `${lhs}_${lhsVal} = ${rhsSubstituted}`;
}

export const SYS_FORMULA_TOKEN_RE = /[A-Z][A-Z0-9]*_[fr](?:_[-\d.]+)?/g;

export function renderMixedFormulaLine(line) {
  if (!line) return null;
  SYS_FORMULA_TOKEN_RE.lastIndex = 0;
  const nodes = [];
  let lastIndex = 0;
  let match;
  while ((match = SYS_FORMULA_TOKEN_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`t-${lastIndex}`} className="sys-info-box__text">
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }
    nodes.push(
      <span key={`m-${match.index}`} className="sys-info-box__mono">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    nodes.push(
      <span key={`t-${lastIndex}`} className="sys-info-box__text">
        {line.slice(lastIndex)}
      </span>
    );
  }
  return nodes;
}

export function renderSysFormulaContent(line) {
  if (!line) return null;
  const hasKorean = /[\uAC00-\uD7A3]/.test(line);
  SYS_FORMULA_TOKEN_RE.lastIndex = 0;
  const hasFormulaToken = SYS_FORMULA_TOKEN_RE.test(line);
  if (!hasKorean && hasFormulaToken) {
    return <span className="sys-info-box__mono">{line}</span>;
  }
  if (hasKorean) {
    return renderMixedFormulaLine(line);
  }
  return <span className="sys-info-box__text">{line}</span>;
}
