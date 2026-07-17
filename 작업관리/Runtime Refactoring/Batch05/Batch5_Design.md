# Batch5_Design.md

```
Document  : Batch5_Design.md
Version   : v1.0
Status    : Design Frozen (Implementation Ready)
Date      : 2026-07-08
Baseline  : batch4-runtime-baseline (App.jsx 5,640 lines)
Basis     : Batch5_Analysis.md v1.1 (Frozen SSOT)
Standard  : Architecture_Constitution v2.1 + App_Migration_Map.md
Rule      : Batch5_Analysis.md v1.1 Frozen — 본 문서만 Design SSOT.
            Architecture Decision Frozen — ADR/STEP/Regression/AC 변경 금지.
            Contract 구현 금지 (Batch 6).
```

## Revision History

| Version | 변경 내용 | 날짜 |
|---------|----------|------|
| v0.1 | 초안 — AD-B5-01~11, STEP 5-1~5-8, Regression, AC, Debt, §11 Invariants, §12 Dependency Graph | 2026-07-08 |
| **v1.0** | **Design Freeze** — ADR Lifecycle, Decision Freeze Policy, Dependency Violation Rule, Status → Design Frozen (Implementation Ready) | 2026-07-08 |

---

## 0. 목적 및 범위

### 0.1 문서 목적

`Batch5_Analysis.md v1.1` (Frozen)에서 식별한 이동 경계·Lifecycle·Pipeline을 **Architecture Decision으로 확정**하고, Cursor Agent가 STEP 5-1부터 구현할 수 있는 **Implementation Ready Design SSOT**를 제공한다.

### 0.2 Batch 5 범위

| Migration ID | Design 확정 대상 |
|-------------|-----------------|
| TRJ-001 | `domain/trajectory/trajectoryBuilder.ts` |
| TRJ-003 | `domain/trajectory/reflectionPolicy.ts` |
| RND-003 | `renderer/trajectory/baselineHandleModel.ts` |
| APP-009 | Overlay State + Domain Geometry + Application Flow (A/B/C) |

### 0.3 Batch 5 제외 (명시적)

| 항목 | 이유 |
|------|------|
| CAL-002/003/005, MISC-004 | Batch 4 Frozen |
| TRJ-002, RND-002, RND-004 | Batch 2 완료 |
| Runtime Contract 구현 | Batch 6 Blocker |
| SYS-001~006, DS-006 | Batch 6 |
| Batch5_Analysis.md 수정 | Frozen |

---

## 1. Architecture Decisions (ADR)

> **원칙:** Decision → Runtime Structure.  
> 아래 ADR이 §5 Target Structure·§4 STEP Sequence를 결정한다.

---

### AD-B5-01 — Trajectory Runtime Ownership

| 항목 | 내용 |
|------|------|
| **Decision** | Trajectory **path 생성**은 **Domain Runtime** 단독 소유. `domain/trajectory/trajectoryBuilder.ts`가 Calculation SSOT. App.jsx는 `buildTrajectory()` **호출·결과 배선**만. Renderer는 **표시 모델**만. Presentation은 **JSX mount**만. |
| **Background** | App.jsx render body ~740 lines에서 anchors→rail→C2→pathNodes→cap→curve inline 실행. Constitution 14 위반. |
| **Reason** | ADR-003 (생성=Domain, 표시=Renderer). Batch 1~4에서 Calculation·Flow·ViewModel 분리 패턴 확립. Trajectory는 Batch 5 최고위험 잔존 블록. |
| **Alternatives Considered** | **(A)** Renderer가 path 생성까지 담당 → R-DOM-2/R-RND-1 위반, 기각. **(B)** Application Flow가 build → R-FLOW-1 위반(계산 금지), 기각. **(C)** App util로 이동 → ADR-001 위반, 기각. |
| **Impact** | `domain/trajectory/` 신규. App render body trajectory inline 제거(STEP 5-8). `useTrajectoryState`는 Application Runtime State로 **유지**. |
| **Related Migration ID** | TRJ-001 |
| **Constitution Reference** | Constitution 5, 14 · §12 Runtime Ownership · ADR-003 · R-DOM-2 |

---

### AD-B5-02 — TrajectoryBuildResult (Result Object)

| 항목 | 내용 |
|------|------|
| **Decision** | `buildTrajectory(input)`는 **단일 반환 객체 `TrajectoryBuildResult`** 를 Domain SSOT output으로 확정. Renderer Runtime의 **단일 Domain 입력**. App.jsx는 Result → Renderer builders → Presentation prop **배선만**. |
| **Background** | 현재 trajectory 출력이 App local variables (`cushionPath`, `capCorrected`, `impactRaw`, handle refs 등)로 분산. Q11 Analysis 식별. |
| **Reason** | Domain→Renderer 경계 명확화. `derivedRef` freeze는 Application orchestration으로 Result **외부** 유지. 회귀 snapshot 단위화. |
| **Alternatives Considered** | **(A)** corrected/baseline 별도 함수 2개 → 호출 순서·공유 input 중복, 기각. **(B)** App이 partial result 조립 → Orchestrator 계산 역류, 기각. **(C)** Result 없이 Renderer가 Domain 직접 다중 호출 → coupling 증가, 기각. |
| **Impact** | `TrajectoryBuildInput` / `TrajectoryBuildResult` type Design SSOT (§3). `trajectoryRenderModel`, `baselineHandleModel`, label wiring 입력 통일. |
| **Related Migration ID** | TRJ-001, RND-003 |
| **Constitution Reference** | §11 ViewModel Rule (Renderer는 Result **소비**) · R-DOM-2 · R-RND-1 |

