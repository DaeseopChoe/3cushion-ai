# Fleet Contract Book — STEP8 Batch B6 Target Freeze Amendment v1.1

```text
Document   : FLEET_CONTRACT_BOOK_B6_Target_Freeze_Amendment_v1.1.md
Type       : STEP8 B6 · L6 Runtime Contract · Target Freeze Amendment
Version    : v1.1
Status     : B6 Apply Scope Frozen (Amended)
Date       : 2026-07-22
Book       : Fleet Contract Book v1.0
Amends     : FLEET_CONTRACT_BOOK_B6_Target_Freeze.md (v1.0 · Empty Apply)
Depends on : Ch.10 L6 Runtime Contract (Ratified) · B6 Scope Reconfirm (Ask) ·
             WG-AI-001 · Ch.8 · Ch.9 · B6 Target Freeze v1.0
Rule       : Scope Amendment only · No Runtime / Loader / Registry / System JSON mutation ·
             No Apply · No Validation execution in this session
Cite       : Structure Only (L6) · Meaning Preservation · Runtime Contract · WG-AI-001 · Ch.10 Option C
```

---

## 0. Amendment Declaration

| Item | Value |
|------|-------|
| **대상 문서** | `FLEET_CONTRACT_BOOK_B6_Target_Freeze.md` **v1.0** |
| **본 문서** | `FLEET_CONTRACT_BOOK_B6_Target_Freeze_Amendment_v1.1.md` |
| **Status** | **B6 Apply Scope Frozen (Amended)** |
| **Amendment 이유** | Ch.10 Ratify 이후 Package Completeness **Option C**와 Freeze v1.0 Empty Apply / exclusion Defer가 **불일치** |
| **Ch.10 연계** | Ch.10 **Ratified** · Completeness Policy **Option C** (cite §10 · **L6-C-01…06** · **L6-D-001**) · Structure Only (L6) = **Load Completeness 복원** |
| **Scope 변경 목적** | Apply Count **0 → 1** (`double_rail` exclusion lift only) · `0tip_plus` **Defer 유지** · Migration / Guard / Validation을 Ch.10과 정합 |
| **본 Amendment가 아닌 것** | Apply 실행 · Loader/Registry code 변경 · Validation 실행 · Apply Approved |

### Final Verdict

**B6 Apply Scope Frozen (Amended) v1.1**

본 문서는 Apply 승인서가 아니라,  
**Ch.10 기준 Scope가 공식적으로 개정·재Freeze된 설계 확정서** 이다.

**Next Gate:** **ADR (Apply Design Review)**

---

## 1. Background

### 1.1 B6 Freeze v1.0 상태

| Item | v1.0 |
|------|------|
| Architecture Review | PASS (Conditional) — 당시 Conditional = Ch.10 Not Persisted |
| Apply Count | **0 (Empty Apply)** |
| No-op | **38** |
| Defer | Loader exclusion (`0tip_plus`, `double_rail`) + Ch.10 부재 의존 항목 등 |
| Migration | B6-M-03/04 — exclusion lift = 동작 변화 → **Defer / Safe Stop** |
| Next Gate (당시) | Ch.10 Ratify |

### 1.2 Ch.10 Ratify 완료

- `FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` **Status = Ratified**
- Front Matter Chapter Status: Ch.10 = **Ratified**
- Package Completeness **Option C** 채택 (L6-D-001)
- Structure Only (L6): Completeness lift = Formula/Value/Logic/Trajectory **의미 변경이 아님** · **Load Completeness 복원**
- Sole Lookup Entry = `getSystemContract()` · WG-AI-001 Runtime=Y → L3 Consume

### 1.3 Scope Reconfirm 결과

| Verdict | **B — Scope Amendment Required** |
|---------|----------------------------------|
| `double_rail` | Defer → **Apply** (Completeness) |
| `0tip_plus` | Defer **유지** |
| Apply Count | **0 → 1** 권고 |
| No-op | **38 → 36** (배타 분할 명확화) |

### 1.4 Amendment 필요 이유

1. Freeze v1.0과 Ch.10 Option C **SSOT 충돌** (B6-M-04 vs L6-C-02)
2. B6-EN-04 Scope 재확인 · B6-EN-05 Amendment 판정을 **공식 기록**해야 ADR 진입 가능
3. DGR-011(`double_rail`) Completeness 해소 경로를 Scope에 고정
4. `0tip_plus` false-complete 위험을 Defer로 계속 차단

---

## 2. Before / After 비교표

