# SESSION_HANDOFF_BATCH5.md

**Created:** 2026-07-07  
**Purpose:** Batch 4 종료 상태를 기준으로 Batch 5 Trajectory Runtime 착수 Handoff.

> **읽기 순서:** `PROJECT_MASTER_INDEX.md` → `PROJECT_LOG_2026-07.md` → `Batch04/Batch4_Closure.md` → `SESSION_HANDOFF_BATCH4.md` → **본 문서** → `App_Migration_Map.md` Batch 5

---

## 1. 시작 Baseline

| 항목 | 값 |
|------|-----|
| Branch | `main` |
| **Batch 4 Code Baseline** | `02dd47f` — STEP 4-4 MISC-004 |
| App.jsx | 5,640 lines |
| Batch 4 Closure | `docs(batch4): complete Batch4 closure and prepare Batch5` |

---

## 2. Batch 5 대상 (Migration Map)

| ID | 책임 | Target (예정) |
|----|------|---------------|
| **TRJ-001** | Trajectory 계산 코어 | `domain/trajectory/` |
| **TRJ-003** | Trajectory hydrate / recall | Domain + Flow |
| **RND-003** | Trajectory render pipeline | `renderer/trajectory/` |
| **APP-009** | App.jsx trajectory orchestration | Flow 위임 |

> **위험도:** 매우 높음 — Batch 1~4 중 최고 위험. Design 선행 필수.

---

## 3. Batch 5에서 하지 않는 것

- Batch 6 선행 (Runtime Contract — SYS-001~003/006)
- Migration Map 순서 변경
- CAL/SYS 재작업 (Batch 4 완료 범위 침범)

---

## 4. Open Migration Debt (Batch 5에서 해소하지 않음)

| ID | 항목 | 해소 Batch |
|----|------|-----------|
| D-006 | SYSTEM_PROFILES 직접 접근 | Batch 6 |
| D-007 | getAnchorsForSystem 직접 접근 | Batch 6 |

D-008은 Batch 4에서 Closed.

---

## 5. [Deferred] FE-001

- **RuntimeFlowContext Base Interface** — Batch 5 Design 착수 전 재검토

---

## 6. 작업 시작 순서

```
1. PROJECT_MASTER_INDEX.md          ← v1.16 (Batch 4 Complete)
2. PROJECT_LOG_2026-07.md           ← Batch 4 Closure 로그
3. App_Migration_Map.md             ← Batch 5 대상 확인
4. Architecture_Constitution.md     ← Layer Rule 확인
5. Batch05/ Analysis → Design       ← 미작성 시 선행
6. STEP 5-1 구현                    ← Design SSOT 확정 후
```

---

*End of SESSION_HANDOFF_BATCH5.md — Batch 5 Ready*
