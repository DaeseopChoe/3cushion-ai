# 3Cushion AI - Project Master Index

Version: 1.44  
Last Updated: 2026-07-23  
Role: **현재 프로젝트 상태 SSOT** (월별 로그 아님)

> 기능이 완료·변경될 때마다 이 문서만 갱신한다.  
> 상세 이력은 `HISTORY/PROJECT_LOG_YYYY-MM.md`에 둔다.  
> **폴더·파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성.

---

## 문서 계층 (읽는 순서)

### Development Workflow — Architecture 구현 전 Consume (공식)

Architecture 관련 구현(Runtime / Presentation / Validation 등) **전에** 반드시 다음 순서로 Consume한다.

```text
1. docs/APPLICATION_FLOW.md
2. 관련 Fleet Contract Book (L4 / L5 / L6 / L7)
3. PROJECT_MASTER_INDEX.md
4. CURSOR_SESSION_HANDOFF.md
        ↓
Architecture Review
        ↓
구현 진행
```

| Rule | Statement |
|------|-----------|
| **First reference** | `APPLICATION_FLOW.md` = Runtime Orchestration 공식 Architecture Guide |
| **Normative layers** | Fleet Contract Book Ch.8(L4) · Ch.9(L5) · Ch.10(L6) · **Ch.11(L7 Ratified)** |
| **Ops context** | MASTER + HANDOFF로 현재 Gate / Hold / Next 확인 |
| **Gate** | Consume → **Architecture Review** → 구현 (Review 생략 금지) |

### 신규 세션 온보딩 (STEP7 Agent Implementation)

1. **`DEVELOPMENT_WORKFLOW.md`** — **Operational Workflow SSOT v1.0** (General + Fleet Apply Workflow)  
2. **`OPS_AI_MODEL_GUIDE.md`** — Ops AI Model Recommendation **v0.1** (Recommendation only)  
3. **`docs/APPLICATION_FLOW.md`** — **Runtime Orchestration Architecture Guide** (Architecture 구현 시 **최우선**)  
4. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT  
5. **`CURSOR_SESSION_HANDOFF.md`** — **STEP8 Completed** · Current **Post-STEP8** · Next **STEP9 Entry**  
6. **`STEP7_IMPLEMENTATION_DECOMPOSITION.md`** — Session Execution SSOT **v1.0 Approved**  
7. **`System Platform Standard (SPS) v1.0/STEP7_P4_IU-4-0*.md`** — **P4 Plan suite** (Complete · Official · Consume)  
8. **`System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md`** — **P2 Catalog Design v0.15** (Consume)  
9. **`HISTORY/PROJECT_LOG_2026-07.md`** — P4 Complete · VG-P4 PASS · STEP7 Decisions  
10. **`System Platform Standard (SPS) v1.0/STEP6_FINAL_FREEZE.md`** — **STEP6 Final Freeze v1.0** (Consume)  
11. Framework · Pipeline Freeze Candidate (Locked · Consume)

### 신규 세션 온보딩 (STEP6-6 Validation Engine Design) — 이력 참조

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT  
2. **`CURSOR_SESSION_HANDOFF.md`** — (현행은 STEP7 Entry; 이력은 LOG 참고)  
3. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP6-5…STEP6-11  
4. **`System Platform Standard (SPS) v1.0/STEP6-5_Validation_Register_Suite.md`** — Register Suite v0.2  
5. **`System Platform Standard (SPS) v1.0/STEP6-4_Rule_Catalog_Design.md`** — Catalog Design v0.2  
6. **`System Platform Standard (SPS) v1.0/STEP6-3_Schema_Rule_Analysis.md`** — Analysis v1.1  
7. Framework · Pipeline Freeze Candidate (Locked · Consume)

### 신규 세션 온보딩 (STEP6-4 / STEP6-5) — 이력 참조

1. **`PROJECT_MASTER_INDEX.md`** (본 문서)  
2. **`CURSOR_SESSION_HANDOFF.md`** — (현행은 STEP7 Entry; 이력은 LOG 참고)  
3. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP6-4 Catalog · STEP6-5 Register  
4. Catalog Design v0.2 · Register Suite v0.2 · Analysis v1.1  
5. Framework · Pipeline Freeze Candidate (Locked · Consume)

### 신규 세션 온보딩 (STEP5 Final → STEP6 Schema Validation) — 이력 참조

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT  
2. **`System Platform Standard (SPS) v1.0/STEP5_FINAL_FREEZE.md`** — **STEP5 Final Freeze v1.0**  
3. **`System Platform Standard (SPS) v1.0/STEP5_STEP6_Handoff.md`** — STEP6 Entry · Manifest · Owner  
4. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP5 Completed · STEP6-1/2 Freeze Candidate  

### 신규 세션 온보딩 (STEP4 / Inventory 참조)

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT  
2. **`System Platform Standard (SPS) v1.0/System_Inventory.md`** — **STEP4 Final v1.0** · Frozen Assets · §19 Entry Point  
3. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP4 Final 로그 (2026-07-14) · Batch 6 Final Freeze (2026-07-13)  
4. **`작업관리/Runtime Refactoring/Batch06/Batch6_Final_Freeze.md`** — Batch 6 Final Freeze SSOT (Runtime baseline)

### 신규 세션 온보딩 (Dataset Architecture 포함 시)

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT  
2. **`HISTORY/PROJECT_LOG_2026-06.md`** — 2026-06 월별 이력 (§14 Phase 1 · §15 Phase 2~3-1 · §16 운영 검증 조사 · §17 OPEN-05 조사 · §18 OPEN-04 Caption Engine · §19 USER Overlay · §20 Trajectory Display Cap)  
3. **`SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`** — Dataset Architecture 전용 이관 문서  

### 전체 문서 계층

