# APPLICATION_FLOW.md

```text
Document   : APPLICATION_FLOW.md
Type       : Architecture Guide — Runtime Orchestration (Document SSOT)
Version    : v1.0
Status     : Active
Date       : 2026-07-22
Location   : docs/APPLICATION_FLOW.md
Audience   : New developers (≈30 min onboarding)
Rule       : Document actual implementation only · No speculative / unimplemented design
Cite       : Ch.8 L4 · Ch.9 L5 · Ch.10 L6 Runtime Contract · WG-AI-001 ·
             작업관리/3_SYSTEM_ARCHITECTURE.md (legacy calc/data view)
```

---

## 0. Purpose

본 문서는 **Runtime Orchestration의 공식 Architecture Guide**이다.

Runtime / Presentation / Validation 등 **Architecture 관련 구현 전에 가장 먼저 참조**하는 문서이다.  
Fleet Contract Book과 함께 **구현 기준(Reference)**으로 사용한다.

이 문서는 **현재 구현된** Runtime Orchestration을 설명한다.

- 새 기능 설계서가 아니다.
- Fleet Contract Book의 **구현 대응 가이드**이다.
- 추측·미구현(B7 Presentation Contract 본문, B3 Metadata Apply 등)은 **Future Extension**에만 “연결 위치”로 적는다.

**공식 Consume 위치 (Ops Workflow):** Architecture 구현 전  
`APPLICATION_FLOW` → Fleet Book (L4/L5/L6/L7) → MASTER → HANDOFF → Architecture Review → 구현

**관련 SSOT**

| Doc | Role |
|-----|------|
| `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch10_…` | L6 Runtime Contract (Ratified) |
| `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch08_…` | L4 Anchor Contract |
| `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch09_…` | L5 Logic Contract |
| `작업관리/WG-AI-001_…` | Architecture Impact Guideline |
| `작업관리/3_SYSTEM_ARCHITECTURE.md` | 계산·시스템 데이터 계층 (레거시 관점) |
| `작업관리/PROJECT_MASTER_INDEX.md` | Ops SSOT · Architecture Consume Workflow |
| `작업관리/CURSOR_SESSION_HANDOFF.md` | Session checklist · Gate |

---

## 1. 전체 Architecture

현재 앱의 상위 흐름:

```text
┌─────────────────────────────────────────────────────────────┐
│  App.jsx  (Orchestrator / Injection Hub)                    │
│  · UI state · overlay · trajectory build 호출                │
│  · bindDomainContractSupply({… getSystemContract …})         │
└───────────────────────────┬─────────────────────────────────┘
                            │ Public API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Runtime  (frontend/src/runtime/)                           │
│  · Registry  — Sole Cache Owner · getSystemContract()        │
│  · Loader    — Sole Assembler · assembleSystemContract()     │
│  · PackageStore — profile/anchors JSON eager maps (internal) │
│  · Contract  — SystemContract shape + TrajectoryContractView │
└───────────────────────────┬─────────────────────────────────┘
                            │ reads packages
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  System Package  (frontend/src/data/systems/<systemId>/)    │
│  · profile.json · anchors.json · logic.json · system_meta   │
└───────────────────────────┬─────────────────────────────────┘
                            │ slices via App / Domain supply
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain + Presentation (today)                              │
│  · Domain: formula/anchors via runtimeContractSupply         │
│  · Presentation: renderer/* · table components · overlays    │
│  · Trajectory: buildTrajectory → render models → JSX         │
└─────────────────────────────────────────────────────────────┘
```

**한 줄 요약:** App은 Orchestrator이고, System 데이터는 Runtime이 Package에서 Contract로 조립하며, Domain/UI는 Contract 슬라이스만 소비한다.

---

## 2. App.jsx의 역할

경로: `frontend/src/App.jsx`

### 2.1 책임 (Does)

