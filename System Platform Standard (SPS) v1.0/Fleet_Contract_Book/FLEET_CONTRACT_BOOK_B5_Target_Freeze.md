# Fleet Contract Book — STEP8 Batch B5 Target Freeze

```text
Document   : FLEET_CONTRACT_BOOK_B5_Target_Freeze.md
Type       : STEP8 B5 · L5 Logic Apply · Target Freeze (Scope Confirmation)
Version    : v1.1
Status     : B5 Apply Scope Frozen (Amended)
Date       : 2026-07-22
Book       : Fleet Contract Book v1.0
Depends on : Ch.9 L5 Logic Contract (Ratified) · B5-0 Logic Taxonomy
Rule       : Design / Scope Freeze only · No logic.json Apply · No Runtime/Loader/Registry mutation
Amendment  : v1.1 — Apply 7→6 · clay_shooting → Defer · summary→explicit Not in B5 Scope
```

---

## 0. State Declaration

| Item | Value |
|------|-------|
| **Current State** | **B5 Apply Scope Frozen (Amended)** |
| **Meaning** | Apply 대상 범위(Scope)가 Architecture Review 권고 A에 따라 개정·재확정된 상태. Apply 완료 상태가 **아님**. |
| **Not claimed** | B5 Apply Approved · B5 Apply PASS · Validation PASS · Commit / Push |
| **Next Gate** | Apply Design Review Recheck → Apply → Validation → Commit / Push |

### Final Verdict

**B5 Apply Scope Frozen (Amended)**

본 문서는 Apply 승인서가 아니라,  
**다음 Apply의 Scope가 공식적으로 Freeze된 설계 확정서(개정본)** 이다.

### Why this State (not “Apply Ready” / not “Apply PASS”)

현재 상태가 의미하는 것:

- Ch.9 Logic Contract **Ratified**
- Target Scope **Freeze Amendment 완료** (Apply 6 / Defer 14)
- Migration Rule **재확정** (Structure Only · clay summary→explicit 제외)
- Semantic Guard **유지**
- Safe Stop 원인(clay Semantic Generation 경로) **Scope에서 제거**

현재 상태가 의미하지 **않는** 것:

- Apply 실행 완료
- Apply Approved / Apply PASS
- Validation PASS
- Commit / Push 완료
- Runtime Contract 변경 승인

---

## 1. Target Freeze Table

Ch.9 기준. B5 Apply는 `logic.json`의 **Structure Only** normalization만 허용한다.

| Class | Count | Systems |
|-------|------:|---------|
| **A. Apply** | **6** | `35half`, `3tip_plus`, `7_system`, `99_to_1`, `plus_system`, `plus2_system` |
| **B. No-op** | **18** | `sunrise_sunset`, `zigzag_system`, `turkish_angle_system`, `tokyo_system`, `short_plate_system`, `peruvian_system`, `n_across_short`, `n_across`, `minus_5_system`, `long_wedge`, `long_plate_system`, `florida_system`, `plus_5_system`, `spider_web`, `short_wedge`, `schaefer_system`, `reverse_system`, `reverse_end_system` |
| **C. Defer** | **14** | `0tip_plus`, `1byhalf`, `2_3_system`, `5_half_system`, `ball_system`, `backside_umbrella`, `clay_shooting`, `double_rail`, `rodriguez`, `accordion`, `spread30`, `split`, `3and4_system`, `3tip_across` |
| **D. Out-of-Scope** | **0** | 없음 (Ch.9가 38개 전체를 L5 범위에 포함) |

**합계:** 6 + 18 + 14 + 0 = **38**

### Classification Notes

| Class | Meaning for B5 |
|-------|----------------|
| **Apply** | 이번 Batch에서 Structure Only migration 대상 |
| **No-op** | 이미 Ch.9 canonical type에 부합 · 변경 없음 |
| **Defer** | **현재 B5 Scope 밖** · 후속 Batch에서 처리 |
| **Out-of-Scope** | 이번 STEP8 B5에서 taxonomy 자체 제외 (해당 없음) |

---

## 2. Type별 적용 판정

| Type | Canonical ID | Decision | 근거 |
|------|--------------|----------|------|
| Type 1 | `ruleset_selector` | **Apply (부분)** | Pure selector + executable ruleset이 있는 **6개만** 이번 Scope. `clay_shooting` 및 나머지 Type 1은 Defer |
| Type 2 | `declarative_logic_model` | **No-op** | `sunrise_sunset` 고유 canonical · wrapper 강제 불필요 |
| Type 3 | `track_selection_only` | **No-op** | 이미 modern general type |
| Type 4 | `track_and_input_orchestration` | **No-op** | 이미 modern orchestration type |
| Type 5 | `validation_mode_gate_special` | **Defer** | Special lane · **현재 B5 Scope 밖** |
| Type 6 | `geometric_decision_special` | **Defer** | Special lane · **현재 B5 Scope 밖** |

---

## 3. Migration Matrix (Structure Only)

### 3.1 Principle (재강조)

