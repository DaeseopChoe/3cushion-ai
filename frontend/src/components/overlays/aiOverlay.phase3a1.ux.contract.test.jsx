/**
 * Phase 3A.1 — WYSIWYG editor UX refinement contracts (no jsdom / no OpenAI).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildAiCommentApplyPayload,
  captureAiCommentCommittedSnapshot,
  isAiCommentDraftDirty,
} from "../../domain/lesson/aiCommentEditorSession";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "../../App.jsx");

function readOverlay() {
  return readFileSync(join(__dirname, "AiOverlay.jsx"), "utf8");
}

describe("Phase 3A.1 Strategy Summary real-value editing", () => {
  const overlay = readOverlay();
  const app = readFileSync(appPath, "utf8");

  it("summary textarea uses controlled value; generated text is not placeholder", () => {
    expect(overlay).toContain("value={strategySummaryDraft ?? \"\"}");
    expect(overlay).toContain('placeholder="공략 요약을 입력하세요."');
    expect(overlay).not.toContain("generatedSummaryHint");
    expect(overlay).toContain("color: \"#0f172a\"");
  });

  it("App hydrates strategySummaryDraft from effective summary on AI open", () => {
    expect(app).toContain("hydrateAiCommentEditorSessionIfNeeded");
    expect(app).toContain("resolveEffectiveStrategySummary");
    expect(app).toContain("strategySummaryText: effectiveSummary");
    expect(app).toContain("setStrategySummaryDraft(snap.strategySummaryText)");
    expect(app).toMatch(
      /overlayState\.type !== ["']AI["'][\s\S]*hydrateAiCommentEditorSessionIfNeeded/
    );
  });
});

describe("Phase 3A.1 library select → upper only", () => {
  const app = readFileSync(appPath, "utf8");
  const overlay = readOverlay();

  it("select sets shot draft only — no libraryDraft duplicate copy", () => {
    const selectBlock = app.slice(
      app.indexOf("const onSelectOnePoint = (id) =>"),
      app.indexOf("const commitAiCommentEditorSession")
    );
    expect(selectBlock).toContain("setShotOnePointDraft(item.text)");
    expect(selectBlock).not.toContain("setLibraryDraft(item.text)");
    expect(selectBlock).not.toContain('setShotOnePointDraft("")');
  });

  it("lower workspace is new-entry; proofread routes shot|library", () => {
    expect(overlay).toContain(
      'placeholder="새로운 PRO ONE POINT를 입력하세요."'
    );
    expect(overlay).toContain("resolveProofreadTarget");
    expect(overlay).toContain("proofreadRequestTarget");
    expect(overlay).toContain('setShotOnePointDraft?.(corrected)');
    expect(overlay).toContain("setLibraryDraft?.(corrected)");
    expect(overlay).toContain("markShotEdit");
    expect(overlay).toContain("markLibraryEdit");
  });

  it("문장 수정 uses shotOnePointDraft; 문장 등록 uses libraryDraft", () => {
    expect(app).toMatch(
      /const updateSelectedOnePointLibraryItem[\s\S]*String\(shotOnePointDraft/
    );
    expect(app).toMatch(
      /const registerOnePointLibraryItemFromDraft[\s\S]*text: libraryDraft/
    );
  });
});

describe("Phase 3A.1 Apply promote lower new-entry", () => {
  const app = readFileSync(appPath, "utf8");

  it("Apply promotes library draft when aiOnePointEditTarget is library", () => {
    expect(app).toContain('aiOnePointEditTarget === "library"');
    expect(app).toContain("draftText: shotText");
    expect(app).toContain("setShotOnePointDraft(shotText)");
  });

  it("model: promote lower → apply payload uses promoted text", () => {
    const libraryDraft = "신규 입력 문장";
    const shotOnePointDraft = "이전 샷";
    let editTarget = "library";
    let shotText = shotOnePointDraft;
    if (editTarget === "library" && libraryDraft.trim()) {
      shotText = libraryDraft;
    }
    const payload = buildAiCommentApplyPayload({ draftText: shotText });
    expect(payload.onePointLessons[0].text).toBe("신규 입력 문장");
    const snap = captureAiCommentCommittedSnapshot({
      ai: payload,
      strategySummaryText: "요약",
    });
    expect(
      isAiCommentDraftDirty({
        shotOnePointDraft: snap.onePointText,
        strategySummaryDraft: "요약",
        committed: snap,
      })
    ).toBe(false);
  });
});
