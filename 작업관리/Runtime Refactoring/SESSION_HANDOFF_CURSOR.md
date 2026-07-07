# SESSION_HANDOFF_CURSOR.md

**Baseline:** Batch 4 Complete  
**Created:** 2026-07-06  
**Updated:** 2026-07-07 — Batch 4 Closure 완료 · Batch 5 Ready  
**Purpose:** 새 Cursor 세션에서 이 문서 하나만 읽고 Batch 5 Design 착수를 바로 시작한다.

---

## 1. Project Status

| 항목 | 상태 |
|------|------|
| Branch | `main` |
| Remote | `origin/main` |
| Working Tree | Batch 4 Closure 문서 커밋 대기 |
| Last Batch4 Commit | `02dd47f` (STEP 4-4 resolveSlotSys ViewModel extraction) |

### Runtime Migration 진행률

| Batch | 대상 | 상태 |
|-------|------|------|
| **Batch 1** | Domain Layer — 순수 함수·정규화·파서 | ✅ Complete |
| **Batch 2** | Presentation Layer — Overlay · Renderer · Router | ✅ Complete |
| **Batch 3** | Application Flow · Search · Dataset · AI Domain | **✅ Complete (2026-07-07)** |
| **Batch 4** | CAL-002/003/005, MISC-004 — Calculation Domain | **✅ Complete (2026-07-07)** |
| **Batch 5** | TRJ-001/003, RND-003, APP-009 — Trajectory Runtime | **⏳ Ready — Design 착수 가능** |
| Batch 6 | SYS-001~003/006, DS-006 — Runtime Contract | ⏳ Pending (Blocker) |

### Working Tree (Closure 시점)

```
 M 작업관리/HISTORY/PROJECT_LOG_2026-07.md
 M 작업관리/PROJECT_MASTER_INDEX.md
 M 작업관리/Runtime Refactoring/SESSION_HANDOFF_CURSOR.md
```

> Batch 4 Closure 문서 commit 후 Batch 5 Design 착수.

---

## 2. Current Baseline

### Batch 1 Baseline

```
Commit : 625bfa3
Title  : feat(runtime): complete Batch 1 Domain Extraction baseline
Date   : 2026-07-06
```

### Batch 3 Final Baseline

```
Commit : b7d7712
Title  : feat(batch3): STEP 3-8 - ballDragFlow extraction (CAL-006)
Date   : 2026-07-07
App.jsx: 5,807 lines (Batch 2 대비 −702)
```

### Batch 3 STEP 커밋 이력

| STEP | Commit | Title |
|------|--------|-------|
| 3-1 | `252be8f` | onePointLibrary persistence extraction (AI-002) |
| 3-2 | `4f0aac6` | dataset infrastructure extraction |
| 3-3 | `eca7e19` | recallHydrate flow extraction (CAL-004) |
| 3-4 | `2af68b6` | reset flow extraction (SRCH-004) |
| 3-5 | `778e2d4` | admin LocalDB flow extraction (SRCH-001) |
| 3-6 | `e13d183` | published search flow extraction (SRCH-002 SRCH-003) |
| 3-7A | `38fe4b2` | save flow extraction (SRCH-005 DS-002) |
| 3-7B | `e35c600` | history flow extraction (DS-003) |
| 3-8 | `b7d7712` | ballDragFlow extraction (CAL-006) |

---

## 3. Batch 2 Summary

### 분리한 것

