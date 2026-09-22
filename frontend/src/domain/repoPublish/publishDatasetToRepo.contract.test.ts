/**
 * Phase 4-A — Repo-relative local publisher contracts (temp fake repo).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatasetExportPayload } from "../datasetExport";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import type { PublishOperation } from "../publishOperation";
import type { PublishFamilyPayload } from "../publishFamilyPayload";
import { resolvePublishedLeafAbsolutePath } from "./resolveRepoLeafPath";
import { writeVerifiedPublishedLeafFs } from "./writeVerifiedPublishedLeafFs";
import {
  handleLocalPublishHttpBody,
  publishDatasetBatchToRepo,
  publishDatasetLeafToRepo,
  rejectClientPathOrCommandFields,
} from "./publishDatasetToRepo";
import {
  LOCAL_PUBLISH_ENDPOINT,
  publishDatasetToLocalRepo,
} from "./publishDatasetToLocalRepo";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};
const ballsAlt = {
  cue: { x: 12, y: 12 },
  target: { x: 52, y: 27 },
  second: { x: 42, y: 22 },
};

let seq = 0;
function mb(): string {
  seq += 1;
  return `mb_p4a_${seq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId?: string;
    memberId?: string;
    marker?: string;
    sysValue?: number;
    track?: string;
  } = {}
): StrategyEntry {
  const e: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: opts.sysValue ?? 40, C1_f: 10, C3_r: 20 },
    corrections: {
      departure: 0,
      spin: 0,
      slide: 0,
      draw: 0,
      curve_ratio: 0,
    },
    correctionsStored: true,
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
    track: opts.track ?? "B2T_L",
    authoringStrategyId: `as_${opts.memberId ?? mb()}`,
    str: { speed: 2.5 },
    hpT: {
      T: "-5/8",
      hit_point: { x: -1, y: 2 },
      mode: "TIP",
      tipCount: 1,
    },
  };
  if (opts.familyId) {
    e.familyId = opts.familyId;
    e.memberId = opts.memberId ?? mb();
    e.memberOrigin = "AUTHORED";
  }
  if (opts.marker) e.ai = { text: opts.marker };
  return e;
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>,
  ballSet = balls
): PositionRecord {
  return {
    positionId,
    balls: ballSet,
    strategies: slots,
    schemaVersion: 1,
  };
}

function op(
  intent: "CREATE" | "UPDATE",
  destinationFamilyId: string,
  sourceFamilyId: string | null = intent === "UPDATE" ? destinationFamilyId : null
): PublishOperation {
  return {
    schemaVersion: 1,
    intent,
    sourceFamilyId,
    destinationFamilyId,
  };
}

function familyPayload(
  familyId: string,
  records: PositionRecord[]
): PublishFamilyPayload {
  return { schemaVersion: 1, familyId, records };
}

function envelope(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-17T00:00:00.000Z",
    records,
  };
}

function markers(records: PositionRecord[], familyId: string): string[] {
  const out: string[] = [];
  for (const rec of records) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const e = rec.strategies[slot];
      if (!e || e.familyId !== familyId) continue;
      out.push(e.ai?.text ?? `${rec.positionId}:${slot}`);
    }
  }
  return out.sort();
}

/** Read markers from on-disk leaf (v2 records or v3 Master.ai). */
function markersFromDisk(disk: Record<string, unknown>, familyId: string): string[] {
  if (Array.isArray(disk.records)) {
    return markers(disk.records as PositionRecord[], familyId);
  }
  const masters = disk.familyMasters as Array<{ familyId?: string; ai?: { text?: string } }> | undefined;
  if (!Array.isArray(masters)) return [];
  const m = masters.find((x) => x.familyId === familyId);
  if (!m?.ai?.text) return [];
  return [m.ai.text];
}

let tempRoots: string[] = [];

function makeTempDatasetRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4a-dataset-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  tempRoots = [];
  vi.unstubAllGlobals();
});

describe("resolveRepoLeafPath", () => {
  it("H1/H19 — valid identity resolves under Korean Unicode leaf", () => {
    const root = makeTempDatasetRoot();
    const r = resolvePublishedLeafAbsolutePath(root, "뒤돌리기", "5_half_system");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.relativePosix).toBe("뒤돌리기/파이브앤하프/positions.json");
    expect(r.absolutePath.startsWith(root)).toBe(true);
  });

  it("H2/H3 — absolute path and traversal rejected", () => {
    const root = makeTempDatasetRoot();
    expect(
      resolvePublishedLeafAbsolutePath(root, "D:\\evil", "5_half_system").ok
    ).toBe(false);
    expect(
      resolvePublishedLeafAbsolutePath(root, "../etc", "5_half_system").ok
    ).toBe(false);
    expect(
      resolvePublishedLeafAbsolutePath(root, "뒤돌리기/../x", "5_half_system").ok
    ).toBe(false);
  });

  it("H4 — empty identity rejected", () => {
    const root = makeTempDatasetRoot();
    expect(resolvePublishedLeafAbsolutePath(root, "", "5_half_system").ok).toBe(
      false
    );
  });
});

