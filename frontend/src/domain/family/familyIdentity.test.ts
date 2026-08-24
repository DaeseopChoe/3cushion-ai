/**
 * Phase 1B Family identity + compatibility adapter.
 * Run: npx vitest run src/domain/family/familyIdentity.test.ts
 */

import { describe, expect, it } from "vitest";
import { normalizeCanonicalStrategyEntry } from "../canonicalStrategy";
import { normalizeDatasetFromStorage } from "../positionMergeEngine";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { runSpatialRecall } from "../recall/recallEngine";
import { projectKnot } from "../realInterpolation/knotCorpus";
import type { WorkspaceSnapshot } from "../workspaceHistory";
import { mergePublishedRecords } from "../datasetExportMerge";
import {
  assertDistinctFamilyIdentities,
  genericFamilyMemberIdentityKey,
  deriveStorageGeneration,
  FAMILY_ID_PREFIX,
  MEMBER_ID_PREFIX,
  mintFamilyId,
  mintMemberId,
  projectFamilyAwareView,
  projectFamilyAwareViewsForRecord,
  readPersistedFamilyIdentity,
  resolveGenericFamilyMemberIdentity,
  resolveFamilyIdentityForSave,
  validateFamilyProvenance,
} from "./familyIdentity";
import { createFamilyPositionKey } from "./familyPositionKey";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const otherBalls = {
  cue: { x: 11, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

function entry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C3_r: 20 },
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0,
      angle_fs: 0,
    },
    hpT: { T: "8/8" },
    ...overrides,
  };
}

function record(
  strategies: PositionRecord["strategies"],
  positionId = "100100400200600150"
): PositionRecord {
  return { positionId, balls, strategies };
}

describe("Family identity mint / invariants", () => {
  it("mints familyId and memberId with distinct prefixes", () => {
    const familyId = mintFamilyId();
    const memberId = mintMemberId();
    expect(familyId.startsWith(FAMILY_ID_PREFIX)).toBe(true);
    expect(memberId.startsWith(MEMBER_ID_PREFIX)).toBe(true);
    expect(familyId).not.toBe(memberId);
    assertDistinctFamilyIdentities({
      familyId,
      memberId,
      authoringStrategyId: "as_abc",
      positionId: "100100400200600150",
      slot: "S1",
    });
  });

  it("familyId != authoringStrategyId and memberId != positionId", () => {
    const familyId = mintFamilyId();
    const memberId = mintMemberId();
    expect(familyId.startsWith("as_")).toBe(false);
    expect(memberId.startsWith("as_")).toBe(false);
    expect(familyId).not.toBe("as_abc");
    expect(memberId).not.toBe("100100400200600150");
    expect(readPersistedFamilyIdentity(entry({ familyId: "as_abc", memberId }))).toBeNull();
    expect(
      readPersistedFamilyIdentity(entry({ familyId, memberId: "100100400200600150" }), {
        positionId: "100100400200600150",
      })
    ).toBeNull();
  });

  it("rejects aliased persisted identity", () => {
    expect(
      readPersistedFamilyIdentity(
        entry({ familyId: "as_abc", memberId: mintMemberId() }),
        { authoringStrategyId: "as_abc" }
      )
    ).toBeNull();
    expect(
      readPersistedFamilyIdentity(
        entry({ familyId: mintFamilyId(), memberId: "pos-1" }),
        { positionId: "pos-1" }
      )
    ).toBeNull();
  });
});