**`TrajectoryBuildResult` 구조 (Design SSOT):**

```text
TrajectoryBuildResult
├── corrected
│   ├── pathNodes          PathPoint[7] chain (CO..C6 rail nodes)
│   ├── cushionPath        cap-applied corrected path (Rg)
│   ├── cushionPathForRender  curve-deformed path (Rg)
│   ├── cap                TrajectoryDisplayCap
│   ├── coLine             CO_path0 (Rg)
│   ├── c1Line             C1_rail (Rg)
│   └── useCurveDeform     boolean
├── baseline               null | BaselinePathBundle
│   ├── pathNodes
│   ├── cushionPath        cushionPathBaselineRg equivalent
│   └── cap
├── impact
│   ├── raw                impact calculation raw
│   └── contactRg          impactContactRg (curve anchor)
├── handles
│   ├── coRg               baseline CO handle (computed, pre-draft)
│   └── c1Rg               baseline C1 handle (computed, pre-draft)
├── labels
│   └── anchorSources      trajectory-derived label anchor map (allAnchors input)
└── meta
    ├── trackForAnchors
    └── systemIdForGrid
```

**Draft overlay 규칙:** `baselineDraftState`의 coRg/c1Rg overlay는 **Builder input**으로 주입. Result `handles`는 computed SSOT; effective path for render는 Renderer 또는 App flag layer에서 draft merge (§3.2).

---

### AD-B5-03 — Reflection Policy Separation

| 항목 | 내용 |
|------|------|
| **Decision** | C2 reflection + safety guard는 **`domain/trajectory/reflectionPolicy.ts`** 로 분리. `reflectionEngine.computeReflectionC2`는 **내부 delegate**. Builder는 Policy API만 호출. `profile.safety` read는 Policy **내부 interim** (D-009 Open). |
| **Background** | TRJ-003: `m_min`/`theta_t_max`가 App.jsx diagnostic block에만 존재. Engine SSOT 밖 orphan guard. |
| **Reason** | Reflection safety는 Trajectory Domain 규칙. Contract(Batch 6) 전까지 Policy가 safety param injection seam 제공 (Batch 4 AD-B4-01 co-location 패턴 analog). |
| **Alternatives Considered** | **(A)** safety를 App에 유지 → TRJ-003 미이전, 기각. **(B)** reflectionEngine에 safety merge → Engine 범용성 훼손, Policy wrapper 채택. **(C)** Batch 6까지 defer → guard SSOT 분산 지속, 기각. |
| **Impact** | `resolveReflectionC2(input, safetyParams)` Policy SSOT. App C2 diagnostic IIFE 제거. DEV diagnostics Policy 내부로 optional 이동. |
| **Related Migration ID** | TRJ-003 |
| **Constitution Reference** | Constitution 11 (system-specific rule → System/Domain) · R-SYS-2 (interim) · ADR-006 (Batch 6 Contract) · D-009 |

**Interim Safety Input (Batch 5):**

```text
ReflectionSafetyParams { m_min: number; theta_t_max: number }
  ← Builder가 SYSTEM_PROFILES[systemId]?.safety 에서 read (D-006 passthrough)
  → Batch 6: Trajectory Runtime Contract replace
```

---

### AD-B5-04 — Baseline Draft Capability Split (APP-009 A/B/C)

| 항목 | 내용 |
|------|------|
| **Decision** | APP-009를 **3 Capability**로 분리. **A:** Overlay State (`useBaselineDraft`) · **B:** Domain Geometry (`baselineHandleGeometry.ts`) · **C:** Application Flow (`baselineDraftApplyFlow.ts`). 각 Capability 단일 Owner (ADR-007). |
| **Background** | App.jsx에 state + inverse geometry + Apply chain + pointer handlers 혼재. Analysis APP-009-A/B/C 식별. |
| **Reason** | Overlay State는 React lifecycle. Geometry는 pure calculation. Apply는 multi-step orchestration. 분리 없이 이동 시 Architecture Drift. |
| **Alternatives Considered** | **(A)** 전부 Overlay → Domain calc in Overlay (R-OVL-2 위반), 기각. **(B)** 전부 App 유지 → APP-009 미이전, 기각. **(C)** A+B hook 하나, C App inline → Flow 미분리, 기각. |
| **Impact** | 3 files + STEP 5-5A/5-5B/5-7B. Pointer handlers → `useBaselineDraft` 내부. `buildBaselineDraftApplyDelta` 기존 Domain 유지. |
| **Related Migration ID** | APP-009, RND-003 |
| **Constitution Reference** | ADR-007 · R-OVL-1 · R-FLOW-1 · R-DOM-1 |

