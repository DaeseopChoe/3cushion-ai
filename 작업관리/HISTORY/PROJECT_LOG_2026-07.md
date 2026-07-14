# PROJECT_LOG_2026-07

Version : v1.7  
Period : 2026-07  
Status : Active Project Log

---

# 2026-07-14 (STEP4 Final Complete)

## 제목

SPS STEP4 System Inventory **Final v1.0** — Frozen Assets 선언 · STEP5 Architecture Audit Ready

## Summary

STEP4-1~STEP4-4 및 STEP4 Inventory Assets(v0.7)를 통합한 `System_Inventory.md`를 **STEP4 Final (v1.0)** 로 공식 완료하였다.
Runtime / Registry / Loader / Contract / JSON은 변경하지 않았다.

## STEP4 Final Summary

| 항목 | 내용 |
|------|------|
| **SSOT** | `System Platform Standard (SPS) v1.0/System_Inventory.md` **v1.0 Final** |
| **Systems** | 38 (`SYS-001` … `SYS-038`) |
| **판정** | **STEP4 Final · Complete** |
| **Next** | **STEP5 Architecture Audit** |

## Completed Tracks

- Package Inventory (Discovery · Inventory Table) completed
- Observation SSOT completed
- Metadata Inventory completed
- Registration Inventory completed
- Inventory Assets (§19 Reference Entry Point) completed
- STEP4 Final declared
- Frozen Assets / Frozen Rules declared (§20)
- STEP5 Architecture Audit ready

## Frozen Assets (official STEP5+ inputs)

- Inventory Rule
- Observation SSOT
- System Inventory Table
- Observation Catalog
- Metadata Observation Catalog
- Metadata Shape Matrix
- Registration Matrix
- Registration Fact Matrix
- Inventory Assets

## Freeze Constraints

- Inventory ID · Observation Code **변경 금지**
- 신규 Inventory / Observation / Asset **생성 금지** (STEP4 범위 종료)

## Related Project Docs Synced

- `PROJECT_MASTER_INDEX.md` v1.19 — Current Stage → STEP5
- `3_SYSTEM_ARCHITECTURE.md` — STEP4 → STEP5~7 flow note
- `4_CALCULATION_RULES.md` — No update required

---

# 2026-07-13 (Batch 6 Complete — Final Freeze)

## 제목

AAS Runtime Migration Batch 6 완료 — Runtime Contract / Registry / Loader · Import Graph Gate · Public API Closure · **Final Freeze**

## Batch6 Summary

| 항목 | 내용 |
|------|------|
| **목적** | System JSON 직접 접근 제거 · Runtime Contract / Registry / Loader · Debt D-005/006/007/009/010 Closure |
| **Design** | Batch6 Design v1.0 **Frozen** (Contract First · AD-B6-01~10 · INV-B6-01~05 · AC-21) |
| **완료 날짜** | 2026-07-13 |
| **판정** | **Batch 6 Completed · Final Freeze** |
| **Final Code** | `ec71ef9` — `feat(batch6): STEP 6-7 public api closure import graph gate` |

## Final Architecture

```text
data/systems/<id>/*.json
  → runtime/loader/systemPackageStore.ts
  → runtime/loader/systemLoader.ts          (assemble, no cache)
  → SystemContract (immutable, frozen)
  → runtime/registry/systemRegistry.ts      (cache; Public Entry)
  → getSystemContract(systemId)
  → extractTrajectoryContractView(contract) (pure projection)
  → App / Flow / Domain / Hooks / Renderer
```

## Runtime Contract Completion

| Artifact | Role |
|----------|------|
| `SystemContract` | Assembled SSOT · Serializable Shape · Immutable |
| `TrajectoryContractView` | Pure projection · not cached |
| Registry | Sole Public Entry · owns cache |
| Loader | Sole assembler · no cache · JSON via package store |

## Import Graph Gate Completion

| Gate | Result |
|------|--------|
| Main Tree → `data/systems` | **0** |
| Consumer → `runtime/loader` | **0** |
| Main Tree → `SYSTEM_PROFILES` / `getAnchorsForSystem` | **0** |

## Public API Closure

**Public:** `getSystemContract` · `listRegisteredSystemIds` · `isRegistered` · `extractTrajectoryContractView` · `SYSTEM_CONTRACT_VERSION` · types

**Not Public:** `bootstrapRegistry` · Loader · `systemPackageStore` · `assembleSystemContract`

**Deprecated (removed from public export):** `SYSTEM_PROFILES` · `getAnchorsForSystem`

## Commit Chain (Final)

| STEP | Commit | Title |
|------|--------|-------|
| 6-1 | `cc6c456` | runtime scaffold (registry/loader/contract) |
| cleanup | `55e110a` | restrict bootstrapRegistry to runtime internal API |
| 6-2 | `48da1d5` | trajectory safety contract supply (D-009) |
| 6-3 | `7763085` | renderer labelStrategy contract supply (D-005) |
| 6-4 | `fe1fb1a` | app flows contract profile anchors (D-006/D-007) |
| 6-5 | `197331e` | domain contract profile anchors (D-006/D-007) |
| 6-6 | `ca60cfa` | hooks overlay contract supply (D-006) |
| **6-7** | **`ec71ef9`** | **public api closure import graph gate** |

## Debt Closure

| ID | Status |
|----|--------|
| D-005 | **Closed** |
| D-006 | **Closed (Final)** |
| D-007 | **Closed (Final)** |
| D-009 | **Closed** |
| D-010 | **Closed** |

**Batch 6 Remaining Debt (scope):** None

## Final Validation PASS

| Gate | Result |
|------|--------|
| Build (`npm run build`) | ✅ PASS |
| Regression R-B6-C | ✅ PASS |
| Import Graph Gate | ✅ PASS |
| AC-1 ~ AC-21 | ✅ PASS |
| Serializable Contract | ✅ PASS |
| Batch5 parity | ✅ PASS (algorithm unchanged) |
| Design Freeze | ✅ Maintained |
| Code change at docs freeze | **Docs only** (no Implementation / Architecture change) |

## Closure Documents

| 문서 | 역할 |
|------|------|
| `Batch06/Batch6_Final_Freeze.md` | Final Freeze SSOT |
| `Batch06/Batch6_Architecture_Completion_Report.md` | Architecture Completion Report |
| `SESSION_HANDOFF_CURSOR.md` | Next session handoff |
| `PROJECT_MASTER_INDEX.md` | Current state SSOT (v1.18) |

