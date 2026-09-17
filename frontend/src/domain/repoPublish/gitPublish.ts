/**
 * Phase 4-B — Safe Git preflight / stage / commit / push.
 * Does not write dataset files. Does not invent targets.
 */

import path from "node:path";
import { DATASET_EXPORT_FILENAME, DATASET_ROOT_DIR } from "../datasetPath";
import { normalizeDatasetExport } from "../datasetExport";
import { validatePublishedExportCandidate } from "../publishedFamilyPublish";
import { gitExec } from "./gitExec";

export const GIT_PUBLISH_REMOTE = "origin";
export const GIT_PUBLISH_BRANCH = "main";

export type PorcelainEntry = {
  xy: string;
  path: string;
  /** Original path when rename (status R). */
  fromPath?: string;
};

export type GitPreflightOk = {
  ok: true;
  head: string;
  originMain: string;
  branch: string;
  /** Repo-relative posix paths dirty before write (unrelated allowed). */
  baselineDirtyPaths: string[];
  expectedTargets: string[];
};

export type GitFail = {
  ok: false;
  reason: string;
  issues: string[];
  status?: string;
};

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

function uniqSorted(paths: string[]): string[] {
  return [...new Set(paths.map(toPosix))].sort();
}

/** Parse `git status --porcelain` (v1). */
export function parsePorcelainStatus(stdout: string): PorcelainEntry[] {
  const out: PorcelainEntry[] = [];
  const lines = String(stdout ?? "").split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (line.length < 4) continue;
    const xy = line.slice(0, 2);
    const rest = line.slice(3);
    if (rest.includes(" -> ")) {
      const [fromPath, pathPart] = rest.split(" -> ");
      out.push({
        xy,
        path: toPosix(pathPart.trim()),
        fromPath: toPosix(fromPath.trim()),
      });
    } else {
      out.push({ xy, path: toPosix(rest.trim()) });
    }
  }
  return out;
}

export function isStagedEntry(xy: string): boolean {
  return xy[0] !== " " && xy[0] !== "?";
}

export function isUnstagedOrUntracked(xy: string): boolean {
  return xy[1] !== " " || xy[0] === "?";
}

/**
 * Validate repo-relative dataset leaf paths for Git.
 * Must be dataset/.../positions.json under dataset root.
 */
export function validateGitTargetPaths(
  repoRoot: string,
  datasetRoot: string,
  targets: string[]
): { ok: true; targets: string[] } | GitFail {
  if (!Array.isArray(targets) || targets.length === 0) {
    return {
      ok: false,
      reason: "git-targets-empty",
      issues: ["expectedTargets:empty"],
    };
  }
  const root = path.resolve(repoRoot);
  const dsRoot = path.resolve(datasetRoot);
  const normalized: string[] = [];
  const issues: string[] = [];

  for (const raw of targets) {
    if (typeof raw !== "string" || !raw.trim()) {
      issues.push("target:empty");
      continue;
    }
    const posix = toPosix(raw.trim());
    if (posix.startsWith("/") || /^[a-zA-Z]:/.test(posix) || posix.includes("..")) {
      issues.push(`target:unsafe:${posix}`);
      continue;
    }
    if (!posix.startsWith(`${DATASET_ROOT_DIR}/`)) {
      issues.push(`target:not-under-dataset:${posix}`);
      continue;
    }
    if (path.posix.basename(posix) !== DATASET_EXPORT_FILENAME) {
      issues.push(`target:not-positions-json:${posix}`);
      continue;
    }
    const abs = path.resolve(root, ...posix.split("/"));
    const dsWithSep = dsRoot.endsWith(path.sep) ? dsRoot : dsRoot + path.sep;
    if (abs !== dsRoot && !abs.startsWith(dsWithSep)) {
      issues.push(`target:outside-dataset:${posix}`);
      continue;
    }
    normalized.push(posix);
  }
  if (issues.length > 0) {
    return { ok: false, reason: "git-targets-invalid", issues };
  }
  return { ok: true, targets: uniqSorted(normalized) };
}

