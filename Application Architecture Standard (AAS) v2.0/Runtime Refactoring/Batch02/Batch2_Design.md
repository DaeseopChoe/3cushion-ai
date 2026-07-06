# Batch2_Design.md

```text
Document  : Batch2_Design.md
Version   : v1.1
Status    : Approved — Implementation Ready
Date      : 2026-07-06
Baseline  : commit 625bfa3 (Batch 1 완료)
Standard  : AAS v2.0 + App_Migration_Map.md (Constitution)
Rule      : Migration Map Batch 순서·Target 변경 금지. Presentation 계산 금지.
```

## Revision History

| Version | 변경 내용 | 날짜 |
|---------|----------|------|
| v1.0 | 최초 작성 — AD-B2-01/02/03, Migration Sequence, Regression Strategy, Acceptance Criteria, Design Consistency Review | 2026-07-06 |
| v1.1 | STEP Lock Rule 추가 (Implementation Safety Rule) · Architecture 변경 없음 | 2026-07-06 |

---

## 0. 목적 및 범위

Batch 2는 **Presentation Layer 분리**이다.

App.jsx에서 Renderer · Label · Overlay 인라인 컴포넌트를 독립 파일로 추출하여
App.jsx가 Presentation 조립(Composition) · Routing · State 연결 · Orchestration만 담당하도록 만든다.

본 문서는 Batch 2 구현 전 Architecture Decision을 확정하고
구현 순서 · 회귀 전략 · STEP Lock Rule · 인수 기준을 정의한다.

**이 문서에서 결정하지 않는 것:**
- Batch 3 이후 항목 (Search / Dataset / Application Flow)
- CAL-005 Domain 이동 (Batch 4 예정)
- Runtime Contract (Batch 6 예정)
- App.jsx 영구 유지 항목 (APP-002/006/007/012 등)

---

## 1. Architecture Decision Record (Batch 2)

### AD-B2-01 — Presentation Layer는 UI만 포함한다

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | OVL-005 (SysOverlay) |
| **Decision** | Presentation Component 내부에 실시간 계산 (CAL-005)을 포함하지 않는다. SysOverlay는 props를 받아 화면만 그린다. |
| **Chosen Option** | **Option B — Props-driven Pure Presentation** |
| **Flow** | `App.jsx (Orchestrator)` → `Calculation Domain (CAL-005 호출)` → `결과값` → `<SysOverlay calcResult={...} />` |
| **Reason** | Batch 1에서 Domain Extraction이 완료된 상태에서 Presentation Component에 계산을 재도입하는 것은 ADR-002(계산 = Calculation Domain)·ADR-009(Overlay = Routing/Presentation) 위반이다. Presentation Purity를 즉시 확보해야 Batch 4 CAL-005 Domain 이동의 Migration Debt를 최소화할 수 있다. |
| **Rejected Option** | **Option A — Migration Debt 허용** — SysOverlay.jsx에 CAL-005 코드를 그대로 이동. R-OVL-2 위반 상태를 Batch 4까지 유지. → 아키텍처 방향성과 불일치하므로 기각. |
| **Implementation Impact** | SysOverlay props 인터페이스 확장 (computeValues 주입). CAL-005 계산 코드는 Batch 2에서 App.jsx scope로 lift-up (임시 위치). Batch 4에서 `domain/calculator/systemValueCalculator.ts`로 이동 완료 예정. |
| **Architecture Rules** | R-OVL-2 준수 · R-DOM-1 준수 · ADR-002 · ADR-009 |
| **Migration Map** | Batch/Priority/Target 변경 없음. CAL-005는 Batch 4 대상 유지. |

**SysOverlay 인터페이스 설계 방향 (Batch 2):**

```
현재 (인라인):
  function SysOverlay({ data, onSave, onCancel })
    → 내부에서 calculateByProfileExpr, solveFiveHalfTwoOfThree 등 직접 호출

이후 (Batch 2):
  function SysOverlay({ data, onSave, onCancel, computeValues })
    - computeValues: (formData) => ComputedValues  ← App이 Domain 함수 래핑하여 주입
    - SysOverlay는 formData 변경 시 computeValues() 호출, 결과만 표시
    - 계산 함수 구현체는 App.jsx에 위치 (임시, Batch 4 이전까지)
```

---

