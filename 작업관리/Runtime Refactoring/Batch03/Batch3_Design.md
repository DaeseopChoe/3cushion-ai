# Batch3_Design.md

```
Document  : Batch3_Design.md
Version   : v1.0
Status    : Implementation Ready
Date      : 2026-07-07
Baseline  : commit 6bdce39 (Batch 2 완료)
Standard  : AAS v2.0 + App_Migration_Map.md (Constitution)
Basis     : Batch3_Analysis.md + Batch3_Analysis_Refinement.md
Rule      : Migration Map Batch 순서·Target 변경 금지.
            Application Flow는 계산·I/O·알고리즘을 포함하지 않는다.
            Presentation Layer는 계산하지 않는다.
```

## Revision History

| Version | 변경 내용 | 날짜 |
|---------|----------|------|
| v1.0 | 최초 작성 — AD-B3-01~05, Migration Sequence STEP 3-1~3-8(+3-7A/B 분리), Flow Context 설계, Regression Strategy, Acceptance Criteria, Debt Ledger, Cleanup Backlog, Design Completeness Checklist | 2026-07-07 |

---

## 0. 목적 및 범위

### 문서 목적

이 문서는 AAS Runtime Migration Batch 3의 공식 Design SSOT이다.  
`Batch3_Analysis.md` 및 `Batch3_Analysis_Refinement.md`에서 확정된 모든 결정을 Implementation Ready 수준으로 승격한다.  
이 문서를 기준으로 Cursor Agent가 STEP 3-1부터 구현을 즉시 시작할 수 있다.

### Batch 3 범위

| 영역 | Migration ID | 내용 |
|------|-------------|------|
| Application Flow | (전체) | `application/flows/` 신설, 8개 Flow 파일 생성 |
| Search | SRCH-001~005 | LocalDB / ADMIN Search / USER Search / RecallHydrate / Reset |
| Dataset | DS-001~005, DS-007 | Working Dataset I/O, Auto Capture, Save, History |
| AI Persistence | AI-002 | OnePoint Library localStorage 격리 |
| Ball Drag Flow | CAL-006 | 공 드래그 sys 역산 흐름 추출 |
| Calculation (Hydrate) | CAL-004 | recall 결과 변환 순수 함수 추출 |

### Batch 3 제외 항목 (명시적)

| 항목 | 이유 |
|------|------|
| CAL-005 (SysOverlay 실시간 계산) | Batch 4 대상, 이동 금지 |
| CAL-002/003, MISC-004 | Batch 4 대상 (고위험 계산) |
| TRJ-001/003, RND-003, APP-009 | Batch 5 대상 (최고위험 궤적) |
| SYS-001/002/003/006, DS-006 | Batch 6 대상 (Runtime Contract Blocker) |
| AI-001, AI-003 | App.jsx 영구 유지 — setAdminState 직접 의존 |
| APP-002/006/007/012, MISC-001/005 | App.jsx 영구 유지 |
| RND-001 | App.jsx 영구 유지 |
| `publishedDatasetStore.ts` → `search/corpus/` 재배치 | CL-002 Cleanup Backlog, Batch 3 미포함 |

---

## 1. Architecture Decision Record (Batch 3)

### AD-B3-01 — Application Flow Layer 도입

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | SRCH-001~005, DS-001~005, DS-007, AI-002, CAL-004/006, MISC-002 |
| **Decision** | `application/flows/` 폴더를 신규 생성하고, App.jsx에 인라인으로 존재하는 다단계 업무 흐름을 Runtime Flow 단위로 추출한다. App.jsx는 Flow 함수 호출(thin dispatch)만 수행한다. |
| **Dependency Direction** | `App.jsx → application/flows/*.ts → domain/*.ts` |
| **Constitution 근거** | Constitution §6: "Search → match → slot hydrate → trajectory apply → overlay/session update 이 흐름은 Application Layer가 담당한다." |
| **Related Rule** | R-FLOW-1, R-APP-3, ADR-001 |
| **Impact** | `application/flows/` 신규 폴더 + 8개 파일 생성. App.jsx에서 약 −1,100 lines 예상. |
| **Migration Map** | Batch/Priority/Target 변경 없음. |

---

### AD-B3-02 — Flow Context Pattern: Hybrid Object Context

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | 모든 `application/flows/*.ts` 함수 인터페이스 |
| **Decision** | Flow 함수는 단일 `[Name]FlowContext` 객체를 인수로 받는다. Context는 READ / WRITE / ACTION / HELPER 4종으로 구조적 분리한다. |
| **Chosen Pattern** | **Option C — Hybrid Object Context** (READ = 순수 값, WRITE = 함수 참조, ACTION = hook 메서드 참조, HELPER = App.jsx 정의 함수 참조) |
| **Rejected Option A** | Full dispatch in Flow — React 결합도 과도, 테스트 어려움 |
| **Rejected Option B** | Return-based — Batch 3 규모에서 과도한 설계. STEP Lock Rule 위험. Batch 5에서 점진적 전환 검토(→ Appendix FE-001). |
| **React ref 취급** | React ref는 Context에 포함하지 않는다. `userSearchInFlightRef` 등은 App.jsx가 보유하며 Flow 호출 전후에 조작한다. |
| **Related Rule** | R-FLOW-1, R-APP-3, ADR-001 |

**Context 구조 표준:**

```typescript
type [Name]FlowContext = {
  // READ — 순수 값 (no ref, no React object)
  fieldA: TypeA;
  fieldB: TypeB;

  // WRITE — React 상태 dispatch 함수 참조
  setX: (v: T) => void;
  setY: (updater: (prev: T) => T) => void;

  // ACTION — useShotSlots / hooks 메서드 참조
  applyPositionRecall: (record: PositionRecord) => void;
  clearSearchSlotDrafts: () => void;

  // HELPER — App.jsx 정의 함수 참조 (부수효과 포함 가능)
  clearAdminSearchDisplayRuntime: () => void;
  beginAdminInputSession: () => boolean;
};
```

---

### AD-B3-03 — RecallHydrate Flow는 Context 없이 Pure Function Parameter 사용

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | CAL-004 (`adminSysFromRecallEntry`, `buildSlotSysSnapshotFromEntry`, 보조 함수 3개) |
| **Decision** | CAL-004 대상 5개 함수는 모두 module scope 순수 함수이므로 Object Context가 아닌 명시적 파라미터를 사용한다. |
| **Reason** | 이 함수들은 React 상태에 의존하지 않으며 파라미터 → 반환값 변환만 수행한다. Object Context는 과도한 구조이며 오히려 의존성을 숨긴다. |
| **Rejected** | Object Context — 순수 변환 함수에 Context가 강제되면 testability 저하. |
| **Related Rule** | R-FLOW-1, R-DOM-1 |