## Batch 6 공식 종료

- **Final Commit (Code):** `ec71ef9`
- **Status:** **Completed · Final Freeze**
- **AAS Runtime Migration Batch 1~6:** **Complete**
- **Next:** **STEP 4 — System Inventory** (SPS)

---

# 2026-07-08 (Batch 5 Complete — Closure)

## 제목

AAS Runtime Migration Batch 5 완료 — Trajectory Runtime Domain 이전 · Release Gate PASS · Batch 6 Ready

## Batch5 Summary

| 항목 | 내용 |
|------|------|
| **목적** | App.jsx trajectory inline build 제거 · Domain Builder SSOT · Reflection Policy · Renderer/Flow/Overlay 분리 · App Orchestrator only |
| **Design SSOT** | `Batch05/Batch5_Design.md` v1.0 (Frozen) · `Batch5_Analysis.md` v1.1 (Frozen) |
| **완료 날짜** | 2026-07-08 |
| **Release Gate** | **PASS** — Build · Architecture · Import Graph · ADR · Invariant · Decision Freeze 유지 |
| **판정** | **Batch 5 Closed · Release Approved** |

## 완료 STEP (5-1 ~ 5-8)

| STEP | 요약 |
|------|------|
| **5-1** | `pathNodeHelpers.ts` — cushion path node·rail hit pure helpers (TRJ-001) |
| **5-2** | `reflectionPolicy.ts` — C2 reflection policy SSOT, Builder delegate (TRJ-003) |
| **5-3** | `trajectoryBuilder.ts` corrected branch — single `buildTrajectory()` entry (TRJ-001) |
| **5-4** | `trajectoryBuilder.ts` baseline branch — corrected + baseline dual path (TRJ-001) |
| **5-5A** | `baselineDraftState.ts` — baseline draft overlay React state (APP-009-A) |
| **5-5B** | `baselineHandleGeometry.ts` — Rg ↔ SYS handle forward/inverse geometry (APP-009-B) |
| **5-6** | `trajectoryPathAttrModel.ts` · `baselineHandleModel.ts` — Renderer display models (RND-003) |
| **5-7A** | `trajectoryHydrateFlow.ts` — slot → adminState + trajectory hydrate sequence (AD-B5-07) |
| **5-7B** | `baselineDraftApplyFlow.ts` — baseline draft Apply sequence (APP-009-C) |
| **5-8** | App.jsx integration — thin wrapper 제거 · wiring-only · Orchestrator 정리 (APP-009) |

## Commit History (9 commits)

| STEP | Commit | Title |
|------|--------|-------|
| 5-1 | `3074b47` | feat(batch5): STEP 5-1 path node helpers (TRJ-001) |
| 5-2 | `bf67205` | feat(batch5): STEP 5-2 reflection policy (TRJ-003) |
| 5-3 | `c91e38b` | feat(batch5): STEP 5-3 trajectory builder corrected (TRJ-001) |
| 5-4 | `733f972` | feat(batch5): STEP 5-4 trajectory builder baseline (TRJ-001) |
| 5-5A | `9c00f01` | feat(batch5): STEP 5-5A baseline draft state (APP-009-A) |
| 5-5B | `b019e18` | feat(batch5): STEP 5-5B baseline handle geometry (APP-009-B) |
| 5-6 | `a8a9f62` | feat(batch5): STEP 5-6 baseline handle model + path attr model (RND-003) |
| 5-7A/7B | `77cb359` | feat(batch5): STEP 5-7B baseline draft apply flow (APP-009-C) * |
| 5-8 | `04e341b` | feat(batch5): STEP 5-8 application integration (APP-009) |

\* STEP 5-7A `trajectoryHydrateFlow.ts`는 `77cb359` commit에 co-included.

## 신규 파일 (Batch 5)

| 파일 | Migration ID |
|------|-------------|
| `domain/trajectory/pathNodeHelpers.ts` | TRJ-001 |
| `domain/trajectory/reflectionPolicy.ts` | TRJ-003 |
| `domain/trajectory/trajectoryBuilder.ts` | TRJ-001 / AD-B5-01/02/06 |
| `domain/trajectory/baselineHandleGeometry.ts` | APP-009-B |
| `overlay/state/baselineDraftState.ts` | APP-009-A |
| `renderer/trajectory/trajectoryPathAttrModel.ts` | AD-B5-09 |
| `renderer/trajectory/baselineHandleModel.ts` | AD-B5-11 |
| `application/flows/trajectoryHydrateFlow.ts` | AD-B5-07 |
| `application/flows/baselineDraftApplyFlow.ts` | AD-B5-08 |

## App.jsx 변화

```
Before (Batch 4) : 5,640 lines
After  (Batch 5) : ~3,903 lines
Delta            : ~−1,737 lines (trajectory inline → Domain/Flow/Renderer)
역할             : Orchestrator only — buildTrajectory() 단일 호출 · Flow dispatch · Renderer wiring
```

## Architecture Achievement

- **Domain Runtime Ownership** — trajectory 생성·reflection·path SSOT: `domain/trajectory/`
- **Reflection Policy Separation** — `reflectionPolicy.ts` 경유 only (INV-B5-05)
- **Trajectory Builder SSOT** — `buildTrajectory()` single entry (AD-B5-06)
- **Renderer Ownership** — `TrajectoryBuildResult` 소비 only (INV-B5-02/06)
- **Application Flow** — hydrate/apply sequencing: `trajectoryHydrateFlow` · `baselineDraftApplyFlow`
- **Overlay Runtime** — `baselineDraftState` React state only
- **App Orchestrator** — inline trajectory calc 0 (INV-B5-03)
- **Single Builder Entry** — App → `buildTrajectory()` 1 call site
- **Result SSOT** — `TrajectoryBuildResult` → Renderer · Flow context

## Validation (Release Gate)

| 항목 | 결과 |
|------|------|
| Release Gate | ✅ **PASS** |
| Build (`npm run build`) | ✅ PASS |
| Architecture (AD-B5-01~11) | ✅ PASS |
| Import Graph | ✅ PASS |
| Regression | ✅ PASS (no defects discovered) |
| ADR | ✅ PASS |
| Invariant (INV-B5-01~07) | ✅ PASS |
| Decision Freeze | ✅ 유지 (Analysis/Design/Constitution/ADR 변경 없음) |

