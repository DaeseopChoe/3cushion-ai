/**
 * 5&Half slide/draw effective sign by shot type (공략 유형).
 * Stored corrections stay slide≥0, draw≤0; only effective unified slide is flipped.
 */

/** +1 = 뒤돌리기 계열 (밀림→CO↑), -1 = 옆돌리기 계열 (밀림→CO↓) */
export function getShotTypeCorrectionSign(shotType?: string | null): number {
  if (shotType?.startsWith("옆돌리기")) return -1;
  return 1;
}