```typescript
// application/flows/recallHydrateFlow.ts — 파라미터 방식
export function adminSysFromRecallEntry(
  entry: StrategyEntry,
  prevSys: AdminSysState | null
): AdminSysState | null

export function buildSlotSysSnapshotFromEntry(
  entry: StrategyEntry
): SlotSysSnapshot | null

export function normalizePublishedShotTypeHint(raw: unknown): string | null
export function shotTypeForSysOverlay(sigType: string, prevType: string): string
export function resolvePublishedLeafHints(
  adminSys: AdminSysState | null,
  slots: ShotSlots,
  activeSlot: string
): { shotType: string | null; systemId: string | null }
```

---

### AD-B3-04 — Save Flow와 History Flow 분리 (STEP 3-7A / 3-7B)

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | DS-002, DS-003, SRCH-005 |
| **Decision** | 기존 STEP 3-7을 `STEP 3-7A (saveFlow.ts)` + `STEP 3-7B (historyFlow.ts)` 두 STEP으로 분리한다. |
| **Reason** | Save Flow(`saveFlow.ts`)와 History Flow(`historyFlow.ts`)는 각각 독립 파일이며, DS-003이 DS-002 결과에 의존한다. STEP Lock Rule에 따라 파일 단위 Rollback Point를 확보해야 한다. |
| **Impact** | STEP 총 9개 (기존 8개 + 1). Batch 3 일정에 영향 없음. |
| **Related Rule** | R-FLOW-1, R-DS-1, R-DS-2, STEP Lock Rule §4 |

---

### AD-B3-05 — Migration Debt와 Cleanup Backlog 분리

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | 전체 Debt 관리 |
| **Decision** | Debt를 **Migration Debt**(Architecture Rule/ADR/Runtime 위반으로 Migration Block)와 **Cleanup Backlog**(Layer 배치·중복·Dead code — 동작에 영향 없음)로 분리하여 관리한다. |
| **Reclassified** | 구 D-003 → CL-001, 구 D-009 → CL-002 |
| **Reason** | Cleanup 항목이 Debt로 관리되면 Batch 우선순위가 왜곡된다. Architecture Block 여부로 분류 기준을 명확히 한다. |

---

## 2. Migration Debt 현황 (Batch 3 기준)

### Migration Debt 분류 기준

> **Migration Debt** = 다음 중 하나 이상을 위반하여 **Batch Migration을 Block하거나 Runtime Contract 이행을 막는** 항목만 포함한다.
> - Runtime Contract 위반
> - Architecture Rule (Constitution 규칙) 위반
> - ADR 결정 위반
>
> Cleanup 성격(Layer 배치 불일치·코드 중복·Dead code 등 동작에 영향 없는 항목)은 **Cleanup Backlog**로 분리 관리한다.

---

### 2-1. Migration Debt Ledger (Architecture Rule / ADR / Runtime 위반)

| ID | 항목 | 위반 Rule | Target Batch | Status |
|----|------|----------|-------------|--------|
| D-001 | Legacy Alias 4개 (`canonicalSystemIdForConfig` 등) 제거 | R-SYS-1 | Soft: Batch 4 / Hard: Batch 6 착수 전 | 🟡 Open |
| D-002 | `sysOverlayInputFinite` private 전환 | R-DOM-1 | Batch 2 완료 | ✅ Closed |
| D-004 | `SysOverlay.jsx` 내 `SYSTEM_OPTIONS` 하드코딩 | R-SYS-2, ADR-006 | Batch 6 | 🟡 Open |
| D-005 | `labelStrategy` 내 `systemIdForGrid === "5_half_system"` 직접 분기 | R-SYS-1, ADR-010 | Batch 6 | 🟡 Open |
| D-006 | `SYSTEM_PROFILES` 직접 접근 (`recallHydrateFlow.ts`, `saveFlow.ts`로 이동) | R-RT-1, ADR-006 | Batch 6 | 🔜 Open (Batch 3 발생 예정) |
| D-007 | `getAnchorsForSystem` 직접 접근 (`saveFlow.ts`의 `evalForSave`) | R-RT-1, R-SYS-2, ADR-006 | Batch 6 | 🔜 Open (Batch 3 발생 예정) |
| D-008 | `calculateByProfileExpr` 직접 호출 (`buildSlotSysSnapshotFromEntry`) — CAL-005 패턴 | R-DOM-1, ADR-002 | Batch 4 (CAL-005 Domain 통합 시 해소) | 🔜 Open (Batch 3 발생 예정) |

> **D-006/D-007 설명:** `SYSTEM_PROFILES`, `getAnchorsForSystem` 직접 접근은 App.jsx에서 `application/flows/`로 위치가 이동될 뿐 Architecture Rule 위반이 해소되지 않는다. Batch 6 Runtime Contract 전환 시 최종 해소.
>
> **D-008 설명:** `buildSlotSysSnapshotFromEntry`는 recall 결과에 대해 `calculateByProfileExpr`로 계산값을 채운다. 이는 Batch 4에서 CAL-005와 함께 `domain/calculator/systemValueCalculator.ts`로 통합 예정.

---

### 2-2. Cleanup Backlog (Layer 배치 / 중복 / Dead code — 기능 Block 없음)

| ID | 항목 | 성격 | 권장 시기 |
|----|------|------|----------|
| CL-001 (구 D-003) | `domain/*` 3파일 `isFiveHalfSystemId` 중복 통합 | 코드 중복 | Batch 4 이전 (편의) |
| CL-002 (구 D-009) | `domain/publishedDatasetStore.ts` → `search/corpus/publishedCorpusLoader.ts` 재배치 | Layer 배치 불일치 | Batch 3 cleanup commit 또는 Batch 4 착수 전 |
| CL-003 | `handleSave` (App.jsx) — 미사용 구형 SAVE 함수 | Dead code | Batch 3 cleanup commit |
| CL-004 | `STRContent` 컴포넌트 (App.jsx) — module scope에 Presentation 컴포넌트 잔존 | 위치 불일치 | Batch 3 또는 standalone cleanup |
| CL-005 | `emitAdminRecallTrace`, `postRecallTraceLog` 등 debug/trace 함수 정리 | Debug artifact | Batch 4+ |

---

## 3. Batch 3 Migration Sequence

### 개요

```
STEP 3-1   AI-002          onePointLibrary persistence 격리         (저위험)
STEP 3-2   DS-001/004/005/MISC-002  Dataset Infrastructure 격리     (저-중위험)
STEP 3-3   CAL-004         recallHydrateFlow                        (중위험)
STEP 3-4   SRCH-004        resetFlow                                (저-중위험)
STEP 3-5   SRCH-001        adminLocalDbFlow  ← STEP 3-3 전제        (중위험)
STEP 3-6   SRCH-002/003    adminSearchFlow + userSearchFlow         (중-고위험)
STEP 3-7A  SRCH-005+DS-002 saveFlow  ← STEP 3-2 전제               (고위험)
STEP 3-7B  DS-003          historyFlow  ← STEP 3-7A 전제           (중위험)
STEP 3-8   CAL-006         ballDragFlow                             (저위험)
```

**의존 관계:**
```
3-2 ──────────────────────────→ 3-7A
3-3 ──────────→ 3-5
3-7A ─────────────────────────→ 3-7B
```

---