| 파일 | 분리 항목 | Migration ID |
|------|----------|-------------|
| `components/overlays/AnchorEditOverlay.jsx` | 앵커 좌표 편집 오버레이 | OVL-006 |
| `components/overlays/HptOverlay.jsx` | HP/T + STR 오버레이 | OVL-002/003 |
| `components/overlays/AiOverlay.jsx` | AI 코멘트·레슨 오버레이 | OVL-008 |
| `components/overlays/SysOverlay.jsx` | SYS 오버레이 (AD-B2-01 Pure) | OVL-005 |
| `overlay/utils/sysOverlayUtils.jsx` | SysOverlay 공유 헬퍼 16개 | — |
| `overlay/router/adminOverlayRouter.ts` | useAdminOverlayRouter | OVL-001 |
| `overlay/state/overlayStateMachine.ts` | useAdminOverlayLifecycle | OVL-001 |
| `overlay/router/userOverlayRouter.ts` | useUserOverlayRouter | OVL-007 |
| `renderer/labels/labelScalePolicy.ts` | useSysLabelScale | APP-013 |
| `renderer/trajectory/trajectoryRenderModel.ts` | buildTrajectoryRenderModel | TRJ-002 |
| `renderer/labels/systemAxisLabelModel.ts` | buildSystemAxisLabelModel | RND-002 |
| `renderer/trajectory/anchorConversionModel.ts` | buildRgAnchors | RND-004 |

### App.jsx 라인 변화

```
Before : 8,983 lines
After  : 6,509 lines
Delta  : −2,474 lines
```

### Architecture Decisions (Batch 2)

| ID | 결정 | 요약 |
|----|------|------|
| AD-B2-01 | Presentation Layer Pure | SysOverlay는 계산 금지. computeValues / solveFiveHalf를 props로 주입 |
| AD-B2-02 | sysOverlayInputFinite module-private | fiveHalfCalculator.ts export 제거 → SysOverlay.jsx 내부 checkInputFinite |
| AD-B2-03 | Overlay Router Hook Pattern | useAdminOverlayRouter · useAdminOverlayLifecycle · useUserOverlayRouter |

### Migration Debt 현황

| ID | 항목 | Status |
|----|------|--------|
| D-001 | Legacy Alias 4개 제거 | Open (Batch 4/6) |
| D-002 | sysOverlayInputFinite private 전환 | **Closed** ✅ |
| D-003 | isFiveHalfSystemId 중복 통합 | Open (Unscheduled) |
| D-004 | SysOverlay SYSTEM_OPTIONS 하드코딩 | Open (Batch 6) |
| D-005 | labelStrategy 직접 분기 | Open (Batch 6) |

---

## 4. Current Architecture

### 파일 트리 (Batch 2 완료 기준)

```
frontend/src/
│
├── App.jsx                          ← Orchestrator (6,509 lines)
│
├── domain/                          ← Domain Layer (Batch 1 완료)
│   ├── system/
│   │   └── systemIdentity.ts        ← canonicalSystemId · getSystemMode · isFiveHalf
│   ├── calculator/
│   │   ├── fiveHalfCalculator.ts    ← solveFiveHalfTwoOfThree · fiveHalfComputedInputKey
│   │   └── formulaExpr.ts           ← parseSysFormulaExpr · getDisplayExprForSys
│   └── ...                          ← 기존 domain 파일들 (검색·Dataset·AI 등)
│
├── components/overlays/             ← Presentation Layer (Batch 2 완료)
│   ├── AnchorEditOverlay.jsx
│   ├── HptOverlay.jsx               ← HptOverlay + StrOverlay
│   ├── AiOverlay.jsx                ← AiOverlay + ensureLessonItems + LessonRow
│   └── SysOverlay.jsx               ← AD-B2-01 Pure Presentation
│
├── overlay/                         ← Overlay Routing Layer (Batch 2 완료)
│   ├── router/
│   │   ├── adminOverlayRouter.ts    ← useAdminOverlayRouter
│   │   └── userOverlayRouter.ts     ← useUserOverlayRouter
│   ├── state/
│   │   └── overlayStateMachine.ts   ← useAdminOverlayLifecycle
│   └── utils/
│       └── sysOverlayUtils.jsx      ← SysOverlay 공유 헬퍼 16개
│
├── renderer/                        ← Renderer Layer (Batch 2 완료)
│   ├── labels/
│   │   ├── labelScalePolicy.ts      ← useSysLabelScale
│   │   └── systemAxisLabelModel.ts  ← buildSystemAxisLabelModel
│   └── trajectory/
│       ├── trajectoryRenderModel.ts ← buildTrajectoryRenderModel
│       └── anchorConversionModel.ts ← buildRgAnchors
│
├── hooks/                           ← App Hooks (미분리, Batch 3+ 대상)
├── utils/                           ← Utilities (일부 미분리)
├── data/                            ← System Data (Batch 6 Runtime Contract 대상)
└── admin/                           ← Admin 전용 모듈
```

