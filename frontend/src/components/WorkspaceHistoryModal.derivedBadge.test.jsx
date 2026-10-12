/**
 * 5 — History screen shows one row per original work item with a compact
 * "파생 승인 완료 · N개" badge; Derived Members are never listed as rows.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WorkspaceHistoryModal from "./WorkspaceHistoryModal";
import { buildHistoryDerivedBadge } from "../domain/historyRowView";

const FAMILY_ID = "fm_2a1440b5-6c93-40b5-a797-b10ef12aac99";

function member(i, origin) {
  return {
    schemaVersion: 1,
    memberId: `mb_badge_member_${String(i).padStart(4, "0")}`,
    familyId: FAMILY_ID,
    balls: {
      cue: { x: 20 + (i % 10), y: 16 },
      target: { x: 60, y: 20 },
      second: { x: 20, y: 20 + Math.floor(i / 10) },
    },
    targetBall: "red",
    track: "B2T_R",
    memberOrigin: origin,
    sourceSlot: "S1",
  };
}

function approvedGraph(derivedCount) {
  const members = [
    member(0, "AUTHORED"),
    member(1, "SYMMETRY"),
    member(2, "SYMMETRY"),
    member(3, "SYMMETRY"),
  ];
  for (let i = 0; i < derivedCount; i += 1) {
    members.push(member(4 + i, "DERIVED_CUE_C3_PRODUCT"));
  }
  return {
    kind: "NORMALIZED_FAMILY_GRAPH",
    schemaVersion: 1,
    familyId: FAMILY_ID,
    master: { schemaVersion: 1, familyId: FAMILY_ID, signature: {}, sysInputs: {} },
    members,
  };
}

function snapshot(id, name, extra = {}) {
  return {
    id,
    name,
    systemId: "5_half_system",
    pattern: "뒤돌리기",
    version: 1,
    timestamp: "2026-09-25T03:57:13.496Z",
    exported: false,
    state: { adminState: {}, ballsState: {}, shotEditor: { activeSlot: "S1", slots: {} } },
    ...extra,
  };
}

function render(history) {
  return renderToStaticMarkup(
    createElement(WorkspaceHistoryModal, {
      history,
      onClose: vi.fn(),
      onLoad: vi.fn(),
      onDelete: vi.fn(),
      onPublish: vi.fn(),
      publishInFlight: false,
    })
  );
}

describe("History row derived badge", () => {
  it("one row + '파생 승인 완료 · 436개'; Derived Members never rendered", () => {
    const graph = approvedGraph(436);
    const html = render([
      snapshot("s1", "뒤돌리기_5_half_system_v001_2026-09-25", {
        exported: true,
        publishFamilyGraph: graph,
        derivedApproval: { status: "APPROVED", derivedCount: 436, source: "SAVE_APPROVE" },
      }),
    ]);
    expect(html).toContain("뒤돌리기_5_half_system_v001");
    expect(html).toContain("파생 승인 완료 · 436개");
    expect(html).toContain("Published");
    expect(html.match(/data-testid="history-row"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("mb_badge_member_");
    expect(html).not.toContain("DERIVED_CUE_C3_PRODUCT");
  });

  it("OVERWRITE-preserved row shows the preserved derived count", () => {
    const html = render([
      snapshot("s2", "뒤돌리기_5_half_system_v002_2026-09-27", {
        publishFamilyGraph: approvedGraph(12),
        derivedApproval: { status: "APPROVED", derivedCount: 12, source: "OVERWRITE_PRESERVED" },
      }),
    ]);
    expect(html).toContain("파생 승인 완료 · 12개");
  });

  it("zero derived → no badge; pending → not-yet-approved badge", () => {
    expect(
      buildHistoryDerivedBadge(
        snapshot("z", "z", {
          publishFamilyGraph: approvedGraph(0),
          derivedApproval: { status: "APPROVED", derivedCount: 0, source: "SAVE_APPROVE" },
        })
      )
    ).toBeNull();
    const pending = buildHistoryDerivedBadge(
      snapshot("p", "p", { derivedApproval: { status: "PENDING", derivedCount: 0 } })
    );
    expect(pending?.kind).toBe("PENDING");
    expect(buildHistoryDerivedBadge(snapshot("legacy", "legacy"))).toBeNull();
  });
});
