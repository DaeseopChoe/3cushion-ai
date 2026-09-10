/**
 * Phase 2B.1 — PRO ONE POINT shell UX source contracts (no jsdom / no OpenAI).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  isAiCommentDraftDirty,
  captureAiCommentCommittedSnapshot,
} from "../../domain/lesson/aiCommentEditorSession";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "../../App.jsx");

function readSource(relFromOverlays) {
  return readFileSync(join(__dirname, relFromOverlays), "utf8");
}

describe("AiOverlay Phase 2B.1 PRO ONE POINT shell UX", () => {
  const overlay = readSource("AiOverlay.jsx");
  const app = readFileSync(appPath, "utf8");

  it("keeps Apply/Cancel open (no closeOverlay in commit/cancel)", () => {
    expect(app).toMatch(/keep AI overlay open after Apply/);
    expect(app).toMatch(/keep AI overlay open after Cancel/);
    const commitBlock = app.slice(
      app.indexOf("const commitAiCommentEditorSession"),
      app.indexOf("const applyOnePointToShot")
    );
    expect(commitBlock).not.toContain("closeOverlay()");
    const cancelBlock = app.slice(
      app.indexOf("const cancelAiCommentEditorSession"),
      app.indexOf("const deleteLesson")
    );
    expect(cancelBlock).not.toContain("closeOverlay()");
  });

  it("dirty close guard lives in closeOverlay; modal switch uses openOverlay", () => {
    expect(app).toContain("isAiCommentDraftDirty");
    expect(app).toContain("isAiCommentOverlayDirty");
    expect(app).toContain("disableBackdropClick={isAiCommentOverlayDirty}");
    expect(app).toMatch(
      /function closeOverlay\(\)[\s\S]*?overlayState\.type === ["']AI["'][\s\S]*?isAiCommentDraftDirty/
    );
    expect(app).toContain("openOverlay(\"SYS\")");
    expect(app).toContain("openOverlay(\"STR\")");
  });

  it("dropdown preview ≠ selected; new-entry placeholder; no separate 삭제 button; no DnD list", () => {
    expect(overlay).toContain('aria-label="등록 문장"');
    expect(overlay).toContain("newestPreviewLabel");
    expect(overlay).toContain('<option value="">{newestPreviewLabel}</option>');
    expect(overlay).toContain(
      'placeholder="새로운 PRO ONE POINT를 입력하세요."'
    );
    expect(overlay).not.toContain("선택한 PRO ONE POINT를 편집하세요");
    expect(overlay).not.toContain("선택한 재사용 문장을 라이브러리에서 삭제할까요");
    expect(overlay).not.toMatch(/>\s*삭제\s*</);
    expect(overlay).not.toContain("@dnd-kit/core");
    expect(overlay).not.toContain("LessonRow");
    expect(overlay).not.toContain("onDeleteLesson");
    expect(overlay).not.toContain("onReorderLessons");
    expect(overlay).toContain("proofreadClearNonce");
  });

  it("문장 수정 enabled by selectedId; empty path uses App confirm delete", () => {
    expect(overlay).toContain(
      "const canUpdateLibrary = Boolean(onePointSelectedId)"
    );
    expect(app).toContain("선택한 등록 문장을 삭제하시겠습니까?");
    expect(app).toContain("deleteOnePointLibraryItemById");
  });

  it("onSelect empty clears selectedId only — does not clear shot draft", () => {
    const selectBlock = app.slice(
      app.indexOf("const onSelectOnePoint = (id) =>"),
      app.indexOf("const commitAiCommentEditorSession")
    );
    expect(selectBlock).toContain('setOnePointSelectedId("")');
    expect(selectBlock).not.toContain('setShotOnePointDraft("")');
    expect(selectBlock).not.toContain('setOnePointDraft("")');
  });
});

describe("Phase 2B.1 dirty semantics (text-only)", () => {
  it("library selection with identical text stays clean", () => {
    const committed = captureAiCommentCommittedSnapshot({
      ai: {
        text: "",
        onePointLessons: [{ id: "1", text: "샷 문장" }],
      },
      onePointSelectedId: "",
    });
    expect(
      isAiCommentDraftDirty({
        draftText: "샷 문장",
        onePointSelectedId: "lib-1",
        committed,
      })
    ).toBe(false);
  });
});
