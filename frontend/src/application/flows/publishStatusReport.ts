// application/flows/publishStatusReport.ts
// Publish 성공 안내의 Published 현황 블록 (Family · Member · 파일 크기 · 처리 시간 · 규모 상태).
// Numbers come only from the host's commit-blob leaf summary; nothing is estimated.
//
// React import 금지. Hook 사용 금지. Named Export Only.

import type { PublishedLeafSummary } from "../../domain/repoPublish/publishedLeafSummary";

const KiB = 1024;
const MiB = 1024 * KiB;
const GiB = 1024 * MiB;

export const PUBLISHED_SPLIT_PREPARE_BYTES = 5 * MiB;
export const PUBLISHED_SPLIT_REQUIRED_BYTES = 10 * MiB;
export const PUBLISHED_DB_REVIEW_FAMILY_COUNT = 1_000;
export const PUBLISHED_DB_REVIEW_MEMBER_COUNT = 1_000_000;

export const PUBLISHED_STATUS_UNAVAILABLE_MESSAGE = "Published 현황을 읽지 못했습니다.";

export type PublishedLeafScale = {
  code: "DB_REVIEW" | "SPLIT_REQUIRED" | "SPLIT_PREPARE" | "NORMAL";
  label: string;
};

/** Operational guidance only — never a Publish failure. Uses raw byteLength. */
export function classifyPublishedLeafScale(
  s: Pick<PublishedLeafSummary, "familyCount" | "memberCount" | "byteLength">
): PublishedLeafScale {
  if (
    s.familyCount >= PUBLISHED_DB_REVIEW_FAMILY_COUNT ||
    s.memberCount >= PUBLISHED_DB_REVIEW_MEMBER_COUNT
  ) {
    return { code: "DB_REVIEW", label: "데이터베이스 전환 검토" };
  }
  if (s.byteLength >= PUBLISHED_SPLIT_REQUIRED_BYTES) {
    return { code: "SPLIT_REQUIRED", label: "분할 전환 필요" };
  }
  if (s.byteLength >= PUBLISHED_SPLIT_PREPARE_BYTES) {
    return { code: "SPLIT_PREPARE", label: "분할 준비" };
  }
  return { code: "NORMAL", label: "정상" };
}

export function formatPublishedFileSize(bytes: number): string {
  const b = Math.max(0, Math.floor(Number(bytes) || 0));
  if (b < KiB) return `${b}B`;
  const kb = Math.round(b / KiB);
  if (kb < 1024) return `${kb}KB`;
  const mb = b / MiB;
  if (Number(mb.toFixed(1)) < 1024) return `${mb.toFixed(1)}MB`;
  return `${(b / GiB).toFixed(1)}GB`;
}

export function formatPublishElapsed(ms: number): string {
  const v = Math.max(0, Number(ms) || 0);
  if (v < 1000) return "1초 미만";
  const totalSec = Math.round(v / 1000);
  if (totalSec < 60) return `${totalSec}초`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec === 0 ? `${min}분` : `${min}분 ${sec}초`;
}

function defaultNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

/** Times one awaited Publish request (excludes anything before / after, e.g. confirm dialogs). */
export async function timePublishCall<T>(
  call: () => Promise<T>,
  now: () => number = defaultNow
): Promise<{ result: T; elapsedMs: number }> {
  const start = now();
  const result = await call();
  return { result, elapsedMs: Math.max(0, now() - start) };
}

const ELAPSED_LABEL = "이번 Publish·검증 시간";

function leafBlock(s: PublishedLeafSummary, elapsedLine: string | null): string[] {
  const name = s.systemLabel?.trim() || s.systemId;
  return [
    `${s.shotType} · ${name} Published 현황`,
    `Family  ${s.familyCount.toLocaleString("ko-KR")}개`,
    `Member  ${s.memberCount.toLocaleString("ko-KR")}개`,
    `파일    ${formatPublishedFileSize(s.byteLength)}`,
    ...(elapsedLine ? [elapsedLine] : []),
    `상태    ${classifyPublishedLeafScale(s).label}`,
  ];
}

/**
 * Text appended after "HEAD: …" in the Publish success alert (starts with a blank line).
 * Single leaf: time inside the block. Multi leaf: one block each, time once at the end.
 */
export function buildPublishSuccessStatusText(args: {
  leafSummaries?: PublishedLeafSummary[] | null;
  elapsedMs: number;
  blockedLines?: string[];
}): string {
  const elapsedLine = `${ELAPSED_LABEL}  ${formatPublishElapsed(args.elapsedMs)}`;
  const summaries = Array.isArray(args.leafSummaries) ? args.leafSummaries : [];
  const out: string[] = [""];
  if (summaries.length === 0) {
    out.push(PUBLISHED_STATUS_UNAVAILABLE_MESSAGE, elapsedLine);
  } else if (summaries.length === 1) {
    out.push(...leafBlock(summaries[0], elapsedLine));
  } else {
    for (const s of summaries) out.push(...leafBlock(s, null), "");
    out.push(elapsedLine);
  }
  const blocked = args.blockedLines ?? [];
  if (blocked.length > 0) out.push("", ...blocked);
  return out.join("\n");
}
