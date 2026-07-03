# App_Migration_Map

```text
Document: App_Migration_Map.md
Status: Application Runtime Migration Constitution (Permanent SSOT)
Version: v1.2 (RC — Notation Normalized)
Date: 2026-07-03
Basis: App_Authority_Inventory.md (Phase 1)
Standard: AAS v2.0 + SPS v1.0
Composition: Part A (Migration Blueprint) + Part B (Architecture Meta) + Part C (ADR) + Part D (Review Checklist & Approval Flow)
Rule: Read-only design. Decide "what moves where", not "how to code". Migration/Architecture unchanged; notation normalized only.
```

## AAS 공식 Dependency Chain (정본 / Canonical)

본 문서 전체(Part A~D)에서 의존 방향은 아래 정본 순서를 단일 표기로 사용한다. 역방향 의존은 금지한다.

```text
System
  ↓
Runtime Contract
  ↓
Runtime
  ↓
Application
  ↓
Application Flow
  ↓
Domain
  ↓
Renderer
  ↓
Presentation
```

---

## Part A — Migration Blueprint

```text
Part Version: v1.0 (P0 — Execution Blueprint / Document Only)
Phase: AAS Runtime Migration Phase 2 — Migration Map
Scope: frontend/src/App.jsx (~9,079 lines)
Rule: Decide "what moves where", not "how to code".
```

### A-0. 사용법 (Cursor Agent 실행 규칙)

- 본 문서의 **Migration Batch 순서(1→6)** 를 반드시 준수한다. 역순·병렬 금지.
- 각 항목은 **Target Layer → Folder → File → Function** 까지 확정되어 있다. Agent는 이 목적지 외 위치로 이동하지 않는다.
- 이동 방식은 Guide §9 Phase(P1 Wrapper → P2 Pure → P3 Application Flow → P4 System → P5 Renderer → P6 Cleanup)를 따른다. Batch는 "무엇을", Phase는 "어떤 안전 절차로"를 의미한다.
- **동작(계산값·검색결과·Dataset 경로·시각 출력)은 절대 변경 금지.** 이동만 수행한다.

### A-1. App_Migration_Map (전체 이동 표)

> Priority: P0(선행 필수) > P1 > P2 > P3. Batch: 1(최저위험)~6(최고위험).