이번 B5 Apply Scope의 Migration은 **구조 정규화만** 허용한다.

**절대 금지**

| Forbidden |
|-----------|
| Formula 변경 |
| System Value 변경 |
| Track 변경 |
| Branch 변경 |
| Decision 변경 |
| Runtime 변경 |
| Loader 변경 |
| Registry 변경 |
| Calculation Policy 의미 변경 |
| Input Policy 의미 변경 |
| `logic.meta` rename (Ch.7 미Ratify) |
| **`rule_summary` → executable `ruleset` Semantic Generation** |

### 3.2 Apply 대상 Matrix (6)

공통 Canonical Target: `track_selection_only`  
공통 Rule: 기존 `track_selection` 의미 보존 + wrapper 명시화만 (additive).

| System | Current | Canonical | Migration Rule |
|--------|---------|-----------|----------------|
| `35half` | legacy `track_selection` + marks + validation | `track_selection_only` | ruleset 유지 · marks→input contract 승격 · calc 금지 명시 |
| `3tip_plus` | minimal legacy ruleset | `track_selection_only` | ruleset 유지 · self-description만 보강 |
| `7_system` | CO/C3 rail selector | `track_selection_only` | ruleset·입력 검증 메시지 유지 |
| `99_to_1` | CO rail selector + center-hit | `track_selection_only` | selector 유지 · center-hit ancillary 보존 · `system_id` 문자열 불변 |
| `plus_system` | ruleset + tie-break | `track_selection_only` | tie-break 유지 · input_policy만 명시화 |
| `plus2_system` | ruleset + applicability + direction | `track_selection_only` | selector 유지 · `CO_sys<20` / `+20` 의미 보존 |

> `clay_shooting`은 본 Apply Migration Matrix에 **포함되지 않는다** (Defer · §5.1).

### 3.3 Structure-Only Verification (per Apply target)

Apply 전·후에 아래가 **모두 동일**해야 한다.

- Formula 의미
- System Value 의미
- Track 의미
- Decision 의미
- Calculation Policy 의미
- Input Policy 의미
- Runtime 의미 (`SystemContract.logic` binding)

---

## 4. Special Logic 처리 방침

Special Logic은 **현재 B5 Scope 밖 (Defer)** 이다.  
이번 Batch에서 Apply하지 않으며, **후속 Batch**에서 처리한다.

| System | Canonical Type | B5 Scope |
|--------|----------------|----------|
| `accordion` | `validation_mode_gate_special` | **밖 (Defer)** |
| `spread30` | `validation_mode_gate_special` | **밖 (Defer)** |
| `split` | `validation_mode_gate_special` | **밖 (Defer)** |
| `3and4_system` | `geometric_decision_special` | **밖 (Defer)** |
| `3tip_across` | `geometric_decision_special` | **밖 (Defer)** |

근거:

- Ch.9 Special Logic separate lane 원칙
- domain role / `logic_type` / decision semantics가 wrapper와 결합
- General modern wrapper로 맞추면 Structure Only 경계를 넘을 위험

---

## 5. Type 1 Defer 근거

### 5.1 `clay_shooting` Defer 근거 (Amendment v1.1)

`clay_shooting`은 Ch.9 Taxonomy상 Type 1(`ruleset_selector`)로 **매핑 유지**한다.  
단, **이번 B5 Apply Scope 밖 (Defer)** 으로 이동한다.

| Factor | Observation |
|--------|-------------|
| Executable ruleset | **부재** — `track_selection`에 machine-readable `ruleset` 없음 |
| Meaning locus | `rule_summary`(자연어) + 외부 `rule_source` (`Clay_shooting_track_selector.py`)에 위임 |
| Proposed migration (v1.0) | `summary → explicit selector` |
| Guard verdict | **Semantic Generation** — Decision/Track 규칙 발명 · Ch.9 Structure Only 위반 |
| Meaning Preservation | 무손실 증명 불가 (prose→ruleset은 해석 개입) |

**Prohibited in B5**

```text
summary → explicit ruleset
  = Not in B5 Scope
  = Prohibited Migration in B5
  = 별도 Contract 또는 무손실 규칙 SSOT 확보 전 적용 금지
```

결론: Meaning Preservation을 무손실로 증명할 수 있을 때까지 **Defer**.  
Ch.9 Canonical Type Mapping은 변경하지 않는다.

### 5.2 `rodriguez` Defer 근거

`rodriguez`는 Type 1(`ruleset_selector`)에 속하지만 **이번 B5 Apply Scope 밖 (Defer)** 으로 유지한다.

| Factor | Observation |
|--------|-------------|
| `required_marks` | `["C1"]` — CO 미사용 선언과 selector 입력 축이 일반 Apply 6개와 다름 |
| Selector | C3 rail → 세로 / 2C rail → 좌우 합성 · B2T/T2B + L/R 분리형 |
| Input Policy | 암묵적 입력 계약 · Apply 6개보다 명시화 비용·의미 보존 검증이 복잡 |
| Meaning Preservation | wrapper화 시 입력 의미 재해석 위험이 Apply 6개보다 높음 |

