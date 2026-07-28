/**
 * USER Calculation Overlay Content — ADMIN DisplayModel projection viewer.
 * Layout/Drag/Glass는 UserOverlayShell 소유. 툴바는 Overlay 밖(UserCalcToolbar).
 */

function renderParts(parts, lineId, isNoteLine) {
  return parts.map((part, idx) => {
    if (part.type === "value") {
      return (
        <span key={`${lineId}-p-${idx}`} className="sys-info-box__text">
          {part.label}({part.value})
        </span>
      );
    }
    return (
      <span
        key={`${lineId}-p-${idx}`}
        className={isNoteLine ? "sys-info-box__note-text" : "sys-info-box__text"}
      >
        {part.text}
      </span>
    );
  });
}

export default function UserCalculationPanel({
  block,
  emptyMessage = "계산 정보를 불러올 수 없습니다.",
}) {
  return (
    <div className="user-calc-panel" role="region" aria-label="계산">
      <div className="user-calc-panel__body">
        {!block ? (
          <p className="user-calc-panel__empty">{emptyMessage}</p>
        ) : (
          <div className="user-calc-panel__projection">
            {block.sections.map((section) => (
              <div key={section.id} className="sys-info-box__section">
                {section.title ? (
                  <div className="sys-info-box__section-title">{`[${section.title}]`}</div>
                ) : null}
                {section.lines
                  .filter((line) => line.layout !== "divider")
                  .map((line) => (
                    <div
                      key={line.id}
                      className={
                        line.layout === "note"
                          ? "sys-info-box__line sys-info-box__line--note"
                          : "sys-info-box__line sys-info-box__line--inline"
                      }
                    >
                      {renderParts(line.parts, line.id, line.layout === "note")}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
