import { useState } from "react";

/**
 * 레슨 §3 — 시스템값 참고 (접기/펼치기).
 */
export default function UserLessonSystemValuesSection({ section }) {
  const [open, setOpen] = useState(false);
  if (!section?.entries?.length) return null;

  return (
    <section className="user-sys-lesson__block user-sys-lesson__block--values">
      <button
        type="button"
        className="user-sys-lesson__collapse-trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="user-sys-lesson__collapse-label">시스템값 보기</span>
        <span className="user-sys-lesson__collapse-icon" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <dl className="user-sys-lesson__values-list">
          {section.entries.map(({ label, value }) => (
            <div key={label} className="user-sys-lesson__values-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
