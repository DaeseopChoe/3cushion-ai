/**
 * USER read-only AI coaching panel (display only — no edit/mutation).
 */

import { AI_COMMENT_FORMULA_TITLE } from "../../domain/aiAutoCommentViewModel";

const LESSON_SECTION_TITLE = "[원 포인트 레슨]";

/** ADMIN/USER 공통 자동 생성 블록 */
export function AiAutoCommentDisplay({ model }) {
  if (!model) return null;
  const paragraphs = [
    model.introLine,
    { title: AI_COMMENT_FORMULA_TITLE, body: model.formulaUserLine },
    ...(model.correctionLine ? [model.correctionLine] : []),
    ...(model.strLine ? [model.strLine] : []),
  ];

  return (
    <div className="ai-auto-comment">
      {paragraphs.map((block, i) => {
        if (typeof block === "string") {
          return (
            <p key={i} className="ai-comment-para">
              {block}
            </p>
          );
        }
        return (
          <p key={i} className="ai-comment-para ai-comment-para--formula">
            <span className="ai-comment-section-title">{block.title}</span>
            <span className="ai-comment-section-body"> {block.body}</span>
          </p>
        );
      })}
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

/** 원 포인트 레슨 (관리자 입력 전용, 자동 문장과 분리) */
export function AiOnePointLessonsBlock({ lessons }) {
  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  if (!hasLessons) return null;

  const lines = expandLessonLines(lessons);

  return (
    <div className="ai-one-point-lessons">
      <hr className="ai-comment-divider" />
      <div className="ai-comment-section-title ai-comment-lesson-heading">
        {LESSON_SECTION_TITLE}
      </div>
      {lines.map((text, i) => (
        <p key={`lesson-${i}`} className="ai-comment-para">
          {text}
        </p>
      ))}
    </div>
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

  return (
    <div className="user-ai-panel">
      <div className="user-ai-panel__body">
        <AiAutoCommentDisplay model={model.autoComment} />
        <AiOnePointLessonsBlock lessons={model.onePointLessons} />
      </div>
    </div>
  );
}