### STEP 3-1 — AI-002: One-Point Library Persistence 격리

**대상:** AI-002  
**Architecture 목적:** `localStorage`에 직접 접근하는 레슨 라이브러리 영속성을 Infrastructure로 격리. App.jsx의 `ONE_POINT_KEY` / `onePointLibrary` useState 초기화 / `saveOnePointLibrary` 제거.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `domain/lesson/onePointLibrary.ts` | **신규 생성** |
| `App.jsx` | `onePointLibrary` 초기화 useEffect + `saveOnePointLibrary` → import 교체 |

**Target 함수 (신규):**

```typescript
export function loadOnePoints(): LessonItem[]
export function saveOnePoints(items: LessonItem[]): void
export const ONE_POINT_STORAGE_KEY = "ONE_POINT_LESSON_LIBRARY_V1"
```

**App.jsx 잔류 항목:**
- `onePointLibrary`, `onePointSelectedId`, `onePointDraft` useState — **App.jsx 유지 (Application State)**
- `onSelectOnePoint`, `applyOnePointToShot`, `deleteLesson`, `reorderLessons`, `saveDraftAsNewLesson` — **App.jsx 유지** (setAdminState 호출 포함)
- `sortedOnePointLibrary` useMemo — **App.jsx 유지**

**Rollback:** `domain/lesson/onePointLibrary.ts` 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Architecture Rule 확인:** R-DS-1 (I/O = Infrastructure), Constitution §16 (AI/Lesson Domain 독립)  
**Commit Message:** `feat(batch3): STEP 3-1 - onePointLibrary persistence extraction (AI-002)`

---

### STEP 3-2 — DS-001 + DS-004 + DS-005 + MISC-002: Dataset Infrastructure 격리

**대상:** DS-001, DS-004, DS-005, MISC-002  
**Architecture 목적:** localStorage Working Dataset I/O를 Infrastructure 함수로 격리. App.jsx에서 `localStorage` 직접 접근 제거(DS-001/004 범위). Auto Capture side effect를 Domain 훅으로 격리.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `domain/dataset/infra/datasetStorage.ts` | **신규 생성** |
| `domain/dataset/autoCapture.ts` | **신규 생성** |
| `App.jsx` | dataset useState 초기화, handleFileImport, autoCapture useEffect 교체 |

**Target 함수 (신규):**

```typescript
// datasetStorage.ts (DS-001 + DS-004)
export const WORKING_DATASET_KEY = "positions_dataset"
export function loadWorkingDataset(): PositionRecord[]
export function saveWorkingDataset(updated: PositionRecord[]): void
export function importDatasetFromFile(file: File): Promise<PositionRecord[]>

// autoCapture.ts (MISC-002)
export function useAutoCapture(props: AutoCaptureProps): void
  // props: { canEdit, overlayOpen, ballsState, adminSys, adminHptT, viewBalls }
  // effect: setTimeout 1000ms → createCaptureCandidate → lastCapturedRef
```

**DS-005 (handleWorkspaceLocalStorageCleanup):** `runWorkspaceLocalStorageCleanup`은 이미 `hooks/useSettings`에 존재. App.jsx의 `handleWorkspaceLocalStorageCleanup`은 thin dispatch이므로 이동 없이 유지.

**App.jsx 변경 패턴:**

```typescript
// Before
const [dataset, setDataset] = useState(() => {
  try {
    const saved = localStorage.getItem("positions_dataset");
    return normalizeDatasetFromStorage(saved ? JSON.parse(saved) : []);
  } catch { return []; }
});

// After
const [dataset, setDataset] = useState(loadWorkingDataset);
```

**⚠️ 핵심 불변 조건:** `WORKING_DATASET_KEY = "positions_dataset"` — 변경 절대 금지. key 변경 시 Working Dataset 전체 유실.

**Rollback:** 신규 파일 2개 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Architecture Rule 확인:** R-DS-1, R-DS-2, Constitution §8  
**Commit Message:** `feat(batch3): STEP 3-2 - Dataset Infrastructure extraction (DS-001/004/005, MISC-002)`

---

### STEP 3-3 — CAL-004: Recall Hydrate 순수 함수 추출

**대상:** CAL-004 + 보조 함수 4개 (모두 현재 App.jsx module scope)  
**Architecture 목적:** App.jsx module scope에 정의된 recall 변환 함수들을 `application/flows/recallHydrateFlow.ts`로 이동. AD-B3-03에 따라 Object Context 없이 명시적 파라미터 사용.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/recallHydrateFlow.ts` | **신규 생성** |
| `App.jsx` | L528~648의 module scope 함수 5개 제거 → import 교체 |

**이동 대상 함수 (App.jsx module scope → recallHydrateFlow.ts):**

| 함수 | 현재 App.jsx 위치 (참고) | 이동 후 |
|------|-----------|---------|
| `buildSlotSysSnapshotFromEntry` | L528~570 | recallHydrateFlow.ts (module-private) |
| `shotTypeForSysOverlay` | L572~577 | recallHydrateFlow.ts (export) |
| `normalizePublishedShotTypeHint` | L580~584 | recallHydrateFlow.ts (export) |
| `resolvePublishedLeafHints` | L586~601 | recallHydrateFlow.ts (export) |
| `adminSysFromRecallEntry` | L617~648 | recallHydrateFlow.ts (export) |

**Migration Debt 발생:**
- D-006 등록: `SYSTEM_PROFILES[sid]` 직접 접근 (`adminSysFromRecallEntry`)
- D-008 등록: `calculateByProfileExpr` 직접 호출 (`buildSlotSysSnapshotFromEntry`)

**Rollback:** `application/flows/recallHydrateFlow.ts` 삭제 + App.jsx module scope 원복  
**독립 rollback 가능:** ✅ (module scope 이동만, import path 교체)  
**Architecture Rule 확인:** R-FLOW-1, R-DOM-1, ADR-001  
**Commit Message:** `feat(batch3): STEP 3-3 - recallHydrateFlow extraction (CAL-004)`

---

### STEP 3-4 — SRCH-004: USER Reset Flow 추출

**대상:** SRCH-004  
**Architecture 목적:** USER Reset 다단계 흐름을 `application/flows/resetFlow.ts`로 분리.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/resetFlow.ts` | **신규 생성** |
| `App.jsx` | `handleUserSearchReset` 내부 로직 제거 → `runUserSearchReset(ctx)` 호출 |

**Target 함수:**

```typescript
export function runUserSearchReset(ctx: ResetFlowContext): void
```

**ResetFlowContext:**

```typescript
type ResetFlowContext = {
  // READ
  appMode: "ADMIN" | "USER";
  slots: ShotSlots;
  trajectory: { resetTrajectory: () => void };
  adminState: AdminState;
  userTableDisplaySlotId: string | null;
  targetColor: string | null;
  isTargetSelected: boolean;
  // WRITE
  setUserTableDisplaySlotId: (v: string | null) => void;
  setOverlayContent: (v: string | null) => void;
  setOverlayState: (v: OverlayState) => void;
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  setUserLastSearchRecord: (v: PositionRecord | null) => void;
  // ACTION
  clearSearchSlotDrafts: () => void;
  resetUserSearchTargetSelection: () => void;
};
```

