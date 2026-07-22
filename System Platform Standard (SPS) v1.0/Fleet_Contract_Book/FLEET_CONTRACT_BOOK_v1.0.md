# Fleet Contract Book v1.0

```text
Document   : FLEET_CONTRACT_BOOK_v1.0.md
Type       : Fleet Contract Book — Front Matter (SSOT Index)
Version    : v1.0
Status     : Ratified (Conditional — chapter persistence partial)
Date       : 2026-07-22
Location   : System Platform Standard (SPS) v1.0/Fleet_Contract_Book/
Baseline   : c398f3abb4b52a11369f77bba1a5c4877155acb4
Rule       : Book SSOT 최우선 · WG-AI-001 Consume · Formula/Value/Trajectory 의미 불변 ·
             Runtime / Loader / Registry / System JSON / Code 변경은 본 문서가 허가하지 않음
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
| Ch.10 | L6 Runtime Contract | L6 | — | **Not Persisted** |
| Ch.11 | L7 Presentation Contract | L7 | — | **Not Persisted** |
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
| **B5** | **L5 Logic** | **Ch.9 Ratified** | **Scope Frozen (Amended)** · Apply 6 / Defer 14 · Architecture Review 권고 A · Next = Apply Design Review Recheck |
| B6…B8 | L6…Validation | Not Persisted | Pending |

---

## 5. Consume & Forbidden

### Consume

- `작업관리/WG-AI-001_Architecture_Impact_Working_Guideline.md` (PASS)
- STEP7 P5 / P6 IU suites (Design-only · Complete)
- STEP6 Final Freeze / Framework / Pipeline (Locked · Consume)
- Cursor Ask 검토 결과 (Ch.8 Ratify 범위 · B4 사전 검토)

### Forbidden (본 Book / 본 세션)

| Forbidden |
|-----------|
| Formula / System Value / Trajectory **의미** 변경 |
| Runtime / Loader / Registry **코드** 변경 |
| System JSON Apply (본 Front Matter·Ch.8 Ratify 세션에서) |
| Not Persisted 챕터를 Apply SSOT로 사용 |
| Ch.7 부재 상태에서 B3 Metadata rename 재시도 |
| Informal edit of Ratified chapters without Issue |

---

## 6. Persisted Chapter Index

| File | Role |
|------|------|
| `FLEET_CONTRACT_BOOK_v1.0.md` | Front Matter · Status Register (본 문서) |
| `FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md` | **Ch.8 L4 Anchor Contract — Ratified** |
| `FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md` | **Ch.9 L5 Logic Contract — Ratified** |
| `FLEET_CONTRACT_BOOK_B5_Target_Freeze.md` | **STEP8 B5 Target Freeze — Apply Scope Frozen (Amended) v1.1** |

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | Front Matter on-disk 생성 · Status = Ratified (Conditional) · Ch.8 = Ratified · Remaining Chapters = Not Persisted · Baseline `c398f3a` |
| 2026-07-22 | Ch.9 L5 Logic Contract on-disk Ratify · Chapter Status Register / Apply Mapping / Persisted Index 갱신 |
| 2026-07-22 | B5 Target Freeze on-disk · Status = **B5 Apply Scope Frozen** · Apply Mapping B5 = Scope Frozen · Next Gate = Apply Design Review |
| 2026-07-22 | B5 Target Freeze **Amendment v1.1** · Status = **Scope Frozen (Amended)** · Apply 7→6 · Defer 13→14 (`clay_shooting`) · summary→explicit Not in B5 Scope · Next = Apply Design Review Recheck |

---

*End of FLEET_CONTRACT_BOOK_v1.0.md — Front Matter*