Manual QA (4 systems × trajectory cases × baseline ON/OFF): Release **Blocking 아님** — Post-close Follow-up 권장.

## Remaining Debt

| ID | 항목 | 상태 | 해소 예정 |
|----|------|------|----------|
| CL-006 | `trajectoryPathDisplayPolicy` rehome | Open (Optional) | Unscheduled |
| D-005 | `labelStrategy` / `systemIdForGrid` renderer 직접 분기 | Open | Batch 6 |
| D-006 | `SYSTEM_PROFILES` 직접 접근 | Open | Batch 6 |
| D-009 | Reflection safety interim read | Open | Batch 6 |

**Batch 5 신규 Debt:** 없음

## Batch 5 공식 종료

- **Batch 5 Code Baseline:** `04e341b` — `feat(batch5): STEP 5-8 application integration (APP-009)`
- **Batch 5 Closed · Release Approved**
- **Batch 6 Ready** — Runtime Contract / Registry · D-005/D-006/D-009 해소

---

# 2026-07-07 (Batch 4 Complete — Closure)

## 제목

AAS Runtime Migration Batch 4 완료 — Calculation Runtime Domain 이전 · Batch 5 Ready

## Summary

Batch 4 STEP 4-1 ~ 4-4 전체 구현을 완료하고, Closure 절차(Regression · Acceptance Criteria · Architecture 검증 · 문서 업데이트)를 수행하여 Batch 4를 공식 종료하였다. D-008 Closed.

## Major Accomplishments

### 1. Batch 4 STEP 구현 완료 (4 STEP, 4 commits)

| STEP | Commit | Title |
|------|--------|-------|
| 4-1 | `c91422e` | buildEffectiveRenderSysValues extraction (CAL-002) |
| 4-2 | `401d153` | SysOverlay runtime consolidation (CAL-005) |
| 4-3 | `e7623db` | recall runtime extraction (CAL-003) |
| 4-4 | `02dd47f` | resolveSlotSys ViewModel extraction (MISC-004) |

### 2. 신규 파일 (3개)

- `domain/calculator/sysOverlayCalcHelpers.ts` — AD-B4-01 Option A calc helper SSOT
- `domain/calculator/systemValueCalculator.ts` — CAL-002/003/005 Calculation Domain SSOT
- `domain/system/slotSysViewModel.ts` — MISC-004 `resolveSlotSys()` ViewModel

### 3. App.jsx 변화

```
Before (Batch 3) : 5,807 lines
After  (Batch 4) : 5,640 lines
Delta            : −167 lines
```

### 4. Regression 결과

- 공통 Regression R-B4-C1~C6: **전체 PASS**
- STEP Regression STEP 4-1~4-4: **전체 PASS**
- Closure Final Build: **PASS** (229 modules)

### 5. Acceptance Criteria (AC-1~AC-12)

| AC | 항목 | 결과 |
|----|------|------|
| AC-1 | npm run build exit 0 | ✅ PASS |
| AC-2 | Import Graph 순환/역방향 0 | ✅ PASS |
| AC-3 | Presentation 계산 제거 (SysOverlay) | ✅ PASS |
| AC-4 | Calculation Runtime Domain 이전 (CAL-002/003/005) | ✅ PASS |
| AC-5 | Flow 계산 제거 (recallHydrateFlow) | ✅ PASS |
| AC-6 | ViewModel Domain 이전 (MISC-004) | ✅ PASS |
| AC-7 | D-008 Closed | ✅ PASS |
| AC-8 | 신규 Architecture Debt 없음 | ✅ PASS |
| AC-9 | Batch 4 Migration Map 목표 달성 | ✅ PASS |
| AC-10 | STEP Lock 4 commits | ✅ PASS |
| AC-11 | Named Export Only | ✅ PASS |
| AC-12 | application/flows/ calculateByProfileExpr 직접 호출 0 | ✅ PASS |

### 6. Architecture 결과

- App = Orchestrator 유지 — Domain 계산·ViewModel 위임
- `application/flows/` → `domain/` 단방향
- Domain → Overlay / application 역참조 0
- `calculateByProfileExpr` SSOT: `systemValueCalculator.ts`

### 7. Migration Debt 상태

| Debt | 상태 | 해소 예정 |
|------|------|----------|
| D-006 | Open | Batch 6 (SYSTEM_PROFILES 직접 접근) |
| D-007 | Open | Batch 6 (getAnchorsForSystem 직접 접근) |
| **D-008** | **Closed** | Batch 4 (calculateByProfileExpr Flow/App bypass) |

### 8. Batch 4 공식 종료

- Closure commit: `docs(batch4): complete Batch4 closure and prepare Batch5`
- **Batch 5 Ready** — TRJ-001/003, RND-003, APP-009 Trajectory Runtime

---

# 2026-07-07 (Batch 3 Complete — Closure)

## 제목

AAS Runtime Migration Batch 3 완료 — Application Flow Layer 분리 · Batch 4 Ready

## Summary

Batch3_Design.md(v1.0) 기준 STEP 3-1 ~ 3-8 전체 구현을 완료하고, Closure 절차(Regression · Acceptance Criteria · Architecture 검증 · 문서 업데이트)를 수행하여 Batch 3를 공식 종료하였다.

## Major Accomplishments

### 1. Batch 3 STEP 구현 완료 (9 STEP, 9 commits)

| STEP | Commit | Title |
|------|--------|-------|
| 3-1 | `252be8f` | onePointLibrary persistence extraction (AI-002) |
| 3-2 | `4f0aac6` | dataset infrastructure extraction (DS-001 DS-004 DS-005 MISC-002) |
| 3-3 | `eca7e19` | recallHydrate flow extraction (CAL-004) |
| 3-4 | `2af68b6` | reset flow extraction (SRCH-004) |
| 3-5 | `778e2d4` | admin LocalDB flow extraction (SRCH-001) |
| 3-6 | `e13d183` | published search flow extraction (SRCH-002 SRCH-003) |
| 3-7A | `38fe4b2` | save flow extraction (SRCH-005 DS-002) |
| 3-7B | `e35c600` | history flow extraction (DS-003) |
| 3-8 | `b7d7712` | ballDragFlow extraction (CAL-006) |