| Capability | Owner | Authority | Target |
|-----------|-------|-----------|--------|
| APP-009-A | Overlay | Runtime State + Interaction | `overlay/state/baselineDraftState.ts` |
| APP-009-B | Domain | Calculation | `domain/trajectory/baselineHandleGeometry.ts` |
| APP-009-C | Application Flow | Application Flow | `application/flows/baselineDraftApplyFlow.ts` |

---

### AD-B5-05 — Trajectory Runtime Contract Reserved (Batch 6)

| 항목 | 내용 |
|------|------|
| **Decision** | Batch 5에서 **Trajectory Runtime Contract 미구현**. Design·Analysis에 **Reserved Layer** 자리만 확보. Builder/Policy는 **interim flat params** 사용. Batch 6에서 Contract API로 **Implementation Replace**. |
| **Background** | ADR-006: TRJ-003, RND-004는 Contract 선행. Batch 5 scope는 Contract 없이 진행해야 Batch 순서 유지. |
| **Reason** | Contract Blocker로 Batch 5 defer 시 Trajectory inline App 잔존 지속. Interim injection은 Batch 4 D-006/D-008 precedent. |
| **Alternatives Considered** | **(A)** Batch 6 선행 → Migration Map 순서 위반, 기각. **(B)** Contract stub file 생성 → Implementation 없는 dead code, Analysis "파일 생성 안 함" 원칙, 기각. **(C)** safety default hardcode → system drift, interim read 채택. |
| **Impact** | D-006/D-009 Open 유지. Batch 6: `runtime/contract/trajectoryContract.ts` 신규 시 Policy/Builder supply 교체만. |
| **Related Migration ID** | TRJ-003, (Batch 6) SYS-001/002 |
| **Constitution Reference** | ADR-006 · §13 SSOT File Map · Migration Debt Governance §14 |

**Reserved Layer (Design notation only):**

```text
Domain Trajectory Runtime
        ↓
Trajectory Runtime Contract  ← Reserved (Batch 6)
        ↓
Renderer Runtime
```

---

### AD-B5-06 — buildTrajectory Single Entry API

| 항목 | 내용 |
|------|------|
| **Decision** | Trajectory path는 **`buildTrajectory(input: TrajectoryBuildInput): TrajectoryBuildResult` 단일 public API**. corrected + baseline **동시** build. 내부 helper: `pathNodeHelpers.ts`, Policy call. |
| **Background** | Q1 Analysis: 단일 vs 분리 검토. |
| **Reason** | corrected/baseline share anchors prep, reflection, resolveAnchorCtx. 단일 call = atomic snapshot for regression. |
| **Alternatives Considered** | `buildCorrectedTrajectory` + `buildBaselineTrajectory` 분리 → shared prep duplication, 기각. |
| **Impact** | STEP 5-3(corrected path in builder) + 5-4(baseline branch) = **same file sequential**, not separate public APIs. |
| **Related Migration ID** | TRJ-001 |
| **Constitution Reference** | R-DOM-2 · SSOT principle |

---

### AD-B5-07 — trajectoryHydrateFlow Extraction

| 항목 | 내용 |
|------|------|
| **Decision** | `syncSlotRuntimeAdminAndTrajectory` → **`application/flows/trajectoryHydrateFlow.ts`** (`runTrajectoryHydrate(ctx)`). Flow는 slot payload read → adminState write sequence → trajectory phase update **orchestration**만. |
| **Background** | Q5 Analysis. Lifecycle Hydrate/Rebuild phase. OPEN-05 recall rehydration coupling. |
| **Reason** | Batch 3 Flow pattern (AD-B3-01/02). App handler thin dispatch. |
| **Alternatives Considered** | App inline 유지 → orchestration App 비대, 기각. recallHydrateFlow merge → recall=admin sys, trajectory=phase 분리 유지, 별도 Flow 채택. |
| **Impact** | STEP 5-7A. `hydrateSlotRuntime`, recall success paths → Flow call. |
| **Related Migration ID** | (Flow adjunct TRJ-001 hydrate) |
| **Constitution Reference** | §2.6 Application Flow · R-FLOW-1 · Constitution 6 |

---

### AD-B5-08 — baselineDraftApplyFlow

| 항목 | 내용 |
|------|------|
| **Decision** | Baseline draft Apply chain → **`application/flows/baselineDraftApplyFlow.ts`** (`runBaselineDraftApply(ctx)`). Domain: `buildBaselineDraftApplyDelta`, `baselineSysFromHandleRg`. Flow: validate → delta → slot commit dispatch → hydrate trigger. |
| **Background** | Q4 Analysis. APP-009-C. |
| **Reason** | Apply = multi-step (activeMark guard, overlay guard, merge delta, commitDraftSys). Flow Owner 명확. |
| **Alternatives Considered** | App `handleBaselineDraftDoubleClick` 유지 → APP-009 incomplete, 기각. |
| **Impact** | STEP 5-7B (5-7과 같은 Phase, 독립 commit). |
| **Related Migration ID** | APP-009-C |
| **Constitution Reference** | R-FLOW-1 · AD-B5-04 |

---

### AD-B5-09 — Path Attr String Owner (Renderer)

