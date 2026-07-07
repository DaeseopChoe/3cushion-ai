# Batch4_Closure.md

```
Document  : Batch4_Closure.md
Version   : v1.0
Status    : Closure Complete
Date      : 2026-07-07
Baseline  : commit 02dd47f (STEP 4-4 MISC-004)
Closure   : docs(batch4): complete Batch4 closure and prepare Batch5
Standard  : AAS v2.0 + App_Migration_Map.md (Constitution)
```

---

## 1. Batch 4 목표 달성

| Migration ID | Target | 결과 |
|-------------|--------|------|
| **CAL-002** | `buildEffectiveRenderSysValues()` | ✅ `domain/calculator/systemValueCalculator.ts` |
| **CAL-003** | `buildSlotSysSnapshot()` | ✅ `domain/calculator/systemValueCalculator.ts` |
| **CAL-005** | `computeSysOverlayValues()` | ✅ `domain/calculator/systemValueCalculator.ts` |
| **MISC-004** | `resolveSlotSys()` | ✅ `domain/system/slotSysViewModel.ts` |

### STEP 커밋 (4 STEP, 4 commits)

| STEP | Commit | Title |
|------|--------|-------|
| 4-1 | `c91422e` | buildEffectiveRenderSysValues extraction (CAL-002) |
| 4-2 | `401d153` | SysOverlay runtime consolidation (CAL-005) |
| 4-3 | `e7623db` | recall runtime extraction (CAL-003) |
| 4-4 | `02dd47f` | resolveSlotSys ViewModel extraction (MISC-004) |

### 신규 파일 (3개)

| 파일 | 역할 |
|------|------|
| `domain/calculator/sysOverlayCalcHelpers.ts` | AD-B4-01 Option A — 순수 calc helper SSOT |
| `domain/calculator/systemValueCalculator.ts` | CAL-002/003/005 Calculation Domain SSOT |
| `domain/system/slotSysViewModel.ts` | MISC-004 Render SSOT ViewModel |

### App.jsx 변화

```
Before (Batch 3) : 5,807 lines
After  (Batch 4) : 5,640 lines
Delta            : −167 lines
```

---

## 2. Architecture Decisions (Batch 4)

| ID | 결정 |
|----|------|
| **AD-B4-01** | Option A — CAL-002 calc helper를 `sysOverlayCalcHelpers.ts`로 Domain co-location. Domain → Overlay 의존 금지. overlay/utils는 re-export만. |

---

## 3. Regression 결과

### 3-1. 공통 Regression (R-B4-C)

| ID | 항목 | 결과 |
|----|------|------|
| R-B4-C1 | `npm run build` exit 0 | ✅ PASS |
| R-B4-C2 | Import Graph: 순환참조 0 · 역방향 0 | ✅ PASS |
| R-B4-C3 | Sn/C4/C5/C6 Render SYS 불변 | ✅ PASS |
| R-B4-C4 | Trajectory 시각 불변 | ✅ PASS |
| R-B4-C5 | Overlay 기본 동작 불변 | ✅ PASS |
| R-B4-C6 | Domain → Presentation 역참조 0 · Flow 단방향 | ✅ PASS |

### 3-2. STEP Regression

| STEP | Regression IDs | 결과 |
|------|------------------|------|
| 4-1 CAL-002 | R-B4-1-1 ~ R-B4-1-8 | ✅ PASS |
| 4-2 CAL-005 | Overlay 실시간 SYS · 5½ Sn · non-5½ slide/draw · early return | ✅ PASS |
| 4-3 CAL-003 | Recall snapshot · hydrate · Published/Admin Recall | ✅ PASS |
| 4-4 MISC-004 | resolvedSlotSys · slotRenderSys · values · anchors · trajectory · AI | ✅ PASS |

> Regression은 move-only 기준으로 STEP Lock Rule 종료 시 각 STEP에서 검증. Closure 시 Final Build PASS 재확인.

---

## 4. Acceptance Criteria (AC-1 ~ AC-12)

| AC | 항목 | 결과 |
|----|------|------|
| AC-1 | npm run build exit 0 | ✅ PASS |
| AC-2 | Import Graph 순환/역방향 0 | ✅ PASS |
| AC-3 | Presentation 계산 제거 (SysOverlay inline calc) | ✅ PASS |
| AC-4 | Calculation Runtime Domain 이전 (CAL-002/003/005) | ✅ PASS |
| AC-5 | Flow 계산 제거 (`recallHydrateFlow` snapshot calc) | ✅ PASS |
| AC-6 | ViewModel Domain 이전 (MISC-004 `resolveSlotSys`) | ✅ PASS |
| AC-7 | D-008 Closed | ✅ PASS |
| AC-8 | 신규 Architecture Debt 없음 | ✅ PASS |
| AC-9 | Batch 4 Migration Map 목표 달성 | ✅ PASS |
| AC-10 | STEP Lock 4 commits | ✅ PASS |
| AC-11 | Named Export Only | ✅ PASS |
| AC-12 | `application/flows/` calculateByProfileExpr 직접 호출 0 | ✅ PASS |

---

## 5. Architecture Validation

### Import Graph (Batch 4 완료)

```
App.jsx (Orchestrator)
    ↓
application/flows/     (8 files — Batch 3)
    ↓
domain/
    ├── calculator/    systemValueCalculator.ts · sysOverlayCalcHelpers.ts · ...
    └── system/        slotSysViewModel.ts · systemIdentity.ts
    ↓
data/ · utils/
```

| 규칙 | 상태 |
|------|------|
| App = Orchestrator | ✅ 계산·ViewModel 생성 Domain 위임 |
| Flow = Runtime Logic orchestration | ✅ recallHydrateFlow 계산 제거 |
| Domain → Overlay | ✅ 0건 |
| Domain → application/flows | ✅ 0건 |
| application/flows → domain | ✅ 단방향 |
| calculateByProfileExpr SSOT | ✅ `systemValueCalculator.ts` (CAL-002/003/005) |

---

## 6. Migration Debt (Closure 시점)

| ID | 항목 | 상태 | 해소 Batch |
|----|------|------|-----------|
| D-006 | `SYSTEM_PROFILES` 직접 접근 | 🟡 Open | Batch 6 |
| D-007 | `getAnchorsForSystem` 직접 접근 | 🟡 Open | Batch 6 |
| **D-008** | `calculateByProfileExpr` Flow/App bypass | **✅ Closed** | Batch 4 |

---

## 7. Batch 5 Ready

| 항목 | 상태 |
|------|------|
| Batch 4 공식 종료 | ✅ |
| Batch 5 대상 | TRJ-001/003, RND-003, APP-009 — Trajectory Runtime |
| Blocker | **없음** |
| **판정** | **✅ Batch 5 Ready — Design 착수 가능** |

---

*End of Batch4_Closure.md v1.0*
