/**
 * ADMIN-only Undo + Recall Origin SSOT hook.
 * App.jsx wires capture/restore; this hook owns undoStack vs recallOriginSnapshot.
 *
 * Mutations that return a restore snapshot use a state ref so React Strict Mode
 * double-invoking setState updaters cannot double-pop the undo stack.
 */

import { useCallback, useRef, useState } from "react";
import {
  type AdminAuthoredEditSnapshot,
  type AdminEditHistoryState,
  type AdminEditTransactionLabel,
  beginAdminEditTransaction,
  canUndoAdminEdit,
  cancelAdminEditTransaction,
  clearAdminEditHistory,
  commitAdminEditTransaction,
  createEmptyAdminEditHistoryState,
  hasAdminRecallOrigin,
  isAdminEditAtRecallOrigin,
  recallAdminEditToOrigin,
  recordAdminEditBefore,
  replaceRecallOrigin,
  undoAdminEdit,
} from "../domain/admin/adminEditHistory";

export type { AdminAuthoredEditSnapshot, AdminEditTransactionLabel };

export function useAdminEditHistory() {
  const [state, setState] = useState<AdminEditHistoryState>(
    createEmptyAdminEditHistoryState
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback((next: AdminEditHistoryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const captureRecallOrigin = useCallback(
    (origin: AdminAuthoredEditSnapshot) => {
      apply(replaceRecallOrigin(createEmptyAdminEditHistoryState(), origin));
    },
    [apply]
  );

  const clearHistory = useCallback(() => {
    apply(clearAdminEditHistory(createEmptyAdminEditHistoryState()));
  }, [apply]);

  const beginTransaction = useCallback(
    (before: AdminAuthoredEditSnapshot) => {
      apply(beginAdminEditTransaction(stateRef.current, before));
    },
    [apply]
  );

  const cancelTransaction = useCallback(() => {
    apply(cancelAdminEditTransaction(stateRef.current));
  }, [apply]);

  const commitTransaction = useCallback(
    (current: AdminAuthoredEditSnapshot, label?: AdminEditTransactionLabel) => {
      apply(commitAdminEditTransaction(stateRef.current, current, label));
    },
    [apply]
  );

  const recordBefore = useCallback(
    (before: AdminAuthoredEditSnapshot) => {
      apply(recordAdminEditBefore(stateRef.current, before));
    },
    [apply]
  );

  const undo = useCallback((): AdminAuthoredEditSnapshot | null => {
    const result = undoAdminEdit(stateRef.current);
    apply(result.state);
    return result.restore;
  }, [apply]);

  const recallToOrigin = useCallback((): AdminAuthoredEditSnapshot | null => {
    const result = recallAdminEditToOrigin(stateRef.current);
    apply(result.state);
    return result.restore;
  }, [apply]);

  return {
    canUndo: canUndoAdminEdit(state),
    hasRecallOrigin: hasAdminRecallOrigin(state),
    /** Internal Origin — never surface as UI label "Recall Origin". */
    recallOriginSnapshot: state.recallOriginSnapshot,
    isAtRecallOrigin: (current: AdminAuthoredEditSnapshot) =>
      isAdminEditAtRecallOrigin(stateRef.current, current),
    captureRecallOrigin,
    clearHistory,
    beginTransaction,
    cancelTransaction,
    commitTransaction,
    recordBefore,
    undo,
    recallToOrigin,
  };
}