| ID | Current Responsibility | Current Location | Target Layer | Target Folder | Target File | Target Function | Batch | Priority | Dependency | Regression Test | Reason |
|----|----|----|----|----|----|----|----|----|----|----|----|
| SYS-004 | systemId 정규화/모드 판정 | App 670–688 | System(Domain) | `domain/system/` | `systemIdentity.ts` | `canonicalSystemId()` `getSystemMode()` `getUseSn()` `isFiveHalf()` | 1 | P1 | 없음(순수) | 5½ 판정 스냅샷 | 순수·무상태, 재사용 최다, 다른 이동의 선행 유틸 |
| SYS-005 | 렌더 systemId alias 정규화 | App 6446 | System(Domain) | `domain/system/` | `systemIdentity.ts` | `canonicalSystemId()` | 1 | P1 | SYS-004 | 라벨/그리드 렌더 | 동일 정규화 로직 중복 제거 |
| CAL-001 | 5½ 2-of-3 계산 | App 703–738 | Domain | `domain/calculator/` | `fiveHalfCalculator.ts` | `solveFiveHalfTwoOfThree()` `fiveHalfComputedInputKey()` | 1→4 | P1 | SYS-004 | 5½ Sn/C값 회귀 | 순수함수지만 계산결과라 회귀 필수 |
| MISC-006 | expr 파서/표시식 | App parseSysFormulaExpr/getDisplayExprForSys | Domain | `domain/calculator/` | `formulaExpr.ts` | `parseSysFormulaExpr()` `getDisplayExprForSys()` | 1 | P1 | 없음 | SYS 오버레이 표시 | 순수 파서, 위험 낮음 |
| APP-013 | 라벨 배율 matchMedia | App 6345 | Renderer | `renderer/labels/` | `labelScalePolicy.ts` | `useSysLabelScale()` | 2 | P2 | 없음 | phone landscape 라벨 | 표시 전용, 시각 회귀만 |
| RND-002 | SystemGrid/Labels source 계산 | App 8583 | Renderer | `renderer/labels/` | `systemAxisLabelModel.ts` | `buildSystemValueLabelModel()` | 2 | P2 | SYS-004 | 시스템값 표시 토글 | 결선은 App 유지, source 계산만 이동 |
| RND-004 | Fg→Rg 앵커 변환 조립 | App 7320 | Renderer | `renderer/trajectory/` | `anchorConversionModel.ts` | `buildRgAnchors()` | 2→5 | P2 | Contract(SYS) | Trajectory 좌표 | profile.safety 의존 → Contract 후 완성 |
| TRJ-002 | display cap/visibleKeys/labelStrategy | App 8196 | Renderer | `renderer/trajectory/` | `trajectoryRenderModel.ts` | `buildTrajectoryRenderModel()` | 2 | P2 | 없음 | Display Cap/Caption | 표시 정책, 시각 회귀 |
| OVL-005 | SysOverlay 인라인 컴포넌트 | App 1135–2170 | Overlay(Presentation) | `components/overlays/` | `SysOverlay.jsx` | `SysOverlay` | 2 | P2 | CAL-005 분리 | SYS 편집 UI | 계산부(CAL-005) 분리 후 UI만 이동 |
| OVL-006 | HP/T 인라인 오버레이 | App 2180–2700 | Overlay(Presentation) | `components/overlays/` | `HptOverlay.jsx` | `HptOverlay` | 2 | P2 | useHptController | HP/T 편집 | UI 컴포넌트 파일 분리 |
| OVL-007 | Anchor Edit 인라인 오버레이 | App 2727–3050 | Overlay(Presentation) | `components/overlays/` | `AnchorEditOverlay.jsx` | `AnchorEditOverlay` | 2 | P2 | 없음 | 앵커 편집 | UI 컴포넌트 파일 분리 |
| OVL-008 | AiOverlay 인라인 컴포넌트 | App 3061–3390 | Overlay(Presentation) | `components/overlays/` | `AiOverlay.jsx` | `AiOverlay` | 2 | P2 | AI-001 분리 | AI 편집/레슨 DnD | 도메인(AI-001) 분리 후 UI만 이동 |
| OVL-001 | ADMIN 오버레이 open | App 4237 | Overlay | `overlay/router/` | `adminOverlayRouter.ts` | `openOverlay()` `openAnchorEdit()` | 2 | P2 | 없음 | ADMIN 오버레이 개폐 | thin dispatch만 App, routing 이동 |
| OVL-002 | ADMIN 오버레이 auto-close | App 4622 | Overlay | `overlay/state/` | `overlayStateMachine.ts` | `useAdminOverlayLifecycle()` | 2 | P2 | OVL-001 | 오버레이 lifecycle | 상태 전이 규칙 분리 |
| OVL-003 | USER overlay dismiss/close | App 5411 | Overlay | `overlay/router/` | `userOverlayRouter.ts` | `closeUserOverlay()` | 2 | P2 | 없음 | USER 오버레이 | thin routing |
| DS-005 | 저장소 정리 | App 4190 | Dataset/History | `domain/history/` | `workspaceHistory.ts` | `cleanupWorkspaceStorage()` | 3 | P2 | useSettings | 저장소 cleanup | 저위험 Dataset 유틸 |
| MISC-002 | Auto capture | App 6240 | Dataset(Domain) | `domain/dataset/` | `autoCapture.ts` | `useAutoCapture()` | 3 | P2 | autoCaptureEngine | candidate 생성 | 부수효과 격리 |
| DS-004 | dataset.json import | App 4205 | Dataset(Infra) | `domain/dataset/infra/` | `datasetStorage.ts` | `importDatasetFile()` | 3 | P2 | 없음 | dataset import | 파일 I/O 격리 |
| CAL-004 | recall→adminState.sys | App 611 | Application Flow | `application/flows/` | `recallHydrateFlow.ts` | `adminSysFromRecallEntry()` | 3 | P1 | CAL-003 | recall hydrate | 흐름 조정, Domain 호출로 대체 |
| SRCH-005 | 저장용 평가 | App 4640 | Application Flow | `application/flows/` | `saveFlow.ts` | `evalForSave()` | 3 | P1 | evaluateStrategy | 저장 평가 | Application Flow 조정 |
| SRCH-004 | USER Reset | App 5204 | Application Flow | `application/flows/` | `resetFlow.ts` | `runUserSearchReset()` | 3 | P1 | 없음 | USER Reset 의미 | 다단계 흐름, 중위험 |
| SRCH-002 | ADMIN published Search | App 5138 | Application Flow + Search | `application/flows/` | `adminSearchFlow.ts` | `runAdminSearch()` | 3 | P1 | DS-007, Search Domain | ADMIN Search 결과 | corpus 로딩+매칭 분리 |
| SRCH-001 | ADMIN 로컬DB/Recall | App 5022 | Application Flow + Search | `application/flows/` | `adminLocalDbFlow.ts` | `runAdminLocalDbRecall()` | 3 | P1 | DS-001, recallEngine | 로컬DB 결과 | dataset 의존 |
| SRCH-003 | USER published Search | App 5243 | Application Flow + Search | `application/flows/` | `userSearchFlow.ts` | `runUserSearch()` | 3 | P1 | DS-007, publishedLeafResolve | USER Search 랭킹 | 최다 사용 흐름 |
| DS-007 | Published corpus load | App 5028 | Search | `search/corpus/` | `publishedCorpusLoader.ts` | `getOrLoadPublishedLeaf()` | 3 | P1 | publishedDatasetStore | corpus fetch | Search 전용 |
| DS-002 | 저장→merge→localStorage | App 4652 | Application Flow + Dataset | `application/flows/` | `saveFlow.ts` | `runSaveStrategy()` | 3 | P1 | DS-001, positionMergeEngine | Dataset 경로/스키마 | 경로·스키마 불변 필수 |
| DS-003 | 저장+workspace history | App 4844 | Application Flow + History | `application/flows/` | `historyFlow.ts` | `runCanonicalSave()` | 3 | P1 | DS-002 | history 기록 | Application Flow 조정 |
| DS-001 | Working Dataset load | App 3917 | Dataset(Infra) | `domain/dataset/infra/` | `datasetStorage.ts` | `loadWorkingDataset()` | 3→ | P1 | 없음 | dataset load | localStorage 격리, 다수 Flow 선행 |
| AI-003 | USER AI ViewModel | App USER 렌더 | Domain(ViewModel) | `domain/ai/` | `userInfoPanelModel.ts` | `buildUserInfoPanel()` | 3 | P2 | 없음 | USER AI 표시 | 순수 VM |
| AI-002 | one-point library persist | App 3960 | Domain/Dataset | `domain/lesson/` | `onePointLibrary.ts` | `loadOnePoints()` `saveOnePoints()` | 3 | P2 | 없음 | 레슨 저장/복원 | localStorage 격리 |
| AI-001 | AI 자동코멘트/레슨 | App 3061–3390 | Domain(AI/Lesson) | `domain/ai/` `domain/lesson/` | `aiAutoComment.ts` `lessonMerge.ts` | `buildAiAutoComment()` `mergeOnePointLesson()` | 3 | P2 | AI-002 | AI 코멘트/레슨 | UI(OVL-008)와 분리 |
| CAL-006 | 공드래그→sys 역산 | App 7270 | Application Flow + Domain | `application/flows/` | `ballDragFlow.ts` | `applyBallDragSys()` | 3→4 | P2 | computeSystemFromPositions | 드래그 sys 갱신 | dispatch는 App, 계산 이동 |
| MISC-004 | resolvedSlotSys 파생 | App 3589 | Domain(ViewModel) | `domain/system/` | `slotSysViewModel.ts` | `resolveSlotSys()` | 4 | P1 | SYS-004 | 렌더 SSOT | 5½ 분기 포함, 렌더 직결 |
| CAL-003 | recall→sys snapshot | App 522 | Domain | `domain/calculator/` | `systemValueCalculator.ts` | `buildSlotSysSnapshot()` | 4 | P2 | SYS-004 | recall sys 값 | 계산 결과 회귀 |
| CAL-002 | effective sys/Sn/C4-6 | App 910–1061 | Domain | `domain/calculator/` | `systemValueCalculator.ts` | `buildEffectiveRenderSysValues()` | 4 | P1 | CAL-001, SYS-004 | Sn/C4/5/6 값 | 핵심 계산, 고위험 |
| CAL-005 | SysOverlay 실시간 계산 | App 1274–1527 | Domain | `domain/calculator/` | `systemValueCalculator.ts` | `computeSysOverlayValues()` | 4 | P1 | CAL-002 중복통합 | SYS 오버레이 값 | CAL-002와 통합 대상 |
| TRJ-001 | trajectory 조립/reflection | App ~7315–8100 | Domain(Trajectory) | `domain/trajectory/` | `trajectoryBuilder.ts` | `buildTrajectory()` | 5 | P1 | RND-004, reflectionEngine | reflection/rail/cap | 최고 복잡·시각 직결 |
| TRJ-003 | profile.safety 사용 | App 7570 | Domain(Trajectory) | `domain/trajectory/` | `reflectionPolicy.ts` | `applyReflection()` | 5 | P1 | Contract(SYS) | reflection 안전값 | Contract 경유 필요 |
| RND-003 | baseline handle 노드 | App 8372 | Renderer + System | `renderer/trajectory/` | `baselineHandleModel.ts` | `buildBaselineHandles()` | 5 | P2 | APP-009 | baseline 핸들 | 5½ 분기 포함 |
| APP-009 | baseline draft 상태 | App 3728 | Overlay + Domain | `overlay/state/` `domain/trajectory/` | `baselineDraftState.ts` | `useBaselineDraft()` | 5 | P2 | TRJ-001 | baseline 편집 | 상태+계산 혼재 |
| SYS-003 | SYS_SYSTEM_CONFIG 테이블 | App 662 | System | `data/systems/<id>/` | `logic.json`/`system_meta.json` | (정의 데이터) | 6 | P0→P4 | Contract | 5½ mode/useSn | System Definition으로 이관 |
| SYS-006 | 샘플 경로 하드코딩 | App 6173 | System | `data/systems/<id>/` | `system_meta.json` | (정의 데이터) | 6 | P4 | Loader | 샘플 로드 | 경로를 meta로 |
| SYS-001 | SYSTEM_PROFILES 직접접근 | App 42 | Runtime | `runtime/registry/` | `systemRegistry.ts` | `getSystemContract()` | 6 | P0 | Contract/Loader | Profile 접근 | Contract 경유로 전환 |
| SYS-002 | getAnchorsForSystem 직접접근 | App 162 | Runtime | `runtime/loader/` | `systemLoader.ts` | `getContractAnchors()` | 6 | P0 | Contract/Loader | Anchor 접근 | Contract 경유로 전환 |
| DS-006 | 샘플 fetch effect | App 6162 | Runtime/Dataset | `runtime/loader/` | `systemLoader.ts` | `loadSystemSample()` | 6 | P0 | SYS-006, Loader | 샘플 fetch | System Loader로 이관 |

> 이중 목적지로 보이는 항목(CAL-006, DS-002/003, AI-002, MISC-003, APP-009)은 **하나의 코드 블록이 서로 다른 Capability 두 개를 품고 있는 것**이므로, Migration 시 Capability 경계로 분리한다. Capability당 Owner는 여전히 유일하다(ADR-007).

### A-2. Layer별 Migration 요약

