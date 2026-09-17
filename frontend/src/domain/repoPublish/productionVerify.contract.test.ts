/**
 * Phase 4-C — Production dataset read-back contracts.
 * Uses mock HTTP + temp Git only. Never hits www.3cushionai.com / Vercel / GitHub.
 */

import { createServer, type Server } from "node:http";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatasetExportPayload } from "../datasetExport";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  buildCanonicalProductionDatasetUrl,
  fetchProductionLeafAttempt,
  handleProductionVerifyHttpBody,
  verifyProductionDatasetLeaves,
} from "./productionVerify";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  validateProductionOrigin,
} from "./productionOrigin";
import {
  readCommittedBlobText,
  resolveHeadCommitSha,
} from "./gitPublish";
import { buildPublishedLeafUrl } from "../datasetLoader";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

let seq = 0;
function mb(): string {
  seq += 1;
  return `mb_p4c_${seq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: { familyId?: string; marker?: string } = {}
): StrategyEntry {
  const e: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 40 },
    corrections: {
      departure: 0,
      spin: 0,
      slide: 0,
      draw: 0,
      curve_ratio: 0,
    },
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
  if (opts.familyId) {
    e.familyId = opts.familyId;
    e.memberId = mb();
    e.memberOrigin = "AUTHORED";
  }
  if (opts.marker) e.ai = { text: opts.marker };
  return e;
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>
): PositionRecord {
  return {
    positionId,
    balls,
    strategies: slots,
    schemaVersion: 1,
  };
}

function makePayload(
  marker: string,
  familyId = "fm_p4c"
): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-17T12:00:00.000Z",
    records: [
      position("p1", {
        S1: entry("S1", { familyId, marker }),
      }),
    ],
  };
}

type MockState = {
  bodies: Array<string | (() => string)>;
  statusCodes: number[];
  hit: number;
};

type MockEnv = {
  server: Server;
  origin: string;
  state: MockState;
  close: () => Promise<void>;
};

const mocks: MockEnv[] = [];
const tempRoots: string[] = [];

function startMockServer(state: MockState): Promise<MockEnv> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const idx = Math.min(state.hit, state.bodies.length - 1);
      const status =
        state.statusCodes[Math.min(state.hit, state.statusCodes.length - 1)] ??
        200;
      const bodySrc = state.bodies[idx] ?? "{}";
      const body = typeof bodySrc === "function" ? bodySrc() : bodySrc;
      state.hit += 1;
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("no address"));
        return;
      }
      const env: MockEnv = {
        server,
        origin: `http://127.0.0.1:${addr.port}`,
        state,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
      };
      mocks.push(env);
      resolve(env);
    });
  });
}

function git(cwd: string, args: string[]) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