**Rollback:** `application/flows/resetFlow.ts` 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Architecture Rule 확인:** R-FLOW-1, R-APP-3  
**Commit Message:** `feat(batch3): STEP 3-4 - resetFlow extraction (SRCH-004)`

---

### STEP 3-5 — SRCH-001: ADMIN LocalDB Flow 추출

**선행 조건:** STEP 3-3 완료 (recallHydrateFlow.ts의 `adminSysFromRecallEntry` 참조)  
**대상:** SRCH-001  
**Architecture 목적:** Working Dataset 검색 흐름을 `application/flows/adminLocalDbFlow.ts`로 분리.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/adminLocalDbFlow.ts` | **신규 생성** |
| `App.jsx` | `runAdminPositionRecall` 내부 로직 제거 → `runAdminLocalDbRecall(ctx)` 호출 |

**Target 함수:**

```typescript
export async function runAdminLocalDbRecall(
  ctx: AdminLocalDbFlowContext
): Promise<boolean>
```

**AdminLocalDbFlowContext:**

```typescript
type AdminLocalDbFlowContext = {
  // READ
  dataset: PositionRecord[];
  ballsState: BallsState;
  adminState: AdminState;
  activeSlot: string;
  slots: ShotSlots;
  isTargetSelected: boolean;
  targetColor: "red" | "yellow" | null;
  // WRITE
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  setIsAdminPublishedSearchMatched: (v: boolean) => void;
  setAdminTableLayersVisible: (v: boolean) => void;
  setShowCoaching: (v: boolean) => void;
  // ACTION
  applyPositionRecall: (record: PositionRecord) => void;
  patchSlotRuntimeMeta: (slotId: string, meta: Partial<SlotMeta>) => void;
  // HELPER (App.jsx 정의)
  clearAdminSearchDisplayRuntime: () => void;
  beginAdminInputSession: () => boolean;
  getAdminRecallQueryTargetBall: () => "red" | "yellow" | null;
};
```

**주의:**
- `clearAdminSearchDisplayRuntime`, `beginAdminInputSession`은 dispatch 포함 헬퍼. App.jsx에서 정의하고 Context로 전달. Flow 내부에서 정의하지 않는다.
- D-006: `SYSTEM_PROFILES` 직접 접근 존재 — D-006으로 등록, Batch 6 해소.

**Rollback:** `application/flows/adminLocalDbFlow.ts` 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Commit Message:** `feat(batch3): STEP 3-5 - adminLocalDbFlow extraction (SRCH-001)`

---

### STEP 3-6 — SRCH-002 + SRCH-003: Published Search Flows 추출

**선행 조건:** STEP 3-3 완료 (normalizePublishedShotTypeHint, resolvePublishedLeafHints 참조)  
**대상:** SRCH-002, SRCH-003  
**Architecture 목적:** ADMIN Published Search와 USER Published Search를 각각 독립 Runtime Flow로 분리.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/adminSearchFlow.ts` | **신규 생성** |
| `application/flows/userSearchFlow.ts` | **신규 생성** |
| `App.jsx` | `handlePositionRecall`, `handleUserSearchStrategies` 내부 로직 제거 → Flow 호출 |

**Target 함수:**

```typescript
// adminSearchFlow.ts
export async function runAdminSearch(ctx: AdminSearchFlowContext): Promise<void>

// userSearchFlow.ts
export async function runUserSearch(ctx: UserSearchFlowContext): Promise<void>
```

**AdminSearchFlowContext:**

```typescript
type AdminSearchFlowContext = {
  // READ
  ballsState: BallsState;
  adminState: AdminState;
  activeSlot: string;
  slots: ShotSlots;
  isTargetSelected: boolean;
  targetColor: "red" | "yellow" | null;
  userPublishedSearchContext: { shotType: string; systemId: string } | null;
  // WRITE
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  setIsAdminPublishedSearchMatched: (v: boolean) => void;
  setAdminTableLayersVisible: (v: boolean) => void;
  setShowCoaching: (v: boolean) => void;
  // ACTION
  applyPositionRecall: (record: PositionRecord) => void;
  patchSlotRuntimeMeta: (slotId: string, meta: Partial<SlotMeta>) => void;
  // HELPER
  clearAdminSearchDisplayRuntime: () => void;
  beginAdminInputSession: () => boolean;
  getAdminRecallQueryTargetBall: () => "red" | "yellow" | null;
  rejectAdminRecallHydrateForMismatch: (record: PositionRecord, targetBall: string | null) => boolean;
};
```

**UserSearchFlowContext:**

```typescript
type UserSearchFlowContext = {
  // READ
  ballsState: BallsState;
  adminState: AdminState;
  activeSlot: string;
  slots: ShotSlots;
  targetColor: "red" | "yellow" | null;
  userPublishedSearchContext: { shotType: string; systemId: string } | null;
  // WRITE
  setUserLastSearchRecord: (record: PositionRecord | null) => void;
  setUserPublishedSearchContext: (ctx: { shotType: string; systemId: string }) => void;
  // ACTION
  applyUserSearchRecall: (record: PositionRecord) => void;
  clearSearchSlotDrafts: () => void;
  // HELPER
  clearUserSearchDisplayRuntime: () => void;
  resetUserSearchTargetSelection: () => void;
  showToast: (message: string, opts?: { variant?: string }) => void;
};
```

**in-flight guard 취급 (AD-B3-02 결정):**

```typescript
// App.jsx — runUserSearch 호출 전후 guard 관리
const handleUserSearchStrategies = useCallback(async () => {
  if (userSearchInFlightRef.current) return;      // guard 확인
  userSearchInFlightRef.current = true;           // guard 설정
  try {
    await runUserSearch(ctx);                     // Flow 호출
  } finally {
    userSearchInFlightRef.current = false;        // guard 해제
  }
}, [...]);
```

`userSearchInFlightRef`는 Flow Context에 포함하지 않는다.

**Rollback:** adminSearchFlow.ts / userSearchFlow.ts 각각 독립 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**위험도:** ⚠️ 중-고위험 (가장 많이 사용되는 흐름)  
**Commit Message:** `feat(batch3): STEP 3-6 - adminSearchFlow + userSearchFlow extraction (SRCH-002/003)`

---

### STEP 3-7A — SRCH-005 + DS-002: Save Flow 추출

**선행 조건:** STEP 3-2 완료 (`saveWorkingDataset` infra 함수 참조)  
**대상:** SRCH-005, DS-002  
**Architecture 목적:** Strategy 저장 흐름을 `application/flows/saveFlow.ts`로 분리. App.jsx의 `localStorage` 직접 접근을 infra 함수 호출로 교체.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/saveFlow.ts` | **신규 생성** |
| `App.jsx` | `evalForSave`, `handleSaveStrategy` 제거 → `runSaveStrategy(ctx)` 호출 |

**Target 함수:**

```typescript
// saveFlow.ts
export function runSaveStrategy(ctx: SaveFlowContext): SaveFlowResult

