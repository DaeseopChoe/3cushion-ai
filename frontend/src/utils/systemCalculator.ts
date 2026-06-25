/**
 * formula.expr 기반 수식 계산
 * LHS = RHS (산술 연산 +, -, *, / 지원)
 */

function extractLhsRhs(expr: string): { lhs: string; rhs: string } {
  const idx = expr.indexOf("=");
  if (idx < 0) return { lhs: "", rhs: "" };
  const lhs = expr.slice(0, idx).trim();
  const rhs = expr.slice(idx + 1).trim();
  return { lhs, rhs };
}

export function calculateByProfileExpr(
  expr: string,
  inputs: Record<string, number>
): Record<string, number> {
  const trimmed = expr.trim();
  if (!trimmed) return {};

  const { lhs, rhs } = extractLhsRhs(trimmed);
  if (!lhs || !rhs) return {};

  const tokens = rhs.match(/[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|[\+\-\*\/\(\)]/g);
  if (!tokens) return {};

  const rhsJs = tokens
    .map((t) => {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
        return t in inputs ? String(inputs[t]) : "0";
      }
      if (/^\d+(\.\d+)?$/.test(t)) return t;
      if (/^[\+\-\*\/\(\)]$/.test(t)) return t;
      return "0";
    })
    .join(" ");

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("Math", `return (${rhsJs});`);
    const result = fn(Math);
    if (typeof result !== "number" || !Number.isFinite(result)) return {};
    return { [lhs]: result };
  } catch {
    return {};
  }
}
