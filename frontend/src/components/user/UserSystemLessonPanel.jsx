/**
 * USER read-only 레슨 — 시스템 개요 · 포지션 해설 · 시스템값(접기).
 */

import UserLessonSystemValuesSection from "./UserLessonSystemValuesSection.jsx";

/** 설계안 표기: 출발값 - 3쿠션값 = 1쿠션값 */
function formulaForTableDisplay(formulaLine) {
  if (!formulaLine) return "";
  const m = String(formulaLine).match(/^1쿠션값\s*=\s*(.+)$/);
  if (m) return `${m[1].trim()} = 1쿠션값`;
  return formulaLine;
}

function splitValuesTriple(valuesLine) {
  if (!valuesLine) return ["—", "—", "—"];
  const parts = String(valuesLine)
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  while (parts.length < 3) parts.push("—");
  return parts.slice(0, 3);
}

/** "밀림 3 · 끌림 0 · …" → 설계안 "밀림 : 3" 형식 */
function splitCorrectionsQuad(correctionsLine) {
  const defaults = [
    { label: "밀림", value: "" },
    { label: "끌림", value: "" },
    { label: "기울기", value: "" },
    { label: "스핀", value: "" },
  ];
  if (!correctionsLine) return defaults;

  const chunks = String(correctionsLine).split("·").map((s) => s.trim());
  const labels = ["밀림", "끌림", "기울기", "스핀"];
  return labels.map((label, i) => {
    const chunk = chunks[i] ?? "";
    const m = chunk.match(new RegExp(`${label}\\s*(.*)$`));
    const raw = m ? m[1].trim() : chunk.replace(label, "").trim();
    return { label, value: raw || "" };
  });
}

function tightCalcLine(calcLine) {
  if (!calcLine) return "";
  return String(calcLine).replace(/\s+/g, "");
}

function LessonTable({ children, className = "" }) {
  return (
    <div className="user-sys-lesson__table-wrap">
      <table className={`user-sys-lesson__table ${className}`.trim()}>
        {children}
      </table>
    </div>
  );
}

function RowHeader({ children }) {
  return <th className="user-sys-lesson__th">{children}</th>;
}

