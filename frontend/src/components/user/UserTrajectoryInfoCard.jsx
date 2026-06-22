/**
 * USER 동선분석 정보 카드 — table-area 중앙 고정 overlay, 본문 내부 스크롤.
 */

export default function UserTrajectoryInfoCard({
  model,
  cardSource,
  onCardSourceChange,
}) {
  if (!model) return null;

  return (
    <div
      className="user-trajectory-info-card"
      role="region"
      aria-label="동선분석 계산값"
    >
      <div className="user-trajectory-info-card__toggle" role="tablist" aria-label="계산값 종류">
        <button
          type="button"
          role="tab"
          aria-selected={cardSource === "baseline"}
          className={
            cardSource === "baseline"
              ? "user-trajectory-info-card__tab user-trajectory-info-card__tab--active"
              : "user-trajectory-info-card__tab"
          }
          onClick={() => onCardSourceChange("baseline")}
        >
          기준값
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={cardSource === "corrected"}
          className={
            cardSource === "corrected"
              ? "user-trajectory-info-card__tab user-trajectory-info-card__tab--active"
              : "user-trajectory-info-card__tab"
          }
          onClick={() => onCardSourceChange("corrected")}
        >
          보정값
        </button>
      </div>

      <div className="user-trajectory-info-card__body">
        {model.isEmpty ? (
          <p className="user-trajectory-info-card__empty">{model.emptyMessage}</p>
        ) : (
          <>
            <div className="user-trajectory-info-card__formula">
              <div className="user-trajectory-info-card__label">[공식]</div>
              <p className="user-trajectory-info-card__formula-line">{model.formulaLine}</p>
            </div>
            <div className="user-trajectory-info-card__values">
              <div className="user-trajectory-info-card__label">[계산]</div>
              <ul className="user-trajectory-info-card__value-list">
                {model.valueLines.map((line) => (
                  <li key={line.key}>
                    {line.label} = {line.value}
                  </li>
                ))}
              </ul>
            </div>
            {model.correctionDetailLines.length > 0 ? (
              <ul className="user-trajectory-info-card__correction-list">
                {model.correctionDetailLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            ) : null}
            <p className="user-trajectory-info-card__guide">{model.guideLine}</p>
          </>
        )}
      </div>
    </div>
  );
}