### Layer Owner 정리

| Layer | Owner | 역할 | 계산 가능 여부 |
|-------|-------|------|--------------|
| App.jsx | Orchestrator | 상태 조합·라우팅·렌더 조립 | ❌ (계산 직접 보유 금지) |
| domain/ | Domain | 순수 계산·정규화 | ✅ |
| renderer/ | Renderer | 렌더 모델 빌드 | ❌ (Domain 호출 가능) |
| overlay/ | Overlay | 오버레이 라우팅·상태 | ❌ |
| components/overlays/ | Presentation | UI 렌더링 | ❌ (계산은 props로만) |

---

## 5. Confirmed Architecture Rules

### 영구 규칙 (변경 불가)

```
1.  App.jsx = Orchestrator ONLY
    - 계산 직접 보유 금지
    - Domain 함수는 props로 주입

2.  Named Export Only
    - Default Export 금지
    - Barrel Export 금지

3.  Dependency 단방향
    - Domain → Presentation (허용)
    - Presentation → Domain (금지)
    - 역참조 금지 / 순환참조 금지

4.  Presentation Layer는 계산하지 않는다 (AD-B2-01)
    - 계산 함수는 반드시 props로 주입받는다

5.  Runtime Contract 우회 금지
    - System JSON 직접 접근 금지
    - Batch 6 전까지 현재 구조 유지

6.  Batch 순서 변경 금지 (1→2→3→4→5→6)

7.  Migration Map 변경 금지
    - App_Migration_Map.md SSOT 유지
```

### Process 규칙 (STEP Lock Rule)

```
각 STEP 종료 조건:
  ① npm run build PASS
  ② Regression Checklist PASS
  ③ Import Graph Validation PASS (순환참조 0, 역방향 0)
  ④ Architecture Rule 위반 없음
  ⑤ git commit 완료 (STEP Baseline 생성)

위 조건 미충족 시 다음 STEP 진행 불가.
```

---

## 6. Remaining Migration Plan

### Batch 3 — Application Flow · Search · Dataset · AI Domain

**위험도:** 중간  
**대상:** SRCH-001~005, DS-001~007, CAL-004/006, AI-001~003

```
분리 예정 항목:
- Search 로직 (useShotSlots 등 일부)
- Dataset 접근 레이어
- AI 자동 코멘트 빌더
- Application Flow 훅
```

**절차:** Analysis → Design → Review → Implementation → Validation

---

### Batch 4 — 고위험 계산

**위험도:** 높음  
**대상:** CAL-002/003/005, MISC-004

```
- 실시간 계산 블록 (CAL-005) 분리
- Legacy Alias D-001 제거 (Soft Gate)
- 물리·궤적 계산 일부
```

---

### Batch 5 — 최고위험 궤적

**위험도:** 매우 높음  
**대상:** TRJ-001/003, RND-003, APP-009

```
- 궤적 생성 코어
- Hermite segment 분리
- 앵커 렌더링 파이프라인
```

---

### Batch 6 — Runtime Contract (Blocker)

**위험도:** 최고  
**대상:** SYS-001/002/003/006, DS-006

```
- System JSON Runtime Contract 전환
- SYS_SYSTEM_CONFIG 교체
- Legacy Alias 최종 제거 (Hard Deadline)
- D-004, D-005 해소
```