function makeTempRepoWithLeaf(payload: DatasetExportPayload): {
  root: string;
  work: string;
  datasetRoot: string;
  commitSha: string;
  leafRel: string;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4c-git-"));
  tempRoots.push(root);
  const work = path.join(root, "work");
  fs.mkdirSync(work);
  git(work, ["init", "-b", "main"]);
  git(work, ["config", "user.name", "P4C Tester"]);
  git(work, ["config", "user.email", "p4c@example.com"]);
  const datasetRoot = path.join(work, "dataset");
  const leafDir = path.join(datasetRoot, "뒤돌리기", "파이브앤하프");
  fs.mkdirSync(leafDir, { recursive: true });
  const leafRel = "dataset/뒤돌리기/파이브앤하프/positions.json";
  fs.writeFileSync(
    path.join(leafDir, "positions.json"),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
  fs.writeFileSync(path.join(work, "README.md"), "# p4c\n", "utf8");
  git(work, ["add", "--", "README.md", "dataset"]);
  git(work, ["commit", "-m", "initial leaf"]);
  const commitSha = git(work, ["rev-parse", "HEAD"]).trim();
  return { root, work, datasetRoot, commitSha, leafRel };
}

afterEach(async () => {
  for (const m of mocks) {
    try {
      await m.close();
    } catch {
      /* ignore */
    }
  }
  mocks.length = 0;
  for (const root of tempRoots) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  tempRoots.length = 0;
});

const fastPoll = {
  initialDelayMs: 0,
  intervalMs: 20,
  overallTimeoutMs: 400,
  perRequestTimeoutMs: 500,
  maxResponseBytes: 5_000_000,
};

describe("productionOrigin SSOT", () => {
  it("canonical origin is https www.3cushionai.com", () => {
    expect(CANONICAL_PRODUCTION_ORIGIN).toBe("https://www.3cushionai.com");
    const ok = validateProductionOrigin(CANONICAL_PRODUCTION_ORIGIN);
    expect(ok.ok).toBe(true);
  });

  it("rejects client-like private / file origins", () => {
    expect(validateProductionOrigin("file:///etc/passwd").ok).toBe(false);
    expect(validateProductionOrigin("http://192.168.1.1").ok).toBe(false);
    expect(validateProductionOrigin("https://localhost").ok).toBe(false);
  });

  it("buildCanonicalProductionDatasetUrl uses datasetLoader path SSOT", () => {
    const built = buildCanonicalProductionDatasetUrl({
      productionOrigin: CANONICAL_PRODUCTION_ORIGIN,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      verifyToken: "abc123def456",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.path).toBe(
      buildPublishedLeafUrl("뒤돌리기", "5_half_system")
    );
    expect(built.url.startsWith("https://www.3cushionai.com/dataset/")).toBe(
      true
    );
    expect(built.url).toContain("verify=abc123def456".slice(0, 19));
    expect(built.url).toMatch(/verify=abc123def456/);
  });
});

describe("P1–P10 production verify (mock HTTP)", () => {
  it("P1 — expected JSON immediate → VERIFIED", async () => {
    const expected = makePayload("live");
    const mock = await startMockServer({
      bodies: [JSON.stringify(expected)],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: fastPoll,
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("PRODUCTION_VERIFIED");
    expect(result.leaves[0].verified).toBe(true);
  });

  it("P2 — old JSON → expected JSON → polling VERIFIED", async () => {
    const expected = makePayload("new");
    const old = makePayload("old");
    const mock = await startMockServer({
      bodies: [JSON.stringify(old), JSON.stringify(expected)],
      statusCodes: [200, 200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: { ...fastPoll, overallTimeoutMs: 800 },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.leaves[0].attempts).toBeGreaterThanOrEqual(2);
  });

  it("P3 — 404 → expected → VERIFIED", async () => {
    const expected = makePayload("after404");
    const mock = await startMockServer({
      bodies: ["missing", JSON.stringify(expected)],
      statusCodes: [404, 200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: { ...fastPoll, overallTimeoutMs: 800 },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
  });

  it("P4 — 500 temporary → expected → VERIFIED", async () => {
    const expected = makePayload("after500");
    const mock = await startMockServer({
      bodies: ["err", JSON.stringify(expected)],
      statusCodes: [500, 200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: { ...fastPoll, overallTimeoutMs: 800 },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
  });

  it("P5 — network error temporary → expected → VERIFIED", async () => {
    const expected = makePayload("net");
    const mock = await startMockServer({
      bodies: [JSON.stringify(expected)],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    let calls = 0;
    const fetchFn: typeof fetch = async (input, init) => {
      calls += 1;
      if (calls === 1) {
        throw new Error("simulated-network");
      }
      return fetch(input, init);
    };
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: { ...fastPoll, overallTimeoutMs: 800 },
      skipInitialDelay: true,
      fetchFn,
    });
    expect(result.ok).toBe(true);
  });

  it("P6 — old JSON until timeout → TIMEOUT", async () => {
    const expected = makePayload("want");
    const old = makePayload("stale");
    const mock = await startMockServer({
      bodies: [JSON.stringify(old)],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: {
        initialDelayMs: 0,
        intervalMs: 30,
        overallTimeoutMs: 120,
        perRequestTimeoutMs: 200,
        maxResponseBytes: 5_000_000,
      },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("PRODUCTION_VERIFY_TIMEOUT");
  });

  it("P7 — invalid JSON until timeout", async () => {
    const expected = makePayload("want");
    const mock = await startMockServer({
      bodies: ["{not-json"],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: {
        initialDelayMs: 0,
        intervalMs: 30,
        overallTimeoutMs: 120,
        perRequestTimeoutMs: 200,
        maxResponseBytes: 5_000_000,
      },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.leaves?.[0].lastKind).toBe("invalid_json");
  });

  it("P8 — HTML 200 until timeout → invalid_json", async () => {
    const expected = makePayload("want");
    const mock = await startMockServer({
      bodies: ["<!DOCTYPE html><html><body>app</body></html>"],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: {
        initialDelayMs: 0,
        intervalMs: 30,
        overallTimeoutMs: 120,
        perRequestTimeoutMs: 200,
        maxResponseBytes: 5_000_000,
      },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.leaves?.[0].lastKind).toBe("invalid_json");
  });

  it("P9 — semantic equal / formatting different → VERIFIED", async () => {
    const expected = makePayload("fmt");
    const compact = JSON.stringify(expected);
    const mock = await startMockServer({
      bodies: [compact],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    // Commit has pretty JSON; Production returns compact — still semantic equal.
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: fastPoll,
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
  });

  it("P10 — family expected but whole leaf differs → NOT VERIFIED", async () => {
    const expected = makePayload("a", "fm_same");
    // Same familyId but different marker → whole leaf semantic mismatch
    const other = makePayload("b", "fm_same");
    const mock = await startMockServer({
      bodies: [JSON.stringify(other)],
      statusCodes: [200],
      hit: 0,
    });
    const repo = makeTempRepoWithLeaf(expected);
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: {
        initialDelayMs: 0,
        intervalMs: 30,
        overallTimeoutMs: 120,
        perRequestTimeoutMs: 200,
        maxResponseBytes: 5_000_000,
      },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe("security S1–S8", () => {
  it("S1–S4 — client URL/host/path/commitSha rejected", async () => {
    const repo = makeTempRepoWithLeaf(makePayload("sec"));
    const handled = await handleProductionVerifyHttpBody({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      body: {
        url: "https://evil.example/x",
        productionUrl: "https://evil.example",
        host: "evil.example",
        origin: "https://evil.example",
        path: "/etc/passwd",
        commitSha: "deadbeef",
        items: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      },
      poll: fastPoll,
    });
    expect(handled.statusCode).toBe(400);
    expect(handled.body.reason).toBe("forbidden-client-fields");
  });

  it("S5 — client gitCommand rejected", async () => {
    const repo = makeTempRepoWithLeaf(makePayload("sec"));
    const handled = await handleProductionVerifyHttpBody({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      body: {
        gitCommand: "show HEAD:dataset/x",
        items: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      },
    });
    expect(handled.statusCode).toBe(400);
  });

  it("S7 — verify + git endpoints are configureServer only; no serverless api/", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const vite = readFileSync(join(here, "../../../vite.config.js"), "utf8");
    expect(vite).toContain("/api/verify-production-dataset");
    expect(vite).toContain("verifyProductionDatasetApiDevMiddleware");
    expect(vite).toContain("configureServer");
    expect(
      fs.existsSync(join(here, "../../../api/verify-production-dataset.js"))
    ).toBe(false);
    expect(fs.existsSync(join(here, "../../../api/publish-dataset-git.js"))).toBe(
      false
    );
  });

  it("S8 — no VERCEL_TOKEN / frontend secret in productionVerify", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "productionVerify.ts"), "utf8");
    expect(src).not.toMatch(/VERCEL_TOKEN/);
    expect(src).not.toMatch(/process\.env\./);
  });
});

describe("git blob expected state B1–B5", () => {
  it("B1/B5 — committed blob read (Unicode Korean path)", async () => {
    const payload = makePayload("blob");
    const repo = makeTempRepoWithLeaf(payload);
    const blob = await readCommittedBlobText({
      repoRoot: repo.work,
      commitSha: repo.commitSha,
      repoRelativePath: repo.leafRel,
    });
    expect(blob.ok).toBe(true);
    if (!blob.ok) return;
    expect(JSON.parse(blob.text).records[0].strategies.S1.ai.text).toBe("blob");
  });

  it("B2 — working tree modified after commit → expected remains commit blob", async () => {
    const payload = makePayload("committed");
    const repo = makeTempRepoWithLeaf(payload);
    const leafAbs = path.join(
      repo.datasetRoot,
      "뒤돌리기",
      "파이브앤하프",
      "positions.json"
    );
    fs.writeFileSync(
      leafAbs,
      JSON.stringify(makePayload("dirty-wt"), null, 2),
      "utf8"
    );
    const mock = await startMockServer({
      bodies: [JSON.stringify(payload)],
      statusCodes: [200],
      hit: 0,
    });
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "뒤돌리기", systemId: "5_half_system" }],
      productionOrigin: mock.origin,
      poll: fastPoll,
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
  });

  it("B3 — wrong/untrusted SHA rejected", async () => {
    const repo = makeTempRepoWithLeaf(makePayload("x"));
    const blob = await readCommittedBlobText({
      repoRoot: repo.work,
      commitSha: "../../../etc/passwd",
      repoRelativePath: repo.leafRel,
    });
    expect(blob.ok).toBe(false);
  });

  it("B4 — target not in commit → verification BLOCK", async () => {
    const repo = makeTempRepoWithLeaf(makePayload("x"));
    const result = await verifyProductionDatasetLeaves({
      repoRoot: repo.work,
      datasetRoot: repo.datasetRoot,
      commitSha: repo.commitSha,
      leaves: [{ shotType: "옆돌리기", systemId: "5_half_system" }],
      productionOrigin: "http://127.0.0.1:9",
      poll: fastPoll,
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("PRODUCTION_VERIFY_FAILED");
  });

  it("resolveHeadCommitSha returns full sha", async () => {
    const repo = makeTempRepoWithLeaf(makePayload("head"));
    const head = await resolveHeadCommitSha(repo.work);
    expect(head.ok).toBe(true);
    if (!head.ok) return;
    expect(head.commitSha).toBe(repo.commitSha);
  });
});

describe("multi-leaf M1–M4", () => {
  it("M1 — two leaves both verify → overall VERIFIED", async () => {
    const a = makePayload("a");
    const b: DatasetExportPayload = {
      ...makePayload("b"),
      shotType: "옆돌리기",
      systemId: "plus2_system",
      systemLabel: "플러스투",
    };
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4c-ml-"));
    tempRoots.push(root);
    const work = path.join(root, "work");
    fs.mkdirSync(work);
    git(work, ["init", "-b", "main"]);
    git(work, ["config", "user.name", "P4C"]);
    git(work, ["config", "user.email", "p4c@example.com"]);
    const datasetRoot = path.join(work, "dataset");
    fs.mkdirSync(path.join(datasetRoot, "뒤돌리기", "파이브앤하프"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(datasetRoot, "옆돌리기", "플러스투"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(datasetRoot, "뒤돌리기", "파이브앤하프", "positions.json"),
      JSON.stringify(a, null, 2)
    );
    fs.writeFileSync(
      path.join(datasetRoot, "옆돌리기", "플러스투", "positions.json"),
      JSON.stringify(b, null, 2)
    );
    git(work, ["add", "--", "dataset"]);
    git(work, ["commit", "-m", "two leaves"]);
    const commitSha = git(work, ["rev-parse", "HEAD"]).trim();

    const responses = new Map<string, string>([
      ["/dataset/%EB%92%A4%EB%8F%8C%EB%A6%AC%EA%B8%B0/%ED%8C%8C%EC%9D%B4%EB%B8%8C%EC%95%A4%ED%95%98%ED%94%84/positions.json", JSON.stringify(a)],
      ["/dataset/%EC%97%BF%EB%8F%8C%EB%A6%AC%EA%B8%B0/%ED%94%8C%EB%9F%AC%EC%8A%A4%ED%88%AC/positions.json", JSON.stringify(b)],
    ]);
    // Decode path comparison via pathname includes
    const mock = await new Promise<MockEnv>((resolve, reject) => {
      const server = createServer((req, res) => {
        const u = new URL(req.url || "/", "http://127.0.0.1");
        let body = "{}";
        for (const [k, v] of responses) {
          if (u.pathname === k || decodeURIComponent(u.pathname).includes("파이브앤하프") && k.includes("%ED%8C%8C") && decodeURIComponent(u.pathname).includes("파이브앤하프")) {
            if (decodeURIComponent(u.pathname).includes("파이브앤하프")) body = JSON.stringify(a);
            if (decodeURIComponent(u.pathname).includes("플러스투")) body = JSON.stringify(b);
          }
        }
        const pathDecoded = decodeURIComponent(u.pathname);
        if (pathDecoded.includes("파이브앤하프")) body = JSON.stringify(a);
        else if (pathDecoded.includes("플러스투")) body = JSON.stringify(b);
        res.statusCode = 200;
        res.end(body);
      });
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (!addr || typeof addr === "string") {
          reject(new Error("no addr"));
          return;
        }
        const env: MockEnv = {
          server,
          origin: `http://127.0.0.1:${addr.port}`,
          state: { bodies: [], statusCodes: [], hit: 0 },
          close: () => new Promise((r) => server.close(() => r())),
        };
        mocks.push(env);
        resolve(env);
      });
    });

    const result = await verifyProductionDatasetLeaves({
      repoRoot: work,
      datasetRoot,
      commitSha,
      leaves: [
        { shotType: "뒤돌리기", systemId: "5_half_system" },
        { shotType: "옆돌리기", systemId: "plus2_system" },
        // M4: same leaf twice → one verify target
        { shotType: "뒤돌리기", systemId: "5_half_system" },
      ],
      productionOrigin: mock.origin,
      poll: fastPoll,
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.leaves).toHaveLength(2);
  });

  it("M3 — A verify / B timeout → partial", async () => {
    const a = makePayload("ok-a");
    const bWant = makePayload("want-b");
    const bStale = makePayload("stale-b");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4c-partial-"));
    tempRoots.push(root);
    const work = path.join(root, "work");
    fs.mkdirSync(work);
    git(work, ["init", "-b", "main"]);
    git(work, ["config", "user.name", "P4C"]);
    git(work, ["config", "user.email", "p4c@example.com"]);
    const datasetRoot = path.join(work, "dataset");
    fs.mkdirSync(path.join(datasetRoot, "뒤돌리기", "파이브앤하프"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(datasetRoot, "옆돌리기", "플러스투"), {
      recursive: true,
    });
    const bLeaf: DatasetExportPayload = {
      ...bWant,
      shotType: "옆돌리기",
      systemId: "plus2_system",
      systemLabel: "플러스투",
    };
    fs.writeFileSync(
      path.join(datasetRoot, "뒤돌리기", "파이브앤하프", "positions.json"),
      JSON.stringify(a, null, 2)
    );
    fs.writeFileSync(
      path.join(datasetRoot, "옆돌리기", "플러스투", "positions.json"),
      JSON.stringify(bLeaf, null, 2)
    );
    git(work, ["add", "--", "dataset"]);
    git(work, ["commit", "-m", "partial"]);
    const commitSha = git(work, ["rev-parse", "HEAD"]).trim();

    const mock = await new Promise<MockEnv>((resolve, reject) => {
      const server = createServer((req, res) => {
        const pathDecoded = decodeURIComponent(
          new URL(req.url || "/", "http://127.0.0.1").pathname
        );
        res.statusCode = 200;
        if (pathDecoded.includes("파이브앤하프")) {
          res.end(JSON.stringify(a));
        } else {
          res.end(
            JSON.stringify({
              ...bStale,
              shotType: "옆돌리기",
              systemId: "plus2_system",
              systemLabel: "플러스투",
            })
          );
        }
      });
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (!addr || typeof addr === "string") {
          reject(new Error("no addr"));
          return;
        }
        const env: MockEnv = {
          server,
          origin: `http://127.0.0.1:${addr.port}`,
          state: { bodies: [], statusCodes: [], hit: 0 },
          close: () => new Promise((r) => server.close(() => r())),
        };
        mocks.push(env);
        resolve(env);
      });
    });

    const result = await verifyProductionDatasetLeaves({
      repoRoot: work,
      datasetRoot,
      commitSha,
      leaves: [
        { shotType: "뒤돌리기", systemId: "5_half_system" },
        { shotType: "옆돌리기", systemId: "plus2_system" },
      ],
      productionOrigin: mock.origin,
      poll: {
        initialDelayMs: 0,
        intervalMs: 30,
        overallTimeoutMs: 120,
        perRequestTimeoutMs: 200,
        maxResponseBytes: 5_000_000,
      },
      skipInitialDelay: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("PARTIAL_PRODUCTION_VERIFICATION");
  });
});

describe("attempt classifier", () => {
  it("classifies semantic mismatch as retryable", async () => {
    const expected = makePayload("exp");
    const other = makePayload("oth");
    const mock = await startMockServer({
      bodies: [JSON.stringify(other)],
      statusCodes: [200],
      hit: 0,
    });
    const built = buildCanonicalProductionDatasetUrl({
      productionOrigin: mock.origin,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const outcome = await fetchProductionLeafAttempt({
      url: built.url,
      origin: built.origin,
      expectedCandidate: expected,
      perRequestTimeoutMs: 500,
      maxResponseBytes: 5_000_000,
    });
    expect(outcome.kind).toBe("semantic_mismatch");
    expect(outcome.retryable).toBe(true);
  });
});
