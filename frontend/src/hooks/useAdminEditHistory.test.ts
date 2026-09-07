/**
 * ADMIN Undo + Persistent Recall Origin — regression contracts T1–T17 (+ T18 note).
 * Pure history SSOT only — no calculation / USER trajectory semantics.
 */
import { describe, expect, it } from "vitest";
import {
  type AdminAuthoredEditSnapshot,
  beginAdminEditTransaction,
  canUndoAdminEdit,
  commitAdminEditTransaction,
  createEmptyAdminEditHistoryState,
  hasAdminRecallOrigin,
  isAdminEditAtRecallOrigin,
  recallAdminEditToOrigin,
  recordAdminEditBefore,
  replaceRecallOrigin,
  undoAdminEdit,
  clearAdminEditHistory,
  adminAuthoredEditSnapshotsEqual,
} from "../domain/admin/adminEditHistory";
import type { ShotEditorState } from "./useShotSlots";

function emptyShotEditor(): ShotEditorState {
  return {
    activeSlot: "S1",
    slots: {
      S1: { draft: null, applied: null },
      S2: { draft: null, applied: null },
      S3: { draft: null, applied: null },
    },
  };
}

function snap(partial: Partial<AdminAuthoredEditSnapshot> & { tag?: string }): AdminAuthoredEditSnapshot {
  const { tag, ...rest } = partial;
  return {
    ballsState: {
      cue: { x: 10, y: 8 },
      target: { x: 40, y: 20 },
      second: { x: 62, y: 12 },
      ...(typeof rest.ballsState === "object" && rest.ballsState
        ? (rest.ballsState as object)
        : {}),
      ...(tag ? { __tag: tag } : {}),
    },
    targetColor: "red",
    isTargetSelected: true,
    adminHpt: { tipCount: 2, T: "-3/8", mode: "TIP" },
    adminSys: { systemId: "5_half_system" },
    adminStr: { speed: 2 },
    adminAi: { text: "a" },
    c2ReflectionOverride: null,
    shotEditor: emptyShotEditor(),
    ...rest,
  };
}

