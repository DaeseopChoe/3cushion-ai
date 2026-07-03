# App_Authority_Inventory.md

```text
Version: v1.0 (P0 — Document Only)
Date: 2026-07-02
Phase: AAS Runtime Migration Phase 1 — Application Runtime Inventory
Scope: frontend/src/App.jsx (~9,079 lines)
Standard: AAS v2.0 + SPS v1.0
Rule: Read-only analysis. No code/runtime/import/format changes.
Terminology: Architecture_Dictionary.md (Official Names)
```

## 1. App 개요 (현재 App의 역할)

현재 `App.jsx`는 AAS가 정의하는 **Application Runtime Orchestrator**의 범위를 크게 초과한다. 한 파일 안에 다음이 혼재한다.

- **Application Runtime**: `appMode`, 화면 구성, Provider/Hook 결선, 이벤트 디스패치 (정상 귀속)
- **Application Layer(Flow)**: Search / Recall / Save / Reset / Overlay / Slot apply 흐름 (이동 대상)
- **Domain Layer**: Formula 계산, Sn, C4/C5/C6, effective sys value, trajectory 조립, reflection (이동 대상)
- **Renderer**: anchors→좌표 변환 조립, 라벨 키 선택, baseline handle 노드 (이동 대상)
- **Overlay**: ADMIN `overlayState` / USER `overlayContent` 상태·라우팅 (부분 유지, 로직 이동)
- **Search / Dataset**: localStorage / fetch / published corpus 직접 접근 (이동 대상)
- **System-specific(5½)**: `5_half_system` / `useSn` / `SYS_SYSTEM_CONFIG` / `solveFiveHalfTwoOfThree` (System Layer로 이동)

정량 요약: 총 ~9,079줄, import 50, `5_half_system` 30회, `5_HALF` 11회, `useSn` 18회, `localStorage` 12회, `fetch` 1회. 계산 엔진은 이미 `SYSTEM_PROFILES` / `calculateByProfileExpr` / `getAnchorsForSystem`로 상당 부분 일반화되어 있으나, **5½ 전용 규칙·기본값·인라인 오버레이**가 App에 잔존한다.

인라인 컴포넌트(모듈 내 정의): `SysOverlay`(~1135), HP/T 오버레이(~2180), Anchor Edit 오버레이(~2727), `AiOverlay`(~3061), 메인 `App`(~3398).

---

## 2. 책임 목록 (Responsibility Inventory)

> Tag는 `App.jsx_Responsibility_Analysis_Guide.md` §4 태그를 사용. Keep = App 유지, Move = 이동 대상.