| 항목 | 내용 |
|------|------|
| **Decision** | SVG `cushionPathAttr` / `cushionPathAttrBase` px string 생성은 **`renderer/trajectory/trajectoryPathAttrModel.ts`** (신규, RND-003 adjunct). Pure: Rg PathPoint[] + scale/padding → attr string. |
| **Background** | Q6 Analysis. 현재 App render body `toPx` loop. |
| **Reason** | px 변환 = 표시 모델 (Renderer Authority). Domain Result는 **Rg coordinates only**. |
| **Alternatives Considered** | App wiring 유지 → Presentation calc, 기각. Domain Result에 attr string → Domain이 px 알면 R-RND-1 위반, 기각. |
| **Impact** | STEP 5-6 adjunct (same commit or 5-6 follow-up). `derivedRef.cushionPathAttr` freeze input = Renderer output. |
| **Related Migration ID** | RND-003 (adjunct), TRJ-001 |
| **Constitution Reference** | R-RND-1 · Constitution 7 |

---

### AD-B5-10 — useTrajectoryState App Retention

| 항목 | 내용 |
|------|------|
| **Decision** | `hooks/useTrajectoryState.ts` **App Layer 유지**. 이동·Domain화 금지. Phase state (IDLE/ADJUSTING/APPLIED) = Application Runtime State. |
| **Background** | Q8 Analysis Closed. |
| **Reason** | React hook + phase = Orchestrator concern. Path data는 `TrajectoryBuildResult` (Domain). |
| **Alternatives Considered** | Domain trajectoryPhase module → React 의존 Domain, 기각. |
| **Impact** | None (no migration). trajectoryHydrateFlow가 hook methods 호출. |
| **Related Migration ID** | — (explicit non-move) |
| **Constitution Reference** | R-APP-1 · Constitution 3.1 |

---

### AD-B5-11 — Baseline Handle Render Component Boundary

| 항목 | 내용 |
|------|------|
| **Decision** | RND-003: `buildBaselineHandles()` → render model (positions, visibility, opacity). JSX `<circle>`는 **App tableSVG 또는 `components/table/BaselineHandleLayer.jsx`** (Presentation). **5½/B2T guard는 render model `visible` flag**로 encapsulate (D-010 interim). |
| **Background** | Q7 Analysis. |
| **Reason** | Renderer = model only (Batch 2 TRJ-002 precedent). systemId guard in JSX → model `visible: false`. |
| **Alternatives Considered** | JSX in `baselineHandleModel.ts` → Renderer가 React component, Layer 혼재, 기각. |
| **Impact** | STEP 5-6. Optional thin Presentation component Batch 5 또는 App inline mount (Implementation choice, behavior invariant). |
| **Related Migration ID** | RND-003 |
| **Constitution Reference** | R-RND-1 · R-OVL-2 · Constitution 3 (interim system guard — D-010) |

---

## 2. Design Resolution — Analysis Open Questions

| ID | Analysis Status | **Design Resolution** | ADR |
|----|----------------|----------------------|-----|
| Q1 | Open | Single `buildTrajectory()` | AD-B5-06 |
| Q2 | Open | Policy interim safety injection | AD-B5-03, AD-B5-05 |
| Q3 | Open | `overlay/state/baselineDraftState.ts` | AD-B5-04 |
| Q4 | Open | `baselineDraftApplyFlow.ts` 신설 | AD-B5-08 |
| Q5 | Open | `trajectoryHydrateFlow.ts` 포함 | AD-B5-07 |
| Q6 | Open | `trajectoryPathAttrModel.ts` (Renderer) | AD-B5-09 |
| Q7 | Open | Model + Presentation mount split | AD-B5-11 |
| Q8 | Closed | useTrajectoryState App 유지 | AD-B5-10 |
| Q9 | Closed | Migration Map 정본 | — |
| Q10 | Closed | STEP 5-5A/5-5B 분리 | AD-B5-04 |
| Q11 | Open | TrajectoryBuildResult 확정 | AD-B5-02 |

---

## 3. Runtime Contracts (Design SSOT — Types Only)

> Implementation 파일 생성 전 **interface contract** 확정. Code 이동은 STEP에서.

### 3.1 TrajectoryBuildInput (Builder)

```text
TrajectoryBuildInput
├── anchors / anchorsBase        (from buildRgAnchors — RND-004)
├── rawAnchors / rawAnchorsBase
├── resolveAnchorCtx             { track, systemId }
├── balls / targetColor / secondBall context
├── slotRenderSys / corrections  (Batch 4 SSOT consume)
├── adminState slices            hpt, str (tip for reflection)
├── c2ManualHint                 optional
├── safetyParams                 ReflectionSafetyParams (interim)
├── hitTolerance                 HIT_TOLERANCE
├── draftOverlay                 optional { coRg?, c1Rg? }  ← APP-009-A input
└── profileForCanonical            interim (RND-004 / D-006)
```

### 3.2 Draft Overlay vs Result Handles

| Data | Owner | Rule |
|------|-------|------|
| `handles.coRg/c1Rg` in Result | Domain Builder | computed from baseline path |
| `draftOverlay.coRg/c1Rg` | Overlay State | user drag |
| Effective render path | App or Renderer flag layer | merge draft over baseline path nodes [0],[1] — **behavior invariant** |

