/**
 * Publish from the D History (temp Git repo + fake Production).
 *
 * C17 APPROVED D snapshot → Git commit/push → Production read-back verified
 * C18 success marks only the D History PUBLISHED (browser storage never read)
 * C19 deleting the PUBLISHED History keeps the Published dataset
 * I6  Publish failure keeps the APPROVED graph for retry
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publishDatasetBatchWithGit } from "../repoPublish/publishDatasetWithGit";
import { loadPublishItemsFromWorkHistory } from "./workHistoryPublishInput";
import {
  buildSampleWork,
  createInProcessWorkHistoryApi,
  makeTempRepoRoot,
  removeTempRepoRoots,
  SAMPLE_STATE,
} from "./workHistoryTestFixtures";

const LEAF_REL = "dataset/뒤돌리기/파이브앤하프/positions.json";
const sample = buildSampleWork("fm_pub_sample", "mb_pub_sample");

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function makeRepo() {
  const root = makeTempRepoRoot("work-history-pub-");
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  fs.mkdirSync(remote);
  git(root, ["init", "--bare", remote]);
  fs.mkdirSync(work);
  git(work, ["init", "-b", "main"]);
  git(work, ["config", "user.name", "Work History Tester"]);
  git(work, ["config", "user.email", "work-history@example.com"]);
  git(work, ["remote", "add", "origin", remote]);
  fs.writeFileSync(path.join(work, ".gitignore"), ".workspace-data/\n", "utf8");
  const datasetRoot = path.join(work, "dataset");
  const leafDir = path.join(datasetRoot, "뒤돌리기", "파이브앤하프");
  fs.mkdirSync(leafDir, { recursive: true });
  fs.writeFileSync(
    path.join(leafDir, "positions.json"),
    JSON.stringify({
      schemaVersion: 3,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      familyMasters: [],
      familyMembers: [],
    }),
    "utf8"
  );
  git(work, ["add", "--", ".gitignore", "dataset"]);
  git(work, ["commit", "-m", "initial"]);
  git(work, ["push", "-u", "origin", "main"]);
  return { work, datasetRoot };
}

function production(work: string, broken = false): typeof fetch {
  return (async () =>
    broken
      ? new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
      : new Response(git(work, ["show", `origin/main:${LEAF_REL}`]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch;
}

const FAST_POLL = { initialDelayMs: 0, intervalMs: 20, overallTimeoutMs: 1_500, perRequestTimeoutMs: 1_500 };

afterEach(() => {
  vi.unstubAllGlobals();
  removeTempRepoRoots();
});

async function approvedSnapshot(repoRoot: string) {
  const api = createInProcessWorkHistoryApi(repoRoot);
  const created = await api.createPending({
    state: SAMPLE_STATE,
    publishOperation: sample.publishOperation,
    pendingFamilyGraph: sample.pendingGraph,
    authoredPathNodes: [],
    shotType: "뒤돌리기",
    systemId: "5_half_system",
  });
  if (!created.ok) throw new Error(created.code);
  const approved = await api.approve({ snapshotId: created.entry.snapshotId, graph: sample.approvedGraph });
  if (!approved.ok) throw new Error(approved.code);
  return { api, snapshotId: created.entry.snapshotId };
}

describe("Publish from the D History", { timeout: 90_000 }, () => {
  it("C17/C18/C19 — verified Publish → PUBLISHED in D History only; delete keeps Published", async () => {
    const { work, datasetRoot } = makeRepo();
    const getItem = vi.fn(() => null);
    vi.stubGlobal("localStorage", { getItem, setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() });
    const { api, snapshotId } = await approvedSnapshot(work);

    const input = await loadPublishItemsFromWorkHistory({ api, ids: [snapshotId] });
    expect(input.ok).toBe(true);
    if (!input.ok) return;
    expect(input.items).toHaveLength(1);

    const result = await publishDatasetBatchWithGit({
      repoRoot: work,
      datasetRoot,
      items: input.items,
      productionPoll: FAST_POLL,
      productionFetchFn: production(work),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("PRODUCTION_VERIFIED");
    expect(result.gitStatus).toBe("PUSHED");

    const marked = await api.markPublished({ snapshotIds: [snapshotId], commit: result.commit ?? null });
    expect(marked.ok).toBe(true);
    const read = await api.read(snapshotId);
    expect(read.ok && read.entry.status).toBe("PUBLISHED");
    expect(getItem).not.toHaveBeenCalled();

    // .workspace-data never enters Git.
    expect(git(work, ["ls-files"]).split("\n").some((f) => f.startsWith(".workspace-data"))).toBe(false);
    expect(git(work, ["status", "--porcelain"]).trim()).toBe("");

    const leafBefore = git(work, ["show", `origin/main:${LEAF_REL}`]);
    expect(leafBefore).toContain(sample.familyId);
    const removed = await api.remove({ snapshotIds: [snapshotId] });
    expect(removed.ok).toBe(true);
    expect(git(work, ["show", `origin/main:${LEAF_REL}`])).toBe(leafBefore);
    expect(fs.readFileSync(path.join(work, LEAF_REL), "utf8")).toContain(sample.familyId);
  });

  it("I6 — Production verify failure keeps the snapshot APPROVED with the same graph", async () => {
    const { work, datasetRoot } = makeRepo();
    const { api, snapshotId } = await approvedSnapshot(work);
    const before = await api.read(snapshotId);
    const input = await loadPublishItemsFromWorkHistory({ api, ids: [snapshotId] });
    if (!input.ok) throw new Error("input");
    const result = await publishDatasetBatchWithGit({
      repoRoot: work,
      datasetRoot,
      items: input.items,
      productionPoll: FAST_POLL,
      productionFetchFn: production(work, true),
    });
    expect(result.ok && result.status === "PRODUCTION_VERIFIED").toBe(false);
    const after = await api.read(snapshotId);
    expect(after.ok && after.entry.status).toBe("APPROVED");
    if (before.ok && after.ok) {
      expect(after.snapshot.publishFamilyGraph).toEqual(before.snapshot.publishFamilyGraph);
    }
  });
});