| ID | Line(approx) | 이름 / 블록 | 현재 책임 | Primary Tag | 관련 State/Hook | 관련 파일 | Risk | Keep/Move | 예상 최종 위치 |
|----|----|----|----|----|----|----|----|----|----|
| APP-001 | 3398–3401 | `currentId/view/loading/error` | 샘플 JSON 로드 상태 | APP_RUNTIME_STATE | `setView` | — | LOW | Move* | Dataset/System Loader |
| APP-002 | 3413 | `appMode` | ADMIN/USER 모드 | APP_RUNTIME_STATE | `setAppMode` | — | LOW | **Keep** | App.jsx |
| APP-003 | 3402 | `overlayContent` | USER 오버레이 상태 | OVERLAY_STATE | — | — | MED | Keep(state)/Move(routing) | overlay/state |
| APP-004 | 3711 | `overlayState` | ADMIN 오버레이 상태 | OVERLAY_STATE | — | ModalShell | MED | Keep(state)/Move(routing) | overlay/state |
| APP-005 | 3420–3495 | `adminState` | SYS/HPT/STR/AI 편집 미러 | APP_RUNTIME_STATE | `setAdminState` | adminSysFromSlot | MED | Keep(shell)/Move(파생) | App + Domain VM |
| APP-006 | 3495 | `ballsState` | 공 위치 Runtime 상태 | APP_RUNTIME_STATE | — | — | MED | **Keep** | App.jsx |
| APP-007 | 3505–3512 | `userTableDisplaySlotId` 등 | USER 검색/슬롯 표시 상태 | APP_RUNTIME_STATE | — | — | MED | Keep | App.jsx |
| APP-008 | 3509 | `userPublishedSearchContext` | published leaf 컨텍스트 | SEARCH_USER | — | publishedLeafResolve | MED | Keep(state)/Move(logic) | application/flows |
| APP-009 | 3728 | `baselineDraftState` | baseline 편집 draft | OVERLAY_STATE / RENDERER_TRAJECTORY | refs | — | HIGH | Move | domain/trajectory + overlay |
| APP-010 | 3917 | `dataset` init | `localStorage.getItem("positions_dataset")` | DATASET_WORKING | — | positionMergeEngine | HIGH | Move | domain/dataset (infra) |
| APP-011 | 3960–3980 | `onePointLibrary` | AI 레슨 라이브러리 localStorage | DATASET_HISTORY / DOMAIN_AI_LESSON | — | — | MED | Move | domain/lesson |
| APP-012 | 4091 | `dragState` | 포인터 드래그 상태 | APP_RUNTIME_STATE | — | — | MED | Keep | App.jsx |
| APP-013 | 6345 | `sysLabelScale` | phone landscape 라벨 배율 | RENDERER_LABELS | matchMedia | tableConfig | LOW | Move | renderer/labels |
| APP-014 | 6294 | `useSystemController(...)` | T/thickness/system view | APP_PROVIDER_WIRING | hook | useSystemController | LOW | Keep | App.jsx |
| APP-015 | (import) | `useShotSlots` (shotEditor/actions) | Slot draft/applied SSOT | APP_PROVIDER_WIRING | hook | useShotSlots | LOW | Keep | App.jsx |
| APP-016 | (import) | `useTrajectoryState` | Trajectory 상태 머신 | APP_PROVIDER_WIRING | hook | useTrajectoryState | LOW | Keep | App.jsx |
| — | — | **System 처리** | — | — | — | — | — | — | — |
| SYS-001 | 42 | `import SYSTEM_PROFILES` | Profile Definition 접근 | SYSTEM_SPECIFIC_GENERAL | — | data/systems | MED | Move(via Contract) | Registry/Loader |
| SYS-002 | 162 | `import getAnchorsForSystem` | Anchor Definition 접근 | SYSTEM_SPECIFIC_GENERAL | — | anchorsRegistry | MED | Move(via Contract) | Registry/Loader |
| SYS-003 | 662–668 | `SYS_SYSTEM_CONFIG` | mode/useSn 시스템 테이블 | SYSTEM_SPECIFIC_5_HALF | — | — | HIGH | Move | logic.json / system_meta.json |
| SYS-004 | 670–688 | `canonicalSystemIdForConfig` / `getSysSystemMode` / `getSysUseSn` / `isFiveHalfSystemId` | systemId 정규화·모드 판정 | SYSTEM_SPECIFIC_5_HALF | — | — | HIGH | Move | domain/system + Contract |
| SYS-005 | 6446–6448 | `systemIdForGrid` (5_HALF→5_half_system) | 렌더 systemId 정규화 | SYSTEM_SPECIFIC_GENERAL | resolvedSlotSys | — | MED | Move | domain/system normalize |
| SYS-006 | 6173 | `/samples/5_half_system` | 샘플 경로 하드코딩 | SYSTEM_SPECIFIC_5_HALF | view | — | MED | Move | system_meta.json |
| — | — | **Calculator 호출** | — | — | — | — | — | — | — |
| CAL-001 | 703–738 | `solveFiveHalfTwoOfThree` / `fiveHalfComputedInputKey` | 5½ 2-of-3 계산 | DOMAIN_CALCULATION + SYSTEM_SPECIFIC_5_HALF | — | — | HIGH | Move | domain/calculator/fiveHalf |
| CAL-002 | 910–1061 | `buildSlotEffectiveRenderSysValues` | base+보정→effective sys, Sn, C4/5/6 | DOMAIN_CALCULATION | adminSys | systemCalculator | HIGH | Move | domain/calculator |
| CAL-003 | 522–563 | `buildSlotSysSnapshotFromStrategyEntry` | recall entry→sys snapshot | DOMAIN_CALCULATION | — | systemCalculator | HIGH | Move | domain/calculator |
| CAL-004 | 611–642 | `adminSysFromRecallStrategyEntry` | recall→adminState.sys | APPLICATION_COORDINATION | — | canonicalStrategy | MED | Move | application/flows |
| CAL-005 | 1274–1527 (SysOverlay) | expr 파싱/calc/Sn/effDisplayMap | SYS 오버레이 실시간 계산 | DOMAIN_CALCULATION + SYSTEM_SPECIFIC_5_HALF | formData | systemCalculator | HIGH | Move | domain/calculator |
| CAL-006 | 7270 | `computeSystemFromPositions` 호출 | 공 드래그→sys 역산 | DOMAIN_CALCULATION | dragState | systemEngine | MED | Move | application/flows + domain |
| — | — | **Trajectory** | — | — | — | — | — | — | — |
| TRJ-001 | ~7315–8100 | anchors→CO/C1/C3 rail, C2 reflection, cushion path 조립 | Trajectory 생성 | DOMAIN_TRAJECTORY | many | reflectionEngine, geometry | HIGH | Move | domain/trajectory |
| TRJ-002 | 8196–8340 | display cap / visibleKeysForLabels / labelStrategy | 표시 cap·라벨 선택 | RENDERER_TRAJECTORY | — | trajectoryPathDisplayPolicy | MED | Move | renderer/trajectory |
| TRJ-003 | 7570–7600 | `profile.safety.m_min/theta_t_max` 사용 | reflection 안전값 | DOMAIN_TRAJECTORY + SYSTEM | profile | — | MED | Move | domain/trajectory (via Contract) |
| — | — | **Overlay** | — | — | — | — | — | — | — |
| OVL-001 | 4237–4251 | `openOverlay/openAnchorEdit` | ADMIN 오버레이 open | OVERLAY_ROUTING | overlayState | — | LOW | Keep(thin)/Move(logic) | overlay/router |
| OVL-002 | 4622–4638 | ADMIN 오버레이 auto-close effect | Overlay lifecycle | OVERLAY_STATE | overlayState | — | MED | Move | overlay/state |
| OVL-003 | 5411–5423 | USER overlay dismiss/close | USER overlay lifecycle | OVERLAY_STATE | overlayContent | — | LOW | Keep(thin) | overlay/router |
| OVL-004 | 8693–8860 | `<SysOverlay>` onSave→commitDraftSys | Overlay→slot apply | APPLICATION_FLOW | shotEditor | useShotSlots | HIGH | Move | application/flows |
| OVL-005 | 1135–2170 | `SysOverlay` 인라인 컴포넌트 | SYS 편집 UI+계산 | OVERLAY_PRESENTATION + DOMAIN_CALCULATION | — | — | HIGH | Move | components/ + domain 분리 |
| OVL-006 | 2180–2700 | HP/T 인라인 오버레이 | HP/T 편집 UI | OVERLAY_PRESENTATION | useHptController | — | MED | Move | components/ |
| OVL-007 | 2727–3050 | Anchor Edit 인라인 오버레이 | 앵커 좌표 편집 UI | OVERLAY_PRESENTATION | — | — | MED | Move | components/ |
| OVL-008 | 3061–3390 | `AiOverlay` 인라인 컴포넌트 | AI 편집 UI+레슨 DnD | OVERLAY_PRESENTATION + DOMAIN_AI_LESSON | onePoint* | — | MED | Move | components/ + domain/ai |
| — | — | **Search / Recall** | — | — | — | — | — | — | — |
| SRCH-001 | 5022–5137 | `handlePositionRecall` | ADMIN 로컬DB/Recall | APPLICATION_FLOW + SEARCH_ADMIN_LOCALDB | dataset | recall/recallEngine | HIGH | Move | application/flows/adminLocalDbFlow |
| SRCH-002 | 5138–5203 | `handleAdminSearch` | ADMIN published Search | APPLICATION_FLOW + SEARCH_ADMIN_PUBLISHED | — | publishedDatasetStore | HIGH | Move | application/flows/adminSearchFlow |
| SRCH-003 | 5243–5404 | `handleUserSearchStrategies` | USER published Search | APPLICATION_FLOW + SEARCH_USER | userSearchInFlightRef | recallEngine, publishedLeafResolve | HIGH | Move | application/flows/userSearchFlow |
| SRCH-004 | 5204–5242 | `handleUserSearchReset` | USER Reset | APPLICATION_FLOW | many | — | MED | Move | application/flows/resetFlow |
| SRCH-005 | 4640–4650 | `evalForSave`→`evaluateStrategy` | 저장용 평가 | APPLICATION_COORDINATION | — | evaluateStrategy | MED | Move | application/flows/saveFlow |
| — | — | **Dataset / History** | — | — | — | — | — | — | — |
| DS-001 | 3917–3952 | dataset localStorage load | Working Dataset load | DATASET_WORKING | — | positionMergeEngine | HIGH | Move | domain/dataset (infra) |
| DS-002 | 4652–4840 | `handleSaveStrategy` | canonical 저장→dataset merge→localStorage | APPLICATION_FLOW + DATASET_WORKING | dataset | canonicalStrategy, positionMergeEngine | HIGH | Move | application/flows/saveFlow |
| DS-003 | 4844–4865 | `handleCanonicalRightPanelSave` | 저장+workspace history | APPLICATION_FLOW + DATASET_HISTORY | — | useSettings | MED | Move | application/flows/historyFlow |
| DS-004 | 4205–4235 | `handleImportDataset/handleFileImport` | dataset.json import | DATASET_WORKING | fileInputRef | — | MED | Move | domain/dataset (infra) |
| DS-005 | 4190–4203 | `handleWorkspaceLocalStorageCleanup` | 저장소 정리 | DATASET_HISTORY | — | useSettings | LOW | Move | domain/history |
| DS-006 | 6162–6216 | 샘플 fetch effect | `fetch(/samples/...)` → view | DATASET_PUBLISHED-like + SYSTEM | view | — | HIGH | Move | System/Dataset Loader |
| DS-007 | 5028–5035 등 | `getOrLoadPublishedLeaf` 사용 | Published corpus load | DATASET_PUBLISHED | — | publishedDatasetStore | MED | Move | search/corpus |
| — | — | **AI** | — | — | — | — | — | — | — |
| AI-001 | 3061–3390 | AiOverlay 자동 코멘트/레슨 | AI VM 생성·레슨 DnD | DOMAIN_AI_LESSON | onePoint* | aiAutoCommentViewModel | MED | Move | domain/ai + domain/lesson |
| AI-002 | 3960–3980 | one-point library persist | 레슨 저장/복원 | DATASET_HISTORY + DOMAIN_AI_LESSON | — | — | LOW | Move | domain/lesson |
| AI-003 | (USER 렌더) | `buildUserInfoPanel`/`AiAutoCommentDisplay` | USER AI VM | DOMAIN_VIEWMODEL | — | userInfoPanelModel | LOW | Move | domain/ai (VM) |
| — | — | **Rendering / Composition** | — | — | — | — | — | — | — |
| RND-001 | ~6360 이후 return | 메인 JSX (Stage/SVG/Modal/Overlay) | Screen composition | APP_SCREEN_COMPOSITION | — | Stage, ModalShell | LOW | **Keep** | App.jsx |
| RND-002 | 8583–8627 | `<SystemGrid>` / `<SystemValueLabels>` 결선 | 라벨/그리드 렌더 | APP_SCREEN_COMPOSITION + RENDERER_LABELS | — | SystemValueLabels | LOW | Keep(결선)/Move(source계산) | App + renderer/labels |
| RND-003 | 8372–8420 | co/c1 baseline handle 노드 | baseline 핸들 SVG | RENDERER_TRAJECTORY + SYSTEM_SPECIFIC_5_HALF | baselineDraftState | — | MED | Move | renderer/trajectory |
| RND-004 | 7320–7371 | `convertCanonicalAnchors`(offset_fg2rg) | Fg→Rg 변환 조립 | RENDERER_TRAJECTORY | profile.safety | convertCanonicalAnchors | MED | Move | renderer/trajectory |
| — | — | **기타 Runtime** | — | — | — | — | — | — | — |
| MISC-001 | 6262–6292 | 키보드 단축키 effect | Ctrl+Shift+A 모드 토글 등 | APP_EVENT_DISPATCH | appMode | — | LOW | Keep | App.jsx |
| MISC-002 | 6240–6257 | Auto capture effect | 안정 시 candidate 생성 | DOMAIN_DATASET | adminState | autoCaptureEngine | LOW | Move | domain/dataset |
| MISC-003 | 6954–7309 | pointer/joypad 핸들러 | 공 드래그·조이스틱 | APP_EVENT_DISPATCH + DOMAIN_CALCULATION | dragState | geometry | HIGH | Keep(dispatch)/Move(계산) | App + domain |
| MISC-004 | 3589–3641 | `resolvedSlotSys`/`resolvedSlotSysValues` | 렌더 SSOT 파생 | DOMAIN_VIEWMODEL + SYSTEM_SPECIFIC_5_HALF | shotEditor | slotSysResolve | MED | Move | domain/system VM |
| MISC-005 | 5424–5548 | `handleSelectAdminButton`/`handleToggleAdminMode`/`handleSave` | ADMIN 버튼 디스패치 | APP_EVENT_DISPATCH | — | — | LOW | **Keep** | App.jsx |