| Responsibility | Implementation cite |
|----------------|---------------------|
| **UI / Workspace orchestration** | slots, overlays, balls, admin/user modes |
| **Runtime Injection Hub** | module-load 시 `bindDomainContractSupply` — Registry → Domain slices |
| **Contract lookup for presentation** | `getSystemContract(systemIdForGrid)` |
| **Trajectory projection** | `extractTrajectoryContractView(contract)` → reflection safety / offset |
| **Wire Domain → Render** | `buildTrajectory` · `buildRgAnchors` · renderer models · table JSX |

App 상단 (모듈 스코프)에서 Domain이 Runtime을 import하지 않도록 **한 번만** supply를 묶는다:

```text
bindDomainContractSupply({
  getFormulaExpr: (id) => getSystemContract(id)?.profile?.formulaExpr ?? null,
  getFormulaHash: resolveFormulaHash,
  getAnchorsData: resolveAnchorsData,
});
```

### 2.2 하지 않는 일 (Does Not)

| Forbidden for App |
|-------------------|
| System JSON을 `data/systems/**`에서 **직접** 읽어 Contract를 조립 |
| `systemPackageStore` / `assembleSystemContract` / `bootstrapRegistry` 직접 호출 |
| Loader/Registry **캐시·조립 책임**을 App에 복제 |
| Domain이 Runtime을 import하도록 강요 (supply 패턴이 이를 차단) |

### 2.3 Runtime와의 관계

```text
App  ──import──►  runtime/index.ts
                    · getSystemContract
                    · extractTrajectoryContractView
                    · (types)

App  ──bind───►  domain/runtimeContractSupply
                    Domain은 supply resolver만 호출
```

App = **유일한 권장 Injection Hub**. Domain은 `resolveDomainFormulaExpr` / `resolveDomainAnchorsData`만 사용한다.

---

## 3. Runtime Layer

경로: `frontend/src/runtime/`

### 3.1 Public API Surface (`runtime/index.ts`)

| Export | Role |
|--------|------|
| **`getSystemContract(systemId)`** | **Sole Lookup Entry** (Ch.10) |
| `listRegisteredSystemIds()` | Approved sibling |
| `isRegistered(systemId)` | Approved sibling |
| `extractTrajectoryContractView(contract)` | Pure projection (not cached) |
| Contract / View **types** | Shape SSOT |

**Public API가 아닌 것:** `bootstrapRegistry`, Loader, `systemPackageStore`, `assembleSystemContract`.

### 3.2 Registry (`registry/systemRegistry.ts`)

| Item | Fact |
|------|------|
| **역할** | Sole Cache Owner · Sole Lookup Entry 구현 |
| **캐시** | `Map<systemId, SystemContract>` |
| **bootstrap** | 최초 lookup 시 `listDiscoverableSystemIds()` 전량 assemble·register |
| **alias** | `5_HALF` → `5_half_system`, `Plus_5_system` → `plus_5_system` |
| **조립** | 직접 JSON 읽지 않음 → `assembleSystemContract` 호출만 |

### 3.3 Loader (`loader/systemLoader.ts`)

| Item | Fact |
|------|------|
| **역할** | Sole Assembler — locate · load · validate · assemble |
| **캐시** | **없음** (Registry만 캐시) |
| **입력** | PackageStore profile/anchors + Loader-local `logic.json` / `system_meta.json` globs |
| **출력** | frozen `SystemContract` 또는 `undefined`(profile 없음) |
| **validation** | 조립 시 `{ ok, errors }` 슬라이스 (profile 존재 등) |

### 3.4 Package Store (`loader/systemPackageStore.ts`)

| Item | Fact |
|------|------|
| **역할** | Loader-internal JSON access SSOT for **profile** + **anchors** |
| **방식** | `import.meta.glob(..., { eager: true })` |
| **제외** | `0tip_plus/anchors.json` exclusion 유지 (B6 Defer) |
| **API** | `getPackageProfile` · `getPackageAnchors` · `listPackageSystemIds` |
| **소비자** | Loader only · Public API 아님 |