| Target Layer | 항목 | 핵심 목적지 |
|----|----|----|
| **App(유지)** | APP-002/006/007/012, MISC-001/005, RND-001, thin dispatch | `App.jsx` |
| **Runtime** | SYS-001/002, DS-006 | `runtime/registry/`, `runtime/loader/` |
| **Application Flow** | SRCH-001~005, DS-002/003, CAL-004/006 | `application/flows/` |
| **Domain / Calculation Domain** | CAL-001/002/003/005, MISC-006 | `domain/calculator/` |
| **Domain / Trajectory** | TRJ-001/003, APP-009(계산) | `domain/trajectory/` |
| **Domain / System** | SYS-004/005, MISC-004 | `domain/system/` |
| **Domain / AI·Lesson** | AI-001/002/003 | `domain/ai/`, `domain/lesson/` |
| **Domain / Dataset·History** | DS-001/004/005, MISC-002 | `domain/dataset/`, `domain/history/` |
| **Renderer** | APP-013, RND-002/003/004, TRJ-002 | `renderer/labels/`, `renderer/trajectory/` |
| **Overlay** | OVL-001~008 | `overlay/router/`, `overlay/state/`, `components/overlays/` |
| **Search** | DS-007 (+SRCH corpus) | `search/corpus/`, `search/recall/` |
| **System(Definition)** | SYS-003/006 | `data/systems/<id>/*.json` |

### A-3. Migration Batch 계획

- **Batch 1 (매우 낮음)**: SYS-004/005, CAL-001, MISC-006 — 순수 함수/정규화/파서. 다른 모든 Batch의 선행 유틸.
- **Batch 2 (낮음)**: APP-013, RND-002/004, TRJ-002, OVL-001~003/005~008 — Renderer·Overlay 헬퍼 및 인라인 컴포넌트 파일 분리.
- **Batch 3 (중간)**: SRCH-001~005, DS-001~005/007, CAL-004/006, AI-001~003, MISC-002 — Application Flow / Search / Dataset / AI 흐름.
- **Batch 4 (높음)**: CAL-002/003/005, MISC-004 — Calculation Domain (Sn, C4/5/6, effective sys).
- **Batch 5 (매우 높음)**: TRJ-001/003, RND-003, APP-009 — Trajectory / Reflection / Anchor 변환.
- **Batch 6 (최고)**: SYS-001/002/003/006, DS-006 — System-specific 추출 + Runtime Contract/Registry/Loader 연계.

각 Batch 완료 조건: `npm run build` + App_Authority_Inventory.md 회귀 목록 통과 후 다음 Batch 진행.

### A-4. 신규 생성이 필요한 Runtime 구조 (제안)

```text
frontend/src/
├─ App.jsx                      (Orchestrator only)
├─ application/
│   ├─ flows/
│   │   ├─ userSearchFlow.ts
│   │   ├─ adminSearchFlow.ts
│   │   ├─ adminLocalDbFlow.ts
│   │   ├─ resetFlow.ts
│   │   ├─ saveFlow.ts
│   │   ├─ historyFlow.ts
│   │   ├─ recallHydrateFlow.ts
│   │   └─ ballDragFlow.ts
│   └─ coordinators/
│       └─ runtimeCoordinator.ts
├─ runtime/
│   ├─ registry/systemRegistry.ts
│   ├─ loader/systemLoader.ts
│   └─ contract/systemContract.ts        (SPS Runtime Contract)
├─ domain/
│   ├─ calculator/                        (Calculation Domain)
│   │   ├─ formulaExpr.ts
│   │   ├─ systemValueCalculator.ts
│   │   └─ fiveHalfCalculator.ts
│   ├─ trajectory/
│   │   ├─ trajectoryBuilder.ts
│   │   └─ reflectionPolicy.ts
│   ├─ system/
│   │   ├─ systemIdentity.ts
│   │   └─ slotSysViewModel.ts
│   ├─ ai/{aiAutoComment.ts, userInfoPanelModel.ts}
│   ├─ lesson/{lessonMerge.ts, onePointLibrary.ts}
│   ├─ dataset/{autoCapture.ts, infra/datasetStorage.ts}
│   └─ history/workspaceHistory.ts
├─ renderer/
│   ├─ labels/{systemAxisLabelModel.ts, labelScalePolicy.ts}
│   └─ trajectory/{trajectoryRenderModel.ts, anchorConversionModel.ts, baselineHandleModel.ts}
├─ overlay/
│   ├─ router/{userOverlayRouter.ts, adminOverlayRouter.ts}
│   └─ state/{overlayStateMachine.ts, baselineDraftState.ts}
├─ search/
│   ├─ corpus/publishedCorpusLoader.ts
│   └─ recall/{userSearch.ts, adminSearch.ts}
└─ components/overlays/
    ├─ SysOverlay.jsx
    ├─ HptOverlay.jsx
    ├─ AnchorEditOverlay.jsx
    └─ AiOverlay.jsx
```

> 실제 폴더명은 기존 코드베이스(`data/system/calculator`, `recall/` 등) 관례에 맞춰 조정 가능하되, 책임 분리는 유지한다. Calculation Domain의 물리 폴더명은 `domain/calculator/`를 유지한다(FIX-4).

### A-5. 최종 App Runtime Architecture

**Composition View (App 기준 호출/구성 순서 — 위→아래):**

```text
App.jsx  (Application Runtime Orchestrator)
  │  Application Boot / Provider Wiring / Runtime State / Event Dispatch / Screen Composition
  ▼
Application Flow (application/flows)
  │  userSearch / adminSearch / localDb / reset / save / history / recallHydrate / ballDrag
  ▼
Domain
  ├─ Calculation Domain (formula / systemValue / fiveHalf)
  ├─ Trajectory (builder / reflection)
  ├─ System (identity / slotSysViewModel)
  ├─ AI · Lesson
  └─ Dataset · History
  ▼
Renderer (labels / trajectory render model)
  ▼
Overlay (router / state) + components/overlays
  ▼
Search (corpus / recall)
  ▼
System Registry ──► Runtime Contract ──► Loader ──► data/systems/<id>/*.json
```

> Composition View는 "누가 무엇을 호출/구성하는가"의 관점이며, **의존 방향(Dependency Direction)과는 별개**이다.

**Dependency Direction (정본 / Canonical, 역방향 금지):**

```text
System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation
```

(SPS §4 근거)

### A-6. Migration 우선순위

**가장 먼저 이동 (즉시 착수)**
1. Batch 1 순수 유틸 (SYS-004/005, CAL-001, MISC-006) — 위험 없음, 모든 후속의 선행.
2. Batch 2 Renderer/Overlay 헬퍼·인라인 컴포넌트 파일 분리 — App 파일 크기 즉시 감소.

**중간 (Contract 불필요 흐름)**
3. Batch 3 Application Flow — 단, DS-001(dataset load) 선행 후 Save/Search 흐름.

**후행 (고위험·Contract 필요)**
4. Batch 4~5 계산/Trajectory — 회귀 케이스 확보 후.
5. Batch 6 System 추출 — **Runtime Contract/Registry/Loader 선행 필수**.

### A-7. 위험 요소

- **계산값 변화**: CAL-002/003/005, MISC-004 (Sn·C4/5/6). 값 스냅샷 회귀 없이는 이동 금지.
- **Trajectory 시각 변화**: TRJ-001/003, RND-003 (reflection/cap/baseline). 시각 회귀 필수.
- **검색 결과 변화**: SRCH-001~003 랭킹/매칭.
- **Dataset 경로/스키마 파손**: DS-001/002/003. `dataset/{공략}/{시스템}/positions.json` 불변, `dataset/` .gitignore 금지.
- **Contract 미구현 Blocker**: SYS-001/002/003/006, DS-006, TRJ-003, RND-004는 Runtime Contract 없이는 이동 불가.
- **상태 결합**: `adminState` ↔ slot ↔ resolvedSlotSys (MISC-004, OVL-004) 결합 분해 시 SSOT 경계 재정의 선행.

### A-8. 추가 필수 항목

**A-8.1 절대로 이동하면 안 되는 책임 (App 영구 유지)**
APP-002(`appMode`), APP-006(`ballsState`), APP-012(`dragState`), APP-007(검색/슬롯 표시 상태), APP-014~016(Hook 결선), MISC-001/005(단축키·버튼 dispatch), RND-001(메인 JSX 구성), 오버레이 entry의 thin open/close dispatch.