| Class | Freeze v1.0 | → | Amendment v1.1 |
|-------|-------------|---|----------------|
| **Apply** | **0** (Empty) | → | **1** (`double_rail` only · Loader exclusion 해제) |
| **No-op** | **38** | → | **36** |
| **Defer** | `0tip_plus` + `double_rail` + Ch.10 부재 항목 등 | → | **`0tip_plus` 유지** · shape/version/capabilities 등 잔여 Defer · `double_rail` **제외** · Ch.10 부재 Defer **해제** |
| **Out-of-Scope** | 의미변경 · B3 · B7 · B8 · DGR-008 invent · Runtime **동작 전면 금지** | → | Non-Target / B3 / B7 / B8 / DGR-008 invent **동일** · 단 **Load Completeness Structure Only (L6)는 OOS가 아님** |

**합계 (시스템 배타 분할):** Apply **1** + No-op **36** + Defer **1** (`0tip_plus`) = **38**

| Metric | v1.0 | v1.1 |
|--------|------|------|
| **Apply Count** | 0 | **1** |
| **Apply Target** | — | **`double_rail`** |
| **Option C** | 미반영 (Ch.10 전) | **Applied (Scope)** |
| **Code Apply** | 미수행 | **여전히 미수행** (본 Amendment) |

---

## 3. Scope Amendment

| System / Item | Current (v1.0) | Reason | New Classification (v1.1) | Required Action |
|---------------|----------------|--------|---------------------------|-----------------|
| **`double_rail`** | **Defer** | exclusion = 관찰 가능 동작 변화 (B6-M-04) | **Apply** | Loader eager anchors exclusion **해제 only** · System JSON 의미 불변 · **ADR 후 Apply** |
| **`0tip_plus`** | **Defer** | flat · non-canonical id · silent-drop | **Defer** | lift 금지 · “canonical complete” 선언 금지 · L4 Deferred cite |
| Ch.10 부재 의존 Defer | Defer | Ch.10 Not Persisted | **해제** | Contract Ratified로 해소 |
| 기타 36 systems | No-op (서술) | Contract path canonical | **No-op** | 변경 없음 |
| DGR-008 Special 4 | OOS | anchors invent 금지 | **OOS** | 유지 |
| Formula / Value / Logic / Trajectory 의미 | OOS / Guard | Non-Target | **OOS / Guard** | 유지 |
| B3 / B7 / B8 | OOS | 타 Batch | **OOS** | 유지 |

### Apply Target Spec (`double_rail`)

| Field | Value |
|-------|-------|
| **system** | `double_rail` |
| **change surface** | `frontend/src/runtime/loader/systemPackageStore.ts` — anchors glob exclusion 제거 **only** |
| **not changed** | `anchors.json` 좌표/id · profile/logic/meta 의미 · Public API · Registry 책임 |
| **Ch.10 class** | Consumable · L4-consumable (`trajectories`) · Completeness Apply 후보 (Ch.10 §10.4) |
| **Structure Only (L6)** | **Load Completeness 복원** |

---

## 4. Option C 영향 분석

Cite: Ch.10 §10 Package Completeness Policy · **L6-C-01…06** · **L6-D-001** · Structure Only (L6) · Meaning Preservation · WG-AI-001.

| Claim | Statement |
|-------|-----------|
| **Load Completeness 복원** | disk에 이미 존재하는 consumable `anchors.json`을 eager load 경로에 균일 포함 |
| **Meaning Preservation** | Formula / System Value / Logic / Trajectory **의미 불변** |
| **Formula 변경** | **없음** |
| **System Value 변경** | **없음** |
| **Logic 변경** | **없음** |
| **Trajectory 변경** | **없음** (물리·path 알고리즘 Non-Target) |
| **관찰 효과** | `getSystemContract("double_rail")?.anchors.trajectories`가 채워질 수 있음 = completeness 복원 결과 |
| **비허용** | non-consumable lift · silent-drop을 complete로 선언 · Special anchors 발명 |

---

## 5. Migration Rule Amendment

### 5.1 Supersede (v1.0 → v1.1)

| ID (v1.0) | v1.0 Statement | v1.1 Disposition |
|-----------|----------------|------------------|
| **B6-M-03** | Runtime · Loader · Registry **동작·의미 변경 금지** | **개정** — **의미** 변경 금지 유지 · Load Completeness Structure Only (L6)는 **허용 후보** (Ch.10) |
| **B6-M-04** | Loader exclusion 해제 = 동작 변화 → **Defer** | **개정** — **Consumable** exclusion 해제 = Structure Only (L6) **Apply 후보** · **Non-consumable** = **Defer** |
| **B6-M-05** | Not Persisted Ch.10으로 Apply 금지 | **유지** (현재 Ch.10 Ratified · 조건 해소) |
| **B6-M-06** | Apply Count = 0 유지 (Ch.10 전) | **개정** — Apply Count = **1** (`double_rail`) · code Apply는 **ADR 후** |

