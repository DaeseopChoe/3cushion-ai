# Family Data Architecture — Design Draft

```
Document  : FAMILY_DATA_ARCHITECTURE_DRAFT.md
Type      : Confirmed Design · partial implementation (uncommitted)
Authority : Status/Design — consume via PROJECT_MASTER_INDEX
Date      : 2026-08-18 · CURRENT status refreshed 2026-08-24
Status    : CONFIRMED DESIGN · Phase 3A-359 Derived Data COMPLETE (Cue→Impact · C3+ scoring · Unified Review) · Phase 3A-349 controlled flag default ON (gated READ) · Phase 3A-347 parity PASS · Phase 3A-345 Exact-ball rematerialize + sourceSlot (schema v2) · Phase 3A-342 gated READ · Phase 3A-339 preserve KEEP positions+meta · FULL H3 DEFERRED · WRITE SSOT still positions_dataset
Not       : Official Glossary (until GLOSSARY_SSOT cites) · family_* durable SSOT · Search Index · Approval History +0 · legacy retirement · Full H3 storage split · F12 content fingerprint
```

> 본 문서는 Family 저장/생성 **TARGET 설계** + **CURRENT 구현 상태**를 함께 둔다.  
> **CURRENT ≠ TARGET.** Physical normalized **shadow** stores (`family_masters` / `family_members`)는 구현됨 (schema **v2** · `sourceSlot`).  
> Production **WRITE** corpus SSOT는 여전히 **`positions_dataset`**. Normalized READ는 **gated optional projection** (flag ∧ freshness ∧ rematerialize OK); default flag **true** (3A-349); flag OFF → instant legacy.  
> 기존 SSOT(Envelope Sampling · Dataset 3계층 · Display Boundary · Calculation Rules expr/sys)를 **재정의하지 않는다**.

---

## CURRENT IMPLEMENTATION STATUS — 2026-08-24 (Derived Data COMPLETE · Phase 3A-349 READ)

| Item | CURRENT |
|------|---------|
| **Production corpus SSOT (WRITE)** | `positions_dataset` (+ React `dataset` mirror) |
| **Safe corpus persist** | `persistPositionsDatasetWithGeneration` — invalidate → positions → gen (3A-335) |
| **Legacy generation meta** | `positions_dataset_meta.corpusGeneration` (authority) |
| **Normalized shadow stores** | `family_masters` · `family_members` — schema **v2** · **`sourceSlot` required** |
| **Shadow dual-write** | SAVE · Derived Approval · Import — migrate persists `sourceSlot` |
| **Freshness API** | `evaluateNormalizedCorpusFreshness` — schema v2 + referential + gen equality |
| **Feature flag** | `FAMILY_NORMALIZED_STORAGE_ENABLED = true` · gated READ · OFF → legacy rollback |
| **Production READ loader** | `loadProductionCompatibleDataset()` (3A-342) |
| **Normalized production READ** | **Gated default ON** (3A-349) — rematerialize Exact-ball packing when eligible |
| **Rematerialization** | one Exact balls → one PositionRecord · `strategies[sourceSlot]` · collision fail-closed |
| **Old family schema** | v1 / missing `sourceSlot` → SCHEMA_MISMATCH / invalid → legacy fallback · rebuild on next SAVE |
| **Compatibility hydrate** | via rematerializer — not member-per-record fan-out |
| **Production parity regressions** | **PASS** (3A-347) · default-ON + OFF rollback (3A-349) |
| **History** | SAVE **+1** · Approval **+1** (Cue∪C3+ one commit) · restore bumps gen, does **not** sync `family_*` |
| **Derived Data (3A-359)** | **COMPLETE** — Cue→Impact · C3+ scoring · Unified Review · atomic 4-track · History/Recall PASS |
| **Transitional H3** | **HARDENED** (3A-337) |
| **Full H3** | **DEFERRED** |
| **preserve_dataset** | **positions + meta KEEP** · **family_* DELETE** (3A-339) |
| **SearchIndex** | **NOT IMPLEMENTED** · **NOT REQUIRED** |
| **Export** | **Legacy unchanged** |
| **F12 residual** | generation-aligned content drift theoretically possible |
| **Pending** | Post-enable Ask audit · Commit/Push · Full H3 (later) |
| **NOT DONE** | family_* as durable SSOT · Approval History **+0** · positions retirement · Full H3 · SearchIndex |

