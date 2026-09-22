/**
 * Phase D-3 — History ONE Publish UX contracts.
 * User-facing Manual Export removed; strict SUCCESS = PRODUCTION_VERIFIED only.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, rel), "utf8");
}

describe("Phase D-3 — History ONE Publish UX", () => {
  const modal = read("../../components/WorkspaceHistoryModal.jsx");
  const settings = read("../../hooks/useSettings.js");
  const app = read("../../App.jsx");

  it("single user-facing action: Publish only (no Manual Export / folder picker)", () => {
    expect(modal).toContain("onPublish");
    expect(modal).toMatch(/\{busy \? "Publishing…" : "Publish"\}/);
    expect(modal).not.toContain("수동 Export");
    expect(modal).not.toContain("onExport");
    expect(modal).not.toContain("showDirectoryPicker");
    expect(modal).not.toContain("resolveExportRootDir");
    expect(modal).toContain("Delete");
    expect(modal).toContain("닫기");
    expect(app).not.toMatch(/onExport=\{handleExportSnapshots\}/);
    expect(app).toMatch(/onPublish=\{handlePublishSnapshots\}/);
    expect(app).toMatch(/publishInFlight=\{publishInFlight\}/);
  });

  it("Publish handler is snapshot-bound and does not open folder picker", () => {
    const fnStart = settings.indexOf("const handlePublishSnapshots");
    const fnEnd = settings.indexOf("const handleRepoOnlyPublishSnapshots");
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    const body = settings.slice(fnStart, fnEnd);
    expect(body).toContain("readPublishOperationFromSnapshot");
    expect(body).toContain("readPublishFamilyPayloadFromSnapshot");
    expect(body).toContain("publishDatasetToLocalRepoWithGit");
    expect(body).not.toContain("showDirectoryPicker");
    expect(body).not.toContain("resolveExportRootDir");
    expect(body).not.toContain("saveDatasetExportToFile");
    // Does not rebuild Family from Local DB
    expect(body).not.toContain("loadRematerializedWorkingCorpus");
    expect(body).not.toContain("normalizeDatasetFromStorage");
  });

  it("strict SUCCESS: PRODUCTION_VERIFIED only marks exported", () => {
    const fnStart = settings.indexOf("const handlePublishSnapshots");
    const fnEnd = settings.indexOf("const handleRepoOnlyPublishSnapshots");
    const body = settings.slice(fnStart, fnEnd);
    expect(body).toContain('result.status === "PRODUCTION_VERIFIED"');
    expect(body).toContain("updateSnapshotsExported(successfulIds)");
    // Soft success on push/timeout must be gone
    expect(body).not.toMatch(
      /gitStatus === "PUSHED"[\s\S]{0,200}updateSnapshotsExported/
    );
    expect(body).not.toMatch(
      /PRODUCTION_VERIFY_TIMEOUT[\s\S]{0,120}updateSnapshotsExported/
    );
    // Success copy says Publish, not Export
    expect(body).toContain("Publish 완료");
    expect(body).not.toContain("Export 완료");
    expect(body).not.toContain("개 Git Publish");
  });

  it("in-flight lock prevents duplicate Publish invocation", () => {
    expect(settings).toContain("publishInFlightRef");
    expect(settings).toContain('reason: "publish-in-flight"');
    expect(settings).toContain("setPublishInFlight(true)");
    expect(settings).toContain("setPublishInFlight(false)");
    expect(modal).toContain("publishInFlight");
    expect(modal).toContain("localPublishBusyRef");
    expect(modal).toMatch(/disabled=\{publishDisabled\}/);
    expect(modal).toMatch(/disabled=\{deleteDisabled\}/);
    expect(modal).toContain("if (busy) return");
  });

  it("selection is kept until success; failure retains pending", () => {
    expect(modal).toContain("Do NOT clear selection before await");
    expect(modal).toContain("result?.ok && Array.isArray(result.successfulIds)");
    expect(modal).toContain(
      "setSelectedIds((prev) => prev.filter((id) => !done.has(id)))"
    );
  });

  it("failure UX is stage-aware and does not claim completion", () => {
    expect(settings).toContain("formatPublishFailureStage");
    expect(settings).toContain("formatPublishRetryHint");
    expect(settings).toContain("Publish가 완료되지 않았습니다.");
    expect(settings).toContain("Published 완료로 표시하지 않았습니다.");
    expect(settings).toContain(
      "Git Push까지 완료됐지만 배포 확인 시간이 초과되었습니다."
    );
  });

  it("internal Manual Export helper may remain unwired (not user-facing)", () => {
    // Classification: USER UI DEAD wiring; INTERNAL path kept for migration/tests
    expect(settings).toContain("handleExportSnapshots");
    expect(settings).toContain("saveDatasetExportToFile");
    expect(app).not.toContain("onExport=");
    expect(modal).not.toContain("onExport");
  });
});