### 5.2 Amended Migration Rules (v1.1)

| ID | Rule |
|----|------|
| **B6-M-01** | 허용 = **Structure Only** only (cite Ch.10 Structure Only (L6)) |
| **B6-M-02** | Formula / System Value / Logic 의미 / Trajectory 의미 **금지** (Meaning Preservation) |
| **B6-M-03a** | Runtime / Loader / Registry **의미·책임 붕괴** 금지 (Sole Assembler / Sole Lookup Entry / Supply Isolation) |
| **B6-M-03b** | **Load Completeness** (Package Completeness Option C · Ch.10 **L6-C-02**)는 Structure Only (L6)로 **허용** — 의미 불변 전제 |
| **B6-M-04a** | **Consumable** exclusion 해제 = Apply 후보 (`double_rail`) — ADR 후 |
| **B6-M-04b** | **Non-consumable** exclusion 해제 = **Defer** (`0tip_plus`) — lift만으로 complete 금지 |
| **B6-M-05** | Ch.10 Not Persisted 상태에서 code Apply **금지** (현재 Ratified) |
| **B6-M-06** | 본 Amendment Scope Apply Count = **1** · **code Apply는 본 문서에서 수행하지 않음** |
| **B6-M-07** | System JSON 의미·좌표·formula·logic decision **mutation 금지** (exclusion 코드만 후보) |

용어 일관성 (shall use):

- **Structure Only (L6)**
- **Package Completeness**
- **Load Completeness**
- **Meaning Preservation**
- **Option C** (Ch.10)

---

## 6. Semantic Guard Amendment

### 6.1 Class Guard

| Class | Policy (v1.1) |
|-------|----------------|
| **Consumable** | ADR 이후 **Apply 후보** · Load Completeness 복원만 · 의미 불변 |
| **Non-consumable** | 계속 **Defer** · lift / “canonical complete” 선언 **Safe Stop** |
| **Special (DGR-008)** | **OOS** 유지 · anchors **발명 금지** |

### 6.2 Amended Triggers

| Trigger | Action |
|---------|--------|
| Formula / Value / Logic / Trajectory **의미** 변경 | **Safe Stop** |
| `0tip_plus` exclusion lift 또는 complete 오선언 | **Safe Stop** |
| Special anchors 발명 | **Forbidden** |
| B3 Metadata 재시도 | **Forbidden** |
| Public API / Sole Lookup Entry 붕괴 | **Safe Stop** |
| B6-EN 미충족 상태에서 code Apply | **Safe Stop** |
| **Consumable** (`double_rail`) exclusion 해제 — **ADR Approved 후** | **허용 (Apply)** |
| Consumable lift를 의미 변경으로 확장 | **Safe Stop** |

**Safe Stop ≠ FAIL.** Cite WG-AI-001 Execution Rule · Ch.10 L6-I-11.

### 6.3 Superseded (v1.0)

| v1.0 | v1.1 |
|------|------|
| “Loader exclusion 해제 시도 (현 Freeze) → Safe Stop” **전면** | **Non-consumable / ADR 전**에만 Safe Stop · Consumable은 ADR 후 Apply |

---

## 7. Validation Plan Amendment

**Apply Count = 1** (`double_rail`) 기준.  
본 Amendment 세션에서는 Validation을 **실행하지 않는다** — ADR / Apply 후 사용.

| Check | Plan (v1.1) |
|-------|-------------|
| **Loader smoke** | exclusion 제거 후 `getPackageAnchors("double_rail")` / Contract.anchors.trajectories **non-empty** |
| **Runtime Contract Validation** | `getSystemContract("double_rail")` ok · Shape / Invariants (Ch.10 L6-I-*) |
| **Semantic Guard** | Formula/Value/Logic/Trajectory 의미 diff = 0 · `0tip_plus` 미변경 |
| **Meaning Preservation** | System JSON 의미 파일 unchanged · exclusion 코드만 diff |
| **Public API surface** | Sole Lookup Entry + Approved siblings **불변** |
| **Registry cache** | Sole Cache Owner 유지 · bootstrap 후 `double_rail` registered · anchors consumable |
| **Build** | `npm run build` PASS |
| **Completeness (L6-VR-07)** | lift 대상 = consumable only · silent-drop 없음 |
| **WG-AI-001** | Runtime=Y · L3 Architecture Review Consume 기록 |