\* APP-001은 상태 자체는 유지 가능하나, 로딩 소스(샘플 fetch)는 System/Dataset Loader로 이동.

---

## 3. 책임 분류 (Layer Classification 요약)

| Layer | 대표 항목 | 판정 |
|-------|-----------|------|
| **Application (Runtime)** | `appMode`, `ballsState`, `dragState`, Hook 결선, 단축키/버튼 dispatch, 메인 JSX 구성 | App 유지 |
| **Application (Flow)** | Search(SRCH-001~003), Reset(SRCH-004), Save(DS-002~003), Overlay apply(OVL-004), recall hydrate(CAL-004) | `application/flows` 이동 |
| **Domain (Calculation)** | CAL-001~006, MISC-004 | `domain/calculator` 이동 |
| **Domain (Trajectory)** | TRJ-001, TRJ-003, MISC-003(계산부) | `domain/trajectory` 이동 |
| **Domain (AI/Lesson)** | AI-001~003 | `domain/ai`, `domain/lesson` 이동 |
| **Renderer** | TRJ-002, RND-002~004, APP-013 | `renderer/*` 이동 |
| **Overlay** | OVL-001~008 (상태 유지 / 로직·컴포넌트 이동) | `overlay/*` + `components/` |
| **Search** | SRCH-001~005, DS-007 | `search/*` + Application Flow |
| **Dataset** | DS-001~006, MISC-002 | `domain/dataset` + Infra |
| **System** | SYS-001~006 | Registry/Loader + `profile/logic/system_meta` |

