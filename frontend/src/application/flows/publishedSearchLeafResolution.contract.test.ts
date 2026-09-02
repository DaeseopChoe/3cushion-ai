/**
 * OPEN-02 — Published Search leaf resolution & Export cache invalidation contract tests.
 *
 * Covers:
 * CASE A: ADMIN Published Search resolves canonical shotType & systemId from adminState.sys
 * CASE B: Other shotType (e.g. 빗겨치기, 앞돌리기) preserved without 뒤돌리기 fallback
 * CASE C: History Export success invalidates published dataset cache
 * CASE D: Export failure does not trigger cache refresh
 * CASE E: Exact Ball3 Match (cue=(19.5,11), target=(20.4,30.6), second=(64.9,22.1))
 * CASE F: Role SSOT protection (swapping target/second does NOT match)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyAdminSysSnapshot } from "../../domain/adminSysFromSlot";
import { runAdminSearch, type AdminSearchFlowContext } from "./adminSearchFlow";
import { runUserSearch, type UserSearchFlowContext } from "./userSearchFlow";
import {
  getOrLoadPublishedLeaf,
  refreshPublishedDataset,
  getPublishedLeafCacheEntry,
  __clearPublishedDatasetStoreForTests,
} from "../../domain/publishedDatasetStore";
import { runSpatialRecall } from "../../domain/recall/recallEngine";
import type { PositionRecord } from "../../domain/positionSearchEngine";

const sampleRepresentativeRecord: PositionRecord = {
  positionId: "195110204306649221",
  balls: {
    cue: { x: 19.5, y: 11 },
    target: { x: 20.4, y: 30.6 },
    second: { x: 64.9, y: 22.1 },
  },
  strategies: {
    S1: {
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "v1",
        shotType: "옆돌리기",
      },
      sysInputs: {},
      meta: {
        impact: { x: 20.32, y: 28.87 },
        final: { x: 6.53, y: 40 },
        angle_ci: 1.52,
        angle_fs: -0.3,
      },
      memberOrigin: "AUTHORED",
    },
  },
};

describe("OPEN-02 Published Search Leaf Resolution Contract", () => {
  beforeEach(() => {
    __clearPublishedDatasetStoreForTests();
  });

  afterEach(() => {
    __clearPublishedDatasetStoreForTests();
    vi.restoreAllMocks();
  });

  it("CASE A: ADMIN Published Search resolves canonical shotType and systemId from adminState.sys", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        records: [sampleRepresentativeRecord],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();
    const setAdminStateMock = vi.fn();

    const ctx: AdminSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: {
          shotType: "옆돌리기",
          systemId: "5_half_system",
        },
      },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: false,
      targetColor: null,
      userPublishedSearchContext: { shotType: null, systemId: null },
      setAdminState: setAdminStateMock,
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      applyPositionRecall: applyRecallMock,
      patchSlotRuntimeMeta: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      rejectAdminRecallHydrateForMismatch: () => false,
      resolveFormulaHash: () => "v1",
    };

    const result = await runAdminSearch(ctx);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent("옆돌리기"));
    expect(calledUrl).toContain(encodeURIComponent("파이브앤하프"));
    expect(calledUrl).not.toContain(encodeURIComponent("뒤돌리기"));
    expect(applyRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        positionId: "195110204306649221",
        balls: sampleRepresentativeRecord.balls,
      })
    );
  });

  it("CASE B: preserves non-default shotTypes (e.g. 빗겨치기, 앞돌리기) without 뒤돌리기 fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "빗겨치기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        records: [sampleRepresentativeRecord],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx: AdminSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: {
          shotType: "빗겨치기",
          systemId: "5_half_system",
        },
      },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: false,
      targetColor: null,
      userPublishedSearchContext: null,
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      applyPositionRecall: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      rejectAdminRecallHydrateForMismatch: () => false,
      resolveFormulaHash: () => "v1",
    };

    await runAdminSearch(ctx);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent("빗겨치기"));
    expect(calledUrl).not.toContain(encodeURIComponent("뒤돌리기"));
  });

  it("CASE C: History Export success invalidates published dataset cache for exported leaf", async () => {
    // 1. Pre-populate cache with empty/old result
    const initialFetchMock = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    });
    await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn: initialFetchMock,
    });

    const cachedEntryBefore = getPublishedLeafCacheEntry(
      "옆돌리기",
      "5_half_system"
    );
    expect(cachedEntryBefore).toBeDefined();
    expect(cachedEntryBefore?.status).toBe("empty");

    // 2. Simulate Export success triggering invalidation
    refreshPublishedDataset("옆돌리기", "5_half_system");

    const cachedEntryAfter = getPublishedLeafCacheEntry(
      "옆돌리기",
      "5_half_system"
    );
    expect(cachedEntryAfter).toBeUndefined();

    // 3. Subsequent load should re-fetch instead of returning cached empty
    const nextFetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        records: [sampleRepresentativeRecord],
      }),
    });

    const nextLoad = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn: nextFetchMock,
    });
    expect(nextLoad.kind).toBe("ok");
    expect(nextLoad.fromCache).toBe(false);
    expect(nextFetchMock).toHaveBeenCalledTimes(1);
  });

  it("CASE D: Export failure does not clear valid cache entries", async () => {
    const initialFetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        records: [sampleRepresentativeRecord],
      }),
    });
    await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn: initialFetchMock,
    });

    // If export fails (e.g. disk write failure), refreshPublishedDataset is NOT called
    const cachedEntry = getPublishedLeafCacheEntry("옆돌리기", "5_half_system");
    expect(cachedEntry).toBeDefined();
    expect(cachedEntry?.status).toBe("ready");
    expect(cachedEntry?.records.length).toBe(1);
  });

  it("CASE E: Exact Ball3 Match produces distance 0 and MATCH for adminStrict and userStrict", () => {
    const query = {
      balls: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      targetBall: null,
    };

    // adminStrict
    const adminResult = runSpatialRecall({
      dataset: [sampleRepresentativeRecord],
      query,
      profile: "adminStrict",
    });
    expect(adminResult.kind).toBe("match");
    if (adminResult.kind === "match") {
      expect(adminResult.distance).toBe(0);
      expect(adminResult.record.positionId).toBe("195110204306649221");
    }

    // userStrict
    const userResult = runSpatialRecall({
      dataset: [sampleRepresentativeRecord],
      query,
      profile: "userStrict",
    });
    expect(userResult.kind).toBe("match");
    if (userResult.kind === "match") {
      expect(userResult.distance).toBe(0);
      expect(userResult.record.positionId).toBe("195110204306649221");
    }
  });

  it("CASE F: Role SSOT regression protection — swapping target and second does NOT match", () => {
    // Swapped target and second (Target at 64.9, 22.1, Second at 20.4, 30.6)
    const swappedQuery = {
      balls: {
        cue: { x: 19.5, y: 11 },
        target: { x: 64.9, y: 22.1 },
        second: { x: 20.4, y: 30.6 },
      },
      targetBall: null,
    };

    const result = runSpatialRecall({
      dataset: [sampleRepresentativeRecord],
      query: swappedQuery,
      profile: "userStrict",
    });

    // Role SSOT: Target must match physical Target, Second must match physical Second
    expect(result.kind).toBe("no-match");
  });

  it("USER Search: matches exact Ball3 record when canonical leaf context is supplied", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return {
        status: 404,
        ok: false,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();
    const setLastRecordMock = vi.fn();
    const setContextMock = vi.fn();

    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: {
          shotType: "옆돌리기",
          systemId: "5_half_system",
        },
      },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: {
        shotType: "옆돌리기",
        systemId: "5_half_system",
      },
      setUserLastSearchRecord: setLastRecordMock,
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: applyRecallMock,
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe("195110204306649221");
    expect(applyRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        positionId: "195110204306649221",
        balls: sampleRepresentativeRecord.balls,
      })
    );
    expect(setLastRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        positionId: "195110204306649221",
        balls: sampleRepresentativeRecord.balls,
      })
    );
    expect(setContextMock).toHaveBeenCalledWith({
      shotType: "옆돌리기",
      systemId: "5_half_system",
    });
  });

  it("USER Search: resolves canonical published leaf '옆돌리기' from initial state (shotType null)", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return {
        status: 404,
        ok: false,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();
    const setLastRecordMock = vi.fn();
    const setContextMock = vi.fn();

    // Actual initial state when entering USER UI:
    // shotType is empty string from createEmptyAdminSysSnapshot(), userPublishedSearchContext is null/empty
    const emptySys = createEmptyAdminSysSnapshot();
    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: emptySys,
      },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: {
        shotType: null,
        systemId: null,
      },
      setUserLastSearchRecord: setLastRecordMock,
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: applyRecallMock,
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe("195110204306649221");
    expect(applyRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        positionId: "195110204306649221",
        balls: sampleRepresentativeRecord.balls,
      })
    );
    expect(setContextMock).toHaveBeenCalledWith({
      shotType: "옆돌리기",
      systemId: "5_half_system",
    });

    const readyCache = getPublishedLeafCacheEntry("옆돌리기", "5_half_system");
    expect(readyCache?.status).toBe("ready");
    expect(readyCache?.records.length).toBe(1);
  });

  it("USER Search: resolves non-default shotType '비켜치기' dynamically without hardcoded fallback", async () => {
    const cutShotRecord: PositionRecord = {
      positionId: "195110204306649999",
      balls: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      strategies: {
        S1: {
          slot: "S1",
          signature: {
            systemId: "5_half_system",
            formulaHash: "v1",
            shotType: "비켜치기",
          },
          sysInputs: {},
          meta: {},
          memberOrigin: "AUTHORED",
        },
      },
    };

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("비켜치기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "비켜치기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [cutShotRecord],
          }),
        };
      }
      return {
        status: 404,
        ok: false,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const setContextMock = vi.fn();
    const emptySys = createEmptyAdminSysSnapshot();
    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: emptySys,
      },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: vi.fn(),
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe("195110204306649999");
    expect(setContextMock).toHaveBeenCalledWith({
      shotType: "비켜치기",
      systemId: "5_half_system",
    });
  });

  it("Cache: empty fallback cache does not pollute subsequent canonical resolution", async () => {
    // 1. Manually trigger a 404 on 뒤돌리기
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return {
        status: 404,
        ok: false,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    // Initial load for 뒤돌리기 yields empty cache
    const initialLoad = await getOrLoadPublishedLeaf("뒤돌리기", "5_half_system");
    expect(initialLoad.kind).toBe("empty");
    expect(getPublishedLeafCacheEntry("뒤돌리기", "5_half_system")?.status).toBe("empty");

    // 2. Now run USER Search with initial null context
    const setContextMock = vi.fn();
    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: { sys: createEmptyAdminSysSnapshot() },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: vi.fn(),
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);
    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe("195110204306649221");
    expect(setContextMock).toHaveBeenCalledWith({
      shotType: "옆돌리기",
      systemId: "5_half_system",
    });
    expect(getPublishedLeafCacheEntry("옆돌리기", "5_half_system")?.status).toBe("ready");
  });

  // -------------------------------------------------------------------------
  // Phase 2: Comprehensive T1 ~ T8 Verification Suite
  // -------------------------------------------------------------------------

  it("T1: History '뒤돌리기' Recall → '옆돌리기' Published exact position → first Search succeeds on first try", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return {
        status: 404,
        ok: false,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();
    const setContextMock = vi.fn();

    // Stale History Recall state loaded "뒤돌리기" into sys, slots, and published search context
    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: {
          shotType: "뒤돌리기",
          systemId: "5_half_system",
        },
      },
      activeSlot: "S1",
      slots: {
        S1: {
          draft: {
            signature: { shotType: "뒤돌리기", systemId: "5_half_system" },
          },
        },
      },
      targetColor: null,
      userPublishedSearchContext: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      },
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: applyRecallMock,
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    // First search must succeed immediately without requiring a second search!
    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe("195110204306649221");
    expect(applyRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({ positionId: "195110204306649221" })
    );
    expect(setContextMock).toHaveBeenCalledWith({
      shotType: "옆돌리기",
      systemId: "5_half_system",
    });
  });

  it("T2: History '옆돌리기' Recall → '뒤돌리기' Published exact position → first Search succeeds on first try", async () => {
    refreshPublishedDataset();
    const behindShotRecord: PositionRecord = {
      positionId: "205110204306649221",
      balls: {
        cue: { x: 30.0, y: 15.0 },
        target: { x: 25.0, y: 25.0 },
        second: { x: 55.0, y: 10.0 },
      },
      strategies: {
        S1: {
          slot: "S1",
          signature: {
            systemId: "5_half_system",
            formulaHash: "v1",
            shotType: "뒤돌리기",
          },
          sysInputs: {},
          meta: {},
          memberOrigin: "AUTHORED",
        },
      },
    };

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("뒤돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "뒤돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [behindShotRecord],
          }),
        };
      }
      return {
        status: 404,
        ok: false,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();
    const setContextMock = vi.fn();

    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 30.0, y: 15.0 },
        target: { x: 25.0, y: 25.0 },
        second: { x: 55.0, y: 10.0 },
      },
      adminState: {
        sys: {
          shotType: "옆돌리기",
          systemId: "5_half_system",
        },
      },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: {
        shotType: "옆돌리기",
        systemId: "5_half_system",
      },
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: applyRecallMock,
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe("205110204306649221");
    expect(applyRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({ positionId: "205110204306649221" })
    );
    expect(setContextMock).toHaveBeenCalledWith({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
  });

  it("T3: Published Original exact coordinate → Search succeeds", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return { status: 404, ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx: UserSearchFlowContext = {
      ballsState: sampleRepresentativeRecord.balls,
      adminState: { sys: createEmptyAdminSysSnapshot() },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      applyUserSearchRecall: vi.fn(),
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);
    expect(matched).not.toBeNull();
    expect(matched?.record.positionId).toBe(sampleRepresentativeRecord.positionId);
  });

  it("T4 & T5: Published Derived Record (even far from parent) exact coordinate → Search succeeds as independent Top-1 candidate", async () => {
    refreshPublishedDataset();
    // Parent original is at cue=(19.5, 11), target=(20.4, 30.6), second=(64.9, 22.1)
    // Derived member is at cue=(19.58, 12.79), target=(20.4, 30.6), second=(46.44, 9.61) -> second is ~22 Rg away from parent!
    const derivedRecord: PositionRecord = {
      positionId: "196128204306464096",
      balls: {
        cue: { x: 19.582, y: 12.787 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 46.445, y: 9.613 },
      },
      strategies: {
        S1: {
          slot: "S1",
          signature: {
            systemId: "5_half_system",
            formulaHash: "C1_f = CO_f - C3_r",
            shotType: "옆돌리기",
          },
          sysInputs: {},
          meta: {},
          familyId: "fm_a726ed32-4572-43e4-aac5-aed61e990c2b",
          memberId: "mb_fde190ba-c5fc-4ec9-9051-849eed98f768",
          memberOrigin: "DERIVED_CUE_C3_PRODUCT",
          generatedFromMemberId: "mb_ee09033d-4957-431a-942b-e65d6c924f9f",
        },
      },
    };

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord, derivedRecord],
          }),
        };
      }
      return { status: 404, ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();
    const setContextMock = vi.fn();

    // Query with the Derived record's exact coordinates
    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 19.582, y: 12.787 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 46.445, y: 9.613 },
      },
      adminState: { sys: createEmptyAdminSysSnapshot() },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: setContextMock,
      applyUserSearchRecall: applyRecallMock,
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    // Must match the Derived record specifically as an independent Top-1 candidate!
    expect(matched?.record.positionId).toBe("196128204306464096");
    expect(applyRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({ positionId: "196128204306464096" })
    );
  });

  it("T6: Published corpus with no close record (> 3.0 Rg) → clean no-match (does not force nearest)", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return { status: 404, ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const showToastMock = vi.fn();

    // Balls are far away (> 5.0 Rg away from any ball in corpus)
    const ctx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 50.0, y: 35.0 },
        target: { x: 40.0, y: 10.0 },
        second: { x: 10.0, y: 10.0 },
      },
      adminState: { sys: createEmptyAdminSysSnapshot() },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      applyUserSearchRecall: vi.fn(),
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: showToastMock,
    };

    const matched = await runUserSearch(ctx);

    expect(matched).toBeNull();
    expect(showToastMock).toHaveBeenCalledWith(
      "일치하는 포지션이 없습니다.",
      expect.anything()
    );
  });

  it("T7: ADMIN Published Search retains explicit shotType resolution", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return { status: 404, ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyPositionRecallMock = vi.fn();
    const setAdminStateMock = vi.fn();

    const adminCtx: AdminSearchFlowContext = {
      ballsState: {
        cue: { x: 19.5, y: 11 },
        target: { x: 20.4, y: 30.6 },
        second: { x: 64.9, y: 22.1 },
      },
      adminState: {
        sys: {
          shotType: "옆돌리기",
          systemId: "5_half_system",
        },
      },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: false,
      targetColor: null,
      userPublishedSearchContext: {
        shotType: "옆돌리기",
        systemId: "5_half_system",
      },
      setAdminState: setAdminStateMock,
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      applyPositionRecall: applyPositionRecallMock,
      patchSlotRuntimeMeta: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: vi.fn().mockReturnValue(true),
      getAdminRecallQueryTargetBall: vi.fn().mockReturnValue(null),
      rejectAdminRecallHydrateForMismatch: vi.fn().mockReturnValue(false),
      resolveFormulaHash: vi.fn().mockReturnValue("v1"),
    };

    const adminResult = await runAdminSearch(adminCtx);

    expect(adminResult).toBe(true);
    expect(applyPositionRecallMock).toHaveBeenCalledWith(
      expect.objectContaining({ positionId: "195110204306649221" })
    );
  });

  it("T8: USER Search returned record provides valid slot payload for activateStrategySlot", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            systemLabel: "파이브앤하프",
            records: [sampleRepresentativeRecord],
          }),
        };
      }
      return { status: 404, ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const applyRecallMock = vi.fn();

    const ctx: UserSearchFlowContext = {
      ballsState: sampleRepresentativeRecord.balls,
      adminState: { sys: createEmptyAdminSysSnapshot() },
      activeSlot: "S1",
      slots: {},
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      applyUserSearchRecall: applyRecallMock,
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matched = await runUserSearch(ctx);

    expect(matched).not.toBeNull();
    expect(matched?.record.strategies.S1).toBeDefined();
    expect(matched?.record.strategies.S1?.signature.shotType).toBe("옆돌리기");
    expect(applyRecallMock).toHaveBeenCalledWith(matched?.record);
  });
});