> **주의:** Batch 6은 Runtime Contract가 확정되어야 시작 가능.  
> Batch 1~5 완료 후 착수.

---

## 7. Migration Debt (Batch 3 Design 승인 시점)

> **Migration Debt 분류 기준 (AD-B3-05):** Runtime Contract / Architecture Rule / ADR / Constitution 중 하나 이상을 위반하여 Batch Migration을 Block하거나 Runtime Contract 이행을 막는 항목만 포함한다. Cleanup 성격은 §7-2 Cleanup Backlog로 관리한다.

### 7-1. Migration Debt Ledger

| ID | 항목 | Target | Status |
|----|------|--------|--------|
| D-001 | Legacy Alias 4개 (`canonicalSystemIdForConfig` 등) 제거 | Soft: Batch 4 / Hard: Batch 6 전 | 🟡 Open |
| D-002 | `sysOverlayInputFinite` private 전환 | Batch 2 완료 | ✅ Closed |
| D-004 | `SysOverlay.jsx` 내 `SYSTEM_OPTIONS` 하드코딩 | Batch 6 | 🟡 Open |
| D-005 | `labelStrategy` 내 `systemIdForGrid === "5_half_system"` 직접 분기 | Batch 6 | 🟡 Open |
| D-006 | `SYSTEM_PROFILES` 직접 접근 (Batch 3 구현 시 발생 예정) | Batch 6 | 🔜 Open |
| D-007 | `getAnchorsForSystem` 직접 접근 (Batch 3 구현 시 발생 예정) | Batch 6 | 🔜 Open |
| D-008 | `calculateByProfileExpr` 직접 호출 (Batch 3 구현 시 발생 예정) | Batch 4 | 🔜 Open |

### 7-2. Cleanup Backlog

| ID | 항목 | 권장 시기 |
|----|------|----------|
| CL-001 (구 D-003) | `domain/*` 3파일 `isFiveHalfSystemId` 중복 통합 | Batch 4 이전 |
| CL-002 (구 D-009) | `publishedDatasetStore.ts` → `search/corpus/` 재배치 | Batch 3 cleanup 또는 Batch 4 이전 |
| CL-003 | `handleSave` Dead code 제거 | Batch 3 cleanup |
| CL-004 | `STRContent` 컴포넌트 위치 이동 | Batch 3 또는 standalone |
| CL-005 | debug/trace 함수 정리 | Batch 4+ |

---

## 8. Batch 3 Design Summary

### Batch 3 Status

| 항목 | 상태 |
|------|------|
| Analysis | ✅ 완료 |
| Analysis Refinement | ✅ 완료 |
| Design v1.0 | ✅ **승인 완료 (2026-07-07) — Implementation Ready** |
| Implementation | 🔜 STEP 3-1 착수 대기 |

**Design SSOT:** `작업관리/Runtime Refactoring/Batch03/Batch3_Design.md`

### Migration Sequence (9 STEP)

```
STEP 3-1   AI-002          onePointLibrary persistence 격리
STEP 3-2   DS-001/004/005  Dataset Infrastructure 격리
STEP 3-3   CAL-004         recallHydrateFlow 추출
STEP 3-4   SRCH-004        resetFlow 추출
STEP 3-5   SRCH-001        adminLocalDbFlow 추출  ← STEP 3-3 선행 필수
STEP 3-6   SRCH-002/003    adminSearchFlow + userSearchFlow 추출
STEP 3-7A  SRCH-005+DS-002 saveFlow 추출          ← STEP 3-2 선행 필수
STEP 3-7B  DS-003          historyFlow 추출        ← STEP 3-7A 선행 필수
STEP 3-8   CAL-006         ballDragFlow 추출
```

### Architecture Decisions (Batch 3)

