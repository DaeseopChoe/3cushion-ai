# Fleet Contract Book v1.0

```text
Document   : FLEET_CONTRACT_BOOK_v1.0.md
Type       : Fleet Contract Book — Front Matter (SSOT Index)
Version    : v1.0
Status     : Ratified (Conditional — chapter persistence partial)
Date       : 2026-07-23
Location   : System Platform Standard (SPS) v1.0/Fleet_Contract_Book/
Baseline   : c398f3abb4b52a11369f77bba1a5c4877155acb4
Rule       : Book SSOT 최우선 · WG-AI-001 Consume · Formula/Value/Trajectory 의미 불변 ·
             Runtime / Loader / Registry / System JSON / Code 변경은 본 문서가 허가하지 않음
Note       : STEP8 Fleet Apply (B0–B8) Completed · Final Validation Gate v1.0 · B3 Hold carried
```

---

## 0. Front Matter

| Field | Value |
|-------|-------|
| **Version** | **v1.0** |
| **Status** | **Ratified** (Conditional — only persisted chapters bind Apply) |
| **Baseline Commit** | `c398f3abb4b52a11369f77bba1a5c4877155acb4` (`STEP8 Session Close`) |
| **Runtime Baseline (historical)** | `ec71ef9` → Apply `82cb371` (B0+B1) · `a32bed9` (B2+B2.5) · close `c398f3a` |
| **WG-AI-001** | **Consume** · PASS · Freeze Candidate · Issue-only change |
| **Authority Scope** | STEP8 Fleet Apply Layer Contracts (persisted chapters only) |
| **Non-Target (Book-wide)** | Formula 의미 · System Value · Trajectory 의미 · Runtime/Loader/Registry **code** · silent System JSON mutation outside a ratified chapter Migration Rule |

### Ratified Review Posture

Fleet Contract Book v1.0 **Ratified Review PASS (Conditional)** 을 유지한다.

- **Conditional** 의미: 설계·Review는 완료되었으나, 챕터 본문의 **on-disk 영속은 부분적**이다.
- Apply는 **Status = Ratified 로 디스크에 존재하는 챕터만** 근거로 삼는다.
- **Not Persisted** 챕터를 근거로 한 Apply는 금지한다 (B3 HALTED 동일 논리).

---

## 1. Document Purpose

본 파일은 Fleet Contract Book v1.0의 **Front Matter · 목차 · 챕터 상태표**이다.

- Layer별 규범 본문은 챕터 파일에 둔다.
- 본 Front Matter는 **인덱스 + 권한 경계**만 정의한다.
- SPS 기초 문서(`System_Schema_Definition.md` 등)를 재정의하지 않는다. Fleet Apply 범위에서 충돌 시 **persisted Fleet chapter**가 Apply 권위를 갖는다.

---

## 2. Book Structure (설계 목차)

```text
Fleet Contract v1.0
├─ Front Matter          ← 본 문서
├─ Part A  Foundation    (Ch.1–4)
├─ Part B  Layer Contracts (Ch.5–11)
├─ Part C  Assurance     (Ch.12–14)
└─ Appendices (A–E)
```

Layer 스택 (고정):

```text
L1 Identity → L2 Schema → L3 Metadata → L4 Anchor → L5 Logic → L6 Runtime → L7 Presentation
```

---

## 3. Chapter Status Register

| Chapter | Title | Layer | On-disk File | Status |
|---------|-------|-------|--------------|--------|
| Front Matter | Book Index | — | `FLEET_CONTRACT_BOOK_v1.0.md` | **Ratified** |
| Ch.1 | Fleet Scope / Principles | Foundation | — | **Not Persisted** |
| Ch.2 | Fleet Policy | Foundation | — | **Not Persisted** |
| Ch.3 | System Classification | Foundation | — | **Not Persisted** |
| Ch.4 | Layer Contract Model | Foundation | — | **Not Persisted** |
| Ch.5 | L1 Identity Contract | L1 | — | **Not Persisted** |
| Ch.6 | L2 Schema Contract | L2 | — | **Not Persisted** |
| Ch.7 | L3 Metadata Contract | L3 | — | **Not Persisted** |
| **Ch.8** | **L4 Anchor Contract** | **L4** | **`FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md`** | **Ratified** |
| **Ch.9** | **L5 Logic Contract** | **L5** | **`FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md`** | **Ratified** |
| **Ch.10** | **L6 Runtime Contract** | **L6** | **`FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md`** | **Ratified** |
| **Ch.11** | **L7 Presentation Contract** | **L7** | **`FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md`** | **Ratified** |
| Ch.12–14 | Assurance | — | — | **Not Persisted** |
| Appendix A–E | Registers / Mapping / Glossary | — | — | **Not Persisted** |

