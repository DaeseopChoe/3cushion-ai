/**
 * 궤적/앵커 UI 표기만 변경. 내부 객체 키(1C, 2C)는 그대로 둠.
 * @param {string} mark
 * @returns {string}
 */
export function cushionMarkToDisplayLabel(mark) {
  if (typeof mark !== "string") return mark;
  const m = mark.match(/^(\d+)C$/);
  return m ? `C${m[1]}` : mark;
}
