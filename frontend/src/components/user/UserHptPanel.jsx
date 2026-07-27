/**
 * USER read-only 타점 card — Shell 위에 볼 viz + 두께 한 줄만 표시.
 */

import HptBallReadOnlyViz from "./HptBallReadOnlyViz";

export default function UserHptPanel({ model }) {
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

  return (
    <div className="user-hpt-panel">
      {viz && (
        <HptBallReadOnlyViz T={viz.T} hitX={viz.hitX} hitY={viz.hitY} />
      )}
      <p className="user-hpt-thickness-line">{thicknessLine}</p>
    </div>
  );
}