### 3.5 Contract

| File | Role |
|------|------|
| `contract/systemContract.ts` | `SystemContract` shape · `SYSTEM_CONTRACT_VERSION` |
| `contract/trajectoryContract.ts` | `extractTrajectoryContractView` — SystemContract → TrajectoryContractView (pure, no I/O, not Registry-cached) |

---

## 4. System Package 조립 과정

사용자가 System을 고른 뒤 Presentation까지 (실제 구현 순서):

```text
1. User selects system
   · overlay / slot / controller가 systemId를 갱신
        ↓
2. App (or Domain via supply) needs contract data
   · App: getSystemContract(systemId)
   · Domain: resolveDomainFormulaExpr / resolveDomainAnchorsData
        ↓
3. Runtime Registry.getSystemContract
   · bootstrapRegistry() if needed
   · cache hit → return frozen contract
   · cache miss → assembleSystemContract(systemId)
        ↓
4. Loader.assembleSystemContract
   · getPackageProfile(systemId)     ← systemPackageStore
   · getPackageAnchors(systemId)     ← systemPackageStore
   · logic.json / system_meta.json   ← Loader globs
   · build identity · profile · anchors · logic · metadata · capabilities · validation
   · freezeDeep(contract)
        ↓
5. Registry caches & returns SystemContract
        ↓
6a. Domain consumption (calc / anchors lookup)
   · formulaExpr · anchors.trajectories via supply
        ↓
6b. Presentation / Trajectory path (App render path)
   · extractTrajectoryContractView(contract)
   · supplyReflectionSafety(...)
   · buildRgAnchors / buildTrajectory / renderer models
   · SystemGrid · labels · overlays JSX
```

**Package on disk (typical consumable system):**

```text
frontend/src/data/systems/<systemId>/
  profile.json       ← discovery에 필수 (없으면 Contract 없음)
  anchors.json       ← trajectories (0tip_plus는 PackageStore에서 제외)
  logic.json         ← L5 structure (Loader glob)
  system_meta.json   ← metadata / label_strategy 등 (Loader glob)
```

---

## 5. 호출 순서 (Call Flow)

### 5.1 Lookup → Contract (핵심)

```text
User (system select / render tick)
        ↓
App.jsx
        ↓
getSystemContract(systemId)          ← runtime/index.ts (Public)
        ↓
systemRegistry.getSystemContract
        ↓
bootstrapRegistry? → listDiscoverableSystemIds
        ↓
assembleSystemContract(systemId)     ← systemLoader.ts (internal)
        ↓
systemPackageStore
  · getPackageProfile
  · getPackageAnchors
        ↓
data/systems/<id>/*.json             ← Vite eager modules
        ↓
SystemContract (frozen)
        ↓
App / Domain / Overlay consumers
```

### 5.2 Trajectory Presentation 분기 (App render path)

```text
getSystemContract(systemIdForGrid)
        ↓
extractTrajectoryContractView(contract)   ← pure projection
        ↓
supplyReflectionSafety(view.reflectionSafety)
        ↓
buildRgAnchors({ profileForCanonical.offset_fg2rg … })
        ↓
buildTrajectory(…)
        ↓
renderer/trajectory/* models
        ↓
Presentation JSX (table / overlays)
```

### 5.3 Domain-only 경로 (App이 Runtime을 Domain에 주입)

```text
App module load
        ↓
bindDomainContractSupply({ getFormulaExpr, getFormulaHash, getAnchorsData })
        ↓
domain/calculator · domain/anchorLookupEngine · …
        ↓
resolveDomainFormulaExpr / resolveDomainAnchorsData
        ↓
(supply → getSystemContract → … same Registry path)
```

---

## 6. 파일 책임 (Responsibility)