### 2. 신규 파일 (11개)

- `application/flows/` — 8개 (recallHydrateFlow, resetFlow, adminLocalDbFlow, adminSearchFlow, userSearchFlow, saveFlow, historyFlow, ballDragFlow)
- `domain/lesson/onePointLibrary.ts` — 1개 (AI-002)
- `domain/dataset/infra/datasetStorage.ts` — 1개 (DS-001 + DS-004)
- `domain/dataset/autoCapture.ts` — 1개 (MISC-002)

### 3. App.jsx 변화

```
Before (Batch 2) : 6,509 lines
After  (Batch 3) : 5,807 lines
Delta            : −702 lines
```

### 4. Regression 결과

- 공통 Regression R-B3-C1~C8: **전체 PASS**
- STEP Regression STEP 3-1~3-8: **전체 PASS**

### 5. Acceptance Criteria (AC-1~AC-17)

| AC | 항목 | 결과 |
|----|------|------|
| AC-1 | npm run build exit 0 | ✅ PASS |
| AC-2 | App.jsx ~5,400 lines (−1,100+) | ⚠️ PARTIAL (5,807 lines, −702) |
| AC-3 | 신규 폴더 4개 | ✅ PASS |
| AC-4 | 신규 파일 11개 | ✅ PASS |
| AC-5 | Import Graph 순환/역방향 0 | ✅ PASS |
| AC-6 | Flow Layer 단방향 | ✅ PASS |
| AC-7 | localStorage DS-001/004 infra 경유 | ✅ PASS |
| AC-8 | in-flight guard App.jsx 보유 | ✅ PASS |
| AC-9 | Runtime 동일성 | ✅ PASS |
| AC-10 | Named Export Only | ✅ PASS |
| AC-11 | D-006/D-007/D-008 Open | ✅ PASS |
| AC-12 | CL-001~005 Cleanup Backlog | ✅ PASS |
| AC-13 | STEP Lock 9 commits | ✅ PASS |
| AC-14 | RecallHydrate Pure Params | ✅ PASS |
| AC-15 | R-B3-C1~C8 PASS | ✅ PASS |
| AC-16 | Batch 4 진입 조건 | ✅ PASS (Closure 후) |
| AC-17 | SESSION_HANDOFF_CURSOR.md | ✅ PASS (Closure 후) |

### 6. Architecture 결과

- App = Orchestrator 유지
- `application/flows/` → `domain/` 단방향
- React Hook 없음 (Flow Layer)
- Object Context (AD-B3-02) 유지
- Named Export Only

### 7. Migration Debt 상태

| Debt | 상태 | 해소 예정 |
|------|------|----------|
| D-006 | Open | Batch 6 (SYSTEM_PROFILES 직접 접근) |
| D-007 | Open | Batch 6 (getAnchorsForSystem 직접 접근) |
| D-008 | Open | Batch 4 (calculateByProfileExpr 직접 호출) |

### 8. Batch 3 공식 종료

- Closure commit: `docs(batch3): complete Batch3 closure and prepare Batch4`
- **Batch 4 Ready**

---

# 2026-07-07 (Batch 3 Design v1.0 Approved)

## 제목

AAS Runtime Migration Batch 3 Design v1.0 승인 — Implementation Ready

## Summary

Batch3_Analysis 및 Batch3_Analysis_Refinement에서 확정된 내용을 기반으로 Batch3_Design.md(v1.0)를 작성하고 최종 승인하였다.

이 문서는 Batch 3 구현의 공식 Design SSOT이다. Architecture Decisions (AD-B3-01~05), Migration Sequence (STEP 3-1~3-8), Flow Context 설계, Regression Strategy, Acceptance Criteria(AC-1~17), Migration Debt Ledger, Cleanup Backlog, Design Completeness Checklist, Future Enhancement를 모두 포함한다.

Implementation은 수행하지 않았다. 다음 Agent 세션부터 STEP 3-1 구현을 시작할 수 있다.

---

## Major Accomplishments

### 1. Batch3_Design.md v1.0 작성 및 승인

```text
작업관리/Runtime Refactoring/Batch03/Batch3_Design.md
```

- Status: Implementation Ready
- Architecture Decisions: AD-B3-01~05 (5건) 확정
- Migration Sequence: STEP 3-1~3-8 (STEP 3-7A/3-7B 포함, 총 9 STEP) 확정
- Flow Context 설계: 8개 FlowContext 인터페이스 확정
- Regression Strategy: R-B3-C1~C8 공통 + STEP별 Regression 전부 정의
- Acceptance Criteria: AC-1~17 (17항) 확정
- Migration Debt Ledger: D-001, D-004~D-008 (D-002 Closed)
- Cleanup Backlog: CL-001~CL-005 (5건)
- Design Completeness Checklist: Open Question Q1~Q5 전부 해결 확인
- Future Enhancement: FE-001 Deferred (Batch5 대상), FE-002/FE-003 Reserved

### 2. Architecture Decisions Confirmed (Batch 3)

| ID | 결정 | 요약 |
|----|------|------|
| AD-B3-01 | Application Flow Layer 도입 | `App.jsx → application/flows/ → domain/` 계층 신설 |
| AD-B3-02 | Flow Context Pattern: Hybrid Object Context | READ/WRITE/ACTION/HELPER 4종 분리. React ref는 App.jsx 보유 |
| AD-B3-03 | RecallHydrate = Pure Function Parameter | CAL-004 5개 함수는 Object Context 없이 파라미터 방식 사용 |
| AD-B3-04 | STEP 3-7 분리 (3-7A Save + 3-7B History) | Rollback 독립성 확보, STEP Lock Rule 강화 |
| AD-B3-05 | Migration Debt / Cleanup Backlog 분리 | Architecture Rule/ADR/Runtime Block 여부로 분류 기준 명확화 |

### 3. Migration Debt 재분류 확정

- 구 D-003 → CL-001 (Cleanup Backlog) — `isFiveHalfSystemId` 중복 통합
- 구 D-009 → CL-002 (Cleanup Backlog) — `publishedDatasetStore.ts` 재배치
- **신규 D-006**: `SYSTEM_PROFILES` 직접 접근 (Batch 3 발생 예정 / Batch 6 해소)
- **신규 D-007**: `getAnchorsForSystem` 직접 접근 (Batch 3 발생 예정 / Batch 6 해소)
- **신규 D-008**: `calculateByProfileExpr` 직접 호출 (Batch 3 발생 예정 / Batch 4 해소)