describe("publishDatasetLeafToRepo", () => {
  it("H5 — operation/payload mismatch rejected", () => {
    const root = makeTempDatasetRoot();
    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_b", [
          position("p1", { S1: entry("S1", { familyId: "fm_b" }) }),
        ]),
      },
    });
    expect(r.ok).toBe(false);
  });

  it("H6 — malformed payload rejected", () => {
    const root = makeTempDatasetRoot();
    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: {
          schemaVersion: 1,
          familyId: "fm_a",
          records: [],
        },
      },
    });
    expect(r.ok).toBe(false);
  });

  it("H7 — existing invalid JSON blocks", () => {
    const root = makeTempDatasetRoot();
    const resolved = resolvePublishedLeafAbsolutePath(
      root,
      "뒤돌리기",
      "5_half_system"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(resolved.absolutePath, "{not-json", "utf8");
    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", {
            S1: entry("S1", { familyId: "fm_a", marker: "new" }),
          }),
        ]),
      },
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/existing-leaf/);
  });

  it("H8 — existing validation fail blocks", () => {
    const root = makeTempDatasetRoot();
    const resolved = resolvePublishedLeafAbsolutePath(
      root,
      "뒤돌리기",
      "5_half_system"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(
      resolved.absolutePath,
      JSON.stringify({ schemaVersion: 2, shotType: "뒤돌리기", systemId: "5_half_system", records: "bad" }),
      "utf8"
    );
    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", {
            S1: entry("S1", { familyId: "fm_a", marker: "new" }),
          }),
        ]),
      },
    });
    expect(r.ok).toBe(false);
  });

  it("H9/H14/H18 — CREATE append + read-back + no command metadata", () => {
    const root = makeTempDatasetRoot();
    // Seed unrelated family
    const resolved = resolvePublishedLeafAbsolutePath(
      root,
      "뒤돌리기",
      "5_half_system"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(
      resolved.absolutePath,
      JSON.stringify(
        envelope([
          position("keep", {
            S1: entry("S1", { familyId: "fm_keep", marker: "keep" }),
          }, ballsAlt),
        ]),
        null,
        2
      ),
      "utf8"
    );

    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", {
            S1: entry("S1", { familyId: "fm_a", marker: "created" }),
          }),
        ]),
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("REPO_WRITTEN");
    const disk = JSON.parse(fs.readFileSync(resolved.absolutePath, "utf8"));
    expect(disk.schemaVersion).toBe(3);
    expect(disk.publishOperation).toBeUndefined();
    expect(disk.publishFamilyPayload).toBeUndefined();
    expect(disk.sourceFamilyId).toBeUndefined();
    expect(Array.isArray(disk.familyMasters)).toBe(true);
    expect(Array.isArray(disk.familyMembers)).toBe(true);
    expect(markersFromDisk(disk, "fm_a")).toEqual(["created"]);
    expect(markersFromDisk(disk, "fm_keep")).toEqual(["keep"]);
  });

  it("H10/H12/H13 — UPDATE replaces family; unrelated slot preserved", () => {
    const root = makeTempDatasetRoot();
    const resolved = resolvePublishedLeafAbsolutePath(
      root,
      "뒤돌리기",
      "5_half_system"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    fs.writeFileSync(
      resolved.absolutePath,
      JSON.stringify(
        envelope([
          position("p_multi", {
            S1: entry("S1", { familyId: "fm_a", marker: "old-a" }),
            S2: entry("S2", { familyId: "fm_b", marker: "keep-b" }),
          }),
        ]),
        null,
        2
      ),
      "utf8"
    );

    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("UPDATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p_multi", {
            S1: entry("S1", { familyId: "fm_a", marker: "new-a" }),
          }),
        ]),
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const disk = JSON.parse(fs.readFileSync(resolved.absolutePath, "utf8"));
    expect(disk.schemaVersion).toBe(3);
    expect(markersFromDisk(disk, "fm_a")).toEqual(["new-a"]);
    expect(markersFromDisk(disk, "fm_b")).toEqual(["keep-b"]);
  });

  it("H11 — CREATE retry idempotent replace", () => {
    const root = makeTempDatasetRoot();
    const first = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", {
            S1: entry("S1", { familyId: "fm_a", marker: "v1" }),
          }),
        ]),
      },
    });
    expect(first.ok).toBe(true);
    const second = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", {
            S1: entry("S1", { familyId: "fm_a", marker: "v2" }),
          }),
        ]),
      },
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const resolved = resolvePublishedLeafAbsolutePath(
      root,
      "뒤돌리기",
      "5_half_system"
    );
    if (!resolved.ok) return;
    const disk = JSON.parse(fs.readFileSync(resolved.absolutePath, "utf8"));
    expect(disk.schemaVersion).toBe(3);
    expect(markersFromDisk(disk, "fm_a")).toEqual(["v2"]);
  });

  it("H15/H16 — write verify restore path exists on adapter", () => {
    const root = makeTempDatasetRoot();
    const target = path.join(root, "뒤돌리기", "파이브앤하프", "positions.json");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const original = JSON.stringify(
      envelope([
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "orig" }),
        }),
      ]),
      null,
      2
    );
    fs.writeFileSync(target, original, "utf8");

    // Invalid normalized candidate — pre-write validation fails; original untouched.
    const broken = {
      schemaVersion: 3,
      shotType: "",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      familyMasters: [],
      familyMembers: [],
    };
    const wr = writeVerifiedPublishedLeafFs({
      absoluteTargetPath: target,
      candidate: broken as never,
      originalText: original,
      revalidate: true,
    });
    expect(wr.ok).toBe(false);
    expect(fs.readFileSync(target, "utf8")).toBe(original);
  });

  it("H17 — no-change verified success", () => {
    const root = makeTempDatasetRoot();
    const payload = familyPayload("fm_a", [
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "same", memberId: "mb_same" }),
      }),
    ]);
    const first = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: payload,
      },
    });
    expect(first.ok).toBe(true);
    const second = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: payload,
      },
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.status).toBe("NO_CHANGE");
    expect(second.changed).toBe(false);
  });
});

