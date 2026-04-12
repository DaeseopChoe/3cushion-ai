// 좌표 변환 / px 변환 / grid 변환 관련 순수 함수
// App.jsx에서 분리 (Step 1: Geometry 분리)
// scale, tableH, padding은 호출부에서 인자로 전달 (상수 정의 금지)

export function toPx(
  rg: { x: number; y: number },
  scale: number,
  tableH: number
) {
  const { x, y } = rg;
  return { x: x * scale, y: tableH - y * scale };
}

export function toRg(
  px: { x: number; y: number },
  scale: number,
  tableH: number
) {
  return {
    x: px.x / scale,
    y: (tableH - px.y) / scale
  };
}

export function pointerToRg(
  e: PointerEvent,
  svgEl: SVGSVGElement,
  scale: number,
  tableH: number,
  padding: number
) {
  const pt = svgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;

  const p = pt.matrixTransform(ctm.inverse());
  const px = { x: p.x - padding, y: p.y - padding };
  return toRg(px, scale, tableH);
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function formatResultNum(n: number | string) {
  const x = Number(n);
  if (Number.isNaN(x)) return '0';
  return x % 1 === 0 ? String(Math.round(x)) : String(x);
}

export function fmt(n: number) {
  return n % 1 === 0 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