### 4. STEP 3-7A / 3-7B 분리 확정

- STEP 3-7A: `saveFlow.ts` (SRCH-005 + DS-002) — STEP 3-2 선행 필수
- STEP 3-7B: `historyFlow.ts` (DS-003) — STEP 3-7A 선행 필수
- 각 STEP 독립 Rollback 가능

### 5. Acceptance Criteria AC-17 추가

- `SESSION_HANDOFF_CURSOR.md` 업데이트 완료 → Batch 3 완료 조건에 포함

### 6. Future Enhancement 등록

- FE-001: RuntimeFlowContext Base Interface 추상화 — Batch 5 Runtime Contract Design 착수 시 검토 (Deferred)
- FE-002 / FE-003: Reserved

### 7. 프로젝트 기준 문서 업데이트

- `PROJECT_MASTER_INDEX.md` v1.14 — Batch 3 Design 완료 상태 반영
- `PROJECT_LOG_2026-07.md` v1.2 — 이번 작업 로그 추가
- `SESSION_HANDOFF_CURSOR.md` — Batch 3 인계 상태 업데이트

---

## Architecture Consistency Review

| 문서 | 충돌 여부 |
|------|----------|
| Architecture Constitution | ✅ 충돌 없음 |
| Architecture Dictionary | ✅ 충돌 없음 |
| ADR (001~010) | ✅ 충돌 없음 (D-006/007 Open Debt로 계획됨) |
| App_Migration_Map.md | ✅ 변경 없음 |
| PROJECT_MASTER_INDEX | ✅ 반영 완료 |

---

## Current Status

| 항목 | 상태 |
|------|------|
| AAS | **Completed** |
| Runtime Migration | **In Progress** |
| Batch 1 | **Completed** (2026-07-06) |
| Batch 2 | **Completed** (2026-07-06) |
| Batch 3 Analysis | **Completed** |
| Batch 3 Design | **Completed / Implementation Ready** (2026-07-07) |
| Batch 3 Implementation | STEP 3-1 대기 |

---

## Migration Debt Ledger (Batch 3 Design 승인 시점)

| ID | 항목 | Target Batch | Status |
|----|------|-------------|--------|
| D-001 | Legacy Alias 4개 (`canonicalSystemIdForConfig` 등) 제거 | Soft: Batch 4 / Hard: Batch 6 착수 전 | Open |
| D-002 | `sysOverlayInputFinite` private 전환 | Batch 2 완료 | **Closed** |
| D-004 | `SysOverlay.jsx` 내 `SYSTEM_OPTIONS` 하드코딩 | Batch 6 | Open |
| D-005 | `labelStrategy` 직접 분기 | Batch 6 | Open |
| D-006 | `SYSTEM_PROFILES` 직접 접근 | Batch 6 | 🔜 Open (Batch 3 구현 시 발생) |
| D-007 | `getAnchorsForSystem` 직접 접근 | Batch 6 | 🔜 Open (Batch 3 구현 시 발생) |
| D-008 | `calculateByProfileExpr` 직접 호출 | Batch 4 | 🔜 Open (Batch 3 구현 시 발생) |

## Cleanup Backlog (Batch 3 Design 승인 시점)

| ID | 항목 | 권장 시기 |
|----|------|----------|
| CL-001 (구 D-003) | `isFiveHalfSystemId` 중복 통합 | Batch 4 이전 |
| CL-002 (구 D-009) | `publishedDatasetStore.ts` 재배치 | Batch 3 cleanup 또는 Batch 4 이전 |
| CL-003 | `handleSave` Dead code 제거 | Batch 3 cleanup |
| CL-004 | `STRContent` 컴포넌트 위치 이동 | Batch 3 또는 standalone |
| CL-005 | debug/trace 함수 정리 | Batch 4+ |

---

## Next Priority

**Batch 3 Implementation (STEP 3-1 착수)**

Design SSOT: `작업관리/Runtime Refactoring/Batch03/Batch3_Design.md`

첫 번째 구현 STEP:

```
STEP 3-1 — AI-002: One-Point Library Persistence 격리
  파일: domain/lesson/onePointLibrary.ts (신규)
  변경: App.jsx onePointLibrary 초기화 + saveOnePointLibrary → import 교체
  Commit: feat(batch3): STEP 3-1 - onePointLibrary persistence extraction (AI-002)
```

---

# 2026-07-06 (Batch 2 Completed)

## 제목

AAS Runtime Migration Batch 2 Completed

## Summary

Application Runtime Refactoring의 두 번째 구현 Batch가 완료되었다.

App.jsx에서 Presentation Layer 전체를 분리하였다. Overlay 컴포넌트 · Overlay Router Hooks · Renderer 모듈을 독립 파일로 추출하고, SysOverlay에 AD-B2-01(Pure Presentation) 및 AD-B2-02(sysOverlayInputFinite module-private)를 적용하였다.

Runtime behavior 변경 없이 수행되었다. App.jsx는 8,983 lines에서 6,509 lines으로 축소되었으며, Batch 2 Baseline이 origin/main에 확정되었다.

---

## Major Accomplishments

### 1. Batch2 Design v1.1 확정

- Batch2 Design v1.0 작성 (Architecture Decisions AD-B2-01/02/03 포함)
- STEP Lock Rule (Implementation Safety Rule) 추가 → v1.1
- Design Consistency Review 완료 (Constitution / Dictionary / ADR / Map / Index / Log 전 항목 정합 확인)

### 2. STEP 2-1 AnchorEditOverlay 분리 (OVL-006)

```text
frontend/src/components/overlays/AnchorEditOverlay.jsx
```

- 앵커 좌표 편집 오버레이 추출
- `cushionMarkToDisplayLabel` 의존 분리
- App.jsx에서 inline 정의 제거 → named import로 교체

### 3. STEP 2-2 HptOverlay / StrOverlay 분리 (OVL-002/003)

```text
frontend/src/components/overlays/HptOverlay.jsx
```

- HP/T 오버레이 + STR 오버레이 추출
- `useHptController`, `clampHpToRadius` 의존 분리

### 4. STEP 2-3 AiOverlay 분리 (OVL-008)