---

## 4. Migration Sequence (STEP Lock)

| STEP | Commit Title (pattern) | Target | Rollback |
|------|----------------------|--------|----------|
| **5-1** | `feat(batch5): STEP 5-1 path node helpers (TRJ-001)` | `domain/trajectory/pathNodeHelpers.ts` | ✅ Independent |
| **5-2** | `feat(batch5): STEP 5-2 reflection policy (TRJ-003)` | `domain/trajectory/reflectionPolicy.ts` | ✅ Independent |
| **5-3** | `feat(batch5): STEP 5-3 trajectory builder corrected (TRJ-001)` | `trajectoryBuilder.ts` corrected | ✅ Independent |
| **5-4** | `feat(batch5): STEP 5-4 trajectory builder baseline (TRJ-001)` | baseline branch | ✅ Same file |
| **5-5A** | `feat(batch5): STEP 5-5A baseline draft state (APP-009-A)` | `overlay/state/baselineDraftState.ts` | ✅ Independent |
| **5-5B** | `feat(batch5): STEP 5-5B baseline handle geometry (APP-009-B)` | `baselineHandleGeometry.ts` | ✅ Independent |
| **5-6** | `feat(batch5): STEP 5-6 baseline handle model (RND-003)` | `baselineHandleModel.ts` + `trajectoryPathAttrModel.ts` | ✅ Independent |
| **5-7A** | `feat(batch5): STEP 5-7A trajectory hydrate flow` | `trajectoryHydrateFlow.ts` | ✅ Independent |
| **5-7B** | `feat(batch5): STEP 5-7B baseline draft apply flow` | `baselineDraftApplyFlow.ts` | ✅ Independent |
| **5-8** | `feat(batch5): STEP 5-8 App trajectory wiring` | App inline removal + integration | ⚠️ Integration gate |

**STEP Lock Rule:** build PASS → STEP Regression PASS → Import Graph PASS → commit → next.

**Topological Order:** `5-1 → 5-2 → 5-3 → 5-4 → [5-5A ∥ 5-5B] → 5-6 → [5-7A ∥ 5-7B] → 5-8`

---

## 5. Target Runtime Structure

> **AD-B5-01~11 Decision 결과.**

```text
App.jsx                          Orchestrator (buildTrajectory call, Flow dispatch)
  ↓
application/flows/
  ├── trajectoryHydrateFlow.ts       AD-B5-07
  └── baselineDraftApplyFlow.ts      AD-B5-08
  ↓
domain/trajectory/
  ├── trajectoryBuilder.ts           AD-B5-01, AD-B5-02, AD-B5-06  ← Trajectory Runtime SSOT
  ├── reflectionPolicy.ts            AD-B5-03
  ├── pathNodeHelpers.ts
  └── baselineHandleGeometry.ts      AD-B5-04-B
  ↓
[Trajectory Runtime Contract]        AD-B5-05 Reserved — Batch 6
  ↓
overlay/state/baselineDraftState.ts  AD-B5-04-A
  ↓
renderer/trajectory/
  ├── trajectoryRenderModel.ts       (existing TRJ-002)
  ├── anchorConversionModel.ts       (existing RND-004)
  ├── baselineHandleModel.ts         AD-B5-11
  └── trajectoryPathAttrModel.ts     AD-B5-09
  ↓
Presentation (ImpactLines, handle JSX, labels)
```

---

## 6. Flow Context Design

### 6.1 TrajectoryHydrateFlowContext (AD-B3-02 Hybrid)

```text
READ:  slotId, slots, buildSlotRuntimePayload, getAdminSearchTargetBall (ADMIN)
WRITE: setAdminState, trajectory.setAdjusting, trajectory.applySysResult, trajectory.resetTrajectory
GUARD: adminSysShallowEqual (existing)
```

### 6.2 BaselineDraftApplyFlowContext

```text
READ:  baselineDraftState, showBaseLine, appMode, overlayState, slot snapshot, track, systemId
WRITE: setBaselineDraftState (clear mark), actions.commitDraftSys (or equivalent slot dispatch)
DOMAIN: buildBaselineDraftApplyDelta, baselineSysFromHandleRg (via geometry module)
ACTION: runTrajectoryHydrate after commit (optional chain — behavior invariant)
```

---

## 7. Regression Strategy

### 7.1 Common (R-B5-C)

| ID | 항목 |
|----|------|
| R-B5-C1 | npm run build exit 0 |
| R-B5-C2 | Import Graph 순환/역방향 0 |
| R-B5-C3 | Trajectory corrected path 시각 불변 (ADMIN) |
| R-B5-C4 | Trajectory baseline path 시각 불변 (ADMIN Base Line ON) |
| R-B5-C5 | USER baseline/corrected toggle + display cap |
| R-B5-C6 | C2 reflection fallback (no stored C2) |
| R-B5-C7 | Baseline handle drag + Apply → slot SYS 반영 |
| R-B5-C8 | LocalDB/Recall hydrate → trajectory phase (OPEN-05 관찰) |
| R-B5-C9 | Ball drag freeze (derivedRef) — cushion path freeze |
| R-B5-C10 | Domain → Presentation 역참조 0 |