Detail chronology: `HISTORY/PROJECT_LOG_2026-08.md` Phase **3A-320 ~ 3A-349**. Status pointer: `PROJECT_MASTER_INDEX.md`.

### CURRENT layer roles (do not confuse with TARGET)

| Layer | CURRENT role |
|-------|----------------|
| `positions_dataset` | **Production corpus WRITE SSOT** · default READ · fallback READ |
| `positions_dataset_meta` | **Generation authority** |
| `family_masters` / `family_members` | **Normalized shadow** · optional gated READ via Exact-ball rematerialize |
| `workspace_history` | Workspace save-event snapshots — **≠** Member DB |
| SearchIndex | Not present · not a READ prerequisite |

---

## TARGET ARCHITECTURE (design — not fully production)

| Layer | TARGET role |
|-------|-------------|
| **FamilyMaster** | Family-common payload **physical SSOT** (`signature`, `sysInputs`, `corrections*`, `ai`, `str`, canonical `hpT`, …) |
| **FamilyMember** | balls `{cue,target,second}` + track + provenance / member-delta **physical SSOT** — **no** family-common payload duplicate |
| **SearchIndex** | Rebuildable **locator/index** (memberId, familyId, 3-ball) — **not** common-payload SSOT |
| **History** | **Workspace-only** snapshot — **not** Member DB · **not** persistent corpus SSOT |
| **Long-term Approval** | Members(+SearchIndex) update · History **+0** |
| **Long-term Export** | Corpus from Master+Members — **not** History-row merge/dedup |

Sections below (§1–…) describe this **TARGET** design and earlier phase contracts. They are **not** claims that production has cut over.

---

## 0. Status split