describe("SAVE identity resolve — original authored member", () => {
  it("CREATE mints AUTHORED identity when no explicit update identity exists", () => {
    const resolved = resolveFamilyIdentityForSave({
      saveIntent: "CREATE",
      authoringStrategyId: "as_new",
      positionId: "100100400200600150",
    });
    expect(resolved).not.toBeNull();
    expect(resolved.familyId.startsWith("fm_")).toBe(true);
    expect(resolved.memberId.startsWith("mb_")).toBe(true);
    expect(resolved.memberOrigin).toBe("AUTHORED");
    expect(resolved.familyId).not.toBe("as_new");
    expect(resolved.memberId).not.toBe("100100400200600150");
  });

  it("UPDATE preserves explicit authored Family identity", () => {
    const familyId = "fm_keep";
    const memberId = "mb_keep";
    const resolved = resolveFamilyIdentityForSave({
      saveIntent: "UPDATE",
      explicitIdentity: entry({
        familyId,
        memberId,
        memberOrigin: "AUTHORED",
        authoringStrategyId: "as_keep",
      }),
      authoringStrategyId: "as_keep",
      positionId: "100100400200600150",
    });
    expect(resolved.familyId).toBe(familyId);
    expect(resolved.memberId).toBe(memberId);
    expect(resolved.memberOrigin).toBe("AUTHORED");
  });

  it("UPDATE on a symmetry member resolves back to the AUTHORED memberId", () => {
    const resolved = resolveFamilyIdentityForSave({
      saveIntent: "UPDATE",
      explicitIdentity: entry({
        familyId: "fm_keep",
        memberId: "mb_sym",
        memberOrigin: "SYMMETRY",
        generatedFromMemberId: "mb_authored",
        symmetryOp: "H",
      }),
      authoringStrategyId: "as_keep",
      positionId: "100100400200600150",
    });
    expect(resolved?.familyId).toBe("fm_keep");
    expect(resolved?.memberId).toBe("mb_authored");
    expect(resolved?.memberOrigin).toBe("AUTHORED");
  });

  it("UPDATE without explicit identity does not infer from Exact+slot equality", () => {
    const resolved = resolveFamilyIdentityForSave({
      saveIntent: "UPDATE",
      explicitIdentity: null,
      authoringStrategyId: "as_keep",
      positionId: "100100400200600150",
    });
    expect(resolved).toBeNull();
  });

  it("CREATE does not inherit Family identity from coordinate equality", () => {
    const s1 = resolveFamilyIdentityForSave({
      saveIntent: "CREATE",
      authoringStrategyId: "as_s1",
      positionId: "p1",
    });
    const s2 = resolveFamilyIdentityForSave({
      saveIntent: "CREATE",
      authoringStrategyId: "as_s2",
      positionId: "p1",
    });
    expect(s1.familyId).not.toBe(s2.familyId);
    expect(s1.memberId).not.toBe(s2.memberId);
  });
});

describe("Compatibility adapter — legacy vs native", () => {
  it("legacy record loads as LEGACY view with null ids (no invented Family)", () => {
    const rec = record({ S1: entry() });
    const view = projectFamilyAwareView(rec, "S1");
    expect(view).not.toBeNull();
    expect(view?.storageGeneration).toBe("LEGACY");
    expect(view?.member.familyId).toBeNull();
    expect(view?.member.memberId).toBeNull();
    expect(view?.member.memberOrigin).toBeUndefined();
    expect(deriveStorageGeneration(null)).toBe("LEGACY");
  });

  it("does not group legacy records by coordinates or track", () => {
    const a = record({ S1: entry({ track: "B2T_L" }) }, "pos-a");
    const b: PositionRecord = {
      positionId: "pos-b",
      balls,
      strategies: { S1: entry({ track: "B2T_R" }) },
    };
    const va = projectFamilyAwareView(a, "S1");
    const vb = projectFamilyAwareView(b, "S1");
    expect(va?.member.familyId).toBeNull();
    expect(vb?.member.familyId).toBeNull();
    expect(va?.member.familyId).toBe(vb?.member.familyId);
  });

  it("same Exact balls S1/S2 can be different Families", () => {
    const rec = record({
      S1: entry({
        slot: "S1",
        familyId: "fm_a",
        memberId: "mb_a",
        memberOrigin: "AUTHORED",
        authoringStrategyId: "as_a",
      }),
      S2: entry({
        slot: "S2",
        familyId: "fm_b",
        memberId: "mb_b",
        memberOrigin: "AUTHORED",
        authoringStrategyId: "as_b",
        signature: {
          systemId: "plus2_system",
          formulaHash: "h2",
          shotType: "옆돌리기",
        },
      }),
    });
    const views = projectFamilyAwareViewsForRecord(rec);
    expect(views).toHaveLength(2);
    expect(views[0].member.familyId).toBe("fm_a");
    expect(views[1].member.familyId).toBe("fm_b");
    expect(views[0].member.familyId).not.toBe(views[1].member.familyId);
  });

  it("coordinates equality does not collapse Family identity", () => {
    const rec: PositionRecord = {
      positionId: "same-pos",
      balls,
      strategies: {
        S1: entry({
          familyId: "fm_one",
          memberId: "mb_one",
          memberOrigin: "AUTHORED",
        }),
      },
    };
    const other: PositionRecord = {
      positionId: "other-pos",
      balls,
      strategies: {
        S1: entry({
          familyId: "fm_two",
          memberId: "mb_two",
          memberOrigin: "AUTHORED",
        }),
      },
    };
    expect(projectFamilyAwareView(rec, "S1")?.member.familyId).toBe("fm_one");
    expect(projectFamilyAwareView(other, "S1")?.member.familyId).toBe("fm_two");
  });
});