describe("HTTP body + client", () => {
  it("rejects forbidden client path fields", () => {
    expect(
      rejectClientPathOrCommandFields({
        path: "D:\\x",
        shotType: "뒤돌리기",
      })
    ).toContain("forbidden-field:path");
  });

  it("H20 / handleLocalPublishHttpBody — forbidden path blocked", () => {
    const root = makeTempDatasetRoot();
    const handled = handleLocalPublishHttpBody({
      datasetRoot: root,
      body: {
        path: "D:\\hack",
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", { S1: entry("S1", { familyId: "fm_a" }) }),
        ]),
      },
    });
    expect(handled.statusCode).toBe(400);
    expect(handled.body.reason).toBe("forbidden-client-fields");
  });

  it("C1/C2 — client payload shape has no paths; uses endpoint", async () => {
    expect(LOCAL_PUBLISH_ENDPOINT).toBe("/api/publish-dataset");
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
    });
    let capturedBody: unknown = null;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}"));
      return {
        status: 200,
        json: async () => ({
          ok: true,
          results: [
            {
              ok: true,
              snapshotId: "s1",
              status: "REPO_WRITTEN",
              changed: true,
            },
          ],
        }),
      } as Response;
    });
    const r = await publishDatasetToLocalRepo(
      [
        {
          snapshotId: "s1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", { S1: entry("S1", { familyId: "fm_a" }) }),
          ]),
        },
      ],
      fetchFn as unknown as typeof fetch
    );
    expect(r.ok).toBe(true);
    expect(capturedBody).toEqual({
      items: [
        expect.objectContaining({
          snapshotId: "s1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: expect.any(Object),
          publishFamilyPayload: expect.any(Object),
        }),
      ],
    });
    expect(JSON.stringify(capturedBody)).not.toContain("absolutePath");
    expect(JSON.stringify(capturedBody)).not.toMatch(/D:\\\\/);
  });

  it("C3 — host unavailable does not invent picker", async () => {
    vi.stubGlobal("window", {
      location: { hostname: "example.com" },
    });
    const r = await publishDatasetToLocalRepo([
      {
        snapshotId: "s1",
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: familyPayload("fm_a", [
          position("p1", { S1: entry("S1", { familyId: "fm_a" }) }),
        ]),
      },
    ]);
    expect(r.ok).toBe(false);
    expect(r.hostAvailable).toBe(false);
    expect(r.reason).toBe("LOCAL_PUBLISH_HOST_UNAVAILABLE");
  });
});