**A-8.2 가장 먼저 이동해야 하는 책임**
SYS-004/005(systemId 정규화), MISC-006(파서), CAL-001(5½ 순수함수) — Batch 1. 위험 0, 후속 이동의 공통 의존.

**A-8.3 가장 위험한 책임**
TRJ-001(trajectory 조립/reflection) 최상위, 이어 CAL-002/005(Sn·C4/5/6), MISC-004(렌더 SSOT).

**A-8.4 System Contract가 먼저 필요한 책임**
SYS-001/002/003/006, DS-006(샘플 fetch), TRJ-003(profile.safety), RND-004(앵커 변환).

**A-8.5 Runtime 구현(코드 이동) 전에 반드시 완료되어야 하는 작업**
1. 나머지 P0 문서 3종(`System_Specific_Extraction_Report.md`, `Profile_Logic_Extraction_Report.md`, `App_Final_Target_Structure.md`) 확정.
2. **Runtime Contract / Registry / Loader 인터페이스 정의** (SPS §15/§16) — Batch 6의 전제.
3. 회귀 기준선 확보: 5½ 계산 스냅샷, USER/ADMIN Search 결과 스냅샷, Trajectory 시각 스냅샷, Dataset 경로/스키마 체크.
4. Batch 3의 선행인 DS-001(dataset load) 격리 위치 확정.

### A-9. Execution Blueprint 요약 (Agent가 그대로 수행)

```text
STEP 1  Batch 1  P1/P2  →  domain/system/systemIdentity.ts, domain/calculator/{fiveHalfCalculator,formulaExpr}.ts
                          (wrapper→re-export, 동작 무변경)  →  build + 5½ snapshot
STEP 2  Batch 2  P2      →  renderer/*, overlay/router|state/*, components/overlays/*.jsx
                          (인라인 컴포넌트 파일 분리, 표시정책 이동)  →  build + 시각 회귀
STEP 3  Batch 3  P3      →  application/flows/* (userSearch/adminSearch/localDb/reset/save/history)
                          + domain/dataset/infra/datasetStorage.ts + search/corpus/*
                          →  build + Search/Save/Reset/History 회귀
STEP 4  Batch 4  P4      →  domain/calculator/systemValueCalculator.ts (CAL-002/003/005 통합)
                          →  build + Sn/C4/5/6 값 회귀
STEP 5  Batch 5  P5      →  domain/trajectory/*, renderer/trajectory/*
                          →  build + Trajectory 시각/cap 회귀
STEP 6  Batch 6  P4/P0   →  runtime/{registry,loader,contract}/* + data/systems/<id>/{logic,system_meta}.json
                          (SYS_SYSTEM_CONFIG/샘플경로 → System Definition, 직접접근 → Contract)
                          →  build + 전체 회귀 + "App.jsx 내 systemId 분기 0" 확인
GATE    각 STEP: npm run build 통과 + 해당 회귀 통과 시에만 다음 STEP.
        Batch 6는 Runtime Contract/Registry/Loader 정의 완료 후에만 착수.
```

### A-10. 최종 산출 요약 (참조)

> **SSOT 주의(FIX-6):** Phase 1 산출 요약(Application/Runtime 책임 요약, Domain 후보, App 유지/제거 책임, 위험 요소, 다음 Phase 권장)의 **정본(SSOT)** 은 `App_Authority_Inventory.md`(§2~§8 및 부록 A)이다. 본 절은 별도 재게시하지 않으며, 해당 내용이 필요하면 `App_Authority_Inventory.md`를 참조한다. (중복 SSOT 생성 금지)

---

## Part B — Architecture Meta

```text
Part Version: v1.1 (Architecture Blueprint Upgrade)
Purpose: Execution Blueprint → 영구 Architecture Blueprint(SSOT) 승격
Change: Part A(Migration Map) 불변. Capability/Owner/Visibility/Architecture Rule 및 Matrix·Guard 추가만 수행.
```

### B-0. 메타 모델 정의

- **Capability**: 파일이 아니라 "기능 자체". 파일 구조가 바뀌어도 유지되는 불변 개념.
- **Owner**: 해당 Capability를 **유일하게** 책임지는 Layer. 복수 Owner 금지.
- **Visibility**:
  - **Public** — Runtime Contract 또는 공식 Layer API를 통해 상위 Layer가 접근 가능.
  - **Internal** — 동일 Layer 내부에서만 접근.
  - **Private** — 동일 Module 내부 전용.
- **Architecture Rule**: 어떤 기능이 추가되어도 지켜야 하는 불변 규칙(Guard).

### B-1. Responsibility별 Meta 매핑 (Part A의 ID 그대로 augment)

> Part A의 각 행에 아래 4개 열(Capability / Owner / Visibility / Architecture Rule Ref)이 추가된다고 간주한다. Target Layer/Folder/File/Function은 변경 없음.

| ID | Capability | Owner | Visibility | Architecture Rule Ref |
|----|----|----|----|----|
| APP-002 | State Management | Application Owner | Internal | R-APP-1 |
| APP-006 | State Management | Application Owner | Internal | R-APP-1 |
| APP-007 | State Management | Application Owner | Internal | R-APP-1 |
| APP-012 | State Management | Application Owner | Internal | R-APP-1 |
| APP-005 | State Management | Application Owner | Internal | R-APP-1 / R-SYS-3 |
| APP-003 | Overlay (State) | Overlay Owner | Internal | R-OVL-1 |
| APP-004 | Overlay (State) | Overlay Owner | Internal | R-OVL-1 |
| APP-014 | Provider Wiring | Application Owner | Internal | R-APP-2 |
| APP-015 | Provider Wiring | Application Owner | Internal | R-APP-2 |
| APP-016 | Provider Wiring | Application Owner | Internal | R-APP-2 |
| MISC-001 | Event Dispatch | Application Owner | Internal | R-APP-3 |
| MISC-005 | Event Dispatch | Application Owner | Internal | R-APP-3 |
| RND-001 | Screen Composition | Application Owner | Internal | R-APP-4 |
| SYS-004 | System (Identity) | System Owner | Public (via Runtime Contract) | R-SYS-1 |
| SYS-005 | System (Identity) | System Owner | Public (via Runtime Contract) | R-SYS-1 |
| MISC-004 | System (ViewModel) | System Owner | Public (via Runtime Contract) | R-SYS-1 / R-DOM-4 |
| SYS-003 | System (Definition) | System Owner | Public (via Runtime Contract) | R-SYS-2 |
| SYS-006 | System (Definition) | System Owner | Public (via Runtime Contract) | R-SYS-2 |
| SYS-001 | Runtime (Registry) | Runtime Owner | Public (via Runtime Contract) | R-RT-1 |
| SYS-002 | Runtime (Loader) | Runtime Owner | Public (via Runtime Contract) | R-RT-1 |
| DS-006 | Runtime (Loader) | Runtime Owner | Public (via Runtime Contract) | R-RT-1 / R-DS-3 |
| CAL-001 | Formula/Calculation | Domain Owner | Public | R-DOM-1 |
| CAL-002 | Formula/Calculation | Domain Owner | Public | R-DOM-1 |
| CAL-003 | Formula/Calculation | Domain Owner | Public | R-DOM-1 |
| CAL-005 | Formula/Calculation | Domain Owner | Public | R-DOM-1 |
| MISC-006 | Formula (Parser) | Domain Owner | Private | R-DOM-1 |
| CAL-006 | Application Flow + Formula | Application Flow Owner (orch) / Domain Owner (calc) | Public | R-FLOW-1 / R-DOM-1 |
| TRJ-001 | Trajectory | Domain Owner | Public | R-DOM-2 |
| TRJ-003 | Trajectory (Reflection) | Domain Owner | Public (via Runtime Contract) | R-DOM-2 / R-SYS-2 |
| APP-009 | Trajectory (Draft) + Overlay | Domain Owner (calc) / Overlay Owner (state) | Internal | R-DOM-2 / R-OVL-1 |
| MISC-003 | Event Dispatch + Calculation | Application Owner (dispatch) / Domain Owner (calc) | Internal | R-APP-3 / R-DOM-1 |
| TRJ-002 | Rendering (Trajectory) | Renderer Owner | Internal | R-RND-1 |
| RND-002 | Rendering (Labels) | Renderer Owner | Internal | R-RND-1 |
| RND-003 | Rendering (Trajectory) | Renderer Owner | Internal | R-RND-1 |
| RND-004 | Rendering (Anchor Conv) | Renderer Owner | Internal | R-RND-1 / R-SYS-2 |
| APP-013 | Rendering (Label Scale) | Renderer Owner | Internal | R-RND-1 |
| OVL-001 | Overlay (Routing) | Overlay Owner | Internal | R-OVL-1 |
| OVL-002 | Overlay (State) | Overlay Owner | Internal | R-OVL-1 |
| OVL-003 | Overlay (Routing) | Overlay Owner | Internal | R-OVL-1 |
| OVL-004 | Application Flow (Slot Apply) | Application Flow Owner | Public | R-FLOW-1 |
| OVL-005 | Overlay (Presentation) | Overlay Owner | Private | R-OVL-2 |
| OVL-006 | Overlay (Presentation) | Overlay Owner | Private | R-OVL-2 |
| OVL-007 | Overlay (Presentation) | Overlay Owner | Private | R-OVL-2 |
| OVL-008 | Overlay (Presentation) | Overlay Owner | Private | R-OVL-2 |
| SRCH-001 | Search/Recall | Search Owner | Public | R-SRCH-1 |
| SRCH-002 | Search/Recall | Search Owner | Public | R-SRCH-1 |
| SRCH-003 | Search/Recall | Search Owner | Public | R-SRCH-1 |
| SRCH-004 | Application Flow (Reset) | Application Flow Owner | Public | R-FLOW-1 |
| SRCH-005 | Application Flow (Save eval) | Application Flow Owner | Public | R-FLOW-1 |
| DS-007 | Search (Corpus) | Search Owner | Internal | R-SRCH-1 |
| CAL-004 | Application Flow (Hydrate) | Application Flow Owner | Public | R-FLOW-1 |
| DS-001 | Dataset (Persistence) | Infrastructure Owner | Public | R-DS-1 |
| DS-004 | Dataset (Persistence) | Infrastructure Owner | Public | R-DS-1 |
| DS-002 | Application Flow + Dataset | Application Flow Owner (orch) / Dataset Owner (merge) | Public | R-FLOW-1 / R-DS-2 |
| DS-003 | Application Flow + History | Application Flow Owner (orch) / Dataset Owner (history) | Public | R-FLOW-1 / R-DS-2 |
| DS-005 | Dataset (History) | Dataset Owner | Internal | R-DS-2 |
| MISC-002 | Dataset (Capture) | Dataset Owner | Internal | R-DS-2 |
| AI-001 | AI + Lesson | Domain Owner | Public | R-DOM-3 |
| AI-002 | Lesson (Persistence) | Dataset Owner (store) / Domain Owner (model) | Internal | R-DOM-3 / R-DS-1 |
| AI-003 | AI (ViewModel) | Domain Owner | Public | R-DOM-3 |