### 7.2 STEP Regression IDs

| STEP | IDs |
|------|-----|
| 5-1 | R-B5-1-1 rail hit snapshot |
| 5-2 | R-B5-2-1 C2 reflection snapshot |
| 5-3 | R-B5-3-1 corrected full path |
| 5-4 | R-B5-4-1 baseline path + cap |
| 5-5A | R-B5-5A-1 draft lifecycle |
| 5-5B | R-B5-5B-1 Rg↔SYS roundtrip |
| 5-6 | R-B5-6-1 handle visibility |
| 5-7A | R-B5-7A-1 slot switch phase |
| 5-7B | R-B5-7B-1 apply → slot SYS |
| 5-8 | R-B5-C full suite |

---

## 8. Acceptance Criteria (AC-1 ~ AC-16)

| AC | 항목 |
|----|------|
| AC-1 | npm run build PASS |
| AC-2 | Import Graph PASS |
| AC-3 | App trajectory inline calc 0 |
| AC-4 | trajectoryBuilder.ts TRJ-001 SSOT |
| AC-5 | reflectionPolicy.ts TRJ-003 SSOT |
| AC-6 | baselineHandleModel.ts RND-003 |
| AC-7 | APP-009 A/B/C 분리 |
| AC-8 | Batch 4 bypass 0 |
| AC-9 | R-B5-C PASS |
| AC-10 | STEP Lock 10 commits (5-1~5-8 incl 5-7A/B) |
| AC-11 | Named Export Only |
| AC-12 | TrajectoryBuildResult single Renderer input |
| AC-13 | Contract Reserved — no runtime/contract file |
| AC-14 | AD-B5-01~11 documented |
| AC-15 | Batch5_Design.md + Batch5_Analysis v1.1 Frozen |
| AC-16 | App.jsx −500 lines minimum (stretch −600) |

---

## 9. Migration Debt & Cleanup

| ID | 항목 | Batch 5 | Target |
|----|------|---------|--------|
| D-006 | SYSTEM_PROFILES direct | Open — interim | Batch 6 |
| D-007 | getAnchorsForSystem direct | Open — interim | Batch 6 |
| **D-009** | TRJ-003 safety direct read | Open — Policy interim | Batch 6 |
| **D-010** | 5_half/B2T guard in handle model | Open — visible flag | Batch 6 SYS-003 |
| CL-006 | trajectoryPathDisplayPolicy rehome | Optional Batch 5 cleanup | Unscheduled |
| CL-007 | spinPath dead code App | Optional | Batch 5+ |

---

## 10. Design Completeness Checklist

| # | Item | Status |
|---|------|--------|
| 1 | AD-B5-01~11 Accepted | ✅ |
| 2 | Q1~Q11 Resolved | ✅ |
| 3 | TrajectoryBuildResult structure | ✅ |
| 4 | STEP 5-1~5-8 sequence | ✅ |
| 5 | Flow Context interfaces | ✅ |
| 6 | Regression / AC | ✅ |
| 7 | Rollback per STEP | ✅ |
| 8 | Contract Reserved | ✅ |
| 9 | Batch 4 non-regression | ✅ |
| 10 | Design Review Approval | ✅ (Design Freeze) |

---

## 11. Architecture Invariants

### 11.0 목적

Implementation 동안 **절대 위반 금지** Architecture Rule. ADR보다 **상위**. 모든 STEP은 Invariant 만족 후 commit.

**위계:**

```text
Architecture Constitution v2.1
        ↓
Architecture Invariants (본 Section)
        ↓
Architecture Decisions (AD-B5-01~11)
        ↓
Migration STEP (5-1~5-8)
        ↓
Implementation
```

---

### INV-B5-01 — Trajectory 생성은 Domain Runtime Only

| 항목 | 내용 |
|------|------|
| **Rule** | Trajectory path node, reflection node, cushion path, curve segment, baseline path **생성**은 **Domain Runtime only**. App / Renderer / Application Flow는 Trajectory **계산 금지**. |
| **Related ADR** | AD-B5-01, AD-B5-06 |
| **Related Constitution** | Constitution 5, 14 · §12 Runtime Ownership · R-DOM-2 |
| **Related Migration ID** | TRJ-001 |

---

### INV-B5-02 — Renderer는 Display Model Only

| 항목 | 내용 |
|------|------|
| **Rule** | Renderer는 **계산 금지**. 허용: Display Model, SVG render model, **px conversion**, Visibility flag, Label Strategy selection. Domain path/reflection/geometry **재실행 금지**. |
| **Related ADR** | AD-B5-02, AD-B5-09, AD-B5-11 |
| **Related Constitution** | Constitution 7 · §12 Renderer Ownership · R-RND-1 · ADR-003 |
| **Related Migration ID** | RND-003, TRJ-002 (기존) |

---

### INV-B5-03 — Application은 Orchestrator Only

