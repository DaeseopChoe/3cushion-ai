import React, { useEffect, useMemo, useState } from "react";
import {
  buildFixedFamilyAvailability,
  FIXED_CUSHION_FAMILIES,
  pruneSelectedFamilies,
  resolveCushionPanelHint,
  toggleFamilyInSet,
} from "../../renderer/labels/cushionValuePanelModel";
import "../../styles/user-cushion-value-panel.css";

/**
 * Compact family selector for USER mobile cushion-point mode.
 * Numbers stay on the real table (SystemValueLabels); this panel only toggles focus.
 */
export default function CushionValuePanel({
  labelAnchors,
  selectedFamilies = [],
  onSelectedFamiliesChange,
}) {
  const [hasEverSelected, setHasEverSelected] = useState(false);

  const availability = useMemo(
    () => buildFixedFamilyAvailability(labelAnchors),
    [labelAnchors]
  );

  const enabledMap = useMemo(() => {
    const map = new Map();
    for (const row of availability) map.set(row.family, row.enabled);
    return map;
  }, [availability]);

  useEffect(() => {
    const pruned = pruneSelectedFamilies(selectedFamilies, labelAnchors);
    const same =
      pruned.length === selectedFamilies.length &&
      pruned.every((f) => selectedFamilies.includes(f));
    if (!same) onSelectedFamiliesChange?.(pruned);
  }, [labelAnchors, selectedFamilies, onSelectedFamiliesChange]);

  const hint = resolveCushionPanelHint(hasEverSelected);

  const handleToggle = (family, enabled) => {
    if (!enabled) return;
    const next = toggleFamilyInSet(selectedFamilies, family, enabled);
    if (next.length > selectedFamilies.length) {
      setHasEverSelected(true);
    }
    onSelectedFamiliesChange?.(next);
  };

  const selectedSet = useMemo(
    () => new Set(selectedFamilies),
    [selectedFamilies]
  );

  const row1 = FIXED_CUSHION_FAMILIES.slice(0, 3);
  const row2 = FIXED_CUSHION_FAMILIES.slice(3);

  const renderRow = (families) => (
    <div className="ucvp-btn-row" role="group">
      {families.map((family) => {
        const enabled = enabledMap.get(family) === true;
        const on = enabled && selectedSet.has(family);
        const stateClass = !enabled
          ? "is-unavailable"
          : on
            ? "is-on"
            : "is-off";
        return (
          <button
            key={family}
            type="button"
            className={`ucvp-btn ${stateClass}`}
            disabled={!enabled}
            aria-pressed={on}
            aria-label={`${family}${enabled ? "" : " (없음)"}`}
            onClick={() => handleToggle(family, enabled)}
          >
            {family}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className="ucvp-root"
      role="region"
      aria-label="쿠션 시스템 값 선택"
    >
      <div className="ucvp-card">
        {renderRow(row1)}
        {renderRow(row2)}
        <p className="ucvp-hint">{hint}</p>
        <p className="ucvp-abbr">
          <span>CO : 내공 출발값</span>
          <span>C1 : 1쿠션 값</span>
          <span>C3 : 3쿠션 값</span>
          <span>C4 : 4쿠션 값</span>
        </p>
      </div>
    </div>
  );
}