describe("Working / unknown field preservation", () => {
  it("normalizes legacy StrategyEntry without inventing Family ids", () => {
    const normalized = normalizeCanonicalStrategyEntry(entry());
    expect(normalized.familyId).toBeUndefined();
    expect(normalized.memberId).toBeUndefined();
    expect(normalized.sysInputs.CO_f).toBe(30);
  });

  it("preserves additive Family metadata and unknown extras through dataset normalize", () => {
    const raw = [
      {
        positionId: "p1",
        balls,
        extraRecordNote: "keep-me",
        strategies: {
          S1: {
            ...entry({
              familyId: "fm_round",
              memberId: "mb_round",
              memberOrigin: "AUTHORED",
              authoringStrategyId: "as_round",
            }),
            customNote: "unknown-extra",
          },
        },
      },
    ];
    const loaded = normalizeDatasetFromStorage(raw);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].strategies.S1?.familyId).toBe("fm_round");
    expect(loaded[0].strategies.S1?.memberId).toBe("mb_round");
    expect(loaded[0].strategies.S1?.memberOrigin).toBe("AUTHORED");
    expect(
      (loaded[0].strategies.S1 as StrategyEntry & { customNote?: string }).customNote
    ).toBe("unknown-extra");
    expect((loaded[0] as PositionRecord & { extraRecordNote?: string }).extraRecordNote).toBeUndefined();
  });

  it("preserves SYMMETRY lineage fields through dataset normalize", () => {
    const raw = [
      {
        positionId: "p-sym",
        balls,
        strategies: {
          S1: entry({
            familyId: "fm_round",
            memberId: "mb_sym",
            memberOrigin: "SYMMETRY",
            generatedFromMemberId: "mb_auth",
            symmetryOp: "H",
            authoringStrategyId: "as_sym",
          }),
        },
      },
    ];
    const loaded = normalizeDatasetFromStorage(raw);
    expect(loaded[0].strategies.S1?.generatedFromMemberId).toBe("mb_auth");
    expect(loaded[0].strategies.S1?.symmetryOp).toBe("H");
    expect(loaded[0].strategies.S1?.memberOrigin).toBe("SYMMETRY");
  });

  it("drops invalid aliased Family ids on normalize without rewriting other fields", () => {
    const normalized = normalizeCanonicalStrategyEntry(
      entry({
        familyId: "as_not_family",
        memberId: "mb_ok",
        authoringStrategyId: "as_not_family",
      })
    );
    expect(normalized.familyId).toBeUndefined();
    expect(normalized.memberId).toBeUndefined();
    expect(normalized.authoringStrategyId).toBe("as_not_family");
    expect(normalized.hpT).toEqual({ T: "8/8" });
  });
});

describe("History snapshot JSON round-trip", () => {
  it("legacy snapshot dataset restores without Family ids", () => {
    const snapshot: WorkspaceSnapshot = {
      id: "snap-legacy",
      name: "legacy",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: "2026-08-17T00:00:00.000Z",
      state: {
        adminState: { sys: { system: "5_half_system" } },
        ballsState: balls,
        dataset: [record({ S1: entry() })],
        shotEditor: {
          activeSlot: "S1",
          slots: { S1: { draft: null, applied: null } },
        },
      },
    };
    const restored = JSON.parse(JSON.stringify(snapshot)) as WorkspaceSnapshot;
    const loaded = normalizeDatasetFromStorage(restored.state.dataset);
    expect(loaded[0].strategies.S1?.familyId).toBeUndefined();
    expect(restored.state.shotEditor.activeSlot).toBe("S1");
    expect(restored.state.adminState.sys.system).toBe("5_half_system");
  });

  it("Family-aware snapshot dataset + slot identity round-trips", () => {
    const snapshot: WorkspaceSnapshot = {
      id: "snap-native",
      name: "native",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 2,
      timestamp: "2026-08-17T00:00:00.000Z",
      state: {
        adminState: { sys: { system: "5_half_system" } },
        ballsState: balls,
        dataset: [
          record({
            S1: entry({
              familyId: "fm_hist",
              memberId: "mb_hist",
              memberOrigin: "AUTHORED",
              authoringStrategyId: "as_hist",
            }),
          }),
        ],
        shotEditor: {
          activeSlot: "S1",
          slots: {
            S1: {
              draft: { sys: { track: "B2T_L" } },
              applied: { sys: { track: "B2T_L" } },
            },
          },
        },
      },
    };
    const restored = JSON.parse(JSON.stringify(snapshot)) as WorkspaceSnapshot;
    const loaded = normalizeDatasetFromStorage(restored.state.dataset);
    expect(loaded[0].strategies.S1?.familyId).toBe("fm_hist");
    expect(loaded[0].strategies.S1?.memberId).toBe("mb_hist");
    expect(restored.state.shotEditor.slots.S1.applied.sys.track).toBe("B2T_L");
  });
});