| 항목 | 내용 |
|------|------|
| **Rule** | App.jsx는 **Orchestrator only**. 허용: Domain `buildTrajectory()` **호출**, Application Flow **dispatch**, Presentation **wiring**, Runtime State 보유. Trajectory inline build / formula / reflection **금지**. |
| **Related ADR** | AD-B5-01, AD-B5-07, AD-B5-10 |
| **Related Constitution** | Constitution 1, 2, 3 · §3.1 App Orchestrator · R-APP-1~4 |
| **Related Migration ID** | APP-009 (orchestration), TRJ-001 (제거 대상) |

---

### INV-B5-04 — Application Flow는 Sequencing Only

| 항목 | 내용 |
|------|------|
| **Rule** | Flow는 **sequencing / hydrate / context assembly only**. Flow는 계산, reflection, trajectory build, baseline geometry **수행 금지**. Domain·Geometry module **호출**만 허용. |
| **Related ADR** | AD-B5-07, AD-B5-08 |
| **Related Constitution** | §2.6 Application Flow Layer · R-FLOW-1 · Constitution 6 |
| **Related Migration ID** | APP-009-C, (Flow adjunct hydrate) |

---

### INV-B5-05 — Reflection은 reflectionPolicy.ts 경유 Only

| 항목 | 내용 |
|------|------|
| **Rule** | C2 reflection + safety guard 진입점은 **`reflectionPolicy.ts` SSOT only**. `reflectionEngine.ts`는 **Engine delegate**. App / Builder / Flow에서 `computeReflectionC2` **직접 호출 금지** (Policy 경유). |
| **Related ADR** | AD-B5-03, AD-B5-05 |
| **Related Constitution** | Constitution 11 · R-DOM-2 · R-SYS-2 (interim) |
| **Related Migration ID** | TRJ-003 |

---

### INV-B5-06 — TrajectoryBuildResult는 Renderer의 유일한 Domain Input

| 항목 | 내용 |
|------|------|
| **Rule** | Renderer Runtime의 **Domain-side 입력**은 **`TrajectoryBuildResult` 단일 객체** only. Renderer는 Domain API **추가 호출 금지**. *(Note: `buildRgAnchors`는 Builder **입력 준비** — App/Builder assembly. Renderer post-Result 재호출 금지.)* |
| **Related ADR** | AD-B5-02, AD-B5-09 |
| **Related Constitution** | §11 ViewModel Rule · R-RND-1 · R-DOM-4 |
| **Related Migration ID** | TRJ-001, RND-003 |

---

### INV-B5-07 — Trajectory Runtime Contract는 Batch 5 Reserved Only

| 항목 | 내용 |
|------|------|
| **Rule** | `runtime/contract/trajectoryContract.ts` 및 Registry/Loader Contract wiring **Batch 5 생성·구현 금지**. Batch 5는 interim flat params (D-006/D-009). Contract **Batch 6에서만** 구현·교체. |
| **Related ADR** | AD-B5-05 |
| **Related Constitution** | ADR-006 · §14 Migration Debt Governance · Part D Checklist #7 |
| **Related Migration ID** | TRJ-003, (Batch 6) SYS-001/002 |

---

### 11.1 Invariant Violation = STEP Reject

| Violation | Action |
|-----------|--------|
| Any INV-B5-0x in STEP diff | **Commit reject** — STEP rollback |
| Invariant vs ADR conflict discovered | **ADR revise** (Design unfreeze) before continue |
| Invariant vs Constitution conflict | **Constitution wins** — halt |

---

## 12. ADR Dependency Graph

### 12.0 목적

ADR 간 **선행·의존·STEP 연결** 시각화. 순환 참조 금지.

### 12.1 Dependency Rule

```text
ADR          = Architecture Decision (what/why)
     ↓ must satisfy
Invariant    = non-negotiable guard (INV-B5-0x)
     ↓ implemented by
STEP         = move-only implementation unit
     ↓ produces
Implementation = code + regression PASS
```

- STEP는 ADR의 **구현**이다.
- ADR는 Invariant를 **위반할 수 없다**.
- STEP 순서는 Dependency Graph **위상 정렬**을 따른다.

---

### 12.2 Graph — Core Trajectory Chain

```text
                    Constitution v2.1
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      INV-B5-01       INV-B5-05       INV-B5-07
           │               │               │
           ▼               ▼               │
      AD-B5-01 ◄──────────────────────────┘
   Trajectory Runtime Ownership
           │
           ├──────────────────────┐
           ▼                      ▼
      AD-B5-02               AD-B5-03
  TrajectoryBuildResult    Reflection Policy
           │                      │
           ▼                      ▼
      AD-B5-06               AD-B5-05
   Single Entry API      Contract Reserved
           │                      │
           ├──────────┬───────────┘
           ▼          ▼
       STEP 5-1   STEP 5-2
    pathNodeHelpers  reflectionPolicy
           │          │
           └────┬─────┘
                ▼
            STEP 5-3
      trajectoryBuilder (corrected)
                │
                ▼
            STEP 5-4
      trajectoryBuilder (baseline)
```

---

### 12.3 Graph — APP-009 / Renderer Chain

```text
      AD-B5-04
 APP-009 Capability Split (A/B/C)
           │
     ┌─────┴─────┬─────────────┐
     ▼           ▼             ▼
 AD-B5-08    AD-B5-11      (A: State)
Apply Flow   Handle Render
     │           │          Boundary
     │           ├──────────► AD-B5-09
     │           │         Path Attr Owner
     │           │
     ▼           ▼
 STEP 5-7B   STEP 5-6
applyFlow    handleModel
             + pathAttrModel
     │
     ▼
 STEP 5-5A ──► STEP 5-5B
 draftState    handleGeometry
 (parallel OK after 5-4)
```