| Item | Status |
|------|--------|
| Family Master / Member **schema + shadow stores** | **IMPLEMENTED** (uncommitted · 3A-321…326) — physical keys exist; **not** production primary SSOT |
| Family Master / Member as **production corpus SSOT** | **NOT YET** — still `positions_dataset` |
| 4 Track auto-generation | **IMPLEMENTED** (uncommitted) — AUTHORED SAVE → 4-track writer |
| Cue→Impact Derived Members | **COMPLETE** (3A-359) — Unified Review; Approval persists Derived via existing writer + shadow dual-write |
| SAVE auto-connect Derived (no review) | **NOT IMPLEMENTED** — REVIEW_REQUIRED remains |
| C3+ Scoring Line Derived Members | **COMPLETE** (3A-359) — Hybrid sampling · display-only markers · atomic 4-track · Unified Review |
| C3_PLUS Search Index | **NOT IMPLEMENTED** |
| Unified Derived Review (Cue ∪ C3+) | **COMPLETE** (3A-359L/M) — one Approve write/commit · Cue interactive · C3+ display-only |
| Atomic 4-track Derived consistency | **COMPLETE** — `FOUR_TRACK_INCONSISTENT` · ALL NO_SB = normal C3+ skip |
| Admin commands 원본수정 / 파생수정 / 새로저장 | **CONFIRMED DESIGN** · NEXT Phase 4 |
| Existing production derived / symmetry rules | **IMPLEMENTED / SSOT** — reuse; do not reinvent |
| Envelope `cueSet` 1/3 · 1.5gr Sampling | **Architecture Freeze** — Search sampling; **≠** Family Cue→Impact 30% Derived |
| Dataset 3계층 (Working / History / Published) | **IMPLEMENTED** — do not collapse History↔Export; Family Master+Members sit **above** later |
| Family identity / 4-track SAVE / generic writer | **IMPLEMENTED** (uncommitted) — Phase 2C.1 + 3A-1/3A-2 |
| Cue→Impact first 30% Derived generator | **COMPLETE** (Phase 3A-3D · product lock 3A-359) |
| Normalized shadow dual-write (SAVE/Approval/Import) | **IMPLEMENTED** (uncommitted · Phase 3A-326) |
| Generation / freshness contract (`corpusGeneration`) | **IMPLEMENTED** (uncommitted · Phase 3A-333) — not READ enablement |
| Generation failure-safety (invalidate → write → gen) | **IMPLEMENTED** (uncommitted · Phase 3A-335) |
| Transitional History H3 contract regression | **IMPLEMENTED** (uncommitted · Phase 3A-337) |
| preserve_dataset KEEP positions+meta / DELETE family_* | **IMPLEMENTED** (uncommitted · Phase 3A-339) |
| Gated Normalized READ (flag ∧ fresh ∧ hydrate) | **IMPLEMENTED** (uncommitted · Phase 3A-342) — default flag **true** (3A-349) |
| Exact-ball rematerialize + `sourceSlot` (schema v2) | **IMPLEMENTED** (uncommitted · Phase 3A-345) |
| Production semantic parity regressions (ADMIN LocalDB / S2·S3 SAVE / Approval·Import reload) | **PASS** (uncommitted · Phase 3A-347 · test-only) |
| Controlled production flag enable | **DONE** (uncommitted · Phase 3A-349) — default **true**; OFF rollback preserved |
| Full H3 workspace/corpus storage split | **DEFERRED** |
| Normalized READ as durable authority / family_* WRITE SSOT | **NOT DONE / FORBIDDEN** |
| BUG-A display-cap nearest-rail | **IMPLEMENTED** (uncommitted) — cite LOG 2026-08-17 |
| BUG-B Reset/History stale | **UNCONFIRMED** — BUG-A 수정 후 재현 필요 · separate from Family |

---

## 1. Purpose

관리자가 **기준 데이터 1개**를 입력하면:

1. 나머지 **3 Track**을 대칭으로 생성하고
2. 각 Track의 **파생 Member**를 기존 규칙으로 생성하며
3. 검색은 **Search Index**로 찾고 Family Master를 resolve

하는 구조를 목표로 한다 (**TARGET**).

**CURRENT (2026-08-20):** Production corpus SSOT는 여전히 StrategyEntry / `positions_dataset` (레코드에 공통값+좌표). `family_*`는 **shadow** dual-write만 수행. SearchIndex·normalized primary READ·Export Master+Members 전환은 **NOT DONE**.

---

## 2. Family Master

하나의 공략 Family는 공통값 SSOT인 **Family Master**를 가진다.

Master가 대표하는 공통값:

- 공략 (`shotType`)
- 적용 시스템 (`system` identity string, 예: `5_half_system`)
- SYS 계산 규칙 / corrections / 계산 공통값
- AI
- STR
- HP/T **canonical** 기준값
- 두께 **canonical** 기준값
- 기타 Family 전체가 공유하는 공통 모달값

### Mirror 저장 금지

반대 선회 track용 대칭 타점/두께를 **DB에 중복 저장하지 않는다**.

- canonical master 값만 저장
- track handedness가 반대일 때 **resolver**가 표시/계산에 mirror 적용
- 계산값도 동일 Family Master 공통값을 사용

C2는 sys 필드가 아니다 (기존 정책 유지). C2는 reflection geometry derived 값이다.

---

## 3. Member

각 Family Member 최소 필드:

| Field | Role |
|-------|------|
| `memberId` | Member identity |
| `familyId` | Family Master 참조 |
| balls coordinates | Position |
| `track` | `B2T_L` / `B2T_R` / `T2B_L` / `T2B_R` |
| identity / provenance | 아래 권장 값 |

