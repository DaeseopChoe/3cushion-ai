/**
 * Published leaf size limit — Production read-back and commit-blob summary share
 * one 12MiB cap, so 5MiB / 10MiB 현황 states are reachable on a verified Publish.
 *
 * 1-3 5MiB / 10MiB-1 / 10MiB leaves verify; status 분할 준비 / 분할 준비 / 분할 전환 필요
 * 4   exactly 12MiB: verify + summary allowed
 * 5   12MiB + 1: commit blob and Production response rejected, bounded reads, clear codes
 * 6   Family / Member thresholds win over size states
 * 7   status uses raw byteLength, not the rounded display
 *
 * Temp repo + fake Production fetch only.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readCommittedBlobText } from "./gitPublish";
import {
  DEFAULT_PRODUCTION_VERIFY_POLL,
  fetchProductionLeafAttempt,
  readCommittedPublishedLeafSummaries,
  verifyProductionDatasetLeaves,
} from "./productionVerify";
import { CANONICAL_PRODUCTION_ORIGIN, validateProductionOrigin } from "./productionOrigin";
import { PUBLISHED_LEAF_MAX_BYTES, utf8ByteLength } from "./publishedLeafSummary";
import {
  buildPublishSuccessStatusText,
  classifyPublishedLeafScale,
} from "../../application/flows/publishStatusReport";
import { parseNormalizedDatasetEnvelope } from "../dataset/normalizedDatasetEnvelope";

const MiB = 1024 * 1024;
const LEAF_REL = "dataset/뒤돌리기/파이브앤하프/positions.json";
const LEAF = [{ shotType: "뒤돌리기", systemId: "5_half_system" }];

/** Valid empty v3 leaf padded with trailing JSON whitespace to exactly `bytes`. */
function leafTextOfSize(bytes: number): string {
  const base = JSON.stringify({
    schemaVersion: 3,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    familyMasters: [],
    familyMembers: [],
  });
  const text = base + " ".repeat(bytes - utf8ByteLength(base));
  expect(utf8ByteLength(text)).toBe(bytes);
  return text;
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * MiB,
  });
}

let root = "";
let work = "";
let datasetRoot = "";
const commitBySize = new Map<number, string>();
const textBySize = new Map<number, string>();

const SIZES = {
  split: 5 * MiB,
  belowRequired: 10 * MiB - 1,
  required: 10 * MiB,
  max: 12 * MiB,
  over: 12 * MiB + 1,
};

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "leaf-size-"));
  work = path.join(root, "work");
  fs.mkdirSync(work);
  git(work, ["init", "-b", "main"]);
  git(work, ["config", "user.name", "Leaf Size Tester"]);
  git(work, ["config", "user.email", "leaf-size@example.com"]);
  git(work, ["config", "core.autocrlf", "false"]);
  datasetRoot = path.join(work, "dataset");
  const leafDir = path.join(datasetRoot, "뒤돌리기", "파이브앤하프");
  fs.mkdirSync(leafDir, { recursive: true });
  for (const size of Object.values(SIZES)) {
    const text = leafTextOfSize(size);
    fs.writeFileSync(path.join(leafDir, "positions.json"), text, "utf8");
    git(work, ["add", "--", "dataset"]);
    git(work, ["commit", "-m", `leaf ${size}`]);
    commitBySize.set(size, git(work, ["rev-parse", "HEAD"]).trim());
    textBySize.set(size, text);
  }
}, 120_000);