---

## 4. App가 직접 수행하는 책임 (SSOT 위반 핵심)

**직접 계산**
- `solveFiveHalfTwoOfThree`, `fiveHalfComputedInputKey` (App 내 정의)
- `buildSlotEffectiveRenderSysValues` — Sn, C4/C5/C6 sync, effDisplayMap을 App이 직접 산출
- `SysOverlay` 내부 expr 파싱·`calculateByProfileExpr` 호출·보정 파이프라인
- 공 드래그 시 `computeSystemFromPositions` 직접 호출·`adminState` 갱신
- Trajectory rail 교점·C2 reflection·cushion path를 App return 본문에서 직접 조립

**직접 상태**
- `dataset`를 App이 `localStorage`에서 직접 read/write (DS-001, DS-002)
- `onePointLibrary`를 App이 직접 localStorage 관리
- 샘플 JSON을 App이 직접 `fetch`

**직접 분기 (System-specific)**
- `systemIdForGrid === "5_half_system"` 다수 (labelStrategy, baseline handle, needsC3r 등)
- `isFiveHalfSystemId(...)` 분기 다수
- `SYS_SYSTEM_CONFIG`로 mode/useSn를 App이 직접 판정
- `5_HALF → 5_half_system` alias 정규화가 10곳 이상 산재

