# Fleet Contract Book — STEP8 Batch B6 ADR

# Apply Design Review

```text
Document   : FLEET_CONTRACT_BOOK_B6_ADR_Apply_Design_Review.md
Type       : STEP8 B6 · L6 Runtime · Apply Design Review (ADR)
Version    : v1.1
Status     : ADR Complete · Decision = Approve · Execution Governance Rules Established
Date       : 2026-07-22
Book       : Fleet Contract Book v1.0
Rule       : Review / Governance only · No Runtime / Loader / Registry / System JSON mutation ·
             No Apply execution · No Validation execution · No Commit / Push
Cite       : Structure Only (L6) · Meaning Preservation · Runtime Contract ·
             Ch.10 (Ratified) · B6 Freeze Amendment v1.1 · WG-AI-001 · EB-01…EB-07
Note       : v1.1 = Operation Rule 추가 · Execution Baseline 값 불변 (≠ ADR Baseline Amendment)
```

---

## 0. ADR Header

| Field | Value |
|-------|-------|
| **ADR ID** | **ADR-STEP8-B6-01** |
| **대상 Batch** | **STEP8 Batch B6** (L6 Runtime Contract / Package Completeness) |
| **Review Date** | **2026-07-22** |
| **Reviewer** | Cursor Agent (Fleet Apply Design Review) · Human Approver: _(sign-off on Decision)_ |
| **Related Contract** | `FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` **Ratified** |
| **Related Freeze** | `FLEET_CONTRACT_BOOK_B6_Target_Freeze.md` **v1.0** (superseded for Scope by Amendment) |
| **Related Amendment** | `FLEET_CONTRACT_BOOK_B6_Target_Freeze_Amendment_v1.1.md` **Scope Frozen (Amended)** |
| **Related Book** | `FLEET_CONTRACT_BOOK_v1.0.md` (Ch.10 Ratified) |
| **WG-AI-001** | Consume · Runtime=Y → Overall **L3** · Architecture Review prior Complete |
| **B3** | **Hold** · do NOT retry |

### ADR Purpose

B6 **code Apply 전** Execution Plan을 Review하고,  
**Apply 승인 여부**를 판단한다.

본 문서 = **Review only**.  
**Approve ≠ Apply 실행.**

---

## 1. Execution Baseline

> **Execution Baseline은 본 ADR의 공식 SSOT이며, ADR Approve 이후 Immutable이다.**  
> (cite **EB-01** · §11 Execution Governance Rules)  
> Baseline 변경은 기존 ADR in-place 수정이 아니라 **ADR Amendment**로만 한다 (**EB-02**).  
> Baseline과 다른 Apply는 **Forbidden (Scope Drift)** (**EB-03** · **EB-04**).

| Item | Value |
|------|-------|
| **Apply Count** | **1** |
| **Apply Target** | **`double_rail`** |
| **Apply Type** | **Loader exclusion only** (Package Completeness / Load Completeness) |
| **Contract** | **Ch.10 Runtime Contract** (Ratified · Option C · L6-C-02) |
| **Freeze** | **B6 Amendment v1.1** |
| **Expected Files** | `frontend/src/runtime/loader/systemPackageStore.ts` **only** |
| **Expected Diff** | anchors `import.meta.glob`에서 `!…/double_rail/anchors.json` **제거만** · `0tip_plus` exclusion **유지** |
| **Runtime Meaning** | **Unchanged** |
| **Formula** | **Unchanged** |
| **System Value** | **Unchanged** |
| **Logic** | **Unchanged** |
| **Trajectory** | **Unchanged** |
| **Public API** | **Unchanged** (Sole Lookup Entry + Approved siblings) |
| **Registry** | **Unchanged** (책임·API · cache ownership 유지; bootstrap 결과 completeness만 복원) |
| **Validation Profile** | **L6-VR** (Ch.10 §16) + Amendment §7 |
| **Rollback** | **git revert** (Apply commit unit) |
| **Scope Drift** | **Forbidden** |

### Baseline Lock Rule