> 이중 Owner로 보이는 항목(CAL-006, DS-002/003, AI-002, MISC-003, APP-009)은 **하나의 코드 블록이 서로 다른 Capability 두 개를 품고 있는 것**이므로, Migration 시 Capability 경계로 분리한다(예: DS-002 = 흐름 조정[Application Flow Owner] + merge 계산[Dataset Owner]). Capability당 Owner는 여전히 유일하다.

### B-2. Capability Profile (Capability → Owner → Visibility → Rule → Layer → Runtime Module)

| Capability | Owner | Visibility | Architecture Rule (요약) | 관련 Layer | 관련 Runtime Module |
|----|----|----|----|----|----|
| **Formula/Calculation** | Domain Owner | Public | Application·Renderer는 계산하지 않는다. Calculation Domain만 계산한다. | Domain | `domain/calculator/*` |
| **Trajectory** | Domain Owner | Public | Renderer는 Trajectory를 생성하지 않는다. Trajectory Domain이 생성하고 Renderer는 표시만 한다. | Domain | `domain/trajectory/*` |
| **Search/Recall** | Search Owner | Public | 매칭·스코어·랭킹은 Search Domain만 소유한다. Application·Application Flow는 호출만 한다. | Search | `search/recall/*`, `search/corpus/*` |
| **Dataset** | Dataset Owner | Public | Dataset 정규화·merge·canonical은 Dataset Domain만 수행. 경로/스키마 불변. | Dataset | `domain/dataset/*` |
| **Dataset Persistence** | Infrastructure Owner | Public | localStorage/File/Network 접근은 Infrastructure만 수행한다. | Infrastructure | `domain/dataset/infra/*` |
| **History** | Dataset Owner | Internal | Workspace History는 History Domain만 변환·기록한다. | Dataset(Domain) | `domain/history/*` |
| **Overlay** | Overlay Owner | Internal | Overlay 라우팅·상태·표현은 Overlay Layer 소유. Application은 entry dispatch만. | Overlay | `overlay/router/*`, `overlay/state/*`, `components/overlays/*` |
| **Rendering** | Renderer Owner | Internal | Renderer는 표시 모델만 만든다. 계산·생성 금지. | Renderer | `renderer/labels/*`, `renderer/trajectory/*` |
| **System (Identity/Definition)** | System Owner | Public (via Runtime Contract) | systemId 분기·정의는 System Layer. Runtime Contract를 통해서만 노출. | System | `data/systems/<id>/*`, `domain/system/*` |
| **AI** | Domain Owner | Public | AI ViewModel/코멘트는 AI Domain만 생성. UI는 표시만. | Domain | `domain/ai/*` |
| **Lesson** | Domain Owner | Public | Lesson 병합/모델은 Lesson Domain만 소유. | Domain | `domain/lesson/*` |
| **Runtime (Registry/Loader/Contract)** | Runtime Owner | Public (via Runtime Contract) | System 접근은 Registry→Loader→Contract 경로만. 직접 JSON 접근 금지. | Runtime | `runtime/registry/*`, `runtime/loader/*`, `runtime/contract/*` |
| **Application Flow** | Application Flow Owner | Public | 다단계 use case는 Application Flow가 조정. Domain을 호출하되 계산하지 않는다. | Application Flow | `application/flows/*`, `application/coordinators/*` |
| **State Management** | Application Owner | Internal | Runtime 전역 상태만 App 보유. 파생·계산 상태는 Domain. | Application | `App.jsx` |
| **Event Dispatch** | Application Owner | Internal | App 핸들러는 Application Flow를 호출만. 로직 포함 금지(thin). | Application | `App.jsx` |
| **Provider Wiring** | Application Owner | Internal | Hook/Provider 결선은 App 소유. | Application | `App.jsx` |
| **Screen Composition** | Application Owner | Internal | 최상위 JSX 배치만 App. 표시 계산 금지. | Application | `App.jsx` |

> Dependency 방향(정본): `System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation` (역방향 금지).

### B-3. Architecture Capability Matrix

