# SESSION_HANDOFF_CURSOR.md

**Baseline:** `batch4-runtime-baseline`  
**Created:** 2026-07-06  
**Updated:** 2026-07-07 — Batch 4 Official Closed · Batch 5 Ready  
**Purpose:** 새 Cursor 세션에서 이 문서 하나만 읽고 Batch 5 Design 착수를 바로 시작한다.

---

## 1. Project Status

| 항목 | 상태 |
|------|------|
| **Batch 4** | **Official Closed** |
| **Batch 5** | **Ready — Design 착수 가능** |
| **Architecture Constitution** | **v2.1 — Active SSOT** |
| **Baseline Tag** | `batch4-runtime-baseline` |
| Branch | `main` |
| Remote | `origin/main` — 동기화 완료 |

### Runtime Migration 진행률

| Batch | 대상 | 상태 |
|-------|------|------|
| Batch 1~4 | Domain · Presentation · Flow · Calculation Runtime | ✅ Complete |
| **Batch 5** | TRJ-001/003, RND-003, APP-009 — Trajectory Runtime | **⏳ Ready** |
| Batch 6 | SYS-001~003/006, DS-006 — Runtime Contract | ⏳ Pending (Blocker) |

---

## 2. Git Baseline

| 항목 | 값 |
|------|-----|
| **최신 Commit** | `a9abd1b252126a0d166ec7d594105955f9533db0` |
| **Commit Title** | `docs(architecture): update Constitution to v2.1 after Batch4 runtime migration` |
| **Tag** | `batch4-runtime-baseline` |
| **origin/main** | ✅ 동기화 완료 |

### Batch 4 Commit Chain (공식 Baseline)

| Commit | Title |
|--------|-------|
| `c91422e` | STEP 4-1 — buildEffectiveRenderSysValues (CAL-002) |
| `401d153` | STEP 4-2 — SysOverlay runtime consolidation (CAL-005) |
| `e7623db` | STEP 4-3 — recall runtime extraction (CAL-003) |
| `02dd47f` | STEP 4-4 — resolveSlotSys ViewModel (MISC-004) |
| `540a275` | Batch 4 Closure |
| `a9abd1b` | Architecture Constitution v2.1 |

### 상태 확인 (새 세션 시작 시)

```powershell
git -C "D:\3Cushion AI" log --oneline -8
git -C "D:\3Cushion AI" status
git -C "D:\3Cushion AI" tag -l "batch4-runtime-baseline"
```

---

## 3. Architecture Summary

**Architecture Constitution v2.1 기준**

### Layer Rule (Runtime Ownership)

```text
Presentation
    ↓
Application          (App.jsx Orchestrator)
    ↓
Application Flow     (application/flows/)
    ↓
Domain Runtime       (Calculation · Search · Trajectory · ViewModel)
    ↓
System               (data/systems/* · domain/system/*)
    ↓
Dataset              (domain/dataset/* · published dataset/)
```

### SSOT (Batch 4 확정)

| Layer | SSOT | 역할 |
|-------|------|------|
| **App.jsx** | Orchestrator only | State · Flow 호출 · Render 조립 |
| **Calculation Runtime** | `domain/calculator/systemValueCalculator.ts` | SYS Render·Recall·Overlay 계산 |
| **Render ViewModel** | `domain/system/slotSysViewModel.ts` | `resolveSlotSys()` |
| **Application Flow** | `application/flows/` | orchestration · hydrate · sequencing (8 files) |

### App.jsx 현재 규모

```
5,640 lines (Batch 4 완료 시)
```

---

## 4. Batch 4 Achievement

| 항목 | 상태 |
|------|------|
| **CAL-002** | ✅ 완료 — `buildEffectiveRenderSysValues()` |
| **CAL-005** | ✅ 완료 — `computeSysOverlayValues()` · `evaluateSysOverlayHasAllInputs()` |
| **CAL-003** | ✅ 완료 — `buildSlotSysSnapshot()` |
| **MISC-004** | ✅ 완료 — `resolveSlotSys()` |
| **D-008** | ✅ Closed |
| **Batch 4 Closure** | ✅ 완료 (`540a275`) |
| **Architecture Constitution v2.1** | ✅ 반영 완료 (`a9abd1b`) |
| **Baseline Tag** | ✅ `batch4-runtime-baseline` pushed |

상세: `작업관리/Runtime Refactoring/Batch04/Batch4_Closure.md`

---

## 5. Migration Debt

| ID | 항목 | 상태 | 해소 Batch |
|----|------|------|-----------|
| **D-006** | `SYSTEM_PROFILES` 직접 접근 | 🟡 Open | Batch 6 |
| **D-007** | `getAnchorsForSystem` 직접 접근 | 🟡 Open | Batch 6 |
| **D-008** | `calculateByProfileExpr` Flow/App bypass | ✅ Closed | Batch 4 |

**신규 Debt:** 없음 (Batch 4 Closure 확인)

