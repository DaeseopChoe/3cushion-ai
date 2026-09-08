/**
 * Numeric token preservation guard for AI proofreading.
 * Multiset mismatch → REJECT (no preview / no draft mutation).
 */

/** Number-like tokens: 2C/3C first, then 2.5, 1/2, +2, -1, 30°, 50%, 80mm, etc. */
const NUMERIC_TOKEN_RE =
  /\d+[Cc]|[+-]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?(?:°|%|mm|cm|m)?/g;

/**
 * @param {unknown} text
 * @returns {string[]}
 */
export function extractNumericTokens(text) {
  const s = String(text ?? "");
  const matches = s.match(NUMERIC_TOKEN_RE);
  if (!matches || matches.length === 0) return [];
  return matches.slice().sort();
}

/**
 * @param {unknown} original
 * @param {unknown} corrected
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function assertNumericPreserved(original, corrected) {
  const a = extractNumericTokens(original);
  const b = extractNumericTokens(corrected);
  if (a.length !== b.length) {
    return {
      ok: false,
      code: "NUMERIC_GUARD",
      message:
        "교정 결과가 원문의 숫자 정보를 보존하지 않아 적용할 수 없습니다.",
    };
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return {
        ok: false,
        code: "NUMERIC_GUARD",
        message:
          "교정 결과가 원문의 숫자 정보를 보존하지 않아 적용할 수 없습니다.",
      };
    }
  }
  return { ok: true };
}
