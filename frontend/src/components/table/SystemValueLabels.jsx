import React, { useState, useCallback, useEffect } from "react";
import { toPx } from "../../utils/geometry/coords";
import { cushionMarkToDisplayLabel } from "../../utils/cushionDisplayLabel";
import { getLabelNumericSuffix } from "../../domain/anchorCoordinateEngine";
import {
  CAPTION_FONT_SIZE,
  computeGroupLabelPosition,
  computeGroupCaptionPlacements,
  detectAxisSideFromFg,
  getMarkLabelColor,
} from "../../domain/systemAxisCaption";
import { SYS_LABEL_BASE_FONT_SIZE } from "../../config/tableConfig";
import {
  buildSvgLabelReadabilityStyle,
  isLabelReadabilityEnhanced,
} from "../../renderer/labels/labelReadabilityStyle";
import {
  CUSHION_FOCUS_VALUE_COLOR,
  resolveFocusedSystemLabelSize,
} from "../../renderer/labels/cushionValuePanelModel";
import AnchorPoint from "./AnchorPoint";
import LabelText from "./LabelText";

const MARK_LABEL_BASE_FONT_SIZE = 20;

/** 라벨 표시 전용 — 내부 계산·저장값은 변경하지 않음 */
function formatSysLabelValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(1);
}

const LABEL_PRIORITY = {
  CO: 0,
  "1C": 1,
  "2C": 2,
  "3C": 3,
  "4C": 4,
  "5C": 5,
  "6C": 6,
};

function byPriority(a, b) {
  const pa = LABEL_PRIORITY[a.label] ?? 999;
  const pb = LABEL_PRIORITY[b.label] ?? 999;
  if (pa !== pb) return pa - pb;
  return String(a.label).localeCompare(String(b.label));
}

/** 노란 Mark는 고정. text만 table 안쪽으로 이동. */
const MARK_LABEL_INSET_PX = 16;
const MARK_LABEL_SIDE_GAP_PX = 14;
const MARK_RAIL_EPS = 0.6;
const FRAME_SCALE_FILL = "#FFFFFF";
const CO_C1_SCALE_FILL = "#FFFFFF";
const FRAME_SCALE_HALO_FILTER = "drop-shadow(0 0 0.75px #33251B)";
const SEMANTIC_MARK_LABELS = new Set(["C4", "C5", "C6"]);

function isFrameScaleCoord(coord) {
  const x = Number(coord?.x);
  const y = Number(coord?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return (
    Math.abs(x + 2.25) <= MARK_RAIL_EPS ||
    Math.abs(x - 82.25) <= MARK_RAIL_EPS ||
    Math.abs(y + 2.25) <= MARK_RAIL_EPS ||
    Math.abs(y - 42.25) <= MARK_RAIL_EPS
  );
}

function applyFrameScaleHalo(node, enabled) {
  return enabled ? (
    <g style={{ filter: FRAME_SCALE_HALO_FILTER }}>{node}</g>
  ) : (
    node
  );
}

function isCoC1Mark(mark) {
  return mark === "CO" || mark === "C1";
}

function detectMarkRail(coord) {
  const x = Number(coord?.x);
  const y = Number(coord?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x + 2.25) <= MARK_RAIL_EPS || Math.abs(x) <= MARK_RAIL_EPS) return "LEFT";
  if (Math.abs(x - 82.25) <= MARK_RAIL_EPS || Math.abs(x - 80) <= MARK_RAIL_EPS) return "RIGHT";
  if (Math.abs(y + 2.25) <= MARK_RAIL_EPS || Math.abs(y) <= MARK_RAIL_EPS) return "BOTTOM";
  if (Math.abs(y - 42.25) <= MARK_RAIL_EPS || Math.abs(y - 40) <= MARK_RAIL_EPS) return "TOP";
  return null;
}