이는 SPS `System_Runtime_Contract.md` §42 위반: “App.jsx shall never contain System-specific branches / formula evaluation / anchor lookup / System normalization.”

---

## 5. App에서 제거 가능한 책임 (후보만 — 수정 금지)

**즉시 후보(저위험)**
- `sysLabelScale` matchMedia (APP-013) → renderer/labels
- `handleWorkspaceLocalStorageCleanup` (DS-005) → domain/history
- Auto capture effect (MISC-002) → domain/dataset
- `openOverlay`/dismiss 계열의 라우팅 로직 (OVL-001/003) → overlay/router (thin dispatch만 App 유지)

**순수 함수 후보(P2)**
- `parseSysFormulaExpr`, `getDisplayExprForSys`, `solveFiveHalfTwoOfThree`, `fiveHalfComputedInputKey`, `canonicalSystemIdForConfig`, `getSysSystemMode`, `getSysUseSn`, `isFiveHalfSystemId` — 입력/출력 명확, React 상태 비의존

**Flow 후보(P3)**
- SRCH-001~004, DS-002~003, OVL-004, CAL-004

**System-specific 후보(P4, 고위험)**
- SYS-003~006, CAL-001/002/005, RND-003, MISC-004의 5½ 분기

**Renderer 후보(P5)**
- TRJ-002, RND-002~004