### AD-B2-02 — `sysOverlayInputFinite` module-private 복귀

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | `domain/calculator/fiveHalfCalculator.ts` · OVL-005 (SysOverlay) |
| **Decision** | Batch 2 완료 시점에 `sysOverlayInputFinite`의 export를 제거하고 module-private helper로 복귀시킨다. |
| **Background** | Batch 1에서 App.jsx 인라인 SysOverlay가 `sysOverlayInputFinite`를 직접 호출했기 때문에 임시 export 상태(@internal)로 노출되었다. Migration Debt D-002로 등록된 상태. |
| **Trigger** | OVL-005가 `components/overlays/SysOverlay.jsx`로 분리되면 `computeValues` 구현체 내부에서만 사용되므로 외부 export 불필요. |
| **Outcome** | `sysOverlayInputFinite` → `fiveHalfCalculator.ts` 내부 private function으로 복귀. |
| **Migration Debt** | **D-002 Close** — Batch 2 (STEP 2-6) 완료 시 D-002 Closed 기록. |
| **Related Rule** | R-DOM-1 · ADR-002 |

---

### AD-B2-03 — Overlay Router Pattern: React Hook 채택

| 항목 | 내용 |
|------|------|
| **Status** | Accepted |
| **Scope** | OVL-001 · OVL-002 · OVL-003 |
| **Decision** | Factory Function 패턴 대신 **React Hook 패턴**을 채택한다. |
| **Chosen Pattern** | `useAdminOverlayRouter()` / `useAdminOverlayLifecycle()` / `useUserOverlayRouter()` |
| **Reason** | React state/callback/effect 의존성이 다수 포함되어 Hook 패턴이 자연스럽고 R-APP-2(Provider/Hook 결선)와 일관된다. |
| **Rejected Pattern** | Factory Function → stale closure 위험. 기각. |
| **Related Rule** | R-APP-2 · R-OVL-1 · ADR-001 · ADR-009 |

---

## 2. Migration Debt 현황 (Batch 2 기준)

| ID | 항목 | Target Batch | Status |
|----|------|-------------|--------|
| D-001 | Legacy Alias 4개 제거 | Soft: Batch 4 / Hard: Batch 6 착수 전 | Open |
| D-002 | `sysOverlayInputFinite` private 전환 | **Batch 2** (STEP 2-6) | **Batch 2 Close 목표** |
| D-003 | `domain/*` 3파일 `isFiveHalfSystemId` 중복 통합 | Unscheduled (Batch 4 이전 권장) | Open |
| D-004 | SysOverlay 내 `SYSTEM_OPTIONS` 하드코딩 | Batch 6 (Runtime Contract 후) | Open (Batch 2 발생) |
| D-005 | TRJ-002 `labelStrategy` 내 `systemIdForGrid === "5_half_system"` 직접 분기 | Batch 6 | Open (Batch 2 발생) |

---

## 3. Batch 2 Migration Sequence (구현 순서)

```text
STEP 2-1   OVL-007   AnchorEditOverlay      ← 44 lines, 의존 없음 (최저위험)
             └─ components/overlays/AnchorEditOverlay.jsx

STEP 2-2   OVL-006   HptOverlay             ← ~738 lines, useHptController 의존
             └─ components/overlays/HptOverlay.jsx

STEP 2-3   OVL-008   AiOverlay              ← ~348 lines, DnD 의존
             └─ components/overlays/AiOverlay.jsx
             └─ [ensureLessonItems + SortableItem 동반 이동]

STEP 2-4   OVL-001   adminOverlayRouter     ← useAdminOverlayRouter() hook
             OVL-002   overlayStateMachine   ← useAdminOverlayLifecycle() hook
             OVL-003   userOverlayRouter     ← useUserOverlayRouter() hook
             └─ overlay/router/adminOverlayRouter.ts
             └─ overlay/state/overlayStateMachine.ts
             └─ overlay/router/userOverlayRouter.ts

STEP 2-5   APP-013   labelScalePolicy       ← useSysLabelScale() hook
             RND-002   systemAxisLabelModel  ← buildSystemValueLabelModel()
             TRJ-002   trajectoryRenderModel ← buildTrajectoryRenderModel()
             RND-004   anchorConversionModel ← buildRgAnchors() (partial)
             └─ renderer/labels/labelScalePolicy.ts
             └─ renderer/labels/systemAxisLabelModel.ts
             └─ renderer/trajectory/trajectoryRenderModel.ts
             └─ renderer/trajectory/anchorConversionModel.ts

STEP 2-6   OVL-005   SysOverlay             ← ~1,048 lines, AD-B2-01 적용
             └─ components/overlays/SysOverlay.jsx
             └─ [AD-B2-02: sysOverlayInputFinite export 제거 + D-002 Close]
```