describe("Export merge preserves additive Family fields", () => {
  it("incoming Family metadata wins on same positionId + slot; other slots kept", () => {
    const existing: PositionRecord[] = [
      record(
        {
          S1: entry({
            familyId: "fm_old",
            memberId: "mb_old",
            memberOrigin: "AUTHORED",
          }),
        },
        "pos-a"
      ),
    ];
    const incoming: PositionRecord[] = [
      {
        positionId: "pos-a",
        balls: otherBalls,
        strategies: {
          S2: entry({
            slot: "S2",
            familyId: "fm_new",
            memberId: "mb_new",
            memberOrigin: "AUTHORED",
            signature: {
              systemId: "plus2_system",
              formulaHash: "h2",
              shotType: "옆돌리기",
            },
          }),
        },
      },
    ];
    const merged = mergePublishedRecords(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].positionId).toBe("pos-a");
    expect(merged[0].strategies.S1?.familyId).toBe("fm_old");
    expect(merged[0].strategies.S2?.familyId).toBe("fm_new");
  });
});

describe("Search / RI consumer preservation", () => {
  it("legacy Search still matches records without Family metadata", () => {
    const dataset = [record({ S1: entry() }, "pos-search")];
    const result = runSpatialRecall({
      dataset,
      query: { balls },
      profile: "userStrict",
    });
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.positionId).toBe("pos-search");
      expect(result.record.strategies.S1?.familyId).toBeUndefined();
    }
  });

  it("Family metadata does not replace authoringStrategyId RI gate", () => {
    const sharedFamily = "fm_shared";
    const rec: PositionRecord = {
      positionId: "p-ri",
      balls,
      strategies: {
        S1: entry({
          authoringStrategyId: undefined,
          familyId: sharedFamily,
          memberId: "mb_ri",
          memberOrigin: "AUTHORED",
        }),
      },
    };
    expect(projectKnot(rec, "S1")).toBeNull();
  });

  it("same familyId with different authoringStrategyId still projects as distinct RI knots", () => {
    const rec: PositionRecord = {
      positionId: "p-ri-2",
      balls,
      strategies: {
        S1: entry({
          slot: "S1",
          authoringStrategyId: "as_one",
          familyId: "fm_shared",
          memberId: "mb_one",
        }),
        S2: entry({
          slot: "S2",
          authoringStrategyId: "as_two",
          familyId: "fm_shared",
          memberId: "mb_two",
        }),
      },
    };
    const k1 = projectKnot(rec, "S1");
    const k2 = projectKnot(rec, "S2");
    expect(k1?.authoringStrategyId).toBe("as_one");
    expect(k2?.authoringStrategyId).toBe("as_two");
    expect(k1?.authoringStrategyId).not.toBe(k2?.authoringStrategyId);
    expect(k1?.entry.familyId).toBe("fm_shared");
  });
});