### Status Rules

| Status | Meaning |
|--------|---------|
| **Ratified** | on-disk SSOT · Fleet Apply 근거로 사용 가능 |
| **Not Persisted** | 설계 산출물만 존재(대화 등) · **Apply 근거 금지** |
| **Applied** | 해당 Layer Apply Batch PASS 후 갱신 |
| **Verified** | Verification 완료 후 갱신 |

---

## 4. STEP8 Apply Mapping (cite)

| Batch | Layer | Chapter dependency | Current |
|-------|-------|--------------------|---------|
| B0 / B1 | L1 Identity | Ch.5 (Not Persisted) · executed under Conditional Review | **PASS** |
| B2 / B2.5 | L2 Schema / File-format | Ch.6 (Not Persisted) · executed under Conditional Review | **PASS** |
| B3 | L3 Metadata | Ch.7 **Not Persisted** | **HALTED (Safe Stop)** · do NOT retry |
| **B4** | **L4 Anchor** | **Ch.8 Ratified** | **Applied / PASS** |
| **B5** | **L5 Logic** | **Ch.9 Ratified** | **Applied / PASS** · Structure-only · Apply 6 / Defer 14 |
| **B6** | **L6 Runtime** | **Ch.10 Ratified** | **Applied / PASS** · Amendment v1.1 · ADR Approve · Apply 1 (`double_rail` Loader exclusion only) · L6-VR **PASS** · `0tip_plus` Defer · Meaning Preservation |
| **B7** | **L7 Presentation** | **Ch.11 Ratified** | **PASS / Completed** · Empty Apply (**0**) · L7-VR **PASS** · Code ADR **Not Required** · L7-D-001 Explicit Defer · Next = **B8 Validation** |
| **B8** | **Validation** | — (Ch.12–14 Not Persisted · not Apply SSOT) | **PASS / Completed** · Empty Apply (**0**) · Mode A · B8-VR **PASS** · XC-01…XC-12 **PASS** · Code ADR **Not Required** · Fleet Closure **Confirmed** · Final Validation Gate v1.0 |

---

## 5. Consume & Forbidden

### Consume

- `작업관리/WG-AI-001_Architecture_Impact_Working_Guideline.md` (PASS)
- STEP7 P5 / P6 IU suites (Design-only · Complete)
- STEP6 Final Freeze / Framework / Pipeline (Locked · Consume)
- Cursor Ask 검토 결과 (Ch.8 Ratify 범위 · B4 사전 검토)
- Ch.10 L6 Runtime Contract (Ratified · Minor Amendment) · B6 Target Freeze v1.0 · Amendment v1.1 · ADR-STEP8-B6-01
- Ch.11 L7 Presentation Contract (Ratified · L7-D-001 Explicit Defer)
- B7 Target Freeze v1.0 (Empty Apply · Scope Frozen)
- B8 Target Freeze v1.0 (Validation Scope Frozen · Empty Apply)
- STEP8 Final Validation Gate v1.0 (Fleet Apply Completed · Final Acceptance)

### Forbidden (Book-wide / Hold)

| Forbidden |
|-----------|
| Formula / System Value / Trajectory **의미** 변경 |
| Runtime / Loader / Registry **책임 붕괴** · Public API silent break |
| Not Persisted 챕터를 Apply SSOT로 사용 |
| Ch.7 부재 상태에서 B3 Metadata rename 재시도 |
| Informal edit of Ratified chapters without Issue |
| `0tip_plus` exclusion lift / false-complete 선언 (B6 Defer) |

---

## 6. Persisted Chapter Index

