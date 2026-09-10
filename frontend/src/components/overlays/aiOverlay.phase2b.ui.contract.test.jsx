/**
 * Phase 2B — AiOverlay PRO ONE POINT library UI source contracts (no jsdom).
 * Updated for Phase 2B.1 shell (preview dropdown, delete-via-update, no DnD).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatOnePointDropdownLabel } from "../../domain/lesson/onePointLibrary";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readOverlaySource(name) {
  return readFileSync(join(__dirname, name), "utf8");
}

describe("AiOverlay Phase 2B PRO ONE POINT UI (source contract)", () => {
  const source = readOverlaySource("AiOverlay.jsx");

  it("retires Category / Lesson Order / mixed 저장 UI from AI Overlay", () => {
    expect(source).not.toContain("Category 관리");
    expect(source).not.toContain("Lesson 순서 관리");
    expect(source).not.toContain("선택 안함");
    expect(source).not.toContain("onOpenCategoryManage");
    expect(source).not.toContain("onOpenLessonOrderManage");
    expect(source).not.toContain("showLibraryManageMenu");
    expect(source).not.toContain("onePointCategories");
    expect(source).not.toContain("saveDraftAsNewLesson");
    expect(source).not.toMatch(/>\s*저장\s*</);
  });

  it("exposes explicit select / update / register / proofread / apply / cancel", () => {
    expect(source).toContain('aria-label="등록 문장"');
    expect(source).toContain("newestPreviewLabel");
    expect(source).toContain("문장 수정");
    expect(source).toContain("문장 등록");
    expect(source).toContain("AI 교정");
    expect(source).toContain("updateSelectedOnePointLibraryItem");
    expect(source).toContain("registerOnePointLibraryItemFromDraft");
    expect(source).toContain("formatOnePointDropdownLabel");
    expect(source).toContain("applyOnePointToShot()");
    expect(source).toContain("onClick={onCancel}");
    expect(source).toContain("PRO ONE POINT");
    expect(source).toContain(
      'placeholder="새로운 PRO ONE POINT를 입력하세요."'
    );
    expect(source).toContain("libraryDraft");
  });

  it("disables 문장 수정 without selection; does not map 수정→등록", () => {
    expect(source).toContain("canUpdateLibrary");
    expect(source).toContain("canRegisterLibrary");
    expect(source).toMatch(
      /disabled=\{!canUpdateLibrary \|\| proofreadBusy\}/
    );
    expect(source).toContain(
      "const canUpdateLibrary = Boolean(onePointSelectedId)"
    );
  });
});

describe("formatOnePointDropdownLabel", () => {
  it("truncates display label without mutating full multiline text semantics", () => {
    const full = [
      "밀림이 과도하게 발생하지 않도록 힘을 빼고 경쾌하게 스트로크합니다.",
      "마지막에는 큐를 가볍게 잡아 분리각을 만들어야 길게 빠지는 것을 방지할 수 있습니다.",
      "- 조방연 프로 -",
    ].join("\n");
    const label = formatOnePointDropdownLabel(full, 40);
    expect(label.length).toBeLessThanOrEqual(40);
    expect(label).toContain("…");
    expect(full.includes("조방연")).toBe(true);
    expect(label.includes("\n")).toBe(false);
  });
});