export async function runGitPreflight(args: {
  repoRoot: string;
  datasetRoot: string;
  expectedTargets: string[];
  /** When true, skip fetch (unit tests with fake remotes still call fetch). */
  fetchRemote?: boolean;
}): Promise<GitPreflightOk | GitFail> {
  const { repoRoot, datasetRoot } = args;
  const fetchRemote = args.fetchRemote !== false;

  const validated = validateGitTargetPaths(
    repoRoot,
    datasetRoot,
    args.expectedTargets
  );
  if (!validated.ok) return validated;
  const expectedTargets = validated.targets;

  const branchRes = await gitExec(repoRoot, [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);
  if (!branchRes.ok) {
    return {
      ok: false,
      reason: "git-branch-check-failed",
      issues: branchRes.issues,
    };
  }
  const branch = branchRes.stdout.trim();
  if (branch !== GIT_PUBLISH_BRANCH) {
    return {
      ok: false,
      reason: "wrong-branch",
      status: "WRONG_BRANCH",
      issues: [`branch:${branch}`, `required:${GIT_PUBLISH_BRANCH}`],
    };
  }

  const headRes = await gitExec(repoRoot, ["rev-parse", "HEAD"]);
  if (!headRes.ok) {
    return {
      ok: false,
      reason: "git-head-check-failed",
      issues: headRes.issues,
    };
  }
  const head = headRes.stdout.trim();

  const remoteRes = await gitExec(repoRoot, [
    "rev-parse",
    "--verify",
    `${GIT_PUBLISH_REMOTE}/${GIT_PUBLISH_BRANCH}`,
  ]);
  if (!remoteRes.ok) {
    return {
      ok: false,
      reason: "origin-main-missing",
      status: "ORIGIN_MISSING",
      issues: remoteRes.issues,
    };
  }

  const stagedRes = await gitExec(repoRoot, [
    "diff",
    "--cached",
    "--name-only",
  ]);
  if (!stagedRes.ok) {
    return {
      ok: false,
      reason: "git-staged-check-failed",
      issues: stagedRes.issues,
    };
  }
  const preStaged = stagedRes.stdout
    .split(/\r?\n/)
    .map((l) => toPosix(l.trim()))
    .filter(Boolean);
  if (preStaged.length > 0) {
    return {
      ok: false,
      reason: "pre-existing-staged-files",
      status: "PRE_EXISTING_STAGED",
      issues: preStaged.map((p) => `staged:${p}`),
    };
  }

  const statusRes = await gitExec(repoRoot, ["status", "--porcelain"]);
  if (!statusRes.ok) {
    return {
      ok: false,
      reason: "git-status-failed",
      issues: statusRes.issues,
    };
  }
  const porcelain = parsePorcelainStatus(statusRes.stdout);
  const baselineDirtyPaths = uniqSorted(porcelain.map((e) => e.path));
  const expectedSet = new Set(expectedTargets);
  const dirtyTargets = porcelain
    .map((e) => e.path)
    .filter((p) => expectedSet.has(p));
  if (dirtyTargets.length > 0) {
    return {
      ok: false,
      reason: "pre-existing-target-dirty",
      status: "PRE_EXISTING_TARGET_DIRTY",
      issues: uniqSorted(dirtyTargets).map((p) => `dirty-target:${p}`),
    };
  }

  if (fetchRemote) {
    const fetchRes = await gitExec(repoRoot, [
      "fetch",
      GIT_PUBLISH_REMOTE,
      GIT_PUBLISH_BRANCH,
    ]);
    if (!fetchRes.ok) {
      return {
        ok: false,
        reason: "git-fetch-failed",
        status: "FETCH_FAILED",
        issues: fetchRes.issues,
      };
    }
  }

  const originRes = await gitExec(repoRoot, [
    "rev-parse",
    `${GIT_PUBLISH_REMOTE}/${GIT_PUBLISH_BRANCH}`,
  ]);
  if (!originRes.ok) {
    return {
      ok: false,
      reason: "origin-main-missing",
      status: "ORIGIN_MISSING",
      issues: originRes.issues,
    };
  }
  const originMain = originRes.stdout.trim();
  if (head !== originMain) {
    const mergeBase = await gitExec(repoRoot, [
      "merge-base",
      "HEAD",
      `${GIT_PUBLISH_REMOTE}/${GIT_PUBLISH_BRANCH}`,
    ]);
    if (!mergeBase.ok) {
      return {
        ok: false,
        reason: "remote-diverged",
        status: "REMOTE_DIVERGED",
        issues: ["HEAD!=origin/main", "merge-base-failed"],
      };
    }
    const base = mergeBase.stdout.trim();
    if (base === head && base !== originMain) {
      return {
        ok: false,
        reason: "remote-ahead",
        status: "REMOTE_AHEAD",
        issues: ["origin/main-ahead-of-HEAD"],
      };
    }
    if (base === originMain && base !== head) {
      return {
        ok: false,
        reason: "local-ahead-unexpected",
        status: "LOCAL_AHEAD",
        issues: ["local-HEAD-ahead-of-origin/main"],
      };
    }
    return {
      ok: false,
      reason: "remote-diverged",
      status: "REMOTE_DIVERGED",
      issues: ["HEAD-and-origin/main-diverged"],
    };
  }

  const nameRes = await gitExec(repoRoot, ["config", "user.name"]);
  const emailRes = await gitExec(repoRoot, ["config", "user.email"]);
  if (!nameRes.ok || !nameRes.stdout.trim()) {
    return {
      ok: false,
      reason: "git-identity-missing",
      status: "GIT_IDENTITY_MISSING",
      issues: ["user.name:missing"],
    };
  }
  if (!emailRes.ok || !emailRes.stdout.trim()) {
    return {
      ok: false,
      reason: "git-identity-missing",
      status: "GIT_IDENTITY_MISSING",
      issues: ["user.email:missing"],
    };
  }

  return {
    ok: true,
    head,
    originMain,
    branch,
    baselineDirtyPaths,
    expectedTargets,
  };
}

export async function verifyPostWriteWorkingTree(args: {
  repoRoot: string;
  baselineDirtyPaths: string[];
  changedTargets: string[];
}): Promise<{ ok: true } | GitFail> {
  const statusRes = await gitExec(args.repoRoot, ["status", "--porcelain"]);
  if (!statusRes.ok) {
    return {
      ok: false,
      reason: "git-status-failed",
      issues: statusRes.issues,
    };
  }
  const porcelain = parsePorcelainStatus(statusRes.stdout);
  const dirty = uniqSorted(porcelain.map((e) => e.path));
  const allowed = new Set([
    ...args.baselineDirtyPaths.map(toPosix),
    ...args.changedTargets.map(toPosix),
  ]);
  const unexpected = dirty.filter((p) => !allowed.has(p));
  if (unexpected.length > 0) {
    return {
      ok: false,
      reason: "unexpected-dirty-paths",
      status: "UNEXPECTED_DIRTY",
      issues: unexpected.map((p) => `unexpected:${p}`),
    };
  }
  // Changed targets must appear dirty (unless somehow identical — should not happen)
  for (const t of args.changedTargets) {
    if (!dirty.includes(toPosix(t))) {
      return {
        ok: false,
        reason: "expected-target-not-dirty",
        issues: [`missing-dirty:${t}`],
      };
    }
  }
  return { ok: true };
}

export async function stageCommitAndPush(args: {
  repoRoot: string;
  datasetRoot: string;
  changedTargets: string[];
  commitMessage: string;
  fetchRemote?: boolean;
}): Promise<
  | {
      ok: true;
      status: "PUSHED";
      commit: string;
      targets: string[];
    }
  | (GitFail & {
      localCommit?: string;
      status?: string;
    })
> {
  const fetchRemote = args.fetchRemote !== false;
  const validated = validateGitTargetPaths(
    args.repoRoot,
    args.datasetRoot,
    args.changedTargets
  );
  if (!validated.ok) return validated;
  const targets = validated.targets;
  if (targets.length === 0) {
    return {
      ok: false,
      reason: "git-targets-empty",
      issues: ["changedTargets:empty"],
    };
  }

  // Re-check no pre-existing staged (race)
  const stagedBefore = await gitExec(args.repoRoot, [
    "diff",
    "--cached",
    "--name-only",
  ]);
  if (!stagedBefore.ok) {
    return {
      ok: false,
      reason: "git-staged-check-failed",
      issues: stagedBefore.issues,
    };
  }
  if (stagedBefore.stdout.trim()) {
    return {
      ok: false,
      reason: "pre-existing-staged-files",
      status: "PRE_EXISTING_STAGED",
      issues: stagedBefore.stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((p) => `staged:${toPosix(p)}`),
    };
  }

  // Target-only stage — never git add . / -A
  const addRes = await gitExec(args.repoRoot, ["add", "--", ...targets]);
  if (!addRes.ok) {
    return {
      ok: false,
      reason: "git-stage-failed",
      status: "STAGE_FAILED",
      issues: addRes.issues,
    };
  }

  const stagedAfter = await gitExec(args.repoRoot, [
    "diff",
    "--cached",
    "--name-only",
  ]);
  if (!stagedAfter.ok) {
    return {
      ok: false,
      reason: "git-staged-check-failed",
      issues: stagedAfter.issues,
    };
  }
  const stagedPaths = uniqSorted(
    stagedAfter.stdout
      .split(/\r?\n/)
      .map((l) => toPosix(l.trim()))
      .filter(Boolean)
  );
  const expected = uniqSorted(targets);
  if (
    stagedPaths.length !== expected.length ||
    stagedPaths.some((p, i) => p !== expected[i])
  ) {
    return {
      ok: false,
      reason: "staged-scope-mismatch",
      status: "STAGED_SCOPE_MISMATCH",
      issues: [
        `expected:${expected.join(",")}`,
        `staged:${stagedPaths.join(",")}`,
      ],
    };
  }

  // Validate each staged blob
  for (const t of expected) {
    const show = await gitExec(args.repoRoot, ["show", `:${t}`]);
    if (!show.ok) {
      return {
        ok: false,
        reason: "staged-blob-read-failed",
        issues: [`show:${t}`, ...show.issues],
      };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(show.stdout);
    } catch (e) {
      return {
        ok: false,
        reason: "staged-json-invalid",
        issues: [e instanceof Error ? e.message : String(e)],
      };
    }
    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      (Object.prototype.hasOwnProperty.call(raw, "publishOperation") ||
        Object.prototype.hasOwnProperty.call(raw, "publishFamilyPayload") ||
        Object.prototype.hasOwnProperty.call(raw, "sourceFamilyId") ||
        Object.prototype.hasOwnProperty.call(raw, "intent"))
    ) {
      return {
        ok: false,
        reason: "staged-command-metadata",
        issues: [`metadata-in:${t}`],
      };
    }
    let normalized;
    try {
      normalized = normalizeDatasetExport(raw as never);
    } catch (e) {
      return {
        ok: false,
        reason: "staged-normalize-failed",
        issues: [e instanceof Error ? e.message : String(e)],
      };
    }
    const v = validatePublishedExportCandidate(normalized);
    if (!v.ok) {
      return {
        ok: false,
        reason: "staged-dataset-validation-failed",
        issues: v.issues,
      };
    }
  }

  const msg = String(args.commitMessage ?? "").trim();
  if (!msg || msg.includes("\n") || msg.includes("\0")) {
    return {
      ok: false,
      reason: "commit-message-invalid",
      issues: ["commitMessage:unsafe"],
    };
  }

  const commitRes = await gitExec(args.repoRoot, [
    "commit",
    "-m",
    msg,
  ]);
  if (!commitRes.ok) {
    return {
      ok: false,
      reason: "publish-commit-failed",
      status: "PUBLISH_COMMIT_FAILED",
      issues: commitRes.issues,
    };
  }

  const newHeadRes = await gitExec(args.repoRoot, ["rev-parse", "HEAD"]);
  if (!newHeadRes.ok) {
    return {
      ok: false,
      reason: "git-head-check-failed",
      issues: newHeadRes.issues,
    };
  }
  const commit = newHeadRes.stdout.trim();

  // Commit tree paths — use name-only diff against parent
  const commitFiles = await gitExec(args.repoRoot, [
    "diff",
    "--name-only",
    "HEAD~1",
    "HEAD",
  ]);
  if (!commitFiles.ok) {
    return {
      ok: false,
      reason: "commit-tree-check-failed",
      issues: commitFiles.issues,
      localCommit: commit,
    };
  }
  const committed = uniqSorted(
    commitFiles.stdout
      .split(/\r?\n/)
      .map((l) => toPosix(l.trim()))
      .filter(Boolean)
  );
  if (
    committed.length !== expected.length ||
    committed.some((p, i) => p !== expected[i])
  ) {
    return {
      ok: false,
      reason: "commit-paths-mismatch",
      status: "COMMIT_PATHS_MISMATCH",
      issues: [
        `expected:${expected.join(",")}`,
        `committed:${committed.join(",")}`,
      ],
      localCommit: commit,
    };
  }

  if (fetchRemote) {
    const fetchRes = await gitExec(args.repoRoot, [
      "fetch",
      GIT_PUBLISH_REMOTE,
      GIT_PUBLISH_BRANCH,
    ]);
    if (!fetchRes.ok) {
      return {
        ok: false,
        reason: "git-fetch-failed",
        status: "LOCAL_COMMITTED_PUSH_FAILED",
        issues: fetchRes.issues,
        localCommit: commit,
      };
    }
  }

  const originRes = await gitExec(args.repoRoot, [
    "rev-parse",
    `${GIT_PUBLISH_REMOTE}/${GIT_PUBLISH_BRANCH}`,
  ]);
  if (!originRes.ok) {
    return {
      ok: false,
      reason: "origin-main-missing",
      status: "LOCAL_COMMITTED_PUSH_FAILED",
      issues: originRes.issues,
      localCommit: commit,
    };
  }
  const parentRes = await gitExec(args.repoRoot, ["rev-parse", "HEAD~1"]);
  if (!parentRes.ok) {
    return {
      ok: false,
      reason: "commit-parent-check-failed",
      status: "LOCAL_COMMITTED_PUSH_FAILED",
      issues: parentRes.issues,
      localCommit: commit,
    };
  }
  if (parentRes.stdout.trim() !== originRes.stdout.trim()) {
    return {
      ok: false,
      reason: "remote-changed-before-push",
      status: "REMOTE_CHANGED_BEFORE_PUSH",
      issues: ["HEAD~1!=origin/main"],
      localCommit: commit,
    };
  }

  const pushRes = await gitExec(args.repoRoot, [
    "push",
    GIT_PUBLISH_REMOTE,
    GIT_PUBLISH_BRANCH,
  ]);
  if (!pushRes.ok) {
    return {
      ok: false,
      reason: "push-failed",
      status: "LOCAL_COMMITTED_PUSH_FAILED",
      issues: pushRes.issues,
      localCommit: commit,
    };
  }

  if (fetchRemote) {
    await gitExec(args.repoRoot, [
      "fetch",
      GIT_PUBLISH_REMOTE,
      GIT_PUBLISH_BRANCH,
    ]);
  }
  const originAfter = await gitExec(args.repoRoot, [
    "rev-parse",
    `${GIT_PUBLISH_REMOTE}/${GIT_PUBLISH_BRANCH}`,
  ]);
  const headAfter = await gitExec(args.repoRoot, ["rev-parse", "HEAD"]);
  if (
    !originAfter.ok ||
    !headAfter.ok ||
    originAfter.stdout.trim() !== headAfter.stdout.trim()
  ) {
    return {
      ok: false,
      reason: "push-verify-failed",
      status: "LOCAL_COMMITTED_PUSH_FAILED",
      issues: ["HEAD!=origin/main-after-push"],
      localCommit: commit,
    };
  }

  return {
    ok: true,
    status: "PUSHED",
    commit,
    targets: expected,
  };
}