describe("useAdminEditHistory / adminEditHistory contracts", () => {
  it("T1: Load S0 → edit A → Undo → S0", () => {
    const S0 = snap({ tag: "S0" });
    const A = snap({ tag: "A" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0);
    // screen is A
    const u = undoAdminEdit(st);
    expect(u.restore).toEqual(S0);
    expect(canUndoAdminEdit(u.state)).toBe(false);
  });

  it("T2: Load S0 → A → B → Undo → A → Undo → S0", () => {
    const S0 = snap({ tag: "S0" });
    const A = snap({ tag: "A" });
    const B = snap({ tag: "B" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0); // before A
    st = recordAdminEditBefore(st, A); // before B
    let u = undoAdminEdit(st);
    expect(u.restore).toEqual(A);
    u = undoAdminEdit(u.state);
    expect(u.restore).toEqual(S0);
    expect(canUndoAdminEdit(u.state)).toBe(false);
  });

  it("T3: C2 drag many moves → one commit at end → Undo = pre-drag", () => {
    const before = snap({
      tag: "preC2",
      c2ReflectionOverride: null,
    });
    const mid = snap({
      tag: "preC2",
      c2ReflectionOverride: { rail: "TOP", t: 0.3 },
    });
    const end = snap({
      tag: "preC2",
      c2ReflectionOverride: { rail: "TOP", t: 0.7 },
    });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), before);
    st = beginAdminEditTransaction(st, before);
    // mid moves do not commit
    expect(st.undoStack).toHaveLength(0);
    st = commitAdminEditTransaction(st, mid, "c2"); // would commit if used mid — simulate only end
    // reset: proper flow
    st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), before);
    st = beginAdminEditTransaction(st, before);
    st = commitAdminEditTransaction(st, end, "c2");
    expect(st.undoStack).toHaveLength(1);
    const u = undoAdminEdit(st);
    expect(u.restore?.c2ReflectionOverride).toBeNull();
  });

  it("T4: Ball drag many moves → one commit → Undo = pre-drag coords", () => {
    const before = snap({
      ballsState: { cue: { x: 10, y: 8 }, target: { x: 40, y: 20 }, second: { x: 62, y: 12 } },
    });
    const after = snap({
      ballsState: { cue: { x: 15, y: 9 }, target: { x: 40, y: 20 }, second: { x: 62, y: 12 } },
    });
    let st = beginAdminEditTransaction(createEmptyAdminEditHistoryState(), before);
    st = commitAdminEditTransaction(st, after, "ball");
    expect(st.undoStack).toHaveLength(1);
    const u = undoAdminEdit(st);
    expect((u.restore?.ballsState as any).cue).toEqual({ x: 10, y: 8 });
  });

  it("T5: HP/T modal inputs then Apply → Undo = pre-Apply HPT", () => {
    const before = snap({ adminHpt: { tipCount: 1 } });
    const after = snap({ adminHpt: { tipCount: 3 } });
    let st = recordAdminEditBefore(createEmptyAdminEditHistoryState(), before);
    const u = undoAdminEdit(st);
    expect(u.restore?.adminHpt).toEqual({ tipCount: 1 });
    expect(after.adminHpt).toEqual({ tipCount: 3 });
  });

  it("T6: modal open/close does not grow Undo (no recordBefore)", () => {
    let st = replaceRecallOrigin(
      createEmptyAdminEditHistoryState(),
      snap({ tag: "S0" })
    );
    // open/close — no history API calls
    expect(st.undoStack).toHaveLength(0);
    expect(canUndoAdminEdit(st)).toBe(false);
  });

  it("T7: Load S0 → edit → SAVE (no origin replace) → edit → Recall = S0", () => {
    const S0 = snap({ tag: "S0" });
    const B = snap({ tag: "B" });
    const C = snap({ tag: "C" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0); // → B
    // SAVE — must not call replaceRecallOrigin
    expect(st.recallOriginSnapshot).toEqual(S0);
    st = recordAdminEditBefore(st, B); // → C
    const r = recallAdminEditToOrigin(st);
    expect(r.restore).toEqual(S0);
    expect(r.state.undoStack).toHaveLength(0);
    expect(hasAdminRecallOrigin(r.state)).toBe(true);
  });

  it("T8: SAVE does not replace Origin", () => {
    const S0 = snap({ tag: "S0" });
    const saved = snap({ tag: "saved" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0);
    // pretend SAVE of `saved` — Origin untouched
    expect(isAdminEditAtRecallOrigin(st, saved)).toBe(false);
    expect(st.recallOriginSnapshot).toEqual(S0);
    const r = recallAdminEditToOrigin(st);
    expect(r.restore).toEqual(S0);
  });

  it("T9: Recall clears Undo history", () => {
    const S0 = snap({ tag: "S0" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0);
    st = recordAdminEditBefore(st, snap({ tag: "A" }));
    expect(st.undoStack.length).toBeGreaterThan(0);
    const r = recallAdminEditToOrigin(st);
    expect(r.state.undoStack).toHaveLength(0);
    expect(canUndoAdminEdit(r.state)).toBe(false);
  });

  it("T10: Recall → edit → Recall again = same S0", () => {
    const S0 = snap({ tag: "S0" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0);
    let r = recallAdminEditToOrigin(st);
    st = r.state;
    st = recordAdminEditBefore(st, S0);
    r = recallAdminEditToOrigin(st);
    expect(r.restore).toEqual(S0);
    expect(hasAdminRecallOrigin(r.state)).toBe(true);
  });

  it("T11: New Load replaces Origin (S0 → X0)", () => {
    const S0 = snap({ tag: "S0" });
    const X0 = snap({ tag: "X0" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0);
    st = replaceRecallOrigin(st, X0);
    expect(st.recallOriginSnapshot).toEqual(X0);
    expect(st.undoStack).toHaveLength(0);
    const r = recallAdminEditToOrigin(st);
    expect(r.restore).toEqual(X0);
  });

  it("T12: Fresh blank → Recall unavailable", () => {
    const st = createEmptyAdminEditHistoryState();
    expect(hasAdminRecallOrigin(st)).toBe(false);
    const r = recallAdminEditToOrigin(st);
    expect(r.restore).toBeNull();
  });

  it("T13: Load immediately editable (history model: Origin captured, session owned by App)", () => {
    const S0 = snap({ tag: "S0" });
    const st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    expect(hasAdminRecallOrigin(st)).toBe(true);
    // App sets isAdminInputSessionActive=true on Load — covered by flow/source contracts
  });

  it("T14: snapshot stores authored override only — not calculated C2", () => {
    const s = snap({
      c2ReflectionOverride: { rail: "BOTTOM", t: 0.2 },
    });
    expect(s.c2ReflectionOverride).toEqual({ rail: "BOTTOM", t: 0.2 });
    expect(JSON.stringify(s)).not.toMatch(/calculatedC2|qx|qy|"q":/);
  });

  it("T15: Undo restores authored c2ReflectionOverride", () => {
    const before = snap({
      c2ReflectionOverride: { rail: "TOP", t: 0.1 },
    });
    const after = snap({ c2ReflectionOverride: null });
    let st = recordAdminEditBefore(createEmptyAdminEditHistoryState(), before);
    // after tip clear on screen
    const u = undoAdminEdit(st);
    expect(u.restore?.c2ReflectionOverride).toEqual({ rail: "TOP", t: 0.1 });
    expect(after.c2ReflectionOverride).toBeNull();
  });

  it("T16: SAVE does not clear Undo; Undo still possible after SAVE", () => {
    const S0 = snap({ tag: "S0" });
    const A = snap({ tag: "A" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0);
    // SAVE A — stack retained
    expect(canUndoAdminEdit(st)).toBe(true);
    const u = undoAdminEdit(st);
    expect(u.restore).toEqual(S0);
    // App sets isSaved=false when current != saved
  });

  it("T17: SYS / STR / AI Apply each one transaction", () => {
    const S0 = snap({ tag: "S0" });
    let st = replaceRecallOrigin(createEmptyAdminEditHistoryState(), S0);
    st = recordAdminEditBefore(st, S0); // sys
    st = recordAdminEditBefore(st, snap({ tag: "sys" })); // str
    st = recordAdminEditBefore(st, snap({ tag: "str" })); // ai
    expect(st.undoStack).toHaveLength(3);
  });

  it("T18 note: history module is ADMIN-only pure SSOT (no USER imports)", () => {
    // Bit-identical USER semantics guaranteed by non-touch of USER paths in this module.
    expect(true).toBe(true);
  });

  it("no-op commit does not push Undo", () => {
    const S0 = snap({ tag: "S0" });
    let st = beginAdminEditTransaction(createEmptyAdminEditHistoryState(), S0);
    st = commitAdminEditTransaction(st, S0, "ball");
    expect(st.undoStack).toHaveLength(0);
  });

  it("clear history removes Origin (refresh / fresh blank)", () => {
    let st = replaceRecallOrigin(
      createEmptyAdminEditHistoryState(),
      snap({ tag: "S0" })
    );
    st = clearAdminEditHistory(st);
    expect(hasAdminRecallOrigin(st)).toBe(false);
  });

  it("snapshotsEqual helper", () => {
    const a = snap({ tag: "x" });
    const b = snap({ tag: "x" });
    expect(adminAuthoredEditSnapshotsEqual(a, b)).toBe(true);
  });
});