| ID | Rule |
|----|------|
| **B6-ADR-BL-01** | Apply는 Execution Baseline과 **비트 단위로 일치**해야 한다. |
| **B6-ADR-BL-02** | Target / File / Diff를 Baseline 밖으로 확장하려면 **새 ADR**이 필요하다. |
| **B6-ADR-BL-03** | `0tip_plus` lift · System JSON 의미 edit · Public API 변경 = Baseline 위반 → **Reject / Safe Stop**. |

---

## 2. Apply Scope

Amendment v1.1 확정 Scope (본 ADR이 **재확인·잠금**):

| Class | Count | Contents |
|-------|------:|----------|
| **Apply** | **1** | `double_rail` — Loader exclusion 해제 only |
| **No-op** | **36** | 나머지 Inventory (exclusion 비대상 · Contract path canonical) |
| **Defer** | **1+** | **`0tip_plus`** (Non-consumable) · residual (shape/version/capabilities 등 — 본 Apply 비대상) |
| **Out-of-Scope** | — | Formula / System Value / Logic / Trajectory **의미** · B3 · B7 · B8 · DGR-008 invent · non-consumable “complete” 선언 |

```text
Apply Scope Locked = double_rail Loader exclusion only
```

---

## 3. Expected Code Impact

### 3.1 Before → After

**변경 대상 파일:** `frontend/src/runtime/loader/systemPackageStore.ts`

**Before (cite current):**

```text
anchorModules = import.meta.glob([
  "../../data/systems/*/anchors.json",
  "!../../data/systems/0tip_plus/anchors.json",
  "!../../data/systems/double_rail/anchors.json",
], { eager: true })
```

**After (Apply expected):**

```text
anchorModules = import.meta.glob([
  "../../data/systems/*/anchors.json",
  "!../../data/systems/0tip_plus/anchors.json",
], { eager: true })
```

| Aspect | Before | After |
|--------|--------|-------|
| `double_rail` anchors eager | **excluded** | **included** |
| `0tip_plus` anchors eager | excluded | **excluded (unchanged)** |
| Other systems | included | included |
| `anchors.json` file contents | — | **unchanged** |
| Public API exports | — | **unchanged** |
| Registry source code | — | **unchanged** |

### 3.2 변경 없음 (shall not touch)

| Area | Status |
|------|--------|
| `data/systems/double_rail/*` JSON 의미 | **변경 없음** |
| `data/systems/0tip_plus/*` | **변경 없음** |
| `runtime/registry/*` | **변경 없음** |
| `runtime/contract/*` | **변경 없음** |
| `runtime/index.ts` Public API | **변경 없음** |
| Domain / App / Overlay | **변경 없음** (소비 결과 completeness만 복원 가능) |
| Validation Engine | **변경 없음** (B8) |

### 3.3 변경 예상 / 영향 범위

| Item | Expected |
|------|----------|
| **Code diff** | `systemPackageStore.ts` **1 exclusion line 제거** (최소) |
| **Runtime effect** | `getSystemContract("double_rail")?.anchors.trajectories` **non-null 가능** (Load Completeness) |
| **영향 범위** | Loader PackageStore → assemble → Registry cache → Domain Supply (double_rail 선택 시) |
| **의미 영향** | **없음** (cite Ch.10 Structure Only (L6) · Meaning Preservation) |

---

## 4. Execution Risk

| Risk Domain | Level | Notes | Mitigation |
|-------------|-------|-------|------------|
| **Loader** | Med | eager map 변경 | Baseline file lock · smoke |
| **Registry** | Low–Med | cache 내용 completeness | API/책임 불변 · list/get 확인 |
| **Runtime** | Med | WG Runtime=Y · L3 | ADR + L6-VR · prior Arch Review |
| **API** | Low | surface 불변 | export diff = 0 |
| **Meaning** | Low | JSON 의미 미변경 | Semantic Guard · file allowlist |
| **Package Completeness** | Med | DGR-011 partial close | consumable only · `0tip_plus` 유지 |
| **Regression** | Med | `double_rail` lookup 경로 신규 활성 | selected-system smoke · Build |

**Overall Risk:** **Medium** · Scope 최소 · Rollback 단순 · Meaning risk 낮음.

---

## 5. Rollback Strategy