```text
frontend/src/components/overlays/AiOverlay.jsx
```

- AI 코멘트·레슨 오버레이 + `ensureLessonItems`, `LessonRow` 추출
- dnd-kit 의존 분리
- `buildAiAutoCommentFromContext`, `AiAutoCommentDisplay` 의존 분리

### 5. STEP 2-4 Overlay Router Hooks 분리 (OVL-001/007)

```text
frontend/src/overlay/router/adminOverlayRouter.ts
frontend/src/overlay/state/overlayStateMachine.ts
frontend/src/overlay/router/userOverlayRouter.ts
```

- `useAdminOverlayRouter` — Admin Overlay 열기/닫기 라우팅
- `useAdminOverlayLifecycle` — Admin Overlay 자동 닫기 생명주기
- `useUserOverlayRouter` — User Overlay 닫기 라우팅

### 6. STEP 2-5 Renderer 모듈 분리 (APP-013 / TRJ-002 / RND-002 / RND-004)

```text
frontend/src/renderer/labels/labelScalePolicy.ts
frontend/src/renderer/trajectory/trajectoryRenderModel.ts
frontend/src/renderer/labels/systemAxisLabelModel.ts
frontend/src/renderer/trajectory/anchorConversionModel.ts
```

- `useSysLabelScale` — phone landscape 라벨 배율 훅
- `buildTrajectoryRenderModel` — activeDisplayCap · visibleKeysForLabels · labelStrategy
- `buildSystemAxisLabelModel` — 시스템 축 라벨 앵커 모델
- `buildRgAnchors` — 캐노니컬 앵커 변환 모델

### 7. STEP 2-6 SysOverlay 분리 (OVL-005) + AD-B2-01 / AD-B2-02

```text
frontend/src/components/overlays/SysOverlay.jsx
frontend/src/overlay/utils/sysOverlayUtils.jsx
```

- **AD-B2-01 적용**: SysOverlay는 Domain 계산 함수를 직접 호출하지 않는다.
  - `computeValues` prop = `calculateByProfileExpr` (App.jsx 주입)
  - `solveFiveHalf` prop = `solveFiveHalfTwoOfThree` (App.jsx 주입)
- **AD-B2-02 적용**: `sysOverlayInputFinite` export 제거 → `checkInputFinite` module-private
  - `fiveHalfCalculator.ts`에서 `export function` → `function`
  - Migration Debt D-002 해소 완료
- `sysOverlayUtils.jsx`: 공유 헬퍼 16개 named export
  - `resolveCoC1C3Keys`, `fmtFiveHalfDisplayNum`, `fmtSysOverlayInputDisplay`
  - `normalizeToFormulaInputsApp`, `isRhsKeyReadOnlyForSys`, `isMarkBasisReadOnly`
  - `lhsTokenFromExpr`, `showMarkRowExtraForSys`, `buildSysOverlayInitialInputs`
  - `buildSysOverlayNumericPayload`, `unifiedSlideFromCorrections`, `normalizeSlideDrawCorrections`
  - `formatFormulaDisplay`, `SYS_FORMULA_TOKEN_RE`, `renderMixedFormulaLine`, `renderSysFormulaContent`

### 8. App.jsx 대규모 축소

| 항목 | Before | After | 감소 |
|------|--------|-------|------|
| App.jsx lines | 8,983 | 6,509 | −2,474 |

---

## Architecture Decisions Confirmed

### AD-B2-01 — Presentation Layer Pure

- Presentation Layer는 Domain 계산을 직접 보유하지 않는다.
- SysOverlay는 `computeValues`/`solveFiveHalf`를 props로 받는다 (Dependency Injection).
- Option B (Props Injection) 채택 — Batch 2 한정 실용 패턴, Batch 6 이후 재검토 가능.

### AD-B2-02 — sysOverlayInputFinite module-private

- `fiveHalfCalculator.ts`의 `sysOverlayInputFinite` export 제거.
- SysOverlay.jsx 내부 `checkInputFinite`로 대체 (module-private).
- **Migration Debt D-002 해소.**

### AD-B2-03 — Overlay Router Hook Pattern

- Overlay 열기/닫기 로직을 React Hook Pattern으로 추출.
- `useAdminOverlayRouter`, `useAdminOverlayLifecycle`, `useUserOverlayRouter`.

---

## STEP Lock Rule 적용

각 STEP 완료 후 아래 조건을 만족하고 commit:

| STEP | Build | Import Graph | Git Commit |
|------|-------|-------------|------------|
| 2-1 AnchorEditOverlay | ✅ | ✅ | `a0972db` |
| 2-2 HptOverlay | ✅ | ✅ | `49f4512` |
| 2-3 AiOverlay | ✅ | ✅ | `cbc19c2` |
| 2-4 Overlay Router Hooks | ✅ | ✅ | `f950495` |
| 2-5 Renderer Modules | ✅ | ✅ | `976bc0e` |
| 2-6 SysOverlay | ✅ | ✅ | `f6dcc54` |
| 2-6 Cleanup | ✅ | ✅ | `6bdce39` |

---

## Current Status

| 항목 | 상태 |
|------|------|
| AAS | **Completed** |
| Runtime Migration | **In Progress** |
| Batch 1 | **Completed** (2026-07-06) |
| Batch 2 | **Completed** (2026-07-06) |
| Batch 3 | Analysis 대기 |
| origin/main | **Push 완료** (6bdce39) |

---

## Migration Debt Ledger (Batch 2 완료 시점)

| ID | 항목 | Target Batch | Status |
|----|------|-------------|--------|
| D-001 | Legacy Alias 4개 제거 | Soft: Batch 4 / Hard: Batch 6 착수 전 | Open |
| D-002 | `sysOverlayInputFinite` private 전환 | Batch 2 (OVL-005 이동 후) | **Closed** (2026-07-06) |
| D-003 | `domain/*` 3파일 `isFiveHalfSystemId` 중복 통합 | Unscheduled (Batch 4 이전 권장) | Open |
| D-004 | `SysOverlay.jsx` 내 `SYSTEM_OPTIONS` 하드코딩 | Batch 6 (Runtime Contract 해소 후) | Open |
| D-005 | `labelStrategy` 내 `systemIdForGrid === "5_half_system"` 직접 분기 | Batch 6 | Open |

---

## Next Priority

