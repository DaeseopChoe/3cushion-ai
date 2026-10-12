/**
 * Publish input = the APPROVED graph recorded in the D History snapshot.
 * Reads one snapshot per selected id; PENDING / legacy rows are blocked.
 */

import { buildPublishClientItemFromSnapshot } from "../historyPublishInput";
import type { LocalPublishClientItem } from "../repoPublish/publishDatasetToLocalRepo";
import type { WorkHistoryApi, WorkHistoryApiFailure } from "./workHistoryClient";
import type { WorkHistorySnapshot } from "./workHistoryModel";

export type WorkHistoryPublishBlocked = { id: string; name: string; reason: string };

export type LoadPublishItemsResult =
  | {
      ok: true;
      items: LocalPublishClientItem[];
      blocked: WorkHistoryPublishBlocked[];
      snapshots: WorkHistorySnapshot[];
    }
  | WorkHistoryApiFailure;

const FATAL_CODES = new Set(["HOST_UNAVAILABLE", "INDEX_UNREADABLE", "INTERNAL"]);

export async function loadPublishItemsFromWorkHistory(args: {
  api: WorkHistoryApi;
  ids: string[];
}): Promise<LoadPublishItemsResult> {
  const items: LocalPublishClientItem[] = [];
  const blocked: WorkHistoryPublishBlocked[] = [];
  const snapshots: WorkHistorySnapshot[] = [];
  for (const id of args.ids ?? []) {
    const read = await args.api.read(id);
    if (!read.ok) {
      if (FATAL_CODES.has(read.code)) return read;
      blocked.push({
        id,
        name: id,
        reason: read.code === "NOT_FOUND" ? "history-not-found" : "history-unreadable",
      });
      continue;
    }
    const built = buildPublishClientItemFromSnapshot(read.snapshot);
    if (!built.ok) {
      blocked.push({ id, name: read.entry.name, reason: built.reason });
      continue;
    }
    items.push(built.item);
    snapshots.push(read.snapshot);
  }
  return { ok: true, items, blocked, snapshots };
}
