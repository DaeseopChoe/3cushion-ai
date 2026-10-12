/**
 * History recall: one snapshot → in-memory session records.
 * APPROVED / PUBLISHED restore the approved graph exactly; PENDING restores
 * the base Family (it is resumed through the derived review, never published).
 */

import type { FamilyMember } from "../family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import type { PositionRecord } from "../positionSearchEngine";
import type { WorkHistoryApi, WorkHistoryApiFailure } from "./workHistoryClient";
import type { WorkHistoryIndexEntry, WorkHistorySnapshot } from "./workHistoryModel";

export type WorkHistoryRecallResult =
  | {
      ok: true;
      entry: WorkHistoryIndexEntry;
      snapshot: WorkHistorySnapshot;
      records: PositionRecord[];
      familyId: string | null;
      authoredRecord: PositionRecord | null;
      authoredMember: FamilyMember | null;
    }
  | WorkHistoryApiFailure;

export async function loadWorkHistorySnapshotForRecall(args: {
  api: WorkHistoryApi;
  snapshotId: string;
}): Promise<WorkHistoryRecallResult> {
  const read = await args.api.read(args.snapshotId);
  if (!read.ok) return read;
  const { entry, snapshot } = read;
  const graph =
    entry.status === "PENDING"
      ? snapshot.pendingFamilyGraph ?? null
      : snapshot.publishFamilyGraph ?? null;
  if (!graph) {
    return { ok: true, entry, snapshot, records: [], familyId: null, authoredRecord: null, authoredMember: null };
  }
  const mat = rematerializeFamilyPartsToPositionRecords({ masters: [graph.master], members: graph.members });
  if (!mat.ok) {
    return {
      ok: false,
      code: "SNAPSHOT_UNREADABLE",
      message: "History 기록을 화면용 데이터로 바꾸지 못했습니다.",
    };
  }
  const authoredMember = graph.members.find((m) => m.memberOrigin === "AUTHORED") ?? null;
  const authoredRecord = authoredMember
    ? mat.dataset.find((r) =>
        Object.values(r.strategies ?? {}).some((e) => e?.memberId === authoredMember.memberId)
      ) ?? null
    : null;
  return {
    ok: true,
    entry,
    snapshot,
    records: mat.dataset,
    familyId: graph.familyId,
    authoredRecord,
    authoredMember,
  };
}
