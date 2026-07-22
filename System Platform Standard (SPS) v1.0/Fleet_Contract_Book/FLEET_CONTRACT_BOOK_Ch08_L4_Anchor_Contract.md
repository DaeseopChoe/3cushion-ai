# Fleet Contract Book — Chapter 8

# Layer 4 : Anchor Contract

```text
Document   : FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md
Type       : Fleet Contract Book · Chapter 8 · L4 Anchor Contract
Version    : v1.0
Status     : Ratified
Date       : 2026-07-22
Book       : Fleet Contract Book v1.0 (Conditional · Ch.8 persisted)
Baseline   : c398f3abb4b52a11369f77bba1a5c4877155acb4
Depends on : Fleet Scope Non-Target · WG-AI-001 Consume · Anchor Canonical Policy (trajectories)
Rule       : Contract only · No Formula/Value/Trajectory meaning change ·
             No Runtime/Loader/Registry/Code/System JSON mutation in this Ratify session
Source     : Cursor Ask 검토 결과 (B4 사전 검토 · Ch.8 Ratify 설계 범위) only
```

---

## 0. Layer Header

| 항목 | 값 |
|------|----|
| **Layer ID** | **L4** |
| **Layer Name** | Anchor Contract |
| **Status** | **Ratified** |
| **Introduced** | v1.0 (on-disk 2026-07-22) |
| **Class Applicability** | **Normal 전용** · Special = anchors **N/A** |
| **Depends on** | L1 Identity · L2 Schema (shape) · Classification (Normal/Special) · Fleet Non-Target |
| **Consumed by** | L6 Runtime (cite binding only) · STEP8 Batch **B4** |
| **Book file** | `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md` |

---

## 1. Purpose

Normal 시스템의 `anchors.json`에 대한 **canonical 계약**을 정의한다.

본 Chapter가 규정하는 것:

- Canonical Anchor Definition (`trajectories` 채택)
- Track 집합
- Anchor container shape
- Anchor id 문법 (`MARK_(x,y)_sys`)
- flat → `trajectories` Migration Rule (조건부)
- Semantic Guard · Prohibited Changes · Acceptance Criteria
- Special 시스템에 대한 anchors **N/A** 정책

본 Chapter가 규정하지 **않는** 것:

- Formula / System Value / Trajectory **물리·계산 의미**
- 좌표 값의 재계산·재매핑 (Coordinate Canonical Mapping)
- Runtime / Loader / Registry **구현 변경**
- `anchors.meta` 키 rename (L3 / Ch.7 / B3)
- Loader eager exclusion 해제 (L6 / B6)

---

## 2. Scope

### 2.1 In Scope (L4)

| # | Item |
|---|------|
| 1 | `anchors.json`의 **구조(shape)** — `trajectories` canonical |
| 2 | Track 키 집합 |
| 3 | `anchors[]` container 및 `id` 필드 문법 |
| 4 | Normal vs Special(anchors N/A) 적용 경계 |
| 5 | Migration Rule · Semantic Guard · Acceptance (Schema Normalize only) |

### 2.2 Out of Scope

| # | Item | Owner |
|---|------|-------|
| 1 | Formula / expr / System Value | Non-Target |
| 2 | Trajectory 물리 의미 · path 알고리즘 | Non-Target / Domain Trajectory |
| 3 | 좌표 `(x,y)` / `sys` **값 변경** | **Prohibited** |
| 4 | `anchors.meta` semantic key rename | Ch.7 / B3 (HALTED) |
| 5 | Loader exclusion 해제 · Registry/Runtime code | Ch.10 / B6 |
| 6 | 부재 시스템에 앵커 파일·좌표 **발명** | **Prohibited** |

### 2.3 Class Applicability

| Class | anchors.json | L4 적용 |
|-------|--------------|--------|
| **Normal** | 존재 · canonical = `trajectories` | **필수** |
| **Special** | **N/A** (부재 허용) | L4 Schema Apply 대상 **아님** |

Special (Inventory OBS-PKG-001 / DGR-008) — anchors **absent · N/A**:

- `3tip_across`
- `accordion`
- `split`
- `spread30`

---

## 3. Dependencies