function inwardMarkLabelOffset(coord) {
  const rail = detectMarkRail(coord);
  if (rail === "TOP") {
    return { dx: 0, dy: MARK_LABEL_INSET_PX, textAnchor: "middle" };
  }
  if (rail === "BOTTOM") {
    return { dx: 0, dy: -MARK_LABEL_INSET_PX, textAnchor: "middle" };
  }
  if (rail === "LEFT") {
    return { dx: MARK_LABEL_SIDE_GAP_PX, dy: 0, textAnchor: "start" };
  }
  if (rail === "RIGHT") {
    return { dx: -MARK_LABEL_SIDE_GAP_PX, dy: 0, textAnchor: "end" };
  }
  const x = Number(coord?.x);
  const y = Number(coord?.y);
  const fromLeft = Number.isFinite(x) && x < 40;
  return {
    dx: fromLeft ? MARK_LABEL_SIDE_GAP_PX : -MARK_LABEL_SIDE_GAP_PX,
    dy: Number.isFinite(y) && y < 20 ? -MARK_LABEL_INSET_PX : MARK_LABEL_INSET_PX,
    textAnchor: fromLeft ? "start" : "end",
  };
}

function collectBaseNodes(anchors) {
  return Object.entries(anchors)
    .map(([label, data]) => {
      if (!data?.coord) return null;
      const x = Number(data.coord.x);
      const y = Number(data.coord.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const coord = { x, y };
      return {
        label,
        coord,
      };
    })
    .filter(Boolean)
    .sort(byPriority);
}

function renderNode(
  node,
  {
    scale,
    tableH,
    padding,
    systemValues,
    labelValueOverrides,
    onAnchorDoubleClick,
    onBaselineDraftApplyClick,
    labelScale = 1,
  }
) {
  const markFontSize = MARK_LABEL_BASE_FONT_SIZE * labelScale;
  const readabilityStyle = buildSvgLabelReadabilityStyle(
    isLabelReadabilityEnhanced(labelScale)
  );
  const p = toPx(node.coord, scale, tableH);
  const cx = p.x + padding;
  const cy = p.y + padding;
  const labelInset = inwardMarkLabelOffset(node.coord);
  const textX = cx + labelInset.dx;
  const textY = cy + labelInset.dy;
  const textAnchor = labelInset.textAnchor;
  const override = labelValueOverrides?.[node.label];
  const checkOnlyPending = !!override?.preview && !!override?.checkOnly;
  const num =
    !checkOnlyPending &&
    override?.value != null &&
    Number.isFinite(Number(override.value))
      ? Number(override.value)
      : getLabelNumericSuffix(node.label, systemValues);
  const systemValue = num != null ? formatSysLabelValue(num) : "";
  if (node.label === "C2" && systemValue === "") {
    return null;
  }
  const displayMark = cushionMarkToDisplayLabel(node.label);
  const textContent =
    systemValue !== "" ? `${displayMark}_${systemValue}` : displayMark;
  const labelFill =
    override?.preview && !checkOnlyPending ? "#67e8f9" : "#FFFFFF";
  const showApplyButton =
    !!override?.preview && typeof onBaselineDraftApplyClick === "function";
  const applyGap = 12;
  const checkHitW = 28;
  const checkHitH = 28;
  /** 노란 드래그 핸들(cx,cy)과 분리 — 라벨+✓ 블록만 이동 */
  const draftLabelOffsetX = 22;
  const draftLabelOffsetY =
    node.label === "CO" ? -20 : node.label === "C1" ? 20 : 0;

  const handleApplyClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onBaselineDraftApplyClick(node.label);
  };

  const handleApplyPointerDown = (e) => {
    e.stopPropagation();
  };

  return (
    <g key={node.label}>
      <AnchorPoint
        cx={cx}
        cy={cy}
        dx={0}
        dy={0}
        textAnchor="middle"
        fontSize={markFontSize}
        label={node.label}
        displayLabel={displayMark}
        systemValue={systemValue}
        onDoubleClick={showApplyButton ? undefined : onAnchorDoubleClick}
      />
      {showApplyButton && checkOnlyPending ? (
        <>
          <text
            x={textX}
            y={textY}
            fill={labelFill}
            fontSize={markFontSize}
            fontWeight="bold"
            textAnchor={textAnchor}
            dominantBaseline="middle"
            style={readabilityStyle}
          >
            {textContent}
          </text>
          <g
            transform={`translate(${cx + draftLabelOffsetX}, ${cy + draftLabelOffsetY})`}
          >
            <g
              className="baseline-draft-apply-btn"
              style={{ cursor: "pointer" }}
              onPointerDown={handleApplyPointerDown}
              onClick={handleApplyClick}
            >
              <rect
                x={-4}
                y={-checkHitH / 2}
                width={checkHitW}
                height={checkHitH}
                fill="transparent"
                pointerEvents="all"
              />
              <text
                x={8}
                y={0}
                fill="#67e8f9"
                fontSize={markFontSize}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: "none" }}
              >
                ✓
              </text>
            </g>
          </g>
        </>
      ) : showApplyButton ? (
        <g
          transform={`translate(${cx + draftLabelOffsetX}, ${cy + draftLabelOffsetY})`}
        >
          <g
            className="baseline-draft-apply-btn"
            style={{ cursor: "pointer" }}
            onPointerDown={handleApplyPointerDown}
            onClick={handleApplyClick}
          >
            <rect
              x={-4}
              y={-checkHitH / 2}
              width={checkHitW}
              height={checkHitH}
              fill="transparent"
              pointerEvents="all"
            />
            <text
              x={8}
              y={0}
              fill="#67e8f9"
              fontSize={markFontSize}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ pointerEvents: "none" }}
            >
              ✓
            </text>
          </g>
          <text
            x={checkHitW + applyGap}
            y={0}
            fill={labelFill}
            fontSize={markFontSize}
            fontWeight="bold"
            textAnchor="start"
            dominantBaseline="middle"
            style={readabilityStyle}
          >
            {textContent}
          </text>
        </g>
      ) : (
        <text
          x={textX}
          y={textY}
          fill={labelFill}
          fontSize={markFontSize}
          fontWeight="bold"
          textAnchor={textAnchor}
          dominantBaseline="middle"
          style={readabilityStyle}
        >
          {textContent}
        </text>
      )}
    </g>
  );
}

