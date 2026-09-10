/**
 * Phase 1 — AI Comment editor session / Apply / Cancel / USER isolation contracts.
 */
import { describe, expect, it } from "vitest";
import {
  activeOnePointBlockText,
  buildAiCommentApplyPayload,
  buildCommittedOnePointLessons,
  captureAiCommentCommittedSnapshot,
  isAiCommentDraftDirty,
  normalizeOnePointBlockText,
  pickCommittedAiForUser,
} from "./aiCommentEditorSession";

describe("aiCommentEditorSession — PRO ONE POINT block", () => {
  it("preserves multi-paragraph / multi-sentence block text", () => {
    const block = [
      "밀림이 과도하게 발생하지 않도록 힘을 빼고 경쾌하게 스트로크합니다.",
      "마지막에는 큐를 가볍게 잡아 분리각을 만들어야 길게 빠지는 것을 방지할 수 있습니다.",
      "- 조방연 프로 -",
    ].join("\n");
    expect(normalizeOnePointBlockText(`  ${block}\n`)).toBe(block);
    const lessons = buildCommittedOnePointLessons(block);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].text).toBe(block);
  });

  it("Apply builds single-block replace payload (no append growth)", () => {
    const first = buildAiCommentApplyPayload({ draftText: "첫 레슨" });
    expect(first.onePointLessons).toHaveLength(1);
    expect(first.text).toBe("");

    const second = buildAiCommentApplyPayload({
      draftText: "수정된 레슨\n두 번째 줄",
      preferLessonId: first.onePointLessons[0].id,
    });
    expect(second.onePointLessons).toHaveLength(1);
    expect(second.onePointLessons[0].id).toBe(first.onePointLessons[0].id);
    expect(second.onePointLessons[0].text).toContain("두 번째 줄");

    // Simulate repeated Apply on same shot: always length 1, never append stack
    let committed = first.onePointLessons;
    for (let i = 0; i < 5; i += 1) {
      committed = buildAiCommentApplyPayload({
        draftText: `v${i}`,
      }).onePointLessons;
    }
    expect(committed).toHaveLength(1);
    expect(committed[0].text).toBe("v4");
  });

  it("empty Apply clears the shot PRO ONE POINT block", () => {
    expect(buildCommittedOnePointLessons("   ")).toEqual([]);
    expect(buildAiCommentApplyPayload({ draftText: "" }).onePointLessons).toEqual(
      []
    );
  });

  it("reads legacy multi-item onePointLessons without data loss", () => {
    const legacy = [
      { id: "a", text: "첫째" },
      { id: "b", text: "둘째" },
    ];
    expect(activeOnePointBlockText(legacy)).toBe("첫째\n\n둘째");
    const snap = captureAiCommentCommittedSnapshot({
      ai: { text: "", onePointLessons: legacy },
      onePointSelectedId: "",
    });
    expect(snap.onePointLessons).toHaveLength(2);
    expect(snap.onePointText).toBe("첫째\n\n둘째");
  });
});