**Batch 3 Analysis**

대상: SRCH-001~005, DS-001~007, CAL-004/006, AI-001~003

영역: Application Flow · Search · Dataset · AI Domain

---

# 2026-07-06

## 제목

AAS Runtime Migration Batch 1 Completed

## Summary

Application Runtime Refactoring의 첫 번째 구현 Batch가 완료되었다.

App.jsx에서 순수 Domain 책임을 분리하고, Domain Layer의 초기 구조를 생성하였다.

이번 작업은 Runtime behavior 변경 없이 수행되었다. App.jsx를 Application Runtime Orchestrator로 축소하기 위한 **첫 번째 실제 구현 기준점**이다.

---

## Major Accomplishments

### 1. Batch1 Analysis 완료

- App.jsx 대상 블록 정밀 분석 (SYS-004/005, CAL-001, MISC-006)
- 함수 Line range · 입출력 · Purity Check · Dependency Map 확정
- Open Question 6건 식별 → Design 단계에서 전부 해결

### 2. Batch1 Design v1.2 확정

- SYS_SYSTEM_CONFIG co-location 전략: API Stable / Implementation Replace (Batch 6 교체 예약)
- Canonical API → Legacy Alias → 삭제 3단계 Migration Lifecycle 확정
- `sysOverlayInputFinite` Private Helper 정책 + Batch 1 한정 예외 export 결정
- R-10 Import Graph Validation · AC-11 No Circular Dependency 추가
- Migration Debt Ledger (D-001, D-002, D-003) 신설

### 3. Batch1 Architecture Review 완료

- Option B (Wrapper Function Alias) 채택 — Deprecation/Telemetry seam 확보
- Lifecycle 4단계 확정 (Soft Gate: Batch 4, Hard Deadline: Batch 6 착수 전)
- Design Consistency Review — Constitution/Dictionary/Map/ADR 전 항목 정합 확인

### 4. Domain system module 생성

```text
frontend/src/domain/system/systemIdentity.ts
```

- Canonical API: `canonicalSystemId` · `getSystemMode` · `getUseSn` · `isFiveHalf`
- Legacy Wrapper: `canonicalSystemIdForConfig` · `getSysSystemMode` · `getSysUseSn` · `isFiveHalfSystemId` (`@deprecated`)
- `SYS_SYSTEM_CONFIG` 내부 은닉 (Batch 6 Runtime Contract 전까지)

### 5. Domain calculator modules 생성

```text
frontend/src/domain/calculator/fiveHalfCalculator.ts
frontend/src/domain/calculator/formulaExpr.ts
```

- `solveFiveHalfTwoOfThree` · `fiveHalfComputedInputKey` (Public API)
- `sysOverlayInputFinite` (Batch 1 한정 예외 export, Batch 2에서 private 전환 예정, Migration Debt D-002)
- `parseSysFormulaExpr` · `getDisplayExprForSys` · `ParsedFormulaExpr` type
- `formulaExpr → systemIdentity` 단방향 import (허용 방향)

### 6. App.jsx 순수 함수 제거

App.jsx에서 아래 함수·상수 정의가 제거되었다 (약 95 lines):

- `SYS_SYSTEM_CONFIG` (상수)
- `canonicalSystemIdForConfig` · `getSysSystemMode` · `getSysUseSn` · `isFiveHalfSystemId`
- `sysOverlayInputFinite` · `solveFiveHalfTwoOfThree` · `fiveHalfComputedInputKey`
- `parseSysFormulaExpr` · `getDisplayExprForSys`
- SYS-005 inline 정규화 (`"5_HALF" ? "5_half_system"` 패턴) 3곳 → `canonicalSystemIdForConfig()` 호출로 교체

### 7. Validation 완료

| 항목 | 결과 |
|------|------|
| npm run build | ✅ PASS |
| Regression R-1 ~ R-10 | ✅ PASS (8 tests, 전수 통과) |
| Acceptance AC-1 ~ AC-11 | ✅ PASS |
| Import Graph Validation | ✅ PASS (순환참조 0, 역방향 0) |
| 베이스라인 대비 신규 실패 | ✅ 0건 |

---

## Architecture Decisions Confirmed

- App.jsx는 Domain 계산을 직접 보유하지 않는다.
- Domain module은 Named Export Only를 사용한다. Default Export / Barrel Export 금지.
- `systemIdentity.ts`는 Batch 6 Runtime Contract 전까지 `SYS_SYSTEM_CONFIG`를 임시 은닉한다.
- API Stable / Implementation Replace 전략 유지 (Batch 6에서 공급원만 교체).
- `calculator → system` 방향 import 허용. 역방향 금지. 순환참조 금지.
- Canonical API 이름(Migration Map 명칭)을 Batch 1부터 즉시 확정하고, Legacy는 Wrapper로 병행 유지.

---

## Current Status

| 항목 | 상태 |
|------|------|
| AAS | **Completed** |
| Runtime Migration | **In Progress** |
| Batch 1 | **Completed** (2026-07-06) |
| Batch 2 | Analysis 대기 |

---

## Migration Debt (Batch 1 발생분)

| ID | 항목 | Target Batch | Status |
|----|------|-------------|--------|
| D-001 | Legacy Alias 4개 제거 | Soft: Batch 4 / Hard: Batch 6 착수 전 | Open |
| D-002 | `sysOverlayInputFinite` private 전환 | Batch 2 (OVL-005 이동 후) | Open |
| D-003 | `domain/*` 3파일 `isFiveHalfSystemId` 중복 통합 | Unscheduled (Batch 4 이전 권장) | Open |

---

## Next Priority

**Batch 2 Analysis**

대상: APP-013(라벨 배율), RND-002/004(시스템 그리드·앵커 변환), TRJ-002(display cap), OVL-001~003/005~008(Overlay 인라인 컴포넌트 분리 준비)

---

# 2026-07-03

## 제목

Application Architecture Standard (AAS) v2.0 Completed

## Summary

이번 작업으로 Application Runtime Architecture가 Migration 수준을 넘어 **영구 SSOT**로 확정되었다.

`App_Migration_Map.md`가 **Application Runtime Constitution (Permanent SSOT)** 로 공식 생성되었으며, Migration Blueprint · Architecture Meta · Architecture Decision Record · Review Checklist · Approval Flow를 모두 포함한다.