| 문서 | 역할 |
|------|------|
| **본 문서 (`PROJECT_MASTER_INDEX.md`)** | 현재 기능·UI·완료/예정 SSOT |
| `docs/APPLICATION_FLOW.md` | **Runtime Orchestration Architecture Guide** — Architecture 구현 전 **First Consume** |
| `작업관리/DEVELOPMENT_WORKFLOW.md` | **Operational Workflow SSOT v1.0** (General + Fleet Apply Workflow · Sole Ops SSOT) |
| `작업관리/STEP7_IMPLEMENTATION_DECOMPOSITION.md` | **STEP7 Session Execution SSOT v1.0 Approved** |
| `작업관리/CURSOR_SESSION_HANDOFF.md` | Cursor 세션 이관 메모 (**STEP8 Completed** · **Post-STEP8** · Next **STEP9**) |
| `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/` | **Fleet Contract Book v1.0** · Front Matter + **Ch.8–Ch.11 Ratified** · **B0–B8 Completed** · **Final Validation Gate v1.0** |
| `System Platform Standard (SPS) v1.0/STEP7_P6_IU-6-0*.md` | **STEP7 P6 Apply Decision suite** (IU-6-01A…06A Complete · Design-only · Consume) |
| `작업관리/OPS_AI_MODEL_GUIDE.md` | **Ops AI Model Recommendation Guide v0.1** (Recommendation only · never Gate) |
| `System Platform Standard (SPS) v1.0/STEP7_P4_IU-4-0*.md` | **STEP7 P4 Standardization Plan suite** (Complete · Official · VG-P4 PASS) |
| `System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md` | **STEP7 P2 Catalog Freeze Design v0.15** (Design Complete · Freeze not declared) |
| `System Platform Standard (SPS) v1.0/STEP6_FINAL_FREEZE.md` | **STEP6 Final Freeze v1.0** · Final Summary |
| `System Platform Standard (SPS) v1.0/STEP6-10_Validation_Report.md` | **STEP6-10 Validation Report v1.0** |
| `System Platform Standard (SPS) v1.0/STEP6-6_Validation_Engine_Design.md` | **STEP6-6 Engine Design Complete (v0.2)** |
| `frontend/src/validation/engine/` | **STEP6-7…9 Validation Engine baseline** |
| `System Platform Standard (SPS) v1.0/STEP6-5_Validation_Register_Suite.md` | **STEP6-5 Validation Register Suite Complete (v0.2)** · Register State |
| `System Platform Standard (SPS) v1.0/STEP6-4_Rule_Catalog_Design.md` | **STEP6-4 Rule Catalog Design Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-3_Schema_Rule_Analysis.md` | **STEP6-3 Schema Rule Analysis Complete (v1.1)** · Catalog Design Input |
| `System Platform Standard (SPS) v1.0/STEP6_Schema_Validation_Framework.md` | **STEP6 Framework Freeze Candidate (Locked)** |
| `System Platform Standard (SPS) v1.0/STEP6_Validation_Pipeline.md` | **STEP6 Pipeline Freeze Candidate (Locked · Framework Consume-only)** |
| `System Platform Standard (SPS) v1.0/STEP5_FINAL_FREEZE.md` | **STEP5 Final Freeze v1.0** · 문서 suite |
| `System Platform Standard (SPS) v1.0/STEP5_Architecture_Audit_Framework.md` | STEP5 Architecture Audit Framework SSOT (Frozen) |
| `System Platform Standard (SPS) v1.0/STEP5_STEP6_Handoff.md` | STEP6 Handoff Manifest · Entry Conditions |
| `System Platform Standard (SPS) v1.0/System_Inventory.md` | **STEP4 Inventory SSOT (v1.0 Final)** · Frozen Assets |
| `HISTORY/PROJECT_LOG_YYYY-MM.md` | 월별 작업 이력 |
| `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md` | Dataset Architecture 설계·Phase 1 Export·후속 Phase |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 상세 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 폴더/파이프라인 **구조 변경 시** 전면 재작성 통제 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (**deprecated**) |

---

## 프로젝트 개요

### 프로젝트 목적

국제식 3쿠션 **시스템·공략을 데이터화**하고, 관리자가 입력·저장한 포지션을 **Recall/Search**로 불러와 **테이블·궤적·코칭 UI**로 검증·학습하는 분석 전용 앱.

### 현재 개발 단계

| 영역 | 상태 |
|------|------|
| **Architecture** | **Application Architecture Standard (AAS) v2.0 Complete** · **Application Runtime Constitution (SSOT) Established** — `App_Migration_Map.md` 생성 완료 · Runtime Constitution 확정 · Architecture Governance 완료 · Migration Blueprint 완료 |
| **AAS Runtime Migration** | **Batch 1~6 Complete (2026-07-13)** — Batch 6 Final Freeze · Runtime Contract / Registry / Loader · Baseline `ec71ef9` · **Completed · Final Freeze** |
| **SPS System Inventory (STEP 4)** | **Complete · Final v1.0 (2026-07-14)** — 38 Systems · Observation SSOT · Metadata Inventory · Registration Inventory · Inventory Assets · **Frozen Assets declared** · SSOT: `System Platform Standard (SPS) v1.0/System_Inventory.md` |
| **SPS Architecture Audit (STEP 5)** | **Complete · Final Freeze v1.0 (2026-07-15)** — Framework · Audit Plan · Rule Catalog · Registers · Audit Report · STEP6 Handoff · `STEP5_FINAL_FREEZE.md` |
| **SPS Schema Validation (STEP 6)** | **Complete · Final Freeze v1.0 (2026-07-17)** — Framework · Pipeline **Locked** · Catalog/Register Design · Engine (7A–7G) · Pilot · Production Validation · Report · `STEP6_FINAL_FREEZE.md` |
| **SPS System Standardization (STEP 7)** | **P6 Complete (2026-07-21)** — P5 IU-5-01A…05A PASS · P6 IU-6-01A…06A Complete (Design-only) · WG-AI-001 PASS · Architecture Workflow PASS · Fleet design chain (01A–01F) authored |
| **SPS Fleet Apply (STEP 8)** | **Completed (2026-07-23)** — **B0·B1·B2·B2.5·B4·B5·B6·B7·B8 PASS** · **B3 HALTED (Hold)** · B8 Validation **PASS** · Fleet Closure **Confirmed** · **Final Validation Gate v1.0** · Ops Workflow **v1.0** |
| ADMIN | Position Lock → SYS / HP·T / STR / AI 입력 → Dataset SAVE |
| USER | Search(published) → 공략 선택 → **AI · 두께/타점 · 동선** 중심 실전 공략 UI |
| 궤적 | Hermite Segment A + 보정선 기반 baseline (2026-05 안정화) |
| AI 코멘트 | SYS+STR 자동 문장 SSOT + 원 포인트 레슨 분리 **완료** |
| 시스템 레슨 | **보류** — USER UI 단순화 정책에 따라 현재 메뉴 비노출 · 관련 코드/VM은 보존 |
| **Dataset Architecture** | **Phase 1~3-1 완료** — Export · Published Loader · USER/ADMIN Recall·Search SSOT |

### 핵심 설계 원칙

1. **계산 엔진 vs 표시 레이어 분리** — Recall/SYS/STR/궤적 엔진은 USER 표시 작업에서 변경 금지.
2. **슬롯 SSOT** — `draft` / `applied`, `slotRenderSys`, `buildSlotRuntimePayload` 기준 hydrate.
3. **Canonical SAVE** — `sysInputs` + `corrections` persist, effective strip (2026-05 PR 2a–2d).
4. **오버레이 이중 트랙** — ADMIN: `overlayState` + `ModalShell`(편집). USER: `overlayContent` + read-only 패널.
5. **AI 텍스트** — 자동 생성(SYS+STR)과 `onePointLessons`(관리자 수동) **완전 분리**.

---

## 기술 스택

- Frontend: React (Vite), TypeScript + JSX
- 시스템 정의: `frontend/src/data/systems/*` (profile / anchors / logic / system_meta) — **Loader only**
- Runtime Contract: `frontend/src/runtime/` — Registry Public Entry `getSystemContract()`
- Admin SYS 식: `admin/sys/useSysCalculation.ts` (anchors 비의존 expr)
- App SYS·궤적: Domain calculators + `domain/trajectory/` (Batch 5) · Contract supply (Batch 6)

---

## 아키텍처 불변 규칙 (변경 시 로그·MASTER_STATE 갱신 필수)

1. **값 vs 좌표** — `profile.formula.expr`는 SYS **숫자**; 테이블 **CO/C1/C3 좌표**는 `anchors.json` + `anchorLookupEngine` / `anchorCoordinateEngine` SSOT.
2. **valueSpace (Fg / Rg)** — lookup은 `coord` + `valueSpace`. Fg는 프레임·방향점, Rg는 레일 맞춤. Fg에 무조건 `snapToRail` 적용 금지.
3. **Draft / Applied** — Draft는 실시간·미저장; **Applied만** SAVE/궤적 기준. USER 표시는 slot hydrate SSOT.
4. **전략 혼합 금지** — `signature = systemId + formulaHash + shotType`; 동일 signature 내에서만 search/merge.
5. **Recall** — 저장 `sysInputs` 기준; draft에 `outputs.result` 없으면 `buildDraftsFromRecord` 등에서 expr 재실행해 result 채움.
6. **표기** — UI/데이터는 C1, C3, CO_f … (`1C`, `3C` 역표기 금지).
7. **저장** — Working: localStorage `positions_dataset`; Published: `dataset/{공략}/{시스템}/positions.json`. **ADMIN 로컬DB** → working; **ADMIN Search · USER Search** → published (동일 Published Search).

### 계산 3계층 (파일 기준)

| 계층 | 파일 | 역할 |
|------|------|------|
| Strategy | `hooks/useShotSlots.ts` | Draft/Applied, SAVE, Recall draft 적용 |
| Trajectory | `hooks/useTrajectoryState.ts` | IDLE → ADJUSTING → APPLIED, SYS 결과 UI 반영 |
| Physics·궤적 | `utils/physics/*`, `utils/trajectory/curveTrajectory.ts` | Impact, Hermite segment, cushion path |

### ADMIN SYS 입력 → 렌더 (요약)

```
SysOverlay 입력 → draft.sys → applyDraftSys → applied.sys
  → useTrajectoryState.applySysResult → Physics → Stage/ImpactLines
```

---

## 데이터 드리븐 시스템 (요약)

`frontend/src/data/systems/<system_name>/`

| 파일 | 역할 |
|------|------|
| `profile.json` | formula.expr, value_domains, safety |
| `anchors.json` | 좌표 SSOT (보간 기준점) |
| `logic.json` | 조건·특수 보정 |
| `system_meta.json` | 메타 |

상세: `3_SYSTEM_ARCHITECTURE.md`.

---

## Dataset Architecture

**상태:** Phase 1~3-1 완료 · **UI 용어 (OPEN-02C~E, 2026-06):** ADMIN **로컬DB** = Local Dataset Search (`positions_dataset`); ADMIN **Search** = USER **Search** = Published Search (`dataset/{공략}/{시스템}/positions.json`). UI에서 Recall 라벨 제거 · published Search active state `isAdminPublishedSearchMatched` · CSS `.published-search-btn`. 내부 handler명(`handlePositionRecall` 등)·profile ID·trace는 2차 정리 예정.  
**이관 문서:** `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`  
**월별 로그:** `HISTORY/PROJECT_LOG_2026-06.md` §14 (Phase 1) · §15 (Phase 2~3-1)

### 데이터 3계층

| 계층 | SSOT | 용도 | 현재 소비자 |
|------|------|------|-------------|
| **Working Dataset** | `positions_dataset` (localStorage) | ADMIN 작업·누적 | **ADMIN 로컬DB** (UI; profile `adminSearch`) |
| **Workspace History** | `workspace_history` (localStorage) | SAVE 스냅샷·작업 이력 | History UI (Load / Delete / Export) |
| **Published Dataset** | `dataset/{공략}/{시스템}/positions.json` | 배포·사용자 검색 | **ADMIN Search**, **USER Search** (profile `adminStrict` / `userStrict`) |

**Production SSOT (검증 완료, 2026-06):**

- Published Dataset은 **Git 관리 대상**이다.
- Vercel은 Git Repository의 `dataset/` 경로를 직접 배포한다.
- USER Search / ADMIN Search는 Production에서 `dataset/{공략}/{시스템}/positions.json`을 fetch한다.
- `dataset/`이 Git에 포함되지 않으면 Production Search는 동작하지 않는다.

> **`dataset/`은 작업용 데이터가 아니라 Production Search가 사용하는 Published Corpus SSOT이다.**  
> 절대 `.gitignore` 대상이 되어서는 안 된다.

### Dataset Export (Phase 1 — 완료)

- History Export 버튼 → `handleExportSnapshots` → `saveDatasetExportToFile`
- 경로: `dataset/{공략명}/{시스템명}/positions.json` (폴더 자동 생성)
- Envelope: `schemaVersion: 2`, `records: PositionRecord[]`
- 코드 SSOT: `domain/datasetExport.ts`, `domain/datasetPath.ts`, `hooks/useSettings.js`
- Export 단위: 선택 스냅샷의 `state.dataset` → `systemId` + `shotType` 필터 (Position 1건이 아닌 **Dataset Export**)

### Published Dataset Loader (Phase 2 — 완료)

- `getOrLoadPublishedLeaf(shotType, systemId)` — lazy load + in-memory cache
- URL SSOT: `domain/datasetPath.ts` → `/dataset/{공략}/{시스템}/positions.json`
- **ADMIN Search** (UI; 우측 패널) → published corpus (`handlePositionRecall`, profile `adminStrict`)
- Published leaf URL fallback: 빈 `shotType("")` → `"뒤돌리기"` (`domain/publishedLeafResolve.ts`)

**운영 검증 완료 (2026-06):**

- localhost USER Search
- Production USER Search
- Published Dataset Loader
- Vercel Static Asset Delivery

→ 모두 정상 확인.

### USER Search (Phase 3 — 완료)

- **USER Search** → published corpus only (`handleUserSearchStrategies`, profile **`userStrict`**)
- USER UI: **Search 버튼만** (Search/Recall 토글 제거)
- 공략 S1/S2/S3: **USER Search 성공 시에만** 활성 (`recommendedFrom` gate)
- **ADMIN→USER carry-over 제거**: 전환 시 draft/`recommendedFrom` 초기화 — F5 직후 USER와 동일 상태

### Recall profile 분리 (Phase 3-1 — 완료)

| Profile | coarsePerBall | totalL1Cap | 용도 |
|---------|---------------|------------|------|
| **userStrict** | 2 | 6 | USER Search · ADMIN Search (published; permutation, coarse 필수) |
| **adminSearch** | 5 | 15 | ADMIN **로컬DB** (UI) — local `positions_dataset` |
| **adminStrict** | 6 | null | ADMIN **Search** (UI; published) · legacy `runPositionRecall` |

### Published Dataset 운영 검증 (Phase 3-2 — 완료)

- Published Dataset Git 관리 복구
- Vercel 정적 배포 검증
- USER Search Production 검증
- `positions.json` 직접 URL 검증

**결과:** Published Dataset Architecture 운영 검증 완료

### Production Dataset Delivery

| 환경 | 경로 |
|------|------|
| **localhost** | `dataset/` 직접 참조 |
| **Production** | GitHub → Vercel → `dataset/*` 정적 배포 |

Production Search 장애 발생 시 점검 순서:

1. `dataset` 파일 존재 여부
2. GitHub 반영 여부
3. Vercel 배포 여부
4. `positions.json` 직접 URL 확인

### Search / 로컬DB / Reset (현재 UI 용어)

| UI 기능 | 데이터 | Profile | 상태 |
|---------|--------|---------|------|
| ADMIN **로컬DB** (Stage rail) | `positions_dataset` | `adminSearch` | ✅ |
| ADMIN **Search** (우측 패널) | Published Dataset | `adminStrict` | ✅ |
| USER **Search** | Published Dataset | `userStrict` | ✅ |
| USER **Reset** | 공 위치만 유지 · 검색 결과/공략/오버레이/타겟/동선 카드 offset 초기화 | — | ✅ (Search 성공 시 Reset 버튼으로 전환) |

### 예정

| Phase | 내용 |
|-------|------|
| **4** | **Spatial Index** — 8×4 grid, `spatialCells` (cue / target / second), Recall 1차 필터 |
| **5** | **trajectory 기반 파생 데이터 생성** — 별도 세션 이관 예정 |

---

## Application Architecture Standard (AAS) v2.0

**상태:** **Complete** — Application Runtime Constitution (SSOT) 확정 (2026-07-03) · **AAS Runtime Migration Complete** — Batch 1~6 완료 (2026-07-13) · **Batch 6 Completed · Final Freeze**

App.jsx를 Application Runtime Orchestrator로 전환하기 위한 Architecture 표준·거버넌스가 완료되었다. Architecture 설계·Migration Blueprint·Governance가 하나의 영구 SSOT 문서로 확정되었다. 실제 Runtime Refactoring은 Batch 단위로 진행 중이다.

### Architecture 문서

| 문서 | 역할 |
|------|------|
| `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` | **Application Runtime Constitution** · **Migration Blueprint** · **Architecture SSOT** |
| `Application Architecture Standard (AAS) v2.0/App_Authority_Inventory.md` | Phase 1 App.jsx 책임 Inventory |
| `Application Architecture Standard (AAS) v2.0/Architecture_Constitution.md` | Architecture 헌법 |
| `Application Architecture Standard (AAS) v2.0/Architecture_Dictionary.md` | 용어 SSOT |
| `Application Architecture Standard (AAS) v2.0/App.jsx_Responsibility_Analysis_Guide.md` | 책임 분석·Migration 가이드 |

### Runtime Migration Design 문서

| 문서 | 역할 | 상태 |
|------|------|------|
| `작업관리/Runtime Refactoring/Batch01/Batch1_Design.md` | Batch 1 Design SSOT — Domain Layer 초기 분리 | ✅ 완료 |
| `작업관리/Runtime Refactoring/Batch02/Batch2_Design.md` | Batch 2 Design SSOT — Presentation Layer 분리 | ✅ 완료 |
| `작업관리/Runtime Refactoring/Batch03/Batch3_Design.md` | **Batch 3 Design SSOT — Application Flow · Search · Dataset · AI** | **✅ 완료 (v1.0, 2026-07-07)** |
| `작업관리/Runtime Refactoring/Batch04/Batch4_Closure.md` | **Batch 4 Closure SSOT — Regression · AC · Architecture · Debt** | **✅ 완료 (v1.0, 2026-07-07)** |
| `작업관리/Runtime Refactoring/Batch05/Batch5_Design.md` | **Batch 5 Design SSOT — Trajectory Runtime · AD-B5-01~11** | **✅ Frozen (v1.0, 2026-07-08) · Implementation Complete** |
| `작업관리/Runtime Refactoring/Batch06/Batch6_Final_Freeze.md` | **Batch 6 Final Freeze — Design v1.0 Frozen 기록 · Closure SSOT · AD-B6-01~10** | **✅ Completed · Final Freeze (2026-07-13)** |
| `작업관리/Runtime Refactoring/Batch06/Batch6_Architecture_Completion_Report.md` | **Batch 6 Architecture Completion Report** | **✅ Final (2026-07-13)** |

### App_Migration_Map.md 구성

- **Part A** — Migration Blueprint (Batch/Priority/Target Layer·Folder·File·Function)
- **Part B** — Architecture Meta (Capability · Owner · Visibility · Architecture Rule · Capability Matrix · Ownership Matrix · Guard Rules)
- **Part C** — Architecture Decision Record (ADR-001 ~ ADR-010)
- **Part D** — Architecture Review Checklist & Approval Flow

### 핵심 원칙 (요약)

- App.jsx는 Runtime Orchestrator 역할만 수행한다.
- 하나의 Capability는 단일 Owner를 가진다.
- Dependency는 단방향이다: `System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation`.
- Runtime Contract를 우회하지 않는다 (System JSON 직접 접근 금지).
- 신규 Architecture 변경은 ADR + Review Checklist를 통과해야 한다.

> **주의:** Architecture SSOT 확정 이후 실제 코드 이동은 Batch 단위로 진행했다. **AAS Runtime Migration Batch 1~6 Complete (2026-07-13).** **SPS STEP4 Inventory Final v1.0 Complete (2026-07-14).** **SPS STEP5 Architecture Audit Final Freeze v1.0 Complete (2026-07-15).** **SPS STEP6 Schema Validation Final Freeze v1.0 Complete (2026-07-17).** 다음: **STEP7**.

### AAS Runtime Migration 진행 상황

| Batch | 위험도 | 대상 | 상태 |
|-------|--------|------|------|
| **Batch 1** | 매우 낮음 | SYS-004/005, CAL-001, MISC-006 — 순수 함수·정규화·파서 | **완료** (2026-07-06) |
| **Batch 2** | 낮음 | APP-013, RND-002/004, TRJ-002, OVL-001~008 — Presentation Layer 분리 | **완료** (2026-07-06) |
| **Batch 3** | 중간 | SRCH-001~005, DS-001~007, CAL-004/006, AI-001~003 | **✅ 완료 (2026-07-07)** |
| **Batch 4** | 높음 | CAL-002/003/005, MISC-004 | **✅ 완료 (2026-07-07)** |
| **Batch 5** | 매우 높음 | TRJ-001/003, RND-003, APP-009 | **✅ Completed (2026-07-08) · Release Approved** |
| **Batch 6** | 최고 | SYS-001/002/003/006, DS-006, Runtime Contract | **✅ Completed · Final Freeze (2026-07-13)** |

### Batch 1 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/domain/system/systemIdentity.ts` | systemId canonicalization · system mode 판정 · useSn 판정 · five-half 판정 · SYS_SYSTEM_CONFIG 임시 은닉 · Batch 6 이후도 API Stable / Implementation Replace(optional SYS-003 meta migration) |
| `frontend/src/domain/calculator/fiveHalfCalculator.ts` | 5½ 2-of-3 계산 (`solveFiveHalfTwoOfThree`) · computed input key 판정 (`fiveHalfComputedInputKey`) |
| `frontend/src/domain/calculator/formulaExpr.ts` | SYS formula expr parsing (`parseSysFormulaExpr`) · display expr 변환 (`getDisplayExprForSys`) |

### Batch 2 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/components/overlays/AnchorEditOverlay.jsx` | 앵커 좌표 편집 오버레이 (OVL-006) |
| `frontend/src/components/overlays/HptOverlay.jsx` | HP/T·STR 오버레이 (OVL-002/003) |
| `frontend/src/components/overlays/AiOverlay.jsx` | AI 코멘트·레슨 오버레이 (OVL-008) |
| `frontend/src/components/overlays/SysOverlay.jsx` | SYS 오버레이 — AD-B2-01 Pure Presentation (OVL-005) |
| `frontend/src/overlay/utils/sysOverlayUtils.jsx` | SysOverlay 공유 헬퍼 16개 (포맷·계산보조·렌더링) |
| `frontend/src/overlay/router/adminOverlayRouter.ts` | Admin Overlay 라우팅 훅 `useAdminOverlayRouter` (OVL-001) |
| `frontend/src/overlay/state/overlayStateMachine.ts` | Admin Overlay 생명주기 훅 `useAdminOverlayLifecycle` (OVL-001) |
| `frontend/src/overlay/router/userOverlayRouter.ts` | User Overlay 라우팅 훅 `useUserOverlayRouter` (OVL-007) |
| `frontend/src/renderer/labels/labelScalePolicy.ts` | 라벨 배율 훅 `useSysLabelScale` (APP-013) |
| `frontend/src/renderer/trajectory/trajectoryRenderModel.ts` | 궤적 렌더 모델 `buildTrajectoryRenderModel` (TRJ-002) |
| `frontend/src/renderer/labels/systemAxisLabelModel.ts` | 축 라벨 모델 `buildSystemAxisLabelModel` (RND-002) |
| `frontend/src/renderer/trajectory/anchorConversionModel.ts` | 앵커 변환 모델 `buildRgAnchors` (RND-004) |

### Batch 4 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/domain/calculator/sysOverlayCalcHelpers.ts` | SysOverlay 순수 calc helper SSOT (AD-B4-01 Option A) |
| `frontend/src/domain/calculator/systemValueCalculator.ts` | CAL-002/003/005 — `buildEffectiveRenderSysValues` · `buildSlotSysSnapshot` · `computeSysOverlayValues` |
| `frontend/src/domain/system/slotSysViewModel.ts` | MISC-004 — `resolveSlotSys()` Render SSOT ViewModel |

### Batch 5 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/domain/trajectory/pathNodeHelpers.ts` | TRJ-001 — cushion path node helpers |
| `frontend/src/domain/trajectory/reflectionPolicy.ts` | TRJ-003 — C2 reflection policy SSOT |
| `frontend/src/domain/trajectory/trajectoryBuilder.ts` | TRJ-001 — `buildTrajectory()` single entry · TrajectoryBuildResult |
| `frontend/src/domain/trajectory/baselineHandleGeometry.ts` | APP-009-B — baseline handle Rg ↔ SYS geometry |
| `frontend/src/overlay/state/baselineDraftState.ts` | APP-009-A — baseline draft overlay React state |
| `frontend/src/renderer/trajectory/trajectoryPathAttrModel.ts` | AD-B5-09 — SVG path attr display model |
| `frontend/src/renderer/trajectory/baselineHandleModel.ts` | AD-B5-11 — baseline handle display model |
| `frontend/src/application/flows/trajectoryHydrateFlow.ts` | AD-B5-07 — slot trajectory hydrate flow |
| `frontend/src/application/flows/baselineDraftApplyFlow.ts` | AD-B5-08 — baseline draft apply flow |

### Batch 5 상태 (Closing SSOT)

| 항목 | 상태 |
|------|------|
| Status | **Completed** |
| Architecture | **Released** |
| Implementation | **Completed** |
| Validation | **PASS** |
| Release | **Approved** |
| Code Baseline | `04e341b` (STEP 5-8) |

---

## 완료된 주요 기능

### SYS

- **시스템 엔진**: `data/systems/*` (profile / anchors / logic), `systemCalculator`, `useSysCalculation`(admin).
- **보정 구조**: `slide`, `draw`, `curve_ratio`, `spin`, `departure` — shotType 부호 연동(5&Half).
- **SYS Overlay**: `components/overlays/SysOverlay.jsx` (AD-B2-01 Pure Presentation, Batch 2 완료). Batch 4: inline calc 제거 — `computeSysOverlayValues` Domain prop 주입 (CAL-005). `admin/sys/SysOverlay.tsx`는 메인 트리 미사용.
- **Render SSOT**: `slotRenderSys`, `resolvedSlotSysValues` / `resolvedSlotBaseSysValues`.
- **USER 기준값**: 3-Level 토글(보정 / 기준 / 비교), `ImpactLines` dual path.

### Caption Engine (OPEN-04 — 완료)

**OPEN-04 Caption Placement Engine 전면 재설계 완료.**

기존 value 기반 탐색·mark별 예외 처리·track별 하드코딩 배치를 제거하였다.  
캡션 배치는 숫자 배열 자체를 기준으로 계산하는 **순수 Geometry 기반 엔진**으로 통합하였다.

**배치 우선순위:**

1. A Space — 첫 숫자 이전 공간
2. B Space — 마지막 숫자 이후 공간
3. Internal Max Gap — 내부 최대 빈 간격

동률 시 외부 공간(A/B)을 우선 선택한다.

**배치 원칙:**

캡션은 항상 `숫자 + 2grid + 캡션` 또는 `캡션 + 2grid + 숫자` 형태를 유지한다.  
캡션 자체를 공간 중앙에 두는 것이 아니라 **숫자와의 관계를 기준**으로 배치한다.

**최종 결과:**

| Mark | 결과 |
|------|------|
| 1쿠션 | 90 이후 외부 공간 우선 |
| 3쿠션 | 90 이전 외부 공간 우선 |
| 4쿠션 측면 | 자체 bucket 기준 계산 (alignC4SideCaptionsToCo 제거) |
| 5쿠션 | 90 이후 외부 공간 우선 |
| 6쿠션 | 20 이전 외부 공간 우선 |
| 출발값 | 코너 앵커 인접 side bucket 포함 → 50~60 공간 사용 |

**코드 SSOT:**

- `domain/systemAxisCaption.ts` — `findBestAlongSequential()`
- `components/table/SystemValueLabels.jsx` — `pushGroup()` CO 코너 bucket 이중 배정

---

### HP/T

- **두께/타점 Overlay**: **ADMIN 전용** 편집 (`HptOverlay`, `overlayState` HPT).
- **관리자 입력**: `adminState.hpt`, slot `draft`/`applied` 동기화.
- **USER HP/T read-only 오버레이** (2026-06-22): 좌측 **두께/타점** 메뉴 복구 · `UserHptPanel` + `userHptViewModel` · `.modal-panel--user-hpt`
  - **Overlay Scale Framework**: `--overlay-scale` (tablet 0.72 · phone landscape 0.44), `--overlay-svg-scale` (SVG 별도 축소)
  - 반투명 패널 `rgba(255,255,255,0.72)` + `backdrop-filter: blur(2px)` · 내부 viz/grid 박스 투명 · `width: fit-content`

### 시스템 레슨 (System Lesson)

**상태:** 보류

USER UI 단순화 정책에 따라 현재 USER 메뉴에서는 노출하지 않는다.

기존 P0 구현은 삭제하지 않고 보존한다.

**보존 대상**

- `components/user/UserSystemLessonPanel.jsx`
- `domain/userSystemLessonViewModel.ts`
- `.modal-panel--user-system-lesson`
- 기존 `SYSTEM_LESSON` 관련 데이터/계산 ViewModel

**현재 판단**

- USER의 1차 목적은 시스템 학습이 아니라 현재 포지션의 실전 공략 확인이다.
- 기존 레슨 콘텐츠는 AI 및 동선 내용과 일부 중복된다.
- 따라서 현재 USER UI는 AI / 두께·타점 / 동선 중심으로 단순화한다.
- 시스템 레슨은 향후 “시스템 학습 모드” 또는 별도 교육 UX로 재설계할 수 있다.

**현재 USER 런타임**

- 레슨 버튼 없음
- `overlayContent === "SYSTEM_LESSON"` 경로는 USER 메뉴에서 진입하지 않음
- 관련 파일은 향후 재사용을 위해 보존

### STR

- **속도·깊이·가속 패턴**: slot `str`, AI 자동 문장에 depth/speed/acceleration 반영.
- **STR Overlay**: ADMIN `App.jsx` 인라인 UI.

### AI

- **자동 생성 SSOT**: `domain/aiAutoCommentViewModel.ts` — `buildAiAutoCommentModel`, `composeAiAutoComment`.
  - SYS 보정 전/후, STR만 포함 (**HP/T·타격강도 제외**).
  - 사용자 공식: `1쿠션값 = 출발값 - 3쿠션값`.
- **표시 형식**: `[기본 공식]` 한 줄, 문단 `\n\n`, `[원 포인트 레슨]` 분리.
- **원 포인트 레슨**: `adminState.ai.onePointLessons` — 저장 구조 유지, USER는 `collectOnePointLessonTexts`로 draft/applied/admin 병합 표시.
- **ADMIN UI**: `App.jsx` `AiOverlay` — 자동 미리보기 + 레슨 DnD + 전체 적용(`text: ""`, 레슨만 slot 반영).
- **USER AI 패널**: `components/user/UserAiPanel.jsx` + `domain/userInfoPanelModel.ts` (`buildUserInfoPanel`).
  - 본문 32px / 제목 40px, 패널 `min(80vw, 1400px)`, `max-height: 72vh`.
  - 상단 공략 제목 중복 제거, 공간 최적화.
  - **반응형 스케일**: `--ai-scale` (tablet 0.72 · phone landscape 0.44) — SYSTEM_LESSON 등과 동일 계수, 변수명만 분리 (통합 Phase 2 **보류**)
- **Deprecated**: `utils/aiPlayStrategyBuilder.ts` `buildPlayStrategy()` — SYS/HP/T/STR 나열형.

### USER 동선분석 (Trajectory Info Card)

- **메뉴:** `TRAJECTORY` · 라벨 **동선**
- **표시:** table-area overlay — `UserTrajectoryInfoCard`
- **역할:** 현재 선택 공략의 기준값/보정값 계산과 진행 경로를 확인하는 실전 분석 UI

#### 카드 위치

- 기본 중앙 배치
- 사용자 드래그 이동 가능
- `trajectoryCardOffset` 기준 위치 관리
- 기준값 ↔ 보정값 전환 시 위치 유지
- 시스템값 표시 ON/OFF 시 위치 유지
- Reset 또는 동선 종료 시 offset 초기화

#### 내부 버튼

동선 카드 내부에는 다음 3개 버튼이 있다.

- **기준값**
- **보정값**
- **시스템값 표시**

#### 기준값 / 보정값

- `trajectoryCardSource`
- 값: `baseline | corrected`
- 상호배타 토글
- 기준값 ON이면 보정값 OFF
- 보정값 ON이면 기준값 OFF
- 둘 중 하나만 표시

#### 시스템값 표시

- `trajectoryShowAxisValues`
- boolean 독립 토글
- 기준값/보정값 상태와 독립적으로 ON/OFF
- 사용자가 직접 `시스템값 표시` 버튼을 눌렀을 때만 변경

허용 조합:

- 기준값 + 시스템값 표시 OFF
- 기준값 + 시스템값 표시 ON
- 보정값 + 시스템값 표시 OFF
- 보정값 + 시스템값 표시 ON

중요 유지 규칙:

- 시스템값 표시 ON 상태에서 기준값 → 보정값 전환 시 ON 유지
- 시스템값 표시 ON 상태에서 보정값 → 기준값 전환 시 ON 유지
- 시스템값 표시는 사용자가 다시 버튼을 눌렀을 때만 OFF

#### 시스템값 표시의 의미

여기서 말하는 시스템값 표시는 현재 계산 결과값 목록이 아니다.

위 값들은 이미 궤적 라벨과 동선 카드 계산값으로 표시된다.

동선 카드의 `시스템값 표시`는 관리자 SYS/Grid에서 사용하는 **레일/프레임 축 시스템 기준 눈금**을 USER 동선 화면에 표시하는 기능이다.

사용 목적:

- 사용자가 “왜 출발값이 33인가?”를 즉시 이해할 수 있도록 한다.
- 기준값/보정값 궤적 위에 축 기준 숫자를 함께 표시해 위치 감각을 제공한다.

#### 렌더링 원칙

시스템값 표시 ON:

- 현재 기준값/보정값 궤적 유지
- 현재 CO/C1/C3/C4 등 궤적 라벨 유지
- 추가로 레일/프레임 축 시스템 기준 숫자 표시

시스템값 표시 OFF:

- 축 시스템 기준 숫자만 숨김
- 궤적과 현재 계산 라벨은 유지

#### 금지

- ADMIN용 Grid 편집 UI 노출 금지
- SYS 계산 엔진 변경 금지
- `SystemValueLabels` 축 숫자 크기/`labelScale` 임의 변경 금지
- baseline/corrected 계산 로직 변경 금지

#### UI 스타일

- 반투명 카드
- blur 적용 가능
- 카드 전체 드래그 가능
- 버튼 클릭은 기존 동작 유지
- 스크롤 없는 compact layout 지향
- 모바일/PC에서 동일 기능 유지

#### ViewModel / 코드

- `domain/userTrajectoryCardViewModel.ts`
- `components/user/UserTrajectoryInfoCard.jsx`
- `.user-trajectory-info-card` (`index.css`)
- `App.jsx` — `trajectoryCardSource`, `trajectoryShowAxisValues`, `trajectoryCardOffset`

#### Trajectory Display Cap

2026-06에 추가된 표시 안전 정책은 유지한다.

- `domain/trajectoryPathDisplayPolicy.ts`
- baseline/corrected 독립 path depth
- `endIndex = min(sameRailCap, secondBallCap, chainBreakCap)`
- 연속 segment `(node[i] → node[i+1])` 양 끝 동일 rail이면 해당 segment부터 path/label 미표시
- CO–C3–C6 같은 비연속 동일 rail은 허용
- 계산 엔진 및 C5/C6 sync rule은 변경하지 않음

### USER 시스템값 라벨 (System Value Labels)

- **노출 방식**: 독립 USER 메뉴가 아니라 **동선 카드 내부 `시스템값 표시` 토글**로 노출
- **Phone Landscape 확대**: `MEDIA_PHONE_LANDSCAPE` → `labelScale` **1.5** (`SYS_LABEL_PHONE_LANDSCAPE_SCALE`, `tableConfig.ts`)
- **터치 Persistent Selection** (2026-06-22): 라벨 탭 → 선택 유지(1.8× 확대) · 다른 라벨 탭 → 전환 · 빈 테이블 영역 탭 → 해제 · document capture + transparent dismiss rect
- **Caption Engine 연동**: `systemAxisCaption.ts` — `labelScale` 비례 placement · `SystemValueLabels.jsx` · `LabelText.jsx`
- **버그 수정**: `App.jsx` — `sysLabelScale` hooks를 `loading`/`error` early return **이전**으로 이동 (React hooks 순서 오류 해결)

---

## 현재 UI 구조

### 관리자 (ADMIN)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| **로컬DB** (Stage rail) | — | local `positions_dataset` · profile `adminSearch` |
| **Search** (우측 패널) | — | published · profile `adminStrict` (= USER Search와 동일 corpus) |
| S1/S2/S3 | — | slot 전환, hydrate |
| SYS | `overlayState` SYS | 편집·Apply |
| HP/T | HPT | 편집 |
| STR | STR | 편집 |
| AI | AI | 자동 코멘트 + 원 포인트 레슨 + 전체 적용 |

### 사용자 (USER)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| Search / Reset | — | Search 성공 시 Reset으로 전환 · Reset은 공 위치만 유지하고 검색 결과/공략/오버레이/타겟 상태 초기화 |
| 공략 버튼 | — | USER Search 성공 시 활성 · 선택 공략 기준으로 AI/타법/동선 표시 |
| AI | `overlayContent === "AI"` | `UserAiPanel` · 현재 공략 핵심/원포인트 레슨 |
| 두께/타점 | `overlayContent === "HP/T"` | `UserHptPanel` read-only |
| 동선 | table-area overlay | `UserTrajectoryInfoCard` · 기준값/보정값/시스템값 표시 |
| History | 모달 | |

---

## 핵심 코드 SSOT 맵 (전역)

| 영역 | 파일 |
|------|------|
| Orchestrator | `frontend/src/App.jsx`, `components/Stage.jsx`, `components/common/ModalShell.jsx` |
| 슬롯·SAVE | `hooks/useShotSlots.ts`, `domain/canonicalStrategy.ts`, `domain/adminSaveEngine.ts`, `domain/positionMergeEngine.ts` |
| Recall·Search | `domain/positionSearchEngine.ts`, `domain/positionRecallEngine.ts`, `domain/recall/recallEngine.ts`, `domain/recall/recallProfiles.ts`, `domain/recall/recallCompare.ts` |
| Published Dataset | `domain/publishedDatasetStore.ts`, `domain/datasetLoader.ts`, `domain/publishedLeafResolve.ts`, `domain/datasetPath.ts` |
| Dataset Export | `domain/datasetExport.ts`, `domain/datasetPath.ts`, `hooks/useSettings.js` (`handleExportSnapshots`) |
| Workspace History | `domain/workspaceHistory.ts`, `hooks/useSettings.js` (`commitWorkspaceHistoryWithStrategyDataset`) |
| Slot hydrate | `domain/slotRuntimeHydrate.ts` |
| Render SYS | `domain/slotSysResolve.ts` (App: `slotRenderSys`, effective values) |
| 궤적 | `utils/trajectory/curveTrajectory.ts`, `hooks/useTrajectoryState.ts`, `components/table/ImpactLines.jsx` |
| Anchors | `domain/anchorLookupEngine.ts`, `domain/anchorCoordinateEngine.ts`, `domain/reflectionEngine.ts` |
| **Caption Engine** | `domain/systemAxisCaption.ts` (`findBestAlongSequential`), `components/table/SystemValueLabels.jsx` (`pushGroup`) |
| Overlay Router | `overlay/router/adminOverlayRouter.ts` (`useAdminOverlayRouter`), `overlay/state/overlayStateMachine.ts` (`useAdminOverlayLifecycle`), `overlay/router/userOverlayRouter.ts` (`useUserOverlayRouter`) |
| Overlay Utils | `overlay/utils/sysOverlayUtils.jsx` — SysOverlay 공유 헬퍼 |
| Renderer Label | `renderer/labels/labelScalePolicy.ts` (`useSysLabelScale`), `renderer/labels/systemAxisLabelModel.ts` (`buildSystemAxisLabelModel`) |
| Renderer Trajectory | `renderer/trajectory/trajectoryRenderModel.ts` · `trajectoryPathAttrModel.ts` · `baselineHandleModel.ts` · `anchorConversionModel.ts` |
| Trajectory Domain | `domain/trajectory/trajectoryBuilder.ts` · `reflectionPolicy.ts` · `pathNodeHelpers.ts` · `baselineHandleGeometry.ts` |
| Trajectory Flows | `application/flows/trajectoryHydrateFlow.ts` · `baselineDraftApplyFlow.ts` |
| Admin SYS 식 | `admin/sys/useSysCalculation.ts` |
| App SYS·궤적 | `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts` |
| AI 자동 코멘트 | `domain/aiAutoCommentViewModel.ts` |
| USER 패널 | `domain/userInfoPanelModel.ts`, `components/user/UserAiPanel.jsx` |
| USER 시스템 레슨 (보류) | `domain/userSystemLessonViewModel.ts`, `components/user/UserSystemLessonPanel.jsx` — 현재 USER 메뉴 비노출, 향후 학습 모드 재사용 후보 |
| USER HP/T | `components/user/UserHptPanel.jsx`, `domain/userHptViewModel.ts`, `.modal-panel--user-hpt` |
| USER 동선 | `components/user/UserTrajectoryInfoCard.jsx`, `domain/userTrajectoryCardViewModel.ts`, `domain/trajectoryPathDisplayPolicy.ts`, `.user-trajectory-info-card`, `App.jsx` (`trajectoryCardSource`, `trajectoryShowAxisValues`, `trajectoryCardOffset`) |
| USER 시스템값 표시 | `components/table/SystemValueLabels.jsx`, `components/table/LabelText.jsx`, `config/tableConfig.ts` — 동선 카드 내부 토글로 노출 |
| Overlay 반응형 CSS | `frontend/src/index.css` — `--overlay-scale`, `--ai-scale`, `--overlay-svg-scale` |

---

## 코드 SSOT 맵 (AI·USER 오버레이)

| 역할 | 파일 |
|------|------|
| 자동 코멘트 모델 | `frontend/src/domain/aiAutoCommentViewModel.ts` |
| USER 패널 모델 | `frontend/src/domain/userInfoPanelModel.ts` |
| USER AI UI | `frontend/src/components/user/UserAiPanel.jsx` |
| USER 시스템 레슨 (보류) UI | `frontend/src/components/user/UserSystemLessonPanel.jsx` |
| USER 시스템 레슨 (보류) VM | `frontend/src/domain/userSystemLessonViewModel.ts` |
| USER 동선분석 UI | `frontend/src/components/user/UserTrajectoryInfoCard.jsx` |
| USER 동선분석 VM | `frontend/src/domain/userTrajectoryCardViewModel.ts` |
| USER HP/T UI | `frontend/src/components/user/UserHptPanel.jsx` |
| USER 시스템값 표시 | `frontend/src/components/table/SystemValueLabels.jsx` — 동선 카드 내부 `시스템값 표시` 토글로 제어 |
| USER 오버레이 | `frontend/src/App.jsx` (`overlayContent`: AI · HP/T; table-area: Trajectory card) |
| Stage 버튼 연동 | `frontend/src/components/Stage.jsx` (`USER_FUNC_IDS`, `onUserFuncButtonSelect`) |
| ADMIN AI | `frontend/src/App.jsx` `AiOverlay` |
| 스타일 | `frontend/src/index.css` (`.modal-panel--user-ai`, `.modal-panel--user-system-lesson`, `.user-trajectory-info-card`, `.modal-panel--user-hpt`) |

---

## 현재 완료 상태

### 완료

- **Application Architecture Standard (AAS) v2.0** — Application Runtime Constitution (SSOT) 확정 (2026-07-03):
  - ✔ Application Migration Blueprint
  - ✔ Architecture Meta
  - ✔ Capability Ownership Matrix
  - ✔ Architecture Capability Matrix
  - ✔ Architecture Decision Record (ADR-001~010)
  - ✔ Architecture Review Checklist
  - ✔ Architecture Approval Flow
  - ✔ Runtime Constitution
  - ✔ Architecture Governance
- **AAS Runtime Migration Batch 1** — Domain Layer 초기 분리 완료 (2026-07-06):
  - ✔ Batch1 Analysis · Design v1.2 · Architecture Review
  - ✔ `domain/system/systemIdentity.ts` 생성 (SYS-004/005)
  - ✔ `domain/calculator/fiveHalfCalculator.ts` 생성 (CAL-001)
  - ✔ `domain/calculator/formulaExpr.ts` 생성 (MISC-006)
  - ✔ App.jsx 순수 함수 95 lines 제거 · SYS-005 inline 정규화 3곳 제거
  - ✔ npm run build PASS · Regression R-1~R-10 PASS · Acceptance AC-1~AC-11 PASS
- **AAS Runtime Migration Batch 2** — Presentation Layer 분리 완료 (2026-07-06):
  - ✔ Batch2 Design v1.1 · STEP Lock Rule · Architecture Decisions AD-B2-01/02/03
  - ✔ `components/overlays/AnchorEditOverlay.jsx` (OVL-006)
  - ✔ `components/overlays/HptOverlay.jsx` (OVL-002/003)
  - ✔ `components/overlays/AiOverlay.jsx` (OVL-008)
  - ✔ `components/overlays/SysOverlay.jsx` AD-B2-01 Pure Presentation (OVL-005)
  - ✔ `overlay/utils/sysOverlayUtils.jsx` 공유 헬퍼 16개
  - ✔ `overlay/router/adminOverlayRouter.ts` · `overlay/state/overlayStateMachine.ts` (OVL-001)
  - ✔ `overlay/router/userOverlayRouter.ts` (OVL-007)
  - ✔ `renderer/labels/labelScalePolicy.ts` (APP-013)
  - ✔ `renderer/trajectory/trajectoryRenderModel.ts` (TRJ-002)
  - ✔ `renderer/labels/systemAxisLabelModel.ts` (RND-002)
  - ✔ `renderer/trajectory/anchorConversionModel.ts` (RND-004)
  - ✔ AD-B2-02: `sysOverlayInputFinite` module-private · Migration Debt D-002 Close
  - ✔ App.jsx 8,983 → 6,509 lines (−2,474 lines)
  - ✔ npm run build PASS · Import Graph Validation PASS
  - ✔ Batch 2 Baseline 확정 · origin/main Push 완료
- **AAS Runtime Migration Batch 3** — Application Flow · Search · Dataset · AI Domain 분리 완료 (2026-07-07):
  - ✔ Batch3 Design v1.0 · STEP Lock Rule · Architecture Decisions AD-B3-01~05
  - ✔ `application/flows/recallHydrateFlow.ts` (CAL-004)
  - ✔ `application/flows/resetFlow.ts` (SRCH-004)
  - ✔ `application/flows/adminLocalDbFlow.ts` (SRCH-001)
  - ✔ `application/flows/adminSearchFlow.ts` (SRCH-002)
  - ✔ `application/flows/userSearchFlow.ts` (SRCH-003)
  - ✔ `application/flows/saveFlow.ts` (SRCH-005 + DS-002)
  - ✔ `application/flows/historyFlow.ts` (DS-003)
  - ✔ `application/flows/ballDragFlow.ts` (CAL-006)
  - ✔ `domain/lesson/onePointLibrary.ts` (AI-002)
  - ✔ `domain/dataset/infra/datasetStorage.ts` (DS-001 + DS-004)
  - ✔ `domain/dataset/autoCapture.ts` (MISC-002)
  - ✔ App.jsx 6,509 → 5,807 lines (−702 lines)
  - ✔ npm run build PASS · Regression R-B3-C1~C8 PASS · Acceptance AC-1~AC-17 PASS (AC-2 부분: 목표 ~5,400 lines 미달, −702 감소)
  - ✔ Migration Debt D-006/D-007 Open · D-008 Closed · Batch 3 Baseline 확정
- **AAS Runtime Migration Batch 4** — Calculation Runtime Domain 이전 완료 (2026-07-07):
  - ✔ STEP 4-1~4-4 (4 commits): CAL-002/003/005, MISC-004
  - ✔ `domain/calculator/systemValueCalculator.ts` · `domain/calculator/sysOverlayCalcHelpers.ts`
  - ✔ `domain/system/slotSysViewModel.ts` (resolveSlotSys)
  - ✔ AD-B4-01: Option A Domain helper co-location
  - ✔ App.jsx 5,807 → 5,640 lines (−167 lines)
  - ✔ npm run build PASS · Regression R-B4-C1~C6 PASS · Acceptance AC-1~AC-12 PASS
  - ✔ Migration Debt D-008 Closed · Batch 4 Baseline 확정
- **AAS Runtime Migration Batch 5** — Trajectory Runtime Domain 이전 완료 (2026-07-08):
  - ✔ STEP 5-1~5-8 (9 commits): TRJ-001/003, RND-003, APP-009
  - ✔ `domain/trajectory/` · `application/flows/trajectoryHydrateFlow` · `baselineDraftApplyFlow`
  - ✔ `renderer/trajectory/trajectoryPathAttrModel` · `baselineHandleModel`
  - ✔ `overlay/state/baselineDraftState` · AD-B5-01~11
  - ✔ App.jsx 5,640 → ~3,903 lines · Orchestrator only
  - ✔ npm run build PASS · Release Gate PASS · Batch 5 Closed · Release Approved · Batch 6 Ready
- **AAS Runtime Migration Batch 6** — Runtime Contract / Registry / Loader 완료 (2026-07-13):
  - ✔ STEP 6-1~6-7 (+ API boundary cleanup): Contract · Registry · Loader · Debt Closure
  - ✔ `runtime/contract/` · `runtime/registry/` · `runtime/loader/` · `runtime/index.ts`
  - ✔ Public API: `getSystemContract` · `extractTrajectoryContractView` · Import Graph Gate PASS
  - ✔ D-005 / D-006 / D-007 / D-009 / D-010 **Closed**
  - ✔ Serializable Contract (AD-B6-10) · AC-1~AC-21 PASS · Batch5 parity 유지
  - ✔ Final Code Baseline `ec71ef9` · **Completed · Final Freeze**
  - ✔ Closure: `Batch06/Batch6_Final_Freeze.md` · `Batch6_Architecture_Completion_Report.md`
- **SPS STEP4 System Inventory Final (v1.0, 2026-07-14)**:
  - ✔ STEP4-1 Discovery · STEP4-2 Inventory/Observation SSOT · STEP4-3 Metadata · STEP4-4 Registration
  - ✔ STEP4 Inventory Assets (§19 Reference Entry Point)
  - ✔ Frozen Assets / Frozen Rules declared (§20)
  - ✔ Inventory ID `SYS-001`…`SYS-038` · Observation Codes frozen
  - ✔ SSOT: `System Platform Standard (SPS) v1.0/System_Inventory.md` **v1.0 Final**
- **SPS STEP5 Architecture Audit Final Freeze (v1.0, 2026-07-15)**:
  - ✔ STEP5-1 Framework Frozen
  - ✔ STEP5-2 Audit Plan Frozen
  - ✔ STEP5-3 Audit Rule Catalog Frozen
  - ✔ STEP5-4 Observation Mapping Register · Evidence Register Frozen
  - ✔ STEP5-5 Finding · Violation · Recommendation · Architecture Decision Registers Frozen
  - ✔ STEP5-6 Architecture Audit Report Template · STEP6 Handoff Template Frozen
  - ✔ `STEP5_FINAL_FREEZE.md` declared
  - ✔ Location: `System Platform Standard (SPS) v1.0/`
- **SPS STEP6 Schema Validation — Framework + Pipeline Freeze Candidate (2026-07-15)**:
  - ✔ STEP6-1 Framework Draft · Review PASS · QA Patch · **Freeze Candidate (Locked)**
  - ✔ STEP6-2 Validation Pipeline Draft · Review PASS · QA Patch · **Freeze Candidate (Locked)**
  - ✔ Architecture Locked · Pipeline = Framework **Consume-only**
  - ✔ SSOT: `STEP6_Schema_Validation_Framework.md` v1.0 · `STEP6_Validation_Pipeline.md` v0.6
  - ✔ Location: `System Platform Standard (SPS) v1.0/`
- **SPS STEP6-3 Schema Rule Analysis Complete (v1.1, 2026-07-17)**:
  - ✔ Analysis Only · Framework / Pipeline **Consume Only**
  - ✔ Domain (WHAT) ≠ Family (HOW) 분리
  - ✔ Rule Type · Layer Mapping · Coverage 후보 · Rule Dependency (Cascade / Skip / Blocking / Deferred)
  - ✔ Classification Axis = **후보만** (STEP6-4 Design)
  - ✔ SSOT: `STEP6-3_Schema_Rule_Analysis.md` v1.1
  - ✔ Next: **STEP6-4 Rule Catalog Design**
- **SPS STEP6-4 Rule Catalog Design Complete (v0.2, 2026-07-17)**:
  - ✔ Design Only · Domain≠Family · Layer×Type · Coverage/Dependency expression · Header Metadata
  - ✔ Classification Axis = candidates only
  - ✔ SSOT: `STEP6-4_Rule_Catalog_Design.md` v0.2
- **SPS STEP6-5 Validation Register Suite Complete (v0.2, 2026-07-17)**:
  - ✔ Design Only · Rule Record · Catalog Pin cite · Dependency refs · Rule ID scheme
  - ✔ **Register State / Lifecycle** — Draft · Proposed · Approved · Active · Deprecated · Archived
  - ✔ State ≠ Execution Status
  - ✔ SSOT: `STEP6-5_Validation_Register_Suite.md` v0.2
- **SPS STEP6-6…STEP6-11 Schema Validation Complete · Final Freeze (2026-07-17)**:
  - ✔ STEP6-6 Engine Design v0.2
  - ✔ STEP6-7 Engine Implementation (7A–7G) — `frontend/src/validation/engine/`
  - ✔ STEP6-8 Pilot Validation · STEP6-9 Full Validation (Production)
  - ✔ STEP6-10 Validation Report v1.0 · Known Issues KI-01…04
  - ✔ STEP6-11 **Final Freeze v1.0** — `STEP6_FINAL_FREEZE.md`
  - ✔ Ops: `DEVELOPMENT_WORKFLOW.md` v0.3 (Implementation Decomposition)
  - ✔ Next: **STEP7**
- **SPS STEP7 P2 Catalog Design Complete (v0.15, 2026-07-19)**:
  - ✔ Sessions `S7-P2-IU-2-01A` … `S7-P2-IU-2-08B` PASS
  - ✔ SSOT: `STEP7_Catalog_Freeze_Design.md` **v0.15**
  - ✔ Decisions Locked: **NS-U1-001 Option (C)** · **CL-001** · **CV-001**
  - ✔ Gate + Declaration procedure defined · Freeze Candidate **Not Declared**
  - ✔ Catalog/Register JSON **not created** · `catalogPinId` **not issued**
  - ✔ Next: **P3** · **`S7-P3-IU-3-01A`** (superseded — P3 now Complete)
- **SPS STEP7 P3 Gap Analysis Complete (2026-07-19)**:
  - ✔ Sessions `S7-P3-IU-3-01A` … `S7-P3-IU-3-06A` PASS
  - ✔ D-GAP-A Complete · D-GAP-R Schema Rev.1 · D-GAP-R Complete Draft (13 rows)
  - ✔ **VG-P3 PASS** · High undocumented = 0
  - ✔ Decisions: **`DGR-NNN`** · `resolutionClass` taxonomy only · Candidate Severity · Severity Lock Deferred · Resolution Design → P4+
  - ✔ Next: **P4** · **`S7-P4-IU-4-01A`** (superseded — P4 now Complete)
- **SPS STEP7 P4 Standardization Plan Complete (2026-07-20)**:
  - ✔ Sessions `S7-P4-IU-4-01A` … `S7-P4-IU-4-08A` PASS
  - ✔ Official docs: `STEP7_P4_IU-4-0*.md` (Scope · Principles · Mapping · Taxonomy · Workflow · IU Planning · Gate · Review)
  - ✔ **VG-P4 PASS** · P4 Freeze Candidate **Recommended** (Planning rules)
  - ✔ Ops: `OPS_AI_MODEL_GUIDE.md` v0.1 created
  - ✔ Next: **P5** · **WG-AI-001 PASS** · **`STEP7_P5_IU-5-04A` Ready**
- **SPS STEP7 P5 Change Design Complete (2026-07-21)**:
  - ✔ IU-5-01A…05A PASS · WG-AI-001 PASS · Architecture Workflow PASS
  - ✔ Working Guideline → IU Consume 패턴 최초 적용
  - ✔ Design-only · Apply / Verification / Runtime / System JSON 변경 없음
  - ✔ Next: **P6** · **`STEP7_P6_IU-6-01A` Ready**
- **SPS STEP7 P6 Apply Decision Complete (2026-07-21 · Design-only)**:
  - ✔ IU-6-01A (Apply Decision Scope) · IU-6-02A (Apply Candidate) · IU-6-03A (Decision Criteria)
  - ✔ IU-6-04A (Apply Readiness Review) · IU-6-05A (Apply Decision Outcome) · IU-6-06A (Verification Entry)
  - ✔ Workflow: Scope → Candidate → Criteria → Readiness → Outcome → Verification Entry
  - ✔ WG-AI-001 · P5 IU-5-01A…05A Consume Only · Rule 재정의 없음
  - ✔ Design-only · Apply / Verification / Runtime / System JSON / WG / P5 변경 없음
  - ✔ Next: **P6 Fleet** · **`STEP7_P6_FLEET_BATCH1_01A`**
- AI 오버레이 리팩토링 (SYS+STR SSOT, 레슨 분리)
- 원 포인트 레슨 ADMIN/USER 표시 분리
- USER AI 패널 가독성·크기·공간 최적화
- **USER UX 단순화** — USER 레슨 버튼 제거, AI/두께·타점/동선 중심 실전 공략 구조 확정
- **USER 동선 카드 개편** — 기준값/보정값 상호배타 토글 + 시스템값 표시 독립 토글
- **USER 시스템값 표시 이동** — 독립 메뉴가 아니라 동선 카드 내부 축 시스템값 표시 토글로 통합
- **동선 카드 위치 관리** — 드래그 이동, 위치 유지, Reset 시 offset 초기화
- **Search/Reset UX** — Search 성공 시 Reset 전환, Reset은 공 위치만 유지하고 검색 결과/공략/오버레이/타겟 상태 초기화
- USER **시스템 레슨** P0 구현 이력 보존 (`ffe0a26`: ViewModel·Panel) — 현재는 USER UX 단순화 정책에 따라 메뉴 비노출
- **SYSTEM_LESSON 모바일 UI 최적화 이력 보존** — 현재 활성 메뉴는 아니며 향후 학습 모드 재사용 후보
- **SYSTEM_LESSON Table Layout 확정 이력 보존** — 표 기반·2섹션·4쿠션 3칸
- **SYSTEM_LESSON Overlay UX 이력 보존** — 단일 오버레이·내부 스크롤·AI/CTA/스택 없음
- Slot runtime / Recall canonical (2026-05 PHASE 2)
- Modal draggable + viewport clamp
- Hermite 궤적 baseline, anchors SSOT·canonical persist (2026-05)
- **Dataset Architecture Phase 1** — Dataset Export, `dataset/{공략}/{시스템}/positions.json`, envelope `schemaVersion: 2`
- **Dataset Architecture Phase 2** — Published Dataset Loader, ADMIN Search (published) → published corpus, published leaf URL fallback (`publishedLeafResolve`)
- **Dataset Architecture Phase 3** — USER Search → published, Search/Recall 토글 제거, carry-over 제거
- **Dataset Architecture Phase 3-1** — Recall profile 분리 (`userStrict` / `adminSearch` / `adminStrict`)
- **OPEN-04 Caption Placement Engine** — Geometry 기반 엔진 전면 재설계 (A→B→Gap 순위, safetyMargin 2grid 고정, CO 코너 앵커 이중 bucket, `alignC4SideCaptionsToCo` 제거) — 전 트랙 검증 완료
- **USER Overlay Scale Framework (B-1)** — `--overlay-scale` / `--ai-scale` / `--overlay-svg-scale` · tablet 0.72 · phone landscape 0.44 (`index.css`)
- **USER HP/T read-only 오버레이** — 모바일 스케일·반투명 패널·SVG 축소 · `UserHptPanel`
- **USER System Value Labels** — phone landscape 1.5× · 터치 persistent selection · `App.jsx` hooks 순서 수정
- **USER 동선분석 Overlay** — 투명 패널 · 가독성(26px·shadow) · `[공식]`/`[계산]` 섹션 · 기준/보정 계산값 제목 제거
- **Trajectory Display Cap** — same-rail 연속 segment 차단 · baseline/corrected 독립 세컨드볼 cap · `trajectoryPathDisplayPolicy.ts`

### 진행 중

- 운영 검증 회귀 조사 — §Known Issues / Investigation (2026-06) · `HISTORY/PROJECT_LOG_2026-06.md` §16
- OPEN-05 ADMIN Recall / LocalDB Trajectory Rehydration — 조사 완료 · Known Issue 유지 · `HISTORY/PROJECT_LOG_2026-06.md` §17

### 예정

- **STEP7 Agent Implementation — P6 Complete** — P5 IU-5-01A…05A PASS · P6 IU-6-01A…06A Complete (Design-only) · WG-AI-001 PASS · Next Session **`STEP7_P6_FLEET_BATCH1_01A`** (P6 Fleet Batch 1) · Prerequisite P6 IU suite Complete · Verification Entry Complete
- **STEP7 remaining Phases** — Pilot → Fleet → Re-validation → Freeze (WBS) · P2 Catalog · P3 Gap · **P4 Plan done**
- **Catalog Freeze delivery (post-Design)** — on-disk Catalog/Register JSON · live Freeze Candidate declaration · `catalogPinId` mint (procedure in Design §14)
- **P4 residuals** — Mapping/Taxonomy value population · Change Design after Gate Package PASS
- **Overlay Scale Layer 통합 (Phase 2, 보류)** — `--ai-scale` → `--overlay-scale` 통일 · MQ 블록 4→1 축소 (기능 영향 없음, 유지보수용)
- **Dataset Architecture Phase 4** — Spatial Index (`spatialCells`, 8×4 grid)
- **trajectory 기반 파생 데이터 생성** — 별도 세션 이관 예정
- 시스템 레슨: sunrise/sunset 등 **비 5½** 시스템 확장
- 학습 흐름 확장: AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비만, 스택 없음)

---

## Known Issues / Investigation (2026-06)

**기록일:** 2026-06-13 (OPEN-05 갱신: 2026-06-18 · OPEN-04 종료: 2026-06-20 · OPEN-03 종료: 2026-06-22)  
**상세 조사:** `HISTORY/PROJECT_LOG_2026-06.md` §16 · §17 (OPEN-05) · §18 (OPEN-04) · §19 (USER Overlay)

### OPEN-01 USER Search 임팩트 방향 불일치

**상태:** 조사 중

**증상:**

- ADMIN **Search (published)**과 USER Search가 동일 record를 사용해도 임팩트 방향이 다르게 표시되는 사례 존재

**현재 가설:**

- `targetColor`(UI) · `draft.targetBall` · `record.targetBall` 동기화 시점 차이
- Search apply = draft only; hydrate = 공략 버튼 선택 시

**우선순위:** P0

### OPEN-02 신규 Export 데이터 Search 실패

**상태:** 조사 중

**증상:**

- 신규 export 후 ADMIN Search (published) 및 USER Search에서 조회되지 않는 사례 존재

**현재 가설:**

- Published Dataset Loader · profile (`userStrict` / `adminStrict`) · exact match 조건 · cache stale 중 하나

**우선순위:** P0

### OPEN-03 USER HP/T 버튼 소실

**상태:** **해결** (2026-06-22) — USER 좌측 **두께/타점** 메뉴·read-only `UserHptPanel` 복구

**이력:**

- 시스템레슨 메뉴 분리 시 USER HP/T **의도적 제거** (`ffe0a26`, §12)
- 운영 검증(§16)에서 버튼 소실 OPEN 등록
- 2026-06-22: `Stage.jsx` `HP/T` · `overlayContent === "HP/T"` · `.modal-panel--user-hpt` 스케일·UI 복구

**우선순위:** ~~P1~~ CLOSED

### OPEN-05 — ADMIN Recall / LocalDB Trajectory Rehydration Investigation

**상태:** 조사 완료 · Known Issue 유지

**배경:**

- Dataset Architecture 이후 운영 테스트 중 발견
- 새로고침 직후 LocalDB 클릭 시 과거 SYS/C1/C3/Trajectory가 표시되는 사례 확인
- Search 클릭 시 다른 trajectory가 표시되는 사례 확인

**조사 결과:**

1. **recommendedFrom fallback 경로는 제거됨** (OPEN-05A)
   - 과거 no-match fallback이 원인은 아님
   - `slot_draft_fallback` 관련 경로는 현재 원인 아님

2. **applied slot 오염 가설 기각** (OPEN-05B)
   - `applyPositionRecall()`은 applied를 쓰지 않음
   - recall 결과는 `slot.draft`에 기록
   - 새로고침 직후 applied는 null 상태
   - `resolveSlotSysForRender()`는 draft 우선 사용

3. **실제 재생성 경로 확인**
   - spatial match 성공 → `slot.draft` hydrate → `syncSlotRuntimeAdminAndTrajectory()` → trajectory 재생성

4. **OPEN-05C 안정화 작업**
   - 수행: mismatch gate 추가 · recall display draft 제거 강화 · clear 직후 trajectory reset 강화 · helper crash 수정 · `flushSync` 적용
   - 결과: no-match 시 alert 동작 · 백지화 오류 제거 · 일부 recall 경로 정리
   - **완전 해결 아님** — 아래 현상 잔존

**아직 확인되는 현상:**

- 새로고침 직후 LocalDB 클릭
- 특정 spatial match 상황

에서 과거 SYS/C1/C3/Trajectory가 표시되는 사례 존재

**현재 판단:**

- trajectory engine 오류로 확정되지 않음

**우선순위:** Known Issue (Low Priority)

**사유:**

- target 선택 시 정상
- SYS 입력 시 정상
- 일반 사용자 흐름 영향 낮음

**향후 조사 후보:**

- spatial match 자체
- hydrate chain
- `syncSlotRuntimeAdminAndTrajectory`
- trajectory label source
- localStorage corpus contamination
- render memo cache

**상세:** `HISTORY/PROJECT_LOG_2026-06.md` §17

---

## 다음 작업 우선순위

> **Architecture 상태:** AAS v2.0 **완료**. Batch 1~6 **Final Freeze**. STEP4/5 **Final Freeze**. **STEP6 Final Freeze v1.0**. **STEP7** P2–P6 **Complete**. **STEP8 Fleet Apply Completed** — B0·B1·B2·B2.5·**B4·B5·B6·B7·B8 PASS** · **Final Validation Gate v1.0** · B3 **HALTED (Hold)** · Ops Workflow **v1.0**. **Current: Post-STEP8** · **Next: STEP9 Entry**.

### STEP7 상태

```text
STEP7 Scope
Approved
        ↓
STEP7 Work Breakdown
Approved
        ↓
STEP7 Implementation Decomposition
Approved
        ↓
P2 Catalog Design
COMPLETE (v0.15)
        ↓
P3 Gap Analysis
COMPLETE · VG-P3 PASS
        ↓
P4 Standardization Plan
COMPLETE · VG-P4 PASS
        ↓
P5 Change Design
COMPLETE · IU-5-01A…05A PASS · WG-AI-001 PASS
        ↓
P6 Apply Decision
COMPLETE · IU-6-01A…06A · Design-only
        ↓
Next Stage
STEP7 P6 Fleet · STEP7_P6_FLEET_BATCH1_01A
```

| Item | Status |
|------|--------|
| **STEP7 Scope** | **Approved** |
| **STEP7 Work Breakdown** | **Approved** |
| **STEP7 Implementation Decomposition** | **Approved** (`작업관리/STEP7_IMPLEMENTATION_DECOMPOSITION.md` v1.0) |
| **P2 Catalog** | **COMPLETE** (Design · `IU-2-01A` … `IU-2-08B`) |
| **Catalog Freeze Design** | **`STEP7_Catalog_Freeze_Design.md` v0.15** |
| **P3 Gap Analysis** | **COMPLETE** (`IU-3-01A` … `IU-3-06A`) |
| **VG-P3** | **PASS** |
| **D-GAP-A** | **Complete** (Draft) |
| **D-GAP-R Schema** | **Rev.1** (`DGR-NNN`) |
| **D-GAP-R** | **Complete Draft** (13 rows) |
| **P4 Standardization Plan** | **COMPLETE** (`IU-4-01A` … `IU-4-08A`) |
| **VG-P4** | **PASS** |
| **P4 Freeze Candidate** | **Recommended** (Planning rules) |
| **P5 Change Design** | **COMPLETE** (`IU-5-01A` … `IU-5-05A` PASS) |
| **P6 Apply Decision** | **COMPLETE** (`IU-6-01A` … `IU-6-06A` · Design-only) |
| **P6 Verification Entry** | **Complete** (IU-6-06A · P7 Handoff Package) |
| **WG-AI-001** | **PASS** · Consume · Freeze Candidate |
| **Severity** | **Candidate only** · Lock **Deferred** |
| **NS-U1-001** | **Locked** — Option (C) Dual catalogs |
| **CL-001** | **Locked** |
| **CV-001** | **Locked** |
| **Freeze Candidate (Catalog)** | **Not Declared** |
| **Catalog / Register JSON** | **Not created** |
| **catalogPinId** | **Not issued** |
| **Current Stage** | **Post-STEP8** · STEP8 Fleet Apply **Completed** · Final Validation Gate v1.0 · B3 HALTED (Hold) |
| **Prerequisite** | **Final Validation Gate v1.0 (= Fleet Validation Standard baseline) · Ch.8–Ch.11 Ratified · Ops Workflow v1.0** |
| **Next Session** | **STEP9 Entry** |
| **Current Queue** | **STEP9** |
| **Ops AI Guide** | **`OPS_AI_MODEL_GUIDE.md` v0.1** |

### STEP8 상태 (Fleet Apply — Completed)

```text
STEP8 Fleet Apply Plan (Execution)
        ↓
B0  Compatibility Alias        PASS   (82cb371, atomic w/ B1)
B1  Identity Rename            PASS   (Plus_5_system → plus_5_system)
B2  Schema Normalize           PASS   (a32bed9)
B2.5 File-format Normalize     PASS   (0tip_plus JSONC · double_rail Python → JSON)
B3  Metadata Normalize         HALTED (Hold · Safe Stop · Ch.7 Not Persisted)
B4  Anchor Apply               PASS   (Schema Normalize · 35half · rodriguez · reverse_end_system)
B5  Logic Apply                PASS   (Structure-only · Apply 6 · clay_shooting Defer)
B6  Runtime                    PASS   (double_rail Loader exclusion only · L6-VR PASS · 0tip_plus Defer)
B7  Presentation               PASS   (Empty Apply 0 · L7-VR PASS · L7-D-001 Explicit Defer)
B8  Validation                 PASS   (Empty Apply 0 · Mode A · B8-VR PASS · XC PASS · Fleet Closure)
        ↓
Final Validation Gate v1.0     ACCEPTED
STEP8 Fleet Apply              COMPLETED
```

| Item | Status |
|------|--------|
| **Fleet Contract Book v1.0** | **Ratified (Conditional)** · Front Matter on-disk · **Ch.8·Ch.9·Ch.10·Ch.11 Ratified** · Remaining chapters **Not Persisted** |
| **Ch.8 L4 Anchor Contract** | **Ratified** · `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md` |
| **Ch.9 L5 Logic Contract** | **Ratified** · `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md` |
| **Ch.10 L6 Runtime Contract** | **Ratified** · Minor Amendment Complete · `FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` |
| **Ch.11 L7 Presentation Contract** | **Ratified** · v1.0 · L7-D-001 Explicit Defer · `FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md` |
| **B0 Compatibility Alias** | **PASS** (`82cb371`, atomic with B1) |
| **B1 Identity Rename** | **PASS** (`Plus_5_system` → `plus_5_system`) |
| **B2 Schema Normalize** | **PASS** (`a32bed9`) — 9× `logic.system` → `system_id` |
| **B2.5 File-format** | **PASS** — 0tip_plus JSONC / double_rail Python → strict JSON |
| **B3 Metadata Normalize** | **HALTED (Hold)** — Ch.7 Not Persisted · **NOT a failure** · 재시도 금지 |
| **B4 L4 Anchor Apply** | **PASS** — Target Freeze A3/B25/C6/D4 · Apply 3 systems · id 불변 · Build PASS |
| **B5 L5 Logic Apply** | **PASS / Completed** — Structure-only · Apply 6 · Meaning Preservation · Semantic Guard PASS · Validation PASS |
| **B6 L6 Runtime** | **PASS / Completed** — Amendment v1.1 · ADR Approve · Apply 1 (`double_rail` exclusion) · L6-VR PASS · Meaning Preservation · `0tip_plus` Defer |
| **B7 L7 Presentation** | **Completed / PASS** — Empty Apply (**0**) · L7-VR PASS · Code ADR Not Required · L7-D-001 Explicit Defer |
| **B8 Fleet Validation** | **Completed / PASS** — Empty Apply (**0**) · Mode A · B8-VR PASS · XC-01…XC-12 PASS · Code ADR Not Required |
| **Final Validation Gate** | **v1.0 · Final Acceptance** · `FLEET_CONTRACT_BOOK_STEP8_Final_Validation_Gate.md` |
| **STEP8 Fleet Apply** | **Completed** |
| **Next** | **STEP9 Entry** |
| **Operational Workflow** | **`DEVELOPMENT_WORKFLOW.md` v1.0** (General + Fleet Apply Workflow · Sole Ops SSOT) |
| **Commit** | B0+B1 `82cb371` · B2+B2.5 `a32bed9` · B4/B5/B6 prior · B7 `9befe68` · **B8 Closure `dde06d2`** (docs · no B8 code) |

### STEP6 상태 (Consume)

| Item | Status |
|------|--------|
| **Framework** | **Freeze Candidate (Locked)** |
| **Pipeline** | **Freeze Candidate (Locked)** |
| **STEP6-3…STEP6-10** | **Complete** |
| **STEP6-11 Final Freeze** | **Declared v1.0** |
| **Architecture** | **Locked** |

Framework / Pipeline / STEP6 Freeze surfaces 비공식 수정 **금지**. STEP7은 STEP6 **Consume**.

### 최우선 — STEP9 Entry (Fleet Validation Standard Consume)

- Session Entry: `CURSOR_SESSION_HANDOFF.md` (**Post-STEP8** · Next **STEP9**)
- **Current baseline (Fleet Validation Standard):** `FLEET_CONTRACT_BOOK_STEP8_Final_Validation_Gate.md` v1.0 + Ch.8–Ch.11 + B4–B8 Freeze/ADR + Ops Workflow v1.0
- **STEP8:** **Completed** · B8 Validation **PASS** · Fleet Closure **Confirmed** · Final Gate **Accepted**
- **Carry (non-blocking):** B3 Hold · L7-D-001 · Catalog Freeze Candidate · Ch.12–14 · KI backlog
- Ops: `DEVELOPMENT_WORKFLOW.md` **v1.0** · `OPS_AI_MODEL_GUIDE.md` v0.1
- **금지:** B3 재시도 · Ch.8–Ch.11 informal edit · Empty Apply reopen without Freeze+ADR · Runtime / JSON silent mutation

### SPS STEP6 Document Suite

| STEP | Document | Status |
|------|----------|--------|
| STEP6-1 | `STEP6_Schema_Validation_Framework.md` | Freeze Candidate (Locked) |
| STEP6-2 | `STEP6_Validation_Pipeline.md` | Freeze Candidate (Locked) |
| STEP6-3 | `STEP6-3_Schema_Rule_Analysis.md` | **Complete (v1.1)** |
| STEP6-4 | `STEP6-4_Rule_Catalog_Design.md` | **Complete (v0.2)** |
| STEP6-5 | `STEP6-5_Validation_Register_Suite.md` | **Complete (v0.2)** |
| STEP6-6 | `STEP6-6_Validation_Engine_Design.md` | **Complete (v0.2)** |
| STEP6-7…9 | `frontend/src/validation/engine/` | **Complete** |
| STEP6-10 | `STEP6-10_Validation_Report.md` | **Complete (v1.0)** |
| STEP6-11 | `STEP6_FINAL_FREEZE.md` | **Final Freeze v1.0** |

Path prefix: `System Platform Standard (SPS) v1.0/` (Engine: `frontend/src/validation/engine/`)

### SPS STEP5 Document Suite (Frozen)

| STEP | Document | Status |
|------|----------|--------|
| STEP5-1 | `STEP5_Architecture_Audit_Framework.md` | Frozen |
| STEP5-2 | `STEP5_Audit_Plan.md` | Frozen |
| STEP5-3 | `STEP5_Audit_Rule_Catalog.md` | Frozen |
| STEP5-4 | `STEP5_Observation_Mapping_Register.md` | Frozen |
| STEP5-4 | `STEP5_Evidence_Register.md` | Frozen |
| STEP5-5 | `STEP5_Finding_Register.md` | Frozen |
| STEP5-5 | `STEP5_Violation_Register.md` | Frozen |
| STEP5-5 | `STEP5_Recommendation_Register.md` | Frozen |
| STEP5-5 | `STEP5_Architecture_Decision_Register.md` | Frozen |
| STEP5-6 | `STEP5_Architecture_Audit_Report.md` | Frozen |
| STEP5-6 | `STEP5_STEP6_Handoff.md` | Frozen |
| Closure | `STEP5_FINAL_FREEZE.md` | Frozen |

Path prefix: `System Platform Standard (SPS) v1.0/`

### P0 — 운영 검증 회귀 (OPEN-01 · OPEN-02)

- USER Search 임팩트 방향: `targetColor` ↔ `draft.targetBall` ↔ `record.targetBall` 동기화 흐름
- 신규 Export 후 Search 실패: Published Loader · recall profile · cache

### P0 — trajectory 기반 파생 데이터 생성

- 별도 세션 이관 예정 (interpolation·KD-Tree USER 적용·targetBall 가중은 범위 외)

### P1 — SYS SSOT 정리

- `targetColor` · `draft.targetBall` · `record.targetBall` · render SYS 우선순위 정합

### P1 — Dataset Architecture Phase 4

- Spatial Index (`spatialCells`, Recall 1차 필터)

### P2 — 시스템 레슨 확장

- `full_input` 및 기타 `systemId` 교육 블록
- SYS Overlay 교육 라인 로직 domain 공통 추출 (ADMIN·USER 중복 제거)

### P3 — 학습 내비

- 학습 흐름: AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비만)

### 보류 — OPEN-05 재조사

- 추가 추적 보류 · 우선순위 Low
- 필요 시 §17·본 절 Known Issues 참고 후 재개

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| `docs/APPLICATION_FLOW.md` | **Runtime Orchestration Architecture Guide** — Architecture 구현 전 First Consume |
| `작업관리/CURSOR_SESSION_HANDOFF.md` | **Cursor 세션 이관** — STEP8 Completed · **Post-STEP8** · Next **STEP9 Entry** |
| `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/` | **Fleet Contract Book** — Ch.8·Ch.9·Ch.10·**Ch.11 Ratified** · B0–**B8 PASS** · **Final Validation Gate v1.0** |
| `작업관리/WG-AI-001_Architecture_Impact_Working_Guideline.md` | **Architecture Impact Working Guideline** — PASS · Consume · Freeze Candidate |
| `System Platform Standard (SPS) v1.0/STEP7_P6_IU-6-0*.md` | **STEP7 P6 Apply Decision suite** — IU-6-01A…06A Complete · Design-only |
| `System Platform Standard (SPS) v1.0/STEP7_P5_IU-5-0*.md` | **STEP7 P5 Change Design suite** — IU-5-01A…05A PASS |
| `작업관리/OPS_AI_MODEL_GUIDE.md` | **Ops AI Model Recommendation Guide v0.1** |
| `작업관리/STEP7_IMPLEMENTATION_DECOMPOSITION.md` | **STEP7 Session Execution SSOT v1.0 Approved** |
| `System Platform Standard (SPS) v1.0/STEP7_P4_IU-4-0*.md` | **P4 Standardization Plan suite** (Complete · Official · VG-P4 PASS) |
| `System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md` | **P2 Catalog Freeze Design v0.15** |
| `작업관리/DEVELOPMENT_WORKFLOW.md` | **Operational Workflow SSOT v1.0** (General + Fleet Apply Workflow) |
| `System Platform Standard (SPS) v1.0/STEP6_FINAL_FREEZE.md` | **STEP6 Final Freeze v1.0** |
| `System Platform Standard (SPS) v1.0/STEP6-10_Validation_Report.md` | **STEP6-10 Validation Report v1.0** |
| `System Platform Standard (SPS) v1.0/STEP6-6_Validation_Engine_Design.md` | **STEP6-6 Engine Design Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-5_Validation_Register_Suite.md` | **STEP6-5 Register Suite Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-4_Rule_Catalog_Design.md` | **STEP6-4 Catalog Design Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-3_Schema_Rule_Analysis.md` | **STEP6-3 Analysis Complete (v1.1)** |
| `System Platform Standard (SPS) v1.0/STEP6_Schema_Validation_Framework.md` | **STEP6 Framework Freeze Candidate (Locked)** |
| `System Platform Standard (SPS) v1.0/STEP6_Validation_Pipeline.md` | **STEP6 Pipeline Freeze Candidate (Locked)** |
| `System Platform Standard (SPS) v1.0/STEP5_FINAL_FREEZE.md` | **STEP5 Final Freeze v1.0** — suite list · freeze policy |
| `System Platform Standard (SPS) v1.0/STEP5_STEP6_Handoff.md` | **STEP6 Handoff SSOT** — Manifest · Owner · Immutability |
| `System Platform Standard (SPS) v1.0/STEP5_Architecture_Audit_Framework.md` | **STEP5 Audit Framework (Frozen)** |
| `System Platform Standard (SPS) v1.0/System_Inventory.md` | **STEP4 Inventory SSOT (v1.0 Final)** — Frozen Assets · Observation SSOT · Metadata/Registration Inventory |
| `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` | **Application Runtime Constitution (Permanent SSOT)** — Migration Blueprint · Architecture Meta · ADR · Review Checklist |
| `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md` | **Dataset Architecture** — 3계층·Export·Phase 계획·이관 SSOT |
| `HISTORY/PROJECT_LOG_2026-07.md` | 2026-07 AAS Batch · STEP4/5 Final · STEP6 Framework+Pipeline · STEP6-3/4/5 Complete |
| `HISTORY/PROJECT_LOG_2026-06.md` | 2026-06 AI · USER AI · 시스템 레슨 · Dataset Phase 1~3-1 (§14·§15) · **운영 검증 조사** (§16) · **OPEN-05 조사** (§17) · **USER Overlay** (§19) |
| `HISTORY/PROJECT_LOG_2026-05.md` | 2026-05 상세 작업 로그 |
| `HISTORY/PROJECT_LOG_2026-04.md` | 이전 월 |
| `HISTORY/HANDOFF_ADMIN_MODAL_TO_USER_DISPLAY_2026-05.md` | ADMIN→USER 표시 핸드오프 |
| `HISTORY/HANDOFF_USER_PHASE2_2026-05.md` | USER Phase 2 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (deprecated, 역사·계산 철학 참고) |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 코드 스냅샷·구조 변경 통제 |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `SESSION_TRANSFER/APP_USER_SEARCH_FLOW.md` | USER Search 흐름 |

---

## USER Overlay (요약)

```
좌측 AI → overlayContent = "AI" → UserAiPanel (--ai-scale)

좌측 시스템레슨 → overlayContent = "SYSTEM_LESSON" → UserSystemLessonPanel (--overlay-scale)

좌측 두께/타점 → overlayContent = "HP/T" → UserHptPanel read-only (--overlay-scale + --overlay-svg-scale)

좌측 동선분석 → table-area UserTrajectoryInfoCard (기준값/보정값 탭 · [공식]/[계산])

좌측 시스템값 → SystemValueLabels on table rail (phone landscape labelScale 1.5×)

backdrop / handleCloseUserInfoOverlay → overlayContent = null

기준값(BASELINE) → 오버레이만 dismiss (레벨 유지)
```

---

## 갱신 규칙

- 월별 로그에만 적지 말고, **기능 완료 시 이 문서의 해당 절을 즉시 수정**.
- “완료 / 진행 / 예정”과 **코드 SSOT 맵**을 항상 일치시킨다.
- **폴더·계산 파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성 후 본 문서 절 링크 점검.