export function buildGitCommitMessage(args: {
  changedTargets: string[];
}): string {
  const targets = args.changedTargets.map(toPosix);
  if (targets.length === 1) {
    // dataset/{shot}/{system}/positions.json
    const parts = targets[0].split("/");
    if (parts.length >= 3) {
      const shot = parts[1];
      const system = parts[2];
      // Only allow safe path segments already validated
      if (shot && system && !shot.includes("..") && !system.includes("..")) {
        return `data(admin): publish ${shot}/${system}`;
      }
    }
  }
  return "data(admin): publish dataset updates";
}

/** Full or abbreviated commit SHA (host-resolved only; never client-supplied). */
const COMMIT_SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Phase 4-C — Read a committed blob via fixed `git show <sha>:<path>`.
 * Path must already be validateGitTargetPaths-approved.
 * Does not read working tree.
 */
export async function readCommittedBlobText(args: {
  repoRoot: string;
  commitSha: string;
  repoRelativePath: string;
}): Promise<{ ok: true; text: string } | GitFail> {
  const sha = String(args.commitSha ?? "").trim();
  if (!COMMIT_SHA_RE.test(sha)) {
    return {
      ok: false,
      reason: "commit-sha-invalid",
      issues: ["commitSha:format"],
      status: "FATAL_COMMIT_SHA",
    };
  }
  const posix = toPosix(String(args.repoRelativePath ?? "").trim());
  if (
    !posix ||
    posix.includes("..") ||
    posix.includes(":") ||
    posix.startsWith("/") ||
    /^[a-zA-Z]:/.test(posix)
  ) {
    return {
      ok: false,
      reason: "commit-blob-path-invalid",
      issues: [`path:unsafe:${posix}`],
      status: "FATAL_BLOB_PATH",
    };
  }
  if (!posix.startsWith(`${DATASET_ROOT_DIR}/`)) {
    return {
      ok: false,
      reason: "commit-blob-path-invalid",
      issues: [`path:not-under-dataset:${posix}`],
      status: "FATAL_BLOB_PATH",
    };
  }
  const show = await gitExec(args.repoRoot, ["show", `${sha}:${posix}`], {
    timeoutMs: 30_000,
  });
  if (!show.ok) {
    return {
      ok: false,
      reason: "commit-blob-read-failed",
      issues: [`show:${sha}:${posix}`, ...show.issues],
      status: "BLOB_READ_FAILED",
    };
  }
  return { ok: true, text: show.stdout };
}

/**
 * Resolve current HEAD to a full SHA (host-side only).
 */
export async function resolveHeadCommitSha(
  repoRoot: string
): Promise<{ ok: true; commitSha: string } | GitFail> {
  const head = await gitExec(repoRoot, ["rev-parse", "HEAD"]);
  if (!head.ok) {
    return {
      ok: false,
      reason: "head-resolve-failed",
      issues: head.issues,
      status: "HEAD_RESOLVE_FAILED",
    };
  }
  const sha = head.stdout.trim();
  if (!COMMIT_SHA_RE.test(sha)) {
    return {
      ok: false,
      reason: "head-sha-invalid",
      issues: ["HEAD:format"],
      status: "HEAD_RESOLVE_FAILED",
    };
  }
  return { ok: true, commitSha: sha };
}
