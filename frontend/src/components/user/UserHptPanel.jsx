/**
 * USER read-only HP/T card — SVG viz + 3-column metric grid (mobile text-first).
 */

import HptBallReadOnlyViz from "./HptBallReadOnlyViz";

function MetricGrid({ columns }) {
  const items = columns.filter((c) => c.value != null && c.value !== "");
  if (items.length === 0) return null;

  return (
    <div className="user-hpt-metric-grid">
      {items.map((col) => (
        <div key={col.key} className="user-hpt-metric-cell">
          <div className="user-hpt-label">{col.label}</div>
          <div className="user-hpt-value">{col.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function UserHptPanel({ model }) {
  if (!model) {
    return (
      <p className="user-hpt-empty">HP/T 정보를 불러올 수 없습니다.</p>
    );
  }

  if (model.isEmpty) {
    return (
      <p className="user-hpt-empty">
        {model.emptyMessage || "HP/T 설정 없음"}
      </p>
    );
  }

  const { viz, displayMode } = model;

  const columns =
    displayMode === "tip_clock"
      ? [
          { key: "thickness", label: "두께", value: model.thicknessLabel },
          { key: "tip", label: "타점", value: model.tipLabel },
          { key: "clock", label: "시침값", value: model.clockLabel },
        ]
      : [
          { key: "thickness", label: "두께", value: model.thicknessLabel },
          { key: "rotation", label: "회전", value: model.rotationLabel },
          { key: "follow", label: "당점", value: model.followLabel },
        ];

  return (
    <div className="user-hpt-panel">
      {viz && (
        <HptBallReadOnlyViz T={viz.T} hitX={viz.hitX} hitY={viz.hitY} />
      )}
      <MetricGrid columns={columns} />
    </div>
  );
}