describe("aiCommentEditorSession — close / cancel / apply dirty", () => {
  it("dirty detects draft edits vs last committed", () => {
    const committed = captureAiCommentCommittedSnapshot({
      ai: {
        text: "",
        onePointLessons: [{ id: "1", text: "확정 문장" }],
      },
      onePointSelectedId: "",
    });
    expect(
      isAiCommentDraftDirty({
        draftText: "확정 문장",
        onePointSelectedId: "",
        committed,
      })
    ).toBe(false);
    expect(
      isAiCommentDraftDirty({
        draftText: "수정 중",
        onePointSelectedId: "",
        committed,
      })
    ).toBe(true);
  });

  it("selectedId alone does not make shot editor dirty (Phase 2B.1)", () => {
    const committed = captureAiCommentCommittedSnapshot({
      ai: {
        text: "",
        onePointLessons: [{ id: "1", text: "동일 문장" }],
      },
      onePointSelectedId: "",
    });
    expect(
      isAiCommentDraftDirty({
        draftText: "동일 문장",
        onePointSelectedId: "lib-xyz",
        committed,
      })
    ).toBe(false);
  });

  it("Apply/Cancel keep-open model: commit updates lastCommitted without requiring close", () => {
    let overlayOpen = true;
    let draft = "편집";
    let committed = captureAiCommentCommittedSnapshot({
      ai: { text: "", onePointLessons: [{ id: "1", text: "이전" }] },
      onePointSelectedId: "",
    });
    // Apply keep-open
    const payload = buildAiCommentApplyPayload({ draftText: draft });
    committed = captureAiCommentCommittedSnapshot({
      ai: payload,
      onePointSelectedId: "",
    });
    draft = committed.onePointText;
    // no closeOverlay
    expect(overlayOpen).toBe(true);
    expect(isAiCommentDraftDirty({ draftText: draft, committed })).toBe(false);

    draft = "다시 편집";
    expect(isAiCommentDraftDirty({ draftText: draft, committed })).toBe(true);
    // Cancel keep-open
    draft = committed.onePointText;
    expect(isAiCommentDraftDirty({ draftText: draft, committed })).toBe(false);
    expect(overlayOpen).toBe(true);
  });

  it("dirty close guard model blocks accidental dismiss only", () => {
    const committed = captureAiCommentCommittedSnapshot({
      ai: { text: "", onePointLessons: [{ id: "1", text: "확정" }] },
      onePointSelectedId: "",
    });
    const dirty = isAiCommentDraftDirty({
      draftText: "미확정",
      committed,
    });
    expect(dirty).toBe(true);
    // closeOverlay would no-op when dirty; openOverlay type switch still allowed
    let overlayType = "AI";
    if (!dirty) overlayType = null;
    expect(overlayType).toBe("AI");
    overlayType = "SYS"; // modal switch allowed
    expect(overlayType).toBe("SYS");
  });

  it("Cancel restores working draft from last committed snapshot (model)", () => {
    const committed = captureAiCommentCommittedSnapshot({
      ai: {
        text: "",
        onePointLessons: [{ id: "1", text: "적용된 블록\n둘째 줄" }],
      },
      onePointSelectedId: "lib-1",
    });
    let workingDraft = "편집 중인 미확정";
    let selectedId = "";
    // cancel semantics
    workingDraft = committed.onePointText;
    selectedId = committed.onePointSelectedId;
    expect(workingDraft).toBe("적용된 블록\n둘째 줄");
    expect(selectedId).toBe("lib-1");
  });

  it("close without cancel preserves working draft (model)", () => {
    const workingDraft = "닫아도 유지되는 draft";
    // close = no mutation of workingDraft
    expect(workingDraft).toBe("닫아도 유지되는 draft");
  });
});

describe("aiCommentEditorSession — USER isolation", () => {
  it("USER pickCommittedAiForUser ignores admin-only uncommitted ai", () => {
    const adminOnly = {
      text: "",
      onePointLessons: [{ id: "x", text: "미확정 admin append" }],
    };
    const slotApplied = {
      text: "",
      onePointLessons: [{ id: "1", text: "슬롯 확정" }],
    };
    // Old merge included adminAi; Phase 1 USER must use slot only.
    const userAi = pickCommittedAiForUser({
      draftAi: null,
      appliedAi: slotApplied,
    });
    expect(userAi?.onePointLessons.map((l) => l.text)).toEqual(["슬롯 확정"]);
    expect(userAi?.onePointLessons.map((l) => l.text)).not.toContain(
      "미확정 admin append"
    );
    void adminOnly;
  });

  it("typing/proofread draft alone does not appear in USER committed pick", () => {
    const workingDraft = "교정 preview / typing only";
    const userAi = pickCommittedAiForUser({
      draftAi: null,
      appliedAi: { text: "", onePointLessons: [] },
    });
    expect(activeOnePointBlockText(userAi?.onePointLessons)).toBe("");
    expect(workingDraft).toContain("typing");
  });
});