---

## 4. STEP Lock Rule (Implementation Safety Rule)

> **v1.1 추가 항목**

Batch 2는 약 2,600 lines 이동 · 신규 폴더 다수 생성 · Presentation Layer 대규모 분리 작업이다.
각 STEP은 독립적인 Rollback Point를 형성한다.
중간 회귀 발생 시 해당 STEP Commit으로 즉시 복구할 수 있도록 한다.

### 4-1. STEP 종료 조건

다음 조건을 **모두** 만족해야 다음 STEP으로 진행한다.
하나라도 미충족이면 다음 STEP으로 진행하지 않는다.

```
□ npm run build PASS
□ STEP Regression Checklist PASS (섹션 5 참조)
□ Import Graph Validation PASS (순환참조 0 · 역방향 0)
□ Architecture Rule 위반 없음 (신규 위반 추가 없음)
□ git commit 완료 (STEP Baseline 생성)
```

### 4-2. STEP Flow

```text
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
- Batch 2 전체를 한 번에 구현한 후 커밋하는 방식은 사용하지 않는다.
- 각 STEP commit message 형식: `feat(runtime): Batch2 STEP 2-N - [항목명] extraction`

### 4-4. Design Consistency Review — STEP Lock Rule

STEP Lock Rule은 Implementation Process Rule이며 Architecture 변경이 아니다.

| 문서 | 충돌 여부 | 근거 |
|------|----------|------|
| Architecture_Constitution | ✅ 없음 | Constitution-19(Phase 단위 변경), Constitution-20(Regression 없는 리팩터링 금지)을 강화하는 규칙 |
| Architecture_Dictionary | ✅ 없음 | 신규 Architecture 용어 없음 |
| ADR-001~010 | ✅ 없음 | ADR은 Architecture Decision. STEP Lock Rule은 Implementation Safety Process |
| App_Migration_Map Part A | ✅ 없음 | Batch/Priority/Target 변경 없음 |
| App_Migration_Map Part D | ✅ 강화 | D-1 Regression Checklist(#11)·D-2 Approval Flow([9] Regression & Build)를 STEP 단위로 세분화하여 강화 |
| PROJECT_MASTER_INDEX | ✅ 없음 | 프로젝트 상태 문서, 충돌 없음 |
| PROJECT_LOG_2026-07 | ✅ 없음 | 이력 문서, 충돌 없음 |

**결론: 충돌 없음. STEP Lock Rule은 기존 Architecture와 완전 정합.**

---

## 5. Regression Strategy

### 5-1. STEP별 Regression Checklist

| STEP | 대상 | 회귀 확인 항목 |
|------|------|--------------|
| 2-1 | AnchorEditOverlay | ADMIN 앵커 편집 모달 열림·값 적용·취소 정상 |
| 2-2 | HptOverlay | ADMIN HP/T 편집 열림·hit_point 저장·STR 편집·저장 정상 |
| 2-3 | AiOverlay | ADMIN AI 패널 열림·자동 코멘트 표시·레슨 DnD·저장·전체 적용 정상 |
| 2-4 | Overlay Router | ADMIN 오버레이 SYS/HPT/STR/AI 개폐 · auto-close · USER 오버레이 dismiss/close 정상 |
| 2-5 | Renderer | phone landscape 라벨 배율 1.5× · 시스템값 라벨 표시 · Display Cap · Trajectory 라벨 깊이 정상 |
| 2-6 | SysOverlay | SYS 오버레이 열림·계산·5½ 2-of-3·저장·취소 정상 |

### 5-2. 공통 Regression Checklist (매 STEP)

```
R-1   npm run build  exit 0
R-2   App.jsx import graph: 순환참조 0
R-3   Presentation → Domain 역방향 import 없음
R-4   기존 USER Search 동작 불변 (Published corpus)
R-5   기존 ADMIN Search/Recall 동작 불변
R-6   기존 5_half_system 계산 결과 불변 (Sn, C4/5/6)
R-7   기존 Trajectory 시각 표시 불변
R-8   기존 Dataset load/fetch 동작 불변
R-9   기존 overlay 기본 동작 불변 (open/close)
R-10  Import Graph Validation: 역방향 0, 순환 0
```

### 5-3. STEP 2-6 전용 Regression (AD-B2-01 검증)

```
R-B2-01   SysOverlay props 변경 후 계산 결과값 동일 (기존 인라인 계산과 동일 output)
R-B2-02   sysOverlayInputFinite export 제거 후 빌드 오류 없음
R-B2-03   5½: 2-of-3 계산, C3_r → CO_f 역산 정상
R-B2-04   비 5½: calculateByProfileExpr 결과 표시 정상
R-B2-05   보정값 (slide/curve_ratio/spin/departure) 반영 정상
```

---

## 6. Acceptance Criteria

| # | 항목 | 기준 |
|---|------|------|
| AC-1 | npm run build | ✅ exit 0 |
| AC-2 | App.jsx 라인 수 | ~2,500+ lines 감소 확인 |
| AC-3 | 신규 폴더 | `renderer/labels/`, `renderer/trajectory/`, `overlay/router/`, `overlay/state/`, `components/overlays/` |
| AC-4 | 신규 파일 | 11개 모두 생성 |
| AC-5 | Import Graph | 순환참조 0 · 역방향 0 |
| AC-6 | Presentation 무계산 | `SysOverlay.jsx`에 `calculateByProfileExpr`, `solveFiveHalfTwoOfThree` 직접 호출 없음 |
| AC-7 | D-002 Close | `sysOverlayInputFinite` export 제거 확인 |
| AC-8 | Named Export Only | 신규 파일 모두 Named Export. Default Export / Barrel Export 없음 |
| AC-9 | 공통 Regression R-1~R-10 | 전체 PASS |
| AC-10 | STEP 2-6 Regression R-B2-01~05 | 전체 PASS |
| AC-11 | AD-B2-03 패턴 | overlay/router·state 파일 모두 Hook export |
| AC-12 | STEP Lock Rule | 각 STEP git commit 완료 확인 |

---

## 7. Target Folder / File 구조

```text
frontend/src/
│
├── renderer/                              ← 신규 폴더
│   ├── labels/
│   │   ├── labelScalePolicy.ts            (APP-013) useSysLabelScale()
│   │   └── systemAxisLabelModel.ts        (RND-002) buildSystemValueLabelModel()
│   └── trajectory/
│       ├── trajectoryRenderModel.ts       (TRJ-002) buildTrajectoryRenderModel()
│       └── anchorConversionModel.ts       (RND-004 partial) buildRgAnchors()
│
├── overlay/                               ← 신규 폴더
│   ├── router/
│   │   ├── adminOverlayRouter.ts          (OVL-001) useAdminOverlayRouter()
│   │   └── userOverlayRouter.ts           (OVL-003) useUserOverlayRouter()
│   └── state/
│       └── overlayStateMachine.ts         (OVL-002) useAdminOverlayLifecycle()
│
└── components/
    └── overlays/                          ← 신규 서브폴더
        ├── SysOverlay.jsx                 (OVL-005)
        ├── HptOverlay.jsx                 (OVL-006)
        ├── AnchorEditOverlay.jsx          (OVL-007)
        └── AiOverlay.jsx                  (OVL-008)
```

---

## 8. Architecture Rules 준수 요약

| Rule | 준수 | 비고 |
|------|------|------|
| R-APP-1 | ✅ | App 계산 상태 추가 없음 (CAL-005 lift-up은 임시 Orchestration scope) |
| R-APP-2 | ✅ | AD-B2-03 Hook 패턴 |
| R-APP-3 | ✅ | App 핸들러는 Hook 호출만 |
| R-APP-4 | ✅ | 표시 계산 → Renderer 모듈 이동 |
| R-DOM-1 | ✅ | AD-B2-01로 SysOverlay 계산 제거 |
| R-OVL-1 | ✅ | OVL-001~003 → overlay/router·state |
| R-OVL-2 | ✅ | AD-B2-01 채택으로 SysOverlay.jsx 계산 없음 |
| R-RND-1 | ✅ | renderer/* 표시 모델만 생성 |
| R-SYS-1 | ⚠️ | TRJ-002 labelStrategy 직접 분기 → D-005, Batch 6 해소 |
| R-RT-1  | ⚠️ | RND-004 SYSTEM_PROFILES 잔존 → Batch 5 해소 |

---

*End of Batch2_Design.md v1.1*