/** C4/C5/C6 프레임 인접 raw 라벨 겹침 완화 (5&half 기준 시스템에는 적용하지 않음). */
function applyRawLabelFrameNudges(label, x, y, enabled) {
  if (!enabled) return { x, y };
  let nx = x;
  let ny = y;
  if (label === "C4") {
    if (nx === -2.25) nx = -0.5;
    if (nx === 82.25) nx = 80.5;
    if (ny === -2.25) ny = -0.5;
    if (ny === 42.25) ny = 40.5;
  }
  if (label === "C5") {
    if (nx === -2.25) nx = 0.5;
    if (nx === 82.25) nx = 79.5;
    if (ny === -2.25) ny = 0.5;
    if (ny === 42.25) ny = 39.5;
  }
  if (label === "C6") {
    if (nx === -2.25) nx = -1;
    if (nx === 82.25) nx = 81;
    if (ny === -2.25) ny = -1;
    if (ny === 42.25) ny = 41;
  }
  return { x: nx, y: ny };
}

function rawLabelColor(label, frameScaleContrast = false) {
  if (isCoC1Mark(label)) {
    return CO_C1_SCALE_FILL;
  }
  if (frameScaleContrast && !SEMANTIC_MARK_LABELS.has(label)) {
    return FRAME_SCALE_FILL;
  }
  return getMarkLabelColor(label);
}

const TOUCH_HIT_ATTR = "data-sys-label-hit";

function buildLabelTextProps(labelId, touchCtx) {
  if (!touchCtx?.interactive) {
    return { interactive: false, active: false };
  }
  const isActive = touchCtx.activeLabelId === labelId;
  return {
    interactive: true,
    active: isActive,
    hitDataAttr: TOUCH_HIT_ATTR,
    onPointerDown: (e) => touchCtx.onPointerDown(labelId, e),
  };
}