describe("multi-snapshot", () => {
  it("M1/M2 — same leaf two families sequential", () => {
    const root = makeTempDatasetRoot();
    const results = publishDatasetBatchToRepo({
      datasetRoot: root,
      items: [
        {
          snapshotId: "a",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", {
              S1: entry("S1", { familyId: "fm_a", marker: "a" }),
            }),
          ]),
        },
        {
          snapshotId: "b",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_b"),
          publishFamilyPayload: familyPayload("fm_b", [
            position("p2", {
              S1: entry("S1", { familyId: "fm_b", marker: "b" }),
            }, ballsAlt),
          ]),
        },
      ],
    });
    expect(results.every((r) => r.ok)).toBe(true);
    const resolved = resolvePublishedLeafAbsolutePath(
      root,
      "뒤돌리기",
      "5_half_system"
    );
    if (!resolved.ok) return;
    const disk = JSON.parse(fs.readFileSync(resolved.absolutePath, "utf8"));
    expect(disk.schemaVersion).toBe(3);
    expect(markersFromDisk(disk, "fm_a")).toEqual(["a"]);
    expect(markersFromDisk(disk, "fm_b")).toEqual(["b"]);
  });

  it("M3 — different leaves", () => {
    const root = makeTempDatasetRoot();
    const results = publishDatasetBatchToRepo({
      datasetRoot: root,
      items: [
        {
          snapshotId: "a",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", {
              S1: entry("S1", { familyId: "fm_a", marker: "back" }),
            }),
          ]),
        },
        {
          snapshotId: "b",
          shotType: "옆돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_b"),
          publishFamilyPayload: familyPayload("fm_b", [
            position("p2", {
              S1: {
                ...entry("S1", { familyId: "fm_b", marker: "side" }),
                signature: {
                  systemId: "5_half_system",
                  formulaHash: "h1",
                  shotType: "옆돌리기",
                },
              },
            }, ballsAlt),
          ]),
        },
      ],
    });
    expect(results.every((r) => r.ok)).toBe(true);
    const a = resolvePublishedLeafAbsolutePath(root, "뒤돌리기", "5_half_system");
    const b = resolvePublishedLeafAbsolutePath(root, "옆돌리기", "5_half_system");
    expect(a.ok && fs.existsSync(a.absolutePath)).toBe(true);
    expect(b.ok && fs.existsSync(b.absolutePath)).toBe(true);
  });

  it("M4 — partial failure marks later same-leaf blocked", () => {
    const root = makeTempDatasetRoot();
    const results = publishDatasetBatchToRepo({
      datasetRoot: root,
      items: [
        {
          snapshotId: "bad",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: {
            schemaVersion: 1,
            familyId: "fm_a",
            records: [],
          },
        },
        {
          snapshotId: "later",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_b"),
          publishFamilyPayload: familyPayload("fm_b", [
            position("p2", {
              S1: entry("S1", { familyId: "fm_b", marker: "b" }),
            }, ballsAlt),
          ]),
        },
      ],
    });
    expect(results[0].ok).toBe(false);
    expect(results[1].ok).toBe(false);
    if (results[1].ok === false) {
      expect(results[1].reason).toBe("same-leaf-prior-failure");
    }
  });
});

describe("wiring", () => {
  it("useSettings has Publish path without auto picker fallback", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../hooks/useSettings.js"), "utf8");
    expect(src).toContain("handlePublishSnapshots");
    expect(src).toContain("publishDatasetToLocalRepo");
    expect(src).toContain("LOCAL_PUBLISH_HOST_UNAVAILABLE");
    expect(src).toContain("c2-payload-required");
  });

  it("vite registers dev-only publish middleware", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../../vite.config.js"), "utf8");
    expect(src).toContain("publishDatasetApiDevMiddleware");
    expect(src).toContain("/api/publish-dataset");
    expect(src).toContain("configureServer");
    expect(src).not.toMatch(/closeBundle[\s\S]*publish-dataset/);
  });

  it("WorkspaceHistoryModal exposes Publish + 수동 Export in separate groups", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "../../components/WorkspaceHistoryModal.jsx"),
      "utf8"
    );
    expect(src).toContain("onPublish");
    expect(src).toContain("Publish");
    expect(src).toContain("수동 Export");
    expect(src).toContain("workspace-history-actions-left");
    expect(src).toContain("workspace-history-actions-right");
    // Standalone English Export label must not be the button text
    expect(src).not.toMatch(/>\s*Export\s*</);
    // Manual Export sits with Close (right group), not beside Publish
    const leftIdx = src.indexOf("workspace-history-actions-left");
    const rightIdx = src.indexOf("workspace-history-actions-right");
    const publishInLeft = src.indexOf("Publish", leftIdx);
    const manualInRight = src.indexOf("수동 Export", rightIdx);
    expect(leftIdx).toBeGreaterThan(-1);
    expect(rightIdx).toBeGreaterThan(leftIdx);
    expect(publishInLeft).toBeGreaterThan(leftIdx);
    expect(publishInLeft).toBeLessThan(rightIdx);
    expect(manualInRight).toBeGreaterThan(rightIdx);
  });
});