결론: Structure Only + Meaning Preservation을 이번 Batch에서 안전하게 증명하기 어려우므로 **Scope 밖 유지**.

---

## 6. Acceptance Checklist (Target Freeze Amendment)

- [x] Apply 대상 **6개** 확정
- [x] No-op **18** / Defer **14** / OOS **0** 확정 (합계 38)
- [x] `clay_shooting` Apply → Defer 이동
- [x] `summary → explicit` = Not in B5 Scope / Prohibited 명시
- [x] Type별 적용 판정 확정 (Type 1 Apply 부분 = 6)
- [x] Migration Matrix Apply 대상 = 6 (clay 행 없음)
- [x] Special Logic = B5 Scope 밖 명시
- [x] `rodriguez` / `clay_shooting` Defer 근거 명시
- [x] Semantic Guard 유지 · Ch.9 Taxonomy 미변경
- [x] Final State = **B5 Apply Scope Frozen (Amended)**
- [x] Apply Design Review (초기) · Safe Stop · Architecture Review 권고 A 반영
- [ ] Apply Design Review **Recheck** (다음 Gate)
- [ ] Apply 실행
- [ ] Validation
- [ ] Commit / Push

### Apply-time Checklist (Apply Gate에서 사용)

- [ ] 대상 시스템 (**6**)
- [ ] Migration Rule 준수 (additive wrapper only)
- [ ] Validation
- [ ] Regression
- [ ] Rollback Point
- [ ] Build

---

## 7. Exit Criteria — Apply 진입 Gate

아래 **전부** 만족해야 Apply 단계로 진입할 수 있다.  
대상은 **Apply 6개**이며, Defer 14 / No-op 18은 **무변경**이어야 한다.

| ID | Criterion |
|----|-----------|
| **B5-EX-01** | Structure Only 유지 |
| **B5-EX-02** | Meaning Preservation (의미 보존) |
| **B5-EX-03** | Runtime Contract 동일 |
| **B5-EX-04** | Formula 동일 |
| **B5-EX-05** | System Value 동일 |
| **B5-EX-06** | Track 동일 |
| **B5-EX-07** | Decision 동일 |
| **B5-EX-08** | Input Policy 동일 |
| **B5-EX-09** | Calculation Policy 동일 |
| **B5-EX-10** | Loader / Registry / Runtime code diff = 0 |
| **B5-EX-11** | Defer / No-op 파일 무변경 (`clay_shooting` 포함) |
| **B5-EX-12** | Build PASS · Validation PASS (Apply 후) |
| **B5-EX-13** | `summary → explicit` migration 미수행 |

---

## 8. Official Gate Sequence

```text
Target Freeze (v1.0)
        ↓
Apply Design Review → Safe Stop (clay Semantic Generation)
        ↓
Architecture Review → Recommendation A (Apply 6 · clay Defer)
        ↓
Target Freeze Amendment (v1.1)   ← 현재 Complete
        ↓
Apply Design Review Recheck      ← 다음 공식 절차
        ↓
Apply
        ↓
Validation
        ↓
Commit / Push
```

| Gate | Status |
|------|--------|
| Target Freeze (v1.0) | Superseded by Amendment |
| Apply Design Review (initial) | Complete · Safe Stop (clay) |
| Architecture Review | Complete · Recommendation A |
| Target Freeze Amendment (v1.1) | **Complete · Scope Frozen (Amended)** |
| Apply Design Review Recheck | **Pending** |
| Apply | Not Started |
| Validation | Not Started |
| Commit / Push | Not Started |

---

## 9. Semantic Guard (cite Ch.9)

절대 변경 금지:

- Formula 의미
- System Value 의미
- Trajectory 의미
- Track 의미
- Input 의미
- Branch 의미
- Decision 의미
- Calculation Policy 의미
- Runtime / Loader / Registry 의미
- `logic.meta` rename (Ch.7 Ratify 전)
- Ch.9 Canonical Logic Type / `clay_shooting` Type 1 taxonomy mapping
- **`rule_summary` → executable `ruleset` Semantic Generation (B5)**

본 Amendment는 Guard를 위반한 Apply 경로만 Scope에서 제거한다.  
의미·Taxonomy·Runtime Contract는 변경하지 않는다.

---

## 10. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | B5 Target Freeze on-disk v1.0 · Final verdict = **B5 Apply Scope Frozen** · Apply 7 / Defer 13 |
| 2026-07-22 | **Amendment v1.1** · Status = **B5 Apply Scope Frozen (Amended)** · Apply 7→**6** · Defer 13→**14** (`clay_shooting`) · Apply Matrix에서 clay 행 삭제 · `summary→explicit` = Not in B5 Scope / Prohibited · Next Gate = Apply Design Review Recheck |

---

*End of FLEET_CONTRACT_BOOK_B5_Target_Freeze.md — Status: B5 Apply Scope Frozen (Amended) · Version: v1.1*