type SaveFlowResult = {
  ok: boolean;
  updated?: PositionRecord[];
  reason?: string;
};
```

**SaveFlowContext:**

```typescript
type SaveFlowContext = {
  // READ
  dataset: PositionRecord[];
  ballsState: BallsState;
  adminState: AdminState;
  activeSlot: string;
  slots: ShotSlots;
  targetColor: "red" | "yellow" | null;
  aiOverride?: AiState | null;
  // READ — Infrastructure 함수 참조 (DS-001 infra)
  saveWorkingDataset: (updated: PositionRecord[]) => void;
  // WRITE
  setDataset: (updated: PositionRecord[]) => void;
  setUserPublishedSearchContext: (ctx: { shotType: string; systemId: string }) => void;
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  // ACTION
  patchSlotRuntimeMeta: (slotId: string, meta: Partial<SlotMeta>) => void;
};
```

**내부 구조 (saveFlow.ts):**

```typescript
// module-private
function evalForSave(args: EvalArgs): EvaluationResult {
  return evaluateStrategy({
    ...args,
    profile: SYSTEM_PROFILES[args.signature.systemId],      // D-006
    anchorsData: getAnchorsForSystem(args.signature.systemId), // D-007
  });
}

export function runSaveStrategy(ctx: SaveFlowContext): SaveFlowResult {
  // 1. validation
  // 2. createStrategyEntry (Domain 호출)
  // 3. upsertPositionRecord (Domain 호출)
  // 4. ctx.saveWorkingDataset(updated)   ← infra (localStorage 직접 접근 금지)
  // 5. ctx.setDataset(updated)           ← React state
  // 6. ctx.setUserPublishedSearchContext // 저장 shotType 유지
  // 7. ctx.setAdminState                 // shotType 동기화
  // 8. return { ok: true, updated }
}
```

**⚠️ 핵심 불변 조건:**
- `saveWorkingDataset`은 `WORKING_DATASET_KEY = "positions_dataset"` 상수만 사용
- `setDataset`과 `saveWorkingDataset`는 반드시 함께 호출

**Migration Debt 확인:**
- D-006: `SYSTEM_PROFILES` 직접 접근
- D-007: `getAnchorsForSystem` 직접 접근

**Rollback:** `application/flows/saveFlow.ts` 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Commit Message:** `feat(batch3): STEP 3-7A - saveFlow extraction (SRCH-005 + DS-002)`

---

### STEP 3-7B — DS-003: History Flow 추출

**선행 조건:** STEP 3-7A 완료 (`runSaveStrategy` 참조)  
**대상:** DS-003  
**Architecture 목적:** Save → Workspace History commit 흐름을 독립 Runtime Flow로 분리.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/historyFlow.ts` | **신규 생성** |
| `App.jsx` | `handleCanonicalRightPanelSave` 제거 → `runCanonicalSave(ctx)` 호출 |

**Target 함수:**

```typescript
export function runCanonicalSave(ctx: HistoryFlowContext): void
```

**HistoryFlowContext:**

```typescript
type HistoryFlowContext = {
  // READ — validation
  canUseSystemControls: boolean;
  adminState: AdminState;
  // WRITE — Save Flow 호출용 context (SaveFlowContext 포함)
  saveCtx: SaveFlowContext;
  // HELPER
  commitWorkspaceHistoryWithStrategyDataset: (dataset: PositionRecord[]) => void;
};
```

**내부 구조 (historyFlow.ts):**

```typescript
export function runCanonicalSave(ctx: HistoryFlowContext): void {
  if (!ctx.canUseSystemControls) { alert(...); return; }
  const result = runSaveStrategy(ctx.saveCtx);
  if (!result.ok) { /* alert 처리 */ return; }
  ctx.commitWorkspaceHistoryWithStrategyDataset(result.updated!);
}
```

**Rollback:** `application/flows/historyFlow.ts` 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Commit Message:** `feat(batch3): STEP 3-7B - historyFlow extraction (DS-003)`

---

### STEP 3-8 — CAL-006: Ball Drag Sys Flow 추출

**대상:** CAL-006  
**Architecture 목적:** 공 드래그 중 sys 역산 블록을 `application/flows/ballDragFlow.ts`로 분리.

**변경 파일:**

| 파일 | 변경 유형 |
|------|-----------|
| `application/flows/ballDragFlow.ts` | **신규 생성** |
| `App.jsx` | `handlePointerUp` 내부 블록 제거 → `applyBallDragSys(ctx)` 호출 |

**Target 함수:**

```typescript
export function applyBallDragSys(ctx: BallDragFlowContext): void
```

**BallDragFlowContext:**

```typescript
type BallDragFlowContext = {
  // READ
  canEdit: boolean;
  isAdminInputSessionActive: boolean;
  nextBallPos: { x: number; y: number } | null;
  dragBallId: string | null;
  balls: BallsState;
  adminState: AdminState;
  // WRITE
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
};
```

**Rollback:** `application/flows/ballDragFlow.ts` 삭제 + App.jsx 원복  
**독립 rollback 가능:** ✅  
**Commit Message:** `feat(batch3): STEP 3-8 - ballDragFlow extraction (CAL-006)`

---

## 4. STEP Lock Rule

### 4-1. STEP 종료 조건

다음 조건을 **모두** 만족해야 다음 STEP으로 진행한다. 하나라도 미충족이면 다음 STEP으로 진행하지 않는다.

```
□ npm run build  PASS (exit 0)
□ STEP Regression Checklist PASS (§5 참조)
□ Import Graph Validation PASS (순환참조 0 · 역방향 0)
□ Architecture Rule 위반 없음 (신규 위반 추가 없음)
□ git commit 완료 (STEP Baseline 생성)
```

### 4-2. STEP Flow

```
Implementation
      │
      ▼
   Build (npm run build)
      │
      ├─ FAIL → 수정 후 재시도 (다음 STEP 진행 금지)
      │
      ▼
   Regression Checklist
      │
      ├─ FAIL → 수정 후 재시도 (다음 STEP 진행 금지)
      │
      ▼
   Import Graph Validation
      │
      ├─ FAIL → 수정 후 재시도 (다음 STEP 진행 금지)
      │
      ▼
   Architecture Rule 확인
      │
      ├─ 위반 → 수정 후 재시도 (다음 STEP 진행 금지)
      │
      ▼
   Git Commit (STEP Baseline)
      │
      ▼
   Next STEP
```

### 4-3. Rollback 정책

- 다음 STEP 진행 중 이전 STEP의 문제가 발견되면 해당 STEP commit으로 `git revert` 후 재구현.
- Batch 3 전체를 한 번에 구현한 후 커밋하는 방식은 사용하지 않는다.

**Commit Message 형식:**

```
feat(batch3): STEP 3-N - [항목명] extraction
```

예시:

```
feat(batch3): STEP 3-1 - onePointLibrary persistence extraction (AI-002)
feat(batch3): STEP 3-7A - Save Flow extraction (SRCH-005 + DS-002)
feat(batch3): STEP 3-7B - History Flow extraction (DS-003)
```

