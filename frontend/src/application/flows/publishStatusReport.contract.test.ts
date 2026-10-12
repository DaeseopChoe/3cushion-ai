/**
 * Publish 성공 안내 — Published 현황 블록.
 *
 * 6  Single leaf: system name, Family, Member, file size, Publish·검증 time, status
 * 7  Multi leaf: one block per leaf, total time shown once
 * 8  Scale status boundaries (raw byteLength; DB review wins)
 * 9  Elapsed format; overwrite retry = retry request time only
 * 10 Summary unavailable → short notice only, Publish success unchanged
 * 11 Handler wiring: both verified branches append the status; no regression
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildPublishSuccessStatusText,
  classifyPublishedLeafScale,
  formatPublishedFileSize,
  formatPublishElapsed,
  PUBLISHED_STATUS_UNAVAILABLE_MESSAGE,
  timePublishCall,
} from "./publishStatusReport";

const here = dirname(fileURLToPath(import.meta.url));
const SETTINGS = readFileSync(join(here, "../../hooks/useSettings.js"), "utf8");

const MiB = 1024 * 1024;

const BACK = {
  shotType: "뒤돌리기",
  systemId: "5_half_system",
  systemLabel: "파이브앤하프",
  familyCount: 1,
  memberCount: 960,
  byteLength: 780 * 1024,
};

function lines(text: string): string[] {
  return text.split("\n");
}

describe("6 — single leaf status block", () => {
  it("shows system, counts, size, elapsed, status", () => {
    const text = buildPublishSuccessStatusText({ leafSummaries: [BACK], elapsedMs: 24_000 });
    expect(lines(text)).toEqual([
      "",
      "뒤돌리기 · 파이브앤하프 Published 현황",
      "Family  1개",
      "Member  960개",
      "파일    780KB",
      "이번 Publish·검증 시간  24초",
      "상태    정상",
    ]);
  });

  it("uses Korean thousands separators and falls back to systemId without a label", () => {
    const text = buildPublishSuccessStatusText({
      leafSummaries: [{ ...BACK, systemLabel: undefined, familyCount: 1200, memberCount: 9840 }],
      elapsedMs: 3_000,
    });
    expect(text).toContain("뒤돌리기 · 5_half_system Published 현황");
    expect(text).toContain("Family  1,200개");
    expect(text).toContain("Member  9,840개");
  });

  it("appends blocked rows after the status with a blank line", () => {
    const text = buildPublishSuccessStatusText({
      leafSummaries: [BACK],
      elapsedMs: 24_000,
      blockedLines: ["Publish하지 않은 항목:", "- 행 A"],
    });
    expect(text.endsWith("상태    정상\n\nPublish하지 않은 항목:\n- 행 A")).toBe(true);
  });
});

describe("7 — multi leaf", () => {
  it("one block per leaf; total time once, after the blocks", () => {
    const side = {
      shotType: "옆돌리기",
      systemId: "plus2_system",
      systemLabel: "플러스투",
      familyCount: 3,
      memberCount: 1250,
      byteLength: 920 * 1024,
    };
    const big = { ...BACK, familyCount: 12, memberCount: 9840, byteLength: Math.round(7.6 * MiB) };
    const text = buildPublishSuccessStatusText({ leafSummaries: [big, side], elapsedMs: 31_000 });
    expect(lines(text)).toEqual([
      "",
      "뒤돌리기 · 파이브앤하프 Published 현황",
      "Family  12개",
      "Member  9,840개",
      "파일    7.6MB",
      "상태    분할 준비",
      "",
      "옆돌리기 · 플러스투 Published 현황",
      "Family  3개",
      "Member  1,250개",
      "파일    920KB",
      "상태    정상",
      "",
      "이번 Publish·검증 시간  31초",
    ]);
    expect(text.match(/이번 Publish·검증 시간/g)).toHaveLength(1);
  });
});

describe("8 — scale status", () => {
  const at = (byteLength: number, familyCount = 1, memberCount = 1) =>
    classifyPublishedLeafScale({ familyCount, memberCount, byteLength }).label;

  it("byte thresholds use raw byteLength", () => {
    expect(at(5 * MiB - 1)).toBe("정상");
    expect(at(5 * MiB)).toBe("분할 준비");
    expect(at(10 * MiB - 1)).toBe("분할 준비");
    expect(formatPublishedFileSize(10 * MiB - 1)).toBe("10.0MB");
    expect(at(10 * MiB)).toBe("분할 전환 필요");
  });

  it("Family ≥ 1,000 or Member ≥ 1,000,000 → DB review, over every size status", () => {
    expect(at(1, 999, 999_999)).toBe("정상");
    expect(at(1, 1000, 1)).toBe("데이터베이스 전환 검토");
    expect(at(1, 1, 1_000_000)).toBe("데이터베이스 전환 검토");
    expect(at(10 * MiB, 1000, 1)).toBe("데이터베이스 전환 검토");
    expect(at(5 * MiB, 1, 1_000_000)).toBe("데이터베이스 전환 검토");
  });

  it("file size units", () => {
    expect(formatPublishedFileSize(0)).toBe("0B");
    expect(formatPublishedFileSize(512)).toBe("512B");
    expect(formatPublishedFileSize(798_720)).toBe("780KB");
    expect(formatPublishedFileSize(Math.round(7.6 * MiB))).toBe("7.6MB");
    expect(formatPublishedFileSize(1024 * MiB)).toBe("1.0GB");
  });
});

describe("9 — elapsed time", () => {
  it("format", () => {
    expect(formatPublishElapsed(0)).toBe("1초 미만");
    expect(formatPublishElapsed(999)).toBe("1초 미만");
    expect(formatPublishElapsed(1_000)).toBe("1초");
    expect(formatPublishElapsed(24_400)).toBe("24초");
    expect(formatPublishElapsed(95_000)).toBe("1분 35초");
    expect(formatPublishElapsed(120_000)).toBe("2분");
  });

  it("timePublishCall measures only the awaited request (injected clock)", async () => {
    let t = 1_000;
    const now = () => t;
    const first = await timePublishCall(async () => {
      t += 2_000;
      return "conflict";
    }, now);
    t += 60_000; // admin reads the overwrite confirm
    const retry = await timePublishCall(async () => {
      t += 5_000;
      return "verified";
    }, now);
    expect(first).toEqual({ result: "conflict", elapsedMs: 2_000 });
    expect(retry).toEqual({ result: "verified", elapsedMs: 5_000 });
  });

  it("timePublishCall rethrows without swallowing", async () => {
    await expect(
      timePublishCall(async () => {
        throw new Error("boom");
      }, () => 0)
    ).rejects.toThrow("boom");
  });

  it("handler: first request timed before the confirm, retry timed after it and used on retry success", () => {
    const handler = SETTINGS.slice(
      SETTINGS.indexOf("const handlePublishSnapshots"),
      SETTINGS.indexOf("workHistoryApi: api,")
    );
    const firstTimed = handler.search(
      /timePublishCall\(\(\) =>\s*publishDatasetToLocalRepoWithGit\(items\)\s*\)/
    );
    const confirm = handler.indexOf("window.confirm(");
    const retryTimed = handler.search(
      /timePublishCall\(\(\) =>\s*publishDatasetToLocalRepoWithGit\(retryItems\)\s*\)/
    );
    expect(firstTimed).toBeGreaterThan(-1);
    expect(confirm).toBeGreaterThan(firstTimed);
    expect(retryTimed).toBeGreaterThan(confirm);
    expect(handler).not.toMatch(/await publishDatasetToLocalRepoWithGit\(/);

    const retryBranch = handler.slice(
      handler.indexOf('if (retry.ok && retry.status === "PRODUCTION_VERIFIED") {'),
      handler.indexOf("return { ok: true, successfulIds };")
    );
    expect(retryBranch).toContain("leafSummaries: retry.leafSummaries");
    expect(retryBranch).toContain("elapsedMs: retryTimed.elapsedMs");
    expect(retryBranch).not.toContain("firstTimed.elapsedMs");
  });
});

describe("10 — summary unavailable", () => {
  it("short notice + time only; never zero counts or sizes", () => {
    for (const leafSummaries of [undefined, []]) {
      const text = buildPublishSuccessStatusText({ leafSummaries, elapsedMs: 24_000 });
      expect(lines(text)).toEqual([
        "",
        PUBLISHED_STATUS_UNAVAILABLE_MESSAGE,
        "이번 Publish·검증 시간  24초",
      ]);
      expect(text).not.toMatch(/Family|Member|파일|0개|0B/);
    }
    expect(PUBLISHED_STATUS_UNAVAILABLE_MESSAGE).toBe("Published 현황을 읽지 못했습니다.");
  });
});

describe("11 — handler wiring (no regression)", () => {
  const handler = SETTINGS.slice(
    SETTINGS.indexOf("const handlePublishSnapshots"),
    SETTINGS.indexOf("workHistoryApi: api,")
  );
  const branches = ["retry", "result"].map((v) => {
    const start = handler.indexOf(`if (${v}.ok && ${v}.status === "PRODUCTION_VERIFIED") {`);
    return handler.slice(start, handler.indexOf("return { ok: true, successfulIds };", start));
  });

  it("both verified branches keep success copy + History mark and append the status", () => {
    for (const b of branches) {
      expect(b).toContain("refreshPublishedDataset");
      expect(b).toContain("api.markPublished({ snapshotIds: successfulIds");
      expect(b).toContain("Publish 완료");
      expect(b).toContain("Published 데이터 검증까지 완료되었습니다.");
      expect(b).toContain("HEAD: ");
      expect(b).toContain("buildPublishSuccessStatusText(");
      expect(b).not.toContain("blockedLines.join");
      expect(b.indexOf("api.markPublished({ snapshotIds: successfulIds")).toBeLessThan(
        b.indexOf("buildPublishSuccessStatusText(")
      );
    }
    expect(branches[1]).toContain("leafSummaries: result.leafSummaries");
    expect(branches[1]).toContain("elapsedMs: firstTimed.elapsedMs");
  });

  it("strict success gate and manual LocalDB policy unchanged", () => {
    expect(handler).toContain('result.ok && result.status === "PRODUCTION_VERIFIED"');
    expect(handler).toContain('retry.ok && retry.status === "PRODUCTION_VERIFIED"');
    expect(SETTINGS).not.toContain("applyPostPublishLocalCleanup");
    expect(handler).not.toContain("localStorage");
  });
});