afterAll(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

function productionServing(text: string): typeof fetch {
  return (async () => new Response(text, { status: 200 })) as typeof fetch;
}

const POLL = { initialDelayMs: 0, intervalMs: 20, overallTimeoutMs: 5_000, perRequestTimeoutMs: 20_000 };

async function verifyAndSummarize(size: number) {
  const commitSha = commitBySize.get(size)!;
  const verify = await verifyProductionDatasetLeaves({
    repoRoot: work,
    datasetRoot,
    commitSha,
    leaves: LEAF,
    poll: POLL,
    fetchFn: productionServing(textBySize.get(size)!),
    skipInitialDelay: true,
  });
  const summary = await readCommittedPublishedLeafSummaries({
    repoRoot: work,
    datasetRoot,
    commitSha,
    leaves: LEAF,
  });
  return { verify, summary };
}

describe("Published leaf size limit (12MiB)", { timeout: 120_000 }, () => {
  it("one named 12MiB cap is the Production read-back default", () => {
    expect(PUBLISHED_LEAF_MAX_BYTES).toBe(12 * 1024 * 1024);
    expect(DEFAULT_PRODUCTION_VERIFY_POLL.maxResponseBytes).toBe(PUBLISHED_LEAF_MAX_BYTES);
    expect(DEFAULT_PRODUCTION_VERIFY_POLL.initialDelayMs).toBe(3_000);
    expect(DEFAULT_PRODUCTION_VERIFY_POLL.intervalMs).toBe(4_000);
  });

  it.each([
    ["1 — exactly 5MiB", SIZES.split, "분할 준비"],
    ["2 — 10MiB - 1 byte", SIZES.belowRequired, "분할 준비"],
    ["3 — exactly 10MiB", SIZES.required, "분할 전환 필요"],
    ["4 — exactly 12MiB", SIZES.max, "분할 전환 필요"],
  ])("%s verifies and reports its status", async (_label, size, status) => {
    const { verify, summary } = await verifyAndSummarize(size);
    expect(verify.ok).toBe(true);
    if (!verify.ok) return;
    expect(verify.status).toBe("PRODUCTION_VERIFIED");
    expect(summary.ok).toBe(true);
    if (!summary.ok) return;
    expect(summary.summaries[0].byteLength).toBe(size);
    expect(summary.summaries[0].byteLength).toBe(
      Number(git(work, ["cat-file", "-s", `${commitBySize.get(size)}:${LEAF_REL}`]).trim())
    );
    expect(classifyPublishedLeafScale(summary.summaries[0]).label).toBe(status);
    const text = buildPublishSuccessStatusText({ leafSummaries: summary.summaries, elapsedMs: 20_000 });
    expect(text).toContain(`상태    ${status}`);
  });

  it("5a — 12MiB + 1 commit blob is rejected with a clear code (verify + summary)", async () => {
    const commitSha = commitBySize.get(SIZES.over)!;
    const blob = await readCommittedBlobText({ repoRoot: work, commitSha, repoRelativePath: LEAF_REL });
    expect(blob.ok).toBe(false);
    if (blob.ok) return;
    expect(blob.reason).toBe("commit-blob-too-large");
    expect(blob.status).toBe("BLOB_TOO_LARGE");

    const { verify, summary } = await verifyAndSummarize(SIZES.over);
    expect(verify.ok).toBe(false);
    if (verify.ok) return;
    expect(verify.status).toBe("PRODUCTION_VERIFY_FAILED");
    expect(verify.issues.join(" ")).toContain("commit-blob-too-large");
    expect(summary.ok).toBe(false);
    if (summary.ok) return;
    expect(summary.reason).toBe("commit-blob-too-large");
  });

  it("5b — 12MiB + 1 Production response: rejected, stream cancelled, bounded read", async () => {
    const origin = validateProductionOrigin(CANONICAL_PRODUCTION_ORIGIN);
    if (!origin.ok) throw new Error("origin");
    const expected = parseNormalizedDatasetEnvelope(JSON.parse(textBySize.get(SIZES.split)!));
    if (!expected.ok) throw new Error("expected");
    const chunk = new Uint8Array(MiB).fill(0x20);
    let pulled = 0;
    let cancelled = false;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const outcome = await fetchProductionLeafAttempt({
      url: `${CANONICAL_PRODUCTION_ORIGIN}/dataset/x.json`,
      origin,
      expectedCandidate: expected.envelope,
      perRequestTimeoutMs: 20_000,
      maxResponseBytes: DEFAULT_PRODUCTION_VERIFY_POLL.maxResponseBytes,
      fetchFn: (async () => new Response(endless, { status: 200 })) as typeof fetch,
    });
    expect(outcome.kind).toBe("fatal");
    expect(outcome.retryable).toBe(false);
    expect(outcome.issues).toContain("response-too-large");
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThanOrEqual(PUBLISHED_LEAF_MAX_BYTES + 2 * MiB);

    const exact = await fetchProductionLeafAttempt({
      url: `${CANONICAL_PRODUCTION_ORIGIN}/dataset/x.json`,
      origin,
      expectedCandidate: expected.envelope,
      perRequestTimeoutMs: 20_000,
      maxResponseBytes: DEFAULT_PRODUCTION_VERIFY_POLL.maxResponseBytes,
      fetchFn: productionServing(textBySize.get(SIZES.over)!),
    });
    expect(exact.kind).toBe("fatal");
    expect(exact.issues).toContain("response-too-large");
  });

  it("5c — declared Content-Length over the cap is rejected before reading the body", async () => {
    const origin = validateProductionOrigin(CANONICAL_PRODUCTION_ORIGIN);
    if (!origin.ok) throw new Error("origin");
    const expected = parseNormalizedDatasetEnvelope(JSON.parse(textBySize.get(SIZES.split)!));
    if (!expected.ok) throw new Error("expected");
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new Uint8Array(1024));
      },
    });
    const outcome = await fetchProductionLeafAttempt({
      url: `${CANONICAL_PRODUCTION_ORIGIN}/dataset/x.json`,
      origin,
      expectedCandidate: expected.envelope,
      perRequestTimeoutMs: 20_000,
      maxResponseBytes: DEFAULT_PRODUCTION_VERIFY_POLL.maxResponseBytes,
      fetchFn: (async () =>
        ({
          url: "",
          status: 200,
          headers: new Headers({ "content-length": String(PUBLISHED_LEAF_MAX_BYTES + 1) }),
          body,
          text: async () => "",
        }) as unknown as Response) as typeof fetch,
    });
    expect(outcome.kind).toBe("fatal");
    expect(outcome.issues).toContain("response-too-large");
    expect(pulled).toBeLessThanOrEqual(1);
  });

  it("5d — non-stream fallback counts UTF-8 bytes, not characters", async () => {
    const origin = validateProductionOrigin(CANONICAL_PRODUCTION_ORIGIN);
    if (!origin.ok) throw new Error("origin");
    const expected = parseNormalizedDatasetEnvelope(JSON.parse(textBySize.get(SIZES.split)!));
    if (!expected.ok) throw new Error("expected");
    const korean = "가".repeat(10);
    const outcome = await fetchProductionLeafAttempt({
      url: `${CANONICAL_PRODUCTION_ORIGIN}/dataset/x.json`,
      origin,
      expectedCandidate: expected.envelope,
      perRequestTimeoutMs: 1_000,
      maxResponseBytes: 20,
      fetchFn: (async () =>
        ({
          url: "",
          status: 200,
          headers: new Headers(),
          body: null,
          text: async () => korean,
        }) as unknown as Response) as typeof fetch,
    });
    expect(outcome.kind).toBe("fatal");
    expect(outcome.issues).toContain("response-too-large");
  });

  it("6 — Family 1,000 / Member 1,000,000 win over size states", () => {
    for (const byteLength of [SIZES.split, SIZES.required, SIZES.max]) {
      expect(classifyPublishedLeafScale({ familyCount: 1000, memberCount: 1, byteLength }).label).toBe(
        "데이터베이스 전환 검토"
      );
      expect(
        classifyPublishedLeafScale({ familyCount: 1, memberCount: 1_000_000, byteLength }).label
      ).toBe("데이터베이스 전환 검토");
    }
  });

  it("7 — 10MiB - 1 shows as 10.0MB but stays 분할 준비 (raw byteLength)", () => {
    const text = buildPublishSuccessStatusText({
      leafSummaries: [
        {
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          systemLabel: "파이브앤하프",
          familyCount: 1,
          memberCount: 960,
          byteLength: SIZES.belowRequired,
        },
      ],
      elapsedMs: 20_000,
    });
    expect(text).toContain("파일    10.0MB");
    expect(text).toContain("상태    분할 준비");
    expect(text).not.toMatch(/MiB|이상/);
  });
});