| Item | Plan |
|------|------|
| **Trigger** | Meaning/Guard 위반 · Build FAIL · Loader smoke FAIL · Public API diff · `0tip_plus` 오변경 · Scope Drift |
| **Rollback Unit** | Apply를 담은 **단일 git commit** (권고) |
| **Rollback Scope** | `systemPackageStore.ts` exclusion 원복 · 기타 파일 미포함 전제 |
| **Method** | **`git revert <apply-commit>`** (또는 동등한 원복) |
| **Abort Criteria** | Baseline 이탈 시도 · Semantic Guard hit · Safe Stop 조건 (§7) |
| **Data rollback** | System JSON 미변경 전제 → **JSON rollback 불필요** |

---

## 6. Validation Plan

Apply **직후** (본 ADR 세션에서는 **미실행**):

| Check | Pass condition |
|-------|----------------|
| **Loader Smoke** | `double_rail` anchors package / Contract.trajectories **present** |
| **Runtime Contract Validation** | `getSystemContract("double_rail")` · validation.ok · Ch.10 Invariants |
| **Semantic Guard** | Formula/Value/Logic/Trajectory 의미 diff = 0 |
| **Meaning Preservation** | System JSON unchanged · only expected Loader diff |
| **Public API** | Sole Lookup Entry + Approved siblings **unchanged** |
| **Registry** | Sole Cache Owner · `double_rail` registered · no API change |
| **Build** | `npm run build` **PASS** |
| **Regression** | selected-system smoke (`double_rail`) · `0tip_plus` 여전히 exclusion |
| **L6-VR profile** | Ch.10 L6-VR-01…12 (Apply>0) · Completeness L6-VR-07 |

---

## 7. ADR Decision Criteria

### PASS (Approve) 조건 — 전부 충족

| # | Criterion |
|---|-----------|
| 1 | Execution Baseline 완전 · locked |
| 2 | Scope = Amendment v1.1 (Apply 1 · `double_rail` only) |
| 3 | Ch.10 Ratified · Option C cite |
| 4 | B6-EN-01…09 충족 (Amendment 기록) |
| 5 | Expected Files / Diff 최소 · Meaning Unchanged |
| 6 | Rollback = git revert 정의 |
| 7 | Validation Plan = L6-VR locked |
| 8 | Scope Drift Forbidden 명시 |
| 9 | WG-AI-001 L3 Consume |
| 10 | B3 Hold 유지 |

### FAIL (Reject) 조건 — 하나라도

| # | Criterion |
|---|-----------|
| 1 | Baseline 불완전 / 모순 |
| 2 | Apply Target이 `double_rail` exclusion 이외로 확장 |
| 3 | Formula/Value/Logic/Trajectory 의미 변경 계획 |
| 4 | `0tip_plus` lift 포함 |
| 5 | Public API / Registry 책임 변경 계획 |
| 6 | Ch.10 / Amendment와 불일치 |
| 7 | Rollback 부재 |

### Safe Stop

| Trigger | Action |
|---------|--------|
| Apply 중 의미 변경 징후 | **Safe Stop** (≠ FAIL of ADR) |
| Scope Drift 발견 | **Abort Apply** · 재 ADR |
| Build / smoke FAIL | **Stop** · Rollback |
| B3 재시도 유혹 | **Forbidden** |

Cite: Ch.10 Semantic Guard · WG-AI-001 Safe Stop ≠ FAIL · Meaning Preservation · Structure Only (L6).

---

## 8. Approval Checklist

승인자는 Apply 진입 전 다음을 확인한다.

- [x] Execution Baseline 표 검토 · SSOT로 수용
- [x] Apply Count = 1 · Target = `double_rail` only
- [x] Apply Type = Loader exclusion only
- [x] Expected File = `systemPackageStore.ts` only
- [x] `0tip_plus` exclusion **유지**
- [x] Formula / System Value / Logic / Trajectory = Unchanged
- [x] Public API / Registry 책임 = Unchanged
- [x] Ch.10 Ratified · Option C / Load Completeness cite
- [x] B6 Freeze Amendment v1.1 Scope Frozen
- [x] Validation Profile = L6-VR
- [x] Rollback = git revert
- [x] Scope Drift = Forbidden
- [x] WG-AI-001 L3 Consume
- [x] B3 = Hold
- [ ] **Human sign-off** (optional formal) — Agent Review Decision below