**원본도 Member다.** 최초 입력 위치와 track을 Member 목록에 포함한다.

Member에는 Family 공통값을 **중복 저장하지 않는다**.

권장 provenance:

| provenance | 의미 |
|------------|------|
| `AUTHORED` | 관리자가 직접 입력한 원본 (자동 삭제 금지) |
| `SYMMETRY` | 4 Track 대칭 생성 |
| `DERIVED_CUE_IMPACT` | Cue→Impact 직선 처음 30% adaptive sampling |
| `DERIVED_C3_PLUS` | C3 이후 파생 (**미구현**) |

**Withdrawn (never persisted):** `DERIVED_CO_C1` / `CO_C1_2RG` — CO–C1 1/3 · 2Rg 가정. Phase 3A-3 temporary. Do not migrate.

향후 검토 가능: `parentMemberId`, generation rule/version.

---

## 4. 4 Track Family

관리자가 기준 데이터 하나를 입력하면:

- 기준 Member 1개
- 나머지 대칭 Track Member 3개
- **총 4 Track = 하나의 Family** (동급 Member)

기존 Trajectory Symmetry 규칙을 **그대로 사용**한다 (cite: `3_SYSTEM_ARCHITECTURE.md` · anchors JSON H/V/RPI).

- **H** / **V** / **RPI**
- **sys 값 불변**
- **좌표만 대칭**

각 track은 고유 좌표와 `track` 값을 가진다.

반대 선회인 경우에만 호출 시 resolver:

- 두께 mirror
- HPT hit point mirror

DB에 mirrored common values를 별도 저장하지 않는다.

---

## 5. Derived Members

4개 Track 각각은 **자신의 source Track Member**에서 파생 Members를 생성한다.  
한 Track의 Derived를 H/V/RPI로 복제하지 않는다.

이 계층은 **시스템 공식 계산이 아니다.**  
`CO_f` / `C1_f` / anchors.json CO mark / `computeRailImpactPoint` / CO→C1 rail은 Cue 좌표 생성에 사용하지 않는다.  
계산 규칙 SSOT(`4_CALCULATION_RULES.md`)의 expr/sys 파이프라인과 분리한다.

### 5.0 Cue Ball · Impact Ball · CO (필수 분리)

**Cue Ball**

`source.balls.cue`

현재 배치된 3구 중 내공의 **물리 중심 좌표**다. Ball coordinate이며 sys 값이 아니다.

**Impact Ball center**

Target Ball과 충돌하는 순간의 **Cue Ball 중심 좌표**다.

production:

```text
I = calcImpactBall(source.balls.cue, source.balls.target, canonical/runtime T)
```

- Target 표면 접점(`contactPoint`)이 아니다.
- Target 중심이 아니다.
- UI CONTACT dotted-line endpoint와 같은 의미다.
- Cue→Impact는 직선이다.
- Impact Ball은 별도 persisted Ball이 아니다. 필요 시 cue + target + T로 재계산한다.
- FREE `balls.impact` override는 Derived canonical generation에 쓰지 않는다.

**CO (Cueball Origin)**

CO는 `source.balls.cue`가 아니다.

CO는 Cue Ball이 Target과 Impact한 **이후**, 변경된 시스템/쿠션 진로의 출발점을 나타내는 **system trajectory anchor**다.  
예: `CO_30.0`, `CO_33.0`. 이 값들은 현재 Cue Ball의 물리 좌표가 아니다.

> CO is not the physical Cue Ball position.  
> CO is the system trajectory origin after Cue Ball–Target impact.  
> Cue→Impact Derived Ball coordinates must not be generated from CO or CO→C1 geometry.

사용 금지 (Cue Derived):

- CO sys value
- CO coordinate / anchors.json CO를 Cue 위치로 해석
- CO→C1 line / CO→C1 rail geometry
- `computeRailImpactPoint`로 Cue 위치 추정