| Dependency | Role | Note |
|------------|------|------|
| Fleet Non-Target | 공식/값/궤적 의미 불변 | 모든 L4 규칙 상위 |
| WG-AI-001 | Impact / Risk / Safe Stop | Consume |
| L1 Identity | system folder / systemId | Consume · 재정의 금지 |
| L2 Schema | 4-file · JSON 유효성 | Consume · L4는 anchors **내용 계약** |
| Classification | Normal / Special | Special = anchors N/A |
| L3 Metadata (Ch.7) | `anchors.meta` 의미 | **Not Persisted** · L4는 meta **rename 금지** |
| Runtime Binding | 소비 경로 cite | 구현 변경 지시 금지 |

---

## 4. Canonical Anchor Definition

### 4.1 Canonical Policy

**Fleet Canonical Anchor = `trajectories` 구조.**

- flat 최상위 `anchors: [...]` 배열은 **non-canonical**이다.
- Runtime 소비 경로는 `trajectories` 를 전제한다 (Binding §9).

### 4.2 trajectories Canonical Shape

```text
anchors.json (canonical) =
{
  "meta"?: { ... },                    // optional · L3 rename 금지 · L4는 존재만 허용
  "trajectories": {
    "<TRACK>": {
      "meta"?: { ... },                // optional (e.g. turn)
      "anchors": [
        { "id": "MARK_(x,y)_sys" }
      ]
    }
  }
}
```

| Field | Requirement |
|-------|-------------|
| `trajectories` | **Required** (Normal) |
| `trajectories.<TRACK>.anchors` | **Required** array (track가 존재할 때) |
| `trajectories.<TRACK>.anchors[].id` | **Required** string · §6 id 규칙 |
| root `meta` | Optional |
| track `meta` | Optional |
| root flat `anchors` (no `trajectories`) | **Non-canonical** |

### 4.3 Track Definition

허용 Track 집합 (canonical):

| Track ID | Meaning (label only · 물리 의미 재정의 금지) |
|----------|-----------------------------------------------|
| `B2T_L` | Bottom-to-Top · Left turn family |
| `B2T_R` | Bottom-to-Top · Right turn family |
| `T2B_L` | Top-to-Bottom · Left turn family |
| `T2B_R` | Top-to-Bottom · Right turn family |

규칙:

- Track 키는 위 집합의 **문자열 리터럴**을 사용한다.
- 시스템에 따라 일부 Track만 존재할 수 있다 (전부 필수는 아님).
- 존재 시 해당 Track의 `anchors` 배열은 id 규칙을 만족해야 한다.
- 신규 Track 이름 발명은 L4 변경(Issue) 없이 금지한다.

### 4.4 Anchor ID Rule

**Canonical id grammar:**

```text
MARK_(x,y)_sys
```

| Part | Rule |
|------|------|
| `MARK` | `CO` · `C1` · `C2` · `C3` · `C4` · `C5` · `C6` (lookup engine 정합) |
| `(x,y)` | 유한 숫자 좌표 · **Apply 중 값 변경 금지** |
| `sys` | 유한 숫자 system value · **Apply 중 값 변경 금지** |

정규식 정합 (Runtime cite):

```text
^(\w+)_\(([^,]+),([^)]+)\)_(.+)$
```

- id는 **좌표 SSOT의 운반자**이다. Schema Normalize는 id **문자열을 변경하지 않는다**.
- id 문법을 만족하지 않는 문자열은 L4 canonical id가 **아니다**.

---

## 5. Source & Precedence

| Priority | Source | Use |
|----------|--------|-----|
| 1 | **본 Chapter (Ch.8 Ratified)** | STEP8 B4 Apply 근거 |
| 2 | Fleet Front Matter Non-Target | 의미 불변 상위 규칙 |
| 3 | WG-AI-001 | Safe Stop / Impact |
| 4 | Runtime 관찰 (`SystemContractAnchors`, lookup engines) | Binding cite · 구현 변경 근거 아님 |
| 5 | SPS `System_Schema_Definition.md` §16 | 일반 원칙 Consume · Fleet L4 매핑 테이블 대체 불가 |

충돌 시: **persisted Ch.8**이 Fleet Anchor Apply 권위를 갖는다. SPS 본문을 본 세션에서 수정하지 않는다.

---

## 6. Rules (SHALL)

| ID | Rule |
|----|------|
| **L4-R-01** | Normal 시스템의 canonical anchors shape는 **`trajectories`** 이다. |
| **L4-R-02** | Track 키는 §4.3 허용 집합만 사용한다. |
| **L4-R-03** | 각 anchor 항목은 `id` 문자열을 가지며, canonical id는 `MARK_(x,y)_sys` 이다. |
| **L4-R-04** | Special 시스템(`3tip_across`, `accordion`, `split`, `spread30`)의 anchors는 **N/A**이다. 파일을 발명하지 않는다. |
| **L4-R-05** | Schema Normalize Apply는 **id 문자열 바이트 동일**을 유지한다 (좌표/`sys` 불변). |
| **L4-R-06** | 의미 변경 가능성 확인 시 **즉시 Safe Stop** 한다 (Semantic Guard). |
| **L4-R-07** | L4 Apply는 Runtime / Loader / Registry **코드를 변경하지 않는다**. |