### 4-4. 의존 STEP 진행 규칙

| STEP | 선행 필수 STEP |
|------|--------------|
| 3-5 (adminLocalDbFlow) | 3-3 (recallHydrateFlow) |
| 3-7A (saveFlow) | 3-2 (Dataset Infrastructure) |
| 3-7B (historyFlow) | 3-7A (saveFlow) |
| 3-1, 3-2, 3-3, 3-4, 3-6, 3-8 | 없음 (독립 실행 가능) |

---

## 5. Regression Strategy

### 5-1. 공통 Regression Checklist (매 STEP)

```
R-B3-C1  npm run build  exit 0
R-B3-C2  Import Graph: 순환참조 0, 역방향 0
R-B3-C3  기존 SYS 계산 결과 불변 (5½ Sn/C4/5/6)
R-B3-C4  기존 Trajectory 시각 표시 불변
R-B3-C5  기존 overlay 기본 동작 불변 (open/close)
R-B3-C6  Presentation → Domain 역방향 import 없음
R-B3-C7  application/flows/ → domain/ 방향만 허용 (역방향 금지)
R-B3-C8  domain/ → application/flows/ import 없음 (역방향 금지)
```

### 5-2. STEP별 Regression Checklist

#### STEP 3-1 (AI-002)

```
R-B3-1-1  AiOverlay 열기 → onePointLibrary 항목 표시 정상
R-B3-1-2  새 레슨 저장 → localStorage ONE_POINT_LESSON_LIBRARY_V1 갱신
R-B3-1-3  F5 새로고침 후 레슨 라이브러리 복원
R-B3-1-4  레슨 선택 → 슬롯에 적용 정상 (adminState.ai.onePointLessons 업데이트)
R-B3-1-5  AI 자동 코멘트 표시 불변 (aiAutoCommentViewModel 영향 없음)
```

#### STEP 3-2 (DS-001/004/005/MISC-002)

```
R-B3-2-1  앱 시작 시 positions_dataset 로드 → dataset 상태 정상
R-B3-2-2  SAVE 후 F5 → dataset 복원 (localStorage key "positions_dataset" 불변)
R-B3-2-3  파일 import → dataset 갱신 + localStorage 저장
R-B3-2-4  auto capture: 공 안정 1초 후 candidate 생성 확인
R-B3-2-5  Working Dataset / Published Dataset 경로 불변
```

#### STEP 3-3 (CAL-004)

```
R-B3-3-1  ADMIN 로컬DB recall 성공 → adminState.sys 채워짐 (systemId, inputs)
R-B3-3-2  ADMIN Search recall 성공 → adminState.sys 채워짐
R-B3-3-3  SYS 오버레이 열기 → recall 결과 값 표시 정상
R-B3-3-4  5½ recall → C1/C3 값 정상
R-B3-3-5  normalizePublishedShotTypeHint: "default" → null 반환
R-B3-3-6  resolvePublishedLeafHints: adminSys.shotType 우선 반환
```

#### STEP 3-4 (SRCH-004)

```
R-B3-4-1  USER Search 성공 → Reset 버튼 활성
R-B3-4-2  Reset 클릭 → balls 위치 유지
R-B3-4-3  Reset 클릭 → S1/S2/S3 공략 버튼 비활성
R-B3-4-4  Reset 클릭 → overlayContent null, trajectory 초기화
R-B3-4-5  Reset 클릭 → userLastSearchRecord null
R-B3-4-6  Reset 클릭 → targetColor null, isTargetSelected false
```

#### STEP 3-5 (SRCH-001)

```
R-B3-5-1  ADMIN 로컬DB 버튼 클릭 → Working Dataset 검색 (positions_dataset)
R-B3-5-2  매칭 성공 → adminState.sys 채워짐, Table 레이어 활성, coaching 표시
R-B3-5-3  매칭 실패 → alert "해당 데이터 없음" + 입력 세션 시작
R-B3-5-4  profile "adminSearch" 사용 확인 (Published Dataset 접근 없음)
R-B3-5-5  targetBall mismatch → hydrate 차단, alert "해당 데이터 없음"
R-B3-5-6  clearAdminSearchDisplayRuntime 동작 — trajectory 초기화, sys 초기화
```

#### STEP 3-6 (SRCH-002/003)

```
R-B3-6-1  ADMIN Search 버튼 → Published corpus 로드 (adminStrict profile)
R-B3-6-2  USER Search 버튼 → Published corpus 로드 (userStrict profile)
R-B3-6-3  USER Search 중 재클릭 → in-flight guard 동작 (중복 실행 없음)
R-B3-6-4  USER Search 성공 → S1/S2/S3 활성, userLastSearchRecord 설정
R-B3-6-5  USER Search 실패 (no-match) → toast "일치하는 포지션이 없습니다."
R-B3-6-6  ADMIN Search no-match → alert "해당 데이터 없음"
R-B3-6-7  Published Dataset cache 동작 (두 번째 Search: fromCache=true 확인)
R-B3-6-8  SRCH-001 (로컬DB) 동작 불변 — corpus 혼동 없음
```

#### STEP 3-7A (SRCH-005 + DS-002)

```
R-B3-7A-1  SAVE → positions_dataset localStorage 갱신 (key "positions_dataset" 불변)
R-B3-7A-2  SAVE 후 F5 → dataset 복원
R-B3-7A-3  SaveFlowResult.ok === true 반환
R-B3-7A-4  evaluateStrategy 결과 불변 (저장 전후 동일 signature 확인)
R-B3-7A-5  SAVE 실패 조건 → alert + ok=false 반환
R-B3-7A-6  SAVE 후 userPublishedSearchContext 갱신 (shotType/systemId)
R-B3-7A-7  autoSave → saveToFile 동작 불변
```

#### STEP 3-7B (DS-003)

```
R-B3-7B-1  SAVE → workspace_history 스냅샷 기록
R-B3-7B-2  History modal → 저장 항목 표시
R-B3-7B-3  Load snapshot → 상태 복원 정상
R-B3-7B-4  SAVE 실패 (ok=false) → workspace_history 기록 없음
R-B3-7B-5  canUseSystemControls=false → alert + 저장 없음
```

#### STEP 3-8 (CAL-006)

```
R-B3-8-1  cue/target 공 드래그 중 SYS 시스템 값 실시간 역산
R-B3-8-2  역산 값 adminState.sys.systemValues / inputs 반영
R-B3-8-3  impact 공 드래그 시 역산 트리거 없음 (ballId 조건 확인)
R-B3-8-4  isAdminInputSessionActive=true 시 역산 스킵 확인
```

---

## 6. Acceptance Criteria

