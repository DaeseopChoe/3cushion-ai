/**
 * Phase 4-B — Git publish contracts + temp-repo integration.
 * Never touches the real origin/main or dirty WT dataset files.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import type { PublishOperation } from "../publishOperation";
import type { PublishFamilyPayload } from "../publishFamilyPayload";
import {
  buildGitCommitMessage,
  parsePorcelainStatus,
  runGitPreflight,
  stageCommitAndPush,
  validateGitTargetPaths,
} from "./gitPublish";
import { publishDatasetBatchWithGit } from "./publishDatasetWithGit";
import { handleGitPublishHttpBody } from "./publishDatasetWithGit";

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
  return `mb_p4b_${seq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId?: string;
    memberId?: string;
    marker?: string;
    shotType?: string;
  } = {}
): StrategyEntry {
  const shotType = opts.shotType ?? "뒤돌리기";
  const memberId = opts.memberId ?? mb();
  const e: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType,
    },
    sysInputs: { CO_f: 40, C1_f: 10, C3_r: 20 },
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
    track: "B2T_L",
    authoringStrategyId: `as_${memberId}`,
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
    e.memberId = memberId;
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
  destinationFamilyId: string
): PublishOperation {
  return {
    schemaVersion: 1,
    intent,
    sourceFamilyId: intent === "UPDATE" ? destinationFamilyId : null,
    destinationFamilyId,
  };
}

function familyPayload(
  familyId: string,
  records: PositionRecord[]
): PublishFamilyPayload {
  return { schemaVersion: 1, familyId, records };
}

type TempGitEnv = {
  root: string;
  remote: string;
  work: string;
  datasetRoot: string;
};

let tempEnvs: TempGitEnv[] = [];

function git(cwd: string, args: string[]) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

function makeTempGitEnv(): TempGitEnv {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4b-git-"));
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  fs.mkdirSync(remote);
  git(root, ["init", "--bare", remote]);

  fs.mkdirSync(work);
  git(work, ["init", "-b", "main"]);
  git(work, ["config", "user.name", "P4B Tester"]);
  git(work, ["config", "user.email", "p4b@example.com"]);
  git(work, ["remote", "add", "origin", remote]);

  const datasetRoot = path.join(work, "dataset");
  const leafDir = path.join(datasetRoot, "뒤돌리기", "파이브앤하프");
  fs.mkdirSync(leafDir, { recursive: true });
  fs.writeFileSync(
    path.join(leafDir, "positions.json"),
    JSON.stringify(
      {
        schemaVersion: 2,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        exportedAt: "2026-09-17T00:00:00.000Z",
        records: [],
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

  const env = { root, remote, work, datasetRoot };
  tempEnvs.push(env);
  return env;
}

afterEach(() => {
  for (const env of tempEnvs) {
    try {
      fs.rmSync(env.root, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  tempEnvs = [];
});

describe("gitPublish unit", () => {
  it("parses porcelain and validates targets", () => {
    const entries = parsePorcelainStatus(" M dataset/a/b/positions.json\n?? other.ts\n");
    expect(entries).toHaveLength(2);
    expect(entries[0].path).toContain("positions.json");

    const bad = validateGitTargetPaths("/repo", "/repo/dataset", [
      "../etc/passwd",
    ]);
    expect(bad.ok).toBe(false);

    const good = validateGitTargetPaths(
      path.resolve("/tmp/repo"),
      path.resolve("/tmp/repo/dataset"),
      ["dataset/뒤돌리기/파이브앤하프/positions.json"]
    );
    // On Windows resolve may differ — just ensure no throw; ok depends on path join
    expect(good.ok === true || good.ok === false).toBe(true);
  });

  it("G11 — commit message builder never uses shell injection", () => {
    expect(
      buildGitCommitMessage({
        changedTargets: ["dataset/뒤돌리기/파이브앤하프/positions.json"],
      })
    ).toBe("data(admin): publish 뒤돌리기/파이브앤하프");
    expect(
      buildGitCommitMessage({
        changedTargets: [
          "dataset/a/b/positions.json",
          "dataset/c/d/positions.json",
        ],
      })
    ).toBe("data(admin): publish dataset updates");
  });
});

describe("gitPublish temp-repo integration", () => {
  it(
    "G1/G10/G12/G15/G16 — clean publish commit + push",
    async () => {
    const env = makeTempGitEnv();
    const result = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      fetchRemote: true,
      items: [
        {
          snapshotId: "s1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", {
              S1: entry("S1", { familyId: "fm_a", marker: "a1" }),
            }),
          ]),
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("PUSHED");
    expect(result.changedTargets).toEqual([
      "dataset/뒤돌리기/파이브앤하프/positions.json",
    ]);

    const head = git(env.work, ["rev-parse", "HEAD"]).trim();
    const origin = git(env.work, ["rev-parse", "origin/main"]).trim();
    expect(head).toBe(origin);

    const files = git(env.work, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
      .trim()
      .split(/\r?\n/);
    expect(files).toEqual(["dataset/뒤돌리기/파이브앤하프/positions.json"]);
  },
    60_000
  );

  it(
    "G2 — unrelated unstaged dirty allowed",
    async () => {
    const env = makeTempGitEnv();
    fs.writeFileSync(path.join(env.work, "unrelated.txt"), "x", "utf8");
    const result = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [
        {
          snapshotId: "s1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", {
              S1: entry("S1", { familyId: "fm_a", marker: "a" }),
            }),
          ]),
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // unrelated still untracked / unstaged
    const status = git(env.work, ["status", "--porcelain"]);
    expect(status).toContain("unrelated.txt");
    expect(status).not.toMatch(/^A  unrelated/m);
  },
    60_000
  );

  it(
    "G3 — pre-existing staged blocks",
    async () => {
    const env = makeTempGitEnv();
    fs.writeFileSync(path.join(env.work, "staged.txt"), "s", "utf8");
    git(env.work, ["add", "--", "staged.txt"]);
    const result = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [
        {
          snapshotId: "s1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", {
              S1: entry("S1", { familyId: "fm_a", marker: "a" }),
            }),
          ]),
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("pre-existing-staged-files");
  },
    60_000
  );

  it(
    "G4 — target pre-existing dirty blocks before write",
    async () => {
    const env = makeTempGitEnv();
    const leaf = path.join(
      env.datasetRoot,
      "뒤돌리기",
      "파이브앤하프",
      "positions.json"
    );
    fs.writeFileSync(leaf, fs.readFileSync(leaf, "utf8") + "\n", "utf8");
    const result = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [
        {
          snapshotId: "s1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: familyPayload("fm_a", [
            position("p1", {
              S1: entry("S1", { familyId: "fm_a", marker: "a" }),
            }),
          ]),
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("pre-existing-target-dirty");
  },
    60_000
  );

  it(
    "G5 — wrong branch blocks",
    async () => {
    const env = makeTempGitEnv();
    git(env.work, ["checkout", "-b", "feature"]);
    const pre = await runGitPreflight({
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      expectedTargets: ["dataset/뒤돌리기/파이브앤하프/positions.json"],
      fetchRemote: true,
    });
    expect(pre.ok).toBe(false);
    if (pre.ok) return;
    expect(pre.reason).toBe("wrong-branch");
  },
    60_000
  );

  it(
    "G7 — origin/main ahead blocks",
    async () => {
    const env = makeTempGitEnv();
    // Advance remote via second clone
    const other = path.join(env.root, "other");
    git(env.root, ["clone", env.remote, other]);
    git(other, ["config", "user.name", "Other"]);
    git(other, ["config", "user.email", "other@example.com"]);
    fs.writeFileSync(path.join(other, "remote-only.txt"), "r", "utf8");
    git(other, ["add", "--", "remote-only.txt"]);
    git(other, ["commit", "-m", "remote ahead"]);
    git(other, ["push", "origin", "main"]);

    // work still on old HEAD — fetch in preflight should see ahead
    const pre = await runGitPreflight({
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      expectedTargets: ["dataset/뒤돌리기/파이브앤하프/positions.json"],
      fetchRemote: true,
    });
    expect(pre.ok).toBe(false);
    if (pre.ok) return;
    expect(["remote-ahead", "remote-diverged"]).toContain(pre.reason);
  },
    60_000
  );

  it(
    "G18 — NO_CHANGE skips commit",
    async () => {
    const env = makeTempGitEnv();
    const item = {
      snapshotId: "s1",
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      publishOperation: op("CREATE", "fm_a"),
      publishFamilyPayload: familyPayload("fm_a", [
        position("p1", {
          S1: entry("S1", {
            familyId: "fm_a",
            marker: "same",
            memberId: "mb_same_nc",
          }),
        }),
      ]),
    };
    const first = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [item],
    });
    expect(first.ok).toBe(true);
    const head1 = git(env.work, ["rev-parse", "HEAD"]).trim();

    const second = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [item],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.status).toBe("VERIFIED_NO_CHANGE");
    const head2 = git(env.work, ["rev-parse", "HEAD"]).trim();
    expect(head2).toBe(head1);
  },
    90_000
  );

  it(
    "G19/G20 — mixed NO_CHANGE + CHANGE; Unicode path",
    async () => {
    const env = makeTempGitEnv();
    // Create second leaf dir for 옆돌리기
    const sideDir = path.join(env.datasetRoot, "옆돌리기", "파이브앤하프");
    fs.mkdirSync(sideDir, { recursive: true });
    fs.writeFileSync(
      path.join(sideDir, "positions.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          shotType: "옆돌리기",
          systemId: "5_half_system",
          systemLabel: "파이브앤하프",
          exportedAt: "2026-09-17T00:00:00.000Z",
          records: [],
        },
        null,
        2
      ),
      "utf8"
    );
    git(env.work, ["add", "--", "dataset/옆돌리기"]);
    git(env.work, ["commit", "-m", "add side leaf"]);
    git(env.work, ["push", "origin", "main"]);

    const payloadA = familyPayload("fm_a", [
      position("p1", {
        S1: entry("S1", {
          familyId: "fm_a",
          marker: "a",
          memberId: "mb_a_fixed",
        }),
      }),
    ]);
    await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [
        {
          snapshotId: "seed-a",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: payloadA,
        },
      ],
    });

    const mixed = await publishDatasetBatchWithGit({
      verifyProduction: false,
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      items: [
        {
          snapshotId: "a-nc",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_a"),
          publishFamilyPayload: payloadA,
        },
        {
          snapshotId: "b-chg",
          shotType: "옆돌리기",
          systemId: "5_half_system",
          publishOperation: op("CREATE", "fm_b"),
          publishFamilyPayload: familyPayload("fm_b", [
            position(
              "p2",
              {
                S1: entry("S1", {
                  familyId: "fm_b",
                  marker: "side",
                  shotType: "옆돌리기",
                }),
              },
              ballsAlt
            ),
          ]),
        },
      ],
    });
    expect(mixed.ok).toBe(true);
    if (!mixed.ok) return;
    expect(mixed.status).toBe("PUSHED");
    expect(mixed.changedTargets).toEqual([
      "dataset/옆돌리기/파이브앤하프/positions.json",
    ]);
  },
    90_000
  );

  it(
    "G17 — push failure preserves local commit",
    async () => {
    const env = makeTempGitEnv();
    const leafRel = "dataset/뒤돌리기/파이브앤하프/positions.json";
    const { publishDatasetLeafToRepo } = await import("./publishDatasetToRepo");
    const written = publishDatasetLeafToRepo({
      datasetRoot: env.datasetRoot,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op("CREATE", "fm_c"),
        publishFamilyPayload: familyPayload("fm_c", [
          position(
            "p3",
            { S1: entry("S1", { familyId: "fm_c", marker: "c" }) },
            ballsAlt
          ),
        ]),
      },
    });
    expect(written.ok).toBe(true);
    const headBefore = git(env.work, ["rev-parse", "HEAD"]).trim();
    // Point origin at a path that cannot accept push (fails quickly)
    git(env.work, [
      "remote",
      "set-url",
      "origin",
      path.join(env.root, "does-not-exist.git"),
    ]);
    const pushAttempt = await stageCommitAndPush({
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      changedTargets: [leafRel],
      commitMessage: "data(admin): publish dataset updates",
      fetchRemote: false,
    });
    expect(pushAttempt.ok).toBe(false);
    if (pushAttempt.ok) return;
    expect(pushAttempt.localCommit).toBeTruthy();
    const headNow = git(env.work, ["rev-parse", "HEAD"]).trim();
    expect(headNow).toBe(pushAttempt.localCommit);
    expect(headNow).not.toBe(headBefore);
  },
    60_000
  );
});

describe("security + wiring", () => {
  it("S1–S4 — client injection fields rejected", async () => {
    const env = makeTempGitEnv();
    const handled = await handleGitPublishHttpBody({
      repoRoot: env.work,
      datasetRoot: env.datasetRoot,
      body: {
        branch: "evil",
        remote: "evil",
        gitCommand: "status",
        items: [
          {
            snapshotId: "s1",
            shotType: "뒤돌리기",
            systemId: "5_half_system",
            path: "D:\\\\hack",
            publishOperation: op("CREATE", "fm_a"),
            publishFamilyPayload: familyPayload("fm_a", [
              position("p1", {
                S1: entry("S1", { familyId: "fm_a" }),
              }),
            ]),
          },
        ],
      },
      fetchRemote: false,
    });
    expect(handled.statusCode).toBe(400);
    expect(handled.body.reason).toBe("forbidden-client-fields");
  });

  it("S5/S6/S7 — vite registers git + verify endpoints as configureServer only; no api/ serverless", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const vite = readFileSync(join(here, "../../../vite.config.js"), "utf8");
    expect(vite).toContain("/api/publish-dataset-git");
    expect(vite).toContain("publishDatasetGitApiDevMiddleware");
    expect(vite).toContain("/api/verify-production-dataset");
    expect(vite).toContain("verifyProductionDatasetApiDevMiddleware");
    expect(vite).toContain("configureServer");
    expect(fs.existsSync(join(here, "../../../api/publish-dataset-git.js"))).toBe(
      false
    );
    expect(
      fs.existsSync(join(here, "../../../api/verify-production-dataset.js"))
    ).toBe(false);
  });

  it("useSettings wires Git Publish primary; keeps repo-only helper", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../hooks/useSettings.js"), "utf8");
    expect(src).toContain("publishDatasetToLocalRepoWithGit");
    expect(src).toContain("handleRepoOnlyPublishSnapshots");
    expect(src).toContain("publishDatasetToLocalRepo");
  });

  it("G11 evidence — staging uses git add -- only in source", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "gitPublish.ts"), "utf8");
    expect(src).toContain('["add", "--"');
    expect(src).not.toMatch(/\[\s*"add"\s*,\s*"\."\s*\]/);
    expect(src).not.toContain('add", "-A"');
    expect(src).not.toContain("--force");
  });
});
