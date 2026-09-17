/**
 * Phase 4-A — Resolve repo-relative Published leaf path under a dataset root.
 * Client never supplies filesystem paths; Host owns REPO_DATASET_DIR.
 */

import path from "node:path";
import {
  buildDatasetExportPathSegments,
  DATASET_EXPORT_FILENAME,
  type DatasetExportPathSegments,
} from "../datasetPath";

export type ResolveRepoLeafPathOk = {
  ok: true;
  absolutePath: string;
  relativePosix: string;
  segments: DatasetExportPathSegments;
};

export type ResolveRepoLeafPathFail = {
  ok: false;
  reason: string;
  issues: string[];
};

export type ResolveRepoLeafPathResult =
  | ResolveRepoLeafPathOk
  | ResolveRepoLeafPathFail;

const DANGEROUS_SEGMENT = /(?:^|[\\/])\.\.(?:[\\/]|$)|^[\\/]|\0/;

function rejectDangerousRaw(label: string, raw: unknown): string | null {
  if (typeof raw !== "string") return `${label}:not-string`;
  const t = raw.trim();
  if (!t) return `${label}:empty`;
  if (DANGEROUS_SEGMENT.test(t)) return `${label}:traversal`;
  if (t.includes("\0")) return `${label}:nul`;
  // Absolute Windows / UNC / posix-like
  if (/^[a-zA-Z]:[\\/]/.test(t) || t.startsWith("\\\\")) {
    return `${label}:absolute-path`;
  }
  if (t.includes(":") && !/^[a-zA-Z0-9_.-]+$/.test(t)) {
    // allow normal ids; block drive-like
    if (/^[a-zA-Z]:/.test(t)) return `${label}:absolute-path`;
  }
  return null;
}

/**
 * Resolve absolute leaf path under datasetRoot.
 * Uses datasetPath SSOT for folder labels (Korean Unicode OK).
 */
export function resolvePublishedLeafAbsolutePath(
  datasetRoot: string,
  shotType: string,
  systemId: string
): ResolveRepoLeafPathResult {
  const issues: string[] = [];
  if (typeof datasetRoot !== "string" || !datasetRoot.trim()) {
    return {
      ok: false,
      reason: "dataset-root-invalid",
      issues: ["datasetRoot:empty"],
    };
  }

  for (const [label, raw] of [
    ["shotType", shotType],
    ["systemId", systemId],
  ] as const) {
    const err = rejectDangerousRaw(label, raw);
    if (err) issues.push(err);
  }
  if (issues.length > 0) {
    return { ok: false, reason: "identity-path-rejected", issues };
  }

  const root = path.resolve(datasetRoot);
  const segments = buildDatasetExportPathSegments(shotType, systemId);

  // Segments must not reintroduce traversal after sanitize.
  for (const [label, seg] of [
    ["shotTypeDir", segments.shotTypeDir],
    ["systemDir", segments.systemDir],
    ["fileName", segments.fileName],
  ] as const) {
    if (!seg || seg === "." || seg === ".." || seg.includes("..")) {
      issues.push(`${label}:unsafe`);
    }
    if (seg.includes("/") || seg.includes("\\")) {
      issues.push(`${label}:separator`);
    }
  }
  if (segments.fileName !== DATASET_EXPORT_FILENAME) {
    issues.push("fileName:must-be-positions.json");
  }
  if (issues.length > 0) {
    return { ok: false, reason: "segment-unsafe", issues };
  }

  const absolutePath = path.resolve(
    root,
    segments.shotTypeDir,
    segments.systemDir,
    segments.fileName
  );

  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (absolutePath !== root && !absolutePath.startsWith(rootWithSep)) {
    return {
      ok: false,
      reason: "path-outside-dataset-root",
      issues: ["resolved-path-escapes-dataset-root"],
    };
  }

  const relativePosix = [
    segments.shotTypeDir,
    segments.systemDir,
    segments.fileName,
  ].join("/");

  return {
    ok: true,
    absolutePath,
    relativePosix,
    segments,
  };
}