| File | 역할 | 입력 | 출력 | 변경 가능 여부 |
|------|------|------|------|----------------|
| `App.jsx` | Orchestrator · Injection Hub · UI | user events · systemId | JSX · supply binding | UI/flow는 가능 · **Package 직접 읽기 금지** |
| `runtime/index.ts` | Public API barrel | — | exports | **Issue/Compatibility 없이 breaking 금지** (Ch.10) |
| `runtime/registry/systemRegistry.ts` | Cache · Lookup | systemId | SystemContract \| undefined | 책임 경계 유지 · silent API 추가 신중 |
| `runtime/loader/systemLoader.ts` | Assemble Contract | package + logic/meta | SystemContract | Assembler only · cache 추가 금지 |
| `runtime/loader/systemPackageStore.ts` | Eager package maps | glob paths | raw profile/anchors | exclusion 변경 = **ADR Baseline** (B6 교훈) |
| `runtime/contract/systemContract.ts` | Shape SSOT | — | types | shape breaking = version/Issue |
| `runtime/contract/trajectoryContract.ts` | Projection extractor | SystemContract | TrajectoryContractView | pure 유지 · I/O 금지 |
| `domain/runtimeContractSupply.ts` | Domain↔Runtime seam | bound resolvers | formula/anchors slices | Domain이 Runtime import 하면 안 됨 |
| `data/systems/<id>/*` | System Package | — | JSON packages | Fleet Layer Contract + Meaning Preservation |
| `renderer/**` · `components/table/**` | Presentation (today) | models / props | UI | B7 Contract 전: 구현 코드가 사실상 Presentation |
| `components/overlays/SysOverlay.jsx` | SYS UI · formula display | formData · getSystemContract | overlay UI | main이 쓰는 overlay (admin/sys/SysOverlay.tsx는 main 미사용 — App 주석) |

---

## 7. Contract 소비 구조

Fleet Layer → Runtime → Presentation **현재 구현 매핑**:

```text
L4 Anchor Contract (Ch.8)
  · Package: anchors.json trajectories
  · Runtime: SystemContract.anchors
  · Consume: Domain anchors · App trajectory / labels
        ↓
L5 Logic Contract (Ch.9)
  · Package: logic.json (structure-only Apply history)
  · Runtime: SystemContract.logic
  · Consume: 주로 Contract 슬라이스로 보관 · calc는 profile.formula 등
        ↓
L6 Runtime Contract (Ch.10)
  · Registry / Loader / PackageStore / Public API / Supply Isolation
  · Completeness: e.g. double_rail anchors load (B6 PASS)
        ↓
Runtime (code)
  · getSystemContract · extractTrajectoryContractView
        ↓
Presentation (code today)
  · App render path · renderer · overlays · table components
  · Ch.11 / B7 Presentation Contract = Not Persisted (아직 Book 챕터 없음)
```

**Meaning Preservation:** Formula / System Value / Logic / Trajectory **의미**는 Runtime 조립이 바꾸지 않는다. Runtime은 **Load · Assemble · Cache · Lookup · Project** 한다.

---

## 8. Developer Guide — 새 시스템 추가

표준 consumable 시스템을 추가할 때의 **실제** 순서:

### Step 1 — Package 생성

```text
frontend/src/data/systems/<new_system_id>/
  profile.json          # 필수 — discovery / Contract 존재 조건
  anchors.json          # trajectories (consumable이면 포함)
  logic.json            # 권장
  system_meta.json      # family / render.label_strategy 등
```

- folder id = canonical `systemId`
- Vite eager glob이 자동 수집 → **Registry/Loader 코드 수정 불필요** (일반 케이스)

### Step 2 — Completeness / exclusion 확인

- `systemPackageStore` anchors exclusion 목록에 넣지 말 것 (현재 exclusion: `0tip_plus` only)
- non-consumable을 억지로 lift하지 말 것 (Ch.10 Completeness / B6 Defer)