| ID | 결정 |
|----|------|
| AD-B3-01 | Application Flow Layer 도입 (`application/flows/`) |
| AD-B3-02 | Flow Context Pattern — Hybrid Object Context (READ/WRITE/ACTION/HELPER) |
| AD-B3-03 | RecallHydrate = Pure Function Parameter (Object Context 없음) |
| AD-B3-04 | STEP 3-7 → 3-7A (Save) + 3-7B (History) 분리 |
| AD-B3-05 | Migration Debt / Cleanup Backlog 분리 관리 |

### Batch 3 완료 조건 (Acceptance Criteria)

```
□ npm run build PASS
□ App.jsx ~5,400 lines 이하 (−1,100 이상)
□ application/flows/ 8개 파일 생성 확인
□ Import Graph 순환참조 0 / 역방향 0
□ App.jsx localStorage 직접 접근 DS-001/004 범위 제거 확인
□ 9개 STEP git commit 완료
□ D-006 / D-007 / D-008 Open Debt 등록 확인
□ git push origin main
□ PROJECT_MASTER_INDEX.md 업데이트
□ PROJECT_LOG_2026-07.md 업데이트
□ SESSION_HANDOFF_CURSOR.md 업데이트  ← AC-17
```

---

## 8-1. Deferred (Future Enhancement)

> **이 섹션의 항목은 다음 세션에서도 반드시 이관한다.**

### FE-001: RuntimeFlowContext Base Interface 추상화

| 항목 | 내용 |
|------|------|
| **Status** | Deferred |
| **Expected Target** | Batch 5 Runtime Contract Design 착수 시 |
| **내용** | `FlowRead` / `FlowWrite` / `FlowAction` 공통 인터페이스 추상화 검토. Return-based 패턴(Option B) 부분 전환도 함께 검토. |
| **주의** | **이번 Batch에서는 구현하지 않는다.** Batch 5 Design 착수 전에 반드시 다시 검토한다. |

---

## 9. Cursor Working Rules

### 필수 준수 (매 STEP)

- [ ] 한 번에 한 STEP만 구현한다
- [ ] STEP 구현 완료 → `npm run build` PASS 확인
- [ ] Build PASS → Regression Checklist 수동 확인
- [ ] Regression PASS → Import Graph 확인 (역방향·순환참조 0)
- [ ] Validation PASS → `git commit` (STEP Baseline 생성)
- [ ] 이전 STEP commit 완료 후에만 다음 STEP 진행
- [ ] Batch 전체를 한 번에 구현 후 커밋하는 방식 금지

### 필수 준수 (매 Batch 완료)

- [ ] `npm run build` Final PASS
- [ ] 불필요한 dead code 제거 후 cleanup commit
- [ ] `git push origin main`
- [ ] `작업관리/PROJECT_MASTER_INDEX.md` 업데이트
- [ ] `작업관리/HISTORY/PROJECT_LOG_YYYY-MM.md` 업데이트
- [ ] 문서 commit

### 금지 사항

```
❌ Batch 순서 변경
❌ Migration Map 변경
❌ Target Folder 변경
❌ Default Export 사용
❌ Barrel Export 사용
❌ Presentation Layer에서 계산 직접 수행
❌ Domain → Presentation 역방향 import
❌ Runtime Contract 우회 (System JSON 직접 접근)
```

### Shell 실행 규칙 (Windows / PowerShell)

```powershell
# Build — && 사용 불가, 세미콜론 사용
cd "D:\3Cushion AI\frontend"; npm run build

# Git — required_permissions: ["all"] 필요
git -C "D:\3Cushion AI" add -A
git -C "D:\3Cushion AI" commit -F "D:\3Cushion AI\_commit_msg.txt"
git -C "D:\3Cushion AI" push origin main

# Commit message — heredoc 불가, 파일 방식 사용
# Write commit message to file first, then:
git -C "D:\3Cushion AI" commit -F "D:\3Cushion AI\_commit_msg.txt"
```

---

## 9. Git Workflow

### STEP 단위

