/**
 * Phase 4-B — Fixed Git CLI execution (execFile only).
 * No shell interpolation. No client-supplied args.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitExecOk = {
  ok: true;
  stdout: string;
  stderr: string;
  code: 0;
};

export type GitExecFail = {
  ok: false;
  reason: string;
  stdout: string;
  stderr: string;
  code: number | null;
  issues: string[];
};

export type GitExecResult = GitExecOk | GitExecFail;

const ALLOWED_GIT_SUBCOMMANDS = new Set([
  "status",
  "diff",
  "add",
  "commit",
  "push",
  "fetch",
  "rev-parse",
  "config",
  "show",
  "log",
  "symbolic-ref",
  "merge-base",
  /** F-2G-2 — target-scoped assume-unchanged clear for Publish dirty visibility */
  "update-index",
]);

/**
 * Run `git <args>` in repoRoot via execFile (no shell).
 * Caller must pass only fixed allowlisted subcommands + validated paths.
 */
export async function gitExec(
  repoRoot: string,
  args: readonly string[],
  options?: { timeoutMs?: number }
): Promise<GitExecResult> {
  if (typeof repoRoot !== "string" || !repoRoot.trim()) {
    return {
      ok: false,
      reason: "git-repo-root-invalid",
      stdout: "",
      stderr: "",
      code: null,
      issues: ["repoRoot:empty"],
    };
  }
  if (!Array.isArray(args) || args.length === 0) {
    return {
      ok: false,
      reason: "git-args-empty",
      stdout: "",
      stderr: "",
      code: null,
      issues: ["args:empty"],
    };
  }
  const sub = args[0];
  if (!ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
    return {
      ok: false,
      reason: "git-subcommand-not-allowlisted",
      stdout: "",
      stderr: "",
      code: null,
      issues: [`subcommand:${sub}`],
    };
  }
  // Reject shell metacharacters in any arg.
  for (const a of args) {
    if (typeof a !== "string") {
      return {
        ok: false,
        reason: "git-arg-invalid",
        stdout: "",
        stderr: "",
        code: null,
        issues: ["arg:not-string"],
      };
    }
    if (/[\0\n\r]/.test(a)) {
      return {
        ok: false,
        reason: "git-arg-invalid",
        stdout: "",
        stderr: "",
        code: null,
        issues: ["arg:control-char"],
      };
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "git",
      ["-c", "core.quotepath=false", ...args],
      {
        cwd: repoRoot,
        timeout: options?.timeoutMs ?? 60_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      }
    );
    return {
      ok: true,
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
      code: 0,
    };
  } catch (e: unknown) {
    const err = e as {
      code?: number | string;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    const code =
      typeof err.code === "number"
        ? err.code
        : err.code === "ENOENT"
          ? null
          : null;
    return {
      ok: false,
      reason:
        err.code === "ENOENT" ? "git-not-found" : "git-command-failed",
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? err.message ?? ""),
      code,
      issues: [String(err.stderr ?? err.message ?? "git failed")],
    };
  }
}