### 5.1 Cue→Impact first 30% (`CUE_IMPACT_FIRST_30PCT`)

Source Member `S`:

```text
C = S.balls.cue
I = calcImpactBall(C, S.balls.target, runtime T)
P(t) = C + t * (I - C)
0 < t <= 0.30
```

`validFraction = 0.30` (**1/3이 아님**).

Adaptive sampling (Cue→Impact coordinate-space path distance `D = distance(C, I)`):

```text
VALID_FRACTION = 0.30
MAX_SAMPLE_SPACING = 3.0
MIN_SAMPLE_COUNT = 3

validLength = D * VALID_FRACTION
N = max(MIN_SAMPLE_COUNT, ceil(validLength / MAX_SAMPLE_SPACING))
t_k = VALID_FRACTION * k / N    for k = 1 ... N
P_k = C + t_k * (I - C)
```

마지막 sample은 항상 `t_N = 0.30`.

`D`는 sys가 아니고, CO/C1 값이 아니고, `offset_fg2rg`가 아니고, rail spacing이 아니고, Envelope cueSet spacing이 아니다.

Derived Ball3:

```text
derived.balls.cue    = P_k
derived.balls.target = source.balls.target   (Exact)
derived.balls.second = source.balls.second   (Exact)
```

움직이는 공은 Cue 하나뿐이다.

T는 기존 Family runtime resolver (`hydrateFamilyMemberRuntimeThickness` / `resolveFamilyThickness`)를 사용한다. 새 thickness 공식을 만들지 않는다. HP/tip/spin/slide/draw는 Cue→Impact를 휘게 만들지 않는다.

Identity:

```text
derivedRule = CUE_IMPACT_FIRST_30PCT
derivedStep = cue_impact:t:0.100000   (locale-independent, 6 decimal t)
```

좌표/positionId/array index는 Member identity가 아니다.

### 5.1.1 Preview / Approval (Phase 3A-3E)

> Derived candidates are generated automatically for review,
> but are not persisted until explicit administrator approval.
> The exact candidate set reviewed in Preview is the candidate set
> passed to persistence; approval must not trigger regeneration.

- Policy: **REVIEW_REQUIRED** only. AUTO_APPROVE is not implemented.
- 4-track SAVE 이후 in-memory review session을 연다. SAVE 자체는 Derived를 persist하지 않는다.
- Preview는 ghost/tracking Cue markers만 표시한다. trajectory geometry를 변경하지 않는다.
- Approve는 동결된 Candidate Set을 generic Family writer에 전달한다 (generate 재호출 금지).
- Preview open/close는 dataset mutation이 없다.
- 승인 실패는 all-or-nothing. partial persistence 금지.

SAVE 자동 Derived persistence는 **하지 않는다**.

### 5.2 C3 이후

- **미구현** (`DERIVED_C3_PLUS` / `C3_PLUS_2RG` reserved)
- 기존 초안의 “2Rg 단위”는 이 Phase에서 확정하지 않는다

### 5.3 Envelope Sampling과 혼동 금지

| Layer | Interval | Role |
|-------|----------|------|
| Family derived members | Cue→Impact **first 30%** · adaptive ≤ 3.0 coordinate units · min 3 samples | Family DB Member 생성 |
| Envelope `cueSet` | **1.5gr** · Cue→Impact **1/3** | Published Search sampling (Freeze / GLOSSARY) |

둘은 다른 계층이다. Family 구현이 Envelope Sampling Policy를 재해석하면 안 된다.

**Historical (withdrawn):** Phase 3A 초안의 Family “CO–C1 1/3 · 2Rg”는 production geometry가 아니었다. 구현하지 말 것.

### 5.4 파생수정이 필요한 이유

향후 Cue→Impact 유효구간이 30%보다 짧은 1/4, 1/5, 1/N으로 실제 데이터에서 발견될 수 있다.  
그때 **파생수정 = Branch Family** 모델이 필요하다 (명령 §7.2).

