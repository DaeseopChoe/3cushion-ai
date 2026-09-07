/**
 * USER HP/T card — thickness viz + experimental tipCount control for trajectory.
 * tipCount writes are runtime-only (parent override); persisted HPT is not mutated here.
 */

import HptBallReadOnlyViz from "./HptBallReadOnlyViz";

const TIP_OPTIONS = [0, 1, 2, 3, 4];

export default function UserHptPanel({
  model,
  tipCount = null,
  onTipCountChange = null,
}) {
  if (!model) {
    return (
      <p className="user-hpt-empty">타점 정보를 불러올 수 없습니다.</p>
    );
  }

  if (model.isEmpty) {
    return (
      <p className="user-hpt-empty">
        {model.emptyMessage || "타점 설정 없음"}
      </p>
    );
  }

  const { viz } = model;
  const thicknessLine = model.thicknessLabel
    ? `두께 ${model.thicknessLabel}`
    : "두께 8/8";

  const tipEditable = typeof onTipCountChange === "function";
  const activeTip =
    typeof tipCount === "number" && tipCount >= 0 && tipCount <= 4
      ? tipCount
      : null;

  return (
    <div className="user-hpt-panel">
      {viz && (
        <HptBallReadOnlyViz T={viz.T} hitX={viz.hitX} hitY={viz.hitY} />
      )}
      <p className="user-hpt-thickness-line">{thicknessLine}</p>
      {tipEditable && (
        <div
          className="user-hpt-tip-row"
          role="group"
          aria-label="궤적 검증용 회전 tip"
        >
          <span className="user-hpt-tip-label">회전 tip</span>
          <div className="user-hpt-tip-buttons">
            {TIP_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={
                  activeTip === n
                    ? "user-hpt-tip-btn user-hpt-tip-btn--active"
                    : "user-hpt-tip-btn"
                }
                aria-pressed={activeTip === n}
                onClick={() => onTipCountChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