---

### 12.4 Graph — Hydrate / Integration Chain

```text
      AD-B5-07                    AD-B5-10
 trajectoryHydrateFlow      useTrajectoryState Retain
           │                         │
           ▼                         │
       STEP 5-7A                     │
     trajectoryHydrate               │
           │                         │
           └──────────┬─────────────┘
                      ▼
                  STEP 5-8
            App wiring + inline removal
           (depends on ALL prior STEPs)
```

---

### 12.5 ADR → STEP Mapping Table

| ADR | Depends On | STEP | Invariants |
|-----|-----------|------|------------|
| AD-B5-01 | — | 5-3, 5-4, 5-8 | INV-01, 03 |
| AD-B5-02 | AD-B5-01 | 5-3 | INV-01, 06 |
| AD-B5-03 | AD-B5-01 | 5-2 | INV-01, 05 |
| AD-B5-04 | AD-B5-01 | 5-5A, 5-5B, 5-7B | INV-03, 04 |
| AD-B5-05 | AD-B5-03 | (none — doc only) | INV-07 |
| AD-B5-06 | AD-B5-02 | 5-3, 5-4 | INV-01 |
| AD-B5-07 | AD-B5-01 | 5-7A | INV-03, 04 |
| AD-B5-08 | AD-B5-04 | 5-7B | INV-04 |
| AD-B5-09 | AD-B5-02 | 5-6 | INV-02, 06 |
| AD-B5-10 | — | 5-8 | INV-03 |
| AD-B5-11 | AD-B5-04 | 5-6 | INV-02 |

---

### 12.6 STEP Topological Order (Canonical)

```text
5-1 → 5-2 → 5-3 → 5-4 → [5-5A ∥ 5-5B] → 5-6 → [5-7A ∥ 5-7B] → 5-8
```

---

### 12.7 Dependency Violation

Dependency Rule 위반은 **Architecture 위반**으로 간주한다.

**Case:**

- 선행 ADR 없이 STEP 구현
- Dependency Graph 역순 구현
- Required Invariant 미충족
- Reserved Contract 선구현
- Topological Order 위반

**Action:**

```text
Implementation Stop
        ↓
Architecture Review Required
        ↓
ADR Revision (Design Unfreeze) 또는 Implementation Rollback
```

**규칙:** Dependency 위반은 Invariant 위반과 **동일 수준**의 Architecture 오류이다.

---

## 13. ADR Status (Lifecycle)

ADR은 다음 Lifecycle을 따른다.

| Status | 의미 |
|--------|------|
| **Proposed** | 초안 작성 상태 |
| **Accepted** | Design Review 승인 완료 |
| **Implemented** | 구현(STEP) 완료 |
| **Superseded** | 이후 Batch ADR로 대체 |

### Batch 5 현재 상태

| ADR | Status |
|-----|--------|
| AD-B5-01 ~ AD-B5-11 | **Accepted** (Design Review 승인 완료) |

**비고:**

- Implementation 완료 시 **Implemented**로 변경한다.
- Batch 6에서 대체되는 ADR(예: AD-B5-05 interim params)은 **Superseded**로 변경한다.

---

## 14. Decision Freeze Policy

Architecture Decision은 다음 상태를 가진다.

```text
Draft
  ↓
Review
  ↓
Accepted
  ↓
Frozen
```

### 규칙

- **Accepted 이후 Architecture Decision 변경 금지**
- 구현 중 발견되는 문제는 ADR 수정이 아니라 **Debt 등록**
- Architecture 수정 필요 시 **Design Freeze 해제** 후 ADR Revision 수행
- STEP 구현은 **Frozen Decision만** 구현 가능

### Batch 5 현재 상태

| 항목 | Status |
|------|--------|
| Batch5_Design.md | **Frozen** (v1.0) |
| AD-B5-01 ~ AD-B5-11 | **Accepted → Frozen** |
| Batch5_Analysis.md v1.1 | **Frozen** (변경 금지) |

---

## 15. Final Report

### Architecture Governance

| 항목 | Status |
|------|--------|
| ADR Lifecycle (§13) | ✅ Complete |
| Decision Freeze Policy (§14) | ✅ Complete |
| Dependency Rule (§12.1) | ✅ Complete |
| Dependency Violation Policy (§12.7) | ✅ Complete |
| Architecture Invariants (§11) | ✅ Complete |

### 판정

| 항목 | Status |
|------|--------|
| **Batch5 Design** | **Architecture Frozen** |
| **Implementation** | **Ready** |

### Implementation 착수 조건

1. `batch4-runtime-baseline` tag 확인
2. STEP 5-1부터 Topological Order 준수
3. 각 STEP: Invariant + Dependency + Regression PASS 후 commit
4. Contract 파일 생성 금지 (INV-B5-07)

---

*End of Batch5_Design.md — Design Frozen v1.0 (Implementation Ready)*