---

## 6. Search Index

Search Index는 **새로운 SSOT DB가 아니다.** Family DB의 검색용 파생 인덱스다.

최소 저장:

- `positionKey` 또는 balls coordinate search key
- `memberId`
- `familyId`
- `track`
- provenance / memberKind
- 검색에 필요한 최소 metadata

공통 SYS / AI / STR / HPT / 계산값은 **복제 저장하지 않는다**.

검색 절차:

1. balls 좌표로 Search Index에서 nearest/exact candidate
2. `memberId` / `familyId`로 Family Master resolve
3. track handedness에 따라 필요 시 thickness / HPT mirror
4. 정확히 일치하지 않으면 **기존 보간 규칙** 사용 (Real Interpolation 등 — 재구현 금지)
5. 동일 `PositionKey`에 서로 다른 Family 공략이 **최대 3개** 존재 가능

**PositionKey는 unique가 아니다.**  
한 position → 최대 3 strategy families.

---

## 7. Admin commands (CONFIRMED DESIGN · Phase 4)

| UI 버튼 | Internal command |
|---------|------------------|
| **원본수정** | `UPDATE` |
| **파생수정** | `BRANCH` + `REPLACE` |
| **새로저장** | `CREATE` |

구현은 Phase 4. 한 번에 전체 구현 금지.

### 7.1 원본수정 = UPDATE

현재 Family **Master 공통값만** 정정한다.

허용: SYS 공통 correction · AI · STR · HP/T · thickness · 기타 Master 공통값.

**금지: balls 좌표 변경.**

balls가 변경된 상태에서 원본수정:

> 공 위치가 변경되었습니다.  
> 기존 패밀리 수정에서는 공 위치를 변경할 수 없습니다.  
> 새로운 포지션을 생성하려면 '새로저장'을 사용하세요.

- Family ID 유지
- Members 유지
- Family Master만 UPDATE

### 7.2 파생수정 = BRANCH + REPLACE

기존 Family **내부 update가 아니다.**

기존 Family에서 **새로운 Branch Family** 생성.

주 목적: CO–C1에서 구름관성 차이로 타점/STR/AI 등 공통값이 달라지는 지점  
(예: 1/3 가정이 실제로는 1/5까지만 유효).

동작:

1. 현재 호출 Member를 branch point로 사용
2. 새 Family B 생성
3. `B.parentFamilyId = A.familyId`
4. `creationType = DERIVED_CORRECTION` (또는 동등)
5. `branchFromMemberId` 기록
6. 수정된 값을 B Master로 저장
7. B의 4 Track + 파생 Member 생성
8. B가 생성한 PositionKey와 충돌하는 **부모 Family A의 자동 Derived Member만** 제거

**절대 금지:**

- 다른 Family의 Member 제거
- AUTHORED member 자동 삭제
- parent 관계 없이 좌표만 같다는 이유로 삭제

삭제 최소 조건 (AND):

```text
candidate.familyId == newFamily.parentFamilyId
AND candidate.positionKey == newMember.positionKey
AND candidate.memberKind is auto-derived
```

- `parentFamilyId` = 계보 증명
- `PositionKey` = 같은 위치 증명
- `memberKind` = 자동 파생 증명

Family A 자체는 유지. B가 생성하지 않는 영역의 A Members는 유지.

예: A가 CO→1/3 담당, 1/5에서 B 생성 → 1/5 이전 A 유지, 1/5 이후 동일 PositionKey의 A 자동 derived만 제거.

### 7.3 새로저장 = CREATE

현재 화면을 template로 **완전히 독립된 새 Family**.

허용: balls · shotType · system · SYS · AI · STR · HP/T · thickness · 기타 자유 변경.

- `parentFamilyId = null`
- `creationType = AUTHORED`
- 기존 Family Member **삭제 없음**
- 기존 Family를 대체하지 않음
- 같은 position에 다른 공략 Family 가능 (최대 3 strategy slot)

