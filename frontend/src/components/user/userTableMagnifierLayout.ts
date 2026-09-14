import {
  USER_TABLE_MAGNIFIER_DIAMETER,
  USER_TABLE_MAGNIFIER_ZOOM,
} from "../../config/tableConfig";

export const DEFAULT_MAGNIFIER_ZOOM = USER_TABLE_MAGNIFIER_ZOOM;
export const DEFAULT_MAGNIFIER_DIAMETER = USER_TABLE_MAGNIFIER_DIAMETER;

export function clampLensPosition(
  x: number,
  y: number,
  hostWidth: number,
  hostHeight: number,
  diameter: number,
  padding = 4
): { x: number; y: number } {
  const maxX = Math.max(padding, hostWidth - diameter - padding);
  const maxY = Math.max(padding, hostHeight - diameter - padding);
  return {
    x: Math.min(Math.max(padding, x), maxX),
    y: Math.min(Math.max(padding, y), maxY),
  };
}

export function defaultLensPosition(
  hostWidth: number,
  hostHeight: number,
  diameter: number
): { x: number; y: number } {
  return clampLensPosition(
    hostWidth - diameter - 12,
    Math.max(8, hostHeight * 0.1),
    hostWidth,
    hostHeight,
    diameter
  );
}

/** ViewBox window for magnifier inner SVG (presentation coords, not Fg/Rg calc). */
export function computeMagnifierViewBox(
  centerVbX: number,
  centerVbY: number,
  renderedWidth: number,
  renderedHeight: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
  lensDiameter: number,
  zoom: number
): { x: number; y: number; width: number; height: number } {
  const safeRenderedW = renderedWidth > 0 ? renderedWidth : 1;
  const safeRenderedH = renderedHeight > 0 ? renderedHeight : 1;
  const visibleVbW = (lensDiameter / zoom) * (viewBoxWidth / safeRenderedW);
  const visibleVbH = (lensDiameter / zoom) * (viewBoxHeight / safeRenderedH);
  return {
    x: centerVbX - visibleVbW / 2,
    y: centerVbY - visibleVbH / 2,
    width: visibleVbW,
    height: visibleVbH,
  };
}