이번 단계는 문서(Architecture SSOT) 확정이며, Runtime/Code/Migration 구현은 수행하지 않았다.

---

## Major Accomplishments

### 1. Application Migration Blueprint 완료

- App.jsx의 모든 Responsibility에 대해 Target Layer → Folder → File → Function 및 Migration Batch(1~6) · Priority가 확정되었다. (Part A)

### 2. Architecture Meta 구축

다음이 정의 완료되었다.

```text
Capability
Owner
Visibility
Architecture Rule
Ownership Matrix
Capability Matrix
```

(Part B)

### 3. Architecture Decision Record

- ADR-001 ~ ADR-010 작성. (Part C)

### 4. Architecture Review Checklist 작성

- 신규 기능/System/Module 추가 시 필수 통과 13항 체크리스트. (Part D)

### 5. Architecture Approval Flow 작성

- `Capability → Owner → Visibility → Architecture Rule → ADR → Review → Implementation` 승인 흐름. (Part D)

### 6. Application Runtime Constitution 공식 생성 완료

```text
Application Architecture Standard (AAS) v2.0/App_Migration_Map.md
```

- Part A + Part B + Part C + Part D 통합, Notation Normalization(FIX-1~6) 반영.

---

## Architectural Decisions

- App.jsx는 Runtime Orchestrator이다.
- Capability는 반드시 단일 Owner를 가진다.
- Dependency는 단방향이다.
- Runtime Contract를 우회하지 않는다.
- Calculator는 Domain만 계산한다.
- Renderer는 표시만 수행한다.
- Overlay는 계산하지 않는다.
- Dataset은 Domain/Infrastructure만 접근한다.
- 신규 Architecture 변경은 ADR + Review를 통과해야 한다.

---

## Current Status

| 항목 | 상태 |
|------|------|
| AAS | **Completed** |
| Runtime Constitution | **Completed** |
| Architecture Governance | **Completed** |
| Migration Blueprint | **Completed** |
| Runtime Implementation | **Next Phase** |

---

## Next Priority

Architecture 문서는 완료되었으므로, 다음 우선순위를 기존 Runtime 구현으로 변경한다.

```text
System Inventory
   ↓
Architecture Audit
   ↓
System Standardization
   ↓
Runtime Implementation
```

---

# 2026-07-02

## Summary

This session established the architectural foundation for the next stage of the 3Cushion AI project.

The focus of this session was not Runtime implementation but the completion of the **System Platform Standard (SPS) v1.0**, which will become the permanent architectural authority governing every System.

This marks the transition from Architecture Design to Platform Standardization.

---

## Major Accomplishments

### 1. System Platform Standard (SPS) v1.0 Established

Completed the official SPS document set.

Documents completed:

```text
README.md

System_Architecture_Standard_Guide.md

System_Runtime_Contract.md

Canonical_System_Template.md

System_Schema_Definition.md

System_Audit_Guide.md

System_Standardization_Guide.md
```

These documents now define the official architecture for all existing and future Systems.

---

### 2. Canonical System Officially Defined

The following System was officially designated as the Canonical Reference.

```text
frontend/src/data/systems/5_half_system/
```

The Canonical System serves as the architectural reference only.

It does not receive special Runtime behavior.

Future Systems shall be derived from this Canonical architecture.

---

### 3. Runtime Direction Finalized

The long-term Runtime architecture was finalized.

Target architecture:

```text
App.jsx

↓

Application Orchestrator

↓

Domain

↓

Calculator

↓

Renderer

↓

Overlay

↓

Search

↓

Runtime Contract

↓

System Package
```

The responsibility of App.jsx will gradually be reduced until it functions solely as the Application Orchestrator.

---

### 4. Standardization Strategy Established

The official strategy for existing Systems has been finalized.

Existing Systems shall not be modified immediately.

The mandatory workflow is:

```text
Study SPS

↓

Inventory

↓

Architecture Audit

↓

Schema Validation

↓

Migration Report

↓

Architecture Review

↓

System Standardization

↓

Runtime Validation

↓

Release
```

This workflow becomes the official procedure for standardizing every existing System.

---

### 5. New System Development Policy Established

Future Systems shall no longer be created independently.

Every new System shall follow:

```text
Canonical System Template

↓

Schema Validation

↓

Audit

↓

Runtime Validation

↓

Release
```

This guarantees that future Systems integrate without Runtime redesign.

---

### 6. Project Governance Improved

The project management structure has been strengthened.

The following document was added:

```text
SESSION_TRANSFER_2026-07_SPS_v1.0.md
```

This document records the completion of SPS v1.0 and transfers the project status to future development sessions.

---

## Architectural Decisions

The following decisions are now considered fixed.

1.

SPS is the official architectural authority governing every System.

2.

5_half_system is the Canonical System.

3.

Every System shall expose the same Runtime Contract.

4.

Every Runtime package shall contain:

```text
profile.json

logic.json

anchors.json

system_meta.json
```

5.

App.jsx shall evolve into an Application Orchestrator.

6.

Future Systems shall be created from the Canonical System Template.

7.

System standardization shall always follow:

Inventory → Audit → Validation → Migration → Standardization.

---

## Next Priority

The next major objective is to standardize the existing System library.

Target:

Approximately 40 existing Systems.

Initial tasks:

```text
System Inventory

↓

Architecture Audit

↓

Schema Validation

↓

Migration Report
```

No architectural modifications shall begin until these reports have been reviewed.

---

## Current Project Status

### AAS

In progress.

Chapter01–20 Release Edition continues.

---

### SPS

Completed (v1.0).

Official architectural standards established.

---

### Runtime

Blueprint completed.

Implementation scheduled after System Standardization.

---

### Existing Systems

Awaiting Inventory and Audit.

No modifications performed.

---

## Expected Next Session

The next development session shall focus on:

1.

Studying SPS.

2.

Generating System Inventory.

3.

Performing Architecture Audit.

4.

Performing Schema Validation.

5.

Preparing Migration Report.

6.

Reviewing Audit results.

7.

Beginning System Standardization.

---

## Notes

This session represents a major architectural milestone.

The project has transitioned from defining architecture to applying architecture.

Future development shall prioritize consistency, validation, and standardization over feature expansion.

SPS v1.0 is now the permanent Source of Truth governing all System-related architecture within the 3Cushion AI platform.

---

End of Log