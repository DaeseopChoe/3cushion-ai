import { useEffect, useMemo, useState } from "react";
import {
  buildCushionToggleCatalog,
  pruneSelectedToggleKeys,
  resolveCushionPanelHint,
  toggleKeyInSet,
} from "../../renderer/labels/cushionValuePanelModel";
import "../../styles/user-cushion-value-panel.css";

/**
 * USER mobile cushion-point panel — selector + enlarged value lanes.
 * Presentation-only; consumes labelAnchorsForRender SSOT.
 */
export default function CushionValuePanel({ labelAnchors }) {
  const catalog = useMemo(
    () => buildCushionToggleCatalog(labelAnchors),
    [labelAnchors]
  );

  const [selected, setSelected] = useState([]);
  const [hasEverSelected, setHasEverSelected] = useState(false);

  useEffect(() => {
    setSelected((prev) => pruneSelectedToggleKeys(prev, catalog));
  }, [catalog]);

  const hint = resolveCushionPanelHint(hasEverSelected);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const onChipToggle = (key) => {
    const turningOn = !selectedSet.has(key);
    setSelected((prev) => toggleKeyInSet(prev, key));
    if (turningOn) setHasEverSelected(true);
  };

  return (
    <div
      className="cushion-value-panel"
      role="region"
      aria-label="쿠션 값 확대"
    >
      <div className="cushion-value-panel__shell">
        <RailChipRow
          rail="top"
          groups={catalog.byRail.top}
          selectedSet={selectedSet}
          onToggle={onChipToggle}
        />
        <LaneStack
          rail="top"
          groups={catalog.byRail.top}
          selectedSet={selectedSet}
        />

        <div className="cushion-value-panel__mid">
          <div className="cushion-value-panel__side">
            <RailChipRow
              rail="left"
              groups={catalog.byRail.left}
              selectedSet={selectedSet}
              onToggle={onChipToggle}
            />
            <LaneStack
              rail="left"
              groups={catalog.byRail.left}
              selectedSet={selectedSet}
            />
          </div>

          <div className="cushion-value-panel__mini" aria-hidden="true">
            <div className="cushion-value-panel__wood">
              <div className="cushion-value-panel__cushion">
                <div className="cushion-value-panel__cloth">
                  <p className="cushion-value-panel__hint">{hint}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="cushion-value-panel__side">
            <LaneStack
              rail="right"
              groups={catalog.byRail.right}
              selectedSet={selectedSet}
            />
            <RailChipRow
              rail="right"
              groups={catalog.byRail.right}
              selectedSet={selectedSet}
              onToggle={onChipToggle}
            />
          </div>
        </div>

        <LaneStack
          rail="bottom"
          groups={catalog.byRail.bottom}
          selectedSet={selectedSet}
        />
        <RailChipRow
          rail="bottom"
          groups={catalog.byRail.bottom}
          selectedSet={selectedSet}
          onToggle={onChipToggle}
        />
      </div>
    </div>
  );
}

function RailChipRow({ rail, groups, selectedSet, onToggle }) {
  if (!groups?.length) return null;
  return (
    <div
      className={`cushion-value-panel__chips cushion-value-panel__chips--${rail}`}
    >
      {groups.map((group) => {
        const on = selectedSet.has(group.key);
        return (
          <button
            key={group.key}
            type="button"
            className={
              on
                ? "cushion-value-panel__chip cushion-value-panel__chip--on"
                : "cushion-value-panel__chip"
            }
            style={{ ["--chip-accent"]: group.color }}
            aria-pressed={on}
            onClick={() => onToggle(group.key)}
          >
            {group.family}
          </button>
        );
      })}
    </div>
  );
}

function LaneStack({ rail, groups, selectedSet }) {
  const active = groups.filter((g) => selectedSet.has(g.key));
  if (active.length === 0) return null;
  return (
    <div
      className={`cushion-value-panel__lanes cushion-value-panel__lanes--${rail}`}
    >
      {active.map((group) => (
        <div
          key={group.key}
          className="cushion-value-panel__lane"
          style={{ ["--lane-accent"]: group.color }}
        >
          <span className="cushion-value-panel__lane-tag">{group.family}</span>
          <div className="cushion-value-panel__lane-values">
            {group.points.map((p, idx) => (
              <span
                key={`${group.key}-${idx}-${p.value}-${p.fgX}-${p.fgY}`}
                className="cushion-value-panel__value"
              >
                {formatPanelValue(p.value)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPanelValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(n);
}