### Step 3 — UI / Catalog (필요 시)

실제 제품 UI에 노출하려면 별도 목록이 있을 수 있다 (예: overlay system list, `data/meta/admin/shot_types.json`).  
**Runtime discovery ≠ UI 메뉴 자동 추가** — UI 쪽은 별도 확인.

### Step 4 — Verify

```text
getSystemContract("<new_system_id>")
  · validation.ok
  · anchors.trajectories (기대 시)
  · profile.formulaExpr (기대 시)
Build / selected-system smoke
```

### Step 5 — 하지 말 것

| Don’t |
|-------|
| Domain에서 `data/systems` JSON 직접 import |
| PackageStore를 Public API처럼 App에서 호출 |
| Meaning(Formula/Value/Logic/Trajectory)을 “로더 편의”로 변경 |
| B3 Metadata rename (Ch.7 Not Persisted · Hold) |
| ADR 없이 PackageStore exclusion / Public API 변경 |

---

## 9. Boundary

| Layer | Owns | Must not |
|-------|------|----------|
| **App.jsx** | Orchestration · supply bind · UI state · calling Public API | Assemble packages · own Registry cache · Domain→JSON bypass |
| **Runtime** | Lookup · Cache · Assemble · Contract shape · Projection extractors | UI rendering · Formula 의미 재정의 · Domain business flows |
| **Domain** | Calc · anchors lookup · search · flows via supply | `import` Runtime or PackageStore |
| **Presentation (today)** | renderer models · table/overlay components | Direct System JSON load · Registry internals |
| **System Package** | Persistent system data | Runtime API 역할 |

```text
App ──► Runtime Public API ──► Registry ──► Loader ──► Package
 ▲                                                      │
 └── Domain ◄── supply (App-bound) ◄────────────────────┘
 Presentation ◄── App (Contract views + Domain results)
```

---

## 10. Future Extension

구현 **전** 항목 — 연결 위치만 명시한다.

### 10.1 B7 — Presentation Contract

| Item | Status | Intended attach point (when Ratified) |
|------|--------|----------------------------------------|
| Ch.11 L7 Presentation Contract | **Not Persisted** | Book chapter + STEP8 B7 |
| Today | Presentation = **code** (`renderer/**`, App trajectory path, overlays) | — |
| Future | Presentation rules / views may bind to Contract capabilities / dedicated projection | **After** `extractTrajectoryContractView` / render capabilities — **not** by bypassing Registry |

### 10.2 B3 — Metadata

| Item | Status | Attach point |
|------|--------|--------------|
| Ch.7 L3 Metadata | **Not Persisted** | B3 **Hold** |
| Today | `system_meta.json` → `SystemContract.metadata` via Loader | — |
| Future | Metadata normalize / key rename | **Ch.7 Ratify 전 재시도 금지** |

### 10.3 B8 — Validation Engine

Validation Engine redesign는 Runtime Public API Consumer가 아닐 수 있다 (Ch.10). B8에서 별도 정의.

---

## 11. Quick Reference (30-minute checklist)

1. Read this §1–§5  
2. Open `runtime/index.ts` → Public API  
3. Skim `systemRegistry.ts` → cache + bootstrap  
4. Skim `systemLoader.ts` → assemble  
5. Skim `systemPackageStore.ts` → eager packages  
6. Open `App.jsx` top → `bindDomainContractSupply`  
7. Jump to App trajectory block → `extractTrajectoryContractView`  
8. Cite Ch.10 for boundaries before changing Runtime  

---

## 12. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | v1.0 — Runtime Orchestration Architecture Guide created from live code (post STEP8 B6 PASS) · docs only |
| 2026-07-22 | Purpose 보강 — 공식 Architecture Guide · First Consume · Ops Workflow cite (MASTER v1.38 / HANDOFF) |

---

*End of APPLICATION_FLOW.md — Document SSOT for Runtime Orchestration*
