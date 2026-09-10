/**
 * Phase 3A — WYSIWYG session editor / dual-draft / Apply immediate refresh contracts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildAiCommentApplyPayload,
  captureAiCommentCommittedSnapshot,
  composeStrategySummarySessionText,
  isAiCommentDraftDirty,
} from "../../domain/lesson/aiCommentEditorSession";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "../../App.jsx");

function readOverlay() {
  return readFileSync(join(__dirname, "AiOverlay.jsx"), "utf8");
}

describe("composeStrategySummarySessionText", () => {
  it("supports string or intro/str model (legacy helper)", () => {
    expect(
      composeStrategySummarySessionText({
        introLine: "파이브 앤드 하프 시스템을 응용한 뒤돌리기 공략입니다.",
        strLine: "볼 2개 통과 기준, 2.5레일 속도의 부드러운 등속 패턴으로 공략합니다.",
      })
    ).toContain("파이브 앤드 하프");
    expect(composeStrategySummarySessionText("직접 문장")).toBe("직접 문장");
  });
});

describe("Phase 3A dirty / Apply source", () => {
  it("summary edit alone is dirty; library-only is not shot dirty", () => {
    const committed = captureAiCommentCommittedSnapshot({
      ai: { text: "", onePointLessons: [{ id: "1", text: "샷" }] },
      strategySummaryText: "요약 A",
    });
    expect(
      isAiCommentDraftDirty({
        shotOnePointDraft: "샷",
        strategySummaryDraft: "요약 B",
        committed,
      })
    ).toBe(true);
    expect(
      isAiCommentDraftDirty({
        shotOnePointDraft: "샷",
        strategySummaryDraft: "요약 A",
        committed,
      })
    ).toBe(false);
  });

  it("Apply payload uses shot draft text only (library independent)", () => {
    const libraryDraft = "라이브러리만 수정";
    const shotOnePointDraft = "샷에 적용될 문장";
    const payload = buildAiCommentApplyPayload({
      draftText: shotOnePointDraft,
    });
    expect(payload.onePointLessons).toHaveLength(1);
    expect(payload.onePointLessons[0].text).toBe("샷에 적용될 문장");
    expect(payload.onePointLessons[0].text).not.toBe(libraryDraft);
    expect(payload.text).toBe("");
  });

  it("Apply sync model: lastCommitted + shot draft equal after commit", () => {
    let shot = "편집본";
    let summary = "요약 편집";
    const payload = buildAiCommentApplyPayload({ draftText: shot });
    const snap = captureAiCommentCommittedSnapshot({
      ai: payload,
      strategySummaryText: summary,
    });
    shot = snap.onePointText;
    summary = snap.strategySummaryText;
    expect(
      isAiCommentDraftDirty({
        shotOnePointDraft: shot,
        strategySummaryDraft: summary,
        committed: snap,
      })
    ).toBe(false);
    expect(shot).toBe("편집본");
  });
});

describe("AiOverlay / App Phase 3A source contracts", () => {
  const overlay = readOverlay();
  const app = readFileSync(appPath, "utf8");

  it("renders bold 공략 요약 + PRO ONE POINT current-shot editors", () => {
    expect(overlay).toContain(">공략 요약<");
    expect(overlay).toContain('aria-label="공략 요약"');
    expect(overlay).toContain('aria-label="현재 샷 PRO ONE POINT"');
    expect(overlay).toContain("strategySummaryDraft");
    expect(overlay).toContain("shotOnePointDraft");
    expect(overlay).toContain("libraryDraft");
    expect(overlay).toContain("등록 문장 라이브러리");
    expect(overlay).toContain(
      'placeholder="새로운 PRO ONE POINT를 입력하세요."'
    );
    expect(overlay).not.toContain("AiAutoCommentDisplay");
    expect(overlay).not.toMatch(/>\s*삭제\s*</);
  });

  it("proofreading routes to shot or library draft (not summary)", () => {
    expect(overlay).toContain("resolveProofreadTarget");
    expect(overlay).toContain("fetchProofreading(requestText");
    expect(overlay).toContain("setLibraryDraft?.(corrected)");
    expect(overlay).toContain("setShotOnePointDraft?.(corrected)");
    expect(overlay).not.toContain("setStrategySummaryDraft?.(corrected)");
  });

  it("App Apply uses shot source; select does not duplicate into libraryDraft", () => {
    expect(app).toContain("draftText: shotText");
    expect(app).toContain("setShotOnePointDraft(item.text)");
    const selectBlock = app.slice(
      app.indexOf("const onSelectOnePoint = (id) =>"),
      app.indexOf("const commitAiCommentEditorSession")
    );
    expect(selectBlock).not.toContain("setLibraryDraft(item.text)");
    expect(app).toContain("strategySummaryText: effectiveSummary");
    expect(app).toMatch(/keep AI overlay open after Apply/);
  });
});