```
Implement
    ↓
npm run build  (D:\3Cushion AI\frontend 에서 실행)
    ↓
Regression Checklist (수동)
    ↓
Import Graph Validation
    ↓
git commit (STEP Baseline)
    ↓
Next STEP
```

### Batch 단위

```
All STEPs Complete
    ↓
Final Build PASS
    ↓
Dead Code Cleanup
    ↓
Final Commit
    ↓
git push origin main
    ↓
PROJECT_MASTER_INDEX 업데이트
    ↓
PROJECT_LOG 업데이트
    ↓
문서 Commit (선택)
```

---

## 10. Next Action

**Batch 4 공식 종료 완료. Batch 5 Ready.**

새 세션에서 반드시 순서대로 수행한다.

### Step 1 — 상태 확인

```bash
git -C "D:\3Cushion AI" log --oneline -10
git -C "D:\3Cushion AI" status
```

예상 결과:
- HEAD = Batch 4 Closure commit (docs)
- Batch 4 STEP commits: `c91422e` ~ `02dd47f` (4 commits)

---

### Step 2 — SSOT 문서 확인

다음 문서를 순서대로 읽는다:

1. `작업관리/PROJECT_MASTER_INDEX.md` — 현재 상태 SSOT (Batch 4 Complete, v1.16)
2. `작업관리/HISTORY/PROJECT_LOG_2026-07.md` — Batch 4 Closure 로그
3. `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` — Batch 5 대상 확인
4. **`작업관리/Runtime Refactoring/Batch04/Batch4_Closure.md`** — Batch 4 Closure SSOT
5. **`작업관리/Runtime Refactoring/SESSION_HANDOFF_BATCH5.md`** — Batch 5 Handoff

---

### Step 3 — Batch 5 Design 착수

- 대상: TRJ-001/003, RND-003, APP-009 — Trajectory Runtime (최고위험)
- Batch 4 Baseline: `02dd47f`
- **절대 금지:** Batch 6 선행 구현, Migration Map 변경, Batch 순서 변경

---

### [Deferred] FE-001 RuntimeFlowContext Base Interface

- Status: Deferred
- Expected Target: Batch 5 Runtime Contract Design
- Batch 3에서는 구현하지 않음. Batch 5 Design 착수 전 반드시 재검토.

---

### Open Migration Debt (Batch 4+ 해소 예정)

| ID | 항목 | 해소 Batch |
|----|------|-----------|
| D-006 | SYSTEM_PROFILES 직접 접근 | Batch 6 |
| D-007 | getAnchorsForSystem 직접 접근 | Batch 6 |
| D-008 | calculateByProfileExpr 직접 호출 | **✅ Closed (Batch 4)** |

---

## 참고 문서 경로

| 문서 | 경로 |
|------|------|
| Project SSOT | `작업관리/PROJECT_MASTER_INDEX.md` |
| 작업 로그 | `작업관리/HISTORY/PROJECT_LOG_2026-07.md` |
| **Batch 4 Closure SSOT** | **`작업관리/Runtime Refactoring/Batch04/Batch4_Closure.md`** |
| **Batch 5 Handoff** | **`작업관리/Runtime Refactoring/SESSION_HANDOFF_BATCH5.md`** |
| Migration Blueprint | `AAS v2.0/App_Migration_Map.md` |
| Architecture Constitution | `AAS v2.0/Architecture_Constitution.md` |
| Architecture Dictionary | `AAS v2.0/Architecture_Dictionary.md` |
| Batch 1 Design | `작업관리/Runtime Refactoring/Batch01/Batch1_Design.md` |
| Batch 2 Design | `작업관리/Runtime Refactoring/Batch02/Batch2_Design.md` |
| 이 문서 | `작업관리/Runtime Refactoring/SESSION_HANDOFF_CURSOR.md` |

---

*End of Handoff — Batch 4 Complete / Batch 5 Design Ready*