---

## 6. App에 반드시 남아야 하는 책임

- **Application Boot / Provider Wiring**: Hook 결선(`useShotSlots`, `useTrajectoryState`, `useSystemController`, `useDisplayController`, `useCoachingController`, `useSettings`) — APP-014~016
- **Application Runtime State**: `appMode`(APP-002), `ballsState`(APP-006), `dragState`(APP-012), 검색/슬롯 표시 상태(APP-007)
- **Event Dispatch(thin)**: `handleSelectAdminButton`, `handleToggleAdminMode`, 단축키 effect (MISC-001, MISC-005)
- **Screen Composition**: 메인 JSX(Stage/SVG/ModalShell/Overlay 배치) — RND-001, RND-002(결선부)
- **Overlay entry routing(thin)**: `overlayContent`/`overlayState` 보유 및 open/close dispatch (내부 로직은 이동)

목표: `App.jsx` = “어떤 Application Flow를 호출할지”만 아는 Orchestrator (SPS §46, Guide §21).

---

## 7. 발견된 문제점

| 유형 | 내용 | 근거 |
|------|------|------|
| **책임 중복** | SYS 계산이 `SysOverlay`(CAL-005)와 `buildSlotEffectiveRenderSysValues`(CAL-002) 양쪽에 유사 로직으로 존재 | 1274–1527 vs 910–1061 |
| **Layer 위반** | App(Presentation/Runtime)이 Domain 계산·Trajectory 조립을 직접 수행 | CAL-*, TRJ-001 |
| **Dependency 위반** | App이 System JSON(`SYSTEM_PROFILES`, `getAnchorsForSystem`, `profile.safety.*`)에 직접 접근 (Contract 미경유) | SYS-001/002, TRJ-003 |
| **강한 Coupling** | `adminState.sys` ↔ slot draft/applied ↔ `resolvedSlotSys` ↔ trajectory가 App 내부에서 직접 얽힘 | MISC-004, OVL-004 |
| **System-specific Logic** | `5_half_system`/`useSn`/`SYS_SYSTEM_CONFIG`/samples 경로가 App에 하드코딩 | SYS-003~006 |
| **Infra 직접 접근** | `localStorage`/`fetch`를 App이 직접 호출 (12 localStorage, 1 fetch) | DS-001/002/006 |
| **거대 인라인 컴포넌트** | `SysOverlay`/`AiOverlay` 등 4개 오버레이가 App 파일 내 정의 → 파일 비대화 | 1135, 3061 등 |

