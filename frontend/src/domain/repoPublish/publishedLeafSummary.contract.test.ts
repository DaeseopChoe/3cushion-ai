/**
 * Published 현황 — leaf summary computed from the Production-verified commit blob.
 *
 * 1  PRODUCTION_VERIFIED result carries a commit-based leaf summary
 * 2  familyCount / memberCount = committed leaf familyMasters / familyMembers lengths
 * 3  byteLength = committed blob byte size (UTF-8)
 * 4  Working tree / LocalDB / History values never feed the summary
 * 5  NO_CHANGE Publish returns the current HEAD leaf summary
 * 10 Summary failure keeps Publish successful (short error code only)
 * S  Summary carries only safe fields; client parser drops anything else
 *
 * Temp repos + fake Production fetch only. Never touches the real repo or origin.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import type { PublishOperation } from "../publishOperation";
import type { PublishFamilyPayload } from "../publishFamilyPayload";
import { publishDatasetBatchWithGit } from "./publishDatasetWithGit";
import { readCommittedPublishedLeafSummaries } from "./productionVerify";
import {
  parsePublishedLeafSummaries,
  PUBLISHED_LEAF_SUMMARY_FIELDS,
} from "./publishedLeafSummary";

const LEAF_REL = "dataset/뒤돌리기/파이브앤하프/positions.json";

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

function entry(familyId: string, memberId: string, marker: string): StrategyEntry {
  return {
    slot: "S1",
    signature: { systemId: "5_half_system", formulaHash: "h1", shotType: "뒤돌리기" },
    sysInputs: { CO_f: 40, C1_f: 10, C3_r: 20 },
    corrections: { departure: 0, spin: 0, slide: 0, draw: 0, curve_ratio: 0 },
    correctionsStored: true,
    meta: { impact: { x: 0, y: 0 }, final: { x: 0, y: 0 }, angle_ci: 0, angle_fs: 0 },
    track: "B2T_L",
    authoringStrategyId: `as_${memberId}`,
    str: { speed: 2.5 },
    hpT: { T: "-5/8", hit_point: { x: -1, y: 2 }, mode: "TIP", tipCount: 1 },
    familyId,
    memberId,
    memberOrigin: "AUTHORED",
    ai: { text: marker },
  };
}

function position(positionId: string, e: StrategyEntry, ballSet = balls): PositionRecord {
  return { positionId, balls: ballSet, strategies: { S1: e }, schemaVersion: 1 };
}

function op(destinationFamilyId: string): PublishOperation {
  return { schemaVersion: 1, intent: "CREATE", sourceFamilyId: null, destinationFamilyId };
}

function payload(familyId: string, records: PositionRecord[]): PublishFamilyPayload {
  return { schemaVersion: 1, familyId, records };
}

const ITEMS = [
  {
    snapshotId: "s_a",
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    publishOperation: op("fm_sum_a"),
    publishFamilyPayload: payload("fm_sum_a", [
      position("p_sum_a", entry("fm_sum_a", "mb_sum_a", "a")),
    ]),
  },
  {
    snapshotId: "s_b",
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    publishOperation: op("fm_sum_b"),
    publishFamilyPayload: payload("fm_sum_b", [
      position("p_sum_b", entry("fm_sum_b", "mb_sum_b", "b"), ballsAlt),
    ]),
  },
];

type Env = { root: string; work: string; datasetRoot: string };
const envs: Env[] = [];

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function makeEnv(): Env {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "leaf-sum-"));
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  fs.mkdirSync(remote);
  git(root, ["init", "--bare", remote]);
  fs.mkdirSync(work);
  git(work, ["init", "-b", "main"]);
  git(work, ["config", "user.name", "Leaf Summary Tester"]);
  git(work, ["config", "user.email", "leaf-summary@example.com"]);
  git(work, ["remote", "add", "origin", remote]);
  const datasetRoot = path.join(work, "dataset");
  const leafDir = path.join(datasetRoot, "뒤돌리기", "파이브앤하프");
  fs.mkdirSync(leafDir, { recursive: true });
  fs.writeFileSync(
    path.join(leafDir, "positions.json"),
    JSON.stringify(
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        familyMasters: [],
        familyMembers: [],
      },
      null,
      2
    ),
    "utf8"
  );
  fs.writeFileSync(path.join(work, "README.md"), "# temp\n", "utf8");
  git(work, ["add", "--", "README.md", "dataset"]);
  git(work, ["commit", "-m", "initial"]);
  git(work, ["push", "-u", "origin", "main"]);
  const env = { root, work, datasetRoot };
  envs.push(env);
  return env;
}

/** Fake Production: serves the pushed commit blob (what Vercel would deploy). */
function productionFrom(env: Env): typeof fetch {
  return (async () =>
    new Response(git(env.work, ["show", `origin/main:${LEAF_REL}`]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

const FAST_POLL = {
  initialDelayMs: 0,
  intervalMs: 20,
  overallTimeoutMs: 2_000,
  perRequestTimeoutMs: 2_000,
};

function committedLeaf(env: Env, rev = "HEAD") {
  const text = git(env.work, ["show", `${rev}:${LEAF_REL}`]);
  return {
    json: JSON.parse(text),
    blobBytes: Number(git(env.work, ["cat-file", "-s", `${rev}:${LEAF_REL}`]).trim()),
  };
}

async function publish(env: Env) {
  return publishDatasetBatchWithGit({
    repoRoot: env.work,
    datasetRoot: env.datasetRoot,
    items: ITEMS,
    productionPoll: FAST_POLL,
    productionFetchFn: productionFrom(env),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const env of envs.splice(0)) {
    try {
      fs.rmSync(env.root, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("Published leaf summary (commit blob)", { timeout: 90_000 }, () => {
  it("1/2/3 — verified Publish returns the committed leaf's counts and blob bytes", async () => {
    const env = makeEnv();
    const result = await publish(env);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("PRODUCTION_VERIFIED");
    expect(result.gitStatus).toBe("PUSHED");

    const leaf = committedLeaf(env, result.commit);
    expect(leaf.json.familyMasters.length).toBe(2);
    expect(result.leafSummaries).toEqual([
      {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        familyCount: leaf.json.familyMasters.length,
        memberCount: leaf.json.familyMembers.length,
        byteLength: leaf.blobBytes,
      },
    ]);
    expect(result.leafSummaryError).toBeUndefined();
  });

  it("4 — working tree edits, LocalDB and History never feed the summary", async () => {
    const env = makeEnv();
    const getItem = vi.fn(() => JSON.stringify({ familyMasters: new Array(99).fill({}) }));
    vi.stubGlobal("localStorage", {
      getItem,
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
    const result = await publish(env);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getItem).not.toHaveBeenCalled();

    const committed = committedLeaf(env, result.commit);
    const leafAbs = path.join(env.datasetRoot, "뒤돌리기", "파이브앤하프", "positions.json");
    const dirty = { ...committed.json, familyMasters: [], familyMembers: [] };
    fs.writeFileSync(leafAbs, JSON.stringify(dirty), "utf8");

    const read = await readCommittedPublishedLeafSummaries({
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      commitSha: result.commit!,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.summaries[0].familyCount).toBe(committed.json.familyMasters.length);
    expect(read.summaries[0].memberCount).toBe(committed.json.familyMembers.length);
    expect(read.summaries[0].byteLength).toBe(committed.blobBytes);
    expect(read.summaries[0].byteLength).not.toBe(Buffer.byteLength(JSON.stringify(dirty)));
  });

  it("5 — NO_CHANGE Publish still returns the current HEAD leaf summary", async () => {
    const env = makeEnv();
    const first = await publish(env);
    expect(first.ok).toBe(true);
    const head = git(env.work, ["rev-parse", "HEAD"]).trim();

    const second = await publish(env);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.gitStatus).toBe("VERIFIED_NO_CHANGE");
    expect(second.status).toBe("PRODUCTION_VERIFIED");
    expect(second.commit).toBe(head);
    const leaf = committedLeaf(env, head);
    expect(second.leafSummaries).toEqual([
      {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        familyCount: leaf.json.familyMasters.length,
        memberCount: leaf.json.familyMembers.length,
        byteLength: leaf.blobBytes,
      },
    ]);
  });

  it("10 — summary read failure keeps Publish PRODUCTION_VERIFIED", async () => {
    const env = makeEnv();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await publishDatasetBatchWithGit({
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: ITEMS,
      productionPoll: FAST_POLL,
      productionFetchFn: productionFrom(env),
      leafSummaryReader: async () => {
        throw new Error("blob unreadable");
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("PRODUCTION_VERIFIED");
    expect(result.leafSummaries).toBeUndefined();
    expect(typeof result.leafSummaryError).toBe("string");
    expect(result.leafSummaryError).not.toContain(env.work);
    expect(warn).toHaveBeenCalled();
  });

  it("S — summary holds only safe fields; client parser strips paths / records", async () => {
    const env = makeEnv();
    const result = await publish(env);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const s of result.leafSummaries ?? []) {
      expect(Object.keys(s).sort()).toEqual([...PUBLISHED_LEAF_SUMMARY_FIELDS].sort());
      expect(JSON.stringify(s)).not.toContain(env.work);
    }

    const parsed = parsePublishedLeafSummaries([
      {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        familyCount: 1,
        memberCount: 960,
        byteLength: 798_720,
        absolutePath: "D:/repo/dataset/x.json",
        familyMembers: [{ memberId: "m" }],
        remote: "https://example.com/x.git",
      },
    ]);
    expect(parsed).toEqual([
      {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        familyCount: 1,
        memberCount: 960,
        byteLength: 798_720,
      },
    ]);
    expect(parsePublishedLeafSummaries([{ shotType: "뒤돌리기", familyCount: -1 }])).toBeUndefined();
    expect(parsePublishedLeafSummaries("x")).toBeUndefined();
    expect(parsePublishedLeafSummaries([])).toBeUndefined();
  });
});