| # | 항목 | 기준 |
|---|------|------|
| AC-1 | npm run build | ✅ exit 0 |
| AC-2 | App.jsx 라인 수 | ~5,400 lines 이하 (−1,100 이상 감소) |
| AC-3 | 신규 폴더 | `application/flows/`, `domain/lesson/`, `domain/dataset/infra/`, `domain/dataset/` |
| AC-4 | 신규 파일 | 11개 (flows 8 + lesson 1 + infra 1 + autoCapture 1) |
| AC-5 | Import Graph | 순환참조 0 · 역방향 0 |
| AC-6 | Flow Layer 방향 | `application/flows/` → `domain/` 단방향만. 역방향 import 없음 |
| AC-7 | App.jsx localStorage 직접 접근 | DS-001/004 범위 제거. `saveWorkingDataset`, `loadWorkingDataset` 경유 확인 |
| AC-8 | in-flight guard 위치 | `userSearchInFlightRef` App.jsx 보유. Flow Context 불포함 확인 |
| AC-9 | Runtime 동일성 | USER Search / ADMIN Search / LocalDB / Save / Reset 동작 불변 |
| AC-10 | Named Export Only | 신규 파일 모두 Named Export. Default Export / Barrel Export 없음 |
| AC-11 | Migration Debt | D-006, D-007, D-008 Open 등록 확인 |
| AC-12 | Cleanup Backlog | CL-001~005 등록 확인 |
| AC-13 | STEP Lock Rule | 각 STEP git commit 완료 확인 (9 commits) |
| AC-14 | RecallHydrate | Object Context 없음 확인 (AD-B3-03 준수) |
| AC-15 | 공통 Regression | R-B3-C1~C8 전체 PASS |
| AC-16 | Batch 4 진입 조건 | Final build PASS + Push 완료 + 문서 업데이트 완료 |
| AC-17 | SESSION_HANDOFF_CURSOR.md 업데이트 | Batch 3 완료 상태 반영 확인 ← **Batch 3 완료 조건에 포함** |

---

## 7. Target Folder Structure (Batch 3 완료 기준)

```
frontend/src/
│
├── App.jsx                              ← Orchestrator (~5,400 lines)
│                                           Application Flow 호출만
│
├── application/                         ← 신규 폴더 (Batch 3 생성)
│   └── flows/
│       ├── recallHydrateFlow.ts         (CAL-004)  순수 함수 5개
│       ├── resetFlow.ts                 (SRCH-004) runUserSearchReset
│       ├── adminLocalDbFlow.ts          (SRCH-001) runAdminLocalDbRecall
│       ├── adminSearchFlow.ts           (SRCH-002) runAdminSearch
│       ├── userSearchFlow.ts            (SRCH-003) runUserSearch
│       ├── saveFlow.ts                  (SRCH-005+DS-002) runSaveStrategy
│       ├── historyFlow.ts               (DS-003)   runCanonicalSave
│       └── ballDragFlow.ts              (CAL-006)  applyBallDragSys
│
├── domain/
│   ├── calculator/                      ← Batch 1 완료
│   │   ├── fiveHalfCalculator.ts
│   │   └── formulaExpr.ts
│   ├── system/                          ← Batch 1 완료
│   │   └── systemIdentity.ts
│   ├── lesson/                          ← 신규 서브폴더 (Batch 3 생성)
│   │   └── onePointLibrary.ts           (AI-002)
│   ├── dataset/                         ← 신규 서브폴더 (Batch 3 생성)
│   │   ├── infra/
│   │   │   └── datasetStorage.ts        (DS-001+DS-004)
│   │   └── autoCapture.ts               (MISC-002)
│   └── ...                              ← 기존 domain 파일 유지
│       ├── publishedDatasetStore.ts     ← CL-002: search/corpus/ 재배치 대기
│       ├── workspaceHistory.ts
│       ├── aiAutoCommentViewModel.ts
│       ├── userInfoPanelModel.ts
│       └── ...
│
├── overlay/                             ← Batch 2 완료
│   ├── router/
│   │   ├── adminOverlayRouter.ts
│   │   └── userOverlayRouter.ts
│   ├── state/
│   │   └── overlayStateMachine.ts
│   └── utils/
│       └── sysOverlayUtils.jsx
│
├── renderer/                            ← Batch 2 완료
│   ├── labels/
│   │   ├── labelScalePolicy.ts
│   │   └── systemAxisLabelModel.ts
│   └── trajectory/
│       ├── trajectoryRenderModel.ts
│       └── anchorConversionModel.ts
│
└── components/
    └── overlays/                        ← Batch 2 완료
        ├── SysOverlay.jsx
        ├── HptOverlay.jsx
        ├── AnchorEditOverlay.jsx
        └── AiOverlay.jsx
```

---

## 8. Architecture Consistency Review

### 8-1. Architecture Constitution 충돌 검토

| Constitution | 항목 | 충돌 여부 |
|-------------|------|----------|
| §1 App = Orchestrator | App.jsx → application/flows/ 호출로 강화 | ✅ 없음 |
| §6 업무 흐름 = Application Layer | application/flows/ 신설로 실현 | ✅ 없음 |
| §8 Dataset SSOT 분리 | `WORKING_DATASET_KEY` 상수 단일화 | ✅ 없음 |
| §9 USER/ADMIN corpus 경계 | adminLocalDbFlow ↔ adminSearchFlow 명확 분리 | ✅ 없음 |
| §12 App = Dataset 구조 모름 | Dataset merge는 Domain 함수 호출만 | ✅ 없음 |
| §13 App = Search 알고리즘 모름 | `runSpatialRecall` Domain 호출만 | ✅ 없음 |
| §16 AI/Lesson Domain 독립 | `domain/lesson/onePointLibrary.ts` 분리 | ✅ 없음 |
| §17 의존 단방향 | `App → flows → domain` 확인 | ✅ 없음 |
| §19 Phase 단위 변경 | STEP Lock Rule 준수 | ✅ 없음 |
| §20 Regression 없는 리팩터링 금지 | §5 Regression Strategy 완비 | ✅ 없음 |

### 8-2. Architecture Dictionary 충돌 검토

| 공식 용어 | 사용 여부 | 결과 |
|-----------|----------|------|
| Runtime Flow | 문서 내 "Runtime Flow" 우선 사용 | ✅ 없음 |
| Application Layer | `application/flows/` | ✅ 없음 |
| Domain Layer | `domain/` | ✅ 없음 |
| FlowContext (TypeScript type) | TypeScript 관례 허용 | ✅ 없음 |

### 8-3. ADR 충돌 검토

| ADR | 결과 |
|-----|------|
| ADR-001 App = Orchestrator | `application/flows/` 도입으로 강화 | ✅ 없음 |
| ADR-002 계산 = Calculation Domain | Flow는 계산 금지, Domain 호출만 | ✅ 없음 |
| ADR-004 Search = Search Domain 단일 Owner | `runSpatialRecall` Domain 호출, Flow는 호출만 | ✅ 없음 |
| ADR-005 Dataset = Domain/Infra만 | infra 분리로 강화 | ✅ 없음 |
| ADR-006 System = Contract 경유 | D-006/D-007 Debt 등록, Batch 6 해소 계획 | ⚠️ Open Debt (계획됨) |
| ADR-007 Capability = 단일 Owner | 각 Flow 단일 Owner 유지 | ✅ 없음 |
| ADR-008 의존 단방향 | `App → flows → domain` | ✅ 없음 |
| ADR-009 Overlay = Routing/Presentation | Overlay 관련 없음 | ✅ 없음 |
| ADR-010 App 불변 확장 | App.jsx에 계산·검색 로직 추가 없음 | ✅ 없음 |