---

## 8. Migration 준비 상태

**즉시 이동 가능 (LOW, P1~P2)**
- 순수 함수: `parseSysFormulaExpr`, `getDisplayExprForSys`, systemId 판정 4종, 5½ 2-of-3 함수 (wrapper/re-export로 무동작 이동)
- `sysLabelScale`, cleanup handler, auto-capture

**추가 조사 필요 (MED~HIGH, P3~P5)**
- Search/Recall Flow 3종 — 결과·slot hydrate 동일성 회귀 필요
- Save/History Flow — dataset merge/schema/localStorage 경로 불변 검증 필요
- Trajectory 조립(TRJ-001) — reflection/rail/cap 시각 결과 회귀 필요
- `adminState` ↔ slot 결합 분해 — SSOT 경계 재정의 선행 필요

**위험 요소 (반드시 회귀)**
- 5½ 계산(Sn, C4/C5/C6) 값 변화 위험 — CAL-001/002/005
- USER/ADMIN Search 결과·랭킹 변화 위험 — SRCH-001~003
- Dataset 경로/스키마·`dataset/{공략}/{시스템}/positions.json` 불변 (SPS 회귀 규칙)
- Trajectory Display Cap / Caption / labelScale 시각 불변 — TRJ-002, RND-002

**차단 요소(Blocker)**
- Runtime Contract / Registry / Loader 미구현 → SYS-001~006, TRJ-003, DS-006의 Contract 경유 이동은 Contract 계층 선행 필요 (SPS §15/§16)

---

## 부록 A. 최종 산출 요약 (Guide 최종 출력 항목)

**Application 책임 요약**
Boot·Provider 결선, `appMode`/`ballsState`/`dragState` 등 Runtime State, thin event dispatch, 화면 구성 — App 유지.

**Runtime 책임 요약**
현재 App은 Runtime Orchestrator를 넘어 Flow·Domain·Renderer·Search·Dataset·System을 직접 수행. Contract/Registry/Loader 부재로 System 접근이 직접 결합.

**Domain 후보 목록**
`domain/calculator`(CAL-001~006, MISC-004), `domain/trajectory`(TRJ-001/003), `domain/ai`·`domain/lesson`(AI-001~003), `domain/dataset`(DS-001/004/006, MISC-002), `domain/history`(DS-005).

**App에 남아야 하는 책임**
APP-002/006/007/012/014~016, MISC-001/005, RND-001, 오버레이 entry routing(thin).

**App에서 제거 가능한 책임**
순수 함수(P2), Flow(P3: SRCH-*, DS-002/003, OVL-004), System-specific(P4: SYS-003~006, CAL-001/002), Renderer(P5: TRJ-002, RND-002~004).

**위험 요소**
5½ 계산 값·Search 결과·Dataset 경로/스키마·Trajectory 시각 출력 불변 보장 필요. Contract 미구현이 System 추출의 선행 blocker.

**다음 Phase 권장 (App Responsibility Classification)**
1) 이 Inventory 검토·확정 → 2) `App_Migration_Map.md`(항목별 Phase P0~P6·Target 파일) 작성 → 3) `System_Specific_Extraction_Report.md`·`Profile_Logic_Extraction_Report.md`로 5½ 분기의 profile/logic/anchors/system_meta 귀속 결정 → 4) `App_Final_Target_Structure.md`로 목표 App 형태 정의. 코드 이동은 **Runtime Contract/Registry/Loader 골격 선행** 후 P1(wrapper)부터 착수 권장.

---

End of Inventory (Phase 1 / P0 Document Only)