---

## 7. Prohibited Changes

| ID | Prohibited |
|----|------------|
| **L4-P-01** | Formula / expr / System Value 변경 |
| **L4-P-02** | Trajectory 물리·계산 의미 변경 |
| **L4-P-03** | Anchor id 내 `(x,y)` 또는 `sys` **값** 변경 |
| **L4-P-04** | Fg / Rg 재해석을 위한 좌표 remap |
| **L4-P-05** | 공식·값으로부터 앵커 좌표 **역산 생성** |
| **L4-P-06** | Special(N/A) 시스템에 anchors.json **신규 창작** |
| **L4-P-07** | `anchors.meta` / track `meta` **키 rename** (Ch.7 부재 · B3 HALTED) |
| **L4-P-08** | Loader eager exclusion 해제 · Registry/Runtime code 변경 |
| **L4-P-09** | id 문법이 `MARK_(x,y)_sys`가 **아닌** flat 데이터를, 좌표 재구성 없이 “canonical 완료”로 선언 |

---

## 8. Validation Rules

| ID | Check | Pass condition |
|----|-------|----------------|
| **L4-V-01** | Shape | Normal: root에 `trajectories` object 존재 |
| **L4-V-02** | Track | `trajectories` 키 ⊆ §4.3 허용 집합 |
| **L4-V-03** | Id grammar | 각 `anchors[].id`가 `MARK_(x,y)_sys` 파싱 가능 |
| **L4-V-04** | Identity preserve | Migration 전후 **동일 id 멀티셋** (정렬 비교) |
| **L4-V-05** | Special N/A | DGR-008 4시스템: anchors 부재 유지 (강제 생성 없음) |
| **L4-V-06** | Semantic Guard | L4-P-* 위반 징후 시 Fail / Safe Stop |

---

## 9. Runtime Binding (cite only)

관찰된 소비 경로 (구현 변경 지시 **아님**):

```text
anchors.json
  → runtime/loader/systemPackageStore.getPackageAnchors()
  → runtime/loader/systemLoader.parseAnchors()
  → SystemContract.anchors { trajectories, meta }
  → App.resolveAnchorsData()          // trajectories 없으면 undefined
  → domain/runtimeContractSupply
  → domain/anchorLookupEngine         // id: MARK_(x,y)_sys
  → domain/anchorCoordinateEngine
  → domain/trajectory/* (해석된 좌표 소비)
```

관련 타입 cite:

- `SystemContractAnchors` — `trajectories` + `meta`
- `PackageAnchorsData` — loader-internal

**Loader note (Out of L4 Apply):**

- `systemPackageStore`는 `0tip_plus` · `double_rail` anchors를 eager glob에서 **제외** 중이다.
- exclusion 해제는 **B6 / L6** 범위이며 Ch.8 Ratify · B4 Schema Apply의 성공 조건이 **아니다**.

---

## 10. Migration Rule (flat → trajectories)

### 10.1 Definition

**Migration** = non-canonical `anchors.json`을 canonical `trajectories` shape로 정합하는 것.  
**Schema Normalize only** — 좌표·sys·formula 의미 변경 없음.

### 10.2 Safe Migration (허용)

다음을 **모두** 만족할 때만 Safe Apply 후보:

| # | Condition |
|---|-----------|
| 1 | 대상이 **Normal** 클래스 |
| 2 | 기존 anchor 항목의 `id`가 이미 `MARK_(x,y)_sys` 문법 |
| 3 | 변환이 **구조 래핑/재배치만** 수행 (id 문자열 불변) |
| 4 | Track 키가 §4.3 집합 |
| 5 | Acceptance §11 PASS |

예시 (개념): 이미 id-canonical인 항목을 track별 `trajectories.<TRACK>.anchors`로 옮기는 것.

### 10.3 Unsafe / Deferred (금지 또는 B4 제외)