| Capability | Primary Owner | Visibility | Runtime Entry | Dependency (허용 방향) | Architecture Rule |
|----|----|----|----|----|----|
| Formula/Calculation | Domain Owner | Public | `domain/calculator` API | Runtime Contract → … → Domain | 계산은 Calculation Domain 독점 |
| Trajectory | Domain Owner | Public | `domain/trajectory` API | Runtime Contract → … → Domain | Trajectory는 Domain 생성, Renderer 표시 |
| Search/Recall | Search Owner | Public | `search/recall` API | Application Flow → Domain (Dataset read) | 매칭·랭킹은 Search 독점 |
| Dataset | Dataset Owner | Public | `domain/dataset` API | Domain → (Infrastructure) | 경로/스키마 불변, merge는 Dataset |
| Dataset Persistence | Infrastructure Owner | Public | `dataset/infra` adapter | (최하위 Infrastructure) | I/O는 Infrastructure 독점 |
| History | Dataset Owner | Internal | `domain/history` API | Domain → (Infrastructure) | History 기록은 History Domain |
| Overlay | Overlay Owner | Internal | `overlay/router` | Application → Overlay (dispatch) | 라우팅/상태는 Overlay 독점 |
| Rendering | Renderer Owner | Internal | `renderer/*` model | Domain → Renderer | Renderer는 표시 모델만 |
| System | System Owner | Public (via Runtime Contract) | Runtime Contract | System → Runtime Contract | systemId 분기는 System Layer |
| AI | Domain Owner | Public | `domain/ai` API | Runtime Contract → … → Domain | AI VM은 AI Domain |
| Lesson | Domain Owner | Public | `domain/lesson` API | Runtime Contract → … → Domain | Lesson 병합은 Lesson Domain |
| Runtime | Runtime Owner | Public (via Runtime Contract) | Registry/Loader | System → Runtime Contract → Runtime | System 접근은 Runtime 경유 |
| Application Flow | Application Flow Owner | Public | `application/flows` | Application → Application Flow → Domain | Application Flow는 조정만, 계산 금지 |
| State Management | Application Owner | Internal | App | — | Runtime 상태만 App |
| Event Dispatch | Application Owner | Internal | App | Application → Application Flow | thin dispatch |
| Provider Wiring | Application Owner | Internal | App | — | 결선만 |
| Screen Composition | Application Owner | Internal | App | Application → Presentation | 배치만 |

### B-4. Architecture Ownership Matrix (Layer별 유일 책임)

| Layer | 유일 책임 (Only Responsibility) | 금지 (Never) |
|----|----|----|
| **Application (App.jsx)** | Boot, Runtime State, Provider Wiring, Event Dispatch, Screen Composition, Application Flow 호출 | 계산, Search, Dataset I/O, Trajectory 생성, System 분기 |
| **Runtime** | System 발견·로드·Contract 노출 (Registry/Loader/Contract) | 계산, 렌더, 상태 보유 |
| **Application Flow** | 다단계 use case 조정, Domain 조합 | 계산, 알고리즘, I/O 직접 수행 |
| **Domain** | 계산·규칙 (Calculation/Trajectory/AI/Lesson/System VM) | UI, 라우팅, I/O, Registry 접근 |
| **Renderer** | 표시 모델 생성 (label/caption/trajectory render model) | 계산, 생성, System 파일 접근 |
| **Overlay** | 오버레이 라우팅·상태·표현 | 계산, Search, Dataset |
| **Search** | 매칭·스코어·랭킹·corpus 로딩 | 계산(Formula), 렌더, 상태 보유 |
| **Dataset** | 정규화·merge·canonical·history·export | UI, 계산(Formula), Search |
| **System** | Profile/Logic/Anchor/Meta 정의, systemId 정체성 | 계산 실행, 렌더, Runtime 상태 |
| **Infrastructure** | Storage/File/Network I/O | 비즈니스 규칙, 계산, 렌더 |

원칙: **한 Capability = 한 Owner Layer**. 동일 Capability를 두 Layer가 소유하면 Architecture Drift로 간주하고 Guard 위반.

### B-5. Architecture Guard Rules (불변 규칙)

**App / Application**
- **R-APP-1** App.jsx는 Runtime 전역 상태만 보유한다. 파생·계산 상태는 Domain이 소유한다.
- **R-APP-2** Provider/Hook 결선만 App에서 수행한다.
- **R-APP-3** App 이벤트 핸들러는 Application Flow 호출만 한다(thin dispatch). 로직 포함 금지.
- **R-APP-4** App은 화면 배치만 한다. 표시 계산은 Renderer로 위임한다.

**Runtime / System**
- **R-RT-1** 모든 System 접근은 Registry → Loader → Runtime Contract 경로만 사용한다. App/Domain/Renderer의 JSON 직접 접근 금지.
- **R-SYS-1** systemId 정규화·분기·정체성 판정은 System Layer가 소유한다. App.jsx에 `if (systemId === ...)` 신설 금지.
- **R-SYS-2** Profile/Logic/Anchor/Meta는 Runtime Contract를 통해서만 노출된다. Contract는 immutable.
- **R-SYS-3** `adminState` 등 편집 상태는 System 값을 미러링만 하며 System 규칙을 재정의하지 않는다.

**Domain**
- **R-DOM-1** Formula/Correction/Sn/C4·C5·C6 계산은 Calculation Domain만 수행한다. App·Renderer·Overlay 계산 금지.
- **R-DOM-2** Trajectory 노드·reflection·rail은 Trajectory Domain이 생성한다. Renderer는 생성하지 않는다.
- **R-DOM-3** AI/Lesson ViewModel·코멘트·병합은 AI/Lesson Domain이 소유한다. UI는 표시만.
- **R-DOM-4** 렌더용 파생 값(resolvedSlotSys 등)은 System/Domain ViewModel이 산출한다.

**Renderer / Overlay**
- **R-RND-1** Renderer는 표시 모델만 만든다. 계산·생성·System 접근 금지. 시각 출력 불변.
- **R-OVL-1** 오버레이 라우팅·상태 전이는 Overlay Layer가 소유한다. App은 open/close entry dispatch만.
- **R-OVL-2** 오버레이 표현 컴포넌트는 `components/overlays`에 위치하며 내부 계산을 포함하지 않는다.

**Search / Dataset / Application Flow**
- **R-SRCH-1** 매칭·스코어·랭킹·corpus 로딩은 Search Domain이 소유한다. Application Flow는 호출만.
- **R-DS-1** localStorage/File/Network I/O는 Infrastructure만 수행한다.
- **R-DS-2** Dataset 정규화·merge·canonical·history는 Dataset Domain만 수행한다. `dataset/{공략}/{시스템}/positions.json` 경로·스키마 불변, `dataset/` .gitignore 금지.
- **R-DS-3** 샘플/Published 로딩은 Runtime Loader(또는 Search corpus)를 경유한다.
- **R-FLOW-1** 다단계 use case는 Application Flow가 조정한다. Application Flow는 Domain을 호출하되 직접 계산·I/O·알고리즘을 포함하지 않는다.

**Guard 운영 원칙**
- 신규 기능/시스템/모듈 추가 시 **책임이 App.jsx로 역류하면 Guard 위반**으로 리뷰에서 반려한다.
- 새 Capability가 필요하면 먼저 본 Matrix에 Owner/Visibility/Rule을 등록한 뒤 구현한다(SPS Dictionary 선등록 원칙과 동일).
- Capability에 복수 Owner가 생기면 Architecture Drift로 간주하고 분리한다.

---

## Part C — Architecture Decision Record (ADR)

```text
Part Version: v1.2 (Governance Layer — ADR)
Status: Application Runtime Constitution (Permanent SSOT)
Basis: Part A (Migration Map) + Part B (Architecture Meta) — unchanged
Rule: Decision 기록 전용. Migration/구현 불변.
```

### C-0. ADR 규약

- ADR은 **왜 이 Architecture를 선택했는가**를 영구 기록한다. 한 번 Accepted된 ADR은 폐기되지 않고 새 ADR로 **Superseded** 처리한다.
- 각 ADR은 Part B의 Capability/Owner/Rule과 **양방향 추적** 가능해야 한다.
- 상태: `Accepted`(현행) / `Superseded`(대체됨) / `Proposed`(검토중).

### ADR-001 — Application Runtime Orchestrator

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | `App.jsx`는 Application Runtime Orchestrator 역할만 수행한다. Boot·Provider Wiring·Runtime State 조정·Event Dispatch·Screen Composition·Application Flow 호출만 담당한다. |
| Reason | App이 계산·검색·Trajectory·Dataset·System 분기를 직접 보유하면 파일이 무한 비대화(현재 ~9,079줄)되고, 신규 System/기능마다 App이 수정되어 회귀 위험이 전 영역으로 전파된다. 책임을 Layer로 분산해야 변경 영향이 국소화된다. |
| Alternative | (a) App 유지 + 부분 헬퍼 추출 → 근본 결합 미해소. (b) 거대 Context 단일화 → State 결합만 이동, 계산 잔존. 모두 기각. |
| Impact | Part A의 모든 Move 항목이 이 결정에서 파생. App에는 APP-002/006/007/012, MISC-001/005, RND-001만 잔존. |
| Result | App은 "어떤 Application Flow를 호출할지"만 안다 (Guide §21). |
| Related Rule | R-APP-1, R-APP-2, R-APP-3, R-APP-4 |
| Related Capability | State Management, Event Dispatch, Provider Wiring, Screen Composition |
| Related Owner | Application Owner |