function renderGroupLabels(captionBuckets, scale, tableH, padding, labelScale, touchCtx) {
  /** 시스템값 그룹 라벨 — (axis+mark) 버킷당 1회, 여유 공간 기반 배치 */
  const bucketInputs = [];
  for (const [bucketKey, bucket] of captionBuckets) {
    const [side, mark] = bucketKey.split(":");
    if (!side || !mark || bucket.points.length === 0) continue;
    bucketInputs.push({
      mark,
      side,
      points: bucket.points,
    });
  }

  const tableBounds = {
    minX: padding,
    maxX: scale * 80 + padding,
    minY: padding,
    maxY: tableH + padding,
  };

  const placements = computeGroupCaptionPlacements(
    bucketInputs,
    tableBounds,
    labelScale
  );
  const frameCaptionKeys = new Set(
    bucketInputs
      .filter(({ points }) =>
        points.some((point) =>
          isFrameScaleCoord({ x: point.fgX, y: point.fgY })
        )
      )
      .map(({ side, mark }) => `${side}:${mark}`)
  );
  const placementKeys = new Set(
    placements.map((placement) => `${placement.side}:${placement.mark}`)
  );
  const fallbackPlacements = bucketInputs
    .filter(({ side, mark }) => !placementKeys.has(`${side}:${mark}`))
    .map(({ side, mark, points }) => {
      const pos = computeGroupLabelPosition(
        side,
        points,
        tableBounds,
        mark,
        undefined,
        labelScale
      );
      if (!pos) return null;
      return {
        mark,
        side,
        x: pos.x,
        y: pos.y,
        rotationDeg: side === "left" ? -90 : side === "right" ? 90 : 0,
        fontSize: CAPTION_FONT_SIZE * labelScale,
        fill: getMarkLabelColor(mark),
      };
    })
    .filter(Boolean);

  return [...placements, ...fallbackPlacements].map((placement) => {
    const labelId = `CAP-${placement.side}-${placement.mark}`;
    const displayMark = cushionMarkToDisplayLabel(placement.mark);
    const isFrameCaption = frameCaptionKeys.has(
      `${placement.side}:${placement.mark}`
    );
    const identifierFill =
      isFrameCaption && isCoC1Mark(placement.mark)
        ? CO_C1_SCALE_FILL
        : placement.fill;
    const captionNode = (
      <g
        key={labelId}
        transform={
          placement.rotationDeg !== 0
            ? `rotate(${placement.rotationDeg}, ${placement.x}, ${placement.y})`
            : undefined
        }
      >
        <LabelText
          x={placement.x}
          y={placement.y}
          text={displayMark}
          fontSize={placement.fontSize}
          color={identifierFill}
          readabilityScale={labelScale}
          {...buildLabelTextProps(labelId, touchCtx)}
        />
      </g>
    );
    return {
      id: labelId,
      node: applyFrameScaleHalo(
        captionNode,
        frameCaptionKeys.has(`${placement.side}:${placement.mark}`)
      ),
    };
  });
}

