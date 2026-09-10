/**
 * USER read-only AI coaching panel (display only — no edit/mutation).
 * Phase 3C: committed Strategy Summary + PRO ONE POINT only.
 */

/** Legacy lesson heading — strip if present in stored text; not shown in UI. */
const LESSON_SECTION_TITLE = "[원 포인트 레슨]";

/** @deprecated Phase 3C USER uses Strategy Summary SSOT; kept for non-USER callers. */
export function AiAutoCommentDisplay({ model }) {
  if (!model) return null;
  const paragraphs = [
    model.introLine,
    ...(model.strLine ? [model.strLine] : []),
  ].filter(Boolean);

  return (
    <div className="ai-auto-comment">
      {paragraphs.map((block, i) => (
        <p key={i} className="ai-comment-para">
          {block}
        </p>
      ))}
    </div>
  );
}

function normalizeLessonText(text) {
  return String(text)
    .replace(/^\s*[-•*]\s+/, "")
    .split(/\n/)
    .map((line) => line.replace(/^\s+/, ""))
    .join("\n")
    .trim();
}

function expandLessonLines(lessons) {
  const lines = [];
  for (const text of lessons) {
    const normalized = normalizeLessonText(text);
    if (!normalized) continue;
    for (const line of normalized.split(/\n+/)) {
      const t = line.trim();
      if (!t || t === LESSON_SECTION_TITLE) continue;
      lines.push(t);
    }
  }
  return lines;
}

/** @deprecated Prefer onePointText / onePointParagraphs on the panel model. */
export function AiOnePointLessonsBlock({ lessons }) {
  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  if (!hasLessons) return null;

  const lines = expandLessonLines(lessons);

  return (
    <div className="ai-one-point-lessons">
      <hr className="ai-comment-divider" />
      {lines.map((text, i) => (
        <p key={`lesson-${i}`} className="ai-comment-para">
          {text}
        </p>
      ))}
    </div>
  );
}

function PresentationBlock({ title, paragraphs, text }) {
  const lines =
    Array.isArray(paragraphs) && paragraphs.length > 0
      ? paragraphs
      : String(text || "")
          .split(/\n/)
          .map((l) => l.trimEnd())
          .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  return (
    <section className="user-ai-block">
      <h3 className="user-ai-block__title">{title}</h3>
      <div className="user-ai-block__body" style={{ whiteSpace: "pre-line" }}>
        {lines.map((line, i) => (
          <p key={`${title}-${i}`} className="ai-comment-para">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function UserAiPanel({ model }) {
  if (!model) {
    return (
      <p className="ai-comment-empty">
        표시할 공략 정보가 없습니다. 공략을 선택한 뒤 다시 열어주세요.
      </p>
    );
  }

  const summaryText = model.strategySummaryText ?? "";
  const onePointText = model.onePointText ?? "";
  const hasSummary = Boolean(String(summaryText).trim());
  const hasOnePoint = Boolean(String(onePointText).trim());

  if (!hasSummary && !hasOnePoint) {
    return (
      <p className="ai-comment-empty">
        표시할 공략 정보가 없습니다. 공략을 선택한 뒤 다시 열어주세요.
      </p>
    );
  }

  return (
    <div className="user-ai-panel">
      <div className="user-ai-panel__body">
        {hasSummary ? (
          <PresentationBlock
            title="공략 요약"
            paragraphs={model.strategySummaryParagraphs}
            text={summaryText}
          />
        ) : null}
        {hasSummary && hasOnePoint ? (
          <hr className="ai-comment-divider user-ai-block__divider" />
        ) : null}
        {hasOnePoint ? (
          <PresentationBlock
            title="PRO ONE POINT"
            paragraphs={model.onePointParagraphs}
            text={onePointText}
          />
        ) : null}
      </div>
    </div>
  );
}