| File | Role |
|------|------|
| `FLEET_CONTRACT_BOOK_v1.0.md` | Front Matter · Status Register (본 문서) |
| `FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md` | **Ch.8 L4 Anchor Contract — Ratified** |
| `FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md` | **Ch.9 L5 Logic Contract — Ratified** |
| `FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` | **Ch.10 L6 Runtime Contract — Ratified** (Minor Amendment Complete) |
| `FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md` | **Ch.11 L7 Presentation Contract — Ratified** (v1.0 · L7-D-001 Explicit Defer) |
| `FLEET_CONTRACT_BOOK_B5_Target_Freeze.md` | **STEP8 B5 Target Freeze — Apply Scope Frozen (Amended) v1.1** |
| `FLEET_CONTRACT_BOOK_B6_Target_Freeze.md` | **STEP8 B6 Target Freeze — Apply Scope Frozen (Empty Apply) v1.0** (superseded Scope by Amendment) |
| `FLEET_CONTRACT_BOOK_B6_Target_Freeze_Amendment_v1.1.md` | **STEP8 B6 Target Freeze Amendment v1.1** — Apply Count 1 · `double_rail` |
| `FLEET_CONTRACT_BOOK_B6_ADR_Apply_Design_Review.md` | **ADR-STEP8-B6-01** — Approve · Execution Baseline · EB-01…07 |
| `FLEET_CONTRACT_BOOK_B7_Target_Freeze.md` | **STEP8 B7 Target Freeze — Apply Scope Frozen (Empty Apply) v1.0** |
| `FLEET_CONTRACT_BOOK_B8_Target_Freeze.md` | **STEP8 B8 Target Freeze — Validation Scope Frozen (Empty Apply) v1.0** |
| `FLEET_CONTRACT_BOOK_STEP8_Final_Validation_Gate.md` | **STEP8 Fleet Apply Final Validation Gate — Completed · Final Acceptance v1.0** |

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | Front Matter on-disk 생성 · Status = Ratified (Conditional) · Ch.8 = Ratified · Remaining Chapters = Not Persisted · Baseline `c398f3a` |
| 2026-07-22 | Ch.9 L5 Logic Contract on-disk Ratify · Chapter Status Register / Apply Mapping / Persisted Index 갱신 |
| 2026-07-22 | B5 Target Freeze on-disk · Status = **B5 Apply Scope Frozen** · Apply Mapping B5 = Scope Frozen · Next Gate = Apply Design Review |
| 2026-07-22 | B5 Target Freeze **Amendment v1.1** · Status = **Scope Frozen (Amended)** · Apply 7→6 · Defer 13→14 (`clay_shooting`) · summary→explicit Not in B5 Scope · Next = Apply Design Review Recheck |
| 2026-07-22 | B6 Target Freeze on-disk v1.0 · Apply Mapping B6 = **Review / Freeze Complete** (Empty Apply · PASS Conditional) · Ch.10 remains **Not Persisted** · ≠ Apply PASS · ≠ Verified · Persisted Index + B6 Freeze · Next Gate = **Ch.10 Ratify** |
| 2026-07-22 | **Ch.10 L6 Runtime Contract Ratified** · Minor Amendment Complete · Chapter Status Ch.10 = **Ratified** · Persisted Index + Apply Mapping B6 Next = **Scope Reconfirm → ADR** · Remaining chapters (ex Ch.8–10) Not Persisted |
| 2026-07-22 | **B6 Applied / PASS** · Freeze Amendment v1.1 · ADR Approve · Loader exclusion lift `double_rail` only · L6-VR PASS · Apply Mapping B6 = **Applied / PASS** · Next = **B7 Presentation** |
| 2026-07-23 | **Ch.11 L7 Presentation Contract Ratified** · Chapter Status Ch.11 = **Ratified** · Persisted Index + Apply Mapping B7 = Ch.11 Ratified · Next = **B7 Target Freeze** · L7-D-001 Explicit Defer 유지 · Remaining chapters (ex Ch.8–11) Not Persisted · **No Code Apply** |
| 2026-07-23 | **B7 Target Freeze on-disk v1.0** · Status = **B7 Apply Scope Frozen (Empty Apply)** · Apply Mapping B7 = **Scope Frozen (Empty Apply)** · Apply **0** · Code ADR **Not Required** · L7-D-001 Explicit Defer 유지 · Persisted Index + B7 Freeze · Next Gate = **B7 Validation** · **No Code Apply** · ≠ Apply PASS |
| 2026-07-23 | **B7 PASS / Completed** · L7-VR-01…12 **PASS** (Empty Apply · document/vacuous) · Apply Mapping B7 = **PASS / Completed** · Next = **B8 Validation** · Code Apply / JSON / Runtime **미변경** · ≠ Code Apply PASS (Apply = 0) |
| 2026-07-23 | **B8 Target Freeze on-disk v1.0** · Status = **B8 Validation Scope Frozen (Empty Apply)** · Apply Mapping B8 = **Scope Frozen (Empty Apply)** · Apply **0** · Code ADR **Not Required** · Mode A · Exit Criteria XC-01…XC-12 · B8-VR-01…12 · Persisted Index + B8 Freeze · Next Gate = **B8 Validation Execution** · **No Code Apply** · ≠ Validation PASS · ≠ Fleet Closure |
| 2026-07-23 | **B8 Validation PASS** · Mode A · B8-VR-01…11 **PASS** · XC-01…XC-12 **PASS** · Apply Mapping B8 = **PASS / Completed** · **Fleet Closure Confirmed** · Final Validation Gate v1.0 · STEP8 Fleet Apply (B0–B8) **Completed** · B3 Hold carried · Code Apply / Runtime / JSON **미변경** · Ops SSOT sync (MASTER · LOG · HANDOFF) |

---

*End of FLEET_CONTRACT_BOOK_v1.0.md — Front Matter*
