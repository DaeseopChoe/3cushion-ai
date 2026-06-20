import React from "react";
import { toPx } from "../../utils/geometry/coords";
import { cushionMarkToDisplayLabel } from "../../utils/cushionDisplayLabel";
import { getLabelNumericSuffix } from "../../domain/anchorCoordinateEngine";
import {
  computeGroupCaptionPlacements,
  detectAxisSideFromFg,
  getMarkLabelColor,
} from "../../domain/systemAxisCaption";
import AnchorPoint from "./AnchorPoint";
import LabelText from "./LabelText";

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
  }
) {
  const p = toPx(node.coord, scale, tableH);
  const cx = p.x + padding;
  const cy = p.y + padding;
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
        fontSize={20}
        label={node.label}
        displayLabel={displayMark}
        systemValue={systemValue}
        onDoubleClick={showApplyButton ? undefined : onAnchorDoubleClick}
      />
      {showApplyButton && checkOnlyPending ? (
        <>
          <text
            x={cx}
            y={cy}
            fill={labelFill}
            fontSize={20}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: "none" }}
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
                fontSize={20}
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
              fontSize={20}
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
            fontSize={20}
            fontWeight="bold"
            textAnchor="start"
            dominantBaseline="middle"
            style={{ pointerEvents: "none" }}
          >
            {textContent}
          </text>
        </g>
      ) : (
        <text
          x={cx}
          y={cy}
          fill={labelFill}
          fontSize={20}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: "none" }}
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

function rawLabelColor(label) {
  return getMarkLabelColor(label);
}

function renderGroupLabels(captionBuckets, scale, tableH, padding) {
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

  const placements = computeGroupCaptionPlacements(bucketInputs, tableBounds);
  return placements.map((placement) => (
    <g
      key={`CAP-${placement.side}-${placement.mark}`}
      transform={
        placement.rotationDeg !== 0
          ? `rotate(${placement.rotationDeg}, ${placement.x}, ${placement.y})`
          : undefined
      }
    >
      <LabelText
        x={placement.x}
        y={placement.y}
        text={placement.text}
        fontSize={placement.fontSize}
        color={placement.fill}
      />
    </g>
  ));
}

function renderRawLabelAnchors(
  labelAnchors,
  scale,
  tableH,
  padding,
  labelStrategy,
  showAxisCaptions = false
) {
  if (!labelAnchors) return null;

  const applyCushionNudges = true;
  const nodes = [];
  const captionBuckets = new Map();

  const pushGroup = (label, coord, value, idx) => {
    let { x, y } = coord;
    ({ x, y } = applyRawLabelFrameNudges(label, x, y, applyCushionNudges));

    const p = toPx({ x, y }, scale, tableH);
    const pxX = p.x + padding;
    const pxY = p.y + padding;

    let fillColor = rawLabelColor(label);

    nodes.push(
      <LabelText
        key={`RAW-${label}-${idx}`}
        x={pxX}
        y={pxY}
        text={value != null ? String(value) : ""}
        fontSize={10}
        color={fillColor}
      />
    );

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
    nodes.push(...renderGroupLabels(captionBuckets, scale, tableH, padding));
  }

  return nodes;
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
}) {
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
  };

  const nodes = showSystemValuesOnly ? [] : collectBaseNodes(anchors);
  const rawLabels = renderRawLabelAnchors(
    labelAnchors,
    scale,
    tableH,
    padding,
    labelStrategy,
    showAxisCaptions
  );

  return (
    <>
      {showSystemGrid && rawLabels}
      {nodes.map((node) => renderNode(node, renderProps))}
    </>
  );
}