| Case | Repository fact | Disposition |
|------|-----------------|-------------|
| **Flat + non-canonical id** | `0tip_plus` — flat · id 예: `RT_COrg5_y20` | **Deferred** — 단순 wrap ≠ canonical · 좌표 재구성은 L4-P-03/05 위반 위험 |
| **Flat + non-canonical id** | `1byhalf` — flat · id 예: `C1_COy0` | **Deferred** — 동일 |
| **Special absent** | `3tip_across`, `accordion`, `split`, `spread30` | **N/A** — 파일 생성 금지 |
| **Already canonical** | 32 systems with `trajectories` + `MARK_(x,y)_sys` | **No-op** (확인만) |
| **Format already fixed** | `double_rail` — trajectories JSON (B2.5) | **No-op** for shape · Loader exclusion = B6 |

### 10.4 B4 Target Freeze 규칙

B4는 본 Migration Rule이 **Safe**로 분류한 대상만 포함한다.

- Deferred (`0tip_plus`, `1byhalf`)는 **별도 Issue / 후속 배치** 없이 B4에 넣지 않는다.
- Special N/A는 B4 성공 조건에 포함하지 않는다.
- Loader exclusion 해제는 B4 성공 조건에 포함하지 않는다.

---

## 11. Semantic Guard

| Trigger | Action |
|---------|--------|
| id 내 좌표/`sys` 변경 필요성 발견 | **Safe Stop** |
| flat → trajectories에 **새 좌표 발명** 필요 | **Safe Stop** |
| Formula / System Value / Trajectory 의미 영향 | **Safe Stop** |
| meta 키 rename 유혹 (Ch.7 부재) | **Stop** · Ch.7/B3 경로로 분리 |
| Loader/Registry 코드 수정 필요성 | **Stop** · B6로 분리 |

**Safe Stop ≠ FAIL.** 근거 SSOT·매핑이 부족하면 중단이 정상이다 (B3 동일 원칙).

---

## 12. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| **L4-AC-01** | 대상 파일에 `trajectories` canonical shape 존재 (Safe 대상에 한함) |
| **L4-AC-02** | Migration 전후 `id` 멀티셋 동일 (정렬 비교) |
| **L4-AC-03** | 각 id가 `MARK_(x,y)_sys` 파싱 가능 |
| **L4-AC-04** | Track 키 ⊆ 허용 집합 |
| **L4-AC-05** | Special 4시스템: anchors 부재 유지 |
| **L4-AC-06** | Deferred 2시스템(`0tip_plus`, `1byhalf`): B4에서 **미변경** (또는 명시적 제외) |
| **L4-AC-07** | Runtime / Loader / Registry / 본 Ratify 외 Code **미변경** |
| **L4-AC-08** | Formula / System Value / Trajectory 의미 **미변경** |

---

## 13. Out-of-Scope (명시)

| Item | Status |
|------|--------|
| Ch.7 Metadata canonical mapping | Not Persisted · B3 HALTED |
| B3 Metadata Normalize retry | **Forbidden** |
| Loader eager exclusion 해제 (`0tip_plus`, `double_rail`) | B6 |
| Coordinate Canonical Mapping (C) | **Prohibited** under L4 |
| Anchor Metadata key rename (A) | Ch.7 / B3 |
| flat non-canonical-id 이관 완료 선언 | Deferred · not B4 default |
| Git Commit / Push | 별도 세션 (본 Ratify 세션 비범위일 수 있음) |

---

## 14. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | Ch.8 L4 Anchor Contract **on-disk Ratified** · Canonical = trajectories · id = `MARK_(x,y)_sys` · Migration Safe/Deferred/N/A 구분 · Semantic Guard · B4 Target Freeze 규칙 · Special N/A (DGR-008) · Loader exclusion → B6 |

---

## 15. Decision Summary (Ratify)

| Decision | Statement |
|----------|-----------|
| **D-FCB-Ch8-01** | Ch.8 = **Ratified** on-disk SSOT |
| **D-FCB-Ch8-02** | Canonical Anchor = **`trajectories`** |
| **D-FCB-Ch8-03** | Canonical id = **`MARK_(x,y)_sys`** · 값 변경 금지 |
| **D-FCB-Ch8-04** | Special 4 = anchors **N/A** · 파일 발명 금지 |
| **D-FCB-Ch8-05** | `0tip_plus` · `1byhalf` = Migration **Deferred** (non-canonical id) |
| **D-FCB-Ch8-06** | B4 = Schema Normalize only · Loader/Runtime/meta rename 제외 |
| **D-FCB-Ch8-07** | 본 세션 = **문서 Ratify only** · Apply / JSON / Code / Commit / Push 없음 |

---

*End of FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md — Status: Ratified*