function PositionC4ResultRow({ block }) {
  if (!block) return null;
  return (
    <tr className="user-sys-lesson__tr-c4">
      <RowHeader>4쿠션 계산</RowHeader>
      <td colSpan={3} className="user-sys-lesson__td user-sys-lesson__td--c4-host">
        <table className="user-sys-lesson__c4-inner">
          <tbody>
            <tr>
              <td className="user-sys-lesson__td user-sys-lesson__td--expr">
                {block.exprLine}
              </td>
              <td className="user-sys-lesson__td user-sys-lesson__td--calc">
                {tightCalcLine(block.calcLine)}
              </td>
              <td className="user-sys-lesson__td user-sys-lesson__td--result">
                {block.resultLine}
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function C4ResultRow({ block, totalCols = 4 }) {
  if (!block) return null;
  const exprSpan = totalCols === 5 ? 2 : 1;
  return (
    <tr>
      <RowHeader>4쿠션 계산</RowHeader>
      <td
        className="user-sys-lesson__td user-sys-lesson__td--expr"
        colSpan={exprSpan}
      >
        {block.exprLine}
      </td>
      <td className="user-sys-lesson__td user-sys-lesson__td--calc">
        {tightCalcLine(block.calcLine)}
      </td>
      <td className="user-sys-lesson__td user-sys-lesson__td--result">
        {block.resultLine}
      </td>
    </tr>
  );
}

function normalizeFootnoteLines(lines) {
  if (!lines?.length) return [];
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next1 = lines[i + 1];
    const next2 = lines[i + 2];
    if (
      line.startsWith("출발값 보정은 50") &&
      next1?.includes("5 증가") &&
      next2?.includes("5 감소")
    ) {
      out.push(`${line} ${next1}, ${next2}`);
      i += 3;
      continue;
    }
    out.push(line);
    i += 1;
  }
  return out;
}

function Footnotes({ lines }) {
  const displayLines = normalizeFootnoteLines(lines);
  if (!displayLines.length) return null;
  return (
    <ul className="user-sys-lesson__footnotes">
      {displayLines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

function OverviewBlock({ section }) {
  if (!section) return null;
  return (
    <section className="user-sys-lesson__block user-sys-lesson__block--overview">
      <h3 className="user-sys-lesson__block-title">시스템 개요</h3>
      <p className="user-sys-lesson__prose">{section.body}</p>
    </section>
  );
}

function PositionExplainBlock({ explainLine }) {
  if (!explainLine) return null;
  return (
    <section className="user-sys-lesson__block user-sys-lesson__block--explain">
      <h3 className="user-sys-lesson__block-title">현재 포지션 해설</h3>
      <p className="user-sys-lesson__prose">{explainLine}</p>
    </section>
  );
}

function PositionDetailBlock({ formulaLine, section }) {
  const [v0, v1, v2] = splitValuesTriple(section.valuesLine);
  return (
    <section className="user-sys-lesson__block user-sys-lesson__block--detail">
      <h3 className="user-sys-lesson__block-title user-sys-lesson__block-title--sub">
        [포지션 기준 계산]
      </h3>
      <LessonTable className="user-sys-lesson__table--position">
        <tbody>
          <tr>
            <RowHeader>시스템 공식</RowHeader>
            <td className="user-sys-lesson__td" colSpan={3}>
              {formulaForTableDisplay(formulaLine)}
            </td>
          </tr>
          <tr className="user-sys-lesson__tr-values">
            <RowHeader>포지션 기준값</RowHeader>
            <td className="user-sys-lesson__td user-sys-lesson__td--value">{v0}</td>
            <td className="user-sys-lesson__td user-sys-lesson__td--value">{v1}</td>
            <td className="user-sys-lesson__td user-sys-lesson__td--value">{v2}</td>
          </tr>
          <PositionC4ResultRow block={section.c4} />
        </tbody>
      </LessonTable>
      <Footnotes lines={section.footnotes} />
    </section>
  );
}

function CorrectionBlock({ section }) {
  const quads = splitCorrectionsQuad(section.correctionsLine);
  return (
    <section className="user-sys-lesson__block user-sys-lesson__block--detail">
      <h3 className="user-sys-lesson__block-title user-sys-lesson__block-title--sub">
        [보정치 반영 계산]
      </h3>
      <LessonTable>
        <tbody>
          <tr>
            <RowHeader>보정치</RowHeader>
            {quads.map((q) => (
              <td key={q.label} className="user-sys-lesson__td user-sys-lesson__td--corr">
                {q.label} : {q.value}
              </td>
            ))}
          </tr>
          <tr>
            <RowHeader>출발값 보정</RowHeader>
            <td className="user-sys-lesson__td" colSpan={4}>
              {section.startAdjustLine}
            </td>
          </tr>
          <tr>
            <RowHeader>3쿠션 보정</RowHeader>
            <td className="user-sys-lesson__td" colSpan={4}>
              {section.c3AdjustLine}
            </td>
          </tr>
          <C4ResultRow block={section.c4} totalCols={5} />
        </tbody>
      </LessonTable>
      <Footnotes lines={section.footnotes} />
    </section>
  );
}

export default function UserSystemLessonPanel({ model }) {
  if (!model) {
    return (
      <p className="user-sys-lesson-empty">레슨 정보를 불러올 수 없습니다.</p>
    );
  }

  if (model.isEmpty) {
    return (
      <div className="user-sys-lesson">
        <h2 className="user-sys-lesson__title">{model.title}</h2>
        {model.overviewSection && (
          <OverviewBlock section={model.overviewSection} />
        )}
        <p className="user-sys-lesson-empty">{model.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="user-sys-lesson">
      <h2 className="user-sys-lesson__title">{model.title}</h2>

      <div className="user-sys-lesson__stack">
        <OverviewBlock section={model.overviewSection} />
        <PositionExplainBlock explainLine={model.positionExplainLine} />
        {model.positionSection && (
          <PositionDetailBlock
            formulaLine={model.formulaLine}
            section={model.positionSection}
          />
        )}
        {model.correctionSection && (
          <CorrectionBlock section={model.correctionSection} />
        )}
        <UserLessonSystemValuesSection section={model.systemValuesSection} />
      </div>
    </div>
  );
}