---

## 9. Decision

**하나만 선택.**

| Option | Meaning |
|--------|---------|
| **Approve** | Baseline·Scope·Risk·Rollback·Validation이 Apply 진입에 **충분**하다. **Next = Apply 실행 세션.** |
| **Reject** | Apply 진입 불가 · Scope/Baseline 재설계 필요 |
| **Hold** | 추가 정보/Amendment 대기 · Apply 금지 |

### ADR Decision (본 Review)

```text
Decision     : Approve
Decided by   : Cursor Agent Apply Design Review (ADR-STEP8-B6-01)
Date         : 2026-07-22
Condition    : Apply must follow Execution Baseline exactly
Not claimed  : Apply executed · Validation PASS · Commit / Push
```

**Approve** = code Apply **허가 (설계)**.  
**Approve ≠** Loader 파일이 이미 변경됨.

---

## 10. Next Gate

```text
ADR PASS (Approve)          ← 현재
        ↓
Apply                       ← 다음 공식 Gate
  (systemPackageStore.ts
   double_rail exclusion 제거 only)
        ↓
Validation                  (L6-VR · smoke · Build)
        ↓
Commit
        ↓
Push
```

| Gate | Status |
|------|--------|
| Ch.10 Ratify | **Complete** |
| B6 Scope Reconfirm | **Complete** (Verdict B) |
| B6 Freeze Amendment v1.1 | **Complete** |
| **ADR (본 문서)** | **Complete · Approve** |
| **Apply** | **Pending** |
| Validation | Pending |
| Commit / Push | Pending |

---

## 11. Execution Governance Rules

> **목적:** Execution Baseline을 프로젝트 **Operation Rule / Execution Standard**로 승격한다.  
> 이후 ADR는 **Execution SSOT**로 사용한다.  
> 본 섹션은 Baseline **값**을 바꾸지 않는다 (Governance only · ≠ ADR Baseline Amendment).

### Rule EB-01 — Immutable SSOT after Approve

**Execution Baseline은 ADR 승인(Approve) 이후 Immutable SSOT이다.**

| Binding | Statement |
|---------|-----------|
| Owner | ADR Document (§1 Execution Baseline table) |
| After Approve | Baseline 값은 Apply 세션에서 **변경 불가** |
| Authority | Baseline = Apply 허용 범위의 **단일 진실** |
| Violation | Baseline 무시 Apply = **Forbidden** |

### Rule EB-02 — Amendment-only change

**Execution Baseline 변경은 기존 ADR 수정이 아니라 ADR Amendment로만 수행한다.**

| Allowed | Forbidden |
|---------|-----------|
| 새 ADR Amendment 문서 (또는 ADR Amendment 섹션)로 Baseline 개정 | Approve ADR의 Baseline 표를 silent edit |
| Amendment 후 재 Approve | Approve Decision을 유지한 채 Baseline만 바꾸기 |
| Revision bump + Change Log | Apply 중 ad-hoc Scope 확장 |

### Rule EB-03 — Scope Drift definition

다음 항목의 **미승인 변경**은 **Scope Drift**로 간주한다.

| Drift Item | Notes |
|------------|-------|
| **Apply Count** | e.g. 1 → 2 |
| **Apply Target** | e.g. `double_rail` 외 추가 |
| **Expected Files** | allowlist 확장/축소 |
| **Expected Diff** | Loader exclusion 외 변경 |
| **Validation Profile** | e.g. L6-VR 이탈 |
| **Rollback Unit** | commit unit / revert 전략 변경 |
| **Runtime Meaning** | Formula/Value/Logic/Trajectory 의미 |
| **Public API Surface** | Sole Lookup Entry / Approved siblings |
| **Registry Ownership** | Sole Cache Owner / 책임 경계 |

### Rule EB-04 — Scope Drift response