### 8-4. Migration Map 충돌 검토

Part A 모든 Target Layer/Folder/File/Function 변경 없음. STEP 3-7 분리(3-7A/3-7B)는 내부 세분화이며 Map 변경 아님.

### 8-5. PROJECT_MASTER_INDEX / PROJECT_LOG 충돌 검토

현재 문서와 충돌 없음. Batch 3 완료 후 두 문서 업데이트 필요 (Batch Workflow 규칙 준수).

**결론: 모든 Architecture 문서와 충돌 없음.**

---

## 9. Batch 3 종료 예상 상태

| 항목 | Before (Batch 2 완료) | After (Batch 3 완료 예상) |
|------|----------------------|--------------------------|
| App.jsx 라인 | 6,509 lines | ~5,400 lines (−1,100) |
| application/flows/ 파일 | 0개 | **8개** |
| domain/lesson/ 파일 | 0개 | **1개** (onePointLibrary.ts) |
| domain/dataset/infra/ 파일 | 0개 | **1개** (datasetStorage.ts) |
| domain/dataset/ 파일 | 0개 | **1개** (autoCapture.ts) |
| App.jsx localStorage 직접 접근 | DS-001/004 범위 존재 | **0회** (infra 경유) |
| App.jsx async 흐름 | 2개 (handlePositionRecall, handleUserSearchStrategies) | **0개** (flows 위임) |
| Application Layer | 미존재 | **신설** (application/flows/) |
| Migration Debt Open | D-001, D-004, D-005 | D-001, D-004, D-005, **D-006, D-007, D-008** |
| Cleanup Backlog | 0건 | **CL-001~005 (5건)** |

**Batch 4 진입 조건:**

```
□ npm run build Final PASS
□ Cleanup 처리 — CL-003 (Dead code 제거) 적용 후 cleanup commit
□ CL-002 처리 여부 결정 (publishedDatasetStore.ts 재배치 — 선택)
□ git push origin main
□ PROJECT_MASTER_INDEX.md 업데이트
□ PROJECT_LOG_2026-07.md 업데이트
□ SESSION_HANDOFF_CURSOR.md 업데이트           ← AC-17
□ 문서 commit
```

---

## 10. Design Completeness Checklist

```
Architecture Decision
□ AD-B3-01  Application Flow Layer 도입             ✅ 확정
□ AD-B3-02  Flow Context Pattern (Hybrid Object)    ✅ 확정
□ AD-B3-03  RecallHydrate = Pure Params             ✅ 확정
□ AD-B3-04  STEP 3-7A / 3-7B 분리                  ✅ 확정
□ AD-B3-05  Debt / Cleanup 분리                     ✅ 확정

Flow Context Interface
□ RecallHydrateFlow   Pure Function Params (Context 없음) ✅
□ AdminLocalDbFlow    AdminLocalDbFlowContext              ✅
□ AdminSearchFlow     AdminSearchFlowContext               ✅
□ UserSearchFlow      UserSearchFlowContext                ✅
□ SaveFlow            SaveFlowContext + SaveFlowResult     ✅
□ HistoryFlow         HistoryFlowContext                   ✅
□ ResetFlow           ResetFlowContext                     ✅
□ BallDragFlow        BallDragFlowContext                  ✅

Open Question
□ Q1 Object Context vs Params     ✅ Hybrid Object Context (AD-B3-02)
□ Q2 in-flight guard 위치         ✅ App.jsx 보유 (AD-B3-02)
□ Q3 DS-007 재배치 여부            ✅ CL-002 Cleanup Backlog (미재배치)
□ Q4 calculateByProfileExpr 이동  ✅ D-008 Open Debt (Batch 4 해소)
□ Q5 AI-001 레슨 핸들러            ✅ App.jsx 유지 + AI-002 I/O 분리

Migration Sequence
□ STEP 3-1 ~ 3-8 (+3-7A/B)       ✅ 9 STEP 전부 정의
□ 각 STEP: Target / 변경파일 / Rollback / Architecture 목적 ✅

STEP Lock Rule
□ 종료 조건 5항 (Build/Regression/ImportGraph/ArchRule/Commit)  ✅
□ STEP Flow 정의                   ✅
□ Rollback 정책                    ✅
□ 의존 STEP 진행 규칙               ✅

Regression
□ 공통 R-B3-C1~C8                  ✅
□ STEP별 Regression (3-1~3-8)     ✅ 전 STEP 정의
□ Regression ID 부여                ✅

Acceptance Criteria
□ AC-1~AC-17                       ✅ 17항 전부 정의
□ AC-17 SESSION_HANDOFF 업데이트    ✅ Batch 3 완료 조건에 포함

Migration Debt
□ D-001, D-004~D-008 Open Debt     ✅
□ CL-001~CL-005 Cleanup Backlog    ✅

Architecture Consistency
□ Constitution 충돌 없음            ✅
□ Dictionary 충돌 없음              ✅
□ ADR 충돌 없음 (D-006/007 계획됨) ✅
□ Migration Map 변경 없음           ✅

Batch 4 영향
□ CAL-002/003/005 이동 금지         ✅ 명시
□ CAL-005 이동 금지                 ✅ 명시
□ D-008 → Batch 4 인계             ✅

Implementation Ready
□ Open Question 없음               ✅ Q1~Q5 전부 해결
□ Cursor Agent가 STEP 3-1부터 즉시 착수 가능   ✅
```

---

## Appendix — Future Enhancement (Deferred)

### FE-001: RuntimeFlowContext Base Interface 추상화

| 항목 | 내용 |
|------|------|
| **Status** | Deferred |
| **Expected Target** | **Batch 5 Runtime Contract Design** |
| **내용** | Batch 5 Runtime Contract 설계 시 `FlowRead` / `FlowWrite` / `FlowAction` 공통 인터페이스 추상화를 검토한다. 이 시점에 Return-based 패턴(Option B)으로의 부분 전환도 함께 검토한다. |
| **Reason** | Batch 3에서는 Context 중복(READ/WRITE/ACTION/HELPER 필드)을 허용하여 Migration 안정성을 우선한다. 각 Flow가 독립적이어야 독립 rollback이 보장된다. |
| **SESSION_HANDOFF 이관** | **이 항목은 반드시 SESSION_HANDOFF_CURSOR.md에 다음 세션 인계 항목으로 기록되어야 한다.** Batch 5 Design 착수 전 반드시 재검토한다. |

---

### FE-002: Reserved

> 내용 미정. Batch 4 완료 후 결정 예정.

---

### FE-003: Reserved

> 내용 미정. Batch 4~5 진행 중 결정 예정.

---

*End of Batch3_Design.md v1.0 — Implementation Ready*