### ADR-002 — Calculation Domain

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | Formula·Correction·Sn·C4/C5/C6·effective sys 계산은 오직 Calculation Domain(`domain/calculator/*`)만 수행한다. |
| Reason | 동일 계산이 `SysOverlay`(CAL-005)와 `buildSlotEffectiveRenderSysValues`(CAL-002)에 중복 존재해 값 불일치·유지보수 위험이 있다. 계산을 단일 Domain에 귀속시켜야 SSOT·회귀 테스트 대상이 하나로 고정된다. |
| Alternative | (a) 오버레이/렌더별 인라인 계산 유지 → 중복·drift. (b) App util로 이동 → App 책임 증가(ADR-001 위반). 기각. |
| Impact | CAL-001/002/003/005, MISC-006이 Batch 1/4로 이동. CAL-002/005는 단일 함수로 통합. |
| Result | 계산 진입점 단일화, Presentation/App은 계산 금지. |
| Related Rule | R-DOM-1 |
| Related Capability | Formula/Calculation |
| Related Owner | Domain Owner |

### ADR-003 — Trajectory Domain

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | Trajectory 노드·reflection·rail 검출·baseline path 생성은 Trajectory Domain(`domain/trajectory/*`)이 수행한다. Renderer는 생성하지 않고 표시 모델만 만든다. |
| Reason | 현재 App return 본문(TRJ-001)에서 anchors→rail 교점, C2 reflection, cushion path를 직접 조립한다. 생성과 표시가 섞이면 시각 회귀 위험이 커지고 재사용이 불가하다. |
| Alternative | Renderer가 생성까지 담당 → Renderer가 도메인 규칙을 소유하게 되어 Layer 위반. 기각. |
| Impact | TRJ-001/003, APP-009(계산부) Batch 5. 표시 정책(TRJ-002, RND-003/004)은 Renderer로 별도 분리. |
| Result | 생성=Domain, 표시=Renderer로 이원화. |
| Related Rule | R-DOM-2, R-RND-1 |
| Related Capability | Trajectory, Rendering |
| Related Owner | Domain Owner (생성) / Renderer Owner (표시) |

### ADR-004 — Search Domain 단일 Owner

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | 매칭·스코어·랭킹·corpus 로딩은 Search Domain(`search/*`)이 단일 Owner로 소유한다. Application Flow는 호출·결과 배선만 한다. |
| Reason | USER/ADMIN/로컬DB 3경로(SRCH-001~003)가 App에 흩어져 유사 알고리즘이 반복된다. 40+ System 확장 시 검색 규칙이 여러 곳으로 번지면 결과 일관성이 깨진다. |
| Alternative | Application Flow마다 검색 로직 내장 → 알고리즘 중복. 기각. |
| Impact | SRCH-001~003 알고리즘은 Search Owner, 오케스트레이션은 Application Flow Owner로 분리(Capability 경계). DS-007은 `search/corpus`. |
| Result | 검색 알고리즘 SSOT 확보. |
| Related Rule | R-SRCH-1, R-FLOW-1 |
| Related Capability | Search/Recall |
| Related Owner | Search Owner |

### ADR-005 — Dataset Layer 접근 제한

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | Dataset 접근은 Dataset Domain(정규화·merge·canonical·history)과 Infrastructure(localStorage·File·Network I/O)만 수행한다. App/Renderer/Overlay 직접 접근 금지. |
| Reason | App이 `localStorage`(12회)·`fetch`(1회)를 직접 호출(DS-001/002/006)해 저장 경로/스키마가 UI와 결합돼 있다. 경로 파손은 Published Dataset 전체에 영향을 준다. |
| Alternative | App에서 직접 I/O 유지 → 경로/스키마 변경 위험 상시화. 기각. |
| Impact | DS-001/004 → Infrastructure, DS-002/003/005·MISC-002 → Dataset Domain, 오케스트레이션은 Application Flow. |
| Result | `dataset/{공략}/{시스템}/positions.json` 경로·스키마 불변, `dataset/` .gitignore 금지 규칙 고정. |
| Related Rule | R-DS-1, R-DS-2, R-DS-3 |
| Related Capability | Dataset, Dataset Persistence, History |
| Related Owner | Dataset Owner / Infrastructure Owner |

### ADR-006 — System Runtime Contract

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | App/Domain/Renderer는 System JSON(profile/logic/anchors/system_meta)에 직접 접근하지 않는다. 접근은 Registry → Loader → Runtime Contract 경로만 사용한다. |
| Reason | App이 `SYSTEM_PROFILES`·`getAnchorsForSystem`·`profile.safety`를 직접 참조(SYS-001/002, TRJ-003)하고 `5_HALF→5_half_system` 정규화가 10곳 이상 산재한다. 40+ System 확장 시 직접 결합은 Runtime 재설계 없이는 불가능해진다. (SPS §42) |
| Alternative | App이 Registry/JSON 직접 참조 유지 → System 추가마다 App 수정, 확장 불가. 기각. |
| Impact | SYS-001/002/003/006, DS-006, TRJ-003, RND-004는 Runtime Contract 구현이 선행되어야 이동 가능(Batch 6, Blocker). |
| Result | Runtime과 System 구현이 영구 분리. |
| Related Rule | R-RT-1, R-SYS-1, R-SYS-2 |
| Related Capability | System, Runtime |
| Related Owner | System Owner / Runtime Owner |

### ADR-007 — Capability Ownership (단일 Owner)

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | 하나의 Capability는 정확히 하나의 Owner Layer만 가진다. 복수 Owner는 금지한다. |
| Reason | 동일 Capability를 두 Layer가 소유하면 규칙·구현이 분기(Architecture Drift)되어 어느 쪽이 SSOT인지 불명확해진다. 단일 Owner라야 변경·회귀 책임 소재가 고정된다. |
| Alternative | 편의상 공유 Owner 허용 → Drift 누적. 기각. |
| Impact | 이중 표기 항목(CAL-006, DS-002/003, AI-002, MISC-003, APP-009)은 Capability 경계로 코드 분리 후 각 단일 Owner에 귀속. |
| Result | Part B Ownership Matrix가 강제 규범이 됨. |
| Related Rule | R(전체), Guard 운영 원칙 |
| Related Capability | (전 Capability) |
| Related Owner | (각 Capability의 단일 Owner) |

### ADR-008 — Dependency Direction

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | 의존 방향은 `System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation` 단방향만 허용한다. 역방향 의존 금지. |
| Reason | SPS §4는 System과 Runtime의 영구 분리를 요구한다. 역의존이 생기면 하위 변경이 상위를 오염시켜 독립 테스트·교체가 불가능해진다. |
| Alternative | 양방향/순환 의존 허용 → 결합 폭증, 회귀 추적 불가. 기각. |
| Impact | Visibility(Public/Internal/Private)로 방향을 강제. Runtime Contract만 System 외부에 Public 노출. |
| Result | Layer 교체·확장이 국소적으로 가능. |
| Related Rule | R-RT-1, Visibility 규정 |
| Related Capability | Runtime, System (전 Capability의 의존 규범) |
| Related Owner | Runtime Owner |

### ADR-009 — Overlay 책임 한정

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | Overlay Layer는 Routing과 Presentation, 그리고 Overlay State만 담당한다. 계산·검색·Dataset·System 로직을 포함하지 않는다. |
| Reason | `SysOverlay`(OVL-005)가 UI와 실시간 계산(CAL-005)을 동시에 품고 있어 오버레이가 도메인 규칙 소유자처럼 동작한다. 오버레이는 표시·전이만 담당해야 재사용·테스트가 가능하다. |
| Alternative | 오버레이 내부 계산 유지 → 계산 SSOT 분산(ADR-002 위반). 기각. |
| Impact | OVL-001/002/003 → routing/state, OVL-005~008 → `components/overlays`(Presentation), 계산은 Domain으로 분리. App은 open/close entry dispatch만. |
| Result | 오버레이는 "무엇을 열고 닫는가"만 안다. |
| Related Rule | R-OVL-1, R-OVL-2 |
| Related Capability | Overlay |
| Related Owner | Overlay Owner |

