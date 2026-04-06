# Transfer Document — Old chat → New chat (Cursor)

**목적:** 새 채팅 창에서 작업 연속성 유지 (대화 요약 · 확정 사항 · 미해결 · 다음 단계 · 참조 파일)

**작성 기준:** 2026-03-29 ~ 03-30 세션 누적 (궤적 SSOT, family 저장, recall, spin 보정, C3_r/C4, 문서·커밋)

---

## 1. Conversation Summary (대화 요약)

### 다룬 주제
- **Rendering SSOT:** 활성 슬롯만 사용 — `resolvedSlotSys = draft.sys ?? applied.sys`, `resolvedSlotSysValues = inputs ∪ outputs.result`. 렌더에서 `adminState.sys` 혼합 제거 방향.
- **Position 저장:** `positionId` = Ball3만, `createPositionId` (quantized). `PositionRecord.strategies` = `{ S1?, S2?, S3? }` 슬롯 맵, `upsertPositionRecord`로 family merge.
- **Recall (LOCK ON):** `recallPosition` — exact `positionId` 우선, 없으면 `calcBall3DistanceSum` 최소, **`RECALL_NEAREST_EPSILON_DEFAULT = 2.0`**. 성공 시 `applyPositionRecall` (draft만).
- **C4 누락:** 수식은 `C1_f`만 출력 → `updateDraftSys`에서 5_half 시 `Sn`, `C4_f`, `C5_f`, `C6_f`를 `outputs.result`에 확장.
- **C3_r:** `?? 0` 제거 → 입력 기반 주입 + `prevResult` 유지; 없으면 DEV `warn`/`error`, 5_half 체인은 `C3_r` 있을 때만 적용.
- **Spin Correction:** `App.jsx`에서 `pathNodesRaw` → `adjustedNodes` (C3 이후), progress decay, cross로 forward/reverse, `k≈0.015`. 앵커/sys/epsilon 로직 미변경.
- **디버그 로그:** `[SYS_VALUES]`, `[UPDATE_INPUTS]`, `[NEXT_RESULT]`(group), `[ANCHOR_INPUT]`, `[ANCHORS]` — `import.meta.env.DEV` 가드.
- **문서:** `5_PROJECT_MASTER_STATE_CURRENT`, `4_CALCULATION_RULES`, `3_SYSTEM_ARCHITECTURE`, `POSITION_RECALL_AND_SAVE_REDESIGN`, `PROJECT_LOG_2026-03` 하단 섹션 추가. 커밋 이력: 문서+코드 일괄 커밋(`20a194e` 등), 로그만 `35ae293`.

### 합의·확정
- 앵커 파이프(`anchorCoordinateEngine`, `sysToCoordFromAnchors`)는 spin 작업에서 **건드리지 않음**.
- path 단계에서만 spin 보정; `HIT_TOLERANCE` / `pathEndIndex` 로직 유지.

### 미해결·논의 여지
- **SysOverlay → App:** `system_values` vs `inputs`/`adjustedInputs` 불일치 시 슬롯 입력 공백 가능 — UX/저장 경로 추가 정리 여지.
- **Spin:** 누적 보정으로 오차 누적; `adminState.str?.spin` 사용 — 슬롯별 STR SSOT 정렬은 미정.
- **C7:** 앵커·path 노드 8번째 없음 — reflection 확장 시 연동.

---

## 2. Record of Decisions (결정 사항)

| 항목 | 결정 |
|------|------|
| 궤적 SSOT | `resolvedSlotSys` / `resolvedSlotSysValues` |
| 저장 | `positionId` + `strategies` 슬롯 맵, 레코드 단위 family |
| Recall | exact → nearest sum 거리, ε=2.0 |
| C4 체인 | `useShotSlots.ts` `updateDraftSys` 내 5_half 전용 확장 |
| C3_r | `nextResult`에 입력 기반 명시 주입; numeric fallback 제거 |
| Spin | `App.jsx` `spinPath*` 헬퍼 + `adjustedNodes` 루프 |
| 프로덕션 로그 | 핵심 5종은 DEV 가드만 |
| 문서 | 마스터/규칙/아키텍처/리콜/로그에 2026-03-30 전후 내용 반영 |

---

## 3. Next Step Proposals (새 창에서 이어갈 작업)

1. **SYS 저장 경로:** `SysOverlay` payload를 `updateDraftSys`가 확실히 읽도록 `system_values` → `numericInputs` 매핑 정리.
2. **Spin:** non-accumulative 옵션, `STR` ↔ 활성 슬롯 `draft/applied.str` 연동 검토.
3. **검증:** Position LOCK → recall, S1/S2/S3 저장·병합, spin ON/OFF 시각적 회귀 테스트.
4. **C7/reflection:** 설계만 로그에 있음 — 구현 시 `pathNodesRaw` 길이 확장부터.

---

## 4. Reference Files (참조 파일)

### 코드 (핵심)
| 경로 | 비고 |
|------|------|
| `frontend/src/App.jsx` | `resolvedSlotSys*` useMemo, `getAnchorsForRendering` 전후, `spinPath*` + `pathNodes` 보정, SYS overlay onSave |
| `frontend/src/hooks/useShotSlots.ts` | `updateDraftSys` (C3_r, 5_half result), `applyPositionRecall` |
| `frontend/src/domain/positionRecallEngine.ts` | `recallPosition`, `calcBall3DistanceSum`, ε 기본값 |
| `frontend/src/domain/positionId.ts` | `createPositionId` |
| `frontend/src/domain/positionMergeEngine.ts` | `upsertPositionRecord`, normalize |
| `frontend/src/domain/positionSearchEngine.ts` | `PositionRecord`, `SlotStrategiesMap` |

### 문서
| 경로 | 비고 |
|------|------|
| `작업관리/5_PROJECT_MASTER_STATE_CURRENT.md` | CURRENT ENGINE STATE, positionId/recall §5 |
| `작업관리/4_CALCULATION_RULES.md` | SPIN + TRAJECTORY CORRECTION RULE |
| `작업관리/3_SYSTEM_ARCHITECTURE.md` | TRAJECTORY RENDERING LAYER, Data Flow |
| `작업관리/POSITION_RECALL_AND_SAVE_REDESIGN.md` | POSITION ID + FAMILY STRUCTURE |
| `작업관리/PROJECT_LOG_2026-03.md` | `# 2026-03-30 — Trajectory Engine Upgrade` 절 |

### 기타
- `작업관리/MIGRATION_HANDOFF_CURSOR.md` (있으면) — 마이그레이션 메모
- 이미지: 이관 템플릿 스크린샷은 Cursor workspace `assets/` 경로에 보관됨 (사용자 첨부)

---

## 5. Cursor에 넘길 한 줄 요청 (새 채팅용)

> 이 프로젝트는 `작업관리/SESSION_TRANSFER_2026-03-30.md`와 `PROJECT_LOG_2026-03.md` (2026-03-30 섹션)을 먼저 읽고 이어서 작업해 줘. 궤적은 `resolvedSlotSysValues` → 앵커 → `pathNodesRaw` → spin `adjustedNodes` 순이고, 저장은 `positionId`+family, recall은 ε=2.0이다.

---

*생성: Cursor 세션 이관용. 필요 시 날짜만 바꿔 복제.*