describe("Derived provenance foundation", () => {
  it.each([
    ["DERIVED_CUE_IMPACT", "CUE_IMPACT_FIRST_30PCT"],
    ["DERIVED_C3_PLUS", "C3_PLUS_SCORING_LINE_v1"],
  ] as const)(
    "%s requires source member, rule, and step",
    (memberOrigin, derivedRule) => {
      expect(
        validateFamilyProvenance({
          memberOrigin,
          generatedFromMemberId: "mb_base",
          derivedRule,
          derivedStep: "step:0001",
        }).ok
      ).toBe(true);
      expect(
        validateFamilyProvenance({
          memberOrigin,
          derivedRule,
          derivedStep: "step:0001",
        }).ok
      ).toBe(false);
      expect(
        validateFamilyProvenance({
          memberOrigin,
          generatedFromMemberId: "mb_base",
          derivedStep: "step:0001",
        }).ok
      ).toBe(false);
      expect(
        validateFamilyProvenance({
          memberOrigin,
          generatedFromMemberId: "mb_base",
          derivedRule,
        }).ok
      ).toBe(false);
    }
  );

  it("rejects invalid provenance combinations on AUTHORED and SYMMETRY", () => {
    expect(
      validateFamilyProvenance({
        memberOrigin: "AUTHORED",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
      }).ok
    ).toBe(false);
    expect(
      validateFamilyProvenance({
        memberOrigin: "SYMMETRY",
        generatedFromMemberId: "mb_base",
        symmetryOp: "H",
        derivedStep: "step:0001",
      }).ok
    ).toBe(false);
  });

  it("rejects derived rule/origin mismatches", () => {
    expect(
      validateFamilyProvenance({
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "C3_PLUS_2RG",
        derivedStep: "step:0001",
      }).ok
    ).toBe(false);
    expect(
      validateFamilyProvenance({
        memberOrigin: "DERIVED_C3_PLUS",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
      }).ok
    ).toBe(false);
  });

  it("builds derived identity keys from lineage, not coordinates", () => {
    const first = resolveGenericFamilyMemberIdentity(
      entry({
        familyId: "fm_derived",
        memberId: "mb_first",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
        track: "B2T_L",
      })
    );
    const second = resolveGenericFamilyMemberIdentity(
      entry({
        familyId: "fm_derived",
        memberId: "mb_second",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
        track: "B2T_L",
      })
    );
    expect(genericFamilyMemberIdentityKey(first)).toBe(
      genericFamilyMemberIdentityKey(second)
    );
  });

  it("changes derived identity key when step, rule, source, or family changes", () => {
    const base = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(
        entry({
          familyId: "fm_a",
          memberId: "mb_1",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_base",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "step:0001",
        })
      )
    );
    const differentStep = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(
        entry({
          familyId: "fm_a",
          memberId: "mb_2",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_base",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "step:0002",
        })
      )
    );
    const differentRule = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(
        entry({
          familyId: "fm_a",
          memberId: "mb_3",
          memberOrigin: "DERIVED_C3_PLUS",
          generatedFromMemberId: "mb_base",
          derivedRule: "C3_PLUS_SCORING_LINE_v1",
          derivedStep: "step:0001",
        })
      )
    );
    const differentSource = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(
        entry({
          familyId: "fm_a",
          memberId: "mb_4",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_other",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "step:0001",
        })
      )
    );
    const differentFamily = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(
        entry({
          familyId: "fm_b",
          memberId: "mb_5",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_base",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "step:0001",
        })
      )
    );
    expect(base).not.toBe(differentStep);
    expect(base).not.toBe(differentRule);
    expect(base).not.toBe(differentSource);
    expect(base).not.toBe(differentFamily);
  });

  it("keeps authored and symmetry identity compatibility intact", () => {
    const authored = resolveGenericFamilyMemberIdentity(
      entry({
        familyId: "fm_a",
        memberId: "mb_a",
        memberOrigin: "AUTHORED",
      })
    );
    const symmetry = resolveGenericFamilyMemberIdentity(
      entry({
        familyId: "fm_a",
        memberId: "mb_h",
        memberOrigin: "SYMMETRY",
        generatedFromMemberId: "mb_a",
        symmetryOp: "H",
      })
    );
    expect(genericFamilyMemberIdentityKey(authored)).toBe("family:fm_a|base:AUTHORED");
    expect(genericFamilyMemberIdentityKey(symmetry)).toBe("family:fm_a|sym:H");
  });

  it("preserves derived provenance through canonical normalization", () => {
    const normalized = normalizeCanonicalStrategyEntry(
      entry({
        familyId: "fm_a",
        memberId: "mb_d1",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
      })
    );
    expect(normalized.familyId).toBe("fm_a");
    expect(normalized.memberOrigin).toBe("DERIVED_CUE_IMPACT");
    expect(normalized.generatedFromMemberId).toBe("mb_base");
    expect(normalized.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");
    expect(normalized.derivedStep).toBe("step:0001");
  });
});

describe("Family position key", () => {
  it("uses track + exact balls identity and stays separate from member identity", () => {
    const same = createFamilyPositionKey("B2T_L", balls);
    const sameAgain = createFamilyPositionKey("B2T_L", balls);
    const differentTrack = createFamilyPositionKey("B2T_R", balls);
    const differentBalls = createFamilyPositionKey("B2T_L", otherBalls);
    expect(same).toBe(sameAgain);
    expect(same).not.toBe(differentTrack);
    expect(same).not.toBe(differentBalls);
  });
});