### ADR-010 — Future Extension (App 불변 확장)

| 항목 | 내용 |
|----|----|
| Status | Accepted |
| Decision | 새로운 기능·System·Runtime Module이 추가되어도 `App.jsx`는 수정하지 않는다. 확장은 Capability 등록 + 해당 Owner Layer 구현으로만 이뤄진다. |
| Reason | 프로젝트 목표는 40+ System을 동일 Architecture에서 유지하는 것이다. System 추가마다 App을 고쳐야 하면 확장 비용·회귀 위험이 선형 이상으로 증가한다. "App 수정 없이 System 추가 가능"이 성공 기준(Guide §19-17)이다. |
| Alternative | System별 App 분기 허용 → 5½ 예외가 영구화되고 신규 예외가 누적. 기각. |
| Impact | 신규 작업은 Part D Review Checklist·Approval Flow를 통과해야 하며, App 책임 증가·System-specific 분기 신설은 반려된다. |
| Result | App.jsx가 Architecture Guard로 고정됨. |
| Related Rule | R-APP-1~4, R-SYS-1, Guard 운영 원칙 |
| Related Capability | (전 Capability) |
| Related Owner | Application Owner |

### C-1. ADR 추적 매트릭스

| ADR | 핵심 결정 | Related Owner | Related Rule |
|----|----|----|----|
| ADR-001 | App = Orchestrator | Application | R-APP-1~4 |
| ADR-002 | 계산 = Calculation Domain | Domain | R-DOM-1 |
| ADR-003 | Trajectory 생성 = Domain | Domain/Renderer | R-DOM-2, R-RND-1 |
| ADR-004 | 검색 = Search 단일 Owner | Search | R-SRCH-1 |
| ADR-005 | Dataset = Domain/Infra만 | Dataset/Infrastructure | R-DS-1~3 |
| ADR-006 | System = Contract 경유 | System/Runtime | R-RT-1, R-SYS-1/2 |
| ADR-007 | Capability = 단일 Owner | 전체 | 전체 |
| ADR-008 | 의존 단방향 | Runtime | R-RT-1 |
| ADR-009 | Overlay = Routing/Presentation | Overlay | R-OVL-1/2 |
| ADR-010 | App 불변 확장 | Application | R-APP-*, R-SYS-1 |

---

## Part D — Architecture Review Checklist & Approval Flow

```text
Part Version: v1.2 (Governance Layer — Review & Approval)
Purpose: 신규 기능/Runtime/System/Domain/Overlay 추가 시 Architecture 준수 강제
Scope: 모든 신규 변경 PR/Batch 착수 전 필수 통과
```

### D-1. Architecture Review Checklist (13항)

각 변경은 아래를 **모두 통과**해야 한다. 하나라도 불충족이면 **반려**한다.

| # | 확인 항목 | 통과 기준 | 위반 시 근거 |
|----|----|----|----|
| 1 | Capability 정의 | 변경이 제공하는 Capability가 Part B에 등록됨 | ADR-007 |
| 2 | 단일 Owner | 해당 Capability의 Owner가 정확히 하나 | ADR-007 |
| 3 | Visibility 정의 | Public/Internal/Private 지정됨 | ADR-008 |
| 4 | Architecture Rule 준수 | R-* Guard를 위반하지 않음 | Part B §B-5 |
| 5 | ADR 준수 | ADR-001~010과 충돌 없음 | Part C |
| 6 | Dependency 방향 | System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation 유지, 역/순환 없음 | ADR-008 |
| 7 | Runtime Contract 우회 금지 | System 접근이 Registry/Loader/Contract 경유 | ADR-006 |
| 8 | App 책임 불증가 | `App.jsx`에 계산·검색·Dataset·Trajectory·System 로직 추가 없음 | ADR-001, ADR-010 |
| 9 | System-specific 금지 | App/Domain에 `if(systemId===...)`·`5_half` 분기 신설 없음 | ADR-006, ADR-010 |
| 10 | Presentation 무계산 | 컴포넌트/오버레이가 계산·생성하지 않음 | ADR-002, ADR-003, ADR-009 |
| 11 | Regression 대상 확인 | 계산/검색/Trajectory/Dataset 영향 시 회귀 케이스 명시 | Guide §18 |
| 12 | Migration Batch 영향 | Part A Batch/Priority에 영향 여부 판정(변경은 금지, 표기만) | Part A |
| 13 | Architecture Review 필요성 | Contract/구조/의존 변경이면 정식 Review 요구 | SPS §31 |

**빠른 판정 규칙**
- #7·#8·#9 중 하나라도 위반 → **즉시 반려**(Architecture Drift, 협의 불가).
- #11 미비 → 고위험(Batch 4~6) 변경은 착수 금지.

### D-2. Architecture Approval Flow

```text
New Feature / New System / New Module
        │
        ▼
[1] Capability 식별        ── Part B에 등록/확인
        │
        ▼
[2] Owner 지정 (단일)      ── Ownership Matrix
        │
        ▼
[3] Visibility 결정        ── Public / Internal / Private
        │
        ▼
[4] Architecture Rule 대조 ── R-* Guard
        │
        ▼
[5] ADR 대조/신규 ADR       ── 기존 ADR 충돌 검사, 신규면 Proposed 등록
        │
        ▼
[6] Review Checklist (D-1)  ── 13항 통과
        │
        ├─ 실패 → 반려(Reject) → 재설계
        │
        ▼
[7] Approve                 ── ADR 상태 Accepted, Owner 승인
        │
        ▼
[8] Implementation          ── 해당 Owner Layer에서만 구현 (App 불변)
        │
        ▼
[9] Regression & Build      ── npm run build + 회귀 통과
```

정본 순서: `Capability → Owner → Visibility → Architecture Rule → ADR → Review → Implementation` (Approve/Regression은 부가 게이트).

Dependency 게이트([6] #6)가 참조하는 정본 체인: `System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation`.

**Gate 규칙**
- [4]/[5]/[6] 통과 전 구현 착수 금지.
- 신규 Capability는 [1]~[3] 등록(문서 선반영)이 코드보다 선행(SPS Dictionary 선등록 원칙).
- Runtime Contract·의존 구조 변경은 [5]에서 반드시 신규 ADR 작성 + 정식 Architecture Review.

### D-3. 신규 항목 등록 템플릿 (복사용)

```text
Capability      :
Owner           :
Visibility      : Public | Internal | Private
Architecture Rule 근거 : R-___
관련 ADR        : ADR-___
Dependency 방향 : ___ → ___ (정본 단방향 확인)
Runtime Contract 경유 : Y/N (System 접근 시 Y 필수)
App.jsx 수정 여부 : N (원칙) / 예외 시 사유+ADR
Regression 대상 : ___
Migration Batch 영향 : 없음 / (있으면 표기만, 변경 금지)
Review 결과     : Approved / Rejected
```

### D-4. 완성 선언

본 문서(`App_Migration_Map.md`)는 다음을 모두 포함한다:

- **Part A** — Migration Blueprint (Batch/Priority/Target)
- **Part B** — Architecture Blueprint / Meta (Capability·Owner·Visibility·Rule·Matrix·Guard)
- **Part C** — Architecture Decision Record (ADR-001~010)
- **Part D** — Architecture Review Checklist + Approval Flow

→ **Application Runtime Migration Constitution (SSOT)** 로 완성. 이후 모든 신규 기능·System·Module은 Part D를 통과해야 하며, App.jsx로의 책임 역류는 ADR-001/010과 Guard로 영구 차단된다.

---

End of App_Migration_Map (Constitution / Document Only)