function buildRawLabelEntries(
  labelAnchors,
  scale,
  tableH,
  padding,
  labelStrategy,
  showAxisCaptions = false,
  labelScale = 1,
  touchCtx = null,
  focusOpts = null
) {
  if (!labelAnchors) return [];

  const applyCushionNudges = true;
  const entries = [];
  const captionBuckets = new Map();
  const rawFontSize = SYS_LABEL_BASE_FONT_SIZE * labelScale;
  /** selection ≥1 → filter + focus size/color; selection 0 / null → all normal */
  const focusActive =
    Array.isArray(focusOpts?.families) && focusOpts.families.length > 0;
  const focusSet = focusActive ? new Set(focusOpts.families) : null;
  const focusFontSize =
    focusActive && Number.isFinite(focusOpts.fontSize) && focusOpts.fontSize > 0
      ? focusOpts.fontSize
      : rawFontSize;
  const focusColor =
    typeof focusOpts?.color === "string" && focusOpts.color
      ? focusOpts.color
      : CUSHION_FOCUS_VALUE_COLOR;
  const focusReadabilityScale = Math.max(labelScale, 2);
  const labelTouchCtx = focusActive ? null : touchCtx;

  const pushGroup = (label, coord, value, idx) => {
    const frameScaleContrast = isFrameScaleCoord(coord);
    let { x, y } = coord;
    ({ x, y } = applyRawLabelFrameNudges(label, x, y, applyCushionNudges));

    const p = toPx({ x, y }, scale, tableH);
    const pxX = p.x + padding;
    const pxY = p.y + padding;

    const fillColor = focusActive
      ? focusColor
      : rawLabelColor(label, frameScaleContrast);
    const fontSize = focusActive ? focusFontSize : rawFontSize;
    const readabilityScale = focusActive ? focusReadabilityScale : labelScale;
    const labelId = `RAW-${label}-${idx}`;
    const labelNode = (
      <LabelText
        key={labelId}
        x={pxX}
        y={pxY}
        text={value != null ? String(value) : ""}
        fontSize={fontSize}
        color={fillColor}
        readabilityScale={readabilityScale}
        {...buildLabelTextProps(labelId, labelTouchCtx)}
      />
    );

    entries.push({
      id: labelId,
      family: label,
      pxX,
      pxY,
      value: value != null && Number.isFinite(Number(value)) ? Number(value) : null,
      focused: focusActive,
      node: applyFrameScaleHalo(
        focusActive ? (
          <g className="sys-label-focus" style={{ overflow: "visible" }}>
            {labelNode}
          </g>
        ) : (
          labelNode
        ),
        !focusActive && frameScaleContrast
      ),
    });

    if (showAxisCaptions) {
      const side = detectAxisSideFromFg(x, y);
      const bucketKey = `${side}:${label}`;
      if (!captionBuckets.has(bucketKey)) {
        captionBuckets.set(bucketKey, { label, points: [] });
      }
      const point = {
        pxX,
        pxY,
        fgX: x,
        fgY: y,
        value: value != null && Number.isFinite(Number(value)) ? Number(value) : 0,
      };
      captionBuckets.get(bucketKey).points.push(point);

      // CO 코너 앵커: bottom/top bucket 배정 후 인접 left/right bucket에도 추가.
      // 코너점(fgX가 좌우 경계 AND fgY가 상하 경계)은 두 레일 경계에 걸쳐 있으므로
      // 측면 bucket도 이 점을 참조해야 50~60 공간을 외부 공간으로 판단할 수 있음.
      if (label === "CO") {
        const atLeft  = Math.abs(x - (-2.25)) < 0.01;
        const atRight = Math.abs(x - 82.25)   < 0.01;
        const atTop   = Math.abs(y - 42.25)   < 0.01;
        const atBottom = Math.abs(y - (-2.25)) < 0.01;
        if ((atLeft || atRight) && (atTop || atBottom)) {
          const sideSide = atLeft ? "left" : "right";
          const sideBucketKey = `${sideSide}:${label}`;
          if (!captionBuckets.has(sideBucketKey)) {
            captionBuckets.set(sideBucketKey, { label, points: [] });
          }
          captionBuckets.get(sideBucketKey).points.push(point);
        }
      }
    }
  };

  Object.entries(labelAnchors).forEach(([label, item]) => {
    if (focusSet && !focusSet.has(label)) return;
    if (Array.isArray(item)) {
      item.forEach((nodeItem, idx) => {
        const coord = nodeItem?.coord;
        const value = nodeItem?.value;
        if (!coord) return;
        pushGroup(label, coord, value, idx);
      });
      return;
    }

    const coord = item?.coord;
    const value = item?.value;
    if (!coord) return;
    pushGroup(label, coord, value, 0);
  });

  if (showAxisCaptions && captionBuckets.size > 0) {
    entries.push(
      ...renderGroupLabels(
        captionBuckets,
        scale,
        tableH,
        padding,
        labelScale,
        labelTouchCtx
      )
    );
  }

  return entries;
}

/** Exported for contract tests — same presentation pipeline as render. */
export function buildSystemValueLabelPresentationEntries(args) {
  return buildRawLabelEntries(
    args.labelAnchors,
    args.scale,
    args.tableH,
    args.padding,
    args.labelStrategy ?? "anchor_ssot",
    args.showAxisCaptions ?? false,
    args.labelScale ?? 1,
    null,
    args.focusOpts ?? null
  );
}