---

## 6. Batch 5 Scope

Batch 5는 **Trajectory Runtime Migration**이다.

### Migration Map 대상

| ID | 영역 |
|----|------|
| **TRJ-001** | Trajectory 계산 코어 |
| **TRJ-003** | Trajectory hydrate / recall |
| **RND-003** | Trajectory render pipeline |
| **APP-009** | App.jsx trajectory orchestration |

### Batch 5 중심 작업

- Trajectory Runtime Domain 분리
- Trajectory Renderer / Runtime SSOT 구축
- App.jsx trajectory orchestration → Flow / Domain 위임

### Batch 5에서 하지 않는 것

- Batch 6 선행 (Runtime Contract)
- Migration Map 순서 변경
- Batch 4 Calculation Runtime 재작업

---

## 7. Batch 5 시작 원칙

1. **Architecture Constitution v2.1** 준수
2. **Runtime Ownership** 준수 — Layer Rule 단방향 유지
3. **App.jsx = Orchestrator only** — Trajectory 생성·계산 직접 보유 금지
4. **Application Flow** — orchestration만, Runtime inline 구현 금지
5. **Domain Runtime** — Trajectory 계산 SSOT는 Domain에 둔다
6. **STEP Lock Rule** — Design → Review → STEP 단위 구현 → Regression → Commit
7. **Regression 없는 리팩터링 금지** (Constitution 20)

---

## 8. Cursor 작업 규칙

### 세션 시작 시 SSOT 확인 (순서)

1. `작업관리/PROJECT_MASTER_INDEX.md`
2. `작업관리/HISTORY/PROJECT_LOG_2026-07.md`
3. `Application Architecture Standard (AAS) v2.0/Architecture_Constitution.md` **(v2.1)**
4. `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` — Batch 5 대상
5. `작업관리/Runtime Refactoring/SESSION_HANDOFF_BATCH5.md`

### Cursor 요청서 형식

모든 Cursor 작업 요청서는 **반드시** 다음으로 시작한다:

```text
[Model: ...]
[Cursor Mode: Ask | Agent]
```

### Run / Accept 규칙

특별한 Architecture 위험이 없으면 응답은 `Run` 또는 `Accept`만 사용한다 (Constitution §6).

### STEP Lock Rule (구현 시)

```
Implement (1 STEP)
    ↓
npm run build PASS
    ↓
Regression Checklist PASS
    ↓
Import Graph Validation PASS
    ↓
git commit (STEP Baseline)
    ↓
Next STEP
```

### Shell (Windows / PowerShell)

```powershell
cd "D:\3Cushion AI\frontend"; npm run build
git -C "D:\3Cushion AI" status
git -C "D:\3Cushion AI" log --oneline -8
```

### 금지 사항

```
❌ Batch 순서 변경 (1→2→3→4→5→6)
❌ Migration Map 변경
❌ Default Export / Barrel Export
❌ App.jsx / Flow / Presentation inline Trajectory calc
❌ Domain → Presentation 역방향 import
❌ Regression 없이 commit
```

---

## 9. Batch 5 첫 작업

**Batch 5 Design — Trajectory Runtime**

새 세션의 첫 작업은 **구현이 아니라 Design**이다.

```
1. Trajectory Runtime Architecture Review
2. Migration Plan 작성 (Batch05/Batch5_Design.md)
3. Design Review / 승인
4. STEP 5-1 구현 착수
```

### [Deferred] FE-001

| 항목 | 내용 |
|------|------|
| **Status** | Deferred |
| **Expected Target** | Batch 5 Design 착수 시 재검토 |
| **내용** | RuntimeFlowContext Base Interface 추상화 |

---

## 10. End of Handoff

**다음 Cursor Session은 Batch 5 Design부터 시작한다.**

```
Step 1  git status / log — baseline a9abd1b 확인
Step 2  SSOT 문서 읽기 (§8 순서)
Step 3  Batch 5 Trajectory Runtime Architecture Review
Step 4  Batch5_Design.md 작성
Step 5  Design 승인 후 STEP 5-1 구현
```

---

## 참고 문서 경로

| 문서 | 경로 |
|------|------|
| Project SSOT | `작업관리/PROJECT_MASTER_INDEX.md` |
| 작업 로그 | `작업관리/HISTORY/PROJECT_LOG_2026-07.md` |
| **Architecture Constitution v2.1** | `Application Architecture Standard (AAS) v2.0/Architecture_Constitution.md` |
| Migration Blueprint | `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` |
| Batch 4 Closure | `작업관리/Runtime Refactoring/Batch04/Batch4_Closure.md` |
| Batch 5 Handoff | `작업관리/Runtime Refactoring/SESSION_HANDOFF_BATCH5.md` |
| 이 문서 | `작업관리/Runtime Refactoring/SESSION_HANDOFF_CURSOR.md` |

---

*End of Handoff — Batch 4 Official Closed / Batch 5 Design Ready*
