import { useState } from 'react';
import { TrajectoryPhase } from './useTrajectoryState';
import { SYSTEM_PROFILES } from '../data/systems';
import { calculateByProfileExpr } from '../utils/systemCalculator';
import { buildTrajectorySamples } from '../utils/trajectorySampleBuilder';
import type { StrategyEntry } from '../domain/positionSearchEngine';

// ==========================================
// Types (중복 없이 정리)
// ==========================================

export type SlotId = 'S1' | 'S2' | 'S3';

export interface DraftState {
  sys?: any;
  hpt?: any;
  str?: any;
  ai?: any;
  meta?: { recommendedFrom?: { positionId: string; score: number } };
}

export interface SlotState {
  // SlotState는 draft와 applied 모두 DraftState | null
  draft: DraftState | null;
  applied: DraftState | null;
}

export interface ShotEditorState {
  activeSlot: SlotId;
  slots: {
    S1: SlotState;
    S2: SlotState;
    S3: SlotState;
  };
}

// ==========================================
// Hook
// ==========================================

export function useShotSlots() {
  const [shotEditor, setShotEditor] = useState<ShotEditorState>({
    activeSlot: 'S1',
    slots: {
      S1: { draft: null, applied: null },
      S2: { draft: null, applied: null },
      S3: { draft: null, applied: null }
    }
  });

  // ==========================================
  // Actions
  // ==========================================

  /**
   * 현재 슬롯에 APPLIED trajectory 저장
   * APPLIED 상태만 저장 가능
   * (기존 trajectory 관리형 SlotState 인터페이스와 DraftState 기반 구조가 다르니 실제 draft/applied 단위 저장이 아니라면 필요없음)
   * 이 예시에서는 적용하지 않음
   */
  
  /**
   * 슬롯 전환(activeSlot만 변경)
   */
  const switchSlot = (slotId: SlotId) => {
    setShotEditor(prev => ({
      ...prev,
      activeSlot: slotId
    }));
  };

  /**
   * 슬롯 복제
   * Draft와 applied를 모두 deep copy
   */
  const duplicateSlot = (sourceSlotId: SlotId, targetSlotId: SlotId) => {
    const sourceSlot = shotEditor.slots[sourceSlotId];
    if (!sourceSlot) return;

    setShotEditor(s => ({
      ...s,
      slots: {
        ...s.slots,
        [targetSlotId]: {
          draft: sourceSlot.draft ? structuredClone(sourceSlot.draft) : null,
          applied: sourceSlot.applied ? structuredClone(sourceSlot.applied) : null
        }
      }
    }));
  };

  // ==========================================
  // Draft 계산 로직 (핵심) - 시스템 독립성, base 값 고정, 이중 구조 적용
  // ==========================================
  /**
   * Draft(임시) sys 갱신 및 result/debug outputs 계산
   * - 시스템 전환 또는 입력 변화 시 즉시 실행
   * - APPLIED 데이터는 절대 수정 X
   */
  const updateDraftSys = (slotId: SlotId, nextSystemId: string, inputDelta: any) => {
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevDraftSys = slot.draft?.sys ?? {};
      const prevInputs = prevDraftSys.inputs ?? {};
      const prevSystemId = prevDraftSys.systemId;

      // -------- [1] 입력 통합(가독성 주석) --------
      // 이전 입력에 delta 반영(시스템ID, 코렉션 등)
      const candidateInputs = {
        ...prevInputs,
        ...inputDelta,
      };

      // -------- [2] 시스템ID 전환 판단 --------
      let baseThreeC: number;
      let baseOneC: number;
      if (prevSystemId !== nextSystemId) {
        // 시스템이 바뀌었으면 새로운 base 값 세팅 (입력에서 받아오거나 0)
        baseThreeC = typeof candidateInputs.C3 === "number" ? candidateInputs.C3 : 0;
        baseOneC = typeof candidateInputs.CO === "number" ? candidateInputs.CO : 0;
      } else {
        // 기존 시스템이면 이전 값 유지
        baseThreeC = typeof prevInputs.baseThreeC === "number" ? prevInputs.baseThreeC
          : (typeof prevInputs.C3 === "number" ? prevInputs.C3 : 0);
        baseOneC = typeof prevInputs.baseOneC === "number" ? prevInputs.baseOneC
          : (typeof prevInputs.CO === "number" ? prevInputs.CO : 0);
      }

      // 확정 입력 (입력 필드/코렉션/base 동시 포함)
      const nextInputs = {
        ...candidateInputs,
        baseThreeC,
        baseOneC,
      };

      // -------- [3] SYSTEM_PROFILES + calculateByProfileExpr 기반 계산 (시스템 공통) --------
      const profile = SYSTEM_PROFILES[nextSystemId];
      const exprInputs: Record<string, number> = { ...nextInputs } as Record<string, number>;

      let calcResult: Record<string, number> = {};
      if (profile?.formula?.expr) {
        calcResult = calculateByProfileExpr(profile.formula.expr, exprInputs);
      }

      console.log(
        "[STEP6-A]",
        "system:", nextSystemId,
        "expr:", profile?.formula?.expr,
        "result:", calcResult
      );

      const prevOutputs = slot.draft?.sys?.outputs || {};
      const prevResult = prevOutputs.result || {};
      const prevDebug = prevOutputs.debug || {};

      // -------- [4] draft.sys 구성, 상태 업데이트 --------
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: {
              ...(slot.draft || {}),
              sys: {
                systemId: nextSystemId,
                inputs: nextInputs,
                outputs: {
                  result: {
                    ...prevResult,
                    ...calcResult,
                  },
                  debug: {
                    ...prevDebug,
                    expr: profile?.formula?.expr ?? null,
                    exprInputs,
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  /*
    [전략 스냅샷 적용 전 요약]
    - 깊은 복사 방식: 최신 표준 structuredClone(slot.draft) 사용 (JSON 방식 불가).
    - 검증 기준: draft.sys.outputs.result.oneC가 반드시 숫자인지 확인. 아니면 적용 불가 및 사유 반환.
    - FORMULAS 등 재계산 없이 draft 내용을 있는 그대로 applied에 복사, draft와 applied는 서로 독립적으로 유지.
    - hook 반환 객체에 actions.applyDraft 등록.
    (유의: structuredClone은 최신 브라우저/런타임 표준입니다.)
  */

  // Draft 검증 함수 (expr/output 기반, 하드코딩 키 미사용)
  const validateDraft = (slotId: SlotId): { ok: true } | { ok: false; reason: string } => {
    const slot = shotEditor.slots[slotId];
    const draft = slot.draft;
    if (!draft) {
      return { ok: false, reason: "Draft 데이터가 없습니다." };
    }

    const result = draft.sys?.outputs?.result;
    if (!result || typeof result !== "object") {
      return { ok: false, reason: "draft.sys.outputs.result가 없습니다." };
    }
    const firstVal = Object.values(result)[0];
    if (typeof firstVal !== "number" || Number.isNaN(firstVal)) {
      return { ok: false, reason: "계산 결과값이 숫자가 아닙니다." };
    }
    return { ok: true };
  };

  // Draft.hpt/str/ai -> Applied.hpt/str/ai 확정 (오버레이 "적용" 시 호출)
  const applyHptToSlot = (slotId: SlotId, data: DraftState['hpt']) => {
    if (data == null) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevApplied = slot.applied ?? {};
      const cloned = structuredClone(data);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: { ...(slot.draft ?? {}), hpt: cloned },
            applied: { ...prevApplied, hpt: cloned },
          },
        },
      };
    });
  };

  const applyStrToSlot = (slotId: SlotId, data: DraftState['str']) => {
    if (data == null) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevApplied = slot.applied ?? {};
      const cloned = structuredClone(data);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: { ...(slot.draft ?? {}), str: cloned },
            applied: { ...prevApplied, str: cloned },
          },
        },
      };
    });
  };

  const applyAiToSlot = (slotId: SlotId, data: DraftState['ai']) => {
    if (data == null) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevApplied = slot.applied ?? {};
      const cloned = structuredClone(data);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: { ...(slot.draft ?? {}), ai: cloned },
            applied: { ...prevApplied, ai: cloned },
          },
        },
      };
    });
  };

  // Draft.sys -> Applied.sys 확정 함수
  const applyDraftSys = (slotId: SlotId): { ok: true } | { ok: false; reason: string } => {
    const slot = shotEditor.slots[slotId];
    const draftSys = slot?.draft?.sys;

    // draft.sys 가 없으면 아무 작업도 하지 않음
    if (!draftSys) {
      return { ok: false, reason: "draft.sys가 존재하지 않습니다." };
    }

    let clonedSys: typeof draftSys;
    try {
      clonedSys = structuredClone(draftSys);
    } catch (err) {
      return { ok: false, reason: "structuredClone 실패: " + String(err) };
    }

    setShotEditor((s) => {
      const currentSlot = s.slots[slotId];
      const prevApplied = currentSlot.applied;

      // applied 가 null 이면 새 객체 생성, 존재하면 sys 만 교체
      const nextApplied: DraftState = prevApplied
        ? { ...prevApplied, sys: clonedSys }
        : { sys: clonedSys };

      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...currentSlot,
            applied: nextApplied,
          },
        },
      };
    });

    return { ok: true };
  };

  // ==========================================
  // [Save 로직 v1.4] applied 데이터만 저장 + 궤적 파생 + 시뮬레이션 저장
  // ==========================================
  /**
   * shot_record와 trajectory_samples 생성 후 저장 (localStorage or 서버 전송)
   * - applied 상태가 하나도 없으면 실행하지 않음
   * - draft는 절대 저장/계산에 사용하지 않음
   * - 저장/전송 뒤 알림 반환(성공/실패)
   */
  const saveShot = () => {
    // Step 1. applied 데이터만 취합 (Draft 배제)
    const appliedSlots = Object.entries(shotEditor.slots).filter(
      ([, slot]) => slot.applied != null
    );

    if (appliedSlots.length === 0) {
      alert("적용된(APPLIED) 전략이 없는 슬롯입니다.");
      return { ok: false, reason: "No applied slot" };
    }

    // shotRecord 구조 v1.4: meta, slots(S1/S2/S3: applied or null)
    const shotRecord = {
      meta: {
        createdAt: Date.now(),
        version: "v1.4",
      },
      slots: {
        S1: shotEditor.slots.S1.applied ? structuredClone(shotEditor.slots.S1.applied) : null,
        S2: shotEditor.slots.S2.applied ? structuredClone(shotEditor.slots.S2.applied) : null,
        S3: shotEditor.slots.S3.applied ? structuredClone(shotEditor.slots.S3.applied) : null,
      }
    };

    // Step 2. trajectory_samples 생성 유틸 호출
    let trajectorySamples;
    try {
      const slotList = (
        ["S1", "S2", "S3"] as const
      ).flatMap((id) => (shotEditor.slots[id].applied ? [shotEditor.slots[id]] : []));
      trajectorySamples = buildTrajectorySamples(
        slotList,
        `pos_${shotRecord.meta.createdAt}`,
        slotList[0]?.applied?.sys?.systemId ?? "5_half_system"
      );
    } catch (e) {
      alert("trajectory_samples 생성 오류: " + String(e));
      return { ok: false, reason: "trajectory_samples error" };
    }

    // Step 3. payload 및 고유 키명, 저장 & 최근 키 기록
    const payload = {
      shotRecord,
      trajectorySamples,
      savedAt: new Date().toISOString()
    };
    const shotKey = `shot_${shotRecord.meta.createdAt}`;
    try {
      localStorage.setItem(shotKey, JSON.stringify(payload));
      localStorage.setItem("lastSavedShotId", shotKey);
      alert("샷이 성공적으로 저장되었습니다. (로컬)");
      if (console.table) {
        console.group("[SaveShot] 저장된 Payload");
        console.table([
          { key: "shotKey", value: shotKey },
          { key: "savedAt", value: payload.savedAt },
          { key: "version", value: shotRecord.meta.version }
        ]);
        console.log("shotRecord:", shotRecord);
        console.log("trajectorySamples:", trajectorySamples);
        console.groupEnd();
      }
      return { ok: true, shotKey };
    } catch (err) {
      alert("저장 실패: " + String(err));
      return { ok: false, reason: "localStorage error" };
    }
  };

  /**
   * StrategyEntry를 draft에만 로딩 (applied 절대 수정 안 함)
   * 관리자 자동 추천용
   */
  const loadDraftFromStrategyEntry = (
    slotId: SlotId,
    entry: StrategyEntry | null,
    meta?: { positionId: string; score: number }
  ) => {
    if (!entry) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: {
              sys: {
                systemId: entry.signature.systemId,
                inputs: entry.sysInputs ?? {},
              },
              hpt: entry.hpT,
              str: entry.str,
              ai: entry.ai,
              meta: meta ? { recommendedFrom: meta } : undefined,
            },
          },
        },
      };
    });
  };

  /**
   * 슬롯 삭제 (draft/applied 모두 null로)
   */
  const deleteSlot = (slotId: SlotId) => {
    setShotEditor(s => ({
      ...s,
      slots: {
        ...s.slots,
        [slotId]: { draft: null, applied: null }
      }
    }));
  };

  /**
   * 현재 활성 슬롯 가져오기
   */
  const getActiveSlot = (): SlotState => {
    return shotEditor.slots[shotEditor.activeSlot];
  };

  /**
   * 모든 슬롯 가져오기
   */
  const getAllSlots = (): SlotState[] => {
    return Object.values(shotEditor.slots);
  };

  /**
   * APPLIED 슬롯만 가져오기 (Save용)
   */
  const getAppliedSlots = (): SlotState[] => {
    return Object.values(shotEditor.slots).filter(
      slot => slot.applied != null
    );
  };

  // ==========================================
  // Return
  // ==========================================

  return {
    shotEditor,
    actions: {
      switchSlot,
      duplicateSlot,
      updateDraftSys,
      validateDraft,
      applyDraftSys,
      applyHptToSlot,
      applyStrToSlot,
      applyAiToSlot,
      loadDraftFromStrategyEntry,
      saveShot,
      deleteSlot,
      getActiveSlot,
      getAllSlots,
      getAppliedSlots
    }
  };
}