**Scope Drift 발생 시 Safe Stop한다.**  
**ADR 재검토** 및 **ADR Amendment** 없이는 Apply를 수행하지 않는다.

```text
Scope Drift detected
        ↓
Safe Stop (Apply Abort)
        ↓
ADR 재검토
        ↓
ADR Amendment (EB-02)
        ↓
재 Approve
        ↓
Apply 재개 (새 Baseline만)
```

Cite: WG-AI-001 Safe Stop ≠ FAIL · Ch.10 Semantic Guard · Meaning Preservation.

### Rule EB-05 — Baseline ↔ Validation same Revision

**Execution Baseline과 Validation Plan은 동일 Revision으로 관리한다.**

| Binding | Statement |
|---------|-----------|
| Pairing | §1 Baseline ↔ §6 Validation Plan = **same ADR Revision** |
| B6 | Baseline v1.1 governance + Validation Profile **L6-VR** (unchanged content vs Approve) |
| Forbidden | Baseline만 Amendment하고 Validation Plan을 구 Revision에 남김 |
| Apply gate | Validation Plan Revision ≠ Baseline Revision → **Apply 금지** |

### Rule EB-06 — Rollback Unit locked

**Rollback Unit은 Execution Baseline의 일부이며, Apply 이후 변경할 수 없다.**

| Binding | Statement |
|---------|-----------|
| Unit (B6) | Apply를 담은 **단일 git commit** · method = **git revert** |
| After Apply | Rollback Unit 재정의 Forbidden (별도 Amendment 필요) |
| Scope | Expected Files만 원복 · Baseline 밖 파일 포함 금지 |

### Rule EB-07 — Execution Contract principles

**Execution Baseline은 Execution Contract로 간주하며** 다음 원칙을 **모두** 따른다.

| Principle | Cite |
|-----------|------|
| **WG-AI-001** | Runtime=Y → L3 Consume · Safe Stop · Gate discipline |
| **Runtime Contract** | Ch.10 L6 · Sole Lookup Entry · Loader Sole Assembler · Registry Sole Cache Owner |
| **Structure Only (L6)** | Load Completeness · Formula/Value/Logic/Trajectory 의미 불변 |
| **Meaning Preservation** | System JSON 의미 · Semantic Guard |

---

## 12. Execution Governance Summary

| Item | Value |
|------|-------|
| **Baseline Owner** | **ADR-STEP8-B6-01** · §1 Execution Baseline (Immutable after Approve · **EB-01**) |
| **Amendment Rule** | Baseline 변경 = **ADR Amendment only** (**EB-02**) · in-place silent edit Forbidden |
| **Scope Drift Policy** | EB-03 목록 미승인 변경 = Drift · **EB-04** Safe Stop · Amendment 없이 Apply **Forbidden** |
| **Safe Stop** | Drift / Meaning / Guard / Build FAIL → Abort Apply · 재검토 · Amendment |
| **Validation Pairing** | Baseline ↔ Validation Plan **same Revision** (**EB-05**) |
| **Rollback Lock** | Rollback Unit ∈ Baseline · Apply 후 변경 Forbidden (**EB-06**) |
| **Execution Contract** | WG-AI-001 · Runtime Contract · Structure Only · Meaning Preservation (**EB-07**) |
| **Next Gate** | **Apply** (Baseline 준수 only) → Validation → Commit → Push |

```text
Execution Baseline = Execution SSOT = Execution Contract
ADR Approve → Immutable (EB-01)
Change → ADR Amendment only (EB-02)
Drift → Safe Stop (EB-04)
```

---

## 13. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | ADR-STEP8-B6-01 작성 · Execution Baseline SSOT · Scope lock Apply=1 `double_rail` · Decision = **Approve** · Next Gate = **Apply** · No code/Apply/Validation/Commit |
| 2026-07-22 | **v1.1** · §11 **Execution Governance Rules (EB-01…EB-07)** · §12 **Execution Governance Summary** · Baseline **값 불변** · Governance only · No code/Apply/Validation/Commit |

---

*End of FLEET_CONTRACT_BOOK_B6_ADR_Apply_Design_Review.md — Decision: Approve · Governance: EB-01…07 · Next Gate: Apply*