| Non-target in this Validation | |
|-------------------------------|--|
| `0tip_plus` lift | **Not in Scope** |
| Validation Engine redesign | B8 |
| Presentation | B7 |

---

## 8. Final Freeze Card v1.1

```text
────────────────────────────────────────────────────────
STEP8 B6 — Final Freeze Card v1.1 (Amended Scope)
────────────────────────────────────────────────────────
Freeze State     : B6 Apply Scope Frozen (Amended)
Amends           : B6 Target Freeze v1.0 (Empty Apply)
Ch.10            : Ratified · Option C Applied (Scope)
Architecture     : Review prior PASS · Conditional cause resolved (Ch.10)

Apply Count      : 1
Apply Target     : double_rail only
Apply Surface    : Loader exclusion lift (systemPackageStore) only
No-op Count      : 36
Defer            : 0tip_plus (+ residual non-Apply items: shape/version/capabilities …)
Out-of-Scope     : Formula/Value/Logic/Trajectory meaning · B3 · B7 · B8 ·
                   DGR-008 invent · non-consumable “complete” claims

Meaning          : Preserved
Structure Only   : L6 Load Completeness (Package Completeness)
Option C         : Applied (Scope)
WG-AI-001        : Consume (Runtime=Y → L3 at ADR/Apply)

Code Apply       : NOT performed in this Amendment
Next Gate        : ADR (Apply Design Review)
Then             : Apply (double_rail) → Validation → Commit/Push
Forbidden now    : Runtime/Loader/Registry silent mutation · 0tip_plus lift · B3 retry
────────────────────────────────────────────────────────
```

### ADR Entry (B6-EN) — Amendment 후 상태

| ID | Status after this Amendment |
|----|------------------------------|
| B6-EN-01 / 02 / 09 | **PASS** (Ch.10 Ratified) |
| B6-EN-03 | **PASS** (Freeze + Amendment on-disk) |
| B6-EN-04 | **PASS** (본 Scope Reconfirm → Amendment 기록) |
| B6-EN-05 | **PASS** (Amendment **Required → Complete**) |
| B6-EN-06 | **PASS** (Structure Only / Meaning / Completeness 재확인 · §4–6) |
| B6-EN-07 / 08 | **PASS** (B3 Hold · WG consume) |

→ **ADR 진입 조건: 충족 (문서 Gate).**  
실제 ADR 세션 · code Apply는 **별도**.

---

## 9. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | **B6 Target Freeze Amendment v1.1** 생성 · Scope Reconfirm Verdict **B** 반영 · Apply **0→1** (`double_rail`) · No-op **38→36** · `0tip_plus` Defer 유지 · Option C / Load Completeness cite Ch.10 · Migration B6-M-03/04 **개정** · Semantic Guard Consumable/Non-consumable/Special 분리 · Validation Plan Apply=1 · Final Freeze Card v1.1 · Next Gate = **ADR** · **No code/Apply/Validation/Commit** |

---

## 10. Related Documents (Consume / Cite)

| Document | Role |
|----------|------|
| `FLEET_CONTRACT_BOOK_B6_Target_Freeze.md` | v1.0 Amended-by 본 문서 |
| `FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` | Ratified · Option C · L6-C-* · Structure Only (L6) |
| `FLEET_CONTRACT_BOOK_Ch08_…` | trajectories · `0tip_plus` Deferred · `double_rail` exclusion→B6 |
| `FLEET_CONTRACT_BOOK_Ch09_…` | Logic 의미 Non-redefine |
| `FLEET_CONTRACT_BOOK_v1.0.md` | Front Matter · Ch.10 Ratified |
| `WG-AI-001_…` | Runtime=Y · L3 · Safe Stop |
| B6 Scope Reconfirm (Ask 2026-07-22) | Verdict B · Amendment Required |

---

## 11. Decision Summary (Amendment)

| Decision | Statement |
|----------|-----------|
| **D-STEP8-B6-A11-01** | B6 Scope = **Amended** · Apply Count **1** · Target **`double_rail` only** |
| **D-STEP8-B6-A11-02** | `0tip_plus` = **Defer** 유지 (Non-consumable) |
| **D-STEP8-B6-A11-03** | Option C / Load Completeness = Structure Only (L6) · Meaning Preserved |
| **D-STEP8-B6-A11-04** | B6-M-03/04 **개정** · Ch.10 L6-C-* 정합 |
| **D-STEP8-B6-A11-05** | 본 세션 **code Apply 없음** · Next Gate = **ADR** |

---

*End of FLEET_CONTRACT_BOOK_B6_Target_Freeze_Amendment_v1.1.md — Status: B6 Apply Scope Frozen (Amended) · Next Gate: ADR*