export default function SystemValueLabels({
  anchors,
  labelAnchors,
  scale,
  tableH,
  padding,
  systemValues,
  /** { CO: { value, preview?: true } } — SYS 입력과 분리된 라벨 표시용 */
  labelValueOverrides = null,
  onAnchorDoubleClick,
  /** activeMark cyan draft 라벨 옆 ✓ Apply (CO/C1) */
  onBaselineDraftApplyClick,
  labelStrategy = "anchor_ssot",
  outputs,
  showSystemGrid = true,
  showAxisCaptions = false,
  /** 시스템값 모드: 궤적 라벨 없이 눈금+캡션만 */
  showSystemValuesOnly = false,
  /** Rail/frame number + axis caption scale (1 = PC/tablet). */
  labelScale = 1,
  /**
   * USER mobile cushion focus: null = feature off;
   * [] = show all normal; non-empty = selected families only at focus size.
   */
  focusFamilies = null,
  /** Optional SVG/table client height (CSS px) for viewport-safe focus clamp. */
  focusClientHeight = null,
}) {
  const [activeLabelId, setActiveLabelId] = useState(null);
  const focusSelectionActive =
    Array.isArray(focusFamilies) && focusFamilies.length > 0;
  const touchExpandEnabled = labelScale > 1 && !focusSelectionActive;

  const handleLabelPointerDown = useCallback((labelId, e) => {
    e.stopPropagation();
    setActiveLabelId(labelId);
  }, []);

  const handleBackgroundPointerDown = useCallback((e) => {
    setActiveLabelId(null);
  }, []);

  useEffect(() => {
    if (!touchExpandEnabled) return undefined;

    const onDocumentPointerDown = (e) => {
      if (e.target?.closest?.(`[${TOUCH_HIT_ATTR}]`)) return;
      setActiveLabelId(null);
    };

    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    };
  }, [touchExpandEnabled]);

  const touchCtx = touchExpandEnabled
    ? {
        interactive: true,
        activeLabelId,
        onPointerDown: handleLabelPointerDown,
      }
    : null;

  if (!showSystemValuesOnly && !outputs?.result) return null;
  if (
    showSystemValuesOnly &&
    (!showSystemGrid ||
      !labelAnchors ||
      Object.keys(labelAnchors).length === 0)
  ) {
    return null;
  }

  const renderProps = {
    scale,
    tableH,
    padding,
    systemValues,
    labelValueOverrides,
    onAnchorDoubleClick,
    onBaselineDraftApplyClick,
    labelScale,
  };

  const nodes = showSystemValuesOnly ? [] : collectBaseNodes(anchors);
  const focusFontSize = focusSelectionActive
    ? resolveFocusedSystemLabelSize({
        labelAnchors,
        selectedFamilies: focusFamilies,
        scale,
        clientHeight:
          Number.isFinite(focusClientHeight) && focusClientHeight > 0
            ? focusClientHeight
            : undefined,
      })
    : null;
  const focusOpts =
    focusFamilies == null
      ? null
      : {
          families: focusFamilies,
          fontSize: focusFontSize,
          color: CUSHION_FOCUS_VALUE_COLOR,
        };
  const labelEntries = buildRawLabelEntries(
    labelAnchors,
    scale,
    tableH,
    padding,
    labelStrategy,
    showAxisCaptions,
    labelScale,
    touchCtx,
    focusOpts
  );
  const inactiveLabelEntries = labelEntries.filter(
    (entry) => entry.id !== activeLabelId
  );
  const activeLabelEntry = labelEntries.find(
    (entry) => entry.id === activeLabelId
  );

  return (
    <g
      className="system-value-labels"
      onPointerDown={touchExpandEnabled ? handleBackgroundPointerDown : undefined}
    >
      {/* Table 전면 배경: label 축소용 hit는 document capture 리스너가 담당.
          pointerEvents를 잡으면 ball/joystick Interaction을 가로채므로 none 유지. */}
      {touchExpandEnabled && (
        <rect
          x={padding}
          y={padding}
          width={scale * 80}
          height={tableH}
          fill="transparent"
          pointerEvents="none"
        />
      )}
      {showSystemGrid &&
        inactiveLabelEntries.map((entry) => (
          <React.Fragment key={entry.id}>{entry.node}</React.Fragment>
        ))}
      {showSystemGrid && activeLabelEntry?.node}
      {nodes.map((node) => renderNode(node, renderProps))}
    </g>
  );
}