---

## 8. Safety principles

1. Family Master가 공통값 SSOT
2. Member는 좌표 + track + identity/provenance 중심
3. mirrored HPT/thickness 중복 저장 금지
4. 원본도 Member에 포함
5. 4 Track은 동급 Member
6. Derived도 고유 데이터이지만 Master 공통값을 참조
7. Search Index는 SSOT가 아니라 derived index
8. 좌표 중복만으로 데이터 삭제 금지
9. 기존 Family 자동 Derived 제거 권한은 **파생수정 command에만** 부여
10. 새로저장은 기존 Family를 절대 삭제하지 않음
11. 원본수정은 공 좌표 변경 금지
12. 좌표가 같아도 다른 Family면 다른 공략일 수 있음
13. 같은 position에 최대 3개 공략 허용
14. 동일 Family 계보에서 새 branch가 더 구체적인 CO–C1 값을 가지면 부모의 충돌 auto-derived만 replace
15. 직접 작성 AUTHORED 데이터는 자동 삭제 금지

---

## 9. Implementation phases

각 Phase: **Ask → 사용자+ChatGPT 검토 → Agent**. 한 번에 전체 구현 금지.

### Phase 1 — Family Master + Member 저장 구조

- auto-generation **없음**
- 현재 저장 구조 분석 후 Master/Member 분리 설계
- **Must start as `[Cursor Mode: Ask]`**

확인할 것:

1. `PROJECT_MASTER_INDEX.md`
2. `HISTORY/PROJECT_LOG_2026-08.md`
3. 본 문서
4. 실제 저장: StrategyEntry / `positions_dataset` / History / Export / slot draft·applied
5. 기존 derived / symmetry SSOT · production code

코드 수정 금지 상태에서: 어떤 필드를 Master vs Member로 옮기는지 분석.

### Phase 2 — 4 Track auto-generation

- canonical 1개 → symmetry Member 3개
- mirror resolver
- 공통값 중복 저장 금지

### Phase 3 — Derived Members + Search Index

- **3A-3D/3E + 3A-359 COMPLETE:** Cue→Impact first 30% adaptive Derived + Unified Review/Approve (existing writer). SAVE 자동 Derived persistence 없음. REVIEW_REQUIRED only.
- **3A-359 COMPLETE:** C3+ scoring-line Derived (Hybrid · display-only markers · atomic 4-track) + Unified Cue∪C3+ Review. Generators remain separate. Detail: LOG **3A-359M**.
- Search Index **미구현**

### Phase 4 — Admin 3 Commands

- 원본수정 UPDATE
- 파생수정 BRANCH + REPLACE
- 새로저장 CREATE

---

## 10. Cite (do not duplicate)

| Topic | Authority |
|-------|-----------|
| Official terminology | `GLOSSARY_SSOT.md` (Family terms not yet adopted) |
| Envelope sampling 1/3 · 1.5gr | `Architecture/ENVELOPE_ARCHITECTURE_SSOT.md` Freeze |
| Dataset 3계층 · Export vs History | MASTER Dataset Architecture · LOG 2026-06 |
| SYS / C2 not a sys field | `4_CALCULATION_RULES.md` · C2 reflection policy |
| Display cap same-rail | `DISPLAY_BOUNDARY_POLICY_SSOT.md` · `trajectoryPathDisplayPolicy.ts` |
| Track symmetry H/V/RPI | `3_SYSTEM_ARCHITECTURE.md` · anchors JSON |
| Search interpolation | Phase 5 Mission 01 Real Interpolation (implemented) |

---

## 11. Next session first task

```text
[Cursor Mode: Ask]
Family Data Architecture Phase 1 — Family Master / Member 현재 저장 구조 분석
```

코드 / dataset / JSON / localStorage / 테스트 수정 금지.  
기존 uncommitted working tree 보존. Commit/Push는 사용자 요청 전까지 금지.
